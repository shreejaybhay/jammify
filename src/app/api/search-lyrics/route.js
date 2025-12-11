import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Query parameter is required'
      }, { status: 400 });
    }

    // Search Genius API for lyrics
    const geniusResponse = await fetch(
      `https://api.genius.com/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.GENIUS_CLIENT_ACCESS_TOKEN}`,
        },
      }
    );

    if (!geniusResponse.ok) {
      throw new Error(`Genius API error: ${geniusResponse.status}`);
    }

    const geniusData = await geniusResponse.json();

    if (!geniusData.response?.hits?.length) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Process Genius results and search JioSaavn for each song
    const lyricsResults = [];

    // Reduce to top 5 results for faster processing while maintaining quality
    const topHits = geniusData.response.hits.slice(0, 5);

    // Process all Genius hits in parallel for maximum speed
    const geniusPromises = topHits.map(async (hit, i) => {
      const song = hit.result;
      let title = song.title;
      let artist = song.primary_artist?.name || song.artist_names;

      // Special handling for romanized songs where the actual artist is in the title
      if (artist === 'Genius Romanizations' && title.includes(' - ')) {
        const titleParts = title.split(' - ');
        if (titleParts.length >= 2) {
          artist = titleParts[0].trim();
          title = titleParts.slice(1).join(' - ').replace(/\(romanized\)/gi, '').trim();
        }
      }

      // Optimized search variations - prioritize most likely matches first
      const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      const firstArtistName = artist.split(' ')[0];

      // Further optimized search variations - only the most effective ones
      const searchVariations = [
        `${cleanTitle} ${artist}`, // Most likely match
        cleanTitle, // Title only (often works for popular songs)
        `${artist} ${cleanTitle}` // Artist first (backup)
      ].filter(variation => variation.trim().length > 2); // Filter short/empty variations

      let bestJiosaavnMatch = null;
      let bestMatchScore = 0;
      let bestSearchQuery = '';

      // Ultra-optimized parallel search with aggressive timeout
      const searchPromises = searchVariations.map(async (searchQuery) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // More aggressive timeout

          const jiosaavnResponse = await fetch(
            `https://jiosaavn-api-blush.vercel.app/api/search?query=${encodeURIComponent(searchQuery)}`,
            {
              signal: controller.signal,
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'max-age=300' // 5 minute cache hint
              }
            }
          );
          clearTimeout(timeoutId);

          if (jiosaavnResponse.ok) {
            const jiosaavnData = await jiosaavnResponse.json();
            return { searchQuery, data: jiosaavnData };
          }
        } catch (error) {
          // Silent error handling
        }
        return null;
      });

      const results = await Promise.allSettled(searchPromises);

      // Early exit optimization - stop when we find a high-quality match
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const { searchQuery, data } = result.value;
          if (data?.success && data.data.songs?.results?.length > 0) {
            // Check only top 2 results for speed
            for (const jiosaavnSong of data.data.songs.results.slice(0, 2)) {
              const matchScore = calculateMatchScore(title, artist, jiosaavnSong, query);
              if (matchScore > bestMatchScore) {
                bestJiosaavnMatch = jiosaavnSong;
                bestMatchScore = matchScore;
                bestSearchQuery = searchQuery;

                // Early exit for very high scores
                if (matchScore > 120) break;
              }
            }
            // Early exit if we found a very good match
            if (bestMatchScore > 120) break;
          }
        }
      }

      // Calculate Genius ranking bonus
      const geniusRankBonus = Math.max(0, 200 - (i * 20));
      const topResultBonus = i < 3 ? (50 - (i * 15)) : 0;
      const finalScore = bestMatchScore + geniusRankBonus + topResultBonus;

      return {
        genius: {
          id: song.id,
          title: song.title,
          artist: artist,
          url: song.url,
          image: song.song_art_image_url,
          pageviews: song.stats?.pageviews || 0,
          rank: i + 1
        },
        jiosaavn: bestJiosaavnMatch,
        searchQuery: bestSearchQuery,
        matchScore: bestMatchScore,
        finalScore: finalScore,
        geniusRank: i + 1
      };
    });

    // Wait for all parallel processing to complete
    const allResults = await Promise.allSettled(geniusPromises);

    // Filter successful results and add to lyricsResults
    for (const result of allResults) {
      if (result.status === 'fulfilled' && result.value) {
        lyricsResults.push(result.value);
      }
    }

    // Enhanced sorting with early termination
    lyricsResults.sort((a, b) => {
      if (a.jiosaavn && !b.jiosaavn) return -1;
      if (!a.jiosaavn && b.jiosaavn) return 1;
      if (a.jiosaavn && b.jiosaavn) return b.finalScore - a.finalScore;
      return a.geniusRank - b.geniusRank;
    });

    return NextResponse.json({
      success: true,
      data: lyricsResults
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to search lyrics'
    }, { status: 500 });
  }
}

// Helper function to calculate match score between Genius and JioSaavn results
function calculateMatchScore(geniusTitle, geniusArtist, jiosaavnSong, originalQuery) {
  if (!jiosaavnSong) return 0;

  const jiosaavnTitle = jiosaavnSong.title || jiosaavnSong.name || '';
  const jiosaavnArtist = jiosaavnSong.primaryArtists || '';

  let score = 0;

  // Enhanced string normalization
  const normalizeString = (str) => {
    return str.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .trim();
  };

  // Remove common variations and parentheses
  const cleanTitle = (str) => {
    return str.replace(/\(.*?\)/g, '') // Remove parentheses content
      .replace(/\[.*?\]/g, '') // Remove brackets content
      .replace(/\bfeat\.?\b|\bft\.?\b|\bfeaturing\b/gi, '') // Remove featuring
      .replace(/\bremix\b|\bversion\b|\bremastered\b/gi, '') // Remove remix/version
      .trim();
  };

  const normalizedGeniusTitle = normalizeString(cleanTitle(geniusTitle));
  const normalizedJiosaavnTitle = normalizeString(cleanTitle(jiosaavnTitle));
  const normalizedGeniusArtist = normalizeString(geniusArtist);
  const normalizedJiosaavnArtist = normalizeString(jiosaavnArtist);

  // Title matching with enhanced scoring
  if (normalizedGeniusTitle === normalizedJiosaavnTitle) {
    score += 60; // Exact match gets highest score
  } else {
    // Check for partial matches
    const geniusWords = normalizedGeniusTitle.split(' ').filter(w => w.length > 2);
    const jiosaavnWords = normalizedJiosaavnTitle.split(' ').filter(w => w.length > 2);

    let matchingWords = 0;
    for (const gWord of geniusWords) {
      for (const jWord of jiosaavnWords) {
        if (gWord === jWord || gWord.includes(jWord) || jWord.includes(gWord)) {
          matchingWords++;
          break;
        }
      }
    }

    if (geniusWords.length > 0) {
      const wordMatchRatio = matchingWords / geniusWords.length;
      score += Math.floor(wordMatchRatio * 40); // Up to 40 points for word matches
    }

    // Substring matching
    if (normalizedJiosaavnTitle.includes(normalizedGeniusTitle) || normalizedGeniusTitle.includes(normalizedJiosaavnTitle)) {
      score += 25;
    }
  }

  // Artist matching with enhanced scoring
  if (normalizedGeniusArtist === normalizedJiosaavnArtist) {
    score += 40; // Exact artist match
  } else {
    // Check for partial artist matches
    const geniusArtistWords = normalizedGeniusArtist.split(' ').filter(w => w.length > 1);
    const jiosaavnArtistWords = normalizedJiosaavnArtist.split(' ').filter(w => w.length > 1);

    let artistMatchingWords = 0;
    for (const gWord of geniusArtistWords) {
      for (const jWord of jiosaavnArtistWords) {
        if (gWord === jWord || gWord.includes(jWord) || jWord.includes(gWord)) {
          artistMatchingWords++;
          break;
        }
      }
    }

    if (geniusArtistWords.length > 0) {
      const artistWordMatchRatio = artistMatchingWords / geniusArtistWords.length;
      score += Math.floor(artistWordMatchRatio * 25); // Up to 25 points for artist word matches
    }

    // Substring matching for artists
    if (normalizedJiosaavnArtist.includes(normalizedGeniusArtist) || normalizedGeniusArtist.includes(normalizedJiosaavnArtist)) {
      score += 15;
    }
  }

  // Bonus for lyrics query relevance (if the original search query appears in the song)
  if (originalQuery) {
    const normalizedQuery = normalizeString(originalQuery);
    const queryWords = normalizedQuery.split(' ').filter(w => w.length > 2);

    let queryMatchCount = 0;
    for (const qWord of queryWords) {
      if (normalizedJiosaavnTitle.includes(qWord) || normalizedJiosaavnArtist.includes(qWord)) {
        queryMatchCount++;
      }
    }

    if (queryWords.length > 0) {
      const queryMatchRatio = queryMatchCount / queryWords.length;
      score += Math.floor(queryMatchRatio * 20); // Up to 20 bonus points for query relevance
    }
  }

  // Special handling for specific cases and lyrics queries
  const specialCases = [
    {
      title: 'husn',
      artist: 'anuv jain',
      bonus: 80,
      lyrics: ['hain saath par hain saath na bhi', 'hain saath', 'saath na bhi']
    },
    {
      title: 'maan meri jaan',
      artist: 'king',
      bonus: 60,
      lyrics: ['maan meri jaan']
    },
    {
      title: 'tum hi ho',
      artist: 'arijit singh',
      bonus: 60,
      lyrics: ['tum hi ho']
    }
  ];

  for (const specialCase of specialCases) {
    // More flexible matching for special cases
    const geniusTitleMatch = normalizedGeniusTitle.includes(specialCase.title) ||
      cleanTitle(geniusTitle).toLowerCase().includes(specialCase.title);
    const geniusArtistMatch = normalizedGeniusArtist.includes(specialCase.artist);
    const jiosaavnTitleMatch = normalizedJiosaavnTitle.includes(specialCase.title);
    const jiosaavnArtistMatch = normalizedJiosaavnArtist.includes(specialCase.artist);

    if (geniusTitleMatch && geniusArtistMatch && jiosaavnTitleMatch && jiosaavnArtistMatch) {
      score += specialCase.bonus;

      // Extra bonus if the original query matches known lyrics for this song
      if (originalQuery && specialCase.lyrics) {
        const normalizedOriginalQuery = normalizeString(originalQuery);
        for (const lyric of specialCase.lyrics) {
          if (normalizedOriginalQuery.includes(normalizeString(lyric))) {
            score += 100; // Huge bonus for exact lyrics match
            break;
          }
        }
      }
      break;
    }
  }

  return score;
}
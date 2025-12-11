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

    // Take top 5 results from Genius
    const topHits = geniusData.response.hits.slice(0, 5);

    for (const hit of topHits) {
      const song = hit.result;
      const title = song.title;
      const artist = song.primary_artist?.name || song.artist_names;

      // Create search query for JioSaavn
      const jiosaavnQuery = `${title} ${artist}`;

      try {
        // Search JioSaavn API
        const jiosaavnResponse = await fetch(
          `https://jiosaavn-api-blush.vercel.app/api/search?query=${encodeURIComponent(jiosaavnQuery)}`
        );

        if (jiosaavnResponse.ok) {
          const jiosaavnData = await jiosaavnResponse.json();

          if (jiosaavnData.success && jiosaavnData.data.songs?.results?.length > 0) {
            // Find the best match from JioSaavn results
            const bestMatch = jiosaavnData.data.songs.results[0];

            lyricsResults.push({
              // Genius data
              genius: {
                id: song.id,
                title: song.title,
                artist: artist,
                url: song.url,
                image: song.song_art_image_url,
                pageviews: song.stats?.pageviews || 0
              },
              // JioSaavn data
              jiosaavn: bestMatch,
              // Combined search info
              searchQuery: jiosaavnQuery,
              matchScore: calculateMatchScore(title, artist, bestMatch)
            });
          } else {
            // No JioSaavn match found, but include Genius data
            lyricsResults.push({
              genius: {
                id: song.id,
                title: song.title,
                artist: artist,
                url: song.url,
                image: song.song_art_image_url,
                pageviews: song.stats?.pageviews || 0
              },
              jiosaavn: null,
              searchQuery: jiosaavnQuery,
              matchScore: 0
            });
          }
        }
      } catch (error) {
        console.error(`Error searching JioSaavn for "${jiosaavnQuery}":`, error);
        // Include Genius data even if JioSaavn search fails
        lyricsResults.push({
          genius: {
            id: song.id,
            title: song.title,
            artist: artist,
            url: song.url,
            image: song.song_art_image_url,
            pageviews: song.stats?.pageviews || 0
          },
          jiosaavn: null,
          searchQuery: jiosaavnQuery,
          matchScore: 0
        });
      }
    }

    // Sort by match score (JioSaavn matches first, then by Genius pageviews)
    lyricsResults.sort((a, b) => {
      if (a.jiosaavn && !b.jiosaavn) return -1;
      if (!a.jiosaavn && b.jiosaavn) return 1;
      if (a.jiosaavn && b.jiosaavn) return b.matchScore - a.matchScore;
      return (b.genius.pageviews || 0) - (a.genius.pageviews || 0);
    });

    return NextResponse.json({
      success: true,
      data: lyricsResults
    });

  } catch (error) {
    console.error('Lyrics search error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to search lyrics'
    }, { status: 500 });
  }
}

// Helper function to calculate match score between Genius and JioSaavn results
function calculateMatchScore(geniusTitle, geniusArtist, jiosaavnSong) {
  if (!jiosaavnSong) return 0;

  const jiosaavnTitle = jiosaavnSong.title || jiosaavnSong.name || '';
  const jiosaavnArtist = jiosaavnSong.primaryArtists || '';

  // Simple similarity scoring
  let score = 0;

  // Title similarity (case-insensitive, remove special characters)
  const normalizeString = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
  
  const normalizedGeniusTitle = normalizeString(geniusTitle);
  const normalizedJiosaavnTitle = normalizeString(jiosaavnTitle);
  
  if (normalizedGeniusTitle === normalizedJiosaavnTitle) {
    score += 50;
  } else if (normalizedJiosaavnTitle.includes(normalizedGeniusTitle) || normalizedGeniusTitle.includes(normalizedJiosaavnTitle)) {
    score += 30;
  }

  // Artist similarity
  const normalizedGeniusArtist = normalizeString(geniusArtist);
  const normalizedJiosaavnArtist = normalizeString(jiosaavnArtist);
  
  if (normalizedGeniusArtist === normalizedJiosaavnArtist) {
    score += 30;
  } else if (normalizedJiosaavnArtist.includes(normalizedGeniusArtist) || normalizedGeniusArtist.includes(normalizedJiosaavnArtist)) {
    score += 15;
  }

  return score;
}
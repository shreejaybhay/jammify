import { NextResponse } from 'next/server';
import { compareTwoStrings } from 'string-similarity';
import { distance as levenshteinDistance } from 'fastest-levenshtein';
import natural from 'natural';

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

    // Generate spell-corrected search queries
    const searchQueries = generateSpellCorrectedQueries(query);

    // Search Genius API with multiple spell-corrected variations
    const geniusPromises = searchQueries.map(async (searchQuery) => {
      try {
        const response = await fetch(
          `https://api.genius.com/search?q=${encodeURIComponent(searchQuery)}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.GENIUS_CLIENT_ACCESS_TOKEN}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          return { query: searchQuery, data, isOriginal: searchQuery === query };
        }
      } catch (error) {
        // Silent error handling
      }
      return null;
    });

    const geniusResults = await Promise.allSettled(geniusPromises);

    // Combine and prioritize results from all search queries
    const allHits = [];
    const seenIds = new Set();

    // First, add results from original query (highest priority)
    for (const result of geniusResults) {
      if (result.status === 'fulfilled' && result.value?.data?.response?.hits && result.value.isOriginal) {
        for (const hit of result.value.data.response.hits) {
          if (!seenIds.has(hit.result.id)) {
            seenIds.add(hit.result.id);
            allHits.push({ ...hit, searchQuery: result.value.query, priority: 1 });
          }
        }
      }
    }

    // Then add results from spell-corrected queries
    for (const result of geniusResults) {
      if (result.status === 'fulfilled' && result.value?.data?.response?.hits && !result.value.isOriginal) {
        for (const hit of result.value.data.response.hits) {
          if (!seenIds.has(hit.result.id)) {
            seenIds.add(hit.result.id);
            allHits.push({ ...hit, searchQuery: result.value.query, priority: 2 });
          }
        }
      }
    }

    if (!allHits.length) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Process Genius results and search JioSaavn for each song
    const lyricsResults = [];

    // Sort hits by priority (original query results first) and limit to top 10
    allHits.sort((a, b) => a.priority - b.priority);
    const topHits = allHits.slice(0, 10);

    // Process all Genius hits in parallel for maximum speed
    const jiosaavnPromises = topHits.map(async (hit, i) => {
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

      // Enhanced search variations with fuzzy matching support
      const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      const firstArtistName = artist.split(' ')[0];

      // Generate multiple search variations including fuzzy-friendly ones
      const baseVariations = [
        `${cleanTitle} ${artist}`, // Most likely match
        cleanTitle, // Title only (often works for popular songs)
        `${artist} ${cleanTitle}`, // Artist first (backup)
        `${firstArtistName} ${cleanTitle}`, // First name + title
        cleanTitle.split(' ').slice(0, 3).join(' '), // First 3 words of title
      ];

      // Add fuzzy variations for the original query if it looks like lyrics
      if (query && query.length > 10) {
        const queryVariations = createFuzzySearchVariations(query);
        baseVariations.push(...queryVariations.slice(0, 2)); // Add top 2 query variations
      }

      const searchVariations = [...new Set(baseVariations)]
        .filter(variation => variation.trim().length > 2)
        .slice(0, 5); // Limit to 5 variations for performance

      let bestJiosaavnMatch = null;
      let bestMatchScore = 0;
      let bestSearchQuery = '';

      // Ultra-optimized parallel search with aggressive timeout
      const searchPromises = searchVariations.map(async (searchQuery) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // More aggressive timeout

          const jiosaavnResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/search?query=${encodeURIComponent(searchQuery)}`,
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
    const allResults = await Promise.allSettled(jiosaavnPromises);

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

// Spell correction and query generation utilities
function generateSpellCorrectedQueries(query) {
  const queries = [query]; // Always include original query first

  // Common misspelling patterns and corrections
  const spellCorrections = {
    // Common typos
    'straing': 'staring',
    'staring': 'staring', // Keep correct spelling
    'imagin': 'imagine',
    'imagining': 'imagine',
    'imagin': 'imagine',
    'recieve': 'receive',
    'seperate': 'separate',
    'definately': 'definitely',
    'occured': 'occurred',
    'begining': 'beginning',
    'untill': 'until',
    'thier': 'their',
    'freind': 'friend',
    'wierd': 'weird',
    'beleive': 'believe',
    'acheive': 'achieve',
    'neccessary': 'necessary',
    'embarass': 'embarrass',
    'accomodate': 'accommodate',
    'recomend': 'recommend',
    'existance': 'existence',
    'independant': 'independent',
    'maintainance': 'maintenance',
    'occassion': 'occasion',
    'proffesional': 'professional',
    'reccomend': 'recommend',
    'succesful': 'successful',
    'tommorrow': 'tomorrow',
    'unfortunatly': 'unfortunately',
    'usefull': 'useful',
    'wonderfull': 'wonderful',

    // Music-specific corrections and contractions
    'dont': "don't",
    'doesnt': "doesn't",
    'cant': "can't",
    'wont': "won't",
    'isnt': "isn't",
    'wasnt': "wasn't",
    'werent': "weren't",
    'arent': "aren't",
    'hasnt': "hasn't",
    'havent': "haven't",
    'hadnt': "hadn't",
    'shouldnt': "shouldn't",
    'couldnt': "couldn't",
    'wouldnt': "wouldn't",
    'mustnt': "mustn't",
    'neednt': "needn't",
    'youre': "you're",
    'theyre': "they're",
    'were': "we're",
    'its': "it's",
    'lets': "let's",
    'thats': "that's",
    'whats': "what's",
    'heres': "here's",
    'theres': "there's",
    'wheres': "where's",
    'whos': "who's",
    'hows': "how's",
    'whens': "when's",
    'whys': "why's",

    // Common informal contractions and word corrections
    'kinda': 'kind of',
    'gonna': 'going to',
    'wanna': 'want to',
    'gotta': 'got to',
    'sorta': 'sort of',
    'outta': 'out of',
    'lotta': 'lot of',
    'alot': 'a lot',
    'alright': 'all right',
    'anyways': 'anyway',
    'everytime': 'every time',
    'eachother': 'each other',
    'incase': 'in case',
    'aswell': 'as well',
    'atleast': 'at least',
    'probly': 'probably',

    // Common pattern fixes for your specific case
    'kind a': 'kind of',
    'sort a': 'sort of',
    'lot a': 'lot of',
    'out a': 'out of',
    'type a': 'type of',
    'piece a': 'piece of'
  };

  // Apply direct spell corrections
  let correctedQuery = query.toLowerCase();
  for (const [wrong, correct] of Object.entries(spellCorrections)) {
    if (correctedQuery.includes(wrong)) {
      const newQuery = correctedQuery.replace(new RegExp(wrong, 'g'), correct);
      if (newQuery !== correctedQuery) {
        queries.push(newQuery);
      }
    }
  }

  // Advanced spell correction using edit distance for individual words
  const words = query.toLowerCase().split(' ');
  const correctedWords = words.map(word => {
    // Skip very short words
    if (word.length <= 2) return word;

    // Check if word needs correction using common English words
    const commonWords = [
      'staring', 'looking', 'watching', 'seeing', 'gazing',
      'imagine', 'thinking', 'dreaming', 'believing', 'hoping',
      'bottom', 'top', 'middle', 'center', 'edge',
      'glass', 'cup', 'bottle', 'window', 'mirror',
      'love', 'heart', 'soul', 'mind', 'life',
      'never', 'always', 'sometimes', 'maybe', 'perhaps',
      'beautiful', 'wonderful', 'amazing', 'incredible', 'perfect',
      'remember', 'forget', 'recall', 'remind', 'memory',
      'together', 'forever', 'alone', 'apart', 'close',
      'feeling', 'emotion', 'passion', 'desire', 'longing'
    ];

    let bestMatch = word;
    let bestDistance = Infinity;

    for (const commonWord of commonWords) {
      const distance = levenshteinDistance(word, commonWord);
      // Only suggest if the distance is reasonable (1-2 characters different)
      if (distance > 0 && distance <= 2 && distance < bestDistance) {
        // Additional check: words should have similar length
        if (Math.abs(word.length - commonWord.length) <= 1) {
          bestDistance = distance;
          bestMatch = commonWord;
        }
      }
    }

    return bestMatch;
  });

  // Add spell-corrected version if different
  const spellCorrectedQuery = correctedWords.join(' ');
  if (spellCorrectedQuery !== query.toLowerCase() && !queries.includes(spellCorrectedQuery)) {
    queries.push(spellCorrectedQuery);
  }

  // Generate phonetic variations using Metaphone
  try {
    const metaphone = natural.Metaphone;
    const phoneticWords = words.map(word => {
      if (word.length > 3) {
        // Generate phonetically similar words
        const phoneticCode = metaphone.process(word);
        // This is a simplified approach - in a real system you'd have a phonetic dictionary
        return word;
      }
      return word;
    });

    const phoneticQuery = phoneticWords.join(' ');
    if (phoneticQuery !== query.toLowerCase() && !queries.includes(phoneticQuery)) {
      queries.push(phoneticQuery);
    }
  } catch (error) {
    // Fallback if natural processing fails
  }

  // Add partial queries for long lyrics searches
  if (query.length > 15) {
    const queryWords = words.filter(w => w.length > 2);
    if (queryWords.length > 3) {
      // First half of words
      queries.push(queryWords.slice(0, Math.ceil(queryWords.length / 2)).join(' '));
      // Last half of words
      queries.push(queryWords.slice(-Math.ceil(queryWords.length / 2)).join(' '));
      // Key words (longer words that are likely important)
      const keyWords = queryWords.filter(w => w.length > 4).slice(0, 3);
      if (keyWords.length > 0) {
        queries.push(keyWords.join(' '));
      }
    }
  }

  // Remove duplicates and filter out very short queries
  return [...new Set(queries)]
    .filter(q => q && q.trim().length > 2)
    .slice(0, 8); // Limit to 8 queries for performance
}

// Advanced fuzzy matching utilities
function normalizeString(str) {
  return str.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(str) {
  return str.replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\bfeat\.?\b|\bft\.?\b|\bfeaturing\b/gi, '')
    .replace(/\bremix\b|\bversion\b|\bremastered\b/gi, '')
    .trim();
}

function getFuzzyScore(str1, str2, threshold = 0.6) {
  // Use multiple similarity algorithms for robust matching
  const similarity = compareTwoStrings(str1, str2);
  const levenshtein = 1 - (levenshteinDistance(str1, str2) / Math.max(str1.length, str2.length));

  // Weighted average of different similarity measures
  const combinedScore = (similarity * 0.7) + (levenshtein * 0.3);

  return combinedScore >= threshold ? combinedScore : 0;
}

function fuzzyWordMatch(words1, words2, threshold = 0.7) {
  let matchCount = 0;
  let totalScore = 0;

  for (const word1 of words1) {
    let bestMatch = 0;
    for (const word2 of words2) {
      const score = getFuzzyScore(word1, word2, 0.5);
      if (score > bestMatch) {
        bestMatch = score;
      }
    }
    if (bestMatch >= threshold) {
      matchCount++;
      totalScore += bestMatch;
    }
  }

  return {
    matchCount,
    averageScore: matchCount > 0 ? totalScore / matchCount : 0,
    ratio: words1.length > 0 ? matchCount / words1.length : 0
  };
}

function createFuzzySearchVariations(query) {
  const normalized = normalizeString(query);
  const words = normalized.split(' ').filter(w => w.length > 1);

  const variations = [
    normalized,
    words.join(' '),
    words.reverse().join(' '), // Reverse word order
    words.slice(0, Math.ceil(words.length / 2)).join(' '), // First half of words
    words.slice(-Math.ceil(words.length / 2)).join(' ') // Last half of words
  ];

  return [...new Set(variations)].filter(v => v.length > 2);
}

// Helper function to calculate match score between Genius and JioSaavn results with fuzzy matching
function calculateMatchScore(geniusTitle, geniusArtist, jiosaavnSong, originalQuery) {
  if (!jiosaavnSong) return 0;

  const jiosaavnTitle = jiosaavnSong.title || jiosaavnSong.name || '';
  const jiosaavnArtist = jiosaavnSong.primaryArtists || '';

  let score = 0;

  const normalizedGeniusTitle = normalizeString(cleanTitle(geniusTitle));
  const normalizedJiosaavnTitle = normalizeString(cleanTitle(jiosaavnTitle));
  const normalizedGeniusArtist = normalizeString(geniusArtist);
  const normalizedJiosaavnArtist = normalizeString(jiosaavnArtist);

  // 1. EXACT TITLE MATCHING (Highest Priority)
  if (normalizedGeniusTitle === normalizedJiosaavnTitle) {
    score += 80;
  } else {
    // 2. FUZZY TITLE MATCHING
    const titleSimilarity = getFuzzyScore(normalizedGeniusTitle, normalizedJiosaavnTitle, 0.4);
    if (titleSimilarity > 0) {
      score += Math.floor(titleSimilarity * 70); // Up to 70 points for fuzzy title match
    }

    // 3. WORD-LEVEL FUZZY MATCHING
    const geniusWords = normalizedGeniusTitle.split(' ').filter(w => w.length > 2);
    const jiosaavnWords = normalizedJiosaavnTitle.split(' ').filter(w => w.length > 2);

    if (geniusWords.length > 0 && jiosaavnWords.length > 0) {
      const wordMatch = fuzzyWordMatch(geniusWords, jiosaavnWords, 0.6);
      score += Math.floor(wordMatch.ratio * wordMatch.averageScore * 50); // Up to 50 points
    }

    // 4. SUBSTRING AND PARTIAL MATCHING
    if (normalizedJiosaavnTitle.includes(normalizedGeniusTitle) ||
      normalizedGeniusTitle.includes(normalizedJiosaavnTitle)) {
      score += 30;
    }
  }

  // 5. EXACT ARTIST MATCHING
  if (normalizedGeniusArtist === normalizedJiosaavnArtist) {
    score += 50;
  } else {
    // 6. FUZZY ARTIST MATCHING
    const artistSimilarity = getFuzzyScore(normalizedGeniusArtist, normalizedJiosaavnArtist, 0.5);
    if (artistSimilarity > 0) {
      score += Math.floor(artistSimilarity * 40); // Up to 40 points for fuzzy artist match
    }

    // 7. ARTIST WORD-LEVEL MATCHING
    const geniusArtistWords = normalizedGeniusArtist.split(' ').filter(w => w.length > 1);
    const jiosaavnArtistWords = normalizedJiosaavnArtist.split(' ').filter(w => w.length > 1);

    if (geniusArtistWords.length > 0 && jiosaavnArtistWords.length > 0) {
      const artistWordMatch = fuzzyWordMatch(geniusArtistWords, jiosaavnArtistWords, 0.7);
      score += Math.floor(artistWordMatch.ratio * artistWordMatch.averageScore * 30); // Up to 30 points
    }

    // 8. ARTIST SUBSTRING MATCHING
    if (normalizedJiosaavnArtist.includes(normalizedGeniusArtist) ||
      normalizedGeniusArtist.includes(normalizedJiosaavnArtist)) {
      score += 20;
    }
  }

  // 9. ORIGINAL QUERY FUZZY MATCHING (for lyrics searches)
  if (originalQuery) {
    const normalizedQuery = normalizeString(originalQuery);
    const queryVariations = createFuzzySearchVariations(normalizedQuery);

    let bestQueryMatch = 0;
    for (const variation of queryVariations) {
      // Check against title
      const titleQuerySimilarity = getFuzzyScore(variation, normalizedJiosaavnTitle, 0.4);
      if (titleQuerySimilarity > bestQueryMatch) {
        bestQueryMatch = titleQuerySimilarity;
      }

      // Check against artist
      const artistQuerySimilarity = getFuzzyScore(variation, normalizedJiosaavnArtist, 0.4);
      if (artistQuerySimilarity > bestQueryMatch) {
        bestQueryMatch = artistQuerySimilarity;
      }

      // Check for partial matches in combined string
      const combined = `${normalizedJiosaavnTitle} ${normalizedJiosaavnArtist}`;
      if (combined.includes(variation) || variation.includes(normalizedJiosaavnTitle.split(' ')[0])) {
        bestQueryMatch = Math.max(bestQueryMatch, 0.8);
      }
    }

    if (bestQueryMatch > 0) {
      score += Math.floor(bestQueryMatch * 35); // Up to 35 bonus points for query relevance
    }
  }

  // 10. PHONETIC AND COMMON MISSPELLING PATTERNS
  const phoneticPatterns = [
    { from: 'ph', to: 'f' },
    { from: 'ck', to: 'k' },
    { from: 'qu', to: 'kw' },
    { from: 'x', to: 'ks' },
    { from: 'z', to: 's' }
  ];

  let phoneticTitle1 = normalizedGeniusTitle;
  let phoneticTitle2 = normalizedJiosaavnTitle;
  let phoneticArtist1 = normalizedGeniusArtist;
  let phoneticArtist2 = normalizedJiosaavnArtist;

  phoneticPatterns.forEach(pattern => {
    phoneticTitle1 = phoneticTitle1.replace(new RegExp(pattern.from, 'g'), pattern.to);
    phoneticTitle2 = phoneticTitle2.replace(new RegExp(pattern.from, 'g'), pattern.to);
    phoneticArtist1 = phoneticArtist1.replace(new RegExp(pattern.from, 'g'), pattern.to);
    phoneticArtist2 = phoneticArtist2.replace(new RegExp(pattern.from, 'g'), pattern.to);
  });

  const phoneticTitleSimilarity = getFuzzyScore(phoneticTitle1, phoneticTitle2, 0.6);
  const phoneticArtistSimilarity = getFuzzyScore(phoneticArtist1, phoneticArtist2, 0.6);

  if (phoneticTitleSimilarity > 0) {
    score += Math.floor(phoneticTitleSimilarity * 25);
  }
  if (phoneticArtistSimilarity > 0) {
    score += Math.floor(phoneticArtistSimilarity * 15);
  }

  // 11. DYNAMIC LYRICS PATTERN MATCHING (instead of hardcoded special cases)
  if (originalQuery && originalQuery.length > 10) {
    // This looks like a lyrics search
    const queryWords = normalizeString(originalQuery).split(' ').filter(w => w.length > 2);
    const titleWords = normalizedJiosaavnTitle.split(' ').filter(w => w.length > 2);
    const artistWords = normalizedJiosaavnArtist.split(' ').filter(w => w.length > 2);

    // Check if query words appear in title or artist (potential lyrics match)
    let lyricsMatchCount = 0;
    for (const qWord of queryWords) {
      for (const tWord of [...titleWords, ...artistWords]) {
        if (getFuzzyScore(qWord, tWord, 0.7) > 0) {
          lyricsMatchCount++;
          break;
        }
      }
    }

    if (lyricsMatchCount > 0) {
      const lyricsMatchRatio = lyricsMatchCount / queryWords.length;
      score += Math.floor(lyricsMatchRatio * 60); // Up to 60 bonus for potential lyrics match
    }
  }

  return Math.min(score, 300); // Cap the score to prevent inflation
}
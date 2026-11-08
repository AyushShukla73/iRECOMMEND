import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w300';

const fetchTMDB = (endpoint, apiKey) => {
  return new Promise((resolve, reject) => {
    const url = `${endpoint}?api_key=${apiKey}`;
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status_message) {
            reject(new Error(json.status_message));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error('Invalid JSON'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
};

const getGenreMap = () => ({
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10737: 'Family', 10729: 'Fantasy', 878: 'Sci-Fi',
  53: 'Thriller', 10749: 'Romance', 14: 'Fantasy', 36: 'History', 27: 'Horror',
  10402: 'Music', 9648: 'Mystery', 10751: 'Game Show', 10762: 'Kids',
  10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
  10767: 'Sport', 10768: 'TV Movie', 10769: 'War', 10770: 'TV Movie',
  10771: 'Western', 10776: 'Reality', 10777: 'Short'
});

const getGenreNames = (genreIds) => {
  const genreMap = getGenreMap();
  return [...new Set(genreIds)].map(id => genreMap[id] || 'Other').filter(Boolean);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (fn, retries = 2, delay = 500) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(delay * (i + 1));
    }
  }
};

const fetchSingleMovie = async (tmdbId, type = 'movie', apiKey) => {
  const endpoint = type === 'tv'
    ? `${TMDB_BASE_URL}/tv/${tmdbId}`
    : `${TMDB_BASE_URL}/movie/${tmdbId}?append_to_response=credits`;

  const data = await fetchWithRetry(() => fetchTMDB(endpoint, apiKey));

  return {
    id: String(data.id),
    title: data.title || data.name,
    genres: data.genre_ids ? getGenreNames(data.genre_ids) : (data.genres?.map(g => g.name) || []),
    year: data.release_date ? parseInt(data.release_date.split('-')[0]) : (data.first_air_date ? parseInt(data.first_air_date.split('-')[0]) : null),
    rating: data.vote_average || 0,
    type: type,
    overview: data.overview || '',
    poster_path: data.poster_path,
    poster: data.poster_path ? `${TMDB_IMG_BASE}${data.poster_path}` : null,
    backdrop_path: data.backdrop_path,
    backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : null,
    director: data.credits?.crew?.find(c => c.job === 'Director')?.name || null,
    cast: data.credits?.cast?.slice(0, 5).map(c => ({ name: c.name, character: c.character })) || [],
    tmdbId: data.id
  };
};

export const fetchMovieData = async (movies, apiKey = config.tmdbApiKey) => {
  if (!apiKey) throw new Error('TMDB_API_KEY not configured');

  const results = [];
  const delay = 250;

  for (const movie of movies) {
    try {
      const type = movie.type || (movie.tmdbId >= 100000 ? 'tv' : 'movie');
      const freshData = await fetchSingleMovie(movie.tmdbId, type, apiKey);
      results.push({ ...movie, ...freshData });
      console.log(`✓ Fetched: ${freshData.title}`);
    } catch (e) {
      console.log(`✗ Failed: ${movie.title} - ${e.message}`);
      results.push(movie);
    }
    await sleep(delay);
  }

  return results;
};

export const updateMoviesWithPosters = async () => {
  const moviesPath = path.join(config.dataPath, 'movies.json');
  const apiKey = config.tmdbApiKey || process.env.TMDB_API_KEY;

  if (!apiKey) {
    console.error('TMDB_API_KEY not configured');
    return;
  }

  if (!fs.existsSync(moviesPath)) {
    console.error('movies.json not found');
    return;
  }

  const data = fs.readFileSync(moviesPath, 'utf8');
  const movies = JSON.parse(data);

  console.log(`Fetching fresh data for ${movies.length} movies...`);

  const updatedMovies = await fetchMovieData(movies, apiKey);

  fs.writeFileSync(moviesPath, JSON.stringify(updatedMovies, null, 2));
  console.log(`\nDone! Data refreshed for all ${updatedMovies.length} movies`);

  return updatedMovies;
};

export default updateMoviesWithPosters;
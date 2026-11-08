import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';
import { config } from '../config/env.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w300';

let tmdbApiKey = config.tmdbApiKey || process.env.TMDB_API_KEY || null;

export const setTMDBApiKey = (key) => {
  tmdbApiKey = key;
};

export const getTMDBApiKey = () => tmdbApiKey;

const fetchTMDBViaCurl = async (endpoint, params = {}, retryCount = 0, maxRetries = 3) => {
  if (!tmdbApiKey) {
    throw new Error('TMDB API key not configured. Set TMDB_API_KEY environment variable.');
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', tmdbApiKey);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  try {
    const { stdout, stderr } = await execAsync(`curl -s --insecure ${url.toString()}`);

    if (stderr && !stdout) {
      throw new Error(`curl error: ${stderr}`);
    }

    let jsonData;
    try {
      jsonData = JSON.parse(stdout);
    } catch (e) {
      throw new Error(`TMDB API error: Invalid JSON response - ${stdout.substring(0, 100)}`);
    }

    if (jsonData.status_message) {
      throw new Error(`TMDB API error: ${jsonData.status_message}`);
    }

    return jsonData;
  } catch (err) {
    if (retryCount < maxRetries && err.message.includes('ECONNRESET')) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return fetchTMDBViaCurl(endpoint, params, retryCount + 1, maxRetries);
    }
    throw err;
  }
};

const fetchTMDBViaHttps = async (endpoint, params = {}, retryCount = 0, maxRetries = 3) => {
  if (!tmdbApiKey) {
    throw new Error('TMDB API key not configured. Set TMDB_API_KEY environment variable.');
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', tmdbApiKey);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  return new Promise((resolve, reject) => {
    const req = https.request(
      url.toString(),
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'iRECOMMEND/1.0',
          'Connection': 'close'
        },
        rejectUnauthorized: false,
        timeout: 15000
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`TMDB API error: HTTP ${res.statusCode}`));
            return;
          }
          try {
            const jsonData = JSON.parse(data);
            if (jsonData.status_message) {
              reject(new Error(`TMDB API error: ${jsonData.status_message}`));
            } else {
              resolve(jsonData);
            }
          } catch (e) {
            reject(new Error(`Invalid JSON: ${data.substring(0, 100)}`));
          }
        });
      }
    );

    req.on('error', (err) => {
      if (retryCount < maxRetries && err.message.includes('ECONNRESET')) {
        setTimeout(() => {
          fetchTMDBViaHttps(endpoint, params, retryCount + 1, maxRetries)
            .then(resolve)
            .catch(reject);
        }, 1000 * (retryCount + 1));
      } else {
        reject(err);
      }
    });
    req.on('timeout', () => {
      req.destroy();
      if (retryCount < maxRetries) {
        setTimeout(() => {
          fetchTMDBViaHttps(endpoint, params, retryCount + 1, maxRetries)
            .then(resolve)
            .catch(reject);
        }, 1000 * (retryCount + 1));
      } else {
        reject(new Error('Request timeout'));
      }
    });

    req.end();
  });
};

const fetchTMDB = async (endpoint, params = {}) => {
  try {
    return await fetchTMDBViaCurl(endpoint, params);
  } catch (err) {
    const msg = err.message.toLowerCase();
    if (msg.includes('command not found') || msg.includes('curl') || msg.includes('curl error')) {
      return fetchTMDBViaHttps(endpoint, params);
    }
    throw err;
  }
};

const formatMovieData = (tmdbMovie, type = 'movie') => ({
  id: String(tmdbMovie.id),
  title: tmdbMovie.title || tmdbMovie.name,
  genres: tmdbMovie.genre_ids ? getGenreNames(tmdbMovie.genre_ids) : (tmdbMovie.genres?.map(g => g.name) || []),
  year: tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.split('-')[0]) : (tmdbMovie.first_air_date ? parseInt(tmdbMovie.first_air_date.split('-')[0]) : null),
  rating: tmdbMovie.vote_average || 0,
  type: type,
  overview: tmdbMovie.overview || '',
  poster: tmdbMovie.poster_path ? `${TMDB_IMAGE_BASE}${tmdbMovie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image',
  backdrop: tmdbMovie.backdrop_path ? `https://image.tmdb.org/t/p/w780${tmdbMovie.backdrop_path}` : null,
  director: tmdbMovie.credits?.crew?.find(c => c.job === 'Director')?.name || null,
  cast: tmdbMovie.credits?.cast?.slice(0, 5).map(c => ({ name: c.name, character: c.character })) || [],
  runtime: type === 'movie' ? tmdbMovie.runtime : null,
  episodes: type === 'tv' ? tmdbMovie.number_of_episodes : null,
  seasons: type === 'tv' ? tmdbMovie.number_of_seasons : null,
  tmdbId: tmdbMovie.id
});

const genreMap = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10737: 'Family', 10729: 'Fantasy', 878: 'Sci-Fi',
  53: 'Thriller', 10749: 'Romance', 14: 'Fantasy', 36: 'History', 27: 'Horror',
  10402: 'Music', 9648: 'Mystery', 10751: 'Game Show', 10762: 'Kids',
  10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
  10767: 'Sport', 10768: 'TV Movie', 10769: 'War', 10770: 'TV Movie',
  10771: 'Western', 10776: 'Reality', 10777: 'Short'
};

const getGenreNames = (genreIds) => {
  return [...new Set(genreIds)].map(id => genreMap[id] || 'Other').filter(Boolean);
};

export const fetchMovieDetails = async (tmdbId) => {
  const movie = await fetchTMDB(`/movie/${tmdbId}`, { append_to_response: 'credits' });
  return formatMovieData(movie, 'movie');
};

export const fetchTVDetails = async (tmdbId) => {
  const tv = await fetchTMDB(`/tv/${tmdbId}`, { append_to_response: 'credits' });
  return formatMovieData(tv, 'tv');
};

export const fetchTopRatedMovies = async (page = 1) => {
  const data = await fetchTMDB('/movie/top_rated', { page });
  return data.results.map(m => ({
    id: String(m.id),
    title: m.title,
    genres: getGenreNames(m.genre_ids),
    year: m.release_date ? parseInt(m.release_date.split('-')[0]) : null,
    rating: m.vote_average || 0,
    type: 'movie',
    overview: m.overview || '',
    poster: m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image',
    tmdbId: m.id
  }));
};

export const fetchPopularMovies = async (page = 1) => {
  const [movieData, tvData] = await Promise.all([
    fetchTMDB('/movie/popular', { page }),
    fetchTMDB('/tv/popular', { page })
  ]);

  const movies = movieData.results.map(m => ({
    id: String(m.id),
    title: m.title,
    genres: getGenreNames(m.genre_ids),
    year: m.release_date ? parseInt(m.release_date.split('-')[0]) : null,
    rating: m.vote_average || 0,
    type: 'movie',
    overview: m.overview || '',
    poster: m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image',
    tmdbId: m.id
  }));

  const tvShows = tvData.results.map(t => ({
    id: String(t.id),
    title: t.name,
    genres: getGenreNames(t.genre_ids),
    year: t.first_air_date ? parseInt(t.first_air_date.split('-')[0]) : null,
    rating: t.vote_average || 0,
    type: 'tv',
    overview: t.overview || '',
    poster: t.poster_path ? `${TMDB_IMAGE_BASE}${t.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image',
    tmdbId: t.id
  }));

  return [...movies, ...tvShows];
};

export const searchTMDB = async (query, type = null, page = 1, limit = 20) => {
  let endpoint = '/search/multi';
  let params = { query, page };

  if (type === 'tv') {
    endpoint = '/search/tv';
  } else if (type === 'movie') {
    endpoint = '/search/movie';
  }

  const data = await fetchTMDB(endpoint, params);

  const results = data.results.map(item => ({
    id: String(item.id),
    title: item.title || item.name,
    genres: getGenreNames(item.genre_ids),
    year: item.release_date ? parseInt(item.release_date.split('-')[0]) : (item.first_air_date ? parseInt(item.first_air_date.split('-')[0]) : null),
    rating: item.vote_average || 0,
    type: item.title ? 'movie' : 'tv',
    overview: item.overview || '',
    poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image',
    tmdbId: item.id
  }));

  return {
    data: results,
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results
  };
};

export const syncMoviesFromFile = async (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const movies = JSON.parse(data);
    return movies;
  } catch (error) {
    throw new Error(`Failed to read movies file: ${error.message}`);
  }
};

export const exportMoviesToFile = async (movies, filePath = null) => {
  const outputPath = filePath || path.join(config.dataPath, 'movies.json');
  const data = JSON.stringify(movies, null, 2);
  fs.writeFileSync(outputPath, data, 'utf8');
  return outputPath;
};
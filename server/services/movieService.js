import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w300';

let movies = [];
let totalMovies = 0;
let moviesByType = {};

const isValidPoster = (posterPath) => {
  if (!posterPath) return false;
  return !posterPath.startsWith('invalid');
};

const getPlaceholderPoster = (title) => {
  return `https://via.placeholder.com/300x450?text=${encodeURIComponent(title)}`;
};

// Synchronous version for startup - optimized for fast startup
export const loadMoviesSync = () => {
  try {
    const moviesPath = path.join(config.dataPath, 'movies.json');
    const data = fs.readFileSync(moviesPath, 'utf8');
    movies = JSON.parse(data);

    movies = movies.map(movie => {
      const title = movie.title || movie.name || 'Unknown';

      if (movie.poster_path && isValidPoster(movie.poster_path)) {
        movie.poster = `${TMDB_IMAGE_BASE}${movie.poster_path}`;
      } else {
        movie.poster = getPlaceholderPoster(title);
      }

      return movie;
    });

    totalMovies = movies.length;

    moviesByType = movies.reduce((acc, movie) => {
      const type = movie.type || (movie.tmdbId >= 100000 ? 'tv' : 'movie');
      if (!acc[type]) acc[type] = [];
      acc[type].push({ ...movie, type });
      return acc;
    }, { movie: [], tv: [] });

    const movieCount = moviesByType.movie.length;
    const tvCount = moviesByType.tv.length;

    console.log(`Movies loaded: ${movieCount} movies, ${tvCount} TV series, ${totalMovies} total`);
  } catch (error) {
    console.error('Error loading movies:', error.message);
    movies = [];
    totalMovies = 0;
    moviesByType = { movie: [], tv: [] };
  }
};

// Async version (kept for backwards compatibility)
export const loadMovies = async () => {
  loadMoviesSync();
};

export const getMovieStats = () => ({
  total: totalMovies,
  movies: moviesByType.movie ? moviesByType.movie.length : 0,
  tv: moviesByType.tv ? moviesByType.tv.length : 0
});

export const getAllMovies = ({ page = 1, limit = 20, type, sort, search } = {}) => {
  let filteredMovies = [...movies];

  if (type) {
    const typeKey = type === 'tv' ? 'tv' : 'movie';
    filteredMovies = (moviesByType[typeKey] || []).map(m => ({ ...m, type: typeKey }));
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filteredMovies = filteredMovies.filter(m =>
      m.title.toLowerCase().includes(searchLower) ||
      m.overview.toLowerCase().includes(searchLower) ||
      (m.genres && m.genres.some(g => g.toLowerCase().includes(searchLower)))
    );
  }

  if (sort) {
    switch (sort) {
      case 'rating':
        filteredMovies.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'title':
        filteredMovies.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'year':
        filteredMovies.sort((a, b) => (b.year || 0) - (a.year || 0));
        break;
    }
  }

  const startIdx = (page - 1) * limit;
  const paginatedMovies = filteredMovies.slice(startIdx, startIdx + limit);

  return {
    data: paginatedMovies,
    page,
    limit,
    total: filteredMovies.length,
    totalPages: Math.ceil(filteredMovies.length / limit)
  };
};

export const getMovieById = (id) => {
  return movies.find(m => m.id === id || m.tmdbId === parseInt(id));
};

export const searchMovies = (query, limit = 10) => {
  if (!query) return [];

  const queryLower = query.toLowerCase();
  return movies
    .filter(m =>
      m.title.toLowerCase().includes(queryLower) ||
      m.overview.toLowerCase().includes(queryLower) ||
      (m.genres && m.genres.some(g => g.toLowerCase().includes(queryLower)))
    )
    .slice(0, limit);
};

export { movies };

// Fetch fresh movie data from TMDB API and update movies.json
export const fetchMoviesFromTMDB = async () => {
  const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
  const apiKey = config.tmdbApiKey;

  if (!apiKey) {
    console.error('TMDB_API_KEY not configured');
    return;
  }

  const moviesPath = path.join(config.dataPath, 'movies.json');
  const data = fs.readFileSync(moviesPath, 'utf8');
  const loadedMovies = JSON.parse(data);

  console.log(`Fetching fresh data for ${loadedMovies.length} movies from TMDB...`);

  const updated = [];
  for (let i = 0; i < loadedMovies.length; i++) {
    const movie = loadedMovies[i];
    const type = movie.type || (movie.tmdbId >= 100000 ? 'tv' : 'movie');
    const endpoint = type === 'tv'
      ? `${TMDB_BASE_URL}/tv/${movie.tmdbId}`
      : `${TMDB_BASE_URL}/movie/${movie.tmdbId}?append_to_response=credits`;

    try {
      const result = await new Promise((resolve, reject) => {
        const url = `${endpoint}?api_key=${apiKey}`;
        const req = require('https').get(url, (res) => {
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
        setTimeout(() => { req.destroy(); reject(new Error('Timeout')); }, 10000);
      });

      movie.poster_path = result.poster_path;
      const newTitle = result.title || result.name || movie.title;
      movie.title = newTitle;
      movie.genres = result.genre_ids || result.genres || [];
      movie.year = result.release_date ? parseInt(result.release_date.split('-')[0]) : (result.first_air_date ? parseInt(result.first_air_date.split('-')[0]) : null);
      movie.rating = result.vote_average || 0;

      if (result.poster_path && isValidPoster(result.poster_path)) {
        movie.poster = `${TMDB_IMAGE_BASE}${result.poster_path}`;
      } else {
        movie.poster = getPlaceholderPoster(newTitle);
      }
      console.log(`✓ Updated: ${newTitle}`);
    } catch (e) {
      console.log(`✗ Skipped: ${movie.title} - ${e.message}`);
      const title = movie.title || movie.name || 'Unknown';
      if (!movie.poster) movie.poster = getPlaceholderPoster(title);
    }

    if (i < loadedMovies.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    updated.push(movie);
  }

  fs.writeFileSync(moviesPath, JSON.stringify(updated, null, 2));
  console.log(`\nDone! Updated ${updated.length} movies.`);

  loadMoviesSync();
  return updated;
};

export const syncMoviesFromTMDB = () => {
  loadMoviesSync();
};
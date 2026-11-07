import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let movies = [];
let totalMovies = 0;
let moviesByType = {};

export const loadMovies = () => {
  try {
    const moviesPath = path.join(config.dataPath, 'movies.json');
    const data = fs.readFileSync(moviesPath, 'utf8');
    movies = JSON.parse(data);
    totalMovies = movies.length;

    moviesByType = movies.reduce((acc, movie) => {
      const type = movie.type || (movie.type === 'tv' ? 'tv' : 'movie');
      if (!acc[type]) acc[type] = [];
      acc[type].push(movie);
      return acc;
    }, {});

    const movieCount = moviesByType.movie ? moviesByType.movie.length : 0;
    const tvCount = moviesByType.tv ? moviesByType.tv.length : 0;

    console.log(`Movies loaded: ${movieCount} movies, ${tvCount} TV series, ${totalMovies} total`);
  } catch (error) {
    console.error('Error loading movies:', error.message);
    movies = [];
    totalMovies = 0;
  }
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
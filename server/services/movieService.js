import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let moviesCache = null;
let moviesById = null;

export function loadMovies() {
  if (moviesCache) return moviesCache;

  const data = fs.readFileSync(config.moviesJsonPath, 'utf-8');
  moviesCache = JSON.parse(data);
  moviesById = new Map(moviesCache.map(m => [m.id, m]));
  return moviesCache;
}

export function getMovies({ type, genre, page = 1, limit = 20, sort = 'rating', order = 'desc' } = {}) {
  const movies = loadMovies();

  let filtered = movies;

  if (type) {
    filtered = filtered.filter(m => m.type === type);
  }

  if (genre) {
    filtered = filtered.filter(m => m.genres.some(g => g.toLowerCase() === genre.toLowerCase()));
  }

  // Sort
  filtered.sort((a, b) => {
    let aVal = a[sort];
    let bVal = b[sort];

    if (sort === 'rating') {
      aVal = aVal || 0;
      bVal = bVal || 0;
    } else if (sort === 'year') {
      aVal = aVal || 0;
      bVal = bVal || 0;
    } else if (sort === 'title') {
      aVal = (aVal || '').toLowerCase();
      bVal = (bVal || '').toLowerCase();
    }

    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const total = filtered.length;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

export function searchMovies(query, { type, limit = 20 } = {}) {
  const movies = loadMovies();
  const lowerQuery = query.toLowerCase();

  let filtered = movies.filter(m =>
    m.title.toLowerCase().includes(lowerQuery) ||
    m.overview.toLowerCase().includes(lowerQuery) ||
    m.director.toLowerCase().includes(lowerQuery) ||
    m.genres.some(g => g.toLowerCase().includes(lowerQuery))
  );

  if (type) {
    filtered = filtered.filter(m => m.type === type);
  }

  // Sort by relevance (title match first, then overview)
  filtered.sort((a, b) => {
    const aTitle = a.title.toLowerCase().includes(lowerQuery);
    const bTitle = b.title.toLowerCase().includes(lowerQuery);
    if (aTitle !== bTitle) return aTitle ? -1 : 1;
    return (b.rating || 0) - (a.rating || 0);
  });

  return filtered.slice(0, limit);
}

export function getMovieById(id) {
  if (!moviesById) loadMovies();
  return moviesById.get(id) || null;
}

export function getGenres() {
  const movies = loadMovies();
  const genresSet = new Set();
  movies.forEach(m => m.genres.forEach(g => genresSet.add(g)));
  return Array.from(genresSet).sort();
}

export function getMovieStats() {
  const movies = loadMovies();
  return {
    total: movies.length,
    movies: movies.filter(m => m.type === 'movie').length,
    tv: movies.filter(m => m.type === 'tv').length,
    genres: getGenres().length
  };
}
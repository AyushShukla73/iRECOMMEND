import path from 'path';
import { fileURLToPath } from 'url';
import getDb from '../db/init.js';
import { movies } from './movieService.js';

export const syncMoviesToDatabase = () => {
  const db = getDb();

  db.exec(`CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    genres TEXT,
    year INTEGER,
    rating REAL,
    type TEXT DEFAULT 'movie',
    overview TEXT,
    poster TEXT,
    tmdbId INTEGER
  )`);

  const insert = db.prepare(`INSERT OR REPLACE INTO movies (id, title, genres, year, rating, type, overview, poster, tmdbId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const insertMany = db.transaction((movieList) => {
    for (const movie of movieList) {
      const genres = Array.isArray(movie.genres) ? JSON.stringify(movie.genres) : '[]';
      insert.run(
        String(movie.id),
        movie.title,
        genres,
        movie.year,
        movie.rating,
        movie.type || 'movie',
        movie.overview || null,
        movie.poster || null,
        movie.tmdbId || null
      );
    }
  });

  insertMany(movies);

  const count = db.prepare('SELECT COUNT(*) as count FROM movies').get().count;
  console.log(`Synced ${count} movies to database`);

  return count;
};

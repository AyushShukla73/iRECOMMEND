import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

export const getDb = () => {
  if (!db) {
    const dbPath = path.join(config.dataPath, 'users.sqlite');
    db = new Database(dbPath);
    initTables(db);
    console.log('SQLite database initialized at:', dbPath);
  }
  return db;
};

export const initDatabase = getDb;

const initTables = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      movie_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('like', 'watchlater', 'watched', 'rating')),
      value INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, movie_id, type)
    );

    CREATE INDEX IF NOT EXISTS idx_interactions_user_type ON user_interactions(user_id, type);
    CREATE INDEX IF NOT EXISTS idx_interactions_movie ON user_interactions(movie_id);
  `);
};

export default getDb;
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db/init.js';
import { generateToken } from '../middleware/auth.js';
import { getMovieById } from './movieService.js';

const SALT_ROUNDS = 12;

export function registerUser({ username, email, password }) {
  const db = getDatabase();

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'username';
    const err = new Error(`${field} already registered`);
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);

  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
  ).run(username, email, passwordHash);

  const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(user);

  return { user, token };
}

export function loginUser({ email, password }) {
  const db = getDatabase();

  const user = db.prepare('SELECT id, username, email, password_hash, created_at FROM users WHERE email = ?').get(email);
  if (!user) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const token = generateToken(user);
  const { password_hash, ...userSafe } = user;

  return { user: userSafe, token };
}

export function getUserById(id) {
  const db = getDatabase();
  return db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(id);
}

export function getUserInteractions(userId, type) {
  const db = getDatabase();
  return db.prepare(
    'SELECT movie_id, type, value, created_at FROM user_interactions WHERE user_id = ? AND type = ?'
  ).all(userId, type);
}

export function addInteraction(userId, movieId, type, value = null) {
  const db = getDatabase();

  // Verify movie exists in JSON data
  const movie = getMovieById(movieId);
  if (!movie) {
    const err = new Error('Movie not found');
    err.statusCode = 404;
    throw err;
  }

  try {
    db.prepare(
      'INSERT INTO user_interactions (user_id, movie_id, type, value) VALUES (?, ?, ?, ?)'
    ).run(userId, movieId, type, value);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // Already exists - update value if provided
      if (value !== null) {
        db.prepare(
          'UPDATE user_interactions SET value = ? WHERE user_id = ? AND movie_id = ? AND type = ?'
        ).run(value, userId, movieId, type);
      }
    } else {
      throw err;
    }
  }

  return true;
}

export function removeInteraction(userId, movieId, type) {
  const db = getDatabase();
  return db.prepare(
    'DELETE FROM user_interactions WHERE user_id = ? AND movie_id = ? AND type = ?'
  ).run(userId, movieId, type);
}

export function hasInteraction(userId, movieId, type) {
  const db = getDatabase();
  const result = db.prepare(
    'SELECT 1 FROM user_interactions WHERE user_id = ? AND movie_id = ? AND type = ?'
  ).get(userId, movieId, type);
  return !!result;
}

export function getUserLikes(userId) {
  return getUserInteractions(userId, 'like');
}

export function getUserWatchLater(userId) {
  return getUserInteractions(userId, 'watchlater');
}

export function getUserWatched(userId) {
  return getUserInteractions(userId, 'watched');
}

export function getUserRatings(userId) {
  return getUserInteractions(userId, 'rating');
}
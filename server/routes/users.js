import { Router } from 'express';
import getDb from '../db/init.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/me', protect, async (req, res, next) => {
  try {
    const db = getDb();

    const likes = db.prepare('SELECT movie_id FROM user_interactions WHERE user_id = ? AND type = ?', [req.user.id, 'like']).all();
    const watchlater = db.prepare('SELECT movie_id FROM user_interactions WHERE user_id = ? AND type = ?', [req.user.id, 'watchlater']).all();
    const watched = db.prepare('SELECT movie_id FROM user_interactions WHERE user_id = ? AND type = ?', [req.user.id, 'watched']).all();
    const ratings = db.prepare('SELECT movie_id, value FROM user_interactions WHERE user_id = ? AND type = ?', [req.user.id, 'rating']).all();

    res.json({
      success: true,
      data: {
        user: req.user,
        likes: likes.map(i => i.movie_id),
        watchlater: watchlater.map(i => i.movie_id),
        watched: watched.map(i => i.movie_id),
        ratings: ratings.reduce((acc, r) => {
          acc[r.movie_id] = r.value;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    next(error);
  }
});

router.put('/me', protect, async (req, res, next) => {
  try {
    const { username, email } = req.body;
    const db = getDb();

    if (username) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user.id);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: { message: 'Username already taken' }
        });
      }
    }

    if (email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: { message: 'Email already taken' }
        });
      }
    }

    db.prepare('UPDATE users SET username = COALESCE(?, username), email = COALESCE(?, email) WHERE id = ?').run(username, email, req.user.id);

    const updatedUser = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.user.id);

    res.json({
      success: true,
      data: { user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me/likes', protect, async (req, res, next) => {
  try {
    const db = getDb();
    const likes = db.prepare('SELECT movie_id FROM user_interactions WHERE user_id = ? AND type = ?', [req.user.id, 'like']).all();
    res.json({ success: true, data: { likes: likes.map(i => i.movie_id) } });
  } catch (error) {
    next(error);
  }
});

router.post('/me/likes/:movieId', protect, async (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO user_interactions (user_id, movie_id, type) VALUES (?, ?, ?)').run(req.user.id, req.params.movieId, 'like');
    res.json({ success: true, data: { message: 'Movie added to likes' } });
  } catch (error) {
    next(error);
  }
});

router.delete('/me/likes/:movieId', protect, async (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM user_interactions WHERE user_id = ? AND movie_id = ? AND type = ?').run(req.user.id, req.params.movieId, 'like');
    res.json({ success: true, data: { message: 'Movie removed from likes' } });
  } catch (error) {
    next(error);
  }
});

router.get('/me/watchlater', protect, async (req, res, next) => {
  try {
    const db = getDb();
    const watchlater = db.prepare('SELECT movie_id FROM user_interactions WHERE user_id = ? AND type = ?', [req.user.id, 'watchlater']).all();
    res.json({ success: true, data: { watchlater: watchlater.map(i => i.movie_id) } });
  } catch (error) {
    next(error);
  }
});

router.post('/me/watchlater/:movieId', protect, async (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO user_interactions (user_id, movie_id, type) VALUES (?, ?, ?)').run(req.user.id, req.params.movieId, 'watchlater');
    res.json({ success: true, data: { message: 'Movie added to watch later' } });
  } catch (error) {
    next(error);
  }
});

router.delete('/me/watchlater/:movieId', protect, async (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM user_interactions WHERE user_id = ? AND movie_id = ? AND type = ?', [req.user.id, req.params.movieId, 'watchlater']).run();
    res.json({ success: true, data: { message: 'Movie removed from watch later' } });
  } catch (error) {
    next(error);
  }
});

router.get('/me/watched', protect, async (req, res, next) => {
  try {
    const db = getDb();
    const watched = db.prepare('SELECT movie_id FROM user_interactions WHERE user_id = ? AND type = ?', [req.user.id, 'watched']).all();
    res.json({ success: true, data: { watched: watched.map(i => i.movie_id) } });
  } catch (error) {
    next(error);
  }
});

router.post('/me/watched/:movieId', protect, async (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO user_interactions (user_id, movie_id, type) VALUES (?, ?, ?)').run(req.user.id, req.params.movieId, 'watched');
    res.json({ success: true, data: { message: 'Movie marked as watched' } });
  } catch (error) {
    next(error);
  }
});

router.delete('/me/watched/:movieId', protect, async (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM user_interactions WHERE user_id = ? AND movie_id = ? AND type = ?', [req.user.id, req.params.movieId, 'watched']).run();
    res.json({ success: true, data: { message: 'Movie removed from watched' } });
  } catch (error) {
    next(error);
  }
});

export default router;
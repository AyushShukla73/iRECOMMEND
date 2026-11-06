import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate, interactionValidation, ratingValidation } from '../middleware/validation.js';
import {
  getUserLikes,
  getUserWatchLater,
  getUserWatched,
  getUserRatings,
  addInteraction,
  removeInteraction,
  hasInteraction
} from '../services/userService.js';
import { getMovieById } from '../services/movieService.js';

const router = express.Router();

/**
 * @route GET /api/users/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: { user: req.user }
  });
});

/**
 * @route GET /api/users/me/likes
 * @desc Get user's liked movies
 * @access Private
 */
router.get('/me/likes', requireAuth, async (req, res) => {
  try {
    const interactions = getUserLikes(req.user.id);
    const movies = interactions.map(i => getMovieById(i.movie_id)).filter(Boolean);

    res.json({
      success: true,
      data: { movies, count: movies.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @route GET /api/users/me/watchlater
 * @desc Get user's watch later list
 * @access Private
 */
router.get('/me/watchlater', requireAuth, async (req, res) => {
  try {
    const interactions = getUserWatchLater(req.user.id);
    const movies = interactions.map(i => getMovieById(i.movie_id)).filter(Boolean);

    res.json({
      success: true,
      data: { movies, count: movies.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @route GET /api/users/me/watched
 * @desc Get user's watched movies
 * @access Private
 */
router.get('/me/watched', requireAuth, async (req, res) => {
  try {
    const interactions = getUserWatched(req.user.id);
    const movies = interactions.map(i => getMovieById(i.movie_id)).filter(Boolean);

    res.json({
      success: true,
      data: { movies, count: movies.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @route GET /api/users/me/ratings
 * @desc Get user's ratings
 * @access Private
 */
router.get('/me/ratings', requireAuth, async (req, res) => {
  try {
    const interactions = getUserRatings(req.user.id);
    const movies = interactions.map(i => getMovieById(i.movie_id)).filter(Boolean);

    res.json({
      success: true,
      data: { movies, count: movies.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @route POST /api/users/me/likes/:movieId
 * @desc Like a movie
 * @access Private
 */
router.post('/me/likes/:movieId', requireAuth, (req, res) => {
  try {
    const { movieId } = req.params;
    const movie = getMovieById(movieId);

    if (!movie) {
      return res.status(404).json({
        success: false,
        error: { message: 'Movie not found' }
      });
    }

    addInteraction(req.user.id, movieId, 'like');

    res.json({
      success: true,
      message: 'Movie added to likes'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @route DELETE /api/users/me/likes/:movieId
 * @desc Unlike a movie
 * @access Private
 */
router.delete('/me/likes/:movieId', requireAuth, (req, res) => {
  try {
    const { movieId } = req.params;
    removeInteraction(req.user.id, movieId, 'like');

    res.json({
      success: true,
      message: 'Movie removed from likes'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @route POST /api/users/me/watchlater/:movieId
 * @desc Add movie to watch later
 * @access Private
 */
router.post('/me/watchlater/:movieId', requireAuth, (req, res) => {
  try {
    const { movieId } = req.params;
    const movie = getMovieById(movieId);

    if (!movie) {
      return res.status(404).json({
        success: false,
        error: { message: 'Movie not found' }
      });
    }

    addInteraction(req.user.id, movieId, 'watchlater');

    res.json({
      success: true,
      message: 'Movie added to watch later'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @route DELETE /api/users/me/watchlater/:movieId
 * @desc Remove movie from watch later
 * @access Private
 */
router.delete('/me/watchlater/:movieId', requireAuth, (req, res) => {
  try {
    const { movieId } = req.params;
    removeInteraction(req.user.id, movieId, 'watchlater');

    res.json({
      success: true,
      message: 'Movie removed from watch later'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @route POST /api/users/me/watched/:movieId
 * @desc Mark movie as watched
 * @access Private
 */
router.post('/me/watched/:movieId', requireAuth, (req, res) => {
  try {
    const { movieId } = req.params;
    const movie = getMovieById(movieId);

    if (!movie) {
      return res.status(404).json({
        success: false,
        error: { message: 'Movie not found' }
      });
    }

    addInteraction(req.user.id, movieId, 'watched');

    res.json({
      success: true,
      message: 'Movie marked as watched'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @route DELETE /api/users/me/watched/:movieId
 * @desc Remove movie from watched
 * @access Private
 */
router.delete('/me/watched/:movieId', requireAuth, (req, res) => {
  try {
    const { movieId } = req.params;
    removeInteraction(req.user.id, movieId, 'watched');

    res.json({
      success: true,
      message: 'Movie removed from watched'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @route POST /api/users/me/rating/:movieId
 * @desc Rate a movie
 * @access Private
 */
router.post('/me/rating/:movieId', requireAuth, (req, res) => {
  try {
    const { movieId } = req.params;
    const { value } = req.body;

    const ratingValidation = [
      req.params.movieId = { trim: true, notEmpty: true },
      req.body.value = { isInt: { min: 1, max: 5 }, toInt: true }
    ];

    const movie = getMovieById(movieId);
    if (!movie) {
      return res.status(404).json({
        success: false,
        error: { message: 'Movie not found' }
      });
    }

    addInteraction(req.user.id, movieId, 'rating', value);

    res.json({
      success: true,
      message: 'Movie rated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

export default router;
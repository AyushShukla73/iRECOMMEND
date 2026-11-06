import express from 'express';
import { validate, movieSearchValidation, movieIdValidation } from '../middleware/validation.js';
import { getMovies, searchMovies, getMovieById, getGenres, getMovieStats } from '../services/movieService.js';

const router = express.Router();

/**
 * @route GET /api/movies
 * @desc Get movies with pagination, filtering, and sorting
 * @access Public
 */
router.get('/', movieSearchValidation, validate, (req, res) => {
  try {
    const {
      type,
      genre,
      page = 1,
      limit = 20,
      sort = 'rating',
      order = 'desc'
    } = req.query;

    const movies = getMovies({
      type: type || undefined,
      genre: genre || undefined,
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      order
    });

    res.json({
      success: true,
      data: movies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @route GET /api/movies/search
 * @desc Search movies
 * @access Public
 */
router.get('/search', movieSearchValidation, validate, (req, res) => {
  try {
    const { q = '', type } = req.query;

    if (!q.trim()) {
      return res.json({
        success: true,
        data: []
      });
    }

    const results = searchMovies(q, {
      type: type || undefined,
      limit: 20
    });

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @route GET /api/movies/genres
 * @desc Get all genres
 * @access Public
 */
router.get('/genres', (req, res) => {
  const genres = getGenres();
  res.json({
    success: true,
    data: { genres }
  });
});

/**
 * @route GET /api/movies/stats
 * @desc Get movie statistics
 * @access Public
 */
router.get('/stats', (req, res) => {
  const stats = getMovieStats();
  res.json({
    success: true,
    data: stats
  });
});

/**
 * @route GET /api/movies/:id
 * @desc Get movie by ID
 * @access Public
 */
router.get('/:id', movieIdValidation, validate, (req, res) => {
  try {
    const movie = getMovieById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        error: { message: 'Movie not found' }
      });
    }

    res.json({
      success: true,
      data: { movie }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

export default router;
import { Router } from 'express';
import { getAllMovies, getMovieById, searchMovies, getMovieStats, loadMovies } from '../services/movieService.js';
import { protect } from '../middleware/auth.js';
import { config } from '../config/env.js';
import {
  fetchMovieDetails,
  fetchTVDetails,
  fetchTopRatedMovies,
  fetchPopularMovies,
  searchTMDB,
  setTMDBApiKey
} from '../services/tmdbService.js';

const router = Router();

// Configure TMDB API key
if (config.tmdbApiKey) {
  setTMDBApiKey(config.tmdbApiKey);
}

// Local movie endpoints
router.get('/', (req, res) => {
  const { page = 1, limit = 20, type, sort, search } = req.query;

  const pagination = getAllMovies({
    page: parseInt(page),
    limit: parseInt(limit),
    type,
    sort,
    search
  });

  res.json({
    success: true,
    data: pagination.data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages
    }
  });
});

router.get('/types', (req, res) => {
  res.json({
    success: true,
    data: {
      types: ['movie', 'tv']
    }
  });
});

router.get('/search', (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      error: { message: 'Search query is required' }
    });
  }

  const results = searchMovies(q, parseInt(limit));

  res.json({
    success: true,
    data: results
  });
});

router.get('/stats', (req, res) => {
  const stats = getMovieStats();
  res.json({
    success: true,
    data: stats
  });
});

router.get('/:id', (req, res) => {
  const movie = getMovieById(req.params.id);

  if (!movie) {
    return res.status(404).json({
      success: false,
      error: { message: 'Movie not found' }
    });
  }

  res.json({
    success: true,
    data: movie
  });
});

// TMDB API endpoints
router.get('/tmdb/popular', async (req, res, next) => {
  if (!config.tmdbApiKey) {
    return res.status(503).json({
      success: false,
      error: { message: 'TMDB API key not configured' }
    });
  }

  try {
    const { page = 1, limit = 20 } = req.query;
    const movies = await fetchPopularMovies();
    res.json({
      success: true,
      data: movies.slice(0, parseInt(limit)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: movies.length
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/tmdb/top-rated', async (req, res, next) => {
  if (!config.tmdbApiKey) {
    return res.status(503).json({
      success: false,
      error: { message: 'TMDB API key not configured' }
    });
  }

  try {
    const { page = 1 } = req.query;
    const movies = await fetchTopRatedMovies(parseInt(page));
    res.json({
      success: true,
      data: movies,
      pagination: {
        page: parseInt(page),
        limit: 20,
        total: movies.length
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/tmdb/search', async (req, res, next) => {
  if (!config.tmdbApiKey) {
    return res.status(503).json({
      success: false,
      error: { message: 'TMDB API key not configured' }
    });
  }

  try {
    const { q, type, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: { message: 'Search query is required' }
      });
    }

    const result = await searchTMDB(q, type || null, parseInt(page), parseInt(limit));
    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: parseInt(limit),
        total: result.totalResults,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/tmdb/movie/:id', async (req, res, next) => {
  if (!config.tmdbApiKey) {
    return res.status(503).json({
      success: false,
      error: { message: 'TMDB API key not configured' }
    });
  }

  try {
    const movie = await fetchMovieDetails(req.params.id);
    res.json({
      success: true,
      data: movie
    });
  } catch (error) {
    next(error);
  }
});

router.get('/tmdb/tv/:id', async (req, res, next) => {
  if (!config.tmdbApiKey) {
    return res.status(503).json({
      success: false,
      error: { message: 'TMDB API key not configured' }
    });
  }

  try {
    const tv = await fetchTVDetails(req.params.id);
    res.json({
      success: true,
      data: tv
    });
  } catch (error) {
    next(error);
  }
});

export default router;
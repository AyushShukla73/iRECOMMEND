import { Router } from 'express';
import { getAllMovies, getMovieById, searchMovies, getMovieStats } from '../services/movieService.js';
import { protect } from '../middleware/auth.js';

const router = Router();

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

export default router;
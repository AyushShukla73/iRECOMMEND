import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to iRECOMMEND API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'Login with email and password',
        'POST /api/auth/logout': 'Logout user',
        'GET /api/auth/me': 'Get current user (requires auth)'
      },
      movies: {
        'GET /api/movies': 'List movies (supports pagination, filtering)',
        'GET /api/movies/:id': 'Get movie by TMDB ID',
        'GET /api/movies/search?q=query': 'Search movies',
        'GET /api/movies/genres': 'Get all genres',
        'GET /api/movies/stats': 'Get movie database statistics'
      },
      recommendations: {
        'GET /api/recommendations': 'Get personalized recommendations (optional auth)',
        'GET /api/recommendations/debug/:userId': 'Debug recommendations (requires auth)'
      },
      health: {
        'GET /api/health': 'Health check'
      }
    }
  });
});

export default router;
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    name: 'iRECOMMEND API',
    version: '1.0.0',
    description: 'Movie Recommendation App with KNN Collaborative Filtering',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'Login with email and password',
        'POST /api/auth/logout': 'Logout user',
        'GET /api/auth/me': 'Get current user'
      },
      movies: {
        'GET /api/movies': 'Get all movies (supports ?type=movie|tv&page=1&limit=20&sort=rating|title|year&search=query)',
        'GET /api/movies/:id': 'Get movie by ID',
        'GET /api/movies/types': 'Get available movie types'
      },
      users: {
        'GET /api/users/me': 'Get current user profile',
        'PUT /api/users/me': 'Update user profile',
        'GET /api/users/me/likes': 'Get user liked movies',
        'POST /api/users/me/likes/:movieId': 'Like a movie',
        'DELETE /api/users/me/likes/:movieId': 'Unlike a movie',
        'GET /api/users/me/watchlater': 'Get watch later list',
        'POST /api/users/me/watchlater/:movieId': 'Add to watch later',
        'DELETE /api/users/me/watchlater/:movieId': 'Remove from watch later',
        'GET /api/users/me/watched': 'Get watched movies',
        'POST /api/users/me/watched/:movieId': 'Mark as watched',
        'DELETE /api/users/me/watched/:movieId': 'Remove from watched'
      },
      recommendations: {
        'GET /api/recommendations': 'Get personalized recommendations (requires auth)'
      },
      health: {
        'GET /api/health': 'Health check endpoint'
      }
    }
  });
});

export default router;
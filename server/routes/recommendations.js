import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { getRecommendations } from '../services/recommendationService.js';

const router = express.Router();

/**
 * @route GET /api/recommendations
 * @desc Get personalized movie recommendations
 * @access Private (optional for anonymous users - shows popular)
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    const {
      limit = 10,
      type,
      genre,
      debug = false
    } = req.query;

    const userId = req.user?.id;

    const result = getRecommendations(userId, {
      limit: parseInt(limit),
      type: type || undefined,
      genre: genre || undefined,
      debug: debug === 'true'
    });

    res.json({
      success: true,
      data: result.movies,
      meta: {
        total: result.movies.length,
        method: result.metadata.method,
        reason: result.metadata.reason
      }
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @route GET /api/recommendations/similar/:movieId
 * @desc Get similar movies for a movie ID (content-based)
 * @access Public
 */
router.get('/similar/:movieId', optionalAuth, (req, res) => {
  try {
    // This would need to be implemented in the recommendation service
    // For now, return a simple content-based recommendation
    const { movieId } = req.params;

    res.json({
      success: true,
      message: 'This endpoint is not yet implemented'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @route GET /api/recommendations/debug/:userId
 * @desc Get debug info about recommendations for a user
 * @access Private (only own recommendations)
 */
router.get('/debug/:userId', requireAuth, (req, res) => {
  try {
    const { userId } = req.params;

    // Only allow users to see their own debug info
    if (parseInt(userId) !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' }
      });
    }

    const result = getRecommendations(userId, { debug: true });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

export default router;
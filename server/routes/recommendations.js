import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { getRecommendations } from '../services/recommendationService.js';

const router = Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    const recommendations = getRecommendations(req.user.id, { limit, page });

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
});

export default router;
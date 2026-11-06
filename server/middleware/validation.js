import { body, query, param, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: { message: 'Validation failed', details: errors.array() }
    });
  }
  next();
};

export const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters')
];

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const movieSearchValidation = [
  query('q').optional().trim().isLength({ max: 100 }),
  query('type').optional().isIn(['movie', 'tv']),
  query('genre').optional().trim().isLength({ max: 50 }),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sort').optional().isIn(['rating', 'year', 'title']),
  query('order').optional().isIn(['asc', 'desc'])
];

export const movieIdValidation = [
  param('id').trim().notEmpty().withMessage('Movie ID is required')
];

export const interactionValidation = [
  body('movieId').trim().notEmpty().withMessage('Movie ID is required'),
  body('type').isIn(['like', 'watchlater', 'watched', 'rating']).withMessage('Invalid interaction type'),
  body('value').optional().isInt({ min: 1, max: 5 }).toInt()
];

export const ratingValidation = [
  body('movieId').trim().notEmpty().withMessage('Movie ID is required'),
  body('value').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5').toInt()
];
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate, registerValidation, loginValidation } from '../middleware/validation.js';
import { registerUser, loginUser, getUserById } from '../services/userService.js';

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', registerValidation, validate, (req, res) => {
  try {
    const { username, email, password } = req.body;
    const { user, token } = registerUser({ username, email, password });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      data: {
        user,
        token
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
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', loginValidation, validate, (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = loginUser({ email, password });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      data: {
        user,
        token
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
 * @route POST /api/auth/logout
 * @desc Logout user (clear cookie)
 * @access Private
 */
router.post('/logout', requireAuth, (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

export default router;
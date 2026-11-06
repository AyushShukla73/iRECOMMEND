import jwt from 'jsonwebtoken';
import getDb from '../db/init.js';
import { config } from '../config/env.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Not authorized, no token' }
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);

      const db = getDb();
      const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'User no longer exists' }
        });
      }

      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: { message: 'Not authorized, token invalid' }
      });
    }
  } catch (error) {
    next(error);
  }
};

export const authMiddleware = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required' }
    });
  }
};
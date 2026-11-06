import jwt from 'jsonwebtoken';
import { getDatabase } from '../db/init.js';
import { config } from '../config/env.js';

export function requireAuth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required' }
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const db = getDatabase();
    const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Token expired' }
      });
    }
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid token' }
    });
  }
}

export function optionalAuth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const db = getDatabase();
    const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(decoded.userId);
    req.user = user || null;
  } catch {
    req.user = null;
  }

  next();
}

export function generateToken(user) {
  return jwt.sign({ userId: user.id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}
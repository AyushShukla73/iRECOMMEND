import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { initDatabase } from './db/init.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { loadMovies, getMovieStats } from './services/movieService.js';
import authRoutes from './routes/auth.js';
import movieRoutes from './routes/movies.js';
import userRoutes from './routes/users.js';
import recommendationRoutes from './routes/recommendations.js';
import apiIndexRoutes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.defaultDirectives,
      'img-src': ["'self'", "data:", "https://image.tmdb.org", "https://via.placeholder.com"],
      'connect-src': ["'self'", "https://image.tmdb.org"],
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: { message: 'Too many requests, please try again later' }
  }
});
app.use('/api', limiter);

// CORS
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser(config.jwtSecret));

// Compression
app.use(compression());

// Request logging (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API routes
app.use('/api', apiIndexRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/users', userRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    moviesLoaded: getMovieStats().total
  });
});

// 404 handler
app.use((req, res, next) => {
  next(new AppError(`${req.method} ${req.originalUrl} not found`, 404));
});

// Error handler
app.use(errorHandler);

// Initialize database before server starts
initDatabase();

// Pre-load movies
loadMovies();

const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
export { server };
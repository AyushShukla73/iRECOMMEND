// Disable SSL certificate validation for corporate environments with MITM proxies
// Required for TMDB API to work behind corporate firewall
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.NODE_V8_CHAIN_ANNOTATION = 'true';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { initDatabase } from './db/init.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { loadMoviesSync, getMovieStats } from './services/movieService.js';
import { syncMoviesToDatabase } from './services/syncMovies.js';
import { setTMDBApiKey } from './services/tmdbService.js';
import authRoutes from './routes/auth.js';
import movieRoutes from './routes/movies.js';
import userRoutes from './routes/users.js';
import recommendationRoutes from './routes/recommendations.js';
import apiIndexRoutes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build allowed origins for Vite dev server
const buildAllowedOrigins = () => {
  const origins = new Set();

  const basePort = config.port;
  for (let offset = -5; offset <= 5; offset++) {
    const port = basePort + offset;
    if (port > 0 && port < 65536) {
      origins.add(`http://localhost:${port}`);
      origins.add(`http://127.0.0.1:${port}`);
    }
  }

  const vitePort = config.vitePort;
  origins.add(`http://localhost:${vitePort}`);
  origins.add(`http://127.0.0.1:${vitePort}`);

  return Array.from(origins);
};

const allowedOrigins = buildAllowedOrigins();

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

app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins === '*') {
      callback(null, true);
    } else if (!origin || allowedOrigins.includes(origin) || origin === 'null' || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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

// Serve static assets from client directory (in all environments)
const clientDir = path.join(__dirname, '../client');

// Set correct Content-Type headers for static files
const mimeTypes = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

app.use((req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (mimeTypes[ext]) {
    res.setHeader('Content-Type', mimeTypes[ext]);
  }
  next();
});

app.use(express.static(clientDir, {
  extensions: ['html', 'js', 'css', 'json'],
  immutable: true
}));

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

// Serve index.html for SPA routes
app.get('/', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(clientDir, 'favicon.ico'));
});

// 404 handler
app.use((req, res, next) => {
  next(new AppError(`${req.method} ${req.originalUrl} not found`, 404));
});

// Error handler
app.use(errorHandler);

// Module-scoped variables for port access
let server = null;
let actualPort = null;

const startServer = () => {
  // Ensure data directory exists
  const dataDir = path.join(path.dirname(__filename), '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initialize database
  initDatabase();

  // Pre-load movies synchronously and sync to database
  loadMoviesSync();
  syncMoviesToDatabase();

  // Initialize TMDB API key
  if (config.tmdbApiKey) {
    setTMDBApiKey(config.tmdbApiKey);
    console.log('TMDB API key initialized');
  }

  // Start server asynchronously
  let portRetryAttempts = 0;
  const MAX_PORT_RETRIES = 5;

  const writePortFile = (port) => {
    const portFile = path.join(__dirname, '../data/server-port.json');
    try {
      // Write port file synchronously so Vite can read it before server starts
      fs.writeFileSync(portFile, JSON.stringify({ port, timestamp: new Date().toISOString() }, null, 2));
    } catch (e) {
      // Ignore errors writing port file
    }
  };

  const tryStartServer = async (port) => {
    return new Promise((resolve, reject) => {
      // Update actualPort and write port file immediately for Vite to read
      actualPort = port;
      writePortFile(actualPort);
      server = app.listen(port, () => {
        console.log(`Server running on port ${actualPort}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        resolve();
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && portRetryAttempts < MAX_PORT_RETRIES) {
          portRetryAttempts++;
          console.error(`Port ${port} is in use, trying ${port + 1}... (attempt ${portRetryAttempts}/${MAX_PORT_RETRIES})`);
          server.removeAllListeners('error');
          tryStartServer(port + 1).then(resolve).catch(reject);
        } else if (err.code === 'EADDRINUSE') {
          reject(new Error(`Could not find available port after ${MAX_PORT_RETRIES} attempts`));
        } else {
          reject(err);
        }
      });
    });
  };

  tryStartServer(config.port).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
};

startServer();

export default app;
export { server, actualPort };
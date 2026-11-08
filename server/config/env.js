import dotenv from 'dotenv';
dotenv.config({ path: '.env', override: true });

export const config = {
  port: parseInt(process.env.PORT, 10) || 5174,
  vitePort: parseInt(process.env.VITE_PORT, 10) || 5173,
  jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000
  },
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  dataPath: process.env.DATA_PATH || './data',
  tmdbApiKey: process.env.TMDB_API_KEY || '',
  // Windows TCP fix: allow reusing ports in TIME_WAIT state
  tcpReuseAddr: process.env.TCP_REUSE_ADDR === 'true'
};

console.log('[ENV] Loaded config:', {
  port: config.port,
  vitePort: config.vitePort,
  tmdbApiKey: config.tmdbApiKey ? 'configured' : 'not configured',
  nodeEnv: process.env.NODE_ENV
});

const requiredEnvVars = [];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error('Missing required environment variables:', missingVars);
  process.exit(1);
}
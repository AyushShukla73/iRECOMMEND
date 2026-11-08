export class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Mark TMDB-related errors and common operational errors as operational so they show real error messages
const markOperational = (err) => {
  const operationalIndicators = [
    'TMDB API',
    'Network error',
    'ECONNRESET',
    'timeout',
    'not found',
    'Invalid JSON',
    'request timeout',
    'api error'
  ];
  if (err.message) {
    const msgLower = err.message.toLowerCase();
    if (operationalIndicators.some(ind => msgLower.includes(ind.toLowerCase()))) {
      err.isOperational = true;
    }
  }
};

export const errorHandler = (err, req, res, next) => {
  // Log the actual error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', err);
  }

  markOperational(err);

  let error = { ...err };
  error.message = err.message;

  if (!err.isOperational) {
    error = {
      message: 'Something went wrong',
      statusCode: 500
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
};

export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
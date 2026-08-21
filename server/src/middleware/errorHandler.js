/**
 * Global Error Handler Middleware
 *
 * Catches all unhandled errors in the Express pipeline.
 * Returns a structured JSON error response.
 */

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log the full error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('🔥 Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  } else {
    console.error('🔥 Error:', err.message);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

/**
 * Not Found Middleware
 *
 * Catches requests to undefined routes and forwards a 404 error.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found — ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, notFound };

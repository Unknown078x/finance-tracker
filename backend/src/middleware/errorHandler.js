const logger = require('../utils/logger');

// Catches anything thrown or passed to next() in route handlers, logs it once
// with request context, and returns a consistent JSON error shape so the
// frontend never has to guess the response format.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;

  logger.error(err.message, {
    status,
    path: req.originalUrl,
    method: req.method,
    userId: req.user && req.user.id,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  res.status(status).json({
    error: status === 500 ? 'Something went wrong on our end' : err.message,
  });
}

function notFound(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };

const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const helmet = require('helmet');

/**
 * Strict rate limiter for sensitive authentication endpoints
 * (Registration, Login, Password Changes) to prevent brute-force attacks.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 20, // 20 requests per window in production
  standardHeaders: true, // Return standard RateLimit headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * General rate limiter for public API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 5000 : 300, // 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please slow down.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = {
  authLimiter,
  apiLimiter,
  helmetMiddleware: helmet(),
  mongoSanitizeMiddleware: mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Security] Sanitized prohibited character in query/body parameter: ${key}`);
      }
    },
  }),
  hppMiddleware: hpp(),
};

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
  max: process.env.NODE_ENV === 'test' ? 1000 : 25, // 25 attempts per 15 min per IP in production
  standardHeaders: true, // Return standard RateLimit headers (RFC 7764)
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Rate limiter for computationally intensive matching & preview algorithms
 * to prevent CPU / algorithmic denial of service.
 */
const matchLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'test' ? 5000 : 60, // 60 match computations per 10 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Matching calculation request limit reached for this IP. Please slow down.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Write limiter for mutation operations (creating requests, assignments, reviews)
 * to prevent spam or mass submission.
 */
const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'test' ? 5000 : 40, // 40 creation/mutation actions per 10 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many submissions from this IP. Please wait a few moments before trying again.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * General rate limiter for all public /api endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 10000 : 350, // 350 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please slow down.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Content Security & HTTP security headers via Helmet
 */
const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // APIs serving JSON do not require HTML CSP
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

module.exports = {
  authLimiter,
  matchLimiter,
  writeLimiter,
  apiLimiter,
  helmetMiddleware,
  mongoSanitizeMiddleware: mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Security] Prohibited operator sanitized in parameter: ${key}`);
      }
    },
  }),
  hppMiddleware: hpp({
    whitelist: ['status', 'category', 'urgency', 'role', 'city'], // parameters allowed to repeat
  }),
};

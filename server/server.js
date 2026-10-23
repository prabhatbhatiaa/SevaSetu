const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./src/config/db');

// Load environment variables
dotenv.config();

// Enforce strong JWT secret in production mode
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET must be configured with at least 32 characters in production.');
    process.exit(1);
  }
}

// Initialize express app
const app = express();

// Enable trust proxy (essential for rate limiting and secure headers behind Nginx/Render/Railway)
app.set('trust proxy', 1);

const {
  helmetMiddleware,
  mongoSanitizeMiddleware,
  hppMiddleware,
  apiLimiter,
} = require('./src/middleware/security');

// Request correlation ID tracking
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// Security HTTP headers
app.use(helmetMiddleware);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing with size bounds to prevent payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Sanitize user inputs against MongoDB query operator injection ($gt, etc.)
app.use(mongoSanitizeMiddleware);

// Prevent HTTP Parameter Pollution
app.use(hppMiddleware);

// Apply general API rate limiting to all /api routes
app.use('/api', apiLimiter);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health & Probes
app.get('/', (req, res) => {
  res.status(200).json({
    project: 'SevaSetu API',
    description: 'Community Service Request and Volunteer Matching Platform',
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Liveness probe (process responsive)
app.get('/api/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe (database readiness check)
app.get('/api/ready', (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  if (isDbReady) {
    return res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  }
  return res.status(503).json({
    status: 'unready',
    database: 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  res.status(isDbReady ? 200 : 503).json({
    status: isDbReady ? 'healthy' : 'degraded',
    uptime: Math.floor(process.uptime()),
    database: isDbReady ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/volunteers', require('./src/routes/volunteerRoutes'));
app.use('/api/requests', require('./src/routes/requestRoutes'));
app.use('/api/assignments', require('./src/routes/assignmentRoutes'));
app.use('/api/reviews', require('./src/routes/reviewRoutes'));
app.use('/api/impact', require('./src/routes/impactRoutes'));
app.use('/api/public/impact', (req, res, next) => {
  req.url = '/statistics';
  require('./src/routes/impactRoutes')(req, res, next);
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found on this server.`,
  });
});

// Global Safe Production Error Handler
app.use((err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const correlationId = req.id;

  // Internal logging with correlation ID
  console.error(`[Error][${correlationId || 'N/A'}]`, err.stack || err.message);

  let statusCode = err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value '${err.value}' for field '${err.path}'.`;
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errorDetails = Object.values(err.errors || {}).map((e) => e.message);
    message = errorDetails.length > 0 ? errorDetails.join(', ') : 'Validation error.';
  }

  // Handle MongoDB Duplicate Key (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'resource';
    message = `A record with this ${field} already exists.`;
  }

  // Mask internal 500 error messages in production
  if (isProduction && statusCode === 500) {
    message = 'An unexpected internal server error occurred. Please try again later.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    requestId: correlationId,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

const PORT = process.env.PORT || 5000;
let server;

async function startServer() {
  if (process.env.NODE_ENV !== 'test') {
    try {
      await connectDB();
      server = app.listen(PORT, () => {
        console.log(`=========================================`);
        console.log(`  SevaSetu API Server running on port ${PORT}`);
        console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`  Client Origin: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
        console.log(`=========================================`);
      });

      const gracefulShutdown = async (signal) => {
        console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);
        if (server) {
          server.close(async () => {
            console.log('[Server] HTTP connections closed.');
            try {
              await disconnectDB();
              console.log('[Server] Database disconnected cleanly.');
              process.exit(0);
            } catch (closeErr) {
              console.error('[Server] Error during database disconnect:', closeErr);
              process.exit(1);
            }
          });

          // Force shutdown if ongoing requests do not complete within 10 seconds
          setTimeout(() => {
            console.error('[Server] Forced shutdown after timeout.');
            process.exit(1);
          }, 10000).unref();
        } else {
          process.exit(0);
        }
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    } catch (startupErr) {
      console.error('Failed to start server:', startupErr);
      process.exit(1);
    }
  }
}

startServer();

module.exports = app;

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const { connectDB } = require('./src/config/db');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Connect to MongoDB (skip auto-connect in test mode so tests manage their own isolated database)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

const {
  helmetMiddleware,
  mongoSanitizeMiddleware,
  hppMiddleware,
  apiLimiter,
} = require('./src/middleware/security');

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

// Health & Root routes
app.get('/', (req, res) => {
  res.status(200).json({
    project: 'SevaSetu API',
    description: 'Community Service Request and Volunteer Matching Platform',
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
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

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`  SevaSetu API Server running on port ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Client Origin: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    console.log(`=========================================`);
  });
}

module.exports = app;

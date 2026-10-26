const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { successResponse } = require('./utils/response');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Security HTTP headers
app.use(helmet());

// Credentialed CORS configuration with multi-origin and Vercel support
const allowedOrigins = [
  env.CLIENT_URL,
  env.FRONTEND_URL,
  'https://task-manager-livid-theta.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, same-origin, or server-side calls)
      if (!origin) return callback(null, true);

      // Allow configured origins, any vercel.app deployment, or local development
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost')
      ) {
        return callback(null, origin);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsers with reasonable size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser for HttpOnly authentication cookies
app.use(cookieParser(env.COOKIE_SECRET));

// General API rate limiter
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  return successResponse(res, 200, 'Server is operational and healthy', {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Mount application routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Catch 404 for unhandled API routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;

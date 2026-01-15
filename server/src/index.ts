import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { testConnection, closePool } from './db/connection.js';
import { cleanupExpiredSessions } from './services/auth.service.js';
import routes from './routes/index.js';
import {
  securityHeaders,
  generalRateLimiter,
  corsOptions,
  requestLogger,
  sanitizeBody,
  errorHandler,
  notFoundHandler,
} from './middleware/security.middleware.js';

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security headers
app.use(securityHeaders);

// CORS
app.use(cors(corsOptions()));

// Rate limiting
app.use(generalRateLimiter);

// Request logging
app.use(requestLogger);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Sanitize request body
app.use(sanitizeBody);

// API routes
app.use('/api', routes);

// Not found handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Graceful shutdown
let server: ReturnType<typeof app.listen>;

async function shutdown() {
  console.log('\nShutting down gracefully...');
  
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
    });
  }
  
  await closePool();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function start() {
  console.log('Starting Inventory Projections Server...');
  console.log(`Environment: ${config.nodeEnv}`);
  
  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }
  
  // Start session cleanup interval (every hour)
  setInterval(async () => {
    try {
      const cleaned = await cleanupExpiredSessions();
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired sessions`);
      }
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }, 60 * 60 * 1000);
  
  // Start HTTP server
  server = app.listen(config.port, () => {
    console.log(`✓ Server running on http://localhost:${config.port}`);
    console.log(`✓ API available at http://localhost:${config.port}/api`);
    
    if (config.nodeEnv === 'development') {
      console.log('\nAvailable endpoints:');
      console.log('  POST /api/auth/login');
      console.log('  POST /api/auth/register');
      console.log('  POST /api/auth/refresh');
      console.log('  POST /api/auth/logout');
      console.log('  POST /api/auth/change-password');
      console.log('  GET  /api/auth/me');
      console.log('  GET  /api/users (admin)');
      console.log('  GET  /api/audit (admin)');
      console.log('  GET  /api/data/summary');
      console.log('  GET  /api/data/orders');
      console.log('  GET  /api/data/products');
      console.log('  GET  /api/health');
    }
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});


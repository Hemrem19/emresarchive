/**
 * citavErsa Backend Server
 * Express.js API server for research paper management
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import papersRoutes from './routes/papers.js';
import collectionsRoutes from './routes/collections.js';
import annotationsRoutes from './routes/annotations.js';
import syncRoutes from './routes/sync.js';
import userRoutes from './routes/user.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { prisma } from './lib/prisma.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Run database migrations on startup (for production)
async function runMigrations() {
  if (process.env.NODE_ENV === 'production') {
    try {
      console.log('🔄 Running database migrations...');
      const { execSync } = await import('child_process');
      execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('⚠️ Migration error (will continue anyway):', error.message);
      // Don't crash - try to continue
      // The error might be that migrations are already applied
    }
  }
}

// Trust proxy - required for Railway/production environments
// Railway uses a reverse proxy, so we need to trust the X-Forwarded-* headers
// Only trust Railway's proxy (more secure than trusting all proxies)
app.set('trust proxy', 1); // Trust only the first proxy (Railway's reverse proxy)

// Normalize FRONTEND_URL - ensure it has a protocol
let FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';
if (FRONTEND_URL && !FRONTEND_URL.startsWith('http://') && !FRONTEND_URL.startsWith('https://')) {
  // If no protocol, assume https for production, http for localhost
  if (FRONTEND_URL.includes('localhost') || FRONTEND_URL.includes('127.0.0.1')) {
    FRONTEND_URL = `http://${FRONTEND_URL}`;
  } else {
    FRONTEND_URL = `https://${FRONTEND_URL}`;
  }
}

// Security middleware
app.use(helmet());

// CORS configuration
// Helper function to normalize URLs for comparison
function normalizeUrl(url) {
  if (!url) return url;
  // Remove protocol and trailing slash for comparison
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// Build allowed origins list with all variations
const frontendDomain = normalizeUrl(FRONTEND_URL);
const allowedOrigins = [
  FRONTEND_URL,
  `http://${frontendDomain}`,
  `https://${frontendDomain}`,
  'http://localhost:8080',
  'http://localhost:5500',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8081',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8081'
];

// Remove duplicates
const uniqueOrigins = [...new Set(allowedOrigins)];
console.log(`✅ CORS: Configured FRONTEND_URL: ${FRONTEND_URL}`);
console.log(`✅ CORS: Allowed origins: ${uniqueOrigins.join(', ')}`);

// In development, allow all localhost origins
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: (origin, callback) => {
    // Always log origin for debugging
    if (origin) {
      console.log(`🌐 CORS: Request from origin: ${origin}`);
    }
    
    // Helper to check if origin matches allowed origins (with protocol flexibility)
    function isOriginAllowed(checkOrigin) {
      if (!checkOrigin) return false;
      
      // Direct match in allowed origins
      if (uniqueOrigins.includes(checkOrigin)) {
        return true;
      }
      
      // Normalize and compare domains
      const normalizedOrigin = normalizeUrl(checkOrigin);
      const normalizedFrontend = normalizeUrl(FRONTEND_URL);
      
      // Match by domain (ignoring protocol)
      if (normalizedOrigin === normalizedFrontend) {
        return true;
      }
      
      // Check if it's a localhost/127.0.0.1 variant
      if (normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1')) {
        return checkOrigin.includes('localhost') || checkOrigin.includes('127.0.0.1');
      }
      
      return false;
    }
    
    // In development, be more permissive
    if (isDevelopment) {
      // Allow requests with no origin (file:// URLs, Postman, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      
      // Allow any localhost origin in development
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('::1')) {
        callback(null, true);
        return;
      }
      
      // Check if origin is allowed
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      
      // Log blocked origins in development for debugging
      console.log(`⚠️  CORS: Blocked origin: ${origin}`);
      console.log(`   Allowed origins: ${uniqueOrigins.join(', ')}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    } else {
      // Production: check against allowed origins
      // Allow requests with no origin (some tools)
      if (!origin) {
        console.log(`⚠️  CORS: Request with no origin in production`);
        callback(null, true);
        return;
      }
      
      // Check if origin is allowed (with flexible matching)
      if (isOriginAllowed(origin)) {
        console.log(`✅ CORS: Allowed origin: ${origin}`);
        callback(null, true);
        return;
      }
      
      // Allow Cloudflare Pages origins (pages.dev, cloudflarepages.com)
      if (origin.includes('pages.dev') || origin.includes('cloudflarepages.com')) {
        console.log(`✅ CORS: Allowed Cloudflare Pages origin: ${origin}`);
        callback(null, true);
        return;
      }
      
      // Log blocked origins for debugging
      console.log(`❌ CORS: Blocked origin: ${origin}`);
      console.log(`   Normalized origin: ${normalizeUrl(origin)}`);
      console.log(`   FRONTEND_URL: ${FRONTEND_URL}`);
      console.log(`   Normalized FRONTEND: ${normalizeUrl(FRONTEND_URL)}`);
      console.log(`   Allowed origins: ${uniqueOrigins.join(', ')}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
// Skip IP-based limiting when trust proxy is enabled (Railway handles this)
// Use a more lenient approach or disable validation warnings
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  // Skip strict validation when behind Railway proxy
  standardHeaders: true,
  legacyHeaders: false,
  // Use custom key generator that doesn't rely on trust proxy warnings
  keyGenerator: (req) => {
    // Use X-Forwarded-For if available, otherwise use IP
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.socket.remoteAddress || 'unknown';
  }
});
app.use('/api/', limiter);

// Cookie parser (for refresh tokens)
app.use(cookieParser());

// Body parsing middleware
// Apply JSON parser - it will skip if no body or wrong content-type
// Multer in specific routes handles multipart/form-data before this runs
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// BigInt JSON serialization (Prisma returns BigInt for large integers)
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    const jsonString = JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
    res.setHeader('Content-Type', 'application/json');
    res.send(jsonString);
  };
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/papers', papersRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/annotations', annotationsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/user', userRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Validate and log environment variables
const DATABASE_URL = process.env.DATABASE_URL;

console.log('🔍 Environment Check:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   PORT: ${PORT}`);
console.log(`   FRONTEND_URL: ${FRONTEND_URL}`);
console.log(`   DATABASE_URL: ${DATABASE_URL ? 'SET' : '❌ NOT SET'}`);

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
  console.error('   Please set DATABASE_URL in Railway Variables.');
  console.error('   The server will start but database operations will fail.');
  // Don't exit - let server start so we can see other errors
}

if (DATABASE_URL && !DATABASE_URL.startsWith('postgresql://') && !DATABASE_URL.startsWith('postgres://')) {
  console.error('❌ ERROR: DATABASE_URL must start with postgresql:// or postgres://');
  console.error(`   Current value: ${DATABASE_URL.substring(0, 50)}...`);
  console.error('   Please check your Railway DATABASE_URL variable.');
  console.error('   The server will start but database operations will fail.');
  // Don't exit - let server start so we can see other errors
}

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    const { prisma } = await import('./lib/prisma.js');
    await prisma.$connect();
    console.log('✅ Database: Connected');
  } catch (error) {
    console.error('⚠️ Database: Connection failed (server will continue):', error.message);
    // Don't exit - let server start and handle errors gracefully
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  // Don't exit - log and continue
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit - log and continue (in production, might want to exit gracefully)
  // In production, you might want to exit here: process.exit(1);
});

// Start server
async function startServer() {
  // Run migrations in production before starting server
  if (process.env.NODE_ENV === 'production') {
    await runMigrations();
  }

  return new Promise((resolve) => {
    const server = app.listen(PORT, async () => {
      console.log(`🚀 citavErsa Backend running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
      
      // Test database connection
      await testDatabaseConnection();
      
      // Verify schema by checking if verification_token column exists
      try {
        await prisma.$queryRaw`SELECT verification_token FROM users LIMIT 1`;
        console.log('✅ Database: Schema verified (verification_token column exists)');
      } catch (schemaError) {
        if (schemaError.code === 'P2022' || schemaError.message?.includes('does not exist')) {
          console.error('⚠️ Database: Schema mismatch detected. verification_token column missing.');
          console.error('   Run: cd backend && npx prisma migrate deploy');
        }
      }
      
      // Log deployment URL if available
      if (process.env.RAILWAY_STATIC_URL) {
        console.log(`🔗 Railway URL: ${process.env.RAILWAY_STATIC_URL}`);
      }
      if (process.env.RENDER_EXTERNAL_URL) {
        console.log(`🔗 Render URL: ${process.env.RENDER_EXTERNAL_URL}`);
      }
      
      resolve(server);
    });
  });
}

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  try {
    const { prisma } = await import('./lib/prisma.js');
    await prisma.$disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  try {
    const { prisma } = await import('./lib/prisma.js');
    await prisma.$disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
  process.exit(0);
});

export default app;


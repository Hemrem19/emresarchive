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

const app = express();
const PORT = process.env.PORT || 3000;

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
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Cookie parser (for refresh tokens)
app.use(cookieParser());

// Body parsing middleware
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 citavErsa Backend running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  
  // Log deployment URL if available
  if (process.env.RAILWAY_STATIC_URL) {
    console.log(`🔗 Railway URL: ${process.env.RAILWAY_STATIC_URL}`);
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    console.log(`🔗 Render URL: ${process.env.RENDER_EXTERNAL_URL}`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;


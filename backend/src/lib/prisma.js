/**
 * Prisma Client Singleton
 * Reuses Prisma client across the application
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Connection pooling configuration for production
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Error formatting
  errorFormat: 'pretty'
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;


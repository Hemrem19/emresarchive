# citavErs Backend

Backend API for citavErs - Research Paper Management System.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.x or higher
- **PostgreSQL** 15+ (local or managed)
- **S3-Compatible Storage** (DigitalOcean Spaces, AWS S3, or Cloudflare R2)

### Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database:**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   ```

4. **Set up S3 storage (Cloudflare R2):**
   - See [S3_SETUP.md](./S3_SETUP.md) for detailed instructions
   - Configure S3 credentials in `.env`:
     ```env
     S3_BUCKET_NAME=citavers-pdfs
     S3_ENDPOINT=https://xxxxxxxxxxxxxx.r2.cloudflarestorage.com
     S3_ACCESS_KEY_ID=your-access-key-id
     S3_SECRET_ACCESS_KEY=your-secret-access-key
     ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.js           # Express server entry point
│   ├── routes/             # API route handlers
│   │   ├── auth.js         # Authentication routes
│   │   ├── papers.js       # Paper CRUD routes
│   │   ├── collections.js  # Collection CRUD routes
│   │   ├── annotations.js # Annotation CRUD routes
│   │   ├── sync.js         # Sync routes
│   │   └── user.js         # User profile routes
│   ├── controllers/        # Business logic
│   │   ├── auth.js
│   │   ├── papers.js
│   │   ├── collections.js
│   │   ├── annotations.js
│   │   ├── sync.js
│   │   └── user.js
│   ├── middleware/        # Express middleware
│   │   ├── auth.js         # JWT authentication
│   │   ├── errorHandler.js # Error handling
│   │   └── notFound.js     # 404 handler
│   └── lib/                # Utilities
│       └── prisma.js       # Prisma client
├── prisma/
│   └── schema.prisma       # Database schema
├── tests/                  # Test files
├── .env.example            # Environment variables template
├── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all required environment variables:

- **DATABASE_URL**: PostgreSQL connection string
- **JWT_ACCESS_SECRET**: Secret for access tokens
- **JWT_REFRESH_SECRET**: Secret for refresh tokens
- **STORAGE_*****: S3-compatible storage credentials

## 🗄️ Database

### Prisma Commands

```bash
# Generate Prisma client
npm run db:generate

# Create a new migration
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio
```

### Database Schema

The database schema is defined in `prisma/schema.prisma` and includes:

- **users**: User accounts and authentication
- **papers**: Research papers with metadata
- **collections**: User-defined paper collections
- **annotations**: Paper annotations (highlights, notes, bookmarks)
- **sessions**: Active user sessions
- **sync_logs**: Sync operation logs

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Papers
- `GET /api/papers` - Get all papers
- `GET /api/papers/:id` - Get single paper
- `POST /api/papers` - Create paper
- `PUT /api/papers/:id` - Update paper
- `DELETE /api/papers/:id` - Delete paper
- `GET /api/papers/search` - Search papers

### PDF Upload/Download
- `POST /api/papers/upload-url` - Get presigned S3 upload URL
- `GET /api/papers/:id/pdf` - Get presigned S3 download URL

### Collections
- `GET /api/collections` - Get all collections
- `GET /api/collections/:id` - Get single collection
- `POST /api/collections` - Create collection
- `PUT /api/collections/:id` - Update collection
- `DELETE /api/collections/:id` - Delete collection

### Annotations
- `GET /api/annotations/papers/:paperId/annotations` - Get annotations for paper
- `POST /api/annotations/papers/:paperId/annotations` - Create annotation
- `PUT /api/annotations/:id` - Update annotation
- `DELETE /api/annotations/:id` - Delete annotation

### Sync
- `GET /api/sync/full` - Full sync (initial)
- `POST /api/sync/incremental` - Incremental sync
- `GET /api/sync/status` - Get sync status

### User
- `GET /api/user/stats` - Get usage stats
- `GET /api/user/sessions` - Get active sessions
- `DELETE /api/user/sessions/:id` - Revoke session
- `PUT /api/user/settings` - Update user settings
- `DELETE /api/user/data` - Permanently clear all user data (papers, collections, annotations)

## 🚢 Deployment

See `BACKEND_PLAN.md` for deployment strategy and infrastructure setup.

## 📚 Documentation

- **BACKEND_PLAN.md**: Complete backend architecture and implementation plan
- **MIGRATION_PLAN.md**: Local-to-cloud migration strategy
- **HOSTING_GUIDE.md**: Deployment options and hosting setup

## 🔒 Security

- **JWT Authentication**: Access tokens (15min) + Refresh tokens (7 days)
- **Password Hashing**: bcryptjs with cost factor 12
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for frontend origin
- **Helmet**: Security headers middleware
- **Input Validation**: Zod schemas for request validation

## 📊 Development Status

🚧 **Work in Progress** 🚧

Current status: **Foundation Setup Complete**

- ✅ Project structure created
- ✅ Express server configured
- ✅ Prisma schema defined
- ✅ Route handlers scaffolded
- ⏳ Controllers need implementation
- ⏳ Authentication logic needed
- ⏳ Database migrations needed
- ⏳ Tests need to be written

## 🎯 Next Steps

1. **Implement Authentication Controller** (`src/controllers/auth.js`)
   - User registration with password hashing
   - JWT token generation
   - Login/logout logic
   - Token refresh

2. **Implement Papers Controller** (`src/controllers/papers.js`)
   - CRUD operations
   - Search functionality
   - PDF upload/download

3. **Set up S3 Storage**
   - Configure storage client
   - Implement presigned URL generation
   - Handle PDF uploads

4. **Implement Sync Engine** (`src/controllers/sync.js`)
   - Full sync endpoint
   - Incremental sync with conflict resolution
   - Version tracking

5. **Write Tests**
   - Unit tests for controllers
   - Integration tests for API endpoints
   - E2E tests for sync flow

---

## 📝 License

This backend software is proprietary and confidential.
All rights reserved.
See [LICENSE](LICENSE) for details.

---

**Built for citavErs** 🚀


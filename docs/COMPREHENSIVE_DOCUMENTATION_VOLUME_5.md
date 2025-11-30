# Volume 5: Maintenance & Operations

**Generated from Code Audit** | **Date:** 2025-01-XX  
**Status:** Verified Against Source Code

---

## 5.1 Build & Run Procedures

### Frontend Build

#### Prerequisites
- Node.js 18+ (for testing and build script)
- Modern browser (Chrome, Firefox, Safari, Edge)

#### Development Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/Hemrem19/citavers.git
   cd citavers
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Serve Locally**
   ```bash
   # Option 1: Python HTTP server
   python -m http.server 8000
   
   # Option 2: Node.js serve
   npx serve
   
   # Option 3: Any static file server
   # Point to project root directory
   ```

4. **Open in Browser**
   - Navigate to: `http://localhost:8000`
   - Application loads from `index.html`

#### Production Build

1. **Run Build Script**
   ```bash
   npm run build
   ```

2. **Build Process**
   - Script: `build.js`
   - Cleans `dist/` directory
   - Copies files to `dist/`:
     - Root files: `index.html`, `app.js`, `style.css`, etc.
     - Directories: `api/`, `core/`, `db/`, `views/`, `assets/`, etc.
   - No compilation/transpilation (vanilla JS)
   - No bundling (ES6 modules used as-is)

3. **Output**
   - `dist/` directory contains production-ready files
   - Deploy `dist/` to static hosting (Cloudflare Pages, Netlify, etc.)

#### Testing

```bash
# Run all tests
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Interactive UI
npm run test:ui

# Coverage report
npm run test:coverage
```

**Test Framework**: Vitest  
**Test Environment**: happy-dom (DOM implementation)  
**Mock**: fake-indexeddb (IndexedDB mock)  
**Coverage**: 93% state, 87% filter branches, 74% database

---

### Backend Build & Run

#### Prerequisites
- Node.js 20+
- PostgreSQL database
- AWS S3 bucket (for PDF storage)
- Environment variables configured

#### Development Setup

1. **Navigate to Backend Directory**
   ```bash
   cd backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create `.env` file:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/citavers
   JWT_SECRET=your-secret-key
   JWT_REFRESH_SECRET=your-refresh-secret
   FRONTEND_URL=http://localhost:8000
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=your-bucket-name
   EMAIL_FROM=noreply@citavers.com
   RESEND_API_KEY=your-resend-key (optional)
   NODE_ENV=development
   PORT=3000
   ```

4. **Run Database Migrations**
   ```bash
   npm run db:migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```
   - Server runs on `http://localhost:3000`
   - Auto-reloads on file changes (--watch)

#### Production Build

1. **No Build Step Required**
   - Backend runs source files directly
   - No compilation/transpilation

2. **Deploy to Railway/Render**
   - Platform handles deployment automatically
   - Runs: `npm run db:migrate:deploy && node src/server.js`

3. **Environment Variables**
   - Set in Railway/Render dashboard
   - See `backend/RAILWAY_ENV_VARS.md` for list

#### Database Migrations

```bash
# Create new migration
npm run db:migrate

# Deploy migrations (production)
npm run db:migrate:deploy

# Generate Prisma client
npm run db:generate

# Open Prisma Studio (database GUI)
npm run db:studio
```

---

### Mobile App Build (Capacitor)

#### Prerequisites
- Node.js 18+
- Android Studio (for Android)
- Xcode (for iOS, macOS only)

#### Build Process

1. **Build Frontend**
   ```bash
   npm run build
   ```

2. **Sync Capacitor**
   ```bash
   npm run cap:sync
   ```
   - Copies web assets to native projects
   - Updates native dependencies

3. **Open Native IDE**
   ```bash
   # Android
   npm run cap:open
   # Opens Android Studio
   
   # iOS (macOS only)
   npm run cap:open ios
   # Opens Xcode
   ```

4. **Build in Native IDE**
   - Android: Build APK/AAB in Android Studio
   - iOS: Build in Xcode

---

## 5.2 File Extension Standards

### JavaScript Files (`.js`)

**Usage**: All JavaScript code uses `.js` extension (ES6 modules)

**Module Type**: ES6 modules (`import`/`export`)

**No TypeScript**: Project uses vanilla JavaScript, no `.ts` files

**File Naming Conventions**:
- View modules: `*.view.js` (e.g., `dashboard.view.js`)
- Core modules: `core/*.js` (e.g., `core/router.js`)
- API clients: `api/*.js` (e.g., `api/auth.js`)
- Database modules: `db/*.js` (e.g., `db/papers.js`)
- Test files: `tests/**/*.test.js`

**Module Pattern**:
```javascript
// Export single function
export function myFunction() { }

// Export object
export const myObject = { };

// Export default
export default myClass;
```

---

### HTML Files (`.html`)

**Usage**: Single HTML file (`index.html`)

**Purpose**: Application shell, contains:
- Meta tags
- CDN library links
- Sidebar structure
- Header structure
- Main app container
- Service worker registration
- Error handlers

**No Template Engine**: HTML is static, views injected via JavaScript

---

### CSS Files (`.css`)

**Usage**: Custom styles (`style.css`)

**Framework**: Tailwind CSS (loaded from CDN)

**Custom CSS**: Minimal custom styles in `style.css` for:
- Safe area insets (mobile)
- Custom animations
- Overrides

**No SCSS/SASS**: Plain CSS only

---

### JSON Files (`.json`)

**Usage**: Configuration files

**Files**:
- `package.json` - Frontend dependencies
- `backend/package.json` - Backend dependencies
- `capacitor.config.json` - Capacitor configuration
- `vitest.config.js` - Test configuration (JS, not JSON)
- `backend/railway.json` - Railway deployment config
- `backend/render.yaml` - Render deployment config
- `backend/nixpacks.toml` - Nixpacks build config

---

### Markdown Files (`.md`)

**Usage**: Documentation

**Files**:
- `README.md` - Project readme
- `docs/*.md` - Documentation files
- `plans/*.md` - Planning documents
- `backend/*.md` - Backend documentation

**Purpose**: Human-readable documentation, not code

---

### SQL Files (`.sql`)

**Usage**: Database migrations and scripts

**Location**: `backend/prisma/migrations/**/*.sql`

**Purpose**: Prisma-generated migration SQL files

**Manual SQL**: `backend/clear-locks.sql` (utility script)

---

### Prisma Files (`.prisma`)

**Usage**: Database schema definition

**File**: `backend/prisma/schema.prisma`

**Purpose**: Prisma schema defines database structure

---

### TypeScript Files (`.ts`)

**Not Used**: Project uses vanilla JavaScript

**Exception**: Type definitions may exist in `@types/*` packages

---

### Configuration Files

**`.env`** - Environment variables (not committed to git)
**`.gitignore`** - Git ignore rules
**`_redirects`** - Cloudflare Pages redirects
**`LICENSE`** - MIT License

---

## 5.3 Deployment Procedures

### Frontend Deployment (Cloudflare Pages)

1. **Build Locally** (optional, Cloudflare can build)
   ```bash
   npm run build
   ```

2. **Deploy to Cloudflare Pages**
   - Connect GitHub repository
   - Build command: `npm run build` (or leave empty if pre-built)
   - Build output directory: `dist`
   - Root directory: `/` (project root)

3. **Custom Domain** (optional)
   - Add custom domain in Cloudflare dashboard
   - Update DNS records
   - SSL automatically provisioned

4. **Environment Variables** (if needed)
   - Set in Cloudflare Pages dashboard
   - Accessible at build time

**Current Deployment**: https://citavers.com

---

### Backend Deployment (Railway)

1. **Connect Repository**
   - Connect GitHub repository to Railway
   - Railway detects `backend/` directory

2. **Configure Environment Variables**
   - Set in Railway dashboard:
     - `DATABASE_URL`
     - `JWT_SECRET`
     - `JWT_REFRESH_SECRET`
     - `FRONTEND_URL`
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `AWS_REGION`
     - `AWS_S3_BUCKET`
     - `EMAIL_FROM`
     - `RESEND_API_KEY` (optional)
     - `NODE_ENV=production`

3. **Database Setup**
   - Create PostgreSQL database in Railway
   - Set `DATABASE_URL` environment variable
   - Migrations run automatically on deploy

4. **Deploy**
   - Railway auto-deploys on git push
   - Build command: `npm run db:migrate:deploy && node src/server.js`
   - Working directory: `backend/`

**Current Deployment**: https://emresarchive-production.up.railway.app

---

### Backend Deployment (Render - Alternative)

1. **Create Web Service**
   - Connect GitHub repository
   - Build command: `cd backend && npm install`
   - Start command: `cd backend && npm run db:migrate:deploy && node src/server.js`
   - Environment: Node

2. **Configure Environment Variables**
   - Same as Railway (see above)

3. **Database**
   - Create PostgreSQL database in Render
   - Set `DATABASE_URL`

**Configuration File**: `backend/render.yaml`

---

## 5.4 Development Workflow

### Local Development

1. **Start Frontend**
   ```bash
   python -m http.server 8000
   # Open http://localhost:8000
   ```

2. **Start Backend** (optional, for cloud sync testing)
   ```bash
   cd backend
   npm run dev
   # Runs on http://localhost:3000
   ```

3. **Configure Frontend API URL** (if using local backend)
   - Open browser console
   - Run: `localStorage.setItem('apiBaseUrl', 'http://localhost:3000')`
   - Refresh page

### Testing Workflow

1. **Run Tests**
   ```bash
   npm test
   ```

2. **Watch Mode** (during development)
   ```bash
   npm run test:watch
   ```

3. **Coverage Report**
   ```bash
   npm run test:coverage
   # Opens coverage/index.html
   ```

### Code Organization

**Module Structure**:
- Each module in its own file
- ES6 `import`/`export` for dependencies
- No global variables (except appState)

**View Pattern**:
```javascript
export const myView = {
  mount(params, appState) {
    // Setup view
    // Add event listeners
  },
  unmount(appState) {
    // Cleanup
    // Remove event listeners
  }
};
```

**Database Pattern**:
```javascript
// Always use db.js entry point
import { addPaper, getAllPapers } from './db.js';

// Adapter routes to cloud/local automatically
```

---

## 5.5 Troubleshooting

### Common Issues

#### IndexedDB Not Available
**Error**: "Database not supported"
**Solution**: Use modern browser (Chrome, Firefox, Safari, Edge). Private/incognito mode may block IndexedDB.

#### CORS Errors
**Error**: "CORS policy blocked"
**Solution**: 
- Check `FRONTEND_URL` in backend environment variables
- Ensure frontend URL matches backend CORS configuration
- Check browser console for exact error

#### Cloud Sync Not Working
**Error**: API calls failing
**Solution**:
- Check if user is authenticated: `localStorage.getItem('citavers_access_token')`
- Check API URL: `localStorage.getItem('apiBaseUrl')`
- Check browser console for errors
- Verify backend is running and accessible

#### PDF Not Loading
**Error**: PDF viewer shows error
**Solution**:
- Check if PDF exists in IndexedDB (local) or S3 (cloud)
- For cloud: Verify S3 bucket configuration
- Check browser console for PDF.js errors
- Verify PDF file is valid (not corrupted)

#### Build Fails
**Error**: Build script errors
**Solution**:
- Ensure Node.js 18+ installed
- Run `npm install` to install dependencies
- Check file permissions
- Verify all source files exist

#### Database Migration Fails
**Error**: Prisma migration errors
**Solution**:
- Check `DATABASE_URL` is correct
- Verify database is accessible
- Run `npm run db:generate` to regenerate Prisma client
- Check migration files in `backend/prisma/migrations/`

---

## 5.6 Maintenance Tasks

### Regular Maintenance

1. **Update Dependencies**
   ```bash
   npm outdated  # Check for updates
   npm update    # Update dependencies
   ```

2. **Run Tests**
   ```bash
   npm test  # Ensure all tests pass
   ```

3. **Check Database**
   - Monitor database size
   - Check for orphaned records
   - Verify indexes are used

4. **Monitor Backend**
   - Check Railway/Render logs
   - Monitor API response times
   - Check error rates

### Database Maintenance

1. **Clear Old Sync Logs**
   ```sql
   DELETE FROM sync_logs WHERE synced_at < NOW() - INTERVAL '30 days';
   ```

2. **Clear Expired Sessions**
   ```sql
   DELETE FROM sessions WHERE expires_at < NOW();
   ```

3. **Clear Expired Citation Cache**
   ```sql
   DELETE FROM citation_cache WHERE expires_at < NOW();
   ```

### Backup Procedures

1. **Frontend**: No backup needed (static files in git)

2. **Backend Database**:
   - Railway/Render provide automatic backups
   - Manual backup: `pg_dump` command

3. **User Data**: Users can export their own data via Settings → Export Data

---

## 5.7 Performance Optimization

### Frontend Optimization

1. **Service Worker Caching**
   - Static assets cached automatically
   - API calls not cached (always fresh)

2. **IndexedDB Indexes**
   - Indexes created for common queries (title, authors, tags, etc.)
   - Speeds up filtering and searching

3. **Pagination**
   - Default: 25 items per page
   - Reduces DOM rendering time

4. **Debounced Sync**
   - Sync operations debounced (500ms)
   - Batches multiple changes into single sync

### Backend Optimization

1. **Database Indexes**
   - Prisma schema defines indexes
   - Optimizes query performance

2. **Rate Limiting**
   - Prevents abuse
   - Protects backend resources

3. **Connection Pooling**
   - Prisma handles connection pooling
   - Optimizes database connections

---

## 5.8 Security Considerations

### Frontend Security

1. **XSS Prevention**
   - `escapeHtml()` function sanitizes user input
   - Content Security Policy (if configured)

2. **Token Storage**
   - JWT tokens stored in `localStorage`
   - Refresh tokens in cookies (if configured)

3. **HTTPS Required**
   - Production uses HTTPS only
   - Prevents token interception

### Backend Security

1. **Authentication**
   - JWT tokens for API access
   - Password hashing with bcrypt

2. **CORS Configuration**
   - Only allows frontend origin
   - Prevents unauthorized access

3. **Rate Limiting**
   - Prevents brute force attacks
   - Protects API endpoints

4. **Input Validation**
   - Zod schemas validate all input
   - Prevents injection attacks

5. **Helmet.js**
   - Security headers configured
   - Protects against common vulnerabilities

---

## 5.9 File Organization Best Practices

### Directory Structure

**Follow Existing Patterns**:
- Core modules: `core/`
- Database: `db/`
- API clients: `api/`
- Views: `views/` or `*.view.js`
- Tests: `tests/`

**Naming Conventions**:
- Files: `kebab-case.js` (e.g., `command-palette.js`)
- Functions: `camelCase` (e.g., `createRouter`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DB_NAME`)

**Module Exports**:
- One file = one module
- Use named exports (not default exports)
- Export only what's needed

---

## 5.10 Version Control

### Git Workflow

1. **Branch Strategy**
   - `main` - Production branch
   - Feature branches for new features
   - Pull requests for code review

2. **Commit Messages**
   - Descriptive commit messages
   - Reference issue numbers if applicable

3. **Ignored Files**
   - `.env` files (environment variables)
   - `node_modules/` (dependencies)
   - `dist/` (build output)
   - `coverage/` (test coverage)

---

## 5.11 Documentation Maintenance

### Updating Comprehensive Documentation

When code changes are made, the comprehensive documentation volumes must be updated to maintain accuracy. A detailed guide is available for this purpose.

**Update Guide**: See [Documentation Update Commands](../docs/DOCUMENTATION_UPDATE_COMMANDS.md) for:
- Complete list of update triggers
- Step-by-step procedures for each volume
- Validation procedures and automated checks
- Real-world examples
- Quick reference cheat sheet

**Key Principles**:
- Update documentation **immediately** with code changes
- Follow structured command procedures
- Run validation checks after updates
- Maintain consistency across all volumes

**Common Update Scenarios**:
- New feature added → Update Volumes 1, 2, 4
- API endpoint changed → Update Volumes 2, 4
- Database schema changed → Update Volumes 3, 4
- Dependency added → Update Volumes 1, 3, 5

For detailed procedures, refer to the [Documentation Update Commands](../docs/DOCUMENTATION_UPDATE_COMMANDS.md) guide.

---

**End of Volume 5**

---

## Documentation Complete

All 5 volumes of comprehensive documentation have been generated:

1. **Volume 1**: General Project Overview
2. **Volume 2**: Feature Documentation
3. **Volume 3**: Technical Architecture
4. **Volume 4**: Reference Manual (Deep Dive)
5. **Volume 5**: Maintenance & Operations

**Total Documentation**: ~50,000+ words  
**Status**: Complete, verified against source code  
**Last Updated**: 2025-01-XX

**Maintenance**: See [Documentation Update Commands](../docs/DOCUMENTATION_UPDATE_COMMANDS.md) for update procedures.


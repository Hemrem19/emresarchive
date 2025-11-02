# Backend Setup Guide

Step-by-step guide to set up the citavErs backend.

## 📋 Prerequisites

Before starting, ensure you have:

1. **Node.js 20.x+** installed
   ```bash
   node --version  # Should show v20.x or higher
   ```

2. **PostgreSQL 15+** installed and running
   ```bash
   psql --version  # Should show PostgreSQL 15.x or higher
   ```

3. **S3-Compatible Storage** account (one of):
   - DigitalOcean Spaces
   - AWS S3
   - Cloudflare R2

## 🚀 Setup Steps

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your configuration:

   **Required Settings:**
   ```env
   # Server
   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:8080
   
   # Database (PostgreSQL)
   DATABASE_URL=postgresql://user:password@localhost:5432/citavers?schema=public
   
   # JWT Secrets (generate random strings)
   JWT_ACCESS_SECRET=your-super-secret-access-token-key
   JWT_REFRESH_SECRET=your-super-secret-refresh-token-key
   
   # Storage (DigitalOcean Spaces example)
   STORAGE_PROVIDER=digitalocean
   STORAGE_ENDPOINT=https://nyc3.digitaloceanspaces.com
   STORAGE_REGION=nyc3
   STORAGE_BUCKET=citavers-pdfs
   STORAGE_ACCESS_KEY_ID=your-access-key
   STORAGE_SECRET_ACCESS_KEY=your-secret-key
   ```

   **How to Generate JWT Secrets:**
   ```bash
   # Linux/Mac
   openssl rand -base64 32
   
   # Windows PowerShell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   ```

### Step 3: Set Up PostgreSQL Database

1. **Create a new database:**
   ```sql
   CREATE DATABASE citavers;
   ```

2. **Or using psql:**
   ```bash
   createdb citavers
   ```

3. **Update DATABASE_URL** in `.env`:
   ```env
   DATABASE_URL=postgresql://your_username:your_password@localhost:5432/citavers?schema=public
   ```

### Step 4: Set Up Prisma

1. **Generate Prisma Client:**
   ```bash
   npm run db:generate
   ```

2. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

   This will:
   - Create all tables (users, papers, collections, annotations, sessions, sync_logs)
   - Set up indexes and relationships
   - Initialize the database schema

3. **(Optional) Open Prisma Studio** to view your database:
   ```bash
   npm run db:studio
   ```

### Step 5: Set Up S3-Compatible Storage

#### DigitalOcean Spaces (Recommended)

1. **Create a Space:**
   - Go to DigitalOcean → Spaces
   - Create new Space: `citavers-pdfs`
   - Choose region (e.g., `nyc3`)
   - Select "Private" for security

2. **Get Access Keys:**
   - Go to API → Spaces Keys
   - Generate new key pair
   - Save the Access Key ID and Secret Access Key

3. **Update `.env`:**
   ```env
   STORAGE_PROVIDER=digitalocean
   STORAGE_ENDPOINT=https://nyc3.digitaloceanspaces.com
   STORAGE_REGION=nyc3
   STORAGE_BUCKET=citavers-pdfs
   STORAGE_ACCESS_KEY_ID=your-access-key-id
   STORAGE_SECRET_ACCESS_KEY=your-secret-access-key
   ```

#### AWS S3

```env
STORAGE_PROVIDER=aws
STORAGE_ENDPOINT=https://s3.amazonaws.com
STORAGE_REGION=us-east-1
STORAGE_BUCKET=citavers-pdfs
STORAGE_ACCESS_KEY_ID=your-access-key-id
STORAGE_SECRET_ACCESS_KEY=your-secret-access-key
```

#### Cloudflare R2

```env
STORAGE_PROVIDER=cloudflare
STORAGE_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_BUCKET=citavers-pdfs
STORAGE_ACCESS_KEY_ID=your-access-key-id
STORAGE_SECRET_ACCESS_KEY=your-secret-access-key
```

### Step 6: Start the Server

```bash
npm run dev
```

The server should start on `http://localhost:3000`

You should see:
```
🚀 citavErs Backend running on port 3000
📡 Environment: development
🌐 Frontend URL: http://localhost:8080
💾 Database: Connected
```

### Step 7: Test the Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-30T...",
  "uptime": 123.45,
  "environment": "development"
}
```

## ✅ Verification Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created and configured
- [ ] PostgreSQL database created
- [ ] Database migrations run (`npm run db:migrate`)
- [ ] Prisma client generated (`npm run db:generate`)
- [ ] S3-compatible storage configured
- [ ] Server starts without errors
- [ ] Health endpoint returns `200 OK`

## 🐛 Troubleshooting

### Database Connection Error

**Error:** `Can't reach database server`

**Solutions:**
1. Check PostgreSQL is running:
   ```bash
   # Linux/Mac
   sudo systemctl status postgresql
   
   # Windows
   services.msc  # Check PostgreSQL service
   ```

2. Verify `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/citavers?schema=public
   ```

3. Check PostgreSQL is listening on port 5432:
   ```bash
   # Linux/Mac
   lsof -i :5432
   
   # Windows
   netstat -ano | findstr :5432
   ```

### Prisma Migration Error

**Error:** `Migration failed`

**Solutions:**
1. Reset database (⚠️ **WARNING:** This deletes all data):
   ```bash
   npx prisma migrate reset
   ```

2. Check database permissions:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE citavers TO your_username;
   ```

### Storage Connection Error

**Error:** `Invalid credentials`

**Solutions:**
1. Verify access keys are correct in `.env`
2. Check storage bucket exists and is accessible
3. Verify endpoint URL matches your region

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solutions:**
1. Change port in `.env`:
   ```env
   PORT=3001
   ```

2. Or kill the process using port 3000:
   ```bash
   # Linux/Mac
   lsof -ti:3000 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

## 📚 Next Steps

After setup is complete:

1. **Implement Controllers:**
   - Start with `src/controllers/auth.js` (authentication)
   - Then `src/controllers/papers.js` (CRUD operations)
   - Follow implementation order in `BACKEND_PLAN.md`

2. **Write Tests:**
   - Unit tests for controllers
   - Integration tests for API endpoints
   - Use `tests/` directory

3. **Set Up CI/CD:**
   - Configure GitHub Actions for automated testing
   - Set up deployment pipeline

4. **Documentation:**
   - API documentation with OpenAPI/Swagger
   - Update `README.md` as you implement features

---

**Need help?** Check `BACKEND_PLAN.md` for detailed architecture and implementation guides.


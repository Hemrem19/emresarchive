# Backend Deployment Guide

Complete guide to deploy citavErs backend to production.

## 🚀 Platform Options

### Railway (Recommended - Easiest)
- ✅ Free tier available ($5/month for production)
- ✅ One-click GitHub deployment
- ✅ Auto-detects Node.js
- ✅ Built-in PostgreSQL (or use external like Neon.tech)
- ✅ Environment variable management
- ✅ Automatic HTTPS
- ✅ Simple rollback

### Render
- ✅ Free tier available
- ✅ Auto-deploy from GitHub
- ✅ Built-in PostgreSQL
- ⚠️ Slightly more complex setup

### DigitalOcean App Platform
- ⚠️ Paid only ($12/month minimum)
- ✅ More control
- ✅ Good performance
- ✅ Managed PostgreSQL

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] PostgreSQL database (Neon.tech production database)
- [ ] S3-compatible storage configured (Cloudflare R2)
- [ ] Frontend deployed (Cloudflare Pages URL)
- [ ] Generated JWT secrets (secure random strings)
- [ ] All environment variables ready

---

## 🚀 Option 1: Deploy to Railway (Recommended)

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"

### Step 2: Connect Repository

1. Select "Deploy from GitHub repo"
2. Choose your repository
3. Railway will auto-detect Node.js

### Step 3: Configure Environment Variables

Click on your service → Variables tab → Add all required variables:

```env
# Server
NODE_ENV=production
PORT=3000

# Frontend URL (your Cloudflare Pages URL)
FRONTEND_URL=https://citavers.com

# Database (Neon.tech production URL)
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/citaversa?sslmode=require

# JWT Secrets (generate secure random strings)
JWT_ACCESS_SECRET=<generate-random-string>
JWT_REFRESH_SECRET=<generate-random-string>

# S3 (Cloudflare R2)
S3_BUCKET_NAME=citavers-pdfs
S3_ENDPOINT=https://xxxxxx.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<your-access-key>
S3_SECRET_ACCESS_KEY=<your-secret-key>
S3_REGION=auto

# Email Service (Resend - Recommended)
EMAIL_SERVICE_TYPE=resend
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=onboarding@resend.dev
EMAIL_FROM_NAME=Citavers

# Optional
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
```

**How to Generate JWT Secrets:**
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Step 4: Configure Build Settings

1. Go to Settings → Build
2. Ensure:
   - **Build Command:** (leave empty, Railway auto-detects)
   - **Start Command:** `npm start`
   - **Root Directory:** `backend` (if repo root contains frontend too)

### Step 5: Deploy

1. Railway will automatically deploy on every push to your main branch
2. Or click "Deploy" button to deploy manually
3. Wait for deployment to complete
4. Railway will provide a URL like: `https://citaversa-production.railway.app`

### Step 6: Run Database Migrations

After first deployment, run Prisma migrations:

**Option A: Via Railway CLI**
```bash
npm install -g @railway/cli
railway login
railway link
railway run npm run db:migrate
```

**Option B: Via Railway Dashboard**
1. Go to your service → Deployments
2. Click "..." → "Shell"
3. Run: `npm run db:migrate`

**Option C: Via SSH/Terminal**
1. Use Railway's web terminal
2. Run: `npm run db:migrate`

### Step 7: Verify Deployment

1. Check health endpoint: `https://your-railway-url.railway.app/health`
2. Should return: `{"status":"ok","timestamp":"...","uptime":...,"environment":"production"}`

### Step 8: Update Frontend API URL

Update your frontend to use production API:

1. In `config.js`, update default API URL:
   ```javascript
   BASE_URL: localStorage.getItem('apiBaseUrl') || 'https://your-railway-url.railway.app'
   ```

2. Or set it via environment variable if using build-time config

3. Redeploy frontend to Cloudflare Pages

---

## 🚀 Option 2: Deploy to Render

### Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"

### Step 2: Connect Repository

1. Connect your GitHub repository
2. Select the repository
3. Render will auto-detect Node.js

### Step 3: Configure Service

**Basic Settings:**
- **Name:** citavers-backend
- **Environment:** Node
- **Build Command:** `cd backend && npm install && npm run db:generate`
- **Start Command:** `cd backend && npm start`
- **Root Directory:** `backend` (if repo contains frontend)

### Step 4: Add Environment Variables

Go to Environment → Add all required variables (same as Railway above)

### Step 5: Deploy

1. Click "Create Web Service"
2. Render will deploy automatically
3. Get your URL: `https://citavers-backend.onrender.com`

### Step 6: Run Migrations

1. Go to your service → Shell
2. Run: `npm run db:migrate`

---

## 🚀 Option 3: Deploy to DigitalOcean App Platform

### Step 1: Create App

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect GitHub repository

### Step 2: Configure App

**Service Type:** Web Service

**Build Settings:**
- **Build Command:** `cd backend && npm install && npm run db:generate`
- **Run Command:** `cd backend && npm start`
- **Environment Variables:** Add all required (same as Railway)

### Step 3: Add Database

1. Create managed PostgreSQL database
2. Or connect external database (Neon.tech)
3. Add `DATABASE_URL` environment variable

### Step 4: Deploy

1. Review and create
2. DigitalOcean will deploy automatically
3. Get your URL: `https://citaversa-xxxxx.ondigitalocean.app`

---

## 🔧 Post-Deployment Steps

### 1. Run Database Migrations

**Important:** Run Prisma migrations on production database:

```bash
# Via Railway CLI
railway run npm run db:migrate

# Via Render Shell
npm run db:migrate

# Via DigitalOcean Console
npm run db:migrate
```

### 2. Verify Database Connection

Check Prisma connection:
```bash
npm run db:studio
```

### 3. Test API Endpoints

**Health Check:**
```bash
curl https://your-backend-url.com/health
```

**Test Authentication:**
```bash
curl -X POST https://your-backend-url.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
```

### 4. Update Frontend

Update `config.js` in frontend:
```javascript
export const API_CONFIG = {
    BASE_URL: localStorage.getItem('apiBaseUrl') || 'https://your-backend-url.com',
    // ...
};
```

Or use environment variable for build-time config.

### 5. Update CORS

If your production frontend URL is different, ensure backend CORS allows it:

In `backend/src/server.js`, the `FRONTEND_URL` environment variable controls CORS. Make sure it's set correctly.

---

## 🔒 Security Checklist

- [ ] Use strong JWT secrets (32+ characters, random)
- [ ] Enable HTTPS (automatic on Railway/Render/DigitalOcean)
- [ ] Set `NODE_ENV=production`
- [ ] Use production database (not localhost)
- [ ] Secure S3 credentials (never commit to Git)
- [ ] Enable rate limiting (already configured)
- [ ] Use secure cookies (`secure: true` in production)
- [ ] Review CORS settings (only allow your frontend URL)

---

## 📊 Monitoring & Logs

### Railway
- View logs: Service → Deployments → Click deployment → Logs
- Metrics: Service → Metrics tab

### Render
- View logs: Service → Logs tab
- Metrics: Service → Metrics tab

### DigitalOcean
- View logs: App → Runtime Logs
- Metrics: App → Metrics tab

---

## 🔄 Continuous Deployment

All platforms support auto-deploy on Git push:

- **Railway:** Automatic (enable in Settings)
- **Render:** Automatic (enable in Settings)
- **DigitalOcean:** Automatic (enable in Settings → GitHub)

Just push to your main branch and deployment will trigger automatically!

---

## 🐛 Troubleshooting

### Database Connection Issues

**Error:** `PrismaClientKnownRequestError: Can't reach database server`

**Solutions:**
1. Check `DATABASE_URL` is correct
2. Ensure database is accessible from deployment platform
3. Check firewall/security settings
4. For Neon.tech: Ensure "Allow access from anywhere" or whitelist Railway IPs

### Migration Issues

**Error:** `Migration failed`

**Solutions:**
1. Ensure `DATABASE_URL` points to production database
2. Run migrations manually via CLI/shell
3. Check Prisma schema matches database state

### CORS Errors

**Error:** `Access to fetch blocked by CORS`

**Solutions:**
1. Check `FRONTEND_URL` environment variable is set correctly
2. Ensure frontend URL is in `allowedOrigins` list
3. Restart backend after changing CORS settings

### Port Issues

**Error:** `EADDRINUSE` or port binding issues

**Solutions:**
- Railway/Render/DigitalOcean auto-assigns port
- Use `process.env.PORT` (already configured)
- Don't hardcode port in production

---

## ✅ Verification

After deployment, verify everything works:

1. **Health Check:**
   ```bash
   curl https://your-backend-url.com/health
   ```
   Should return: `{"status":"ok",...}`

2. **Test Registration:**
   ```bash
   curl -X POST https://your-backend-url.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!","name":"Test"}'
   ```
   Should return: `{"success":true,"data":{...}}`

3. **Test in Frontend:**
   - Update frontend API URL
   - Try logging in
   - Create a paper
   - Verify it syncs to cloud

---

## 📝 Environment Variables Summary

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `S3_ENDPOINT` - S3-compatible storage endpoint
- `S3_ACCESS_KEY_ID` - S3 access key
- `S3_SECRET_ACCESS_KEY` - S3 secret key
- `S3_BUCKET_NAME` - S3 bucket name
- `FRONTEND_URL` - Your frontend production URL

**Optional:**
- `PORT` - Server port (auto-assigned on platforms)
- `NODE_ENV` - Environment (set to "production")
- `JWT_ACCESS_EXPIRES_IN` - Access token expiry (default: 15m)
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiry (default: 7d)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 15min)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)
- `S3_REGION` - S3 region (default: auto)
- `BCRYPT_ROUNDS` - Password hash rounds (default: 12)

---

## 🎉 Success!

Once deployed, your backend will be accessible at your platform URL, and users can sync their data to the cloud!

Need help? Check the troubleshooting section or review platform-specific documentation.


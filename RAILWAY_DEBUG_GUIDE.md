# Railway Backend Debugging Guide

## 🔍 Issue: Backend Server Crashing (SIGTERM)

### Symptoms:
- Server exits with `SIGTERM` signal
- Frontend shows `NetworkError` when trying to fetch papers
- Cloud sync fails and falls back to local

### Root Causes (Most Common):

#### 1. DATABASE_URL Not Set or Invalid
**Check Railway Dashboard:**
1. Go to Railway → Your Service → **Variables** tab
2. Look for `DATABASE_URL` variable
3. Verify it's set and starts with `postgresql://` or `postgres://`

**Expected Format:**
```
postgresql://username:password@host:port/database?sslmode=require
```

**Common Issues:**
- ❌ Missing `DATABASE_URL` entirely
- ❌ Includes `psql` command (should be connection string only)
- ❌ Missing `https://` protocol (should be `postgresql://`)
- ❌ Wrong format or missing parameters

#### 2. Missing Required Environment Variables
**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` - JWT secret for access tokens
- `JWT_REFRESH_SECRET` - JWT secret for refresh tokens
- `FRONTEND_URL` - Frontend URL (for CORS)
- `NODE_ENV` - Should be `production`

**Check in Railway:**
1. Go to **Variables** tab
2. Verify all required variables are present
3. Check for typos in variable names

#### 3. Database Connection Failure
**Possible Issues:**
- Database server is down
- Connection string is incorrect
- Network/firewall issues
- Database credentials are wrong

#### 4. Port Configuration Issue
**Check:**
- Railway uses `PORT` environment variable (auto-set)
- Don't hardcode port 3000
- Server should use `process.env.PORT || 3000`

### 🔧 Debugging Steps:

#### Step 1: Check Railway Logs
1. Go to Railway Dashboard → Your Service
2. Click **"View Logs"** or **"Deployments"** tab
3. Look for error messages **BEFORE** the SIGTERM
4. Common errors you might see:
   - `❌ ERROR: DATABASE_URL environment variable is not set!`
   - `❌ ERROR: DATABASE_URL must start with postgresql://`
   - `PrismaClientInitializationError`
   - Database connection timeout

#### Step 2: Verify Environment Variables
**In Railway Dashboard → Variables:**
1. Check `DATABASE_URL` exists
2. Verify format (starts with `postgresql://`)
3. Check all other required variables are set
4. Look for typos or missing quotes

#### Step 3: Test Database Connection
**If DATABASE_URL is set:**
1. Copy the connection string from Railway
2. Try connecting locally with `psql` (if you have it)
3. Or test in Neon.tech dashboard

#### Step 4: Check Server Startup Code
The server now logs environment info at startup. Check logs for:
```
🔍 Environment Check:
   NODE_ENV: production
   PORT: 3000
   FRONTEND_URL: https://citaversa.com
   DATABASE_URL: SET or ❌ NOT SET
```

### 📋 Railway Variables Checklist:

```env
# Required Variables (must be set):
NODE_ENV=production
PORT=3000  # Usually auto-set by Railway
FRONTEND_URL=https://citaversa.com
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
JWT_ACCESS_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-secret>

# Optional (but recommended):
S3_BUCKET_NAME=citaversa-pdfs
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<your-key>
S3_SECRET_ACCESS_KEY=<your-secret>
S3_REGION=auto
```

### 🚨 Common Error Messages:

#### Error: "DATABASE_URL environment variable is not set!"
**Fix:** Add `DATABASE_URL` variable in Railway Variables tab

#### Error: "DATABASE_URL must start with postgresql://"
**Fix:** Remove `psql` command, use only connection string

#### Error: "PrismaClientInitializationError"
**Fix:** Check DATABASE_URL format, test database connection

#### Error: "NetworkError" in browser
**Fix:** Backend isn't running - check Railway logs for startup errors

### ✅ Success Indicators:

When server starts successfully, you should see:
```
🔍 Environment Check:
   NODE_ENV: production
   PORT: 3000
   FRONTEND_URL: https://citaversa.com
   DATABASE_URL: SET
✅ CORS: Configured FRONTEND_URL: https://citaversa.com
✅ CORS: Allowed origins: ...
🚀 citavErsa Backend running on port 3000
📡 Environment: production
🌐 Frontend URL: https://citaversa.com
💾 Database: Configured
```

### 🔄 Next Steps After Fix:

1. **Save environment variables** in Railway
2. **Wait for auto-redeploy** (or manually trigger)
3. **Check logs** for successful startup
4. **Test frontend** - NetworkError should be gone
5. **Test authentication** - Should work now

---

## 💡 Quick Fix Checklist:

- [ ] Check Railway Variables tab
- [ ] Verify DATABASE_URL is set correctly
- [ ] Remove `psql` from DATABASE_URL if present
- [ ] Ensure DATABASE_URL starts with `postgresql://`
- [ ] Check Railway logs for actual error
- [ ] Verify all required variables are present
- [ ] Test database connection separately
- [ ] Redeploy after fixing variables


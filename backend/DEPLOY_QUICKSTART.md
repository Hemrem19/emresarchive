# Quick Start: Deploy Backend to Railway

**Estimated Time:** 15-20 minutes

## 🎯 Prerequisites Checklist

Before starting, ensure you have:

- [ ] Neon.tech production database URL
- [ ] Cloudflare R2 S3 credentials (or other S3-compatible storage)
- [ ] Your Cloudflare Pages frontend URL
- [ ] Generated JWT secrets (we'll help you generate these)

---

## 🚀 Step-by-Step Deployment

### Step 1: Generate JWT Secrets

**On Windows PowerShell:**
```powershell
# Generate Access Token Secret
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Generate Refresh Token Secret  
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**On Linux/Mac:**
```bash
# Generate Access Token Secret
openssl rand -base64 32

# Generate Refresh Token Secret
openssl rand -base64 32
```

**Save both secrets** - you'll need them in Step 4.

---

### Step 2: Create Railway Account

1. Go to **[railway.app](https://railway.app)**
2. Click **"Start a New Project"**
3. Sign in with **GitHub**
4. Authorize Railway to access your repositories

---

### Step 3: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: **`citaversa`** (or whatever your repo is named)
4. Click **"Deploy Now"**

Railway will start detecting your project...

---

### Step 4: Configure Service

**If Railway asks which service to deploy:**

1. Select the **backend** directory (or root if backend is in root)
2. Railway will auto-detect it's a Node.js project

**If Railway creates a service automatically:**
- Good! Proceed to environment variables.

---

### Step 5: Add Environment Variables

1. Click on your service → **"Variables"** tab
2. Click **"New Variable"** and add each one:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Frontend URL (your Cloudflare Pages URL)
FRONTEND_URL=https://citaversa.pages.dev

# Database (your Neon.tech production URL)
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/citaversa?sslmode=require

# JWT Secrets (use the secrets you generated in Step 1)
JWT_ACCESS_SECRET=<paste-your-access-secret-here>
JWT_REFRESH_SECRET=<paste-your-refresh-secret-here>

# S3 Storage (Cloudflare R2)
S3_BUCKET_NAME=citaversa-pdfs
S3_ENDPOINT=https://xxxxxx.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<your-r2-access-key>
S3_SECRET_ACCESS_KEY=<your-r2-secret-key>
S3_REGION=auto
```

**Important Notes:**
- Replace `<paste-your-access-secret-here>` with the actual secrets from Step 1
- Replace `<your-r2-access-key>` with your actual Cloudflare R2 credentials
- Replace `FRONTEND_URL` with your actual Cloudflare Pages URL
- Replace `DATABASE_URL` with your Neon.tech production database URL

---

### Step 6: Configure Build Settings ⚠️ CRITICAL STEP

**IMPORTANT:** Since your backend is in a `backend/` subdirectory, you **MUST** set the Root Directory:

1. Click on your service
2. Go to **Settings** tab → Scroll to **Build & Deploy** section
3. Set **Root Directory** to: `backend` ⬅️ **This is the key fix!**
   - This tells Railway to build from the `backend/` folder
   - Railway will look for `package.json` in the `backend/` directory
   - Railway will find `railway.json` and `nixpacks.toml` in the `backend/` directory
4. **Build Command:** Leave empty (Railway will use `backend/nixpacks.toml` or auto-detect)
5. **Start Command:** Leave empty (Railway will use `npm start` from `backend/package.json`)

**Why this matters:**
- Without Root Directory set, Railway tries to build from the repo root
- The root has a different `package.json` (frontend), causing build failures
- Setting Root Directory to `backend` fixes the "Error creating build plan" error

**Alternative (if Root Directory doesn't work):**
- Root Directory: (leave empty - root of repo)
- Build Command: `cd backend && npm install && npm run db:generate`
- Start Command: `cd backend && npm start`

---

### Step 7: Deploy!

1. Click **"Deploy"** button (or wait for auto-deploy)
2. Watch the deployment logs
3. Wait for: **"Deployment successful"**

**Your backend URL will be:**
- `https://citaversa-production.railway.app` (or similar)
- Railway provides this automatically

---

### Step 8: Run Database Migrations

**Important:** Run Prisma migrations on production database.

**Option A: Via Railway CLI (Recommended)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npm run db:migrate
```

**Option B: Via Railway Dashboard**
1. Go to your service → **Deployments**
2. Click the **"..."** menu → **"Shell"**
3. Run: `npm run db:migrate`

---

### Step 9: Verify Deployment

**Test Health Endpoint:**
```bash
curl https://your-railway-url.railway.app/health
```

**Should return:**
```json
{"status":"ok","timestamp":"...","uptime":...,"environment":"production"}
```

**Test Registration (optional):**
```bash
curl -X POST https://your-railway-url.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
```

---

### Step 10: Update Frontend

**Update your frontend to use production API:**

1. In `config.js`, update the default API URL:

```javascript
export const API_CONFIG = {
    // Update this to your Railway URL
    BASE_URL: localStorage.getItem('apiBaseUrl') || 'https://your-railway-url.railway.app',
    // ... rest of config
};
```

2. **Or** set it dynamically:
   - Users can set it in Settings (if you add UI for this)
   - Or use environment variable if using build-time config

3. **Test in frontend:**
   - Open your app
   - Try logging in
   - Create a paper
   - Verify it syncs to cloud (check Railway logs)

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Health endpoint works: `https://your-url.railway.app/health`
- [ ] Database migrations ran successfully
- [ ] Can register a new user via API
- [ ] Frontend can connect to backend
- [ ] CORS allows frontend requests
- [ ] Papers can be created and synced to cloud
- [ ] S3 uploads work (if testing PDF uploads)

---

## 🐛 Troubleshooting

### Issue: "Database connection failed"
**Solution:** 
- Check `DATABASE_URL` is correct
- Ensure Neon.tech database allows connections from Railway
- Check if SSL is required (`?sslmode=require`)

### Issue: "CORS error" in frontend
**Solution:**
- Check `FRONTEND_URL` environment variable matches your frontend URL exactly
- Restart deployment after changing environment variables

### Issue: "JWT secret error"
**Solution:**
- Ensure JWT secrets are set correctly
- Restart deployment after adding secrets

### Issue: "Migration failed"
**Solution:**
- Ensure `DATABASE_URL` points to production database
- Run migrations manually via Railway shell: `npm run db:migrate`

---

## 🎉 Success!

Once deployed:
- ✅ Backend is live at your Railway URL
- ✅ Users can register and login
- ✅ Papers sync to cloud database
- ✅ S3 storage works for PDFs
- ✅ Frontend connects to production backend

**Next Steps:**
1. Update frontend API URL
2. Test end-to-end
3. Monitor Railway logs
4. Set up custom domain (optional)

---

## 📝 Quick Reference

**Railway Dashboard:**
- View logs: Service → Deployments → Click deployment → Logs
- Environment variables: Service → Variables
- Settings: Service → Settings
- Metrics: Service → Metrics

**Useful Commands:**
```bash
# Railway CLI
railway login
railway link
railway run npm run db:migrate
railway logs
railway status
```

---

## 🔄 Auto-Deploy

Railway automatically deploys on every push to your main branch!

Just:
1. Push code to GitHub
2. Railway detects changes
3. Auto-deploys new version
4. Zero downtime (uses rolling updates)

---

## 🆘 Need Help?

1. Check Railway logs for errors
2. Verify all environment variables are set
3. Test database connection separately
4. Check CORS settings
5. Review `DEPLOYMENT.md` for detailed troubleshooting

**You're all set! 🚀**


# Pre-Deployment Checklist

Before deploying to production, gather all required information:

## ✅ Required Information

### 1. Database (PostgreSQL)
- [ ] **Neon.tech Production Database URL**
  - Format: `postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/database?sslmode=require`
  - Get it from: Neon.tech Dashboard → Your Project → Connection String
  - **Action:** Copy the connection string (include `?sslmode=require`)

### 2. JWT Secrets
- [ ] **Generate Access Token Secret**
  - Run: `openssl rand -base64 32` (Linux/Mac)
  - Or: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))` (PowerShell)
  - **Save it somewhere safe!** You'll need it during deployment

- [ ] **Generate Refresh Token Secret**
  - Run the same command again (different secret)
  - **Save it somewhere safe!**

### 3. S3 Storage (Cloudflare R2)
- [ ] **S3 Endpoint**
  - Format: `https://xxxxxx.r2.cloudflarestorage.com`
  - Get it from: Cloudflare Dashboard → R2 → Your Bucket → Settings

- [ ] **S3 Access Key ID**
  - Get it from: Cloudflare Dashboard → R2 → Manage R2 API Tokens

- [ ] **S3 Secret Access Key**
  - Get it from: Cloudflare Dashboard → R2 → Manage R2 API Tokens
  - **Important:** This is only shown once when you create the token

- [ ] **S3 Bucket Name**
  - Format: `citaversa-pdfs` (or your bucket name)

### 4. Frontend URL
- [ ] **Your Cloudflare Pages URL**
  - Format: `https://citaversa.pages.dev` (or your custom domain)
  - Get it from: Cloudflare Pages → Your Project → URL

---

## 🔐 Security Notes

**Never commit these to Git:**
- ❌ JWT secrets
- ❌ Database passwords
- ❌ S3 credentials

**Always use environment variables:**
- ✅ Set them in Railway/Render/DigitalOcean dashboard
- ✅ Use `.env` file for local development only (in `.gitignore`)

---

## 📋 Quick Reference

Once you have all information, here's what you'll need to set in Railway:

```env
# Server
NODE_ENV=production
PORT=3000

# Frontend
FRONTEND_URL=https://citaversa.pages.dev

# Database
DATABASE_URL=postgresql://user:password@ep-xxx.aws.neon.tech/db?sslmode=require

# JWT (your generated secrets)
JWT_ACCESS_SECRET=<your-access-secret>
JWT_REFRESH_SECRET=<your-refresh-secret>

# S3 (Cloudflare R2)
S3_BUCKET_NAME=citaversa-pdfs
S3_ENDPOINT=https://xxxxxx.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<your-access-key>
S3_SECRET_ACCESS_KEY=<your-secret-key>
S3_REGION=auto
```

---

## ✅ Ready to Deploy?

Once you have all the above information:
1. ✅ All checkboxes checked
2. ✅ All values copied/saved
3. ✅ Ready to add to Railway environment variables

**Next Step:** Follow `DEPLOY_QUICKSTART.md` for step-by-step deployment instructions.


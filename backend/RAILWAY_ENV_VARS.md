# Railway Environment Variables Guide

This document lists all environment variables that should be configured in Railway for the citavErs backend.

## Required for Resend Email Service

To use Resend for sending verification emails, add these variables in Railway:

```
EMAIL_SERVICE_TYPE=resend
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=onboarding@resend.dev
EMAIL_FROM_NAME=Citavers
```

### How to Add in Railway:

**Important:** Add variables to the **service** (not as shared variables)

1. Go to your Railway project dashboard
2. Select your **backend service** (click on the service name)
3. Click on the **Variables** tab (in the service, not project)
4. Click **+ New Variable** (do NOT use "Add Shared Variable")
5. Add the variables one by one directly to the service:

   - **Key:** `EMAIL_SERVICE_TYPE`
     - **Value:** `resend`
   
   - **Key:** `RESEND_API_KEY`
     - **Value:** `re_your_actual_api_key` (starts with `re_`)
     - **Get from:** https://resend.com/api-keys
   
   - **Key:** `EMAIL_FROM`
     - **Value:** `onboarding@resend.dev` (default - works immediately)
     - **Or:** `noreply@citavers.com` (after domain verification)
   
   - **Key:** `EMAIL_FROM_NAME`
     - **Value:** `Citavers`

## Optional Variables (Recommended)

```
FRONTEND_URL=https://citavers.com
NODE_ENV=production
PORT=3000
```

## Database Variables (Required)

```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

## JWT Secrets (Required)

```
JWT_ACCESS_SECRET=your-super-secret-access-token-key
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key
```

## S3/Storage Variables (If using Cloudflare R2)

```
S3_BUCKET_NAME=citavers-pdfs
S3_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
```

## Complete Variable List for Resend

Here's the complete list of variables you should have in Railway for Resend email:

| Variable Name | Required | Example Value | Notes |
|--------------|----------|---------------|-------|
| `EMAIL_SERVICE_TYPE` | ✅ Yes | `resend` | Must be exactly `resend` |
| `RESEND_API_KEY` | ✅ Yes | `re_...` | Get from Resend dashboard |
| `EMAIL_FROM` | ✅ Yes | `onboarding@resend.dev` | Default works without verification |
| `EMAIL_FROM_NAME` | ⚠️ Recommended | `Citavers` | Display name for emails |
| `FRONTEND_URL` | ✅ Yes | `https://citavers.com` | Frontend domain |
| `DATABASE_URL` | ✅ Yes | `postgresql://...` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ✅ Yes | `random-secret-string` | Generate random string |
| `JWT_REFRESH_SECRET` | ✅ Yes | `random-secret-string` | Generate random string |
| `NODE_ENV` | ⚠️ Recommended | `production` | Environment name |
| `PORT` | ❌ Optional | `3000` | Defaults to 3000 |

## Verification Steps

After adding variables in Railway:

1. **Check Railway Logs:**
   - Deploy your service
   - Check logs for: `📧 Email Service: resend`
   - Should show: `Resend API: ✅ Configured`

2. **Test Email Sending:**
   - Register a new user
   - Check email inbox (and spam folder)
   - You should receive a verification email

3. **Check for Errors:**
   - If you see `❌ Missing API key`, the `RESEND_API_KEY` is not set
   - If you see `RESEND_API_KEY environment variable is required`, the key is missing or empty

## Common Issues

### Variables Not Showing in Railway Variables Tab

**If you added variables as Shared Variables:**
- Shared variables may not appear in the service's Variables tab
- However, they should still be available to your service at runtime
- Check Railway logs to see if variables are being loaded

**Solution - Add as Service-Specific Variables:**
1. Go to your **backend service** (not project)
2. Click on **Variables** tab
3. Click **+ New Variable** (not "Add Shared Variable")
4. Add each Resend variable directly to the service:
   - `EMAIL_SERVICE_TYPE`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `EMAIL_FROM_NAME`

**Verify Variables Are Available:**
- Check Railway logs after deployment
- Look for: `📧 Email Service: resend`
- Should show: `Resend API: ✅ Configured`
- If it shows `❌ Missing API key`, the variable isn't accessible

### Shared Variables vs Service Variables

**Shared Variables (Project-level):**
- Added at project level
- Available to all services
- May not show in service Variables tab
- Use when same value needed across multiple services

**Service Variables (Service-specific):**
- Added to specific service
- Show up in service Variables tab
- Use for service-specific configuration
- **Recommended for Resend variables**

### Why Use Service Variables Instead?

1. **Visibility**: Show up in service Variables tab
2. **Isolation**: Only available to that service
3. **Easier Debugging**: Can see all variables in one place
4. **Railway Best Practice**: Service-specific config should be service variables

### Variable Name Typos

Make sure variable names match exactly:
- ✅ `EMAIL_SERVICE_TYPE` (correct)
- ❌ `EMAIL_SERVICE` (wrong)
- ❌ `EMAIL_SERVICE_TYPE_ENV` (wrong)

### Getting Resend API Key

1. Go to https://resend.com
2. Sign up / Log in
3. Go to **API Keys** section
4. Click **Create API Key**
5. Name it (e.g., "citavErs Production")
6. Copy the key (starts with `re_`)
7. Paste into Railway variable `RESEND_API_KEY`

## After Domain Verification

Once you verify your domain in Resend:

1. Update `EMAIL_FROM` in Railway:
   ```
   EMAIL_FROM=noreply@citavers.com
   ```

2. Keep other variables the same

3. Redeploy your Railway service


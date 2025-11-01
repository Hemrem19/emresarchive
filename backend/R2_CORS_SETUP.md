# Cloudflare R2 CORS Configuration Guide

## Problem: PDF Upload Fails with CORS Errors

When uploading PDFs to Cloudflare R2, you may see:
- **"CORS Missing Allow Origin"**
- **"CORS request did not succeed"**
- **403 Forbidden** or **400 Bad Request** on PUT requests

This happens because Cloudflare R2 requires CORS to be configured in the bucket settings.

## Solution: Configure CORS in R2 Bucket

### Step 1: Open Your R2 Bucket Settings

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** in the left sidebar
3. Click on your bucket (e.g., `citaversa-pdfs`)
4. Click the **Settings** tab
5. Scroll to the **CORS Policy** section

### Step 2: Add CORS Policy

1. Click **Edit CORS Policy**
2. Paste this JSON configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://citaversa.com",
      "https://*.citaversa.com",
      "http://localhost:8080",
      "http://localhost:5500",
      "http://localhost:3000",
      "http://127.0.0.1:8080"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD", "OPTIONS"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

3. Click **Save**

### Step 3: Wait and Test

1. **Wait 1-2 minutes** for CORS policy to propagate
2. **Clear browser cache** and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Try uploading a PDF again
4. Check browser Network tab:
   - OPTIONS preflight should return `200 OK`
   - PUT request should return `200 OK` (not 400 or CORS error)

## What Each Field Means

- **AllowedOrigins**: Frontend domains that can upload to R2
  - Include your production domain (`https://citaversa.com`)
  - Include localhost for development
  - Use wildcards for subdomains if needed

- **AllowedMethods**: HTTP methods allowed
  - `PUT` for uploads
  - `GET` for downloads
  - `HEAD` and `OPTIONS` for preflight checks

- **AllowedHeaders**: Headers allowed in requests
  - `*` allows all headers (most permissive)
  - You can restrict to specific headers if needed

- **ExposeHeaders**: Headers exposed to JavaScript
  - `ETag` for file verification
  - `Content-Length` for file size

- **MaxAgeSeconds**: How long browsers cache CORS preflight (1 hour)

## Production Configuration

For production only (remove localhost origins):

```json
[
  {
    "AllowedOrigins": [
      "https://citaversa.com",
      "https://*.citaversa.com"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD", "OPTIONS"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

## Troubleshooting

### Still Getting CORS Errors?

1. **Verify CORS policy saved**: Check R2 bucket Settings → CORS Policy
2. **Check exact origin match**: Your frontend URL must match exactly (including `https://`)
3. **Clear browser cache**: Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
4. **Wait for propagation**: CORS changes can take 1-2 minutes
5. **Check Network tab**:
   - Look at OPTIONS request headers
   - Check `Access-Control-Allow-Origin` response header
   - Verify PUT request includes `Content-Type` header

### 400 Bad Request (Not CORS)?

If you get 400 errors but not CORS errors:
- Check presigned URL hasn't expired (valid for 1 hour)
- Verify `Content-Type` matches exactly: `application/pdf`
- Verify `Content-Length` matches actual file size
- Check file size doesn't exceed limit (50MB)

### 403 Forbidden?

- Verify R2 API token has correct permissions
- Check bucket name matches `S3_BUCKET_NAME` environment variable
- Ensure token hasn't been revoked or expired

## Testing

After configuring CORS:

1. Open browser DevTools → Network tab
2. Try uploading a PDF
3. Check OPTIONS request:
   - Should return `200 OK` or `204 No Content`
   - Response headers should include `Access-Control-Allow-Origin: https://citaversa.com`
4. Check PUT request:
   - Should return `200 OK`
   - Should include `ETag` in response headers
   - No CORS errors in console

## Alternative: Use Backend Proxy (Not Recommended)

If you can't configure CORS in R2, you can upload through your backend:
- Frontend → Backend → R2
- Slower and uses more backend bandwidth
- Not recommended for production

The recommended approach is to configure CORS in R2 bucket settings.

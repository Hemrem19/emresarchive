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
      "http://localhost:8080",
      "http://localhost:5500",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*",
      "content-type",
      "content-length",
      "host"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

**Note:** If `"*"` alone doesn't work, explicitly including `content-type`, `content-length`, and `host` helps because these are the headers that presigned URLs sign.

**Important Notes:**
- **Do NOT include "OPTIONS" in AllowedMethods** - Cloudflare R2 automatically handles OPTIONS preflight requests, so you don't need to include it
- Do NOT use wildcards in `AllowedOrigins` (like `https://*.citaversa.com`) - Cloudflare R2 doesn't support wildcards
- Each origin must be listed separately
- `AllowedHeaders` can be `["*"]` to allow all headers
- `ExposeHeaders` should be minimal - just `["ETag"]` is usually sufficient

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
      "https://citaversa.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

**Note:** Do NOT include "OPTIONS" in AllowedMethods - R2 handles OPTIONS automatically.

**Note:** If you have multiple domains/subdomains, add each one separately to `AllowedOrigins` (no wildcards).

## Troubleshooting

## Important: Why Direct Bucket Tests Fail

**Testing the bucket root directly (like `/citaversa-pdfs/`) will ALWAYS return 403 Forbidden**, even with CORS configured. This is expected behavior because:

1. R2 doesn't allow unauthenticated requests to bucket roots
2. CORS only applies to actual object operations (PUT/GET to specific objects)
3. Presigned URLs include authentication and work with CORS

**You MUST test CORS by actually uploading a PDF through your app** - don't test the bucket URL directly.

### Still Getting 403 Forbidden (Even After CORS Configured)?

If OPTIONS preflight succeeds (204) but PUT fails with 403:

**1. Verify CORS Policy is Actually Applied:**
- Go to R2 bucket → Settings → CORS Policy
- Make sure the policy shows (not empty)
- Click **Edit CORS Policy** and verify your exact origin is there
- Click **Save** again (even if it looks correct)

**2. Check for Additional Headers:**
The presigned URL might include additional headers that aren't in your CORS policy. Check the Network tab → PUT request → Request Headers. If you see headers like:
- `x-amz-checksum-*`
- `x-amz-sdk-*`
- Custom headers

Add them to `AllowedHeaders` in your CORS policy:

```json
"AllowedHeaders": [
  "*",
  "x-amz-*",
  "content-type",
  "content-length"
]
```

**3. Verify Your Exact Origin:**
Open browser console and run this to see your exact origin:
```javascript
console.log('Current origin:', window.location.origin);
```
Make sure this exact value (including `https://` or `http://`) is in your `AllowedOrigins` array.

**2. Verify CORS Policy Saved:**
- Go to R2 bucket → Settings → CORS Policy
- Make sure the policy shows up (not empty)
- Check that your exact origin is listed

**3. Common Issues:**

**Origin Mismatch:**
- `https://citaversa.com` ≠ `https://www.citaversa.com` (add both if needed)
- `https://citaversa.com` ≠ `http://citaversa.com` (must match protocol)
- Check for trailing slashes or paths in your origin

**CORS Policy Not Applied:**
- Wait 2-3 minutes after saving
- Clear browser cache completely
- Try incognito/private browsing mode
- Check Network tab → OPTIONS request → Response Headers → should see `Access-Control-Allow-Origin`

**4. Check Bucket Permissions:**
The `403 Forbidden` error suggests R2 is rejecting the request before CORS is checked. This usually means:
- The bucket needs to be configured to allow public access (or at least CORS preflight)
- The CORS policy might not be applied correctly

**Important:** R2 CORS only works when:
1. The CORS policy is correctly configured
2. You're using a **presigned URL** (not direct bucket access)
3. The presigned URL is generated correctly by your backend

**5. Test with Presigned URL:**
CORS won't work when testing against the bucket root. You need to test with an actual presigned URL from your backend. Try uploading a PDF through your app instead of testing the bucket directly.

The 403 error when testing `/citaversa-pdfs/` directly is expected - R2 doesn't allow OPTIONS requests to bucket roots without proper authentication. CORS only applies to actual object operations via presigned URLs.

**5. Try More Permissive Headers Configuration:**
If `"*"` in `AllowedHeaders` doesn't work for PUT requests, try explicitly listing all headers:

```json
[
  {
    "AllowedOrigins": [
      "https://citaversa.com",
      "http://localhost:8080",
      "http://localhost:5500"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*",
      "Content-Type",
      "Content-Length",
      "x-amz-*",
      "x-amz-checksum-*",
      "x-amz-sdk-*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

**6. Verify CORS Policy Format:**
Make absolutely sure:
- No trailing slashes in origins: `https://citaversa.com` (NOT `https://citaversa.com/`)
- No OPTIONS in AllowedMethods
- Proper JSON formatting (commas, brackets, quotes)
- Policy is saved (not just edited but also saved)

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

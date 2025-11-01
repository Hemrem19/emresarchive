# R2 CORS Troubleshooting: OPTIONS Works but PUT Fails

## Current Situation

- ✅ OPTIONS preflight succeeds (204 No Content)
- ❌ PUT request fails with 403 + "CORS Missing Allow Origin"

## Root Cause

When R2 returns a 403 error, it might not include CORS headers in the error response. This causes the browser to block the response even if CORS is configured correctly.

## Solutions to Try

### Solution 1: Verify CORS Policy is Actually Applied

1. Go to Cloudflare Dashboard → R2 → Your Bucket → Settings → CORS Policy
2. **Make absolutely sure the policy is saved:**
   - Click "Edit CORS Policy"
   - Verify the JSON is correct
   - **Click Save** (even if it looks correct)
   - Wait 2-3 minutes
3. Check that your exact origin is listed (no trailing slash, correct protocol)

### Solution 2: Try Minimal CORS Policy

Sometimes simpler is better. Try this minimal configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://citaversa.com"
    ],
    "AllowedMethods": [
      "PUT",
      "GET"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3600
  }
]
```

### Solution 3: Check Request Headers

In browser Network tab → PUT request → Request Headers, check what headers are actually being sent:

- `Content-Type: application/pdf` ✅
- `Content-Length: <number>` (automatic) ✅
- `Host: ...` (automatic) ✅
- Any other headers?

Make sure ALL headers in the request are in your `AllowedHeaders` array (or use `"*"`).

### Solution 4: Try Without ContentType/ContentLength in Presigned URL

If signature matching is still an issue, we can try generating presigned URLs without ContentType/ContentLength constraints (less secure but more flexible):

**Backend change** (don't do this unless Solution 1-3 don't work):
```javascript
// In s3.js - generate URL without ContentType/ContentLength
const command = new PutObjectCommand({
  Bucket: BUCKET_NAME,
  Key: key
  // Remove ContentType and ContentLength from signature
});
```

**Frontend change**:
```javascript
// Set headers in the request
headers: {
  'Content-Type': file.type || 'application/pdf',
  'Content-Length': file.size.toString()
}
```

### Solution 5: Verify R2 Bucket Permissions

The 403 might be a permissions issue, not CORS:

1. Check R2 API token permissions
2. Verify token has "Admin Read & Write" or equivalent permissions
3. Verify token is for the correct bucket
4. Check if token has expired or been revoked

## Quick Verification Checklist

- [ ] CORS policy saved (not just edited) in R2 dashboard
- [ ] Origin matches exactly: `https://citaversa.com` (not `https://www.citaversa.com`)
- [ ] AllowedMethods includes `PUT` (not just `GET`)
- [ ] AllowedHeaders includes `"*"` or all headers sent
- [ ] Waited 2-3 minutes after saving CORS policy
- [ ] Cleared browser cache / tried incognito mode
- [ ] R2 API token has correct permissions
- [ ] Credentials are correct (32-char Access Key ID)

## Testing After Fixes

1. **Clear browser cache** completely
2. **Try incognito/private mode**
3. **Upload a small test PDF** (< 1MB)
4. **Check Network tab**:
   - OPTIONS should return 200/204 with `Access-Control-Allow-Origin` header
   - PUT should return 200 (not 403) with `Access-Control-Allow-Origin` header

## If Nothing Works

If CORS still doesn't work after all fixes:

1. **Contact Cloudflare Support** - R2 CORS might have a bug
2. **Alternative**: Upload PDFs through your backend instead of directly to R2:
   - Frontend → Backend → R2
   - Slower but bypasses CORS issues
   - Requires backend to handle file uploads


# Cloudflare R2 CORS Configuration

## Issue: CORS Errors When Uploading to R2

If you see errors like:
- "CORS Missing Allow Origin"
- "CORS request did not succeed"
- "403 Forbidden" on PUT requests to R2

## Solution: Configure CORS in R2 Bucket

### Step 1: Open R2 Bucket Settings

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** → Your bucket (`citaversa-pdfs`)
3. Click **Settings** tab
4. Scroll to **CORS Policy** section

### Step 2: Add CORS Policy

Click **Edit CORS Policy** and add this JSON configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://citaversa.com",
      "https://*.citaversa.com",
      "http://localhost:8080",
      "http://localhost:5500",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD", "OPTIONS"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

### Step 3: Save and Test

1. Click **Save** to apply the CORS policy
2. Try uploading a PDF again from your frontend
3. Check browser Network tab - OPTIONS requests should return 200 OK

### What Each Field Means

- **AllowedOrigins**: Frontend domains that can upload to R2
- **AllowedMethods**: HTTP methods allowed (PUT for uploads, GET for downloads)
- **AllowedHeaders**: Headers allowed in requests (use `*` for all)
- **ExposeHeaders**: Headers exposed to frontend JavaScript
- **MaxAgeSeconds**: How long browsers cache CORS preflight (1 hour)

### Production vs Development

For production, replace `localhost` origins with your actual domain:

```json
{
  "AllowedOrigins": ["https://citaversa.com", "https://*.citaversa.com"]
}
```

### Troubleshooting

**Still getting CORS errors?**
1. Clear browser cache and hard refresh
2. Check browser Network tab - look at OPTIONS request headers
3. Verify your frontend domain matches exactly (including `https://`)
4. Wait 1-2 minutes after saving CORS policy (propagation delay)

**403 Forbidden (not CORS)?**
- Check R2 API token has correct permissions
- Verify presigned URL hasn't expired
- Ensure Content-Type and Content-Length match


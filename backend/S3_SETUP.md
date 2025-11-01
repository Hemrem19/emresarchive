# S3 Storage Setup Guide (Cloudflare R2)

This guide will help you set up Cloudflare R2 (S3-compatible) storage for PDF uploads.

## Why Cloudflare R2?

- **S3-compatible API**: Works with AWS SDK without changes
- **Free egress**: No data transfer fees
- **Low storage costs**: $0.015 per GB/month
- **Fast**: Global CDN integration
- **Secure**: Built-in encryption and access controls

## Step 1: Create Cloudflare R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** in the sidebar
3. Click **Create bucket**
4. Enter bucket name: `citaversa-pdfs` (or your preferred name)
5. Choose a location (any region works)
6. Click **Create bucket**

## Step 2: Create API Token

1. In R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API Token**
3. Configure:
   - **Token name**: `citaversa-backend`
   - **Permissions**: **Admin Read & Write** (or create custom permissions)
   - **Bucket access**: Select your bucket (`citaversa-pdfs`)
4. Click **Create API Token**
5. **Important**: Copy the **Access Key ID** and **Secret Access Key** immediately (you won't see them again!)

## Step 3: Get R2 Endpoint URL

1. In R2 dashboard, click on your bucket
2. Go to **Settings** tab
3. Find **S3 API** section
4. Copy the **Endpoint** URL (format: `https://xxxxxxxxxxxxxx.r2.cloudflarestorage.com`)

## Step 4: Configure Backend

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your R2 credentials:
   ```env
   S3_BUCKET_NAME=citaversa-pdfs
   S3_ENDPOINT=https://xxxxxxxxxxxxxx.r2.cloudflarestorage.com
   S3_ACCESS_KEY_ID=your-access-key-id
   S3_SECRET_ACCESS_KEY=your-secret-access-key
   S3_REGION=auto
   S3_PRESIGNED_URL_EXPIRY_SECONDS=3600
   ```

3. Restart your backend server:
   ```bash
   npm run dev
   ```

## Step 5: Test S3 Upload

Use the test script or API:

```bash
# Get upload URL
curl -X POST http://localhost:3000/api/papers/upload-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.pdf",
    "size": 1024,
    "contentType": "application/pdf"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://...",
    "s3Key": "papers/1/123/test.pdf",
    "expiresIn": 3600
  }
}
```

## Upload Flow

1. **Frontend requests upload URL**:
   - POST `/api/papers/upload-url`
   - Includes: `filename`, `size`, `contentType`, optional `paperId`

2. **Backend generates presigned URL**:
   - Returns presigned PUT URL valid for 1 hour
   - Returns S3 key for storing in database

3. **Frontend uploads directly to S3**:
   - PUT request to presigned URL
   - Include PDF file in request body
   - No need to go through backend server

4. **Frontend creates paper**:
   - POST `/api/papers`
   - Include `s3Key` or `pdfUrl` in request body

## Security Considerations

- **Presigned URLs**: Time-limited (1 hour by default)
- **User isolation**: Each user's PDFs stored in separate folder (`papers/{userId}/`)
- **File size limit**: 50MB maximum enforced
- **Content type validation**: Only PDFs allowed
- **Access control**: Only authenticated users can request upload URLs

## Troubleshooting

### Error: "S3 storage is not configured"
- Check that all S3 environment variables are set in `.env`
- Verify `.env` file is being loaded (check `dotenv.config()` in `server.js`)

### Error: "Access Denied"
- Verify your R2 API token has correct permissions
- Check bucket name matches `S3_BUCKET_NAME`
- Ensure token hasn't been revoked

### Upload fails with 403 or CORS errors
- **CORS Configuration Required**: Cloudflare R2 requires CORS to be configured in the bucket settings
  1. Go to your R2 bucket in Cloudflare Dashboard
  2. Click **Settings** tab
  3. Scroll to **CORS Policy** section
  4. Click **Edit CORS Policy**
  5. Add the following CORS configuration:
     ```json
     [
       {
         "AllowedOrigins": ["https://citaversa.com", "https://*.citaversa.com"],
         "AllowedMethods": ["PUT", "GET", "HEAD", "OPTIONS"],
         "AllowedHeaders": ["*"],
         "ExposeHeaders": ["ETag"],
         "MaxAgeSeconds": 3600
       }
     ]
     ```
  6. Click **Save**
- Check presigned URL hasn't expired
- Verify Content-Type matches exactly: `application/pdf`
- Verify Content-Length matches actual file size
- Verify CORS policy allows your frontend origin

### File not found after upload
- Verify S3 key is saved correctly in database (`pdfUrl` field)
- Check file actually uploaded to R2 bucket
- Verify bucket permissions allow public/private reads as needed

## Alternative: AWS S3

If you prefer AWS S3 instead of Cloudflare R2:

1. Set environment variables:
   ```env
   S3_BUCKET_NAME=citaversa-pdfs
   S3_ENDPOINT=  # Leave empty for AWS S3
   S3_REGION=us-east-1  # Your AWS region
   S3_ACCESS_KEY_ID=your-aws-access-key
   S3_SECRET_ACCESS_KEY=your-aws-secret-key
   ```

2. Remove `forcePathStyle: true` from S3 client configuration (only needed for R2)

## Cost Estimates

**Cloudflare R2:**
- Storage: $0.015 per GB/month
- Egress: FREE (unlimited)
- Operations: FREE

**Example:** 1000 papers × 5MB average = 5GB storage
- Monthly cost: ~$0.075 (less than 10 cents!)

**AWS S3:**
- Storage: $0.023 per GB/month
- Egress: $0.09 per GB (first 10GB free)
- Operations: Minimal cost

R2 is significantly cheaper for applications with regular downloads!



# R2 Bucket Not Found - Fix Instructions

## Problem
The error shows: `NoSuchBucket: The specified bucket does not exist.`
- Current bucket name: `citaversa-pdf-2`
- R2 Endpoint: `https://a7b962b3375f9a99151d2ae556ec6e31.r2.cloudflarestorage.com`

## Solution Options

### Option 1: Create the Bucket in R2 (Recommended)

1. Go to Cloudflare Dashboard → R2 → Your account
2. Click "Create bucket"
3. Enter bucket name: `citaversa-pdf-2` (must match exactly)
4. Choose location (optional)
5. Click "Create bucket"
6. The bucket is now ready to use

### Option 2: Use an Existing Bucket

1. Go to Cloudflare Dashboard → R2 → Your account
2. Find an existing bucket name (e.g., `my-pdf-bucket`)
3. In Railway dashboard → Your service → Variables
4. Update `S3_BUCKET_NAME` to match your existing bucket name
5. Railway will redeploy automatically

## Verify Your Bucket Configuration

After creating/updating the bucket, verify:
- ✅ `S3_BUCKET_NAME` in Railway matches the actual bucket name in R2
- ✅ `S3_ENDPOINT` is correct (your R2 endpoint URL)
- ✅ `S3_ACCESS_KEY_ID` is set
- ✅ `S3_SECRET_ACCESS_KEY` is set
- ✅ Bucket permissions allow read/write from your R2 account

## Test After Fix

Once the bucket exists:
1. Wait for Railway to redeploy (if you changed env vars)
2. Try uploading a PDF again
3. The upload should now succeed!


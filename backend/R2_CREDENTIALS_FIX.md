# Fix: Cloudflare R2 Credentials Error

## Error Message

```
<Code>InvalidArgument</Code>
<Message>Credential access key has length 64, should be 32</Message>
```

## Problem

Your R2 **Access Key ID** is 64 characters, but Cloudflare R2 expects it to be **32 characters**.

This usually happens when:
- You copied the wrong credential value from Cloudflare Dashboard
- You're using a full API token instead of just the Access Key ID
- The credential format changed

## Solution

### Step 1: Verify Your R2 API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** → **Manage R2 API Tokens**
3. Find your token (e.g., `citaversa-backend`)
4. Click **View** to see the credentials

### Step 2: Check the Format

**Access Key ID should be:**
- Exactly **32 characters** long
- Alphanumeric characters
- Format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (no dashes, no colons)

**Secret Access Key should be:**
- Usually **64 characters** or longer
- Base64-encoded string

### Step 3: Verify Backend Environment Variables

Check your Railway environment variables (or `.env` file):

```bash
S3_ACCESS_KEY_ID=xxxxx  # Should be 32 characters
S3_SECRET_ACCESS_KEY=xxxxx  # Should be 64+ characters
S3_BUCKET_NAME=citaversa-pdfs
S3_ENDPOINT=https://xxxxxxxxxxxxxx.r2.cloudflarestorage.com
S3_REGION=auto
```

### Step 4: Common Mistakes

**❌ Wrong:** Copying the full token string (64+ chars) as Access Key ID
```
S3_ACCESS_KEY_ID=1e811a492b871158559ae466fb77945d5z8zkoa@qbp5k6dfq990uks19pzdrwi5...  # 64 chars - WRONG!
```

**✅ Correct:** Using just the Access Key ID portion (32 chars)
```
S3_ACCESS_KEY_ID=1e811a492b871158559ae466fb77945d  # 32 chars - CORRECT!
```

### Step 5: Create New API Token (If Needed)

If your current token format is wrong:

1. Go to **R2** → **Manage R2 API Tokens**
2. Click **Create API Token**
3. Configure:
   - **Token name**: `citaversa-backend`
   - **Permissions**: **Admin Read & Write** (or custom for your bucket)
   - **Bucket access**: Select `citaversa-pdfs`
4. Click **Create API Token**
5. **IMPORTANT**: Copy the credentials immediately:
   - **Access Key ID** (should be exactly 32 characters)
   - **Secret Access Key** (will be longer, base64-encoded)

### Step 6: Update Railway Environment Variables

1. Go to Railway Dashboard → Your Project → Variables
2. Update these variables:
   ```
   S3_ACCESS_KEY_ID=<32-character-access-key-id>
   S3_SECRET_ACCESS_KEY=<your-secret-access-key>
   ```
3. **DO NOT** include:
   - Quotes around values
   - Extra spaces
   - The full token string

### Step 7: Redeploy and Test

1. Railway should automatically redeploy after updating variables
2. Wait for deployment to complete
3. Try uploading a PDF again
4. The error should change from "Credential access key has length 64, should be 32" to a success (or different error if CORS still needs fixing)

## Verification

After fixing credentials, check Railway logs:
- Should NOT see "Credential access key has length 64" error
- Presigned URLs should generate successfully
- Uploads should proceed to CORS check (not credential error)

## Still Having Issues?

If you still see credential errors after fixing:
1. Double-check you're using **Access Key ID** (32 chars), not the full token
2. Verify no extra spaces or characters in environment variables
3. Check Railway logs for exact error messages
4. Consider creating a fresh R2 API token


# Quick API Testing Guide

This guide shows you how to quickly test the API endpoints.

## 🚀 Method 1: Automated Test Scripts

### Run All Tests

```bash
# Make sure server is running
npm run dev

# In another terminal, run all tests
cd backend
npm run test:papers
```

This will test:
- ✅ Authentication (register, login)
- ✅ Papers CRUD (create, read, update, delete)
- ✅ Collections CRUD
- ✅ Annotations CRUD
- ✅ Search and filtering
- ✅ Validation

### Test S3 Storage Specifically

```bash
# 1. First, get an access token:
# Register or login (see Method 2 below)

# 2. Then test S3:
npm run test:s3 YOUR_ACCESS_TOKEN
```

---

## 🛠️ Method 2: Manual Testing with cURL

### Step 1: Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test@example.com\", \"password\": \"TestPassword123!\", \"name\": \"Test User\"}"
```

**Copy the `accessToken` from the response!**

### Step 2: Test Papers Endpoints

Replace `YOUR_ACCESS_TOKEN` with the token from Step 1:

```bash
# Create a paper
curl -X POST http://localhost:3000/api/papers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"Test Paper\", \"authors\": [\"Author 1\"]}"

# Get all papers
curl -X GET http://localhost:3000/api/papers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Search papers
curl -X GET "http://localhost:3000/api/papers/search?q=test" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Step 3: Test S3 Upload URL

```bash
# Get presigned upload URL
curl -X POST http://localhost:3000/api/papers/upload-url \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"filename\": \"test.pdf\", \"size\": 1024, \"contentType\": \"application/pdf\"}"
```

**Response includes:**
- `uploadUrl` - Presigned URL to upload PDF directly to S3
- `s3Key` - Key to store in database (e.g., `papers/1/123/test.pdf`)

### Step 4: Upload PDF to S3

```bash
# Use the uploadUrl from Step 3
curl -X PUT "PRESIGNED_UPLOAD_URL" \
  -H "Content-Type: application/pdf" \
  --data-binary "@path/to/your/file.pdf"
```

### Step 5: Create Paper with S3 Key

```bash
# Use the s3Key from Step 3
curl -X POST http://localhost:3000/api/papers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"Paper with PDF\", \"authors\": [\"Author\"], \"s3Key\": \"papers/1/123/test.pdf\", \"pdfSizeBytes\": 1024}"
```

### Step 6: Get Download URL

```bash
# Replace PAPER_ID with actual paper ID from Step 5
curl -X GET http://localhost:3000/api/papers/PAPER_ID/pdf \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🌐 Method 3: Using Postman or Thunder Client

1. **Import Collection** (if available)
2. **Set Base URL**: `http://localhost:3000`
3. **Test Endpoints**:
   - Register → Copy `accessToken`
   - Set token in Authorization header: `Bearer YOUR_ACCESS_TOKEN`
   - Test other endpoints

---

## 🔍 Method 4: Check Server Health

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2025-10-31T..."
}
```

---

## 📝 Quick Test Checklist

- [ ] Server running (`npm run dev`)
- [ ] Health check works (`GET /health`)
- [ ] Register user (`POST /api/auth/register`)
- [ ] Login (`POST /api/auth/login`)
- [ ] Create paper (`POST /api/papers`)
- [ ] Get papers (`GET /api/papers`)
- [ ] Search papers (`GET /api/papers/search?q=test`)
- [ ] Get upload URL (`POST /api/papers/upload-url`)
- [ ] Create collection (`POST /api/collections`)
- [ ] Create annotation (`POST /api/papers/:id/annotations`)

---

## ⚠️ Troubleshooting

### "Connection refused"
- Make sure server is running: `npm run dev`
- Check port: Should be `http://localhost:3000`

### "Authentication required"
- Make sure you included: `Authorization: Bearer YOUR_ACCESS_TOKEN`
- Check token is valid (not expired)

### "S3 storage is not configured"
- Check `.env` file has S3 credentials
- See [S3_SETUP.md](./S3_SETUP.md) for setup instructions

---

## 💡 Pro Tips

1. **Save your access token** to a variable:
   ```bash
   TOKEN="your-access-token-here"
   curl -H "Authorization: Bearer $TOKEN" ...
   ```

2. **Pretty print JSON**:
   ```bash
   curl ... | python -m json.tool
   # OR
   curl ... | jq
   ```

3. **Test in order**:
   - First: Authentication
   - Then: Papers
   - Then: Collections
   - Finally: Annotations



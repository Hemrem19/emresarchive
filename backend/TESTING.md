# Backend API Testing Guide

## 🧪 Quick Test with Test Scripts

### Prerequisites

- Node.js 20+ installed
- Backend dependencies installed: `npm install`
- Server running: `npm run dev`
- Database configured and migrated

### Run Authentication Tests

```bash
# Make sure server is running first
npm run dev

# In another terminal, run auth tests
npm run test:auth
# OR
node test-auth.js
```

The auth test script will:
- ✅ Test user registration
- ✅ Test duplicate email rejection
- ✅ Test validation (invalid email)
- ✅ Test login
- ✅ Test invalid password/email
- ✅ Test authenticated endpoints
- ✅ Test token refresh
- ✅ Test logout
- ✅ Test token invalidation after logout

### Run Papers & Auth Tests (Complete)

```bash
# Make sure server is running first
npm run dev

# In another terminal, run all tests
npm run test:all
# OR
npm run test:papers
# OR
node test-papers.js
```

The papers test script will:
- ✅ Test user registration/login
- ✅ Test create paper
- ✅ Test get all papers (with pagination)
- ✅ Test get single paper
- ✅ Test update paper
- ✅ Test search papers
- ✅ Test filter by status
- ✅ Test filter by tag
- ✅ Test validation (missing fields)
- ✅ Test duplicate DOI check
- ✅ Test delete paper (soft delete)
- ✅ Test deleted paper returns 404

### Test S3 Storage

```bash
# First, get an access token by registering or logging in
# Then test S3 upload/download URLs:
npm run test:s3 YOUR_ACCESS_TOKEN
# OR
node test-s3.js YOUR_ACCESS_TOKEN
```

The S3 test script will:
- ✅ Test presigned upload URL generation
- ✅ Test paper creation with S3 key
- ✅ Test presigned download URL generation

**Note:** To get an access token:
1. Register: `POST /api/auth/register`
2. Login: `POST /api/auth/login`
3. Copy `accessToken` from response

---

## 🛠️ Manual Testing with cURL

### 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "test@example.com",
      "name": "Test User",
      "emailVerified": false,
      "createdAt": "2025-10-31T..."
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "test@example.com",
      "name": "Test User"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Get Current User (Authenticated)

```bash
# Replace YOUR_ACCESS_TOKEN with the token from login/register
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "test@example.com",
      "name": "Test User",
      "emailVerified": false,
      "createdAt": "2025-10-31T..."
    }
  }
}
```

### 4. Refresh Access Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 5. Logout

```bash
# Replace YOUR_ACCESS_TOKEN and YOUR_REFRESH_TOKEN
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 📄 Papers Endpoints Testing

### 1. Create Paper

```bash
# Replace YOUR_ACCESS_TOKEN with token from login/register
curl -X POST http://localhost:3000/api/papers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Research Paper",
    "authors": ["John Doe", "Jane Smith"],
    "year": 2024,
    "journal": "Test Journal",
    "doi": "10.1234/example",
    "abstract": "This is a test abstract.",
    "tags": ["machine-learning", "ai"],
    "status": "To Read",
    "notes": "Test notes"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "paper": {
      "id": 1,
      "title": "Test Research Paper",
      "authors": ["John Doe", "Jane Smith"],
      "year": 2024,
      "journal": "Test Journal",
      "doi": "10.1234/example",
      "tags": ["machine-learning", "ai"],
      "status": "To Read",
      "notes": "Test notes",
      "createdAt": "2025-10-31T...",
      "updatedAt": "2025-10-31T...",
      "version": 1
    }
  }
}
```

### 2. Get All Papers

```bash
curl -X GET http://localhost:3000/api/papers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**With Pagination:**
```bash
curl -X GET "http://localhost:3000/api/papers?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**With Filters:**
```bash
# Filter by status
curl -X GET "http://localhost:3000/api/papers?status=Reading" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Filter by tag
curl -X GET "http://localhost:3000/api/papers?tag=machine-learning" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "papers": [...],
    "pagination": {
      "page": 1,
      "limit": 25,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

### 3. Get Single Paper

```bash
# Replace PAPER_ID with actual paper ID
curl -X GET http://localhost:3000/api/papers/PAPER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "paper": {
      "id": 1,
      "title": "Test Research Paper",
      ...
    }
  }
}
```

### 4. Update Paper

```bash
# Replace PAPER_ID with actual paper ID
curl -X PUT http://localhost:3000/api/papers/PAPER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "status": "Reading",
    "tags": ["machine-learning", "ai", "updated"]
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "paper": {
      "id": 1,
      "title": "Updated Title",
      "status": "Reading",
      ...
    }
  }
}
```

### 5. Search Papers

```bash
# Search by query
curl -X GET "http://localhost:3000/api/papers/search?q=test" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Search with filters
curl -X GET "http://localhost:3000/api/papers/search?q=test&status=Reading&tag=ai" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "papers": [...],
    "pagination": {
      "page": 1,
      "limit": 25,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### 6. Delete Paper

```bash
# Replace PAPER_ID with actual paper ID
curl -X DELETE http://localhost:3000/api/papers/PAPER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Paper deleted successfully"
}
```

### 7. Get Presigned Upload URL for PDF

```bash
# Get presigned URL for uploading a PDF
curl -X POST http://localhost:3000/api/papers/upload-url \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "paper.pdf",
    "size": 1024000,
    "contentType": "application/pdf",
    "paperId": 123
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://...presigned-url...",
    "s3Key": "papers/1/123/paper.pdf",
    "expiresIn": 3600
  }
}
```

### 8. Get Presigned Download URL for PDF

```bash
# Replace PAPER_ID with actual paper ID
curl -X GET http://localhost:3000/api/papers/PAPER_ID/pdf \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "pdfUrl": "papers/1/123/paper.pdf",
    "downloadUrl": "https://...presigned-url...",
    "expiresIn": 3600
  }
}
```

**Note:** To use S3 storage, you must configure S3 credentials in `.env`. See [S3_SETUP.md](./S3_SETUP.md) for instructions.

---

## 🧪 Testing Error Cases

### Invalid Email Format

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": {
    "message": "Validation error",
    "details": [
      {
        "field": "email",
        "message": "Invalid email address"
      }
    ]
  }
}
```

### Duplicate Email

```bash
# Register same email twice
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": {
    "message": "User with this email already exists"
  }
}
```

### Invalid Password

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "WrongPassword"
  }'
```

**Expected Response (401):**
```json
{
  "success": false,
  "error": {
    "message": "Invalid email or password"
  }
}
```

### Unauthenticated Request

```bash
curl -X GET http://localhost:3000/api/auth/me
```

**Expected Response (401):**
```json
{
  "success": false,
  "error": {
    "message": "Authentication required"
  }
}
```

---

## 🔧 Using Postman

1. **Import Collection:**
   - Create a new collection in Postman
   - Add requests for each endpoint

2. **Set Variables:**
   - Create environment variables:
     - `base_url`: `http://localhost:3000`
     - `access_token`: (will be set after login)
     - `refresh_token`: (will be set after login)

3. **Test Flow:**
   - Register → Save `access_token` and `refresh_token`
   - Login → Update tokens
   - Get Me → Use `Authorization: Bearer {{access_token}}`
   - Refresh → Use `{{refresh_token}}`
   - Logout → Use tokens

---

## 📝 Test Checklist

- [ ] Registration with valid data
- [ ] Registration with duplicate email
- [ ] Registration with invalid email format
- [ ] Registration with short password (< 8 chars)
- [ ] Login with valid credentials
- [ ] Login with invalid email
- [ ] Login with invalid password
- [ ] Get current user (authenticated)
- [ ] Get current user (unauthenticated) → should fail
- [ ] Refresh access token
- [ ] Refresh with invalid token → should fail
- [ ] Logout
- [ ] Refresh after logout → should fail
- [ ] Access protected route after token expiry

---

## 🐛 Troubleshooting

### "fetch is not defined"
- **Solution:** Use Node.js 18+ (has native fetch) or install `node-fetch`:
  ```bash
  npm install node-fetch
  ```

### "Connection refused"
- **Solution:** Make sure server is running:
  ```bash
  npm run dev
  ```

### "Database connection error"
- **Solution:** Check your `.env` file has correct `DATABASE_URL`

### "JWT secret not set"
- **Solution:** Make sure `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are set in `.env`

---

**Happy Testing! 🚀**


#!/bin/bash
# Quick API Test Script
# Tests authentication and S3 endpoints

API_URL="http://localhost:3000"
AUTH_URL="${API_URL}/api/auth"
PAPERS_URL="${API_URL}/api/papers"

echo "🚀 Testing citavErsa API"
echo "========================"
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
HEALTH=$(curl -s http://localhost:3000/health)
echo "   Response: $HEALTH"
echo ""

# Test 2: Register User
echo "2. Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "${AUTH_URL}/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-'$(date +%s)'@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }')

ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "   ❌ Registration failed"
  echo "   Response: $REGISTER_RESPONSE"
  exit 1
fi

echo "   ✅ User registered"
echo "   Access Token: ${ACCESS_TOKEN:0:50}..."
echo ""

# Test 3: Create Paper
echo "3. Creating test paper..."
PAPER_RESPONSE=$(curl -s -X POST "${PAPERS_URL}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Paper",
    "authors": ["Test Author"],
    "status": "To Read"
  }')

PAPER_ID=$(echo $PAPER_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$PAPER_ID" ]; then
  echo "   ❌ Failed to create paper"
  echo "   Response: $PAPER_RESPONSE"
  exit 1
fi

echo "   ✅ Paper created"
echo "   Paper ID: $PAPER_ID"
echo ""

# Test 4: Get Upload URL (S3)
echo "4. Testing S3 upload URL..."
UPLOAD_RESPONSE=$(curl -s -X POST "${PAPERS_URL}/upload-url" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.pdf",
    "size": 1024,
    "contentType": "application/pdf"
  }')

if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
  echo "   ✅ S3 upload URL generated"
  S3_KEY=$(echo $UPLOAD_RESPONSE | grep -o '"s3Key":"[^"]*' | cut -d'"' -f4)
  echo "   S3 Key: $S3_KEY"
else
  echo "   ❌ Failed to generate upload URL"
  echo "   Response: $UPLOAD_RESPONSE"
  echo ""
  echo "   Note: If you see 'S3 storage is not configured',"
  echo "   make sure S3 credentials are set in .env"
fi

echo ""
echo "✅ API tests complete!"
echo ""
echo "Access Token for further testing:"
echo "$ACCESS_TOKEN"



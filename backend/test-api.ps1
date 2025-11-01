# Quick API Test Script for PowerShell
# Tests authentication and basic endpoints

$API_URL = "http://localhost:3000"
$AUTH_URL = "$API_URL/api/auth"
$PAPERS_URL = "$API_URL/api/papers"

Write-Host "🚀 Testing citavErsa API" -ForegroundColor Cyan
Write-Host "========================`n"

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$API_URL/health" -Method Get
    Write-Host "   ✅ Server is healthy!" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Server not responding" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Register User
Write-Host "2. Registering test user..." -ForegroundColor Yellow
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$registerBody = @{
    email = "test-$timestamp@example.com"
    password = "TestPassword123!"
    name = "Test User"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$AUTH_URL/register" -Method Post -Body $registerBody -ContentType "application/json"
    $accessToken = $registerResponse.data.accessToken
    Write-Host "   ✅ User registered!" -ForegroundColor Green
    Write-Host "   Email: $($registerResponse.data.user.email)" -ForegroundColor Gray
    Write-Host "   Token: $($accessToken.Substring(0, 50))..." -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Registration failed" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: Create Paper
Write-Host "3. Creating test paper..." -ForegroundColor Yellow
$paperBody = @{
    title = "Test Paper"
    authors = @("Test Author")
    status = "To Read"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

try {
    $paperResponse = Invoke-RestMethod -Uri $PAPERS_URL -Method Post -Body $paperBody -Headers $headers
    $paperId = $paperResponse.data.paper.id
    Write-Host "   ✅ Paper created!" -ForegroundColor Green
    Write-Host "   Paper ID: $paperId" -ForegroundColor Gray
    Write-Host "   Title: $($paperResponse.data.paper.title)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Failed to create paper" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 4: Get Upload URL (S3)
Write-Host "4. Testing S3 upload URL..." -ForegroundColor Yellow
$uploadBody = @{
    filename = "test.pdf"
    size = 1024
    contentType = "application/pdf"
} | ConvertTo-Json

try {
    $uploadResponse = Invoke-RestMethod -Uri "$PAPERS_URL/upload-url" -Method Post -Body $uploadBody -Headers $headers
    Write-Host "   ✅ S3 upload URL generated!" -ForegroundColor Green
    Write-Host "   S3 Key: $($uploadResponse.data.s3Key)" -ForegroundColor Gray
    Write-Host "   Upload URL: $($uploadResponse.data.uploadUrl.Substring(0, 80))..." -ForegroundColor Gray
} catch {
    $errorMsg = $_.Exception.Response.StatusCode.value__
    if ($errorMsg -eq 503) {
        Write-Host "   ⚠️  S3 not configured (503 Service Unavailable)" -ForegroundColor Yellow
        Write-Host "   Note: Configure S3 credentials in .env to test S3 uploads" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Failed to generate upload URL" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ API tests complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Access Token for further testing:" -ForegroundColor Cyan
Write-Host $accessToken -ForegroundColor Gray



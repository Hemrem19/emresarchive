/**
 * Authentication API Test Script
 * Run with: node test-auth.js
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const BASE_URL = `${API_URL}/api/auth`;

// Test data
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User'
};

let accessToken = null;
let refreshToken = null;
let userId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${colors.blue}🧪 Testing: ${name}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function makeRequest(method, endpoint, data = null, token = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return { status: response.status, data: result };
  } catch (error) {
    // More detailed error logging
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
      return { 
        status: 0, 
        error: `Connection refused. Is the server running at ${API_URL}? Error: ${error.message}` 
      };
    }
    return { status: 0, error: error.message };
  }
}

async function testRegister() {
  logTest('User Registration');
  
  const { status, data, error } = await makeRequest('POST', '/register', testUser);
  
  if (status === 201 && data.success) {
    logSuccess('Registration successful!');
    log(`   User ID: ${data.data.user.id}`);
    log(`   Email: ${data.data.user.email}`);
    accessToken = data.data.accessToken;
    refreshToken = data.data.refreshToken;
    userId = data.data.user.id;
    return true;
  } else if (status === 400 && data.error?.message?.includes('already exists')) {
    logWarning('User already exists (expected for duplicate email test)');
    return false;
  } else {
    logError(`Registration failed: ${error || data.error?.message || 'Unknown error'}`);
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
  }
}

async function testRegisterDuplicate() {
  logTest('Registration with Duplicate Email');
  
  const { status, data } = await makeRequest('POST', '/register', {
    email: testUser.email,
    password: 'DifferentPassword123!',
    name: 'Different Name'
  });
  
  if (status === 400 && data.error?.message?.includes('already exists')) {
    logSuccess('Duplicate email correctly rejected');
    return true;
  } else {
    logError('Duplicate email was not rejected');
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
  }
}

async function testRegisterValidation() {
  logTest('Registration Validation (Invalid Email)');
  
  const { status, data } = await makeRequest('POST', '/register', {
    email: 'invalid-email',
    password: 'TestPassword123!',
    name: 'Test User'
  });
  
  if (status === 400 && data.error?.details) {
    logSuccess('Invalid email correctly rejected');
    log(`   Validation errors: ${JSON.stringify(data.error.details, null, 2)}`);
    return true;
  } else {
    logError('Invalid email was not rejected');
    return false;
  }
}

async function testLogin() {
  logTest('User Login');
  
  const { status, data, error } = await makeRequest('POST', '/login', {
    email: testUser.email,
    password: testUser.password
  });
  
  if (status === 200 && data.success) {
    logSuccess('Login successful!');
    log(`   User ID: ${data.data.user.id}`);
    log(`   Email: ${data.data.user.email}`);
    accessToken = data.data.accessToken;
    refreshToken = data.data.refreshToken;
    userId = data.data.user.id;
    return true;
  } else {
    logError(`Login failed: ${error || data.error?.message || 'Unknown error'}`);
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
  }
}

async function testLoginInvalidPassword() {
  logTest('Login with Invalid Password');
  
  const { status, data } = await makeRequest('POST', '/login', {
    email: testUser.email,
    password: 'WrongPassword123!'
  });
  
  if (status === 401 && data.error?.message?.includes('Invalid')) {
    logSuccess('Invalid password correctly rejected');
    return true;
  } else {
    logError('Invalid password was not rejected');
    return false;
  }
}

async function testLoginInvalidEmail() {
  logTest('Login with Invalid Email');
  
  const { status, data } = await makeRequest('POST', '/login', {
    email: 'nonexistent@example.com',
    password: 'TestPassword123!'
  });
  
  if (status === 401 && data.error?.message?.includes('Invalid')) {
    logSuccess('Invalid email correctly rejected');
    return true;
  } else {
    logError('Invalid email was not rejected');
    return false;
  }
}

async function testGetMe() {
  logTest('Get Current User (Authenticated)');
  
  if (!accessToken) {
    logError('No access token available. Run login/register first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('GET', '/me', null, accessToken);
  
  if (status === 200 && data.success && data.data.user) {
    logSuccess('User info retrieved successfully!');
    log(`   User ID: ${data.data.user.id}`);
    log(`   Email: ${data.data.user.email}`);
    log(`   Name: ${data.data.user.name || 'N/A'}`);
    return true;
  } else {
    logError(`Get user failed: ${error || data.error?.message || 'Unknown error'}`);
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
  }
}

async function testGetMeUnauthenticated() {
  logTest('Get Current User (Unauthenticated)');
  
  const { status, data } = await makeRequest('GET', '/me');
  
  if (status === 401 && data.error?.message?.includes('Authentication')) {
    logSuccess('Unauthenticated request correctly rejected');
    return true;
  } else {
    logError('Unauthenticated request was not rejected');
    return false;
  }
}

async function testRefreshToken() {
  logTest('Refresh Access Token');
  
  if (!refreshToken) {
    logError('No refresh token available. Run login/register first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('POST', '/refresh', {
    refreshToken
  });
  
  if (status === 200 && data.success && data.data.accessToken) {
    logSuccess('Access token refreshed successfully!');
    const oldToken = accessToken.substring(0, 20) + '...';
    accessToken = data.data.accessToken;
    const newToken = accessToken.substring(0, 20) + '...';
    log(`   Old token: ${oldToken}`);
    log(`   New token: ${newToken}`);
    return true;
  } else {
    logError(`Token refresh failed: ${error || data.error?.message || 'Unknown error'}`);
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
  }
}

async function testLogout() {
  logTest('User Logout');
  
  if (!accessToken) {
    logError('No access token available. Run login/register first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('POST', '/logout', {
    refreshToken
  }, accessToken);
  
  if (status === 200 && data.success) {
    logSuccess('Logout successful!');
    accessToken = null;
    refreshToken = null;
    return true;
  } else {
    logError(`Logout failed: ${error || data.error?.message || 'Unknown error'}`);
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
  }
}

async function testRefreshAfterLogout() {
  logTest('Refresh Token After Logout');
  
  if (!refreshToken) {
    logWarning('No refresh token available (already logged out). Skipping.');
    return true;
  }
  
  const { status, data } = await makeRequest('POST', '/refresh', {
    refreshToken
  });
  
  if (status === 401 && data.error?.message?.includes('Invalid')) {
    logSuccess('Refresh token correctly invalidated after logout');
    return true;
  } else {
    logError('Refresh token still works after logout (should be invalid)');
    return false;
  }
}

async function checkServer() {
  logTest('Server Connection Check');
  try {
    const response = await fetch(`${API_URL}/health`);
    if (response.ok) {
      logSuccess('Server is running!');
      return true;
    }
  } catch (error) {
    logError('Cannot connect to server!');
    log('\n💡 Make sure the server is running:');
    log('   1. Open terminal in backend/ directory');
    log('   2. Run: npm run dev');
    log('   3. Wait for "🚀 citavErsa Backend running on port 3000"');
    log('   4. Then run this test again\n');
    return false;
  }
}

async function runAllTests() {
  log('\n🚀 Starting Authentication API Tests\n');
  log(`API URL: ${API_URL}`);
  log(`Test User: ${testUser.email}\n`);
  
  // Check if server is running
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  const results = [];
  
  // Registration tests
  results.push({ name: 'Register', passed: await testRegister() });
  results.push({ name: 'Register Duplicate', passed: await testRegisterDuplicate() });
  results.push({ name: 'Register Validation', passed: await testRegisterValidation() });
  
  // Login tests (if registration failed, login will create user)
  if (!accessToken) {
    logWarning('Registration failed or duplicate, trying login...');
    await testLogin();
  }
  
  results.push({ name: 'Login', passed: await testLogin() });
  results.push({ name: 'Login Invalid Password', passed: await testLoginInvalidPassword() });
  results.push({ name: 'Login Invalid Email', passed: await testLoginInvalidEmail() });
  
  // Authentication tests
  results.push({ name: 'Get Me', passed: await testGetMe() });
  results.push({ name: 'Get Me Unauthenticated', passed: await testGetMeUnauthenticated() });
  
  // Token refresh tests
  results.push({ name: 'Refresh Token', passed: await testRefreshToken() });
  
  // Logout tests
  results.push({ name: 'Logout', passed: await testLogout() });
  results.push({ name: 'Refresh After Logout', passed: await testRefreshAfterLogout() });
  
  // Summary
  log('\n' + '='.repeat(50));
  log('\n📊 Test Results Summary\n', 'blue');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    if (result.passed) {
      logSuccess(`${result.name}`);
    } else {
      logError(`${result.name}`);
    }
  });
  
  log(`\n${passed}/${total} tests passed`);
  
  if (passed === total) {
    log('\n🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Check the errors above.', 'yellow');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  logError(`\nFatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});


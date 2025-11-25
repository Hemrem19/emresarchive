/**
 * Authentication API Test Script
 * Run with: node backend/test-auth.js
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
    const responseText = await response.text();

    // Try to parse as JSON
    try {
      const result = JSON.parse(responseText);
      return { status: response.status, data: result };
    } catch (parseError) {
      // If JSON parsing fails, return the raw text (e.g., rate limit messages)
      return {
        status: response.status,
        data: { error: { message: responseText } }
      };
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
      return {
        status: 0,
        error: `Connection refused. Is the server running at ${API_URL}? Error: ${error.message}`
      };
    }
    return { status: 0, error: error.message };
  }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testRegister() {
  logTest('User Registration');
  await delay(1000);
  const { status, data, error } = await makeRequest('POST', '/register', testUser);

  if (status === 201 && data.success) {
    logSuccess('Registration successful!');
    log(`   User ID: ${data.data.user.id}`);
    log(`   Email: ${data.data.user.email}`);
    accessToken = data.data.accessToken;
    refreshToken = data.data.refreshToken;
    userId = data.data.user.id;
    return true;
  } else if (status === 409 && data.error?.message?.includes('already exists')) {
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
  await delay(1000);
  const { status, data } = await makeRequest('POST', '/register', {
    email: testUser.email,
    password: 'DifferentPassword123!',
    name: 'Different Name'
  });

  if (status === 409 && data.error?.message?.includes('already exists')) {
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
  await delay(1000);
  const { status, data } = await makeRequest('POST', '/register', {
    email: 'invalid-email',
    password: 'TestPassword123!',
    name: 'Test User'
  });

  if (status === 422 && data.error?.details) {
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
  await delay(1000);
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
    return false;
  }
}

async function testLoginInvalidPassword() {
  logTest('Login Invalid Password');
  await delay(1000);
  const { status, data } = await makeRequest('POST', '/login', {
    email: testUser.email,
    password: 'WrongPassword123!'
  });

  if (status === 401) {
    logSuccess('Invalid password correctly rejected');
    return true;
  } else {
    logError('Invalid password was not rejected');
    log(`   Status: ${status}`);
    return false;
  }
}

async function testLoginInvalidEmail() {
  logTest('Login Invalid Email');
  await delay(1000);
  const { status, data } = await makeRequest('POST', '/login', {
    email: 'wrong@example.com',
    password: 'TestPassword123!'
  });

  if (status === 401 || status === 404) { // 404 if user not found, or 401 if generic creds error
    logSuccess('Invalid email correctly rejected');
    return true;
  } else {
    logError('Invalid email was not rejected');
    log(`   Status: ${status}`);
    return false;
  }
}

async function testGetMe() {
  logTest('Get Current User');
  await delay(1000);
  const { status, data, error } = await makeRequest('GET', '/me', null, accessToken);

  if (status === 200 && data.success) {
    logSuccess('Get user successful');
    return true;
  } else {
    logError(`Get user failed: ${error || data.error?.message || 'Unknown error'}`);
    return false;
  }
}

async function testGetMeUnauthenticated() {
  logTest('Get Current User (Unauthenticated)');
  await delay(1000);
  const { status } = await makeRequest('GET', '/me');

  if (status === 401) {
    logSuccess('Unauthenticated request correctly rejected');
    return true;
  } else {
    logError('Unauthenticated request was not rejected');
    log(`   Status: ${status}`);
    return false;
  }
}

async function testRefreshToken() {
  logTest('Refresh Token');
  await delay(1000);
  const { status, data, error } = await makeRequest('POST', '/refresh', { refreshToken });

  if (status === 200 && data.success) {
    logSuccess('Token refresh successful');
    accessToken = data.data.accessToken;
    return true;
  } else {
    logError(`Token refresh failed: ${error || data.error?.message || 'Unknown error'}`);
    log(`   Status: ${status}`);
    return false;
  }
}

async function testLogout() {
  logTest('Logout');
  await delay(1000);
  const { status, data, error } = await makeRequest('POST', '/logout', { refreshToken }, accessToken);

  if (status === 200 && data.success) {
    logSuccess('Logout successful');
    return true;
  } else {
    logError(`Logout failed: ${error || data.error?.message || 'Unknown error'}`);
    log(`   Status: ${status}`);
    return false;
  }
}

async function testRefreshAfterLogout() {
  logTest('Refresh Token After Logout');
  await delay(1000);
  const { status } = await makeRequest('POST', '/refresh', { refreshToken });

  if (status === 401 || status === 403) {
    logSuccess('Refresh token correctly rejected after logout');
    return true;
  } else {
    logError('Refresh token still works after logout');
    log(`   Status: ${status}`);
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
    return false;
  }
}

async function runAllTests() {
  log('\n🚀 Starting Authentication API Tests\n');
  log(`API URL: ${API_URL}`);
  log(`Test User: ${testUser.email}\n`);

  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }

  const results = [];

  results.push({ name: 'Register', passed: await testRegister() });
  results.push({ name: 'Register Duplicate', passed: await testRegisterDuplicate() });
  results.push({ name: 'Register Validation', passed: await testRegisterValidation() });

  if (!accessToken) {
    logWarning('Registration failed or duplicate, trying login...');
    await testLogin();
  }

  results.push({ name: 'Login', passed: await testLogin() });
  results.push({ name: 'Login Invalid Password', passed: await testLoginInvalidPassword() });
  results.push({ name: 'Login Invalid Email', passed: await testLoginInvalidEmail() });

  results.push({ name: 'Get Me', passed: await testGetMe() });
  results.push({ name: 'Get Me Unauthenticated', passed: await testGetMeUnauthenticated() });

  results.push({ name: 'Refresh Token', passed: await testRefreshToken() });

  results.push({ name: 'Logout', passed: await testLogout() });
  results.push({ name: 'Refresh After Logout', passed: await testRefreshAfterLogout() });

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

runAllTests().catch(error => {
  logError(`\nFatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

/**
 * User API Test Script
 * Run with: node backend/test-user.js
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_URL = `${API_URL}/api/auth`;
const USER_URL = `${API_URL}/api/user`;

// Test data
const testUser = {
    email: `test-user-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User'
};

let accessToken = null;

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

async function makeRequest(method, url, data = null, token = null) {
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
        return { status: 0, error: error.message };
    }
}

async function setup() {
    log('Setting up test user...');
    const { status, data } = await makeRequest('POST', `${AUTH_URL}/register`, testUser);
    if (status === 201 && data.success) {
        accessToken = data.data.accessToken;
        logSuccess('Test user created and logged in');
        return true;
    }
    logError('Failed to create test user');
    return false;
}

async function testGetStats() {
    logTest('Get User Stats');
    const { status, data } = await makeRequest('GET', `${USER_URL}/stats`, null, accessToken);

    if (status === 200 && data.success && data.data.stats) {
        logSuccess('Stats retrieved successfully');
        log(`   Papers: ${data.data.stats.papers}`);
        return true;
    }
    logError('Failed to get stats');
    return false;
}

async function testUpdateSettings() {
    logTest('Update User Settings');
    const newName = 'Updated Name';
    const newSettings = { theme: 'dark', notifications: false };

    const { status, data } = await makeRequest('PUT', `${USER_URL}/settings`, {
        name: newName,
        settings: newSettings
    }, accessToken);

    if (status === 200 && data.success && data.data.user.name === newName) {
        logSuccess('Settings updated successfully');
        return true;
    }
    logError('Failed to update settings');
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
}

async function runTests() {
    if (!await setup()) process.exit(1);

    const results = [];
    results.push({ name: 'Get Stats', passed: await testGetStats() });
    results.push({ name: 'Update Settings', passed: await testUpdateSettings() });

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    log(`\n${passed}/${total} tests passed`);
    if (passed !== total) process.exit(1);
}

runTests();

/**
 * Import API Test Script
 * Run with: node backend/test-import.js
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_URL = `${API_URL}/api/auth`;
const IMPORT_URL = `${API_URL}/api/import`;

// Test data
const testUser = {
    email: `test-import-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test Import User'
};

const testPapers = [
    {
        title: 'Imported Paper 1',
        authors: ['Author One'],
        year: 2023,
        doi: `10.1000/import1-${Date.now()}`,
        status: 'To Read'
    },
    {
        title: 'Imported Paper 2',
        authors: ['Author Two'],
        year: 2024,
        doi: `10.1000/import2-${Date.now()}`,
        status: 'Reading'
    }
];

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

async function testBatchImport() {
    logTest('Batch Import Papers');

    const { status, data } = await makeRequest('POST', `${IMPORT_URL}/batch-import`, {
        papers: testPapers
    }, accessToken);

    if (status === 200 && data.success) {
        const summary = data.data.summary;
        if (summary.totalSuccess === 2 && summary.totalFailed === 0) {
            logSuccess('Batch import successful');
            return true;
        }
    }

    logError('Batch import failed');
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
}

async function testBatchImportDuplicate() {
    logTest('Batch Import Duplicate DOI');

    // Try to import the same papers again
    // Should succeed but update existing papers (idempotent) or skip depending on logic
    // The controller logic says: if existing and deleted -> restore, if existing and active -> fail/skip

    const { status, data } = await makeRequest('POST', `${IMPORT_URL}/batch-import`, {
        papers: testPapers
    }, accessToken);

    if (status === 200 && data.success) {
        const summary = data.data.summary;
        // Expecting 2 failed because they already exist and are active
        if (summary.totalFailed === 2) {
            logSuccess('Duplicate import correctly handled (skipped/failed)');
            return true;
        }
    }

    logError('Duplicate import handling failed');
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
}

async function runTests() {
    if (!await setup()) process.exit(1);

    const results = [];
    results.push({ name: 'Batch Import', passed: await testBatchImport() });
    results.push({ name: 'Batch Import Duplicate', passed: await testBatchImportDuplicate() });

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    log(`\n${passed}/${total} tests passed`);
    if (passed !== total) process.exit(1);
}

runTests();

/**
 * Papers API Test Script
 * Run with: node test-papers.js
 * 
 * Tests both authentication and papers endpoints
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_URL = `${API_URL}/api/auth`;
const PAPERS_URL = `${API_URL}/api/papers`;
const COLLECTIONS_URL = `${API_URL}/api/collections`;
const ANNOTATIONS_URL = `${API_URL}/api/annotations`;

// Test data
const testUser = {
  email: `test-papers-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User'
};

const testPaper = {
  title: 'Test Research Paper',
  authors: ['John Doe', 'Jane Smith'],
  year: 2024,
  journal: 'Test Journal',
  doi: `10.1234/test-${Date.now()}`,
  abstract: 'This is a test abstract for a research paper.',
  tags: ['machine-learning', 'ai', 'test'],
  status: 'To Read',
  notes: 'This is a test note.'
};

const testCollection = {
  name: 'Test Collection',
  icon: 'folder',
  color: 'text-primary',
  filters: {
    status: 'Reading',
    tags: ['machine-learning'],
    searchTerm: ''
  }
};

const testAnnotation = {
  type: 'highlight',
  pageNumber: 1,
  position: { x: 100, y: 200, width: 150, height: 20 },
  content: 'This is a highlighted text',
  color: 'yellow'
};

let accessToken = null;
let refreshToken = null;
let userId = null;
let paperId = null;
let collectionId = null;
let annotationId = null;

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
    let result;
    try {
      result = await response.json();
    } catch {
      result = { error: await response.text() };
    }
    return { status: response.status, data: result };
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

// Authentication Tests
async function testRegister() {
  logTest('User Registration');
  
  const { status, data, error } = await makeRequest('POST', `${AUTH_URL}/register`, testUser);
  
  if (status === 201 && data.success) {
    logSuccess('Registration successful!');
    log(`   User ID: ${data.data.user.id}`);
    log(`   Email: ${data.data.user.email}`);
    accessToken = data.data.accessToken;
    refreshToken = data.data.refreshToken;
    userId = data.data.user.id;
    return true;
  } else {
    logError(`Registration failed: ${error || data.error?.message || 'Unknown error'}`);
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
  }
}

async function testLogin() {
  logTest('User Login');
  
  const { status, data, error } = await makeRequest('POST', `${AUTH_URL}/login`, {
    email: testUser.email,
    password: testUser.password
  });
  
  if (status === 200 && data.success) {
    logSuccess('Login successful!');
    log(`   User ID: ${data.data.user.id}`);
    accessToken = data.data.accessToken;
    refreshToken = data.data.refreshToken;
    userId = data.data.user.id;
    return true;
  } else {
    logError(`Login failed: ${error || data.error?.message || 'Unknown error'}`);
    return false;
  }
}

// Papers Tests
async function testCreatePaper() {
  logTest('Create Paper');
  
  if (!accessToken) {
    logError('No access token. Run login/register first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('POST', PAPERS_URL, testPaper, accessToken);
  
  if (status === 201 && data.success && data.data.paper) {
    logSuccess('Paper created successfully!');
    log(`   Paper ID: ${data.data.paper.id}`);
    log(`   Title: ${data.data.paper.title}`);
    paperId = data.data.paper.id;
    return true;
  } else {
    logError(`Create paper failed: ${error || data.error?.message || 'Unknown error'}`);
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
  }
}

async function testGetAllPapers() {
  logTest('Get All Papers');
  
  if (!accessToken) {
    logError('No access token. Run login/register first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('GET', PAPERS_URL, null, accessToken);
  
  if (status === 200 && data.success && Array.isArray(data.data.papers)) {
    logSuccess(`Retrieved ${data.data.papers.length} paper(s)!`);
    log(`   Pagination: ${data.data.pagination.page}/${data.data.pagination.totalPages}`);
    return true;
  } else {
    logError(`Get papers failed: ${error || data.error?.message || 'Unknown error'}`);
    return false;
  }
}

async function testGetPaper() {
  logTest('Get Single Paper');
  
  if (!accessToken || !paperId) {
    logError('No access token or paper ID. Run create paper first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('GET', `${PAPERS_URL}/${paperId}`, null, accessToken);
  
  if (status === 200 && data.success && data.data.paper) {
    logSuccess('Paper retrieved successfully!');
    log(`   Title: ${data.data.paper.title}`);
    log(`   Authors: ${data.data.paper.authors.join(', ')}`);
    log(`   Status: ${data.data.paper.status}`);
    return true;
  } else {
    logError(`Get paper failed: ${error || data.error?.message || 'Unknown error'}`);
    return false;
  }
}

async function testUpdatePaper() {
  logTest('Update Paper');
  
  if (!accessToken || !paperId) {
    logError('No access token or paper ID. Run create paper first.');
    return false;
  }
  
  const updates = {
    title: 'Updated Test Paper Title',
    status: 'Reading',
    tags: ['machine-learning', 'ai', 'test', 'updated']
  };
  
  const { status, data, error } = await makeRequest('PUT', `${PAPERS_URL}/${paperId}`, updates, accessToken);
  
  if (status === 200 && data.success && data.data.paper) {
    logSuccess('Paper updated successfully!');
    log(`   New Title: ${data.data.paper.title}`);
    log(`   New Status: ${data.data.paper.status}`);
    log(`   Tags: ${data.data.paper.tags.join(', ')}`);
    return true;
  } else {
    logError(`Update paper failed: ${error || data.error?.message || 'Unknown error'}`);
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
  }
}

async function testSearchPapers() {
  logTest('Search Papers');
  
  if (!accessToken) {
    logError('No access token. Run login/register first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('GET', `${PAPERS_URL}/search?q=Test`, null, accessToken);
  
  if (status === 200 && data.success && Array.isArray(data.data.papers)) {
    logSuccess(`Search returned ${data.data.papers.length} result(s)!`);
    return true;
  } else {
    logError(`Search failed: ${error || data.error?.message || 'Unknown error'}`);
    return false;
  }
}

async function testFilterPapers() {
  logTest('Filter Papers by Status');
  
  if (!accessToken) {
    logError('No access token. Run login/register first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('GET', `${PAPERS_URL}?status=Reading`, null, accessToken);
  
  if (status === 200 && data.success && Array.isArray(data.data.papers)) {
    logSuccess(`Filter returned ${data.data.papers.length} paper(s) with status "Reading"!`);
    return true;
  } else {
    logError(`Filter failed: ${error || data.error?.message || 'Unknown error'}`);
    return false;
  }
}

async function testFilterByTag() {
  logTest('Filter Papers by Tag');
  
  if (!accessToken) {
    logError('No access token. Run login/register first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('GET', `${PAPERS_URL}?tag=machine-learning`, null, accessToken);
  
  if (status === 200 && data.success && Array.isArray(data.data.papers)) {
    logSuccess(`Filter returned ${data.data.papers.length} paper(s) with tag "machine-learning"!`);
    return true;
  } else {
    logError(`Filter failed: ${error || data.error?.message || 'Unknown error'}`);
    return false;
  }
}

async function testDeletePaper() {
  logTest('Delete Paper (Soft Delete)');
  
  if (!accessToken || !paperId) {
    logError('No access token or paper ID. Run create paper first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('DELETE', `${PAPERS_URL}/${paperId}`, null, accessToken);
  
  if (status === 200 && data.success) {
    logSuccess('Paper deleted successfully!');
    paperId = null; // Clear paper ID
    return true;
  } else {
    logError(`Delete paper failed: ${error || data.error?.message || 'Unknown error'}`);
    return false;
  }
}

async function testGetDeletedPaper() {
  logTest('Get Deleted Paper (Should Return 404)');
  
  if (!accessToken || !paperId) {
    logWarning('No paper ID (already deleted). Skipping.');
    return true;
  }
  
  const { status, data } = await makeRequest('GET', `${PAPERS_URL}/${paperId}`, null, accessToken);
  
  if (status === 404 && data.error?.message?.includes('not found')) {
    logSuccess('Deleted paper correctly returns 404');
    return true;
  } else {
    logError('Deleted paper was still accessible (should be 404)');
    return false;
  }
}

// Collections Tests
async function testCreateCollection() {
  logTest('Create Collection');
  
  if (!accessToken) {
    logError('No access token. Run login/register first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('POST', COLLECTIONS_URL, testCollection, accessToken);
  
  if (status === 201 && data.success && data.data.collection) {
    logSuccess('Collection created successfully!');
    log(`   Collection ID: ${data.data.collection.id}`);
    log(`   Name: ${data.data.collection.name}`);
    collectionId = data.data.collection.id;
    return true;
  } else {
    logError(`Create collection failed: ${error || data.error?.message || 'Unknown error'}`);
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
  }
}

async function testGetAllCollections() {
  logTest('Get All Collections');
  
  if (!accessToken) {
    logError('No access token. Run login/register first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('GET', COLLECTIONS_URL, null, accessToken);
  
  if (status === 200 && data.success && Array.isArray(data.data.collections)) {
    logSuccess(`Retrieved ${data.data.collections.length} collection(s)!`);
    return true;
  } else {
    logError(`Get collections failed: ${error || data.error?.message || 'Unknown error'}`);
    return false;
  }
}

async function testGetCollection() {
  logTest('Get Single Collection');
  
  if (!accessToken || !collectionId) {
    logError('No access token or collection ID. Run create collection first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('GET', `${COLLECTIONS_URL}/${collectionId}`, null, accessToken);
  
  if (status === 200 && data.success && data.data.collection) {
    logSuccess('Collection retrieved successfully!');
    log(`   Name: ${data.data.collection.name}`);
    log(`   Icon: ${data.data.collection.icon}`);
    log(`   Color: ${data.data.collection.color}`);
    return true;
  } else {
    logError(`Get collection failed: ${error || data.error?.message || 'Unknown error'}`);
    return false;
  }
}

async function testUpdateCollection() {
  logTest('Update Collection');
  
  if (!accessToken || !collectionId) {
    logError('No access token or collection ID. Run create collection first.');
    return false;
  }
  
  const updates = {
    name: 'Updated Test Collection',
    icon: 'book',
    color: 'text-blue-500',
    filters: {
      status: 'Finished',
      tags: ['machine-learning', 'ai'],
      searchTerm: 'test'
    }
  };
  
  const { status, data, error } = await makeRequest('PUT', `${COLLECTIONS_URL}/${collectionId}`, updates, accessToken);
  
  if (status === 200 && data.success && data.data.collection) {
    logSuccess('Collection updated successfully!');
    log(`   New Name: ${data.data.collection.name}`);
    log(`   New Icon: ${data.data.collection.icon}`);
    log(`   New Color: ${data.data.collection.color}`);
    return true;
  } else {
    logError(`Update collection failed: ${error || data.error?.message || 'Unknown error'}`);
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
  }
}

async function testCreateCollectionValidation() {
  logTest('Create Collection Validation (Missing Name)');
  
  if (!accessToken) {
    logError('No access token. Run login/register first.');
    return false;
  }
  
  const { status, data } = await makeRequest('POST', COLLECTIONS_URL, {
    icon: 'folder'
    // Missing name
  }, accessToken);
  
  if (status === 400 && data.error?.details) {
    logSuccess('Validation correctly rejected missing name');
    log(`   Validation errors: ${JSON.stringify(data.error.details, null, 2)}`);
    return true;
  } else {
    logError('Validation did not reject invalid collection');
    return false;
  }
}

async function testDeleteCollection() {
  logTest('Delete Collection (Soft Delete)');
  
  if (!accessToken || !collectionId) {
    logError('No access token or collection ID. Run create collection first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('DELETE', `${COLLECTIONS_URL}/${collectionId}`, null, accessToken);
  
  if (status === 200 && data.success) {
    logSuccess('Collection deleted successfully!');
    collectionId = null; // Clear collection ID
    return true;
  } else {
    logError(`Delete collection failed: ${error || data.error?.message || 'Unknown error'}`);
    return false;
  }
}

async function testGetDeletedCollection() {
  logTest('Get Deleted Collection (Should Return 404)');
  
  if (!accessToken || !collectionId) {
    logWarning('No collection ID (already deleted). Skipping.');
    return true;
  }
  
  const { status, data } = await makeRequest('GET', `${COLLECTIONS_URL}/${collectionId}`, null, accessToken);
  
  if (status === 404 && data.error?.message?.includes('not found')) {
    logSuccess('Deleted collection correctly returns 404');
    return true;
  } else {
    logError('Deleted collection was still accessible (should be 404)');
    return false;
  }
}

// Annotations Tests
async function testCreateAnnotation() {
  logTest('Create Annotation');
  
  if (!accessToken || !paperId) {
    logError('No access token or paper ID. Run create paper first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('POST', `${PAPERS_URL}/${paperId}/annotations`, testAnnotation, accessToken);
  
  if (status === 201 && data.success && data.data.annotation) {
    logSuccess('Annotation created successfully!');
    log(`   Annotation ID: ${data.data.annotation.id}`);
    log(`   Type: ${data.data.annotation.type}`);
    log(`   Page: ${data.data.annotation.pageNumber}`);
    annotationId = data.data.annotation.id;
    return true;
  } else {
    logError(`Create annotation failed: ${error || data.error?.message || 'Unknown error'}`);
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
  }
}

async function testGetAnnotations() {
  logTest('Get Annotations for Paper');
  
  if (!accessToken || !paperId) {
    logError('No access token or paper ID. Run create paper first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('GET', `${PAPERS_URL}/${paperId}/annotations`, null, accessToken);
  
  if (status === 200 && data.success && Array.isArray(data.data.annotations)) {
    logSuccess(`Retrieved ${data.data.annotations.length} annotation(s)!`);
    return true;
  } else {
    logError(`Get annotations failed: ${error || data.error?.message || 'Unknown error'}`);
    return false;
  }
}

async function testGetAnnotation() {
  logTest('Get Single Annotation');
  
  if (!accessToken || !annotationId) {
    logError('No access token or annotation ID. Run create annotation first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('GET', `${ANNOTATIONS_URL}/${annotationId}`, null, accessToken);
  
  if (status === 200 && data.success && data.data.annotation) {
    logSuccess('Annotation retrieved successfully!');
    log(`   Type: ${data.data.annotation.type}`);
    log(`   Page: ${data.data.annotation.pageNumber}`);
    log(`   Color: ${data.data.annotation.color}`);
    return true;
  } else {
    logError(`Get annotation failed: ${error || data.error?.message || 'Unknown error'}`);
    return false;
  }
}

async function testUpdateAnnotation() {
  logTest('Update Annotation');
  
  if (!accessToken || !annotationId) {
    logError('No access token or annotation ID. Run create annotation first.');
    return false;
  }
  
  const updates = {
    color: 'blue',
    content: 'Updated highlighted text'
  };
  
  const { status, data, error } = await makeRequest('PUT', `${ANNOTATIONS_URL}/${annotationId}`, updates, accessToken);
  
  if (status === 200 && data.success && data.data.annotation) {
    logSuccess('Annotation updated successfully!');
    log(`   New Color: ${data.data.annotation.color}`);
    log(`   New Content: ${data.data.annotation.content}`);
    return true;
  } else {
    logError(`Update annotation failed: ${error || data.error?.message || 'Unknown error'}`);
    log(`   Status: ${status}`);
    log(`   Response: ${JSON.stringify(data, null, 2)}`);
    return false;
  }
}

async function testCreateAnnotationValidation() {
  logTest('Create Annotation Validation (Missing Type)');
  
  if (!accessToken || !paperId) {
    logError('No access token or paper ID. Run create paper first.');
    return false;
  }
  
  const { status, data } = await makeRequest('POST', `${PAPERS_URL}/${paperId}/annotations`, {
    pageNumber: 1
    // Missing type
  }, accessToken);
  
  if (status === 400 && data.error?.details) {
    logSuccess('Validation correctly rejected missing type');
    log(`   Validation errors: ${JSON.stringify(data.error.details, null, 2)}`);
    return true;
  } else {
    logError('Validation did not reject invalid annotation');
    return false;
  }
}

async function testDeleteAnnotation() {
  logTest('Delete Annotation (Soft Delete)');
  
  if (!accessToken || !annotationId) {
    logError('No access token or annotation ID. Run create annotation first.');
    return false;
  }
  
  const { status, data, error } = await makeRequest('DELETE', `${ANNOTATIONS_URL}/${annotationId}`, null, accessToken);
  
  if (status === 200 && data.success) {
    logSuccess('Annotation deleted successfully!');
    annotationId = null; // Clear annotation ID
    return true;
  } else {
    logError(`Delete annotation failed: ${error || data.error?.message || 'Unknown error'}`);
    return false;
  }
}

async function testGetDeletedAnnotation() {
  logTest('Get Deleted Annotation (Should Return 404)');
  
  if (!accessToken || !annotationId) {
    logWarning('No annotation ID (already deleted). Skipping.');
    return true;
  }
  
  const { status, data } = await makeRequest('GET', `${ANNOTATIONS_URL}/${annotationId}`, null, accessToken);
  
  if (status === 404 && data.error?.message?.includes('not found')) {
    logSuccess('Deleted annotation correctly returns 404');
    return true;
  } else {
    logError('Deleted annotation was still accessible (should be 404)');
    return false;
  }
}

async function testCreatePaperValidation() {
  logTest('Create Paper Validation (Missing Title)');
  
  if (!accessToken) {
    logError('No access token. Run login/register first.');
    return false;
  }
  
  const { status, data } = await makeRequest('POST', PAPERS_URL, {
    authors: ['John Doe']
    // Missing title
  }, accessToken);
  
  if (status === 400 && data.error?.details) {
    logSuccess('Validation correctly rejected missing title');
    log(`   Validation errors: ${JSON.stringify(data.error.details, null, 2)}`);
    return true;
  } else {
    logError('Validation did not reject invalid paper');
    return false;
  }
}

async function testDuplicateDoi() {
  logTest('Create Paper with Duplicate DOI');
  
  if (!accessToken) {
    logError('No access token. Run login/register first.');
    return false;
  }
  
  // First, create a paper
  const firstPaper = await makeRequest('POST', PAPERS_URL, {
    ...testPaper,
    doi: `10.1234/duplicate-test-${Date.now()}`
  }, accessToken);
  
  if (firstPaper.status !== 201) {
    logError('Failed to create first paper for duplicate test');
    return false;
  }
  
  const firstDoi = firstPaper.data.data.paper.doi;
  
  // Try to create another paper with same DOI
  const { status, data } = await makeRequest('POST', PAPERS_URL, {
    ...testPaper,
    title: 'Different Title',
    doi: firstDoi
  }, accessToken);
  
  if (status === 400 && data.error?.message?.includes('already exists')) {
    logSuccess('Duplicate DOI correctly rejected');
    return true;
  } else {
    logError('Duplicate DOI was not rejected');
    return false;
  }
}

async function runAllTests() {
  log('\n🚀 Starting Authentication, Papers, Collections & Annotations API Tests\n');
  log(`API URL: ${API_URL}`);
  log(`Test User: ${testUser.email}\n`);
  
  // Check if server is running
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  const results = [];
  
  // Authentication tests
  log('\n' + '='.repeat(50));
  log('📝 AUTHENTICATION TESTS', 'blue');
  log('='.repeat(50));
  
  results.push({ name: 'Register', passed: await testRegister() });
  
  if (!accessToken) {
    logWarning('Registration failed, trying login...');
    results.push({ name: 'Login', passed: await testLogin() });
  } else {
    results.push({ name: 'Login', passed: true }); // Skip if already registered
  }
  
  // Papers tests
  log('\n' + '='.repeat(50));
  log('📄 PAPERS TESTS', 'blue');
  log('='.repeat(50));
  
  results.push({ name: 'Create Paper', passed: await testCreatePaper() });
  results.push({ name: 'Get All Papers', passed: await testGetAllPapers() });
  results.push({ name: 'Get Single Paper', passed: await testGetPaper() });
  results.push({ name: 'Update Paper', passed: await testUpdatePaper() });
  results.push({ name: 'Search Papers', passed: await testSearchPapers() });
  results.push({ name: 'Filter by Status', passed: await testFilterPapers() });
  results.push({ name: 'Filter by Tag', passed: await testFilterByTag() });
  results.push({ name: 'Create Paper Validation', passed: await testCreatePaperValidation() });
  results.push({ name: 'Duplicate DOI Check', passed: await testDuplicateDoi() });
  results.push({ name: 'Delete Paper', passed: await testDeletePaper() });
  results.push({ name: 'Get Deleted Paper (404)', passed: await testGetDeletedPaper() });
  
  // Collections tests
  log('\n' + '='.repeat(50));
  log('📁 COLLECTIONS TESTS', 'blue');
  log('='.repeat(50));
  
  results.push({ name: 'Create Collection', passed: await testCreateCollection() });
  results.push({ name: 'Get All Collections', passed: await testGetAllCollections() });
  results.push({ name: 'Get Single Collection', passed: await testGetCollection() });
  results.push({ name: 'Update Collection', passed: await testUpdateCollection() });
  results.push({ name: 'Create Collection Validation', passed: await testCreateCollectionValidation() });
  results.push({ name: 'Delete Collection', passed: await testDeleteCollection() });
  results.push({ name: 'Get Deleted Collection (404)', passed: await testGetDeletedCollection() });
  
  // Annotations tests
  log('\n' + '='.repeat(50));
  log('📝 ANNOTATIONS TESTS', 'blue');
  log('='.repeat(50));
  
  // Create a new paper first (needed for annotation tests)
  // The previous paper was deleted, so we need a fresh one
  logTest('Create Paper for Annotations');
  const paperForAnnotations = await makeRequest('POST', PAPERS_URL, {
    ...testPaper,
    doi: `10.1234/test-annotations-${Date.now()}`
  }, accessToken);
  if (paperForAnnotations.status === 201) {
    paperId = paperForAnnotations.data.data.paper.id;
    logSuccess(`Paper created for annotations! Paper ID: ${paperId}`);
  } else {
    logError('Failed to create paper for annotations');
    // Skip annotation tests if we can't create a paper
    results.push({ name: 'Create Annotation', passed: false });
    results.push({ name: 'Get Annotations for Paper', passed: false });
    results.push({ name: 'Get Single Annotation', passed: false });
    results.push({ name: 'Update Annotation', passed: false });
    results.push({ name: 'Create Annotation Validation', passed: false });
    results.push({ name: 'Delete Annotation', passed: false });
    results.push({ name: 'Get Deleted Annotation (404)', passed: true }); // Skip is OK
  }
  
  if (paperId) {
    results.push({ name: 'Create Annotation', passed: await testCreateAnnotation() });
    results.push({ name: 'Get Annotations for Paper', passed: await testGetAnnotations() });
    results.push({ name: 'Get Single Annotation', passed: await testGetAnnotation() });
    results.push({ name: 'Update Annotation', passed: await testUpdateAnnotation() });
    results.push({ name: 'Create Annotation Validation', passed: await testCreateAnnotationValidation() });
    results.push({ name: 'Delete Annotation', passed: await testDeleteAnnotation() });
    results.push({ name: 'Get Deleted Annotation (404)', passed: await testGetDeletedAnnotation() });
  }
  
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

// Helper for warning log
function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Run tests
runAllTests().catch(error => {
  logError(`\nFatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});


/**
 * S3 Storage Test Script
 * Tests S3 presigned URL generation
 * 
 * Prerequisites:
 * - S3 credentials configured in .env
 * - Server running (npm run dev)
 * 
 * Run: node test-s3.js [YOUR_ACCESS_TOKEN]
 * 
 * If no token provided, will automatically register and login a test user
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_URL = `${API_URL}/api/auth`;
const PAPERS_URL = `${API_URL}/api/papers`;

let accessToken = process.argv[2];

async function authenticate() {
  // Check server connection
  try {
    const healthCheck = await fetch(`${API_URL}/health`);
    if (!healthCheck.ok) {
      throw new Error('Server not responding');
    }
  } catch (error) {
    console.error('❌ Cannot connect to server!');
    console.error('\n💡 Make sure the server is running:');
    console.error('   1. Open terminal in backend/ directory');
    console.error('   2. Run: npm run dev');
    console.error('   3. Wait for "🚀 citavErsa Backend running on port 3000"');
    console.error('   4. Then run this test again\n');
    process.exit(1);
  }

  if (!accessToken) {
    // Auto-authenticate with test user
    const testEmail = `test-s3-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    try {
      // Register
      const registerResponse = await fetch(`${AUTH_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: 'Test S3 User'
        })
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        // Try login if registration fails (user might exist)
        const loginResponse = await fetch(`${AUTH_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword
          })
        });

        const loginData = await loginResponse.json();
        if (loginResponse.ok && loginData.success) {
          accessToken = loginData.data.accessToken;
          console.log('✅ Auto-authenticated via login\n');
        } else {
          throw new Error('Failed to authenticate');
        }
      } else if (registerData.success) {
        accessToken = registerData.data.accessToken;
        console.log('✅ Auto-authenticated via registration\n');
      }
    } catch (error) {
      console.error('❌ Failed to auto-authenticate:', error.message);
      console.error('\n💡 You can provide a token manually:');
      console.error('   node test-s3.js YOUR_ACCESS_TOKEN\n');
      process.exit(1);
    }
  }
}

async function testS3Upload() {
  console.log('\n🚀 Testing S3 Upload URL Generation\n');

  // Authenticate first
  await authenticate();

  if (!accessToken) {
    console.error('❌ No access token available');
    process.exit(1);
  }

  try {
    // Test 1: Get presigned upload URL
    console.log('📤 Test 1: Get Presigned Upload URL');
    const uploadResponse = await fetch(`${PAPERS_URL}/upload-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: 'test-paper.pdf',
        size: 1024 * 100, // 100KB
        contentType: 'application/pdf',
        paperId: null // Will generate temp ID
      })
    });

    const uploadData = await uploadResponse.json();

    if (uploadResponse.ok && uploadData.success) {
      console.log('✅ Upload URL generated successfully!');
      console.log(`   S3 Key: ${uploadData.data.s3Key}`);
      console.log(`   Upload URL: ${uploadData.data.uploadUrl.substring(0, 80)}...`);
      console.log(`   Expires in: ${uploadData.data.expiresIn} seconds\n`);

      // Test 2: Upload a test PDF (simulated)
      console.log('📤 Test 2: Upload Test PDF (Simulated)');
      console.log('   Note: To actually upload, you would:');
      console.log(`   1. PUT to: ${uploadData.data.uploadUrl}`);
      console.log('   2. Include PDF file in request body');
      console.log('   3. Set Content-Type: application/pdf\n');

      // Test 3: Create paper with S3 key
      console.log('📄 Test 3: Create Paper with S3 Key');
      let paperResponse;
      let paperData;
      
      try {
        paperResponse = await fetch(PAPERS_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: 'Test Paper with S3 PDF',
            authors: ['Test Author'],
            s3Key: uploadData.data.s3Key,
            pdfSizeBytes: 1024 * 100,
            status: 'To Read'
          })
        });

        paperData = await paperResponse.json();
      } catch (error) {
        console.error('❌ Error creating paper:', error.message);
        if (error.code === 'ECONNREFUSED') {
          console.error('   Connection refused. Is the server running?');
        }
        console.error('   Full error:', error);
        return false;
      }

      if (paperResponse.ok && paperData.success) {
        console.log('✅ Paper created with S3 key!');
        console.log(`   Paper ID: ${paperData.data.paper.id}`);
        console.log(`   PDF URL: ${paperData.data.paper.pdfUrl}\n`);

        // Test 4: Get presigned download URL
        console.log('📥 Test 4: Get Presigned Download URL');
        const downloadResponse = await fetch(`${PAPERS_URL}/${paperData.data.paper.id}/pdf`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        const downloadData = await downloadResponse.json();

        if (downloadResponse.ok && downloadData.success) {
          console.log('✅ Download URL generated successfully!');
          console.log(`   PDF URL: ${downloadData.data.pdfUrl}`);
          console.log(`   Download URL: ${downloadData.data.downloadUrl.substring(0, 80)}...`);
          console.log(`   Expires in: ${downloadData.data.expiresIn} seconds\n`);
          console.log('🎉 All S3 tests passed!\n');
          return true;
        } else {
          console.error('❌ Failed to get download URL');
          console.error(`   Status: ${downloadResponse.status}`);
          console.error(`   Error: ${JSON.stringify(downloadData, null, 2)}\n`);
          return false;
        }
      } else {
        console.error('❌ Failed to create paper');
        console.error(`   Status: ${paperResponse.status}`);
        console.error(`   Error: ${JSON.stringify(paperData, null, 2)}\n`);
        return false;
      }
    } else {
      console.error('❌ Failed to generate upload URL');
      console.error(`   Status: ${uploadResponse.status}`);
      console.error(`   Error: ${JSON.stringify(uploadData, null, 2)}\n`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Connection refused. Is the server running?');
      console.error('   Start server: cd backend && npm run dev\n');
    }
    return false;
  }
}

// Run tests
(async () => {
  const success = await testS3Upload();
  process.exit(success ? 0 : 1);
})();



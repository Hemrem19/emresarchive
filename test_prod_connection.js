
async function testConnection() {
    const BASE_URL = 'https://emresarchive-production.up.railway.app';
    const EXTENSION_ORIGIN = 'chrome-extension://abcdefghijklmnop'; // Example ID

    console.log(`Testing connection to ${BASE_URL}...`);

    // 1. Health Check
    try {
        console.log('\n1. Testing Health Endpoint...');
        const healthRes = await fetch(`${BASE_URL}/health`, {
            headers: {
                'Origin': EXTENSION_ORIGIN
            }
        });
        console.log(`Status: ${healthRes.status}`);
        console.log(`CORS Header: ${healthRes.headers.get('access-control-allow-origin')}`);
        const healthData = await healthRes.text();
        console.log(`Body: ${healthData.substring(0, 100)}`);
    } catch (e) {
        console.error('Health check failed:', e.message);
    }

    // 2. Login Check (Simulated)
    try {
        console.log('\n2. Testing Login Endpoint (Preflight/OPTIONS)...');
        const optionsRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'OPTIONS',
            headers: {
                'Origin': EXTENSION_ORIGIN,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'content-type'
            }
        });
        console.log(`Status: ${optionsRes.status}`);
        console.log(`CORS Header: ${optionsRes.headers.get('access-control-allow-origin')}`);
        console.log(`Allow Methods: ${optionsRes.headers.get('access-control-allow-methods')}`);
    } catch (e) {
        console.error('OPTIONS check failed:', e.message);
    }

    try {
        console.log('\n3. Testing Login Endpoint (POST)...');
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': EXTENSION_ORIGIN
            },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'wrongpassword'
            })
        });
        console.log(`Status: ${loginRes.status}`);
        console.log(`CORS Header: ${loginRes.headers.get('access-control-allow-origin')}`);
        const loginData = await loginRes.text();
        console.log(`Body: ${loginData.substring(0, 200)}`);
    } catch (e) {
        console.error('Login check failed:', e.message);
    }
}

testConnection();

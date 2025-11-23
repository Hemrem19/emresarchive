// Using native fetch in Node 18+

const BASE_URL = 'http://localhost:3000';
let TOKEN = '';

async function register() {
    const email = `test${Date.now()}@example.com`;
    console.log(`Registering user ${email}...`);
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password: 'password123',
            name: 'Test User'
        })
    });
    const data = await response.json();
    if (data.success) {
        console.log('Registration successful');
        return email;
    } else {
        throw new Error('Registration failed: ' + JSON.stringify(data));
    }
}

async function login(email) {
    console.log('Logging in...');
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' })
    });
    const data = await response.json();
    if (data.success) {
        TOKEN = data.data.accessToken; // Corrected path
        console.log('Login successful');
    } else {
        throw new Error('Login failed: ' + JSON.stringify(data));
    }
}

async function addPaper() {
    console.log('Adding test paper (Attention Is All You Need)...');
    const response = await fetch(`${BASE_URL}/api/papers`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
        },
        body: JSON.stringify({
            title: 'Attention Is All You Need',
            doi: '10.48550/arXiv.1706.03762', // Using arXiv DOI format
            url: 'https://arxiv.org/abs/1706.03762',
            authors: ['Vaswani et al.'],
            year: 2017
        })
    });
    const data = await response.json();
    console.log('Add paper result:', data.success ? 'Success' : data.error);
    return data.data?.id;
}

async function generateNetwork() {
    console.log('Generating network...');
    const response = await fetch(`${BASE_URL}/api/networks/auto-generate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TOKEN}`
        }
    });
    const data = await response.json();
    console.log('Generate network result:', JSON.stringify(data, null, 2));
    return data.data?.graph?.id;
}

async function getNetwork(id) {
    console.log(`Fetching network ${id}...`);
    const response = await fetch(`${BASE_URL}/api/networks/${id}`, {
        headers: {
            'Authorization': `Bearer ${TOKEN}`
        }
    });
    const data = await response.json();
    console.log('Get network result:', data.success ? `Success (${data.data.nodes.length} nodes, ${data.data.edges.length} edges)` : data.error);
}

async function main() {
    try {
        const email = await register();
        await login(email);
        await addPaper();
        const graphId = await generateNetwork();
        if (graphId) {
            await getNetwork(graphId);
        }
    } catch (e) {
        console.error('Test failed:', e);
    }
}

main();

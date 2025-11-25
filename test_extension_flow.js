// const fetch = require('node-fetch'); // Native fetch is available in Node 18+

async function testFlow() {
    const API_URL = 'http://localhost:3000/api';

    // 1. Register
    console.log('Registering...');
    const regRes = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: `test_${Date.now()}@example.com`,
            password: 'password123',
            name: 'Test User'
        })
    });

    const regData = await regRes.json();
    if (!regData.success) {
        console.error('Registration failed:', regData);
        return;
    }

    const token = regData.data.accessToken;
    console.log('Got token:', token.substring(0, 20) + '...');

    // 2. Save Paper
    console.log('Saving paper...');
    const saveRes = await fetch(`${API_URL}/extension/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            url: 'https://arxiv.org/abs/1706.03762',
            title: 'Attention Is All You Need',
            doi: '10.48550/arXiv.1706.03762', // Use a fake DOI or real one
            arxivId: '1706.03762',
            tags: ['nlp', 'transformer'],
            notes: 'Seminal paper'
        })
    });

    const saveData = await saveRes.json();
    console.log('Save response status:', saveRes.status);

    if ((saveRes.status === 201 || saveRes.status === 200) && saveData.success) {
        console.log('✅ Paper saved successfully');
        console.log('   ID:', saveData.data.id);

        // Verify tags
        if (saveData.data.tags.includes('nlp') && saveData.data.tags.includes('transformer')) {
            console.log('✅ Tags verified');
        } else {
            console.error('❌ Tags missing');
        }
    } else {
        console.error('❌ Save failed:', saveData);
        return;
    }

    // 3. Test Duplicate Save
    console.log('Testing duplicate save...');
    const dupRes = await fetch(`${API_URL}/extension/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            url: 'https://arxiv.org/abs/1706.03762',
            title: 'Attention Is All You Need',
            doi: '10.48550/arXiv.1706.03762',
            arxivId: '1706.03762'
        })
    });

    const dupData = await dupRes.json();
    if (dupRes.status === 409) {
        console.log('✅ Duplicate correctly rejected');
    } else {
        console.error('❌ Duplicate not rejected:', dupRes.status, dupData);
    }
}

testFlow().catch(console.error);

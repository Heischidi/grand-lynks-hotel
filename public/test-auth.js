const fetch = require('node-fetch'); // Needs node-fetch installed or use dynamic import if Node 18+
const API_BASE_URL = 'http://localhost:5000/api';

async function runTests() {
    console.log('🧪 Starting Auth Tests...');

    let token = '';

    // Test 1: Fail Login
    console.log('\n--- Test 1: Login with wrong credentials ---');
    try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'wrongpassword' })
        });
        if (res.status === 401) {
            console.log('✅ Passed: Login failed as expected (401)');
        } else {
            console.error(`❌ Failed: Expected 401, got ${res.status}`);
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
    }

    // Test 2: Success Login
    console.log('\n--- Test 2: Login with correct credentials ---');
    try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'adminmain', password: 'Admin123%' }) // Assuming seeded creds
        });
        if (res.ok) {
            const data = await res.json();
            if (data.token) {
                token = data.token;
                console.log('✅ Passed: Login successful, token received');
            } else {
                console.error('❌ Failed: No token in response');
            }
        } else {
            console.error(`❌ Failed: Expected 200, got ${res.status}`);
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
    }

    if (!token) {
        console.error('⛔ Stopping tests: No token obtained.');
        return;
    }

    // Test 3: Protected Route with Token
    console.log('\n--- Test 3: Access protected route (GET /api/users) with token ---');
    try {
        const res = await fetch(`${API_BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            console.log('✅ Passed: Accessed protected route successfully');
        } else {
            console.error(`❌ Failed: Expected 200, got ${res.status}`);
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
    }

    // Test 4: Protected Route without Token
    console.log('\n--- Test 4: Access protected route (GET /api/users) without token ---');
    try {
        const res = await fetch(`${API_BASE_URL}/users`);
        if (res.status === 401) {
            console.log('✅ Passed: Access denied as expected (401)');
        } else {
            console.error(`❌ Failed: Expected 401, got ${res.status}`);
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
    }

    // Test 5: Protected Route with Invalid Token
    console.log('\n--- Test 5: Access protected route with invalid token ---');
    try {
        const res = await fetch(`${API_BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer invalid_token_123` }
        });
        if (res.status === 403) {
            console.log('✅ Passed: Access forbidden as expected (403)');
        } else {
            console.error(`❌ Failed: Expected 403, got ${res.status}`);
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

// Check if node-fetch is available (it might not be in the user's project)
// If not, we can assume standard fetch is available in Node 18+, or we install it.
// The user is likely on Node 18+ (spawn shell=true implies modern node or OS).
// But to be safe, we will try to stick to native fetch if available.
if (typeof fetch === 'undefined') {
    // try to require it, if fails, we might need to install it.
    // For this environment, I'll assume we might need to run `npm install node-fetch` temporarily or just run it.
    // Actually, I'll rely on the assumption that I can install it if needed.
    // But wait, the USER's project might not have it.
    // I previously ran `npm install jsonwebtoken bcryptjs`. I did NOT install node-fetch.
    // And `package.json` only listed `http-server` etc.
    // I will try to use the *browser* tool to verify if I can't run this script easily.
    // OR I can use `curl` via `run_command`? No, Windows. `Invoke-RestMethod`.
    // I will rewrite this test to be a PowerShell script instead! Much safer for Windows env without adding dependencies.
}

runTests();

const fetch = require('node-fetch'); // NOTE: User might not have node-fetch installed, so I'll use http module or assume fetch if node 18+
// Actually, standard http is safer.
const http = require('http');

const data = JSON.stringify({
    checkIn: '2025-01-01',
    checkOut: '2025-01-02'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/check-availability',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();

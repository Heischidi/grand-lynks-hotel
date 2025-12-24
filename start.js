const { spawn } = require('child_process');
const path = require('path');

// Allow port configuration via environment variable
const PORT = process.env.PORT || 5000;

console.log(`Starting Grand Lynks Hotel Server on port ${PORT}...`);

// Start key backend server
const server = spawn('node', ['backend/server.js'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: PORT }
});

server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
});

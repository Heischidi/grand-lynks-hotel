const { spawn } = require('child_process');
const http = require('http');
const jwt = require('jsonwebtoken');

const SECRET_KEY = "GrandLynksHotelSecret2025!";
const token = jwt.sign(
  { id: "superadmin_hardcoded", username: "superadmin", role: "superadmin" },
  SECRET_KEY,
  { expiresIn: "24h" }
);

console.log('Generated Super Admin Token:', token);

console.log('Starting backend server for verification...');
const server = spawn('node', ['api/index.js'], {
  env: { ...process.env, PORT: 5009 }
});

server.stdout.on('data', (data) => {
  console.log('[Server stdout]:', data.toString().trim());
});

server.stderr.on('data', (data) => {
  console.error('[Server stderr]:', data.toString().trim());
});

// Wait 4 seconds for server to start and bind, then make request
setTimeout(() => {
  console.log('Sending request to /statistics...');
  
  const options = {
    hostname: '127.0.0.1',
    port: 5009,
    path: '/statistics?year=2026',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('Response keys:', Object.keys(json));
        
        if (!json.roomMonthlyPerformance) {
          console.error('FAIL: roomMonthlyPerformance is missing!');
          process.exit(1);
        }
        
        if (json.roomMonthlyPerformance.length !== 12) {
          console.error(`FAIL: roomMonthlyPerformance length is ${json.roomMonthlyPerformance.length}, expected 12`);
          process.exit(1);
        }
        
        console.log('SUCCESS: roomMonthlyPerformance exists and has 12 months.');
        
        const firstMonth = json.roomMonthlyPerformance[0];
        console.log('Sample room performance in Month 0:', firstMonth[0]);
        
        if (firstMonth.length > 0) {
          const room = firstMonth[0];
          if (room.id === undefined || room.number === undefined || room.bookings === undefined || room.revenue === undefined) {
            console.error('FAIL: Room performance object is missing required fields (id, number, bookings, revenue)');
            process.exit(1);
          }
        }
        
        console.log('SUCCESS: All checks passed!');
        server.kill();
        process.exit(0);
      } catch (err) {
        console.error('FAIL: Failed to parse response JSON:', err);
        console.error('Raw response data was:', data);
        server.kill();
        process.exit(1);
      }
    });
  });
  
  req.on('error', (err) => {
    console.error('FAIL: request failed:', err);
    server.kill();
    process.exit(1);
  });

  req.end();
}, 4000);

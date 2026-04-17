const fs = require('fs');
const http = require('http');
const FormData = require('form-data');
const path = require('path');

async function testUpload() {
    console.log("Starting Upload Test...");

    // 1. Create a dummy image file
    const dummyImagePath = path.join(__dirname, 'test_image.png');
    // Minimal valid PNG header
    const pngBuffer = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2D340000000049454E44AE426082', 'hex');
    fs.writeFileSync(dummyImagePath, pngBuffer);

    // 2. Prepare FormData
    const form = new FormData();
    form.append('name', 'Test Upload Item');
    form.append('category', 'Test');
    form.append('price', '1000');
    form.append('available', 'true');
    form.append('image', fs.createReadStream(dummyImagePath));

    // 3. Send Request
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/menu',
        method: 'POST',
        headers: form.getHeaders(),
    };

    console.log("Sending POST request to /api/menu...");

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`Status: ${res.statusCode}`);
            try {
                const json = JSON.parse(data);
                console.log("Response:", json);

                if (res.statusCode === 200 && json.menuItem && json.menuItem.image) {
                    console.log("✅ Upload Successful! Image path:", json.menuItem.image);

                    // Verify file exists
                    const uploadedPath = path.join(__dirname, json.menuItem.image);
                    if (fs.existsSync(uploadedPath)) {
                        console.log("✅ File exists on disk.");
                        // Cleanup uploaded file (optional, maybe keep for manual check)
                        // fs.unlinkSync(uploadedPath); 

                        // Cleanup database item (Best practice)
                        // ...
                    } else {
                        console.error("❌ File NOT found on disk at:", uploadedPath);
                        // Check if path is relative vs absolute issue
                        console.log("Current dir:", __dirname);
                    }
                } else {
                    console.error("❌ Upload failed or invalid response.");
                }
            } catch (e) {
                console.error("❌ Response parsing failed:", data);
            }

            // Cleanup dummy input
            if (fs.existsSync(dummyImagePath)) fs.unlinkSync(dummyImagePath);
        });
    });

    req.on('error', (e) => {
        console.error("❌ Request error:", e.message);
        console.log("Make sure the server is running on port 5000!");

        // Cleanup dummy input
        if (fs.existsSync(dummyImagePath)) fs.unlinkSync(dummyImagePath);
    });

    form.pipe(req);
}

testUpload();

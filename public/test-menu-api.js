const http = require('http');

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }

            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log("Starting Menu API Tests (HTTP)...");

    // 1. CREATE
    console.log("\n1. Testing CREATE (POST /api/menu)...");
    let newItemId;
    try {
        const createRes = await request('POST', '/menu', {
            name: "Test Burger",
            category: "Food",
            price: 5000,
            description: "A delicious test burger",
            available: true,
            image: "https://example.com/burger.jpg"
        });

        if (createRes.status < 200 || createRes.status >= 300) {
            throw new Error(`Create failed: ${createRes.status} ${JSON.stringify(createRes.data)}`);
        }

        console.log("✅ Created:", createRes.data);
        newItemId = createRes.data.menuItem.id;
    } catch (e) {
        console.error("❌ Create failed:", e.message);
        return;
    }

    // 2. READ
    console.log("\n2. Testing READ (GET /api/menu)...");
    try {
        const readRes = await request('GET', '/menu');
        const readData = readRes.data;
        const found = readData.find(item => item.id === newItemId);
        if (found && found.name === "Test Burger" && found.image === "https://example.com/burger.jpg") {
            console.log("✅ Read success: Item found with correct data.");
        } else {
            console.error("❌ Read failed: Item not found or incorrect data.", found);
        }
    } catch (e) {
        console.error("❌ Read failed:", e.message);
    }

    // 3. UPDATE
    console.log("\n3. Testing UPDATE (PUT /api/menu/:id)...");
    try {
        const updateRes = await request('PUT', `/menu/${newItemId}`, {
            name: "Updated Test Burger",
            price: 6000
        });

        if (updateRes.status < 200 || updateRes.status >= 300) throw new Error(`Update failed: ${updateRes.status}`);

        console.log("✅ Updated:", updateRes.data);

        // Verify update
        const verifyRes = await request('GET', '/menu');
        const verifiedItem = verifyRes.data.find(i => i.id === newItemId);
        if (verifiedItem.name === "Updated Test Burger" && verifiedItem.price === 6000) {
            console.log("✅ Update verified successfully.");
        } else {
            console.error("❌ Update successful but data mismatch.");
        }

    } catch (e) {
        console.error("❌ Update failed:", e.message);
    }

    // 4. DELETE
    console.log("\n4. Testing DELETE (DELETE /api/menu/:id)...");
    try {
        const deleteRes = await request('DELETE', `/menu/${newItemId}`);

        if (deleteRes.status < 200 || deleteRes.status >= 300) throw new Error(`Delete failed: ${deleteRes.status}`);
        console.log("✅ Delete request successful.");

        // Verify delete
        const verifyDelRes = await request('GET', '/menu');
        const deletedItem = verifyDelRes.data.find(i => i.id === newItemId);
        if (!deletedItem) {
            console.log("✅ Delete verified: Item no longer exists.");
        } else {
            console.error("❌ Delete failed: Item still exists.");
        }

    } catch (e) {
        console.error("❌ Delete failed:", e.message);
    }
}

runTests();

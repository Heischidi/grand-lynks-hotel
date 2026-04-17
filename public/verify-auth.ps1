$baseUrl = "http://localhost:5000/api"

Write-Host "🧪 Starting Auth Tests..." -ForegroundColor Cyan

# Test 1: Fail Login
Write-Host "`n--- Test 1: Login with wrong credentials ---"
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{username="admin"; password="wrongpassword"} | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    Write-Error "❌ Failed: Expected error but got success"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ Passed: Login failed as expected (401)" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed: Expected 401, got $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

# Test 2: Success Login
Write-Host "`n--- Test 2: Login with correct credentials ---"
$token = $null
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{username="admin"; password="1234"} | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    if ($res.token) {
        $token = $res.token
        Write-Host "✅ Passed: Login successful, token received" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed: No token in response" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

if (-not $token) {
    Write-Host "⛔ Stopping tests: No token obtained." -ForegroundColor Yellow
    exit
}

# Test 3: Protected Route with Token
Write-Host "`n--- Test 3: Access protected route (GET /api/users) with token ---"
try {
    $headers = @{ Authorization = "Bearer $token" }
    $res = Invoke-RestMethod -Uri "$baseUrl/users" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "✅ Passed: Accessed protected route successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Protected Route without Token
Write-Host "`n--- Test 4: Access protected route (GET /api/users) without token ---"
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/users" -Method Get -ErrorAction Stop
    Write-Error "❌ Failed: Expected error but got success"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ Passed: Access denied as expected (401)" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed: Expected 401, got $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

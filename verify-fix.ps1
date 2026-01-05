$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:5000/api"
$username = "adminmain"
$password = "Admin123%"

Write-Host "🧪 Starting Room Update Error Verification..." -ForegroundColor Cyan

# 1. Login
Write-Host "`n➤ Logging in..."
try {
    $loginBody = @{
        username = $username
        password = $password
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Login successful. Token obtained." -ForegroundColor Green
} catch {
    Write-Error "❌ Login failed: $_"
    exit 1
}

# 2. Fetch Rooms
Write-Host "`n➤ Fetching rooms..."
try {
    $roomsResponse = Invoke-RestMethod -Uri "$baseUrl/rooms" -Method Get
    $rooms = $roomsResponse
    Write-Host "✅ Filtered $($rooms.Count) rooms." -ForegroundColor Green
} catch {
    Write-Error "❌ Failed to fetch rooms: $_"
    exit 1
}

if ($rooms.Count -lt 2) {
    Write-Warning "⚠️  Not enough rooms to test duplicate number constraint. Need at least 2."
    exit
}

$room1 = $rooms[0]
$room2 = $rooms[1]
$targetId = $room2.id
$conflictNumber = $room1.number

Write-Host "`n➤ Testing Duplicate Room Number Update..."
Write-Host "   Attempting to update Room ID $targetId to Number $conflictNumber (which belongs to Room ID $($room1.id))"

try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }

    $updateBody = @{
        number = $conflictNumber
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$baseUrl/rooms/$targetId" -Method Put -Headers $headers -Body $updateBody -ContentType "application/json"
    
    # If successful, that's BAD (unless they swapped, but we expect error due to conflict first if API is strict)
    # Actually, if we just update number, it should fail.
    Write-Error "❌ Unexpected success: The server allowed duplicate room number!"

} catch {
    $response = $_.Exception.Response
    $statusCode = $response.StatusCode.value__
    
    # Read error body
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    $reader.Close()

    if ($statusCode -eq 409) {
        Write-Host "✅ SUCCESS: Server returned 409 Conflict as expected." -ForegroundColor Green
        Write-Host "   Error Message: $errorBody" -ForegroundColor Gray
    } elseif ($statusCode -eq 500) {
        Write-Error "❌ FAILED: Server returned 500 Internal Server Error. The fix is not working."
    } else {
        Write-Error "❌ FAILED: Unexpected status code $statusCode. Body: $errorBody"
    }
}

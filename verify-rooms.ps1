$baseUrl = "http://localhost:5000/api"

try {
    $rooms = Invoke-RestMethod -Uri "$baseUrl/rooms" -Method Get
    Write-Host "✅ Total Rooms: $($rooms.Count)" -ForegroundColor Green

    # Group by type and price
    $groups = $rooms | Group-Object Type, PricePerNight | Select-Object Count, Name

    foreach ($g in $groups) {
        Write-Host "   - $($g.Count)x $($g.Name)"
    }

} catch {
    Write-Error "❌ Failed to fetch rooms: $_"
}

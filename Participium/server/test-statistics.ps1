# Script di test per gli endpoint delle statistiche pubbliche
# Esegui questo script dopo aver avviato il server

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Test Statistiche Pubbliche - Participium" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000/api/v1/statistics"

# Test 1: Statistiche pubbliche (default - giornaliere)
Write-Host "[TEST 1] Statistiche pubbliche complete (giornaliere)..." -ForegroundColor Yellow
try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/public" -Method Get
    Write-Host "✓ Successo!" -ForegroundColor Green
    Write-Host "Categorie trovate: $($response1.byCategory.Count)" -ForegroundColor White
    Write-Host "Trends trovati: $($response1.trends.data.Count)" -ForegroundColor White
    $response1 | ConvertTo-Json -Depth 10
} catch {
    Write-Host "✗ Errore: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Statistiche settimanali
Write-Host "[TEST 2] Statistiche pubbliche (settimanali)..." -ForegroundColor Yellow
try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/public?period=week" -Method Get
    Write-Host "✓ Successo!" -ForegroundColor Green
    Write-Host "Periodo: $($response2.trends.period)" -ForegroundColor White
    Write-Host "Trends trovati: $($response2.trends.data.Count)" -ForegroundColor White
    $response2.trends | ConvertTo-Json -Depth 10
} catch {
    Write-Host "✗ Errore: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Statistiche mensili
Write-Host "[TEST 3] Statistiche pubbliche (mensili)..." -ForegroundColor Yellow
try {
    $response3 = Invoke-RestMethod -Uri "$baseUrl/public?period=month" -Method Get
    Write-Host "✓ Successo!" -ForegroundColor Green
    Write-Host "Periodo: $($response3.trends.period)" -ForegroundColor White
    Write-Host "Trends trovati: $($response3.trends.data.Count)" -ForegroundColor White
    $response3.trends | ConvertTo-Json -Depth 10
} catch {
    Write-Host "✗ Errore: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Count per categoria specifica
Write-Host "[TEST 4] Count per categoria PUBLIC_WORKS..." -ForegroundColor Yellow
try {
    $response4 = Invoke-RestMethod -Uri "$baseUrl/category/PUBLIC_WORKS" -Method Get
    Write-Host "✓ Successo!" -ForegroundColor Green
    $response4 | ConvertTo-Json
} catch {
    Write-Host "✗ Errore: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Trends giornalieri
Write-Host "[TEST 5] Trends giornalieri..." -ForegroundColor Yellow
try {
    $response5 = Invoke-RestMethod -Uri "$baseUrl/trends/day" -Method Get
    Write-Host "✓ Successo!" -ForegroundColor Green
    Write-Host "Periodo: $($response5.period)" -ForegroundColor White
    Write-Host "Trends trovati: $($response5.data.Count)" -ForegroundColor White
    $response5 | ConvertTo-Json -Depth 10
} catch {
    Write-Host "✗ Errore: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Trends settimanali
Write-Host "[TEST 6] Trends settimanali..." -ForegroundColor Yellow
try {
    $response6 = Invoke-RestMethod -Uri "$baseUrl/trends/week" -Method Get
    Write-Host "✓ Successo!" -ForegroundColor Green
    $response6.data | Select-Object -First 5 | ConvertTo-Json
} catch {
    Write-Host "✗ Errore: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: Trends mensili
Write-Host "[TEST 7] Trends mensili..." -ForegroundColor Yellow
try {
    $response7 = Invoke-RestMethod -Uri "$baseUrl/trends/month" -Method Get
    Write-Host "✓ Successo!" -ForegroundColor Green
    $response7.data | Select-Object -First 5 | ConvertTo-Json
} catch {
    Write-Host "✗ Errore: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 8: Parametro periodo non valido (deve fallire)
Write-Host "[TEST 8] Test parametro non valido (deve fallire)..." -ForegroundColor Yellow
try {
    $response8 = Invoke-RestMethod -Uri "$baseUrl/public?period=invalid" -Method Get -ErrorAction Stop
    Write-Host "✗ ERRORE: Non dovrebbe avere successo!" -ForegroundColor Red
} catch {
    Write-Host "✓ Errore gestito correttamente!" -ForegroundColor Green
    Write-Host "Messaggio: $($_.Exception.Message)" -ForegroundColor White
}
Write-Host ""

# Test 9: Categoria non valida (deve fallire)
Write-Host "[TEST 9] Test categoria non valida (deve fallire)..." -ForegroundColor Yellow
try {
    $response9 = Invoke-RestMethod -Uri "$baseUrl/category/INVALID_CATEGORY" -Method Get -ErrorAction Stop
    Write-Host "✗ ERRORE: Non dovrebbe avere successo!" -ForegroundColor Red
} catch {
    Write-Host "✓ Errore gestito correttamente!" -ForegroundColor Green
    Write-Host "Messaggio: $($_.Exception.Message)" -ForegroundColor White
}
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Test completati!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

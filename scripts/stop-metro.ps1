$ErrorActionPreference = "Stop"

$MetroPort = 8081
$connections = Get-NetTCPConnection -LocalPort $MetroPort -State Listen -ErrorAction SilentlyContinue

if (-not $connections) {
  Write-Host "Metro nie dziala na porcie $MetroPort." -ForegroundColor Yellow
  exit 0
}

$processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $processIds) {
  try {
    Stop-Process -Id $processId -Force -ErrorAction Stop
    Write-Host "Zatrzymano proces Metro PID=$processId." -ForegroundColor Green
  } catch {
    Write-Host "Nie udalo sie zatrzymac procesu PID=$processId: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
}

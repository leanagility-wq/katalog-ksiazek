param()

$ErrorActionPreference = "Stop"

$baseScript = Join-Path $PSScriptRoot "build-android-and-install.ps1"

if (-not (Test-Path $baseScript)) {
  throw "Nie znaleziono bazowego skryptu build-android-and-install.ps1."
}

& $baseScript -Release

if ($LASTEXITCODE -ne 0) {
  throw "Instalacja wersji release nie powiodla sie."
}

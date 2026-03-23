param(
  [switch]$Release,
  [switch]$NoMetro
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$AndroidDir = Join-Path $ProjectRoot "android"
$LocalPropertiesPath = Join-Path $AndroidDir "local.properties"
$AndroidSdkPath = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$AdbPath = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
$GradleWrapper = Join-Path $AndroidDir "gradlew.bat"
$PackageName = "pl.katalogksiazek.mobile"
$MetroPort = "8081"
$startedMetro = $false

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Ensure-FileExists {
  param(
    [string]$Path,
    [string]$Description
  )

  if (-not (Test-Path $Path)) {
    throw "$Description nie istnieje: $Path"
  }
}

function Invoke-Checked {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$FailureMessage
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw $FailureMessage
  }
}

function Ensure-AndroidSdkConfiguration {
  Ensure-FileExists -Path $AndroidSdkPath -Description "Android SDK"

  $env:ANDROID_HOME = $AndroidSdkPath
  $env:ANDROID_SDK_ROOT = $AndroidSdkPath

  $sdkPathForGradle = $AndroidSdkPath.Replace("\", "\\")
  $localPropertiesContent = "sdk.dir=$sdkPathForGradle"

  if ((-not (Test-Path $LocalPropertiesPath)) -or ((Get-Content $LocalPropertiesPath -Raw) -ne $localPropertiesContent)) {
    Set-Content -Path $LocalPropertiesPath -Value $localPropertiesContent -NoNewline
  }
}

function Start-MetroBundler {
  $metroCommand = "Set-Location `"$ProjectRoot`"; npm.cmd run start"
  Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $metroCommand | Out-Null
}

function Test-MetroBundlerRunning {
  $connection = Get-NetTCPConnection -LocalPort $MetroPort -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

  return $null -ne $connection
}

Ensure-FileExists -Path $AndroidDir -Description "Katalog Android"
Ensure-FileExists -Path $GradleWrapper -Description "Gradle wrapper"
Ensure-FileExists -Path $AdbPath -Description "adb"
Ensure-AndroidSdkConfiguration

Write-Step "Sprawdzam podlaczone urzadzenia"
$adbDevicesOutput = & $AdbPath devices
if ($LASTEXITCODE -ne 0) {
  throw "Nie udalo sie uruchomic adb devices."
}

$connectedDevices = $adbDevicesOutput |
  Select-Object -Skip 1 |
  Where-Object { $_ -match "\sdevice$" }

if (-not $connectedDevices) {
  throw "Nie wykryto telefonu w trybie debugowania USB. Sprawdz kabel, zgode na debugowanie i wynik adb devices."
}

$variant = if ($Release) { "release" } else { "debug" }
$gradleTask = if ($Release) { "assembleRelease" } else { "assembleDebug" }
$apkPath = if ($Release) {
  Join-Path $AndroidDir "app\build\outputs\apk\release\app-release.apk"
} else {
  Join-Path $AndroidDir "app\build\outputs\apk\debug\app-debug.apk"
}

if (-not $Release -and -not $NoMetro) {
  if (Test-MetroBundlerRunning) {
    Write-Step "Metro juz dziala na porcie $MetroPort"
  } else {
    Write-Step "Uruchamiam Metro dla debug builda"
    Start-MetroBundler
    $startedMetro = $true
    Start-Sleep -Seconds 4
  }

  Write-Step "Robie adb reverse dla Metro"
  Invoke-Checked -FilePath $AdbPath -Arguments @("reverse", "tcp:$MetroPort", "tcp:$MetroPort") -FailureMessage "Nie udalo sie ustawic adb reverse dla Metro."
}

Write-Step "Buduje aplikacje ($variant)"
Push-Location $AndroidDir
try {
  Invoke-Checked -FilePath $GradleWrapper -Arguments @($gradleTask) -FailureMessage "Build Androida nie powiodl sie."
}
finally {
  Pop-Location
}

Ensure-FileExists -Path $apkPath -Description "Wynikowy APK"

Write-Step "Wgrywam APK na telefon"
Invoke-Checked -FilePath $AdbPath -Arguments @("install", "-r", $apkPath) -FailureMessage "Instalacja APK na telefonie nie powiodla sie."

Write-Step "Uruchamiam aplikacje"
Invoke-Checked -FilePath $AdbPath -Arguments @("shell", "monkey", "-p", $PackageName, "-c", "android.intent.category.LAUNCHER", "1") -FailureMessage "Nie udalo sie uruchomic aplikacji po instalacji."

Write-Host ""
Write-Host "Gotowe. Aplikacja zostala zbudowana i wgrana na telefon." -ForegroundColor Green
Write-Host "APK: $apkPath"
if (-not $Release -and -not $NoMetro) {
  if ($startedMetro) {
    Write-Host "Metro zostalo uruchomione w osobnym oknie PowerShell." -ForegroundColor Yellow
  } else {
    Write-Host "Uzyto juz dzialajacego Metro na porcie $MetroPort." -ForegroundColor Yellow
  }
  Write-Host "Gdy skonczysz, zatrzymaj Metro komenda: npm run android:metro:stop" -ForegroundColor Yellow
}

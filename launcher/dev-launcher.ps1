$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$port = 17328
$url = "http://127.0.0.1:$port/#/dashboard"
$logPath = Join-Path $scriptDir 'dev-launcher.log'
$pidPath = Join-Path $scriptDir 'dev-launcher.pid'
$viteOutPath = Join-Path $scriptDir 'dev-vite.stdout.log'
$viteErrPath = Join-Path $scriptDir 'dev-vite.stderr.log'
$viteEntry = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'

function Write-LauncherLog {
  param([string]$Level, [string]$Message)
  $line = "[{0}] [{1}] {2}" -f ([DateTime]::Now.ToString('s')), $Level, $Message
  Add-Content -Path $logPath -Value $line -Encoding UTF8
}

function Get-ProcessStateText {
  param([int]$Pid)
  try {
    $proc = Get-Process -Id $Pid -ErrorAction Stop
    return "running(pid=$($proc.Id))"
  } catch {
    return "stopped(pid=$Pid)"
  }
}

function Test-LauncherHealth {
  param([string]$HealthUrl)
  try {
    $response = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
  } catch {
    return $false
  }
}

Set-Content -Path $logPath -Value '' -Encoding UTF8
Set-Content -Path $viteOutPath -Value '' -Encoding UTF8
Set-Content -Path $viteErrPath -Value '' -Encoding UTF8

if (-not (Test-Path $viteEntry)) {
  Write-LauncherLog 'ERROR' 'Missing local dependencies: vite entry not found'
  exit 1
}

Write-LauncherLog 'INFO' 'Starting Vite dev server in hidden background process...'
$viteProcess = Start-Process -FilePath 'node.exe' `
  -ArgumentList "`"$viteEntry`"" `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $viteOutPath `
  -RedirectStandardError $viteErrPath `
  -PassThru

Set-Content -Path $pidPath -Value $viteProcess.Id -Encoding ASCII
Write-LauncherLog 'INFO' ("Spawned Vite pid={0}" -f $viteProcess.Id)

$healthUrl = "http://127.0.0.1:$port/health"
$isReady = $false
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Milliseconds 1500
  Write-LauncherLog 'INFO' ("Health check attempt {0}/40, process={1}" -f ($i + 1), (Get-ProcessStateText -Pid $viteProcess.Id))
  if (Test-LauncherHealth -HealthUrl $healthUrl) {
    $isReady = $true
    break
  }
}

if (-not $isReady) {
  Write-LauncherLog 'ERROR' ("Vite process state before timeout: {0}" -f (Get-ProcessStateText -Pid $viteProcess.Id))
  Write-LauncherLog 'ERROR' 'Timeout waiting for dev server'
  exit 1
}

Write-LauncherLog 'INFO' ("Dev server is ready, opening browser: {0}" -f $url)
Start-Process $url | Out-Null
exit 0

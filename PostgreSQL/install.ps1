# YueXia PostgreSQL + pgvector Auto Install (Windows)
# Run as Admin: Right-click -> Run with PowerShell

param(
    [string]$ProjectPath = (Get-Location).Path,
    [string]$DataDir = "",
    [string]$Password = "postgres",
    [int]$Port = 5432
)

if ($DataDir -eq "") {
    $DataDir = Join-Path $ProjectPath "数据库"
}
$BackupDir = Join-Path $ProjectPath "数据库备份"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  YueXia PostgreSQL Auto Installer" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project:  $ProjectPath" -ForegroundColor Gray
Write-Host "DataDir:  $DataDir" -ForegroundColor Gray
Write-Host "Password: $Password" -ForegroundColor Gray
Write-Host "Port:     $Port" -ForegroundColor Gray
Write-Host ""

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "Error: Run as Administrator!" -ForegroundColor Red
    pause
    exit 1
}

$PgVersion = "16.8-1"
$PgMajor = "16"
$pgPath = "C:\Program Files\PostgreSQL\$PgMajor"
$DownloadDir = "$env:TEMP\yuexia-install"
New-Item -ItemType Directory -Force -Path $DownloadDir | Out-Null

# Step 1: Download
Write-Host ""
Write-Host "[Step 1/5] Downloading PostgreSQL..." -ForegroundColor Cyan

$PgInstaller = "$DownloadDir\postgresql-$PgVersion-windows-x64.exe"
$PgUrl = "https://get.enterprisedb.com/postgresql/postgresql-$PgVersion-windows-x64.exe"

if (Test-Path $PgInstaller) {
    Write-Host "Installer exists, skip" -ForegroundColor Gray
} else {
    Write-Host "Downloading (~350MB)..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $PgUrl -OutFile $PgInstaller -UseBasicParsing
        Write-Host "Done" -ForegroundColor Green
    } catch {
        Write-Host "Primary failed, trying mirror..." -ForegroundColor Yellow
        $PgUrl2 = "https://sbp.enterprisedb.com/getfile.jsp?fileid=1258892"
        Invoke-WebRequest -Uri $PgUrl2 -OutFile $PgInstaller -UseBasicParsing
        Write-Host "Done" -ForegroundColor Green
    }
}

# Step 2: Install
Write-Host ""
Write-Host "[Step 2/5] Installing PostgreSQL..." -ForegroundColor Cyan

$argLine = "--mode unattended --unattendedmodeui none --serverport $Port --superpassword `"$Password`" --enable_acledit 1"
Start-Process -FilePath $PgInstaller -ArgumentList $argLine -Wait

if (Test-Path "$pgPath\bin\psql.exe") {
    Write-Host "PostgreSQL installed!" -ForegroundColor Green
} else {
    Write-Host "Install failed!" -ForegroundColor Red
    pause
    exit 1
}

# Step 3: PATH
Write-Host ""
Write-Host "[Step 3/5] Configuring PATH..." -ForegroundColor Cyan

$binPath = "$pgPath\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*$binPath*") {
    $newPath = $currentPath + ";" + $binPath
    [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
    Write-Host "Added to PATH" -ForegroundColor Green
} else {
    Write-Host "Already in PATH" -ForegroundColor Gray
}

$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = $machinePath + ";" + $userPath

# Step 4: Data Directory
Write-Host ""
Write-Host "[Step 4/5] Configuring data directory..." -ForegroundColor Cyan

$defaultDataDir = "$pgPath\data"
$serviceName = "postgresql-x64-$PgMajor"

if ($DataDir -ne $defaultDataDir) {
    Write-Host "Moving data to project folder..." -ForegroundColor Yellow
    Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
    
    if (Test-Path "$defaultDataDir\PG_VERSION") {
        Write-Host "Copying data..." -ForegroundColor Gray
        robocopy $defaultDataDir $DataDir /E /COPY:DAT /R:3 /W:5 | Out-Null
    } else {
        Write-Host "Initializing..." -ForegroundColor Gray
        $initDbExe = "$pgPath\bin\initdb.exe"
        $initArgs = "-D `"$DataDir`" -U postgres -E UTF8 --locale=C"
        Start-Process -FilePath $initDbExe -ArgumentList $initArgs -Wait
    }
    
    # Update service - use simple string
    $pgCtlExe = "$pgPath\bin\pg_ctl.exe"
    $newBinPath = '"' + $pgCtlExe + '" runservice -N "' + $serviceName + '" -D "' + $DataDir + '" -w'
    sc config $serviceName binPath= $newBinPath | Out-Null
    
    Start-Service -Name $serviceName
    Write-Host "Data directory configured!" -ForegroundColor Green
} else {
    Start-Service -Name $serviceName -ErrorAction SilentlyContinue
    Write-Host "Using default data dir" -ForegroundColor Gray
}

# Step 5: pgvector
Write-Host ""
Write-Host "[Step 5/5] Installing pgvector..." -ForegroundColor Cyan

if (Test-Path "$pgPath\lib\vector.dll") {
    Write-Host "pgvector already exists" -ForegroundColor Gray
} else {
    Write-Host "pgvector not found. Windows compile requires Visual Studio." -ForegroundColor Yellow
    Write-Host "Trying prebuilt binaries..." -ForegroundColor Yellow
    
    try {
        $prebuiltZip = "$DownloadDir\pgvector-prebuilt.zip"
        $prebuiltUrl = "https://github.com/pgvector/pgvector/releases/download/v0.8.0/pgvector-v0.8.0-x64.zip"
        Invoke-WebRequest -Uri $prebuiltUrl -OutFile $prebuiltZip -UseBasicParsing
        Expand-Archive -Path $prebuiltZip -DestinationPath "$DownloadDir\pgvector-prebuilt" -Force
        
        Copy-Item "$DownloadDir\pgvector-prebuilt\*.dll" "$pgPath\lib\" -Force -ErrorAction SilentlyContinue
        Copy-Item "$DownloadDir\pgvector-prebuilt\*.control" "$pgPath\share\extension\" -Force -ErrorAction SilentlyContinue
        Copy-Item "$DownloadDir\pgvector-prebuilt\*.sql" "$pgPath\share\extension\" -Force -ErrorAction SilentlyContinue
        Write-Host "Prebuilt pgvector installed!" -ForegroundColor Green
    } catch {
        Write-Host "pgvector install failed. Install manually later:" -ForegroundColor Red
        Write-Host "https://github.com/pgvector/pgvector#windows" -ForegroundColor Yellow
    }
}

# Create database and extensions
Write-Host ""
Write-Host "Creating database..." -ForegroundColor Cyan

$env:PGPASSWORD = $Password
$psqlExe = "$pgPath\bin\psql.exe"
$createdbExe = "$pgPath\bin\createdb.exe"

# Create yuexia database
Start-Process -FilePath $createdbExe -ArgumentList "-U postgres -p $Port yuexia" -Wait -WindowStyle Hidden
Write-Host "Database yuexia created" -ForegroundColor Green

# Enable pgvector
Start-Process -FilePath $psqlExe -ArgumentList "-U postgres -p $Port -d yuexia -c CREATE EXTENSION IF NOT EXISTS vector;" -Wait -WindowStyle Hidden
Write-Host "pgvector enabled!" -ForegroundColor Green

# Create directories
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
Write-Host "Backup dir: $BackupDir" -ForegroundColor Green

# Update .env
$EnvFile = Join-Path $ProjectPath ".env"
if (Test-Path $EnvFile) {
    $content = Get-Content $EnvFile -Raw
    $newUrl = "postgresql://postgres:$Password@localhost:$Port/yuexia"
    if ($content -match "DATABASE_URL=") {
        $content = $content -replace "DATABASE_URL=.*", "DATABASE_URL=$newUrl"
    } else {
        $content = "DATABASE_URL=$newUrl`n$content"
    }
    Set-Content -Path $EnvFile -Value $content
    Write-Host ".env updated" -ForegroundColor Green
}

# Done
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Install Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database:" -ForegroundColor Cyan
Write-Host "  Host:     localhost" -ForegroundColor White
Write-Host "  Port:     $Port" -ForegroundColor White
Write-Host "  User:     postgres" -ForegroundColor White
Write-Host "  Password: $Password" -ForegroundColor White
Write-Host "  Database: yuexia" -ForegroundColor White
Write-Host "  DataDir:  $DataDir" -ForegroundColor White
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  1. Open NEW terminal" -ForegroundColor Yellow
Write-Host "  2. cd '$ProjectPath'" -ForegroundColor Yellow
Write-Host "  3. npm install" -ForegroundColor Yellow
Write-Host "  4. npm run db:push" -ForegroundColor Yellow
Write-Host "  5. npm run dev" -ForegroundColor Yellow
Write-Host ""
pause

# YueXia PostgreSQL + pgvector Auto Install Script (Windows)
# Run as Admin: Right-click -> Run with PowerShell
# Requires: PowerShell 5.1+

param(
    [string]$ProjectPath = (Get-Location).Path,
    [string]$DataDir = "",
    [string]$Password = "postgres",
    [int]$Port = 5432
)

# Default data dir = Project/数据库
if ($DataDir -eq "") {
    $DataDir = Join-Path $ProjectPath "数据库"
}

$BackupDir = Join-Path $ProjectPath "数据库备份"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  YueXia PostgreSQL Auto Installer (Win)" -ForegroundColor Cyan
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
    Write-Host "Error: Please run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click -> Run with PowerShell" -ForegroundColor Yellow
    pause
    exit 1
}

$PgVersion = "16.8-1"
$PgMajor = "16"
$DownloadDir = "$env:TEMP\yuexia-install"
New-Item -ItemType Directory -Force -Path $DownloadDir | Out-Null

# ========== Step 1: Download ==========
Write-Host ""
Write-Host "[Step 1/5] Downloading PostgreSQL $PgMajor..." -ForegroundColor Cyan

$pgPath = "C:\Program Files\PostgreSQL\$PgMajor"
$PgInstaller = "$DownloadDir\postgresql-$PgVersion-windows-x64.exe"
$PgUrl = "https://get.enterprisedb.com/postgresql/postgresql-$PgVersion-windows-x64.exe"

if (Test-Path $PgInstaller) {
    Write-Host "Installer exists, skip download" -ForegroundColor Gray
} else {
    Write-Host "Downloading (~350MB, please wait)..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $PgUrl -OutFile $PgInstaller -UseBasicParsing
        Write-Host "Download complete" -ForegroundColor Green
    } catch {
        Write-Host "Primary URL failed, trying mirror..." -ForegroundColor Yellow
        $PgUrl2 = "https://sbp.enterprisedb.com/getfile.jsp?fileid=1258892"
        Invoke-WebRequest -Uri $PgUrl2 -OutFile $PgInstaller -UseBasicParsing
        Write-Host "Download complete" -ForegroundColor Green
    }
}

# ========== Step 2: Install PostgreSQL ==========
Write-Host ""
Write-Host "[Step 2/5] Installing PostgreSQL..." -ForegroundColor Cyan

$installArgs = "--mode unattended --unattendedmodeui none --serverport $Port --superpassword `"$Password`" --enable_acledit 1"
Start-Process -FilePath $PgInstaller -ArgumentList $installArgs -Wait

if (Test-Path "$pgPath\bin\psql.exe") {
    Write-Host "PostgreSQL installed!" -ForegroundColor Green
} else {
    Write-Host "Install failed, check $pgPath" -ForegroundColor Red
    pause
    exit 1
}

# ========== Step 3: Environment PATH ==========
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

# ========== Step 4: Configure Data Directory ==========
Write-Host ""
Write-Host "[Step 4/5] Configuring data directory..." -ForegroundColor Cyan

$defaultDataDir = "$pgPath\data"
$serviceName = "postgresql-x64-$PgMajor"

if ($DataDir -ne $defaultDataDir) {
    Write-Host "Moving data to: $DataDir" -ForegroundColor Yellow
    
    Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
    
    if (Test-Path "$defaultDataDir\PG_VERSION") {
        Write-Host "Copying data files..." -ForegroundColor Gray
        robocopy $defaultDataDir $DataDir /E /COPY:DAT /R:3 /W:5 | Out-Null
    } else {
        Write-Host "Initializing database..." -ForegroundColor Gray
        $initDbExe = "$pgPath\bin\initdb.exe"
        Start-Process -FilePath $initDbExe -ArgumentList "-D `"$DataDir`" -U postgres -E UTF8 --locale=C" -Wait
    }
    
    # Update service
    $scArgs = "config `"$serviceName`" binPath= `"`"`"$pgPath\bin\pg_ctl.exe`"`" runservice -N `"`"$serviceName`"`" -D `"`"$DataDir`"`" -w`""
    cmd /c $scArgs
    
    Start-Service -Name $serviceName
    Write-Host "Data directory configured!" -ForegroundColor Green
} else {
    Start-Service -Name $serviceName -ErrorAction SilentlyContinue
    Write-Host "Using default data directory" -ForegroundColor Gray
}

# ========== Step 5: Install pgvector ==========
Write-Host ""
Write-Host "[Step 5/5] Installing pgvector..." -ForegroundColor Cyan

$VectorVersion = "0.8.0"
$VectorZip = "$DownloadDir\pgvector.zip"
$VectorUrl = "https://github.com/pgvector/pgvector/archive/refs/tags/v$VectorVersion.zip"

if (-not (Test-Path "$pgPath\lib\vector.dll")) {
    try {
        Write-Host "Downloading pgvector..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $VectorUrl -OutFile $VectorZip -UseBasicParsing
        Expand-Archive -Path $VectorZip -DestinationPath $DownloadDir -Force
        $vectorSrc = "$DownloadDir\pgvector-$VectorVersion"
        
        # Try compile with Visual Studio
        Write-Host "Compiling pgvector (may need VS Build Tools)..." -ForegroundColor Yellow
        
        $vsPaths = @(
            "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat",
            "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat",
            "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
        )
        
        $foundVs = $false
        foreach ($vs in $vsPaths) {
            if (Test-Path $vs) {
                Write-Host "Found Visual Studio: $vs" -ForegroundColor Green
                # Use cmd /c with ; instead of && for PS5 compatibility
                $cmdLine = "`""$vs`"" "
                $cmdLine += "& nmake /F Makefile.win clean "
                $cmdLine += "& nmake /F Makefile.win "
                $cmdLine += "& nmake /F Makefile.win install"""
                cmd /c $cmdLine
                $foundVs = $true
                break
            }
        }
        
        if (-not $foundVs) {
            Write-Host "No Visual Studio found, trying prebuilt binaries..." -ForegroundColor Yellow
            $prebuiltUrl = "https://github.com/pgvector/pgvector/releases/download/v$VectorVersion/pgvector-v$VectorVersion-x64.zip"
            $prebuiltZip = "$DownloadDir\pgvector-prebuilt.zip"
            Invoke-WebRequest -Uri $prebuiltUrl -OutFile $prebuiltZip -UseBasicParsing
            Expand-Archive -Path $prebuiltZip -DestinationPath "$DownloadDir\pgvector-prebuilt" -Force
            
            Copy-Item "$DownloadDir\pgvector-prebuilt\*.dll" "$pgPath\lib\" -Force -ErrorAction SilentlyContinue
            Copy-Item "$DownloadDir\pgvector-prebuilt\*.control" "$pgPath\share\extension\" -Force -ErrorAction SilentlyContinue
            Copy-Item "$DownloadDir\pgvector-prebuilt\*.sql" "$pgPath\share\extension\" -Force -ErrorAction SilentlyContinue
            Write-Host "Prebuilt pgvector installed" -ForegroundColor Green
        }
    } catch {
        Write-Host "pgvector install skipped: $_" -ForegroundColor Red
        Write-Host "Install manually later: https://github.com/pgvector/pgvector" -ForegroundColor Yellow
    }
} else {
    Write-Host "pgvector already exists" -ForegroundColor Gray
}

# ========== Create Database ==========
Write-Host ""
Write-Host "Creating database..." -ForegroundColor Cyan

$env:PGPASSWORD = $Password
$psqlExe = "$pgPath\bin\psql.exe"
$createdbExe = "$pgPath\bin\createdb.exe"

Start-Process -FilePath $psqlExe -ArgumentList "-U postgres -p $Port -c `"SELECT 1;`"" -Wait -WindowStyle Hidden

if ($LASTEXITCODE -eq 0) {
    Write-Host "Connected!" -ForegroundColor Green
    
    # Create yuexia database
    Start-Process -FilePath $createdbExe -ArgumentList "-U postgres -p $Port yuexia" -Wait -WindowStyle Hidden
    Write-Host "Database 'yuexia' created" -ForegroundColor Green
    
    # Enable pgvector extension
    Start-Process -FilePath $psqlExe -ArgumentList "-U postgres -p $Port -d yuexia -c `"CREATE EXTENSION IF NOT EXISTS vector;`"" -Wait -WindowStyle Hidden
    Write-Host "pgvector extension enabled!" -ForegroundColor Green
} else {
    Write-Host "Connection failed, check if service is running" -ForegroundColor Red
}

# ========== Create Backup Directory ==========
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
Write-Host "Backup dir created: $BackupDir" -ForegroundColor Green

# ========== Update .env ==========
$EnvFile = Join-Path $ProjectPath ".env"
if (Test-Path $EnvFile) {
    $envContent = Get-Content $EnvFile -Raw
    $newDbUrl = "postgresql://postgres:$Password@localhost:$Port/yuexia"
    
    if ($envContent -match "DATABASE_URL=") {
        $envContent = $envContent -replace "DATABASE_URL=.*", "DATABASE_URL=$newDbUrl"
    } else {
        $envContent = "DATABASE_URL=$newDbUrl`n$envContent"
    }
    
    Set-Content -Path $EnvFile -Value $envContent
    Write-Host ".env updated" -ForegroundColor Green
}

# ========== Done ==========
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Install Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database Info:" -ForegroundColor Cyan
Write-Host "  Host:     localhost" -ForegroundColor White
Write-Host "  Port:     $Port" -ForegroundColor White
Write-Host "  User:     postgres" -ForegroundColor White
Write-Host "  Password: $Password" -ForegroundColor White
Write-Host "  Database: yuexia" -ForegroundColor White
Write-Host "  DataDir:  $DataDir" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Open NEW terminal (load new env)" -ForegroundColor Yellow
Write-Host "  2. cd '$ProjectPath'" -ForegroundColor Yellow
Write-Host "  3. npm install" -ForegroundColor Yellow
Write-Host "  4. npm run db:push" -ForegroundColor Yellow
Write-Host "  5. npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Service: services.msc -> postgresql-x64-$PgMajor" -ForegroundColor Gray
Write-Host ""
pause

# YueXia PostgreSQL + pgvector 自动安装脚本 (Windows PowerShell)
# 以管理员身份运行: 右键 -> 使用 PowerShell 运行

param(
    [string]$ProjectPath = (Get-Location).Path,
    [string]$DataDir = "",
    [string]$Password = "postgres",
    [int]$Port = 5432
)

# 如果没有指定数据目录，默认放在项目下的 数据库
if ($DataDir -eq "") {
    $DataDir = Join-Path $ProjectPath "数据库"
}

$BackupDir = Join-Path $ProjectPath "数据库备份"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  YueXia PostgreSQL 自动安装程序 (Windows)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "项目路径: $ProjectPath" -ForegroundColor Gray
Write-Host "数据目录: $DataDir" -ForegroundColor Gray
Write-Host "数据库密码: $Password" -ForegroundColor Gray
Write-Host "端口: $Port" -ForegroundColor Gray
Write-Host ""

# 检查是否管理员
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "错误: 请以管理员身份运行此脚本!" -ForegroundColor Red
    Write-Host "右键点击 -> 使用 PowerShell 运行" -ForegroundColor Yellow
    pause
    exit 1
}

# PostgreSQL 版本
$PgVersion = "16.8-1"
$PgMajor = "16"

# 下载目录
$DownloadDir = "$env:TEMP\yuexia-install"
New-Item -ItemType Directory -Force -Path $DownloadDir | Out-Null

# 检查是否已安装
$pgPath = "C:\Program Files\PostgreSQL\$PgMajor"
if (Test-Path "$pgPath\bin\psql.exe") {
    Write-Host "检测到 PostgreSQL 已安装: $pgPath" -ForegroundColor Green
    $reinstall = Read-Host "是否重新安装? (y/N)"
    if ($reinstall -ne "y" -and $reinstall -ne "Y") {
        Write-Host "跳过安装，直接配置..." -ForegroundColor Yellow
        goto CONFIGURE
    }
}

# Step 1: 下载 PostgreSQL
Write-Host ""
Write-Host "[Step 1/5] 下载 PostgreSQL $PgMajor..." -ForegroundColor Cyan

$PgInstaller = "$DownloadDir\postgresql-$PgVersion-windows-x64.exe"
$PgUrl = "https://get.enterprisedb.com/postgresql/postgresql-$PgVersion-windows-x64.exe"

if (Test-Path $PgInstaller) {
    Write-Host "安装包已存在，跳过下载" -ForegroundColor Gray
} else {
    Write-Host "正在下载 (约 350MB，请等待)..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $PgUrl -OutFile $PgInstaller -UseBasicParsing
        Write-Host "下载完成" -ForegroundColor Green
    } catch {
        Write-Host "下载失败，尝试备用地址..." -ForegroundColor Yellow
        $PgUrl2 = "https://sbp.enterprisedb.com/getfile.jsp?fileid=1258892"
        Invoke-WebRequest -Uri $PgUrl2 -OutFile $PgInstaller -UseBasicParsing
        Write-Host "下载完成" -ForegroundColor Green
    }
}

# Step 2: 安装 PostgreSQL
Write-Host ""
Write-Host "[Step 2/5] 安装 PostgreSQL..." -ForegroundColor Cyan
Write-Host "正在静默安装，请等待..." -ForegroundColor Yellow

$installArgs = @(
    "--mode unattended",
    "--unattendedmodeui none",
    "--serverport $Port",
    "--superpassword `"$Password`"",
    "--enable_acledit 1"
)

Start-Process -FilePath $PgInstaller -ArgumentList $installArgs -Wait

if (Test-Path "$pgPath\bin\psql.exe") {
    Write-Host "PostgreSQL 安装成功!" -ForegroundColor Green
} else {
    Write-Host "安装可能失败，请检查 $pgPath" -ForegroundColor Red
    pause
    exit 1
}

# Step 3: 添加环境变量
Write-Host ""
Write-Host "[Step 3/5] 配置环境变量..." -ForegroundColor Cyan

$binPath = "$pgPath\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*$binPath*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$binPath", "Machine")
    Write-Host "已添加到系统 PATH" -ForegroundColor Green
} else {
    Write-Host "PATH 中已存在" -ForegroundColor Gray
}

# 刷新当前会话 PATH
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")

# Step 4: 移动数据目录到项目文件夹
CONFIGURE:
Write-Host ""
Write-Host "[Step 4/5] 配置数据目录..." -ForegroundColor Cyan

$defaultDataDir = "$pgPath\data"

if ($DataDir -ne $defaultDataDir) {
    Write-Host "正在将数据目录迁移到: $DataDir" -ForegroundColor Yellow
    
    # 停止服务
    Stop-Service -Name "postgresql-x64-$PgMajor" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    # 创建目标目录
    New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
    
    # 复制数据
    if (Test-Path "$defaultDataDir\PG_VERSION") {
        Write-Host "复制数据文件..." -ForegroundColor Gray
        robocopy $defaultDataDir $DataDir /E /COPY:DAT /R:3 /W:5 | Out-Null
    } else {
        # 如果默认目录没有数据，重新初始化
        Write-Host "初始化数据库..." -ForegroundColor Gray
        & "$pgPath\bin\initdb.exe" -D "$DataDir" -U postgres -E UTF8 --locale=C
    }
    
    # 修改服务数据目录
    $serviceName = "postgresql-x64-$PgMajor"
    sc config $serviceName binPath= "`"$pgPath\bin\pg_ctl.exe`" runservice -N `"$serviceName`" -D `"$DataDir`" -w"
    
    # 启动服务
    Start-Service -Name $serviceName
    Write-Host "数据目录已配置: $DataDir" -ForegroundColor Green
} else {
    Start-Service -Name "postgresql-x64-$PgMajor" -ErrorAction SilentlyContinue
    Write-Host "使用默认数据目录" -ForegroundColor Gray
}

# Step 5: 安装 pgvector
Write-Host ""
Write-Host "[Step 5/5] 安装 pgvector 扩展..." -ForegroundColor Cyan

# 下载 pgvector
$VectorVersion = "0.8.0"
$VectorZip = "$DownloadDir\pgvector.zip"
$VectorUrl = "https://github.com/pgvector/pgvector/archive/refs/tags/v$VectorVersion.zip"

if (-not (Test-Path "$pgPath\lib\vector.dll")) {
    try {
        Write-Host "下载 pgvector..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $VectorUrl -OutFile $VectorZip -UseBasicParsing
        
        # 解压
        Expand-Archive -Path $VectorZip -DestinationPath $DownloadDir -Force
        $vectorSrc = "$DownloadDir\pgvector-$VectorVersion"
        
        # 编译 (需要 Visual Studio Build Tools)
        Write-Host "编译 pgvector (需要 Visual Studio)..." -ForegroundColor Yellow
        Push-Location $vectorSrc
        
        # 尝试使用 nmake
        $nmakePath = ""
        $vsPaths = @(
            "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat",
            "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat",
            "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat"
        )
        
        $foundVs = $false
        foreach ($vs in $vsPaths) {
            if (Test-Path $vs) {
                Write-Host "找到 Visual Studio: $vs" -ForegroundColor Green
                cmd /c "`"$vs`" && nmake /F Makefile.win clean && nmake /F Makefile.win && nmake /F Makefile.win install"
                $foundVs = $true
                break
            }
        }
        
        Pop-Location
        
        if (-not $foundVs) {
            Write-Host "未找到 Visual Studio，尝试下载预编译版本..." -ForegroundColor Yellow
            # 尝试下载预编译的 pgvector
            $prebuiltUrl = "https://github.com/pgvector/pgvector/releases/download/v$VectorVersion/pgvector-v$VectorVersion-x64.zip"
            $prebuiltZip = "$DownloadDir\pgvector-prebuilt.zip"
            Invoke-WebRequest -Uri $prebuiltUrl -OutFile $prebuiltZip -UseBasicParsing
            Expand-Archive -Path $prebuiltZip -DestinationPath "$DownloadDir\pgvector-prebuilt" -Force
            
            # 复制文件
            Copy-Item "$DownloadDir\pgvector-prebuilt\*.dll" "$pgPath\lib\" -Force -ErrorAction SilentlyContinue
            Copy-Item "$DownloadDir\pgvector-prebuilt\*.control" "$pgPath\share\extension\" -Force -ErrorAction SilentlyContinue
            Copy-Item "$DownloadDir\pgvector-prebuilt\*.sql" "$pgPath\share\extension\" -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "pgvector 安装遇到问题: $_" -ForegroundColor Red
        Write-Host "请手动安装: https://github.com/pgvector/pgvector#windows" -ForegroundColor Yellow
    }
} else {
    Write-Host "pgvector 已存在" -ForegroundColor Gray
}

# 创建数据库
Write-Host ""
Write-Host "创建数据库..." -ForegroundColor Cyan

# 使用 psql 创建数据库和扩展
$env:PGPASSWORD = $Password
& "$pgPath\bin\psql.exe" -U postgres -p $Port -c "SELECT 1;" 2>$null | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "连接成功" -ForegroundColor Green
    
    # 创建 yuexia 数据库
    & "$pgPath\bin\createdb.exe" -U postgres -p $Port yuexia 2>$null
    Write-Host "数据库 yuexia 已创建(或已存在)" -ForegroundColor Green
    
    # 创建 pgvector 扩展
    & "$pgPath\bin\psql.exe" -U postgres -p $Port -d yuexia -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>$null
    Write-Host "pgvector 扩展已启用" -ForegroundColor Green
} else {
    Write-Host "无法连接到 PostgreSQL，请检查服务是否运行" -ForegroundColor Red
}

# 创建备份目录
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
Write-Host "备份目录已创建: $BackupDir" -ForegroundColor Green

# 更新 .env 文件
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
    Write-Host "已更新 .env 数据库连接配置" -ForegroundColor Green
}

# 完成
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  安装完成!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "数据库信息:" -ForegroundColor Cyan
Write-Host "  主机: localhost" -ForegroundColor White
Write-Host "  端口: $Port" -ForegroundColor White
Write-Host "  用户: postgres" -ForegroundColor White
Write-Host "  密码: $Password" -ForegroundColor White
Write-Host "  数据库: yuexia" -ForegroundColor White
Write-Host "  数据目录: $DataDir" -ForegroundColor White
Write-Host ""
Write-Host "下一步:" -ForegroundColor Cyan
Write-Host "  1. 打开新终端 (加载新环境变量)" -ForegroundColor Yellow
Write-Host "  2. cd '$ProjectPath'" -ForegroundColor Yellow
Write-Host "  3. npm install" -ForegroundColor Yellow
Write-Host "  4. npm run db:push" -ForegroundColor Yellow
Write-Host "  5. npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "数据库服务: postgresql-x64-$PgMajor" -ForegroundColor Gray
Write-Host "管理服务: services.msc 中查看" -ForegroundColor Gray
Write-Host ""
pause

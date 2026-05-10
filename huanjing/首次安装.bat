@echo off
chcp 65001 >nul
title 月下写作 - 首次安装
echo.
echo  ==========================================
echo      月下写作 - 首次安装
echo      (只需运行一次)
echo  ==========================================
echo.

cd /d "%~dp0.."

:: 检查 Node.js
echo [1/3] 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [X] 未检测到 Node.js
    echo.
    echo  请先安装 Node.js：
    echo    1. 访问 https://nodejs.org/
    echo    2. 下载左侧绿色的 LTS 版本
    echo    3. 双击安装，一直点 Next
    echo    4. 安装完成后重新运行本脚本
    echo.
    echo  详细说明请看：huanjing/安装说明.txt
    echo.
    start "" "%~dp0安装说明.txt"
    pause
    exit /b 1
)
echo     OK
echo.

:: 检查 PostgreSQL
echo [2/3] 检查 PostgreSQL...
where psql >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [X] 未检测到 PostgreSQL
    echo.
    echo  请先安装 PostgreSQL 数据库：
    echo    1. 下载 PostgreSQL 17（Windows x86-64）
    echo    2. 双击安装，密码设为 Yuexia123456
    echo    3. 安装完成后打开 Stack Builder 安装 pgvector
    echo.
    echo  详细步骤请看：huanjing/安装说明.txt
    echo.
    start "" "%~dp0安装说明.txt"
    pause
    exit /b 1
)

:: 检查数据库
echo     PostgreSQL 已安装
echo     检查数据库 yuexia...
psql -U postgres -d yuexia -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo     数据库不存在，正在创建...
    psql -U postgres -c "CREATE DATABASE yuexia;" >nul 2>&1
    if errorlevel 1 (
        echo [X] 创建数据库失败，请检查密码是否正确
        echo     默认密码: Yuexia123456
        echo     如果你的密码不同，请先执行：
        echo     set PGPASSWORD=你的密码
        pause
        exit /b 1
    )
    psql -U postgres -d yuexia -c "CREATE EXTENSION IF NOT EXISTS vector;" >nul 2>&1
    echo     数据库已创建
) else (
    echo     数据库已就绪
)

:: 设置环境变量
if "%DATABASE_URL%"=="" (
    setx DATABASE_URL "postgresql://postgres:Yuexia123456@localhost:5432/yuexia" >nul 2>&1
    set DATABASE_URL=postgresql://postgres:Yuexia123456@localhost:5432/yuexia
    echo     环境变量已设置
)
echo     OK
echo.

:: 安装 npm 依赖
echo [3/3] 安装依赖...
if exist "node_modules" (
    echo     node_modules 已存在，跳过
) else (
    echo     正在安装，请等待...
    call npm install
    if errorlevel 1 (
        echo [X] npm install 失败
        echo     解决方法：
        echo     npm config set registry https://registry.npmmirror.com
        echo     然后重新运行
        pause
        exit /b 1
    )
    echo     安装完成
)
echo.

:: 构建
echo [4/4] 构建...
if exist "dist\public\index.html" (
    echo     已构建，跳过
) else (
    call npm run build
    if errorlevel 1 (
        echo [X] 构建失败
        pause
        exit /b 1
    )
    echo     构建完成
)
echo.

echo  ==========================================
echo      首次安装完成！
echo  ==========================================
echo.
echo  以后启动请双击：huanjing/启动.bat
echo.
pause

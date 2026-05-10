@echo off
chcp 65001 >nul
title 月下写作 - 本地启动器

set "PROJECT_PATH=G:\0yuexia-PC\yuexia"
set "PORT=34568"
set "URL=http://localhost:%PORT%"
set "TIMEOUT=60"

echo ========================================
echo   月下写作 - 本地启动器
echo ========================================
echo.

:: 检查项目目录
cd /d "%PROJECT_PATH%" 2>nul
if errorlevel 1 (
    echo [错误] 项目目录不存在: %PROJECT_PATH%
    pause
    exit /b 1
)

:: 检查 package.json
if not exist "package.json" (
    echo [错误] 找不到 package.json
    pause
    exit /b 1
)

:: 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装
    echo 下载地址: https://nodejs.org
    pause
    exit /b 1
)

:: 检查构建文件
if not exist "dist\public\index.html" (
    echo [错误] 构建文件不存在，请先运行: npm run build
    pause
    exit /b 1
)

echo [1/3] Node.js 已找到
echo [2/3] 正在启动服务器...
echo.
echo 提示: 首次启动可能需要 5-10 秒，请耐心等待
echo.

:: 检查端口是否已被占用，如果占用则关闭旧进程
powershell -NoProfile -Command "try { $c = Get-NetTCPConnection -LocalPort %PORT% -ErrorAction Stop; exit 1 } catch { exit 0 }" >nul 2>&1
if errorlevel 1 (
    echo [提示] 端口 %PORT% 已被占用，正在关闭旧服务...
    powershell -NoProfile -Command "try { $p = Get-NetTCPConnection -LocalPort %PORT% -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess; Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } catch {}"
    timeout /t 2 /nobreak >nul
)

:: 启动服务器（新窗口，显示日志）
start "月下写作服务器" cmd /c "cd /d ""%PROJECT_PATH%"" && node launcher\server.cjs"

:: 等待服务器就绪
echo [3/3] 等待服务器启动...
set /a COUNT=0
:WAIT_LOOP
    timeout /t 1 /nobreak >nul
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri '%URL%' -TimeoutSec 2 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 goto SERVER_READY
    set /a COUNT+=1
    if %COUNT% GEQ %TIMEOUT% goto TIMEOUT
    echo   等待中... (%COUNT%/%TIMEOUT%)
goto WAIT_LOOP

:SERVER_READY
echo.
echo [成功] 服务器已启动！
echo [成功] 正在打开浏览器: %URL%
start "" %URL%
echo.
echo 按任意键关闭此窗口（服务器继续运行）
pause >nul
exit /b 0

:TIMEOUT
echo.
echo [超时] 服务器启动超时 (%TIMEOUT%秒)
echo 可能原因:
echo   1. 首次启动需要安装依赖，请等待更久
echo   2. 端口 %PORT% 被其他程序占用
echo   3. 代码有编译错误
echo.
echo 请手动运行: cd "%PROJECT_PATH%" ^&^& node launcher\server.cjs
echo.
pause
exit /b 1

#!/bin/bash
# 月下写作 - Mac/Linux 启动脚本

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║         月下写作 - 本地启动器            ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请先安装：https://nodejs.org/"
    exit 1
fi

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "[提示] 首次启动，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[错误] 依赖安装失败"
        exit 1
    fi
fi

# 检查构建文件
if [ ! -f "dist/public/index.html" ]; then
    echo "[提示] 首次启动，正在构建..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "[错误] 构建失败"
        exit 1
    fi
fi

# 启动
echo "[提示] 正在启动月下写作..."
echo ""
node launcher/server.cjs "$@"

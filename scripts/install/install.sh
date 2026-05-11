#!/bin/bash
# YueXia PostgreSQL + pgvector 安装脚本入口
# 自动检测系统并调用对应的安装脚本
#
# 使用方法:
#   bash scripts/install/install.sh
#
# Windows 用户请使用 PowerShell:
#   右键 scripts/install/install.ps1 -> 使用 PowerShell 运行

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  YueXia PostgreSQL 自动安装程序${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# 检测操作系统
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    OS="windows"
elif [[ -n "$WINDIR" || -n "$MSYSTEM" ]]; then
    OS="windows"
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "检测到系统: ${YELLOW}${OS}${NC}"
echo ""

case "$OS" in
    "linux")
        if [ "$EUID" -ne 0 ]; then
            echo -e "${YELLOW}需要使用 sudo 运行${NC}"
            echo ""
            echo -e "${CYAN}执行命令:${NC}"
            echo -e "  ${GREEN}sudo bash scripts/install/install.sh${NC}"
            echo ""
            exit 1
        fi
        bash "${SCRIPT_DIR}/install-linux.sh"
        ;;
    "mac")
        bash "${SCRIPT_DIR}/install-mac.sh"
        ;;
    "windows")
        echo -e "${YELLOW}Windows 请使用 PowerShell 脚本${NC}"
        echo ""
        echo -e "${CYAN}使用方法:${NC}"
        echo -e "  1. 打开 PowerShell (管理员)"
        echo -e "  2. 进入项目目录"
        echo -e "  3. 执行:"
        echo -e "     ${GREEN}.\scripts\install\install.ps1${NC}"
        echo ""
        echo -e "${CYAN}或者手动运行:${NC}"
        echo -e "  ${GREEN}powershell -ExecutionPolicy Bypass -File scripts/install/install.ps1${NC}"
        echo ""
        exit 1
        ;;
    *)
        echo -e "${RED}无法检测操作系统类型: $OSTYPE${NC}"
        echo -e "${YELLOW}请手动运行对应的安装脚本:${NC}"
        echo -e "  Linux:   ${GREEN}sudo bash scripts/install/install-linux.sh${NC}"
        echo -e "  Mac:     ${GREEN}bash scripts/install/install-mac.sh${NC}"
        echo -e "  Windows: ${GREEN}右键 scripts/install/install.ps1 -> 使用 PowerShell 运行${NC}"
        echo ""
        exit 1
        ;;
esac

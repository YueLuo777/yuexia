#!/bin/bash
# YueXia PostgreSQL + pgvector 自动安装脚本 (Mac)
# 使用方法: bash scripts/install/install-mac.sh

set -e  # 遇到错误立即退出

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# 默认配置
PROJECT_PATH="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="${PROJECT_PATH}/数据库"
BACKUP_DIR="${PROJECT_PATH}/数据库备份"
PASSWORD="postgres"
PORT="5432"
PG_MAJOR="16"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  YueXia PostgreSQL 自动安装程序 (Mac)${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
echo -e "${GRAY}项目路径: ${PROJECT_PATH}${NC}"
echo -e "${GRAY}数据目录: ${DATA_DIR}${NC}"
echo ""

# 检查 Homebrew
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}未安装 Homebrew，正在安装...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # 添加到 PATH
    if [[ $(uname -m) == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.bash_profile
        eval "$(/usr/local/bin/brew shellenv)"
    fi
fi

echo -e "${GREEN}✅ Homebrew 已就绪${NC}"

# Step 1: 安装 PostgreSQL
echo ""
echo -e "${CYAN}[Step 1/5] 安装 PostgreSQL ${PG_MAJOR}...${NC}"

if brew list "postgresql@${PG_MAJOR}" &>/dev/null; then
    echo -e "${GREEN}PostgreSQL ${PG_MAJOR} 已安装${NC}"
else
    echo -e "${YELLOW}正在安装，请等待...${NC}"
    brew install "postgresql@${PG_MAJOR}"
fi

# 添加到 PATH
BREW_PREFIX=$(brew --prefix)
PG_BIN="${BREW_PREFIX}/opt/postgresql@${PG_MAJOR}/bin"

if [[ $(uname -m) == "arm64" ]]; then
    SHELL_PROFILE="$HOME/.zshrc"
else
    SHELL_PROFILE="$HOME/.bash_profile"
fi

if ! grep -q "postgresql@${PG_MAJOR}" "$SHELL_PROFILE" 2>/dev/null; then
    echo "export PATH=\"${PG_BIN}:\$PATH\"" >> "$SHELL_PROFILE"
    echo -e "${GREEN}已添加到 PATH${NC}"
fi

export PATH="${PG_BIN}:$PATH"

# Step 2: 初始化数据目录
echo ""
echo -e "${CYAN}[Step 2/5] 配置数据目录...${NC}"

mkdir -p "$DATA_DIR"

if [ ! -f "${DATA_DIR}/PG_VERSION" ]; then
    echo -e "${YELLOW}初始化数据库到 ${DATA_DIR}...${NC}"
    initdb -D "$DATA_DIR" --locale=C -E UTF8 -U postgres
else
    echo -e "${GREEN}数据目录已存在${NC}"
fi

# Step 3: 启动 PostgreSQL
echo ""
echo -e "${CYAN}[Step 3/5] 启动 PostgreSQL...${NC}"

# 停止系统默认的 PostgreSQL（如果有）
brew services stop "postgresql@${PG_MAJOR}" 2>/dev/null || true

# 用我们的数据目录启动
if pg_isready -h localhost -p "$PORT" &>/dev/null; then
    echo -e "${GREEN}PostgreSQL 已在运行${NC}"
else
    pg_ctl -D "$DATA_DIR" start -l "${DATA_DIR}/logfile"
    sleep 2
    
    if pg_isready -h localhost -p "$PORT" &>/dev/null; then
        echo -e "${GREEN}✅ PostgreSQL 启动成功${NC}"
    else
        echo -e "${RED}❌ 启动失败，检查日志: ${DATA_DIR}/logfile${NC}"
        exit 1
    fi
fi

# Step 4: 安装 pgvector
echo ""
echo -e "${CYAN}[Step 4/5] 安装 pgvector...${NC}"

if brew list pgvector &>/dev/null; then
    echo -e "${GREEN}pgvector 已安装${NC}"
else
    echo -e "${YELLOW}正在安装 pgvector...${NC}"
    brew install pgvector
fi

# Step 5: 创建数据库和用户
echo ""
echo -e "${CYAN}[Step 5/5] 创建数据库...${NC}"

# 设置密码
psql -U postgres -p "$PORT" -c "ALTER USER postgres WITH PASSWORD '${PASSWORD}';" 2>/dev/null || true

export PGPASSWORD="$PASSWORD"

# 创建数据库
createdb -U postgres -p "$PORT" yuexia 2>/dev/null || echo -e "${GRAY}数据库 yuexia 已存在${NC}"

# 启用 pgvector
psql -U postgres -p "$PORT" -d yuexia -c "CREATE EXTENSION IF NOT EXISTS vector;" 
echo -e "${GREEN}✅ pgvector 扩展已启用${NC}"

# 创建备份目录
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✅ 备份目录已创建${NC}"

# 更新 .env
ENV_FILE="${PROJECT_PATH}/.env"
if [ -f "$ENV_FILE" ]; then
    NEW_DB_URL="postgresql://postgres:${PASSWORD}@localhost:${PORT}/yuexia"
    
    if grep -q "DATABASE_URL=" "$ENV_FILE"; then
        sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=${NEW_DB_URL}|" "$ENV_FILE" 2>/dev/null || \
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=${NEW_DB_URL}|" "$ENV_FILE"
    fi
    
    echo -e "${GREEN}✅ 已更新 .env${NC}"
fi

# 添加启动/停止别名
PROJECT_ABS_PATH="$PROJECT_PATH"
if ! grep -q "alias pg-start" "$SHELL_PROFILE" 2>/dev/null; then
    cat >> "$SHELL_PROFILE" << EOF

# YueXia PostgreSQL 快捷命令
alias pg-start="pg_ctl -D ${PROJECT_ABS_PATH}/数据库 start"
alias pg-stop="pg_ctl -D ${PROJECT_ABS_PATH}/数据库 stop"
alias pg-status="pg_isready"
EOF
    echo -e "${GREEN}已添加 pg-start / pg-stop / pg-status 快捷命令${NC}"
fi

# 完成
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  安装完成!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${CYAN}数据库信息:${NC}"
echo -e "  ${GRAY}主机: localhost${NC}"
echo -e "  ${GRAY}端口: ${PORT}${NC}"
echo -e "  ${GRAY}用户: postgres${NC}"
echo -e "  ${GRAY}密码: ${PASSWORD}${NC}"
echo -e "  ${GRAY}数据库: yuexia${NC}"
echo -e "  ${GRAY}数据目录: ${DATA_DIR}${NC}"
echo ""
echo -e "${CYAN}快捷命令:${NC}"
echo -e "  ${YELLOW}pg_ctl -D ./数据库 start${NC}     启动"
echo -e "  ${YELLOW}pg_ctl -D ./数据库 stop${NC}      停止"
echo -e "  ${YELLOW}pg_isready${NC}                     检查状态"
echo ""
echo -e "${CYAN}下一步:${NC}"
echo -e "  ${YELLOW}1. source ${SHELL_PROFILE}${NC}       重新加载配置"
echo -e "  ${YELLOW}2. cd '${PROJECT_PATH}'${NC}"
echo -e "  ${YELLOW}3. npm install${NC}"
echo -e "  ${YELLOW}4. npm run db:push${NC}"
echo -e "  ${YELLOW}5. npm run dev${NC}"
echo ""

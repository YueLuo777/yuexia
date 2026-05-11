#!/bin/bash
# YueXia PostgreSQL + pgvector 自动安装脚本 (Linux Debian/Ubuntu)
# 使用方法: bash scripts/install/install-linux.sh
# 需要 sudo: sudo bash scripts/install/install-linux.sh

set -e  # 遇到错误立即退出

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# 默认配置
PROJECT_PATH="$(cd "$(dirname "$0")/../.." && pwd)"
DATA_DIR="${PROJECT_PATH}/postgres-data"
BACKUP_DIR="${PROJECT_PATH}/数据库"
PASSWORD="postgres"
PORT="5432"
PG_MAJOR="16"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  YueXia PostgreSQL 自动安装程序 (Linux)${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
echo -e "${GRAY}项目路径: ${PROJECT_PATH}${NC}"
echo -e "${GRAY}数据目录: ${DATA_DIR}${NC}"
echo ""

# 检查 sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 sudo 运行此脚本${NC}"
    echo -e "${YELLOW}sudo bash $0${NC}"
    exit 1
fi

# Step 1: 更新软件源并安装依赖
echo ""
echo -e "${CYAN}[Step 1/5] 更新软件源...${NC}"

apt-get update -qq

# 安装必要的构建工具
apt-get install -y -qq curl wget gnupg lsb-release build-essential git

# Step 2: 添加 PostgreSQL 官方源
echo ""
echo -e "${CYAN}[Step 2/5] 添加 PostgreSQL 官方源...${NC}"

if [ ! -f "/etc/apt/sources.list.d/pgdg.list" ]; then
    # 导入签名密钥
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql.gpg
    
    # 添加源
    echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    
    apt-get update -qq
    echo -e "${GREEN}✅ PostgreSQL 源已添加${NC}"
else
    echo -e "${GREEN}PostgreSQL 源已存在${NC}"
fi

# Step 3: 安装 PostgreSQL
echo ""
echo -e "${CYAN}[Step 3/5] 安装 PostgreSQL ${PG_MAJOR}...${NC}"

if dpkg -l "postgresql-${PG_MAJOR}" &>/dev/null; then
    echo -e "${GREEN}PostgreSQL ${PG_MAJOR} 已安装${NC}"
else
    echo -e "${YELLOW}正在安装，请等待...${NC}"
    apt-get install -y -qq "postgresql-${PG_MAJOR}" "postgresql-contrib-${PG_MAJOR}" "postgresql-server-dev-${PG_MAJOR}"
    echo -e "${GREEN}✅ PostgreSQL 安装完成${NC}"
fi

# Step 4: 初始化数据目录到项目文件夹
echo ""
echo -e "${CYAN}[Step 4/5] 配置数据目录...${NC}"

# 停止默认服务
systemctl stop postgresql 2>/dev/null || true

# 创建项目数据目录
mkdir -p "$DATA_DIR"
chown postgres:postgres "$DATA_DIR"

if [ ! -f "${DATA_DIR}/PG_VERSION" ]; then
    echo -e "${YELLOW}初始化数据库到 ${DATA_DIR}...${NC}"
    su - postgres -c "/usr/lib/postgresql/${PG_MAJOR}/bin/initdb -D '${DATA_DIR}' --locale=C -E UTF8"
else
    echo -e "${GREEN}数据目录已存在${NC}"
fi

# 配置 postgresql.conf
cat > "${DATA_DIR}/postgresql.conf" << EOF
# YueXia PostgreSQL 配置
listen_addresses = 'localhost'
port = ${PORT}
max_connections = 100
shared_buffers = 128MB
dynamic_shared_memory_type = posix
max_wal_size = 1GB
min_wal_size = 80MB
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_line_prefix = '%t [%p]: '
log_timezone = 'UTC'
datestyle = 'iso, mdy'
timezone = 'UTC'
default_text_search_config = 'pg_catalog.english'
EOF

# 配置 pg_hba.conf（允许本地密码连接）
cat > "${DATA_DIR}/pg_hba.conf" << EOF
# YueXia PostgreSQL 访问控制
local   all             all                                     trust
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
EOF

chown -R postgres:postgres "$DATA_DIR"

# 创建 systemd 服务
SERVICE_FILE="/etc/systemd/system/yuexia-postgres.service"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=YueXia PostgreSQL
After=network.target

[Service]
Type=forking
User=postgres
Group=postgres
Environment=PGDATA=${DATA_DIR}
ExecStart=/usr/lib/postgresql/${PG_MAJOR}/bin/pg_ctl start -D \${PGDATA} -s -l \${PGDATA}/log/server.log -w
ExecStop=/usr/lib/postgresql/${PG_MAJOR}/bin/pg_ctl stop -D \${PGDATA} -s -m fast
ExecReload=/usr/lib/postgresql/${PG_MAJOR}/bin/pg_ctl reload -D \${PGDATA} -s
TimeoutSec=300
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable yuexia-postgres
systemctl start yuexia-postgres

sleep 2

if pg_isready -h localhost -p "$PORT" &>/dev/null; then
    echo -e "${GREEN}✅ PostgreSQL 启动成功${NC}"
else
    echo -e "${RED}❌ 启动失败，检查日志: ${DATA_DIR}/log/${NC}"
    exit 1
fi

# Step 5: 安装 pgvector
echo ""
echo -e "${CYAN}[Step 5/5] 安装 pgvector...${NC}"

# 从源码编译安装
cd /tmp
if [ ! -d "pgvector" ]; then
    echo -e "${YELLOW}下载 pgvector...${NC}"
    git clone --branch v0.8.0 --depth 1 https://github.com/pgvector/pgvector.git
fi

cd pgvector
make clean 2>/dev/null || true
make
make install

echo -e "${GREEN}✅ pgvector 安装完成${NC}"

# Step 6: 配置数据库
echo ""
echo -e "${CYAN}[配置] 创建数据库...${NC}"

# 设置 postgres 密码
su - postgres -c "/usr/lib/postgresql/${PG_MAJOR}/bin/psql -p ${PORT} -c \"ALTER USER postgres WITH PASSWORD '${PASSWORD}';\""

export PGPASSWORD="$PASSWORD"

# 创建 yuexia 数据库
su - postgres -c "/usr/lib/postgresql/${PG_MAJOR}/bin/createdb -p ${PORT} yuexia" 2>/dev/null || echo -e "${GRAY}数据库已存在${NC}"

# 启用 pgvector
su - postgres -c "/usr/lib/postgresql/${PG_MAJOR}/bin/psql -p ${PORT} -d yuexia -c 'CREATE EXTENSION IF NOT EXISTS vector;'"
echo -e "${GREEN}✅ pgvector 扩展已启用${NC}"

# Step 7: 收尾
echo ""
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✅ 备份目录已创建: ${BACKUP_DIR}${NC}"

# 更新 .env
ENV_FILE="${PROJECT_PATH}/.env"
if [ -f "$ENV_FILE" ]; then
    NEW_DB_URL="postgresql://postgres:${PASSWORD}@localhost:${PORT}/yuexia"
    
    if grep -q "DATABASE_URL=" "$ENV_FILE"; then
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=${NEW_DB_URL}|" "$ENV_FILE"
    fi
    
    # 取消注释 DATABASE_URL（如果被注释了）
    sed -i 's|^# DATABASE_URL=|DATABASE_URL=|' "$ENV_FILE"
    
    echo -e "${GREEN}✅ 已更新 .env${NC}"
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
echo -e "${CYAN}服务管理:${NC}"
echo -e "  ${YELLOW}sudo systemctl start yuexia-postgres${NC}   启动"
echo -e "  ${YELLOW}sudo systemctl stop yuexia-postgres${NC}    停止"
echo -e "  ${YELLOW}sudo systemctl status yuexia-postgres${NC}  查看状态"
echo ""
echo -e "${CYAN}下一步:${NC}"
echo -e "  ${YELLOW}1. cd '${PROJECT_PATH}'${NC}"
echo -e "  ${YELLOW}2. npm install${NC}"
echo -e "  ${YELLOW}3. npm run db:push${NC}"
echo -e "  ${YELLOW}4. npm run dev${NC}"
echo ""

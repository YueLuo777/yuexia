#!/bin/bash
# YueXia PostgreSQL 一键启动脚本
# 需要先安装 Docker: https://docs.docker.com/get-docker/

echo "================================"
echo "  YueXia PostgreSQL 启动器"
echo "================================"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装！"
    echo ""
    echo "请根据你的系统安装 Docker:"
    echo "  • Windows/Mac: https://docs.docker.com/desktop/"
    echo "  • Linux: https://docs.docker.com/engine/install/"
    echo ""
    exit 1
fi

# 检查 Docker Compose 是否可用
if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
elif docker-compose version &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo "❌ Docker Compose 未安装！"
    exit 1
fi

echo "✅ Docker 已安装"
echo ""

# 创建数据库数据目录
mkdir -p 数据库

# 启动 PostgreSQL
echo "🚀 正在启动 PostgreSQL + pgvector..."
$COMPOSE up -d

# 等待服务就绪
echo "⏳ 等待数据库就绪..."
sleep 3

# 检查状态
if docker ps | grep -q yuexia-postgres; then
    echo ""
    echo "✅ PostgreSQL 启动成功！"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  连接信息:"
    echo "    地址: localhost:5432"
    echo "    用户: postgres"
    echo "    密码: postgres"
    echo "    数据库: yuexia"
    echo ""
    echo "  数据存储: ./数据库/"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📝 接下来在项目里运行:"
    echo "    npm run db:push    # 创建表"
    echo "    npm run dev        # 启动应用"
else
    echo "❌ 启动失败，请检查日志:"
    echo "    docker logs yuexia-postgres"
fi

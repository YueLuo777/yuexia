#!/bin/bash
# 停止 YueXia PostgreSQL

if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
else
    COMPOSE="docker-compose"
fi

echo "🛑 正在停止 PostgreSQL..."
$COMPOSE down

echo "✅ 已停止"

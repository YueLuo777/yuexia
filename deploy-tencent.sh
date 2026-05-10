#!/bin/bash
# ============================================
# 腾讯云服务器一键部署脚本
# 月下写作 - PostgreSQL 版本
# 使用端口 8080（备案通过后可改为 80）
# ============================================

set -e

echo "========================================"
echo "  月下写作工作台 - 腾讯云部署脚本"
echo "========================================"

# 配置
PROJECT_DIR="/var/www/novel-workbench"
GITHUB_REPO="https://github.com/YueLuo777/yuexiaxiezuo-PC.git"
PORT=8080
NODE_VERSION=22

# ============================================
# 第一步：安装依赖
# ============================================
echo ""
echo "[1/8] 安装系统依赖..."
sudo apt-get update -qq
sudo apt-get install -y -qq curl git nginx ufw

# 安装 Node.js
echo "[1/8] 安装 Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "$NODE_VERSION" ]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash - > /dev/null
  sudo apt-get install -y -qq nodejs
fi

# 安装 PM2
if ! command -v pm2 &> /dev/null; then
  echo "[1/8] 安装 PM2..."
  sudo npm install -g pm2 > /dev/null 2>&1
fi

echo "[1/8] ✓ 依赖安装完成"

# ============================================
# 第二步：克隆代码
# ============================================
echo ""
echo "[2/8] 克隆项目代码..."
if [ -d "$PROJECT_DIR" ]; then
  echo "[2/8] 目录已存在，拉取最新代码..."
  cd "$PROJECT_DIR"
  git pull origin main
else
  sudo mkdir -p /var/www
  cd /var/www
  sudo git clone "$GITHUB_REPO" novel-workbench
  cd "$PROJECT_DIR"
fi
echo "[2/8] ✓ 代码克隆完成"

# ============================================
# 第三步：安装依赖并构建
# ============================================
echo ""
echo "[3/8] 安装项目依赖..."
npm install > /dev/null 2>&1
echo "[3/8] ✓ 依赖安装完成"

echo ""
echo "[4/8] 构建前端项目..."
npm run build 2>&1 | tail -5
echo "[4/8] ✓ 前端构建完成"

# ============================================
# 第四步：配置环境变量
# ============================================
echo ""
echo "[5/8] 配置环境变量..."

# 读取用户输入的 PostgreSQL URI
echo ""
echo "请输入你的 PostgreSQL 连接字符串："
echo "（格式：postgresql://用户名:密码@host:port/数据库名）"
read -p "> " DATABASE_URL

# 写入 .env 文件
cat > "$PROJECT_DIR/.env" << EOF
DATABASE_URL=$DATABASE_URL
NODE_ENV=production
PORT=3000
EOF

echo "[5/8] ✓ 环境变量配置完成"

# ============================================
# 第五步：启动后端服务
# ============================================
echo ""
echo "[6/8] 启动后端服务..."
cd "$PROJECT_DIR"

# 停止旧进程
pm2 delete novel-workbench 2>/dev/null || true

# 启动新进程
pm2 start npm --name "novel-workbench" -- start > /dev/null 2>&1
pm2 save > /dev/null 2>&1

echo "[6/8] ✓ 后端服务启动完成"

# ============================================
# 第六步：配置 Nginx
# ============================================
echo ""
echo "[7/8] 配置 Nginx..."

sudo tee /etc/nginx/sites-available/novel-workbench > /dev/null << 'EOF'
server {
    listen 8080;
    server_name _;

    # 前端静态文件
    location / {
        root /var/www/novel-workbench/dist/public;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # 后端 API
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/novel-workbench/dist/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用配置
sudo ln -sf /etc/nginx/sites-available/novel-workbench /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "[7/8] ✓ Nginx 配置完成"

# ============================================
# 第七步：防火墙配置
# ============================================
echo ""
echo "[8/8] 配置防火墙..."
sudo ufw allow 22/tcp > /dev/null 2>&1    # SSH
sudo ufw allow 80/tcp > /dev/null 2>&1    # HTTP（备案后用）
sudo ufw allow 443/tcp > /dev/null 2>&1   # HTTPS（备案后用）
sudo ufw allow 8080/tcp > /dev/null 2>&1  # 临时端口
sudo ufw --force enable > /dev/null 2>&1

echo "[8/8] ✓ 防火墙配置完成"

# ============================================
# 部署完成
# ============================================
echo ""
echo "========================================"
echo "  🎉 部署完成！"
echo "========================================"
echo ""
echo "📍 访问地址："
echo "   http://你的服务器IP:8080"
echo ""
echo "📍 常用命令："
echo "   查看日志：pm2 logs novel-workbench"
echo "   重启服务：pm2 restart novel-workbench"
echo "   查看状态：pm2 status"
echo "   Nginx重启：sudo systemctl restart nginx"
echo ""
echo "📍 备案通过后改为80端口："
echo "   修改 /etc/nginx/sites-available/novel-workbench"
echo "   把 listen 8080 改为 listen 80"
echo "   然后执行：sudo systemctl restart nginx"
echo ""
echo "========================================"

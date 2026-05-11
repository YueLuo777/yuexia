# PostgreSQL 本地安装指南

本指南帮你把 PostgreSQL 装在本地电脑上，数据文件放在项目目录下。

---

## 目录

1. [Windows 安装](#windows)
2. [Mac 安装](#mac)
3. [Linux 安装](#linux)
4. [安装 pgvector 扩展](#pgvector)
5. [指定数据目录到项目文件夹](#datadir)
6. [启动项目](#start)
7. [常见问题](#faq)

---

## <a name="windows"></a> Windows 安装

### Step 1：下载安装包

打开 https://www.postgresql.org/download/windows/

点击 **"Download the installer"** -> 选择 **PostgreSQL 16.x** -> 下载

### Step 2：运行安装向导

双击下载的 `.exe` 文件，按向导安装：

| 步骤 | 选择 |
|------|------|
| 安装目录 | 默认即可 |
| 选择组件 | 勾选 **PostgreSQL Server** 和 **pgAdmin 4** |
| 数据目录 | **关键！** 浏览到 `你的项目路径\yuexia\postgres-data\` |
| 密码 | 输入 `postgres`（或你自己记得住的密码） |
| 端口 | 默认 `5432` |

> 如果安装向导没有让你选数据目录，没关系，装完后看下面的[迁移方法](#datadir)

### Step 3：添加环境变量

安装完后，把 PostgreSQL 的 bin 目录加到系统 PATH：

```
C:\Program Files\PostgreSQL\16\bin\
```

这样命令行里可以直接用 `psql` 命令。

---

## <a name="mac"></a> Mac 安装

### 方式一：Homebrew（推荐）

```bash
# 安装 PostgreSQL 16
brew install postgresql@16

# 添加到 PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 初始化数据库到项目目录
initdb -D /你的项目路径/yuexia/postgres-data --locale=C -E UTF8

# 启动服务
pg_ctl -D /你的项目路径/yuexia/postgres-data start

# 设置开机自启
brew services start postgresql@16
```

### 方式二：Postgres.app

1. 下载 https://postgresapp.com/
2. 拖到应用程序文件夹
3. 打开，点击启动
4. 数据目录在 `~/Library/Application Support/Postgres/var-16/`

---

## <a name="linux"></a> Linux 安装（Debian/Ubuntu）

```bash
# 更新软件源
sudo apt-get update

# 安装 PostgreSQL 16
sudo apt-get install postgresql-16 postgresql-contrib

# 停止默认服务
sudo systemctl stop postgresql

# 初始化新数据目录到项目文件夹
sudo mkdir -p /你的项目路径/yuexia/postgres-data
sudo chown postgres:postgres /你的项目路径/yuexia/postgres-data
sudo -u postgres /usr/lib/postgresql/16/bin/initdb -D /你的项目路径/yuexia/postgres-data

# 修改服务使用新数据目录
sudo systemctl edit postgresql@16-main
# 在编辑器中添加：
# [Service]
# Environment=PGDATA=/你的项目路径/yuexia/postgres-data

# 启动
sudo systemctl start postgresql@16-main

# 设置 postgres 用户密码
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

---

## <a name="pgvector"></a> 安装 pgvector 扩展

**Windows：**

1. 打开 https://github.com/pgvector/pgvector/releases
2. 下载 `pgvector-v0.8.0-x64.zip`
3. 解压后把 `vector.dll` 复制到 `C:\Program Files\PostgreSQL\16\lib\`
4. 把 `vector.control` 和 `vector--*.sql` 复制到 `C:\Program Files\PostgreSQL\16\share\extension\`

**Mac（Homebrew）：**

```bash
brew install pgvector

# 找到 pgvector 的安装路径
brew --prefix pgvector

# 然后把文件链接到 PostgreSQL 扩展目录
#（具体路径 brew 安装成功后会提示）
```

**Linux：**

```bash
# 编译安装 pgvector
sudo apt-get install postgresql-server-dev-16 build-essential git

cd /tmp
git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

**验证 pgvector 是否安装成功：**

```bash
psql -U postgres -d yuexia -c "CREATE EXTENSION IF NOT EXISTS vector;"
# 如果没有报错就是成功了
```

---

## <a name="datadir"></a> 指定数据目录到项目文件夹

装完后，数据目录迁移到项目下：

### 方法：停止服务 -> 复制数据 -> 修改配置 -> 重启

**Windows：**

1. 打开 服务管理器（Win+R -> `services.msc`）
2. 找到 `postgresql-x64-16` -> 右键停止
3. 把 `C:\Program Files\PostgreSQL\16\data\` 整个复制到 `你的项目\yuexia\postgres-data\`
4. 打开 `C:\Program Files\PostgreSQL\16\data\postgresql.conf`
5. 找到 `data_directory = '...'` 改成你的新项目路径
6. 回到服务管理器，右键启动

**Mac/Linux：**

```bash
# 1. 停止 PostgreSQL
pg_ctl -D /旧的数据目录 stop

# 2. 复制数据到新位置
rsync -av /旧的数据目录/ /你的项目路径/yuexia/postgres-data/

# 3. 用新目录启动
pg_ctl -D /你的项目路径/yuexia/postgres-data start

# 4. 验证
psql -U postgres -c "SHOW data_directory;"
# 应该显示你的项目路径
```

---

## <a name="start"></a> 启动你的项目

数据库装好后：

```bash
# 1. 进入项目
cd /你的项目路径/yuexia

# 2. 安装依赖
npm install

# 3. 同步数据库表结构（创建所有表）
npm run db:push

# 4. 启动前后端开发服务
npm run dev

# 5. 打开浏览器访问 http://localhost:3000
```

然后进入「数据库管理」页面，导出/导入你的数据。

---

## <a name="faq"></a> 常见问题

### Q：忘记 postgres 密码怎么办？

**Windows：**
```bash
# 打开 pgAdmin 4 -> 服务器 -> 右键 -> 属性 -> 修改密码
```

**Mac/Linux：**
```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 在 psql 里执行
ALTER USER postgres WITH PASSWORD '新密码';
\q
```

### Q：端口 5432 被占用？

```bash
# 查看谁占用了 5432
lsof -i :5432

# 修改 PostgreSQL 监听其他端口
# 编辑 postgres-data/postgresql.conf
# 找到 port = 5432，改成其他数字
# 然后修改项目 .env 里的 DATABASE_URL 端口
```

### Q：提示 "pgvector" 扩展不存在？

说明 pgvector 没装好，回去看上面的[安装 pgvector](#pgvector)部分。

### Q：npm run db:push 报错连接不上？

1. 确认 PostgreSQL 正在运行
2. 检查 `.env` 里的 `DATABASE_URL` 是否正确
3. 确认密码对不对

默认配置（`项目/.env`）：
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/yuexia
```

如果你改了密码，同步修改 `.env` 文件。

### Q：postgres-data 文件夹能删吗？

**不能！** 这里面存着你的所有数据。要备份整个项目时，记得一起备份这个文件夹。

---

## 安装顺序总结

```
1. 安装 PostgreSQL 16
2. 安装 pgvector 扩展
3. 把数据目录改到 项目/postgres-data/
4. npm install
5. npm run db:push
6. npm run dev
7. 浏览器打开 localhost:3000
8. 数据库管理页面 -> 导出/导入
```

---

有问题随时问我！

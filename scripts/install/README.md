# PostgreSQL 一键安装脚本

自动安装 PostgreSQL 16 + pgvector 扩展，并将数据目录配置到项目文件夹下。

---

## 快速开始

### Mac / Linux

```bash
# Mac
bash scripts/install/install.sh

# Linux（需要 sudo）
sudo bash scripts/install/install.sh
```

### Windows

```powershell
# 右键 scripts\install\install.ps1 -> 使用 PowerShell 运行
# 或命令行（管理员）：
powershell -ExecutionPolicy Bypass -File scripts/install/install.ps1
```

---

## 安装后

脚本会自动：

1. ✅ 安装 PostgreSQL 16
2. ✅ 安装 pgvector 向量扩展
3. ✅ 数据目录设置到 `项目/postgres-data/`
4. ✅ 创建数据库 `yuexia`
5. ✅ 创建备份目录 `项目/数据库/`
6. ✅ 更新 `.env` 连接配置

然后执行：

```bash
npm install      # 安装项目依赖
npm run db:push  # 创建数据库表
npm run dev      # 启动应用
```

打开 http://localhost:3000，进入「数据库管理」页面导出/导入数据。

---

## 各系统详细说明

| 系统 | 脚本 | 前置要求 |
|------|------|---------|
| Windows | `install.ps1` | 管理员权限 |
| Mac | `install-mac.sh` | Homebrew |
| Linux | `install-linux.sh` | sudo + apt |

---

## 自定义配置

### 修改数据目录

编辑脚本开头的配置变量：

```bash
# install-mac.sh 或 install-linux.sh
DATA_DIR="/你想放的位置/postgres-data"
```

```powershell
# install.ps1
$DataDir = "C:\你想放的位置\postgres-data"
```

### 修改密码

```bash
PASSWORD="你的密码"
```

修改后同步更新 `.env` 文件：

```
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/yuexia
```

---

## 服务管理

### Mac

```bash
pg_ctl -D ./postgres-data start   # 启动
pg_ctl -D ./postgres-data stop    # 停止
pg_isready                         # 检查状态
```

### Linux

```bash
sudo systemctl start yuexia-postgres   # 启动
sudo systemctl stop yuexia-postgres    # 停止
sudo systemctl status yuexia-postgres  # 状态
```

### Windows

```powershell
# 服务管理器
services.msc
# 找到 postgresql-x64-16 右键 启动/停止
```

---

## 常见问题

**Q: 安装失败怎么办？**

查看对应系统的 `INSTALL-POSTGRES.md` 手动安装指南。

**Q: 端口 5432 被占用？**

修改脚本里的 `PORT` 变量，然后同步更新 `.env`。

**Q: 重装系统后数据还在吗？**

在！因为数据存在 `项目/postgres-data/` 文件夹下，只要这个文件夹还在，重新运行脚本即可恢复。

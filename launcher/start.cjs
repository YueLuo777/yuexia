#!/usr/bin/env node
/**
 * 月下写作 - 一键启动器
 * 
 * 用法:
 *   node launcher/start.cjs           # 启动并打开浏览器
 *   node launcher/start.cjs --no-open # 启动但不打开浏览器
 *   node launcher/start.cjs --port 8080 # 自定义端口
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// ─── 配置 ───
const CONFIG = {
  apiPort: 34567,
  webPort: 34568,
  buildDir: path.join(__dirname, '..', 'dist', 'public'),
  checkInterval: 500,   // 健康检查间隔 ms
  maxWaitTime: 30000,   // 最大等待时间 ms
};

// ─── 工具函数 ───
const log = (msg) => console.log(`[启动器] ${msg}`);
const error = (msg) => console.error(`[启动器] ✗ ${msg}`);
const success = (msg) => console.log(`[启动器] ✓ ${msg}`);

// 检查端口是否被占用
function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// 等待服务就绪
async function waitForService(port, maxWait = CONFIG.maxWaitTime) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    try {
      const res = await fetch(`http://localhost:${port}/health`);
      if (res.ok) return true;
    } catch { /* 服务还没启动 */ }
    await new Promise(r => setTimeout(r, CONFIG.checkInterval));
  }
  return false;
}

// 自动打开浏览器
function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' :
              platform === 'win32' ? 'start' :
              'xdg-open';
  exec(`${cmd} ${url}`, (err) => {
    if (err) log(`请手动打开浏览器访问: ${url}`);
  });
}

// 检查 node_modules 是否存在
function checkDependencies() {
  const nmPath = path.join(__dirname, '..', 'node_modules');
  if (!fs.existsSync(nmPath)) {
    error('node_modules 不存在，请先运行: npm install');
    process.exit(1);
  }
  // 检查关键依赖
  const required = ['better-sqlite3', 'hono', '@trpc/server', 'drizzle-orm'];
  for (const dep of required) {
    const depPath = path.join(nmPath, dep);
    if (!fs.existsSync(depPath)) {
      error(`缺少依赖: ${dep}，请运行: npm install`);
      process.exit(1);
    }
  }
  success('依赖检查通过');
}

// 获取目录下最新文件的 mtime
function getDirLatestMtime(dir) {
  let latest = 0;
  function walk(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            walk(fullPath);
          }
        } else {
          const stat = fs.statSync(fullPath);
          if (stat.mtimeMs > latest) latest = stat.mtimeMs;
        }
      }
    } catch { /* ignore */ }
  }
  walk(dir);
  return latest;
}

// 检查是否需要构建（dist 不存在 或 src 比 dist 新）
function checkBuild() {
  const indexPath = path.join(CONFIG.buildDir, 'index.html');
  const srcDir = path.join(__dirname, '..', 'src');
  const apiDir = path.join(__dirname, '..', 'api');

  if (!fs.existsSync(indexPath)) {
    log('前端文件未构建，正在构建...');
    return runBuild();
  }

  const distMtime = fs.statSync(indexPath).mtimeMs;
  const srcMtime = getDirLatestMtime(srcDir);
  const apiMtime = getDirLatestMtime(apiDir);
  const latestSrc = Math.max(srcMtime, apiMtime);

  if (latestSrc > distMtime) {
    log('检测到源码有更新，正在重新构建...');
    return runBuild();
  }

  success('前端文件已构建且为最新');
  return Promise.resolve();
}

function runBuild() {
  const result = spawn('npm', ['run', 'build'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
  });
  return new Promise((resolve) => {
    result.on('close', (code) => {
      if (code !== 0) {
        error('构建失败');
        process.exit(1);
      }
      success('构建完成');
      resolve();
    });
  });
}

// ─── 主流程 ───
async function main() {
  const args = process.argv.slice(2);
  const noOpen = args.includes('--no-open');
  const customPort = args.find((_, i) => args[i - 1] === '--port');
  if (customPort) CONFIG.webPort = parseInt(customPort);

  log('═══════════════════════════════════════');
  log('       月下写作 - 本地启动器');
  log('═══════════════════════════════════════');
  console.log('');

  // Step 1: 检查依赖
  log('[1/4] 检查依赖...');
  checkDependencies();
  console.log('');

  // Step 2: 检查/构建前端
  log('[2/4] 检查前端构建...');
  await checkBuild();
  console.log('');

  // Step 3: 检查端口
  log('[3/4] 检查端口可用性...');
  const apiAvailable = await checkPort(CONFIG.apiPort);
  const webAvailable = await checkPort(CONFIG.webPort);
  if (!apiAvailable) {
    error(`端口 ${CONFIG.apiPort} 被占用，请关闭占用该端口的程序`);
    process.exit(1);
  }
  if (!webAvailable) {
    error(`端口 ${CONFIG.webPort} 被占用`);
    process.exit(1);
  }
  success(`端口 ${CONFIG.apiPort} (API) 和 ${CONFIG.webPort} (Web) 可用`);
  console.log('');

  // Step 4: 启动后端服务
  log('[4/4] 启动服务...');
  log('  → 正在启动 API 服务...');

  // 启动 Hono 后端
  const backend = spawn('node', ['dist/boot.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(CONFIG.apiPort),
    },
    stdio: 'pipe',
  });

  backend.stdout.on('data', (data) => {
    const str = data.toString().trim();
    if (str) log(`[后端] ${str}`);
  });
  backend.stderr.on('data', (data) => {
    const str = data.toString().trim();
    if (str) error(`[后端] ${str}`);
  });
  backend.on('close', (code) => {
    if (code !== 0 && code !== null) {
      error(`后端进程异常退出 (code: ${code})`);
    }
  });

  // 等待后端就绪
  const apiReady = await waitForService(CONFIG.apiPort);
  if (!apiReady) {
    error('后端服务启动超时 (30s)');
    backend.kill();
    process.exit(1);
  }
  success(`API 服务已启动: http://localhost:${CONFIG.apiPort}`);

  // 启动前端静态服务器
  log('  → 正在启动前端服务...');
  const express = require('express');
  const app = express();
  
  // API 代理
  const { createProxyMiddleware } = require('http-proxy-middleware');
  app.use('/api', createProxyMiddleware({
    target: `http://localhost:${CONFIG.apiPort}`,
    changeOrigin: true,
  }));
  
  // 静态文件
  app.use(express.static(CONFIG.buildDir));
  
  // SPA 路由回退
  app.get('*', (req, res) => {
    res.sendFile(path.join(CONFIG.buildDir, 'index.html'));
  });

  const server = app.listen(CONFIG.webPort, () => {
    success(`前端服务已启动: http://localhost:${CONFIG.webPort}`);
    console.log('');

    // 打开浏览器
    const url = `http://localhost:${CONFIG.webPort}`;
    log('═══════════════════════════════════════');
    log('       启动成功！');
    log('═══════════════════════════════════════');
    log(`  应用地址: ${url}`);
    log(`  API 地址: http://localhost:${CONFIG.apiPort}`);
    log(`  数据文件: ${getDataPath()}`);
    log('');
    log('  快捷键:');
    log('    Ctrl+C  停止服务');
    log('');

    if (!noOpen) {
      log('正在打开浏览器...');
      openBrowser(url);
    }
  });

  // 优雅退出
  process.on('SIGINT', () => {
    log('正在关闭服务...');
    backend.kill();
    server.close();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    backend.kill();
    server.close();
    process.exit(0);
  });
}

// 获取数据文件路径
function getDataPath() {
  const os = require('os');
  const platform = process.platform;
  let baseDir;
  if (platform === 'win32') {
    baseDir = path.join(os.homedir(), 'AppData', 'Roaming', 'novel-workbench');
  } else if (platform === 'darwin') {
    baseDir = path.join(os.homedir(), 'Library', 'Application Support', 'novel-workbench');
  } else {
    baseDir = path.join(os.homedir(), '.config', 'novel-workbench');
  }
  return path.join(baseDir, 'data.db');
}

// 检查是否需要安装 http-proxy-middleware
function checkProxyMiddleware() {
  try {
    require('http-proxy-middleware');
    return true;
  } catch {
    return false;
  }
}

// 运行前检查
if (!checkProxyMiddleware()) {
  log('正在安装必要的依赖...');
  const install = spawn('npm', ['install', 'express', 'http-proxy-middleware', '--no-save'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
  });
  install.on('close', (code) => {
    if (code === 0) {
      main();
    } else {
      error('依赖安装失败');
      process.exit(1);
    }
  });
} else {
  main();
}

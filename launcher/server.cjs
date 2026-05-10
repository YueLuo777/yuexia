#!/usr/bin/env node
/**
 * 月下写作 - 本地服务器
 * 同时提供 API 服务和前端静态文件服务
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const PORT = process.env.PORT || 34568;
const API_PORT = process.env.API_PORT || 34567;
const BUILD_DIR = path.join(__dirname, '..', 'dist', 'public');

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

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
  const indexPath = path.join(BUILD_DIR, 'index.html');
  const srcDir = path.join(__dirname, '..', 'src');
  const apiDir = path.join(__dirname, '..', 'api');

  if (!fs.existsSync(indexPath)) {
    console.log('[启动器] 前端文件未构建，正在构建...');
    return runBuild();
  }

  const distMtime = fs.statSync(indexPath).mtimeMs;
  const srcMtime = getDirLatestMtime(srcDir);
  const apiMtime = getDirLatestMtime(apiDir);
  const latestSrc = Math.max(srcMtime, apiMtime);

  if (latestSrc > distMtime) {
    console.log('[启动器] 检测到源码有更新，正在重新构建...');
    return runBuild();
  }

  console.log('[启动器] 前端文件已构建且为最新');
  return Promise.resolve();
}

function runBuild() {
  const result = spawn('npm', ['run', 'build'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
  });
  return new Promise((resolve, reject) => {
    result.on('close', (code) => {
      if (code !== 0) {
        console.error('[启动器] 构建失败');
        process.exit(1);
      }
      console.log('[启动器] 构建完成');
      resolve();
    });
  });
}

// 启动后端 API 服务
function startBackend() {
  return new Promise((resolve, reject) => {
    const backend = spawn('node', ['dist/boot.js'], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(API_PORT),
      },
      stdio: 'pipe',
    });

    let started = false;
    backend.stdout.on('data', (data) => {
      const str = data.toString().trim();
      if (str) console.log(`[后端] ${str}`);
      if (str.includes('Server running') || str.includes('localhost')) {
        started = true;
        resolve(backend);
      }
    });

    backend.stderr.on('data', (data) => {
      const str = data.toString().trim();
      if (str) console.error(`[后端] ${str}`);
    });

    backend.on('error', reject);

    backend.on('close', (code) => {
      if (!started && code !== 0) {
        reject(new Error(`后端进程退出，code=${code}`));
      }
    });

    // 超时检查
    setTimeout(() => {
      if (!started) {
        // 即使没收到stdout消息，也尝试继续
        started = true;
        resolve(backend);
      }
    }, 3000);
  });
}

// 等待后端就绪
async function waitForBackend(maxWait = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch(`http://localhost:${API_PORT}/health`);
      if (res.ok) return true;
    } catch { /* 还没就绪 */ }
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

// 创建主服务器（静态文件 + API 代理）
function createServer() {
  return http.createServer(async (req, res) => {
    const url = req.url || '/';

    // API 请求代理到后端
    if (url.startsWith('/api/')) {
      try {
        const response = await fetch(`http://localhost:${API_PORT}${url}`, {
          method: req.method,
          headers: Object.fromEntries(
            Object.entries(req.headers).filter(([k]) => 
              !['host', 'connection'].includes(k.toLowerCase())
            )
          ),
          body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : req,
        });
        
        res.writeHead(response.status, Object.fromEntries(response.headers));
        const body = await response.arrayBuffer();
        res.end(Buffer.from(body));
      } catch (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '后端服务暂时不可用', detail: err.message }));
      }
      return;
    }

    // 静态文件服务
    let filePath = path.join(BUILD_DIR, url === '/' ? 'index.html' : url);
    
    // 如果请求的是目录或不带扩展名的路径，尝试加 .html 或返回 index.html
    if (!path.extname(filePath)) {
      const htmlPath = filePath + '.html';
      if (fs.existsSync(htmlPath)) {
        filePath = htmlPath;
      } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
        filePath = path.join(filePath, 'index.html');
      } else {
        // SPA 路由：返回 index.html
        filePath = path.join(BUILD_DIR, 'index.html');
      }
    }

    // 安全检查：确保在 BUILD_DIR 内
    const resolved = path.resolve(filePath);
    const buildResolved = path.resolve(BUILD_DIR);
    if (!resolved.startsWith(buildResolved)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // 文件不存在，返回 index.html（SPA 支持）
          const indexPath = path.join(BUILD_DIR, 'index.html');
          fs.readFile(indexPath, (err2, indexData) => {
            if (err2) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Not Found');
              return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexData);
          });
          return;
        }
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }

      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
      res.end(data);
    });
  });
}

// 自动打开浏览器
function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' :
              platform === 'win32' ? 'start ""' :
              'xdg-open';
  require('child_process').exec(`${cmd} "${url}"`, (err) => {
    if (err) console.log(`[启动器] 请手动打开浏览器访问: ${url}`);
  });
}

// 主入口
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║         月下写作 - 本地启动器            ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  // 检查构建文件
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('[启动器] ✗ 前端文件未构建，请先运行: npm run build');
    console.error('         或运行: npm install && npm run build');
    process.exit(1);
  }

  // 检查源码是否有更新，需要重新构建
  await checkBuild();

  // 检查数据库文件位置
  const os = require('os');
  const dataDir = process.platform === 'win32'
    ? path.join(os.homedir(), 'AppData', 'Roaming', 'novel-workbench')
    : process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Application Support', 'novel-workbench')
    : path.join(os.homedir(), '.config', 'novel-workbench');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`[启动器] 创建数据目录: ${dataDir}`);
  }

  // 启动后端
  console.log('[启动器] 正在启动后端服务...');
  let backend;
  try {
    backend = await startBackend();
    console.log('[启动器] ✓ 后端进程已启动');
  } catch (err) {
    console.error(`[启动器] ✗ 启动后端失败: ${err.message}`);
    process.exit(1);
  }

  // 等待后端就绪
  console.log('[启动器] 等待后端服务就绪...');
  const ready = await waitForBackend();
  if (ready) {
    console.log(`[启动器] ✓ 后端 API 就绪: http://localhost:${API_PORT}`);
  } else {
    console.log('[启动器] ! 后端响应较慢，继续尝试...');
  }

  // 启动主服务器
  const server = createServer();
  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║           ✅ 启动成功！                  ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  应用地址: ${url.padEnd(33)}║`);
    console.log(`║  API 地址: http://localhost:${API_PORT}${' '.repeat(26 - String(API_PORT).length)}║`);
    console.log(`║  数据文件: ${path.join(dataDir, 'data.db').padEnd(33)}║`);
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log('  按 Ctrl+C 停止服务');
    console.log('');

    // 自动打开浏览器
    if (!process.argv.includes('--no-open')) {
      console.log('[启动器] 正在打开浏览器...');
      setTimeout(() => openBrowser(url), 800);
    }
  });

  // 优雅退出
  const shutdown = () => {
    console.log('\n[启动器] 正在关闭服务...');
    if (backend) backend.kill();
    server.close(() => {
      console.log('[启动器] 已关闭');
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error(`[启动器] 错误: ${err.message}`);
  process.exit(1);
});

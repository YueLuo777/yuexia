// 月下写作 - 开发模式启动器（自动检测浏览器关闭并停服）
const { spawn, exec } = require('child_process');
const http = require('http');

const PORT = 3000;
const POLL_INTERVAL = 3000;   // 3秒轮询一次
const IDLE_GRACE = 15000;     // 客户端为0后等待15秒再停服

let idleSince = null;

function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data.trim()));
    }).on('error', reject);
  });
}

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      await fetch(`http://localhost:${PORT}/`);
      console.log('[启动器] 开发服务器已就绪');
      return true;
    } catch {}
    await sleep(1500);
  }
  console.error('[启动器] 等待服务器超时');
  return false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('[启动器] 正在启动开发服务器...');

  // 启动 Vite 开发服务器
  const vite = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname + '/..',
  });

  const ready = await waitForServer();
  if (!ready) {
    vite.kill();
    process.exit(1);
  }

  // 打开浏览器
  console.log('[启动器] 正在打开浏览器...');
  exec(`start http://localhost:${PORT}`);

  // 等待浏览器连接（给浏览器几秒时间建立 HMR WebSocket）
  await sleep(3000);

  console.log('[启动器] 开始监控浏览器连接状态...');
  console.log('[启动器] 关闭所有浏览器标签页后将自动停止服务器');

  // 轮询 HMR 客户端数量
  while (true) {
    await sleep(POLL_INTERVAL);

    let count;
    try {
      const result = await fetch(`http://localhost:${PORT}/__hmr_clients`);
      count = parseInt(result, 10);
      if (isNaN(count)) count = 0;
    } catch {
      // 服务器可能已停止
      console.log('[启动器] 服务器已停止');
      break;
    }

    if (count === 0) {
      if (idleSince === null) {
        idleSince = Date.now();
        console.log('[启动器] 未检测到浏览器连接，等待 %d 秒后自动停服...', IDLE_GRACE / 1000);
      }
      const elapsed = Date.now() - idleSince;
      if (elapsed >= IDLE_GRACE) {
        console.log('[启动器] 浏览器已关闭，正在停止开发服务器...');
        vite.kill('SIGTERM');
        // 给进程2秒优雅退出时间
        await sleep(2000);
        try { vite.kill('SIGKILL'); } catch {}
        console.log('[启动器] 开发服务器已停止');
        process.exit(0);
      }
    } else {
      if (idleSince !== null) {
        console.log('[启动器] 检测到 %d 个浏览器连接，取消停服倒计时', count);
      }
      idleSince = null;
    }
  }
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

main().catch((err) => {
  console.error('[启动器] 错误:', err);
  process.exit(1);
});

// Novel Workbench - Dev mode launcher (HMR + auto shutdown on browser close)

const { spawn, exec } = require('child_process');
const http = require('http');

const PORT = 17328;
const POLL_INTERVAL = 3000;
const IDLE_GRACE = 15000;

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
      console.log('[Launcher] Dev server is ready');
      return true;
    } catch {}
    await sleep(1500);
  }
  console.error('[Launcher] Timeout waiting for dev server');
  return false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('[Launcher] Starting Vite dev server...');

  const vite = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname + '/..',
    windowsHide: true,
  });

  const ready = await waitForServer();
  if (!ready) {
    vite.kill();
    process.exit(1);
  }

  console.log('[Launcher] Opening browser...');
  exec(`start http://localhost:${PORT}`, { windowsHide: true });

  // Wait for browser to connect and establish HMR WebSocket
  await sleep(3000);

  console.log('[Launcher] Monitoring browser connection...');
  console.log('[Launcher] Will auto-stop server when browser closes');

  // Monitor HMR client count
  while (true) {
    await sleep(POLL_INTERVAL);

    let count;
    try {
      const result = await fetch(`http://localhost:${PORT}/__hmr_clients`);
      count = parseInt(result, 10);
      if (isNaN(count)) count = 0;
    } catch {
      console.log('[Launcher] Server connection lost');
      break;
    }

    if (count === 0) {
      if (idleSince === null) {
        idleSince = Date.now();
        console.log('[Launcher] No browser connected, waiting %d seconds before shutdown...', IDLE_GRACE / 1000);
      }
      const elapsed = Date.now() - idleSince;
      if (elapsed >= IDLE_GRACE) {
        console.log('[Launcher] Browser closed, shutting down dev server...');
        vite.kill('SIGTERM');
        await sleep(2000);
        try { vite.kill('SIGKILL'); } catch {}
        console.log('[Launcher] Dev server stopped');
        process.exit(0);
      }
    } else {
      if (idleSince !== null) {
        console.log('[Launcher] Browser reconnected (%d clients)', count);
      }
      idleSince = null;
    }
  }
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

main().catch((err) => {
  console.error('[Launcher] Error:', err);
  process.exit(1);
});
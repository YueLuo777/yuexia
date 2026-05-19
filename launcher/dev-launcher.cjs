// Novel Workbench - Dev mode launcher (HMR + auto shutdown on browser close)

const { spawn, exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 17328;
const POLL_INTERVAL = 3000;
const IDLE_GRACE = 15000;
const LOG_PATH = path.join(__dirname, 'dev-launcher.log');
const PROJECT_ROOT = path.join(__dirname, '..');
const VITE_BIN = process.platform === 'win32'
  ? path.join(PROJECT_ROOT, 'node_modules', '.bin', 'vite.cmd')
  : path.join(PROJECT_ROOT, 'node_modules', '.bin', 'vite');

let idleSince = null;

function writeLogLine(level, message) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  fs.appendFileSync(LOG_PATH, `${line}\n`);
}

function log(message) {
  console.log(message);
  writeLogLine('INFO', message);
}

function logError(message) {
  console.error(message);
  writeLogLine('ERROR', message);
}

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
      log('[Launcher] Dev server is ready');
      return true;
    } catch {}
    await sleep(1500);
  }
  logError('[Launcher] Timeout waiting for dev server');
  return false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  fs.writeFileSync(LOG_PATH, '');

  if (!fs.existsSync(VITE_BIN)) {
    logError('[Launcher] Missing local dependencies: node_modules/.bin/vite not found');
    logError('[Launcher] Run "cmd /c npm install" in the project root, then retry');
    process.exit(1);
  }

  log('[Launcher] Starting Vite dev server...');

  const vite = process.platform === 'win32'
    ? spawn('cmd.exe', ['/d', '/s', '/c', 'npm run dev'], {
        stdio: 'inherit',
        shell: false,
        cwd: PROJECT_ROOT,
        windowsHide: true,
      })
    : spawn('npm', ['run', 'dev'], {
        stdio: 'inherit',
        shell: false,
        cwd: PROJECT_ROOT,
        windowsHide: true,
      });

  vite.on('error', (err) => {
    logError(`[Launcher] Failed to start npm: ${err.message}`);
  });

  const ready = await waitForServer();
  if (!ready) {
    vite.kill();
    process.exit(1);
  }

  log('[Launcher] Opening browser...');
  exec(`start http://localhost:${PORT}`, { windowsHide: true });

  // Wait for browser to connect and establish HMR WebSocket
  await sleep(3000);

  log('[Launcher] Monitoring browser connection...');
  log('[Launcher] Will auto-stop server when browser closes');

  // Monitor HMR client count
  while (true) {
    await sleep(POLL_INTERVAL);

    let count;
    try {
      const result = await fetch(`http://localhost:${PORT}/__hmr_clients`);
      count = parseInt(result, 10);
      if (isNaN(count)) count = 0;
    } catch {
      log('[Launcher] Server connection lost');
      break;
    }

    if (count === 0) {
      if (idleSince === null) {
        idleSince = Date.now();
        log(`[Launcher] No browser connected, waiting ${IDLE_GRACE / 1000} seconds before shutdown...`);
      }
      const elapsed = Date.now() - idleSince;
      if (elapsed >= IDLE_GRACE) {
        log('[Launcher] Browser closed, shutting down dev server...');
        vite.kill('SIGTERM');
        await sleep(2000);
        try { vite.kill('SIGKILL'); } catch {}
        log('[Launcher] Dev server stopped');
        process.exit(0);
      }
    } else {
      if (idleSince !== null) {
        log(`[Launcher] Browser reconnected (${count} clients)`);
      }
      idleSince = null;
    }
  }
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

main().catch((err) => {
  logError(`[Launcher] Error: ${err.stack || err.message}`);
  process.exit(1);
});

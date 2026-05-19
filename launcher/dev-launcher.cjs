// Novel Workbench - Dev mode launcher (silent background Vite + browser open)

const { spawn, exec, execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 17328;
const OPEN_URL = `http://localhost:${PORT}/#/dashboard`;
const PROJECT_ROOT = path.join(__dirname, '..');
const LOG_PATH = path.join(__dirname, 'dev-launcher.log');
const PID_PATH = path.join(__dirname, 'dev-launcher.pid');
const VITE_ENTRY = path.join(PROJECT_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

function writeLogLine(level, message) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  fs.appendFileSync(LOG_PATH, `${line}\n`);
}

function log(message) {
  writeLogLine('INFO', message);
}

function logError(message) {
  writeLogLine('ERROR', message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${PORT}/health`, (res) => {
      const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 400;
      res.resume();
      ok ? resolve(true) : reject(new Error(`status ${res.statusCode}`));
    });
    req.on('error', reject);
    req.setTimeout(1500, () => req.destroy(new Error('timeout')));
  });
}

async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
    try {
      await fetchHealth();
      log('[Launcher] Dev server is ready');
      return true;
    } catch {
      await sleep(1500);
    }
  }
  logError('[Launcher] Timeout waiting for dev server');
  return false;
}

function openBrowser() {
  return new Promise((resolve) => {
    exec(`explorer.exe "${OPEN_URL}"`, { windowsHide: true }, () => resolve());
  });
}

function escapePsSingleQuoted(value) {
  return value.replace(/'/g, "''");
}

function spawnViteDetached() {
  return new Promise((resolve, reject) => {
    const nodePath = escapePsSingleQuoted(process.execPath);
    const vitePath = escapePsSingleQuoted(VITE_ENTRY);
    const cwdPath = escapePsSingleQuoted(PROJECT_ROOT);
    const logPath = escapePsSingleQuoted(LOG_PATH);
    const pidPath = escapePsSingleQuoted(PID_PATH);
    const psScript = [
      `$p = Start-Process -FilePath '${nodePath}' -ArgumentList '${vitePath}' -WorkingDirectory '${cwdPath}' -WindowStyle Hidden -RedirectStandardOutput '${logPath}' -RedirectStandardError '${logPath}' -PassThru`,
      `Set-Content -Path '${pidPath}' -Value $p.Id`,
      'Write-Output $p.Id',
    ].join('; ');

    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', psScript],
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        const pid = parseInt(String(stdout).trim(), 10);
        if (!pid) {
          reject(new Error(`invalid vite pid: ${stdout}`));
          return;
        }
        log(`[Launcher] Spawned Vite pid=${pid}`);
        resolve(pid);
      },
    );
  });
}

async function main() {
  fs.writeFileSync(LOG_PATH, '');

  if (!fs.existsSync(VITE_ENTRY)) {
    logError('[Launcher] Missing local dependencies: vite entry not found');
    logError('[Launcher] Run "cmd /c npm install" in the project root, then retry');
    process.exit(1);
  }

  log('[Launcher] Starting Vite dev server in background...');
  await spawnViteDetached();

  const ready = await waitForServer();
  if (!ready) {
    process.exit(1);
  }

  log(`[Launcher] Opening browser: ${OPEN_URL}`);
  await openBrowser();
  process.exit(0);
}

main().catch((err) => {
  logError(`[Launcher] Error: ${err.stack || err.message}`);
  process.exit(1);
});

import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream, existsSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] ?? 'desktop';
const port = 18328;
const baseUrl = `http://127.0.0.1:${port}/`;
const dashboardUrl = `${baseUrl}#/dashboard`;
const launcherLogFile = path.join(root, 'launcher.log');
const viteLogFile = path.join(root, 'dev-server.log');
const electronLogFile = path.join(root, 'electron-dev.log');
const pidFile = path.join(root, 'dev-server.pid');
const viteEntry = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const electronExe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const electronMain = path.join(root, 'electron', 'main.cjs');

const logStream = createWriteStream(launcherLogFile, { flags: 'a' });
const log = (message) => {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  logStream.write(line);
};

process.on('exit', () => {
  try {
    logStream.end();
  } catch {
    // ignore
  }
});

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function ensureFileExists(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} 不存在: ${filePath}`);
  }
}

function cleanupPidFile() {
  try {
    if (existsSync(pidFile)) {
      const pid = Number.parseInt(readFileSync(pidFile, 'utf8').trim(), 10);
      if (!Number.isFinite(pid) || !isProcessAlive(pid)) {
        writeFileSync(pidFile, '');
        log(`stale pid file cleared pid=${pid}`);
      }
    }
  } catch (error) {
    log(`pid file cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function isReady(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 800);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  }
}

function cleanupElectronMainProcesses() {
  try {
    execFileSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'electron.exe' -and $_.CommandLine -like '*${electronMain.replace(/\\/g, '\\\\')}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`,
    ], { stdio: 'ignore' });
    log('stale electron main processes cleaned');
  } catch {
    // ignore when there is nothing to stop
  }
}

function startVite() {
  ensureFileExists(viteEntry, 'Vite 启动文件');
  const outFd = openSync(viteLogFile, 'a');
  const child = spawn(process.execPath, [viteEntry, '--host', '127.0.0.1', '--port', String(port)], {
    cwd: root,
    detached: true,
    stdio: ['ignore', outFd, outFd],
    windowsHide: true,
  });
  writeFileSync(pidFile, String(child.pid));
  child.unref();
  log(`vite started pid=${child.pid}`);
}

function startElectron(loadDist = false) {
  ensureFileExists(electronExe, 'Electron 可执行文件');
  ensureFileExists(electronMain, 'Electron 主进程文件');
  cleanupElectronMainProcesses();
  const outFd = openSync(electronLogFile, 'a');
  const child = spawn(electronExe, [electronMain], {
    cwd: root,
    detached: true,
    stdio: ['ignore', outFd, outFd],
    windowsHide: true,
    env: {
      ...process.env,
      ...(loadDist ? { XINYUEXIA_LOAD_DIST: '1' } : {}),
    },
  });
  child.unref();
  log(`electron started pid=${child.pid} loadDist=${loadDist ? '1' : '0'}`);
}

async function ensureDevServer() {
  cleanupPidFile();

  if (await isReady(baseUrl)) {
    log('dev server already ready');
    return;
  }

  try {
    if (existsSync(pidFile)) {
      const pid = Number.parseInt(readFileSync(pidFile, 'utf8').trim(), 10);
      if (Number.isFinite(pid) && isProcessAlive(pid)) {
        log(`vite process already running pid=${pid}`);
      } else {
        log(`vite pid file stale pid=${pid}`);
        startVite();
      }
    } else {
      startVite();
    }
  } catch (error) {
    log(`failed to start vite: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }

  for (let i = 0; i < 160; i += 1) {
    if (await isReady(baseUrl)) {
      log('dev server ready');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('dev server timeout');
}

async function ensureElectronWindow(loadDist = false) {
  startElectron(loadDist);
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

async function main() {
  log(`launcher mode=${mode} root=${root} port=${port} node=${process.version}`);

  if (mode === 'dist') {
    await ensureElectronWindow(true);
    return;
  }

  await ensureDevServer();

  if (mode === 'desktop') {
    await ensureElectronWindow(false);
    return;
  }

  if (mode === 'web') {
    spawn('rundll32.exe', ['url.dll,FileProtocolHandler', dashboardUrl], {
      detached: true,
      windowsHide: true,
      stdio: 'ignore',
    }).unref();
    log(`browser opened ${dashboardUrl}`);
    return;
  }

  throw new Error(`unknown mode: ${mode}`);
}

main().catch((error) => {
  log(`launcher error: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exitCode = 1;
});

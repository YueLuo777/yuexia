# 开发启动器排障记录

本文件用于记录“开发启动器 / 本地热更新网页”相关问题、现象、根因和处理办法。

## 使用约定

1. 遇到启动器、热更新、刷新后打不开、端口占用、闪 CMD 窗口这类问题时，先搜索本文件。
2. 先对照“现象”和“已知处理”，确认是不是重复问题，再开始改代码。
3. 新问题解决后，继续往本文件追加，不要另起平行记录。

## 2026-05-19 已记录问题

### 1. 双击开发启动器会闪两个 CMD / 控制台窗口

- 现象：
  双击 `开发启动器.vbs` 后，页面虽然能打开，但会短暂闪出两个控制台窗口。
- 已知原因：
  早期链路里同时存在 `.vbs -> cmd/node -> vite` 的多层启动，端口检测还会额外调用一次 `cmd /c netstat`。
- 当前处理：
  - `开发启动器.vbs` 改为隐藏执行 `launcher/dev-launcher.ps1`
  - `dev-launcher.ps1` 再用 `Start-Process -WindowStyle Hidden` 拉起 `node vite.js`
  - `.vbs` 的端口检测改为直接访问 `http://127.0.0.1:17328/health`，不再调用 `cmd /c netstat`
  - 新增 `launcher/vbs-launcher.log`、`launcher/dev-launcher.log`、`launcher/dev-vite.stdout.log`、`launcher/dev-vite.stderr.log`
- 后续排查优先级：
  1. 先看 `vbs-launcher.log`
  2. 再看 `dev-launcher.log`
  3. 最后看 `dev-vite.stdout.log` / `dev-vite.stderr.log`

### 2. 第一次打开正常，刷新后容易出现“无法访问此页面”

- 现象：
  首次启动能打开网页，但刷新后偶发无法访问。
- 已知原因：
  `localhost` 在本机环境下可能落到 `::1`，而部分检测或浏览器请求会走 `127.0.0.1`，导致监听地址和访问地址不一致。
- 当前处理：
  - `vite.config.ts` 明确设置 `server.host = '127.0.0.1'`
  - 启动器打开地址统一为 `http://127.0.0.1:17328/#/dashboard`
  - 健康检查统一访问 `http://127.0.0.1:17328/health`

### 3. 需要热更新模式，而不是一次性静态网页

- 现象：
  需要“修改代码后网页自动更新，或者刷新后能看到新效果”的开发模式。
- 已知状态：
  当前链路是 Vite 开发服务器模式，不是静态构建模式。
- 验证点：
  - `vite.config.ts` 中 `server.hmr = true`
  - `vite.config.ts` 中 `server.watch.usePolling = true`
  - 启动后会在 `dev-vite.stdout.log` 中看到 Vite ready 日志

### 4. 提炼剧情页拖拽跨区不明显

- 现象：
  模块从“系统指令”拖到“输出模块”时，目标区高亮不够明显。
- 当前处理：
  - 两个区恢复为共享 `DndContext`
  - 增加跨区投放提示
  - 系统区用琥珀色高亮，输出区用天蓝色高亮

## 当前相关文件

- `开发启动器.vbs`
- `启动器2.vbs`
- `start-dev.vbs`
- `launcher/dev-launcher.ps1`
- `launcher/dev-launcher.log`
- `launcher/dev-vite.stdout.log`
- `launcher/dev-vite.stderr.log`
- `launcher/vbs-launcher.log`
- `vite.config.ts`

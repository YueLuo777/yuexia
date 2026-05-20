# xinyuexia 问题记录

## 启动器会闪出 CMD

- 现象：双击启动器时会短暂弹出 CMD 窗口。
- 原因：启动链路里混用了 `cmd.exe`、Vite 和 Electron。
- 处理：统一改为根目录 `launch-xinyuexia.mjs` 托管，`start-xinyuexia.vbs` / `start-xinyuexia-web.vbs` / `start-xinyuexia-dist.vbs` 只做静默调用。
- 验证：`web / desktop / dist` 三种模式都已能从根级脚本拉起。

## 开发版启动器无法启动

- 现象：用户反馈 `新月下开发版软件启动器.vbs` 无法启动。
- 原因：
- 旧版 VBS 直接调用 `node.exe`，依赖系统 PATH，双击场景下不稳定。
- 启动脚本和 Vite / Electron 共用一个日志文件，Windows 下会出现 `EBUSY` 文件锁。
- 处理：
- VBS 改为优先查找绝对 Node 路径，再调用根目录 `launch-xinyuexia.mjs`。
- 启动日志拆分为 `launcher.log`、`dev-server.log`、`electron-dev.log`，避免文件锁死。
- `dist` 模式也纳入同一套根级启动脚本。
- 验证：
- `node launch-xinyuexia.mjs web`
- `node launch-xinyuexia.mjs desktop`
- `node launch-xinyuexia.mjs dist`

## 启动日志已补强

- 现象：之前只能看到“没启动”，无法区分卡在 Vite、PID 文件还是 Electron。
- 处理：启动脚本记录模式、根目录、端口、Node 版本、Vite PID、Electron PID 和 PID 清理结果。
- 结果：排查时可以直接查看 `launcher.log`、`dev-server.log` 和 `electron-dev.log`。

## 提炼剧情刷新报错

- 现象：`/extract` 刷新后曾出现 React Hook 相关报错。
- 原因：第三方拖拽库与热更新冲突。
- 处理：改成项目内原生拖拽实现，并增强长按拖拽和跨区提示。
- 验证：`npm run verify` 通过。

## 旧入口对齐

- 现象：新项目里部分旧入口缺失，或只有占位页。
- 处理：补齐 `tag-zone`、`call-data`、`button-test`，并保留 `/script-editor-v2` 独立入口。
- 验证：路由都可正常打开。

## 工作台占位文案清理

- 现象：工作台信息弹窗里保留了旧版占位文案。
- 处理：改成真实作品信息、时间、位置和简介展示。
- 验证：`WorkbenchPage` 可直接显示真实作品数据。

## 首页和导航假入口

- 现象：首页“编辑工作台 / 卡片设置”和左侧“导航设置”之前没有实际功能。
- 处理：补了首页卡片设置弹窗、导航设置弹窗，并加上顺序调整、显隐和恢复默认。
- 验证：页面入口可直接使用。

## 作品库空按钮

- 现象：作品卡片设置、封面、导入、导出、回收站刷新等按钮最初只是空壳。
- 处理：补齐作品卡片设置、封面编辑、单作品导出、JSON 导入和回收站刷新。
- 验证：`NovelLibraryPage` 已形成完整链路。

## Electron 生产态打包

- 现象：最初只有开发态 Electron 壳，没有正式桌面交付链路。
- 处理：
- `electron/main.cjs` 同时支持开发态 URL 和本地 `dist`。
- 新增 `desktop:dist`、`pack:win`。
- `electron-builder` 使用本地 `node_modules/electron/dist`。
- 关闭 `signAndEditExecutable`，绕开当前机器的签名链权限问题。
- 验证：
- `npm run verify` 通过。
- `npm run pack:win` 成功。
- 产物输出到 `release/新月下写作 0.1.0.exe`。

## PowerShell 中文乱码

- 现象：`Get-Content` 输出中文时会显示为乱码。
- 原因：PowerShell 控制台编码显示问题，不代表源文件损坏。
- 处理：优先用 TypeScript / Vite 校验文件，不只看控制台输出。
- 验证：页面功能正常，构建通过。

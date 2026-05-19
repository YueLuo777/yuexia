# xinyuexia 问题记录

## 启动器双击闪出 CMD

- 现象：双击启动器时出现 CMD 窗口，严重时会重复拉起多个开发服务。
- 原因：直接通过批处理或可见 cmd 启动 Vite，会暴露控制台窗口；只打开浏览器时也不是桌面软件体验。
- 处理：使用 `start-xinyuexia.vbs` 静默启动；启动前先检测 `127.0.0.1:18328` 是否可访问，再检测是否已有 `xinyuexia` 的 Vite 进程，最后打开 Electron 桌面窗口。
- 验证：运行 `cscript //nologo start-xinyuexia.vbs` 后，端口 `18328` 保持单个监听进程，网页可打开。

## 浏览器窗口和桌面软件的区别

- 开发网页入口：`start-xinyuexia-web.vbs`，会打开系统浏览器，适合调试。
- 桌面软件入口：`start-xinyuexia.vbs` 或 `新月下开发启动器.vbs`，会打开 Electron 独立窗口，用户看到的是 PC 软件壳。
- 当前阶段仍使用 Vite 开发服务提供热更新；后续打包 exe 时再改为加载本地 `dist`。

## 提炼剧情页刷新后报错

- 现象：`/extract` 曾出现第三方拖拽库相关的 React hook 错误。
- 原因：引入拖拽库后，开发服务热更新过程中出现 React hook 运行时冲突。
- 处理：移除第三方拖拽库，改为项目内原生 HTML5 拖拽实现，减少依赖和运行时风险。
- 验证：`npm run check`、`npm run build` 通过；浏览器打开 `/extract` 无控制台错误。

## PowerShell 显示中文乱码

- 现象：`Get-Content` 输出中文显示为乱码，看起来像文件损坏。
- 原因：PowerShell 控制台编码显示问题，不代表源文件实际编码损坏。
- 处理：以 UTF-8 方式读取或直接通过 TypeScript/Vite 校验文件；不要仅凭控制台显示判断中文文件损坏。
- 验证：页面中文正常显示，`npm run check` 通过。

# xinyuexia

`xinyuexia` 是独立于 `yuexia` 的新项目。

## 核心原则

1. 不直接修改上层 `yuexia` 现有业务文件。
2. `xinyuexia` 需要复用旧项目能力时，只复制所需代码到本项目内。
3. 所有新架构、新页面、新启动方式、新桌面化方案都只在 `xinyuexia/` 内实现。
4. 目标是在尽量贴近旧 UI 和交互的前提下，重建一个更稳定、可维护、低耦合的新工程。

## 当前能力

- 主功能路由已接通：作品库、工作台、提炼剧情、剧情库、资料库、提示词、模型、脑洞、大纲、脑洞库、云端设置。
- 启动器支持开发态桌面壳和网页调试入口。
- Electron 支持开发态 URL 加载，也支持本地 `dist` 生产态加载。
- 已提供 Windows 便携包打包脚本。

## 常用命令

- 开发网页：`npm run dev`
- 开发桌面壳：`npm run desktop`
- 生产态桌面壳：`npm run desktop:dist`
- 校验：`npm run verify`
- 便携包打包：`npm run pack:win`

## 启动入口

- 开发态桌面：`start-xinyuexia.vbs`
- 开发态网页：`start-xinyuexia-web.vbs`
- 本地 dist 桌面：`start-xinyuexia-dist.vbs`
- 根级启动脚本：`launch-xinyuexia.mjs`
- 便携包输出：`release/新月下写作 0.1.0.exe`

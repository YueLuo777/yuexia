# xinyuexia 架构方案

## 目标

在不修改 `yuexia` 原项目的前提下，构建一个新的、独立的前端/桌面化基础工程。

## 设计原则

1. 单向复制
   只允许从 `yuexia` 复制代码进入 `xinyuexia`，不反向修改。
2. 模块边界清晰
   页面、状态、组件、样式、启动逻辑分层组织。
3. 小文件、低耦合
   避免继续出现巨型页面文件。
4. 稳定优先
   先保证可编译、可启动、可验证，再做功能增强。
5. UI 一致
   样式、颜色、按钮布局、视觉结构与原项目保持一致。

## 目录规划

```text
xinyuexia/
  docs/
  scripts/
  src/
    app/
    features/
      dashboard/
      extract/
      novels/
    pages/
    shared/
      layout/
      styles/
      ui/
```

## 分层说明

### `src/app`

- 应用入口
- 路由装配
- Provider 装配
- 全局错误边界

### `src/features`

按业务模块拆分：

- `dashboard`
- `extract`
- `novels`

每个 feature 内部再拆：

- `components`
- `hooks`
- `services`
- `types`

### `src/shared`

放跨模块复用内容：

- 通用 UI 组件
- 布局壳
- 样式变量
- 工具函数

## 迁移策略

1. 先复制基础样式和布局骨架
2. 再复制页面入口
3. 再按功能复制局部逻辑
4. 每复制一个模块，就在 `xinyuexia` 内重新整理结构

## 质量底线

1. 新文件统一 UTF-8 无 BOM
2. 每次迁移后必须先保证 Babel/TS 可解析
3. 复杂页面优先拆组件，不允许继续堆成单文件巨石
4. 不在未验证状态下叠加多个改动方向


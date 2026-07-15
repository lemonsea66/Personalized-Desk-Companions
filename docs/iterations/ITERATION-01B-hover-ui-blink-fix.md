# Iteration 01B：Hover 控件与小狗闪线修正

## 状态

已完成，等待用户验收。

## 目标

- 只有鼠标移动到桌宠窗口上，或键盘 focus 到桌宠控件时，才显示顶部状态栏和底部互动按钮。
- 底部互动按钮视觉尺寸放大为当前版本的两倍。
- 修复小狗每隔几秒脸上闪过黑色折线的问题。

## 判断

黑色折线大概率来自 `cute-dog` 生成脚本里的 blink/sleeping 本地叠加线条。状态机每隔几秒进入 blink，导致线条短暂显示在小狗脸上。本轮移除这类跨脸闭眼提示，blink 只做轻量帧切换，不再绘制额外黑线。

## 允许修改范围

```text
assets/pet/cute-dog/generate-assets.mjs
assets/pet/cute-dog/*.png
apps/desktop/src/styles.css
docs/iterations/ITERATION-01B-hover-ui-blink-fix.md
```

如验证发现必须触及其他文件，需要先在本文档记录原因。

## 非目标

- 不改变后端状态规则。
- 不改变形象库、头像注册、Tauri 窗口尺寸或托盘行为。
- 不新增动作、聊天、RAG、窗口分析或其他产品功能。
- 不重新生成 AI 小狗主图，只基于现有透明源图重建帧。

## 验收点

1. 默认不显示顶部状态栏和底部按钮。
2. 鼠标 hover 到桌宠窗口或控件 focus 时显示状态栏和按钮。
3. 底部按钮视觉尺寸为当前版本两倍。
4. 小狗 blink 时不再出现黑色折线穿过脸。
5. 资源校验、前端构建和桌面运行验证通过。

## 完成记录

实际修改：

- `apps/desktop/src/styles.css`
  - 顶部状态栏和底部互动按钮默认隐藏。
  - `.pet-window:hover` 与 `.pet-window:focus-within` 时显示状态栏和按钮。
  - 底部互动按钮从 `36px` 放大到 `72px`，在主窗口 `0.5` 缩放后视觉尺寸为当前版本两倍。
- `assets/pet/cute-dog/generate-assets.mjs`
  - 删除 `addClosedEyeHint` 黑色折线叠加。
  - `blink.png` 改为轻微缩放/位移帧，不再画额外黑线。
  - `sleeping.png` 保留金色 `Z` 提示，但不再叠加黑色闭眼折线。
- 重新生成 `assets/pet/cute-dog/*.png`。

验证命令：

- `npm --workspace apps/desktop run assets:generate`
- `npm --workspace apps/desktop run assets:check`
- `npm run build`

验证结果：

- `cute-dog` 8 个动作帧通过尺寸和透明角校验。
- `blink.png` 已人工检查，无黑色折线穿过脸。
- 前端 TypeScript/Vite 构建通过。

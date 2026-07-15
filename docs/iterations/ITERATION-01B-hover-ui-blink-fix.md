# Iteration 01B：Hover 控件与小狗闪线修正

## 状态

已完成，等待用户验收。

## 目标

- 只有鼠标移动到桌宠窗口上，或键盘 focus 到桌宠控件时，才显示顶部状态栏和底部互动按钮。
- 底部互动按钮视觉尺寸放大为当前版本的两倍。
- 顶部状态栏和底部互动按钮不遮挡桌宠本体。
- 顶部心情/状态栏比当前版本略放大。
- 修复小狗每隔几秒脸上闪过黑色折线的问题。
- 形象库改为先选择卡片，再点击“切换”按钮应用。
- 睡觉状态切换到真正的睡觉小狗形态。

## 判断

黑色折线大概率来自 `cute-dog` 生成脚本里的 blink/sleeping 本地叠加线条。状态机每隔几秒进入 blink，导致线条短暂显示在小狗脸上。本轮移除这类跨脸闭眼提示，blink 只做轻量帧切换，不再绘制额外黑线。

## 允许修改范围

```text
assets/pet/cute-dog/generate-assets.mjs
assets/pet/cute-dog/*.png
assets/pet/cute-dog/source-gpt2-sleeping-transparent.png
apps/desktop/src/styles.css
apps/desktop/src/App.tsx
apps/desktop/src-tauri/tauri.conf.json
apps/desktop/src-tauri/capabilities/default.json
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
4. 顶部状态栏和底部按钮显示时不遮住小狗本体。
5. 顶部状态栏比当前版本更易读。
6. 形象库点击卡片只改变待选状态，点击“切换”按钮后才真正应用。
7. 小狗睡觉时显示趴睡/蜷睡形态。
8. 小狗 blink 时不再出现黑色折线穿过脸。
9. 资源校验、前端构建和桌面运行验证通过。

## 完成记录

实际修改：

- `apps/desktop/src/styles.css`
  - 顶部状态栏和底部互动按钮默认隐藏。
  - `.pet-window:hover` 与 `.pet-window:focus-within` 时显示状态栏和按钮。
  - 主窗口拆成真实三段布局：顶部状态区、中间 `160 x 160` 小狗区、底部按钮区。
  - 底部互动按钮视觉尺寸为 `36px`，相对 01A 缩放后的 `18px` 按钮放大两倍。
  - 顶部状态栏视觉高度为 `32px`，相对 01A 更易读。
  - 强制 Pixi canvas 使用容器 `100%` 尺寸，覆盖 Pixi 内联 `320px` 样式，避免宠物只显示左上角被裁切。
- `apps/desktop/src/App.tsx`
  - 将状态栏和互动按钮从 `.pet-stage` 缩放舞台中移出，避免负定位和窗口裁切导致按钮消失或遮挡小狗。
  - 形象库改为“选择卡片 + 切换按钮”确认式交互。
- `apps/desktop/src-tauri/tauri.conf.json`
  - 主窗口高度从 `160` 增加到 `256` logical pixels，宽度仍为 `160`，小狗本体尺寸不变。
- `apps/desktop/src-tauri/capabilities/default.json`
  - 将 `avatar-library` 加入 capability 的窗口列表，确保形象库窗口拥有同一组基础 Tauri API 权限。
- `assets/pet/cute-dog/generate-assets.mjs`
  - 删除 `addClosedEyeHint` 黑色折线叠加。
  - `blink.png` 改为轻微缩放/位移帧，不再画额外黑线。
  - `sleeping.png` 改为使用 `gpt-image-2` 生成的同风格趴睡小狗源图，并保留金色 `Z` 提示。
- `assets/pet/cute-dog/source-gpt2-sleeping-transparent.png`
  - 新增睡觉小狗透明源图，来自 `gpt-image-2` 绿幕生成后本地抠透明。
- 重新生成 `assets/pet/cute-dog/*.png`。

验证命令：

- `npm --workspace apps/desktop run assets:generate`
- `npm --workspace apps/desktop run assets:check`
- `npm run build`

验证结果：

- `cute-dog` 8 个动作帧通过尺寸和透明角校验。
- `blink.png` 已人工检查，无黑色折线穿过脸。
- 前端 TypeScript/Vite 构建通过。

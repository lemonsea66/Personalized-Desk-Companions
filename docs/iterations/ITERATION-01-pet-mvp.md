# Iteration 01：桌宠互动 MVP

## 状态

待用户确认，未开始

## 目标

交付一个断网可运行、可拖动、可互动、状态可恢复的 Windows 透明桌宠。桌宠互动不依赖 AI，用户关闭并重新启动后，心情、饥饿、精力和亲密度保持一致。

## 非目标

- 不上传照片，不生成个性化 Q 版头像。
- 不接入云端 API、本地 LLM、对话、RAG、窗口观察或 Skill。
- 不移动其他应用窗口，不读取剪贴板，不监听键盘内容。
- 不实现天气、桌宠小屋、换装、小游戏和复杂主动提醒。
- 不修改 Iteration 0 已确认的 Provider、Retriever、Skill 和 AI 模式边界。

## 允许修改范围

```text
apps/desktop/src/
apps/desktop/src-tauri/src/
apps/desktop/src-tauri/capabilities/
apps/desktop/src-tauri/tauri.conf.json
apps/desktop/package.json
backend/app/companion/
backend/app/main.py
backend/tests/companion/
contracts/events/
contracts/http/
packages/shared-types/src/
assets/pet/default/
docs/iterations/ITERATION-01-pet-mvp.md
.github/workflows/ci.yml
```

若必须修改上述范围之外的文件，先更新本方案的原因和接口影响，再实施修改。不得修改 `PROJECT_PLAN.md`、AI/记忆/Skill 契约或参考项目。

## 产品行为

### 桌面窗口

- 使用透明、无边框、置顶 Tauri 窗口，宠物之外区域保持真实透明。
- 初始大小固定为 `320 x 320`，支持拖动，位置限制在当前显示器可见区域。
- 记住上次位置；分辨率变化后自动夹取到可见区域。
- 关闭按钮行为是隐藏到托盘；只有托盘“退出”才结束应用。
- 托盘提供“显示/隐藏”“安静模式”“重置位置”“退出”。

### 默认角色资产

- 使用仓库内原创的通用透明分层角色，不使用用户照片和参考项目机器人素材。
- 资源必须是真实 Alpha PNG，并通过四角透明度和白边检查。
- 采用 `avatar_manifest.json` 的最小子集描述画布、图层、锚点、碰撞区域和动作。
- 本轮只要求通用角色；Iteration 2 再替换为照片个性化管线。

### 状态值

所有数值范围为 `0..100`：

```text
mood       默认 50
hunger     默认 20，越高表示越饿
energy     默认 80
affection  默认 0
```

- 抚摸：`mood +1`、`affection +1`，单次指针按下只计一次。
- 喂食：`hunger -10`、`mood +1`，最低为 0。
- 每 30 分钟未互动：`mood -1`，本轮只改变状态，不弹出文字提醒。
- 安静模式下停止主动动作和数值衰减，但允许用户主动抚摸与喂食。
- 所有更新使用统一 `pet.interaction` 事件并带 `schema_version`、event id 和时间。

### 动作状态

XState 管理以下动作：

```text
idle -> blink -> idle
idle -> petted -> happy -> idle
idle -> fed -> eating -> happy -> idle
idle -> sleepy -> sleeping
sleeping -> wake -> idle
idle -> angry -> idle
dragging -> dropped -> idle
```

同一时刻只允许一个主动作。用户拖动优先级最高，拖动时中断非关键动作；喂食和抚摸在动画冷却期间不能重复累计。

## 数据与 API

- SQLite 新增版本化 migration 和单例 `companion_state` 记录。
- 后端提供 `GET /api/v1/companion/state`、`POST /api/v1/companion/interactions` 和 `POST /api/v1/companion/reset`。
- API 返回标准错误结构，不把 SQLite 连接暴露到路由层。
- 前端通过 Zustand 保存服务端状态快照，XState 只处理动作生命周期。
- WebSocket 不在本轮引入；互动成功后使用 REST 响应更新快照，避免过早增加通信复杂度。

## 测试与验收

### 自动测试

- 状态上下限、抚摸、喂食、安静模式和 30 分钟衰减单元测试。
- API 成功、非法 interaction、重复 event id 和 reset 测试。
- XState 每条声明转换路径的 Vitest 测试。
- `avatar_manifest.json` schema 和 Alpha 四角像素检查。
- React 构建、pytest、Cargo check 和现有契约检查继续通过。

### 手工/视觉验收

1. 桌宠窗口透明且没有矩形底色、白边或伪棋盘格。
2. 可以拖动到屏幕四角，不能永久丢出可见区域。
3. 抚摸一次只增加 1；连续快速点击受冷却限制。
4. 喂食播放 eating/happy，状态值与 API 一致。
5. 安静模式停止主动动画和衰减。
6. 重启前后状态和窗口位置一致。
7. 托盘显示/隐藏、重置位置和退出正常。
8. 断网且无 API Key 时全部功能可用。

## 边界保护

- 先运行 Iteration 0 全套测试，记录基线，再开始修改。
- 禁止用 AI 输出替代确定性的状态计算。
- 禁止为了动画效果直接修改数据库；所有状态变化经 Companion Core。
- 不实现本方案非目标中的“顺手功能”。
- 验收通过后更新本文件完成记录，再提交并推送 GitHub。

## 风险与回退

- Tauri 透明窗口在不同 DPI 下可能出现边缘或定位偏差；保留固定画布并用真实截图验收。
- PixiJS 资源加载失败时显示明确错误状态，不回退到有背景的图片。
- SQLite 不可写时保持只读展示并报告错误，不在前端伪造持久化成功。
- 托盘或窗口能力失败时回退到可见窗口和明确退出按钮，不能让进程无法关闭。

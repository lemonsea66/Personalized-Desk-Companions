# Iteration 01A：桌宠尺寸、默认小狗与形象库

## 状态

已完成，等待用户验收。

## 目标

- 主桌宠窗口初始视觉尺寸缩小为 Iteration 01 的一半。
- 安静模式图标从音量语义改为通知/免打扰语义。
- 从紧凑状态栏隐藏当前尚未参与行为计算的 `energy`。
- 移除悬浮窗口右下角蓝色服务圆点。
- 新增更贴近用户参考图风格的白色毛绒小狗作为默认形象，保持透明背景。
- 保留原有 `default-mochi-star`，建立可持久化选择的形象库。

## 边界

- 不实现照片转 Q 版、聊天、RAG、窗口分析或 Skill 系统。
- 不上传用户临时参考图，不提交绿幕中间图和生成草稿。
- 不改变心情、饥饿、亲密度、安静模式的后端数值规则。
- 不删除原有 Mochi 形象。

## 参考图与 AI 生成说明

用户确认使用外部图像模型后，本轮使用 `imagegen` 技能的 CLI fallback：

- 模型：`gpt-image-2`
- Base URL：读取用户环境变量 `OPENAI_BASE_URL`
- API Key：读取用户环境变量 `OPENAI_API_KEY`
- 生成方式：把用户给的参考图合成参考板，仅作为风格参考；提示明确要求原创小白狗，不复制文字、手指、背景、姿势或构图。
- 透明方式：`gpt-image-2` 不支持原生透明背景，因此先生成纯 `#00ff00` 绿幕背景，再用本地 chroma key helper 转成透明 PNG。
- 依赖环境：为避免安装到 C 盘，创建了 `F:\DevTools\desktop-companion-agent\imagegen-venv`，并把 pip cache 指向 `F:\DevTools\desktop-companion-agent\pip-cache`。

最终提交到仓库的是 `assets/pet/cute-dog/source-gpt2-transparent.png` 和由它生成的 320x320 动作帧；`tmp/` 与 `output/` 已加入 `.gitignore`。

## 实现内容

- Tauri 主窗口从 `320 x 320` 改为 `160 x 160` logical pixels。
- 前端新增 `pet-stage`，保留内部 `320 x 320` 设计坐标并整体缩放 `0.5`。
- 状态栏只显示心情、亲密度、饥饿。
- `energy` 仍保留在数据契约中，定义为未来跑跳消耗、睡眠恢复的桌宠活力值；当前不显示、不影响行为。
- 安静模式按钮改为 `Bell` / `BellOff`。
- 移除 `service-indicator` 蓝色圆点和 CSS。
- 新增 `avatar-library` Tauri 窗口，可从主窗口按钮和托盘“形象库”打开。
- 新增后端 Avatar Library：
  - `GET /api/v1/avatars`
  - `POST /api/v1/avatars/select`
  - `POST /api/v1/avatars/register`
- 形象选择写入 SQLite，重启后保留。
- 新增共享类型和前端 `avatarStore`。
- `PetCanvas` 支持按选中形象动态加载 manifest。
- `cute-dog` 改为完整动作帧：
  - `idle`
  - `blink`
  - `petted`
  - `happy`
  - `eating`
  - `sleeping`
  - `angry`
  - `dragging`
- `default-mochi-star` 保留在形象库中。

## 允许修改范围实际扩展

本轮额外修改 `.gitignore`，原因是 `imagegen` CLI 会产生 `tmp/` 和 `output/` 中间产物，需要防止误提交生成草稿、绿幕图和临时参考板。

## 验证记录

- `npm --workspace apps/desktop run assets:generate`
- `npm --workspace apps/desktop run assets:check`
- `npm run check:frontend`
- `npm run check:contracts`
- `npm run build`
- `backend\.venv\Scripts\python.exe -m pytest backend/tests`
- `npm --workspace apps/desktop test`
- `cargo check --offline`
- `.\scripts\start_dev.ps1`

验证结果：

- 资源生成通过，`cute-dog` 8 个动作帧均为 320x320 透明 PNG。
- 前端构建通过。
- 后端 11 个测试通过。
- 桌面端 Vitest 3 个测试通过。
- Rust/Tauri `cargo check --offline` 通过。
- dev app 可启动，后端接口确认默认选中 `cute-dog`。

## 手工验收点

1. 主桌宠窗口视觉尺寸约为原来一半。
2. 默认形象是新的白色毛绒小狗。
3. 形象背景透明，没有白底、绿边或蓝色圆点。
4. 状态栏不显示精力。
5. 安静模式按钮显示铃铛/免打扰图标。
6. 主窗口可打开形象库。
7. 形象库可在“软耳小白狗”和“星星麻薯”之间切换。
8. 重启后保留上次选择。

## 遗留问题

- `gpt-image-2` 生成的是单张主形象，本轮动作帧通过本地轻量变体生成；更精细的姿势一致性可在后续 Avatar Pipeline 迭代中做。
- PowerShell 控制台显示中文 JSON 时可能出现编码乱码，但文件内容、接口数据和前端渲染使用 UTF-8。

# Desktop Companion Agent 项目总方案

## 1. 项目定位

Desktop Companion Agent 是一个 Windows 优先、透明悬浮、可个性化形象的个人工作陪伴桌宠。

它同时承担三类职责：

1. **陪伴与互动**：抚摸、喂食、动作、情绪、睡眠、小游戏和低频主动互动。
2. **工作助手入口**：用户主动询问时提供对话、窗口观察、任务拆解和提醒。
3. **可扩展 Skill 容器**：未来可以增加文献分析、报告生成、项目知识库等能力，而不修改桌宠核心。

首版以桌宠互动闭环为成功标准，工作助手和增强 RAG 后置迭代。

## 2. 已确认技术栈

### 客户端

- Tauri 2：Windows 桌面壳、透明窗口、置顶、托盘、安装包。
- React + TypeScript + Vite：设置、聊天和可视化界面。
- PixiJS：桌宠分层 PNG、动画、特效和动作编排。
- XState：桌宠行为状态机，负责状态转移和动作规则。
- Zustand：React 界面临时状态；不承担业务持久化。

### 本地服务

- Python 3.12 + FastAPI：AI 编排、记忆、Skill、窗口观察和本地 API。
- SQLite：配置、互动事件、心情、记忆索引、任务和运行日志。
- `llama.cpp`：本地对话模型和可选本地视觉模型运行时。
- SQLite FTS5：第一阶段的关键词/BM25 检索。
- 后续增强 RAG：本地 embedding + `sqlite-vec`（需在 Windows 安装包中验证）。

### AI 接入

- 所有云端模型均采用 BYOK，用户自行填写 API Key。
- 首批支持 OpenAI-compatible Chat/Reasoning/Vision 接口。
- 图像生成使用独立 `ImageProvider` 适配器，不与对话接口绑定。
- 本地模型不需要 API Key，可按需下载 GGUF 权重。

### 发布与测试

- PyInstaller：打包 FastAPI sidecar。
- Tauri NSIS：生成 Windows `.exe` 安装包，后续补 MSI。
- Vitest：前端逻辑测试。
- Playwright：透明窗口和核心交互验收。
- pytest：后端服务、状态机、检索和 Skill 契约测试。
- GitHub Actions：构建、测试和 GitHub Releases。

## 3. AI 运行模式

统一由 `ProviderRouter` 决定模型来源，业务代码不能直接调用供应商 SDK。

### 自动模式

有可用云端 API Key 时优先云端；Key 缺失、额度失败、网络失败或用户切换隐私模式时回退本地模型。回退原因必须记录到运行日志，不能静默伪造“已使用云端”。

### 完全本地模式

对话、记忆检索、窗口分析和 embedding 均在本机完成。用户的照片、截图、文档和 API Key 不出本机。

### 云端优先模式

优先使用用户配置的云端模型，减少本机资源占用。照片上传和窗口截图必须分别获得用户授权，并提供一次性发送和永久关闭选项。

### 接口边界

```text
ChatProvider       -> 对话、流式输出、可选视觉输入
EmbeddingProvider  -> 文本向量化
VisionProvider     -> 窗口/图片理解
ImageProvider      -> 角色图生成和变体生成
ProviderRouter     -> 按模式和能力选择 Provider
```

API Key 必须写入 Windows Credential Manager 或系统安全存储，禁止写入 SQLite、日志、Git、截图和诊断导出文件。

## 4. 总体架构与低耦合原则

```text
Tauri Shell
  ├─ Pet View (PixiJS)
  ├─ Settings / Chat / Skill UI (React)
  └─ Native Commands (Rust)
          │ REST + WebSocket
Local FastAPI Service
  ├─ Companion Core       心情、互动、动作事件
  ├─ Assistant Core       对话、上下文、ProviderRouter
  ├─ Memory Core          记忆仓库、检索接口、RAG
  ├─ Skill Runtime        Skill 注册、权限、执行、输出
  ├─ Observation Core     窗口捕获、视觉分析、隐私策略
  └─ Persistence          SQLite、文件资源、事件日志
```

必须遵守以下边界：

- PixiJS 不直接访问 SQLite、模型 SDK 或 Windows API。
- React 组件不直接调用供应商 SDK，只调用本地 API。
- 桌宠行为状态机不依赖具体模型；AI 只产生结构化意图或文本事件。
- Provider 不直接修改桌宠状态，只返回标准化结果。
- Skill 通过注册表和能力接口调用记忆、模型、文件和窗口能力。
- 所有跨模块通信优先使用事件或接口，不通过跨层导入内部实现。
- 持久化对象和 API schema 采用版本号，避免后续迭代破坏旧数据。

## 5. 桌宠表现与透明资源规范

### 角色生成流程

第一版不为每个动作重新调用 AI 生成整张角色图，否则脸、服装、比例和画风难以保持一致。稳定主线是“一次建立角色资产，多次组合动画”：

1. 用户上传 1–3 张清晰照片并确认处理授权。
2. 云端图像 Provider 生成一张标准 Q 版角色设定图；后续增加本地图像 Provider。
3. 本地进行主体分割、alpha matting、去白边和裁切。
4. 将角色拆成头、身体、眼睛、眉毛、嘴、手臂、腿、头发、配饰和特效等透明图层。
5. 客户端通过 PixiJS 做骨骼式 2D 动画；Canvas 只用于离屏处理和像素检查。
6. 表情由眼睛、眉毛、嘴和特效图层组合，动作由图层旋转、位移、缩放和变形完成。
7. 少数复杂动作使用预生成透明序列帧补充，但不能成为所有动作的默认方案。
8. 写入 `avatar_manifest.json`，统一角色比例、锚点、碰撞区域、图层顺序、动作和资源版本。
9. 在透明 Tauri 窗口中进行视觉验收。

这套角色资产应能够组合出几十种表现，不需要每次互动都调用图像 API。第二阶段再评估半自动分层、更多姿势生成以及 Live2D/Rive 导出；它们不能成为第一版运行时依赖。

### 透明背景硬性要求

- 所有运行时角色资源必须是真实 Alpha PNG 或带 Alpha 的 WebP。
- 不接受白底、棋盘格截图、纯色背景或仅通过 CSS 假透明的资源。
- 自动检查四角透明度、主体边缘、白边污染和安全边距。
- 头像原图、中间图、生成结果只保存在用户本机，默认不进入日志和 Git。

### 首批动作

待命呼吸、眨眼、开心、委屈、生气、睡觉、吃东西、喝水、跑出屏幕边缘、跳跃、摔倒、庆祝、被摸、被拖动、求关注。

复杂动作优先使用分层变换，只有需要连续姿态变化时才使用序列帧，避免资源规模失控。

## 6. Companion Core

桌宠核心状态与 AI 解耦，至少包含：

```text
energy       精力
mood         心情
hunger       饥饿
affection    亲密度
attention    距离上次互动的时间
focus_mode   专注/安静模式
current_act  当前动作
```

互动事件统一为结构化事件，例如：

```json
{
  "type": "pet.fed",
  "item": "snack",
  "delta": {"mood": 1, "hunger": -2},
  "source": "user_click",
  "occurred_at": "..."
}
```

行为决策由 XState 处理，持久化由 SQLite 处理，前端只订阅状态快照和动作事件。主动行为必须受冷却、安静时段、应用黑名单和用户授权控制。

真实移动工作窗口默认关闭；开启后必须支持 Esc、点击停止、应用黑名单、频率限制和全屏/敏感应用保护。

### 互动创意池

以下能力按迭代选取，不要求一次实现；每项都必须先进入对应迭代方案和验收范围：

1. 抚摸头部增加心情，连续抚摸会眯眼、脸红并抱住鼠标指针。
2. 喂食不同食物触发不同偏好、动作和短期增益。
3. 长时间未互动，从屏幕边缘探头并举“求摸摸”小牌。
4. 心情低落时缩在任务栏附近，披上小毯子睡觉。
5. 专注时间过长，端水跑来提醒休息。
6. 用户完成番茄钟后放烟花、撒彩纸或跳庆祝舞。
7. 拖动桌宠时出现滑翔、滚动、被拎起来或晕乎乎的动作。
8. 双击桌宠触发随机彩蛋动作。
9. 桌宠追逐鼠标，但鼠标移动过快时会摔倒或气喘。
10. 在屏幕边缘钓鱼、画画、看书、吃零食或搭帐篷。
11. 不同时间具有早安、午睡、下班和熬夜状态。
12. 天气变化时打伞、穿雨衣、晒太阳或堆雪人；联网天气数据需单独授权。
13. 连续切换窗口时被“甩晕”，询问用户是否需要整理当前目标。
14. 检测到编译或下载等待时，拿出小游戏陪用户等候。
15. 工作卡住时提供“拆任务、分析窗口、先休息”三个明确入口。
16. 用户说“我做完了”后记录成就，并把纪念物放进桌宠小屋。
17. 提供可收集的帽子、衣服、桌椅、食物和节日装饰。
18. 心情很高时在桌面边缘跑酷、跳跃或滑行。
19. 经授权后气鼓鼓地推走当前窗口；按 Esc、点击桌宠或移动鼠标立即停止。
20. 对会议、支付、密码管理器、远程桌面和全屏游戏自动进入安静模式。
21. 发现用户反复打开同一问题时，轻声询问是否需要一起分析。
22. 用户离开电脑后睡觉，回来时伸懒腰并显示一条简短欢迎语。
23. 桌宠偶尔藏到窗口后面，只露出眼睛观察。
24. “陪我专注”模式下安静坐在窗口角落，并随时间逐步完成一幅小画。
25. 用户允许时，把当天重要讨论整理成下班前的三行回顾。

真实移动窗口默认关闭，首次开启必须说明行为和停止方法。支付、会议、远程桌面、密码工具和全屏应用必须加入禁止恶作剧的保护范围。

## 7. Assistant Core 与工作能力

第一阶段只提供低风险、用户主动触发的能力：

- 对话陪伴。
- 当前任务记录。
- 番茄钟和休息提醒。
- 剪贴板文本整理。
- 用户指定文件的摘要和问答。
- 用户主动请求的当前窗口分析。

自动点击、自动输入、提交表单、支付、删除文件、发送消息等高风险动作不属于首版范围，后续即使增加也必须经过显式确认和权限检查。

## 8. 完整记忆与 RAG 链路

### 8.1 已确认技术栈

- SQLite 是记忆和索引的唯一事实源，使用 Python 标准库 `sqlite3` 和显式 migration，不在第一阶段引入 ORM。
- SQLite FTS5 + BM25 负责关键词、文件名和精确短语检索。
- `sqlite-vec` 负责本地向量索引；必须先通过 Windows sidecar 打包验证。
- ONNX Runtime + `fastembed` 负责本地 embedding，首选 `BAAI/bge-small-zh-v1.5` 或经中文基准测试确认的同级模型。
- 原始模型和 embedding 权重按需下载，不进入 GitHub 和安装包。
- 文档解析后续使用 `pypdf`、必要时使用 `pdfplumber`，DOCX 使用 `python-docx`，Markdown/TXT/代码使用轻量解析器。

### 8.2 记忆分层

```text
Working Memory   当前窗口、当前任务、最近对话和 Skill 临时数据
Episodic Memory  已发生的重要对话、任务、互动和窗口分析事件
Semantic Memory  经确认的用户偏好、项目事实、工作习惯和重要结论
Knowledge Memory 用户导入的 PDF、DOCX、Markdown、TXT、代码和笔记
Profile Memory   称呼、语言、工作时间、授权和交互偏好
```

Working Memory 默认短期保存；窗口观察默认不能自动写入长期 RAG。Semantic/Profile Memory 只允许用户明确要求记住、用户确认保存，或已授权 Skill 按 schema 写入。桌宠娱乐事件与工作知识必须使用不同类型和召回策略，避免互相污染。

### 8.3 端到端链路

```text
文件 / 聊天 / 明确记忆 / 窗口观察 / Skill 输出
  -> 清洗、隐私策略、内容类型识别
  -> 文档分块与 metadata
  -> SQLite 原文和来源记录
  -> FTS5 关键词索引 + embedding 向量索引
  -> 问题分析与检索查询
  -> 关键词召回 + 向量召回 + metadata 过滤
  -> 去重 + Reciprocal Rank Fusion + 可选 Reranker
  -> ContextAssembler 预算检查与截断
  -> ProviderRouter 选择本地或云端模型
  -> 带来源、引用和不确定性说明的回答
  -> 保存对话、引用和 trace
  -> 按写入策略决定是否形成长期记忆
```

### 8.4 低耦合检索接口

```text
DocumentIndexer
MemoryRepository
Retriever
  ├─ KeywordRetriever
  ├─ VectorRetriever
  ├─ HybridRetriever
  └─ Reranker
ContextAssembler
CitationBuilder
```

桌宠、Assistant 和 Skill 只能依赖这些接口，不能直接操作 FTS5、sqlite-vec、embedding 模型或数据库连接。更换向量引擎或模型时不得修改上层业务。

### 8.5 检索与上下文装配

- 混合检索使用 FTS5/BM25 与向量召回，按项目、来源、时间、应用和隐私级别过滤。
- 第一版使用 Reciprocal Rank Fusion 合并结果；独立 Reranker 作为后续可插拔能力。
- `ContextAssembler` 判断是否需要检索，执行去重、相关性排序、token 预算和来源保留。
- 模型只接收预算内的证据，不直接读取整个数据库。
- 回答必须区分当前对话事实、历史记忆、文档原文、模型推测和不确定内容。
- 检索为空或证据冲突时明确说明，禁止把模型猜测伪装成用户记忆。

### 8.6 写回、压缩与生命周期

- 原始对话先写入历史记录，长期记忆再按规则单独提取。
- 需要确认的长期记忆必须展示“是否记住”，不能后台静默写入。
- rolling summary 只用于压缩模型上下文，不能替代原文事实和引用。
- 原始历史不因摘要生成而删除；摘要失败时继续保留原始消息。
- 每条记忆记录 `source_type`、`source_id`、时间、隐私级别、项目和内容 hash。
- 用户可以删除单条记忆、会话、项目知识库、窗口观察或全部索引，并可关闭长期记忆。

### 8.7 分期实施

RAG v1 在桌宠和基础助手稳定后实现 SQLite FTS5/BM25、分层记忆、ObservationCard、metadata 过滤、来源引用和 rolling summary。RAG v2 在较后迭代加入本地 embedding、sqlite-vec、混合召回、文档知识库、项目隔离、索引重建和可插拔 Reranker。

## 9. Skill 插件体系

Skill 是独立能力包，不应修改 Companion Core 或桌面渲染代码。

### Skill 契约

```text
skills/<skill-id>/
  skill.json          元数据、版本、能力、权限
  prompts/            提示模板
  handlers/           业务处理器
  schemas/            输入输出 schema
  tests/              契约测试
  README.md           使用边界和示例
```

注册表需要记录：

- `id`、`version`、`display_name`。
- 输入/输出 schema。
- 可使用的 Provider、Retriever、文件和窗口能力。
- 是否需要网络、文件读写或用户确认。
- 是否允许后台运行和主动提醒。

### Skill 执行规则

- 默认只能被用户主动调用，不能自行扩大权限。
- 输入、输出和工具调用均经过 schema 校验。
- 不允许 Skill 直接导入数据库连接、Tauri 内部对象或供应商 SDK。
- 每次执行记录 trace、输入摘要、输出文件和错误。
- Skill 失败时返回明确错误，不生成虚构结果。
- 版本升级必须保留旧 Skill 的兼容入口或迁移说明。

### 文献分析 Skill 示例

未来可新增 `paper-report`：读取用户指定 PDF，提取文本和元数据，按模板输出研究问题、方法、实验、局限、复现建议和引用；所有结论必须标注页码或原文证据，无法确认的内容标记为“不确定”。该 Skill 只依赖 `DocumentIndexer`、`Retriever`、`ChatProvider` 和 Markdown/PDF 导出接口，不修改桌宠核心。

## 10. 迭代路线

### 产品版本里程碑

- **V0 概念验证**：透明桌宠、拖拽、基础状态机、抚摸、喂食、心情和基础聊天。
- **V1 个性化闭环**：照片转 Q 版、角色分层、10–15 个动作、托盘、设置和安装包。
- **V2 工作陪伴**：窗口感知、Work Lens、番茄钟、任务拆解、短期记忆和隐私控制。
- **V3 主动行为**：情境判断、低频提醒、窗口互动、应用黑名单和行为冷却。
- **V4 扩展生态与发布完善**：增强混合 RAG、Skill 插件、文献报告、自动更新和稳定发布；继续使用 BYOK，不引入 Pro 账号或平台代付模型费用。

产品版本描述用户可见能力；下面的 Iteration 描述工程实施步骤，两者不是一一对应关系。

### Iteration 0：环境、仓库和边界

- 安装并验证 Rust/Tauri、Node、Python、Windows WebView2 和构建工具。
- 初始化 GitHub 仓库和许可证。
- 建立 monorepo 目录、环境变量样例、`.gitignore` 和 CI 骨架。
- 建立 API schema、事件命名和资源版本规范。

验收：空壳 Tauri 能启动，FastAPI health API 可访问，前后端能完成一次健康检查，GitHub Actions 能跑基础测试。

### Iteration 1：桌宠互动 MVP

- 透明窗口、拖拽、置顶、托盘和退出。
- 分层透明角色资源加载。
- 待命、眨眼、被摸、喂食、睡觉、开心、生气等状态。
- 心情、饥饿、精力、亲密度的本地持久化。
- 低频求关注和安静模式。

验收：断网可运行；所有动作不需要 AI；重启后状态可恢复；透明背景截图通过检查。

### Iteration 2：头像个性化与资源管线

- 照片授权、上传预览、图像 Provider 抽象。
- Q 版角色生成、主体分割、去背景和 Alpha 校验。
- 头像 manifest、版本回滚和资源删除。
- 多套服装、食物和配饰接口。

验收：同一角色至少生成 10 个动作；窗口边缘无白底和明显白边；无 API Key 时能明确提示本地能力限制。

### Iteration 3：AI Provider 与基础对话

- ChatProvider、VisionProvider、ImageProvider 和 ProviderRouter。
- 自动、本地、云端优先三种模式。
- BYOK 安全存储、连接测试、错误和回退提示。
- 桌宠气泡、聊天面板和流式回复。

验收：云端失败可回退本地或明确报错；模式切换不修改桌宠核心；Key 不出现在日志和导出文件。

### Iteration 4：轻量记忆与 RAG v1

- MemoryRepository、FTS5、BM25 和来源引用。
- 用户偏好、任务、聊天和互动事件分层。
- 删除、清空和隐私级别控制。

验收：回答能够区分当前会话、长期偏好和窗口观察；检索不到时明确说不知道；基础测试覆盖来源追踪。

### Iteration 5：窗口感知与 Work Lens

- 用户授权后的窗口捕获和 ObservationCard。
- 隐私暂停、应用黑名单和截图排除。
- 仅在用户请求时做视觉分析。
- 把分析结果以引用证据形式返回，不把摘要冒充原图事实。

### Iteration 6：Skill Runtime

- Skill manifest、注册表、权限、schema 校验和 trace。
- 第一个内置 Skill：任务拆解或文件摘要。
- Skill 热加载/禁用、版本检查和失败隔离。

### Iteration 7：增强混合 RAG

- 本地 embedding、向量索引、混合召回和重排。
- 文档知识库、项目隔离、索引管理和引用。
- 性能、磁盘占用和模型下载策略评估。

### Iteration 8：文献报告 Skill 与发布完善

- `paper-report` Skill：PDF 解析、证据引用、报告 Markdown 导出。
- Playwright 全流程回归。
- 安装包、卸载、升级、日志导出和 GitHub Release。

## 11. 每轮迭代的防幻觉与边界流程

每轮迭代必须先在 `docs/iterations/` 创建方案文件，例如：

```text
docs/iterations/ITERATION-01-pet-mvp.md
```

方案文件必须包含：

- 目标与非目标。
- 允许修改的目录和文件。
- 不可修改的已完成模块。
- 接口/事件/schema 变化。
- 验收标准和测试命令。
- 已知风险、回退方案和明确不确定项。

实施前后必须执行：

1. 读取当前 Git 状态和上一轮验收记录。
2. 只修改方案中声明的范围。
3. 不为了“顺手优化”重写已验收模块。
4. 所有 AI 相关输出标记来源、模式和置信边界。
5. 失败时返回错误或“不确定”，禁止伪造成功。
6. 运行测试、构建和透明窗口截图验收。
7. 更新迭代文档中的实际变更、遗留问题和下一步。
8. 通过验收后再提交 Git，并推送 GitHub。

## 12. GitHub 仓库规则

公开仓库只包含核心代码、文档、测试、示例配置和不含隐私的测试素材。

禁止提交：

- API Key、密码、Cookie 和用户照片。
- 生成头像、聊天记录、截图和 SQLite 运行库。
- GGUF 模型、ComfyUI 模型和下载缓存。
- `.venv`、`node_modules`、构建目录和个人路径。

每轮发布建议采用：

```text
feat(iteration-01): pet interaction mvp
```

并在 GitHub Release 或迭代文档中记录版本、测试结果、已知限制和升级注意事项。

## 13. 当前不做的事情

- 默认自动控制用户电脑。
- 默认持续录屏或上传截图。
- 多用户云端同步和平台代付模型费用。
- 把所有桌宠互动事件都写入长期知识库。
- 在 RAG 尚未验证前引入复杂分布式数据库。
- 为每个动作重新调用图像模型生成图片。

## 14. 首轮实施入口

下一步从 Iteration 0 开始：只准备工具链、仓库、目录和契约，不实现完整桌宠功能。完成后再创建 `ITERATION-01-pet-mvp.md`，进入第一个可运行的互动闭环。

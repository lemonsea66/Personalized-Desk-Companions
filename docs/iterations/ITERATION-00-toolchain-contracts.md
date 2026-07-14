# Iteration 00：工具链、仓库、目录和契约

## 状态

已完成，待用户验收

## 目标

- 固定项目运行时和构建工具链。
- 初始化独立 Git 仓库，建立公开核心代码的边界。
- 建立 Tauri/React、FastAPI、契约、测试和文档目录。
- 固定跨模块事件、API、Provider、记忆和 Skill 的最小接口。
- 验证空壳前后端可以互相完成健康检查。

## 非目标

- 不实现桌宠动作、心情、喂食、抚摸或主动行为。
- 不实现头像生成、透明背景处理或 PixiJS 动画。
- 不实现云端模型、本地模型、RAG、窗口捕获或 Skill 业务逻辑。
- 不提交用户照片、生成资源、模型权重、数据库、API Key 或运行日志。
- 不创建平台代付、账号、Pro 版本或云端同步功能。

## 允许修改范围

本轮允许新增或修改：

```text
desktop-companion-agent/
  .gitignore
  .gitattributes
  .env.example
  LICENSE
  README.md
  package.json
  package-lock.json
  rust-toolchain.toml
  apps/desktop/
  backend/
  contracts/
  packages/shared-types/
  scripts/
  docs/iterations/ITERATION-00-toolchain-contracts.md
  docs/iterations/README.md
  .github/workflows/ci.yml
```

本轮不修改 `local-window-copilot-main`，不复制其运行时模型、截图、数据库或生成素材。

## 工具链基线

- Windows 10/11。
- Node.js 20+ 和 npm 10+。
- Python 3.12，使用项目虚拟环境，不使用系统 Python 3.7。
- Rust stable、Cargo、Tauri CLI。
- Windows WebView2 Runtime。
- Git 2.37+。

Rust 和 Tauri CLI 如果本轮无法安装，必须记录为明确阻塞项，不得伪造“已验证”。

## 契约基线

- 所有 JSON 契约使用 `schema_version`。
- API 使用 `/api/v1` 前缀。
- 事件使用 `domain.action` 命名，例如 `pet.interaction`、`assistant.response`。
- Provider、Retriever、Skill 只能通过接口返回标准化结果。
- 错误使用稳定的 `code`、`message`、`details` 结构。
- trace 必须记录来源、模式、耗时和失败原因，不记录 API Key。

## 验收标准

1. `node --version`、项目 Python 3.12 和 Rust/Tauri 状态可被脚本报告。
2. 前端包清单、Tauri 壳目录、FastAPI 目录和契约目录存在。
3. `GET /health` 和 `GET /api/v1/health` 返回结构化 JSON。
4. 前端能通过配置的本地 URL读取健康状态；不实现完整桌宠 UI。
5. `npm`、`pytest` 和基础契约检查命令可执行或明确报告缺失依赖。
6. Git 状态干净到只包含本轮声明的文件；敏感文件被忽略。
7. 创建 Iteration 01 方案文件，但不实现 Iteration 01 功能。

## 测试命令

```powershell
npm run check:contracts
backend\.venv\Scripts\python.exe -m pytest backend/tests
npm run check:frontend
```

## 风险与回退

- Tauri/Rust 工具链安装可能需要用户权限或 Visual Studio Build Tools；先记录状态，再决定是否补装。
- `sqlite-vec`、embedding 和模型下载不属于本轮，不因未安装而阻塞 Iteration 0。
- GitHub 远端地址和认证信息未在当前上下文提供；本轮只初始化本地仓库并准备 remote 配置说明，不上传未知远端。

## 完成记录

### 工具版本

- Node.js `20.19.5`，npm `10.8.2`。
- Python `3.12.4`，项目环境位于 `backend/.venv`。
- Rust `1.88.0`，Cargo `1.88.0`，通过 `rust-toolchain.toml` 锁定。
- Tauri CLI `2.11.4`。
- WebView2 `150.0.4078.65`。
- Git `2.37.1.windows.1`。

Rustup、Cargo registry、npm cache、pip cache 和临时构建缓存配置在 `F:\DevTools\desktop-companion-agent`；已移除本轮误装到 C 盘的 `.cargo/.rustup`。项目源码、Node workspace 和 Python 虚拟环境保留在 E 盘工作区。

### 实际交付

- 建立 Tauri 2 + React/Vite 空壳和透明 Windows 配置。
- 建立 FastAPI `/health` 与 `/api/v1/health`；因参考项目占用 `18081`，本项目固定开发端口为 `18082`。
- 建立 Event、Health、Error、Avatar、Skill JSON Schema 和 TypeScript 共享类型。
- 建立 Python Provider、Retriever、MemoryRepository、DocumentIndexer、SkillHandler Protocol；无业务实现。
- 建立公开仓库忽略规则、MIT License、CI、环境检查和透明占位图标管线。
- 初始化 `main` 分支并配置 GitHub `origin`。

### 验证结果

```text
npm run check:contracts                              PASS (5 contracts)
npm run check:frontend                               PASS
npm run build                                        PASS
backend/.venv/Scripts/python.exe -m pytest tests     PASS (2 tests)
cargo check --offline                                PASS
tauri dev --no-watch                                 PASS
GET http://127.0.0.1:18082/api/v1/health             PASS
GET http://127.0.0.1:1420/                           PASS
```

Tauri 已实际启动 `desktop-companion-agent.exe`，不是只做静态检查。

### 已知限制

- 当前图标和页面是 Iteration 0 编译占位内容，不是最终桌宠设计。
- pytest 报告一条来自 FastAPI/Starlette TestClient 的上游弃用警告，不影响本轮结果。
- 用户全局 Git 代理指向 `127.0.0.1:7897`；代理未运行时访问 GitHub/crates.io 需要临时直连，项目没有改写该全局设置。
- GitHub 账户密码未保存或使用；推送只允许使用 Git Credential Manager、浏览器授权或 PAT。

### Git 与下一轮

- 首个实现提交：在本文件提交后记录 commit hash。
- 下一轮入口：`ITERATION-01-pet-mvp.md`，状态为待确认，尚未开始实现。

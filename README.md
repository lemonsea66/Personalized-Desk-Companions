# Desktop Companion Agent

Windows-first personal desktop companion. The project is being built in bounded iterations; see [PROJECT_PLAN.md](./PROJECT_PLAN.md) and [docs/iterations](./docs/iterations/README.md).

## Current Status

Iteration 1 implements the first offline pet interaction loop: transparent layered rendering, pet/feed/sleep actions, persistent state, quiet mode, window dragging, and tray behavior. AI, personalized photo avatars, RAG, and window observation remain out of scope for this iteration.

## Repository Layout

```text
apps/desktop/          Tauri 2 + React/Vite desktop shell
backend/               FastAPI local service and Python tests
contracts/             Versioned JSON schemas shared by modules
packages/shared-types/ TypeScript mirrors of stable contracts
scripts/               Environment and contract checks
docs/iterations/       Scope-first iteration plans and results
```

## Local Checks

Use the project Python 3.12 environment, not the system Python 3.7:

```powershell
npm run check:contracts
npm run check:frontend
backend\\.venv\\Scripts\\python.exe -m pytest backend/tests
```

## Run the Desktop Pet

```powershell
.\\scripts\\start_dev.ps1
```

The script starts the FastAPI service on port `18082`, Vite on `1420`, and the Tauri pet window. Short-click the character to pet it; hold for at least 180ms to drag it. The icon buttons provide feed, sleep/wake, and quiet mode actions.

The backend health endpoint is:

```text
GET http://127.0.0.1:18082/health
GET http://127.0.0.1:18082/api/v1/health
```

## Secrets and User Data

API keys are stored through the future Windows Credential Manager integration. Do not put keys, photos, generated avatars, captures, model weights, runtime databases, or personal paths in Git.

## GitHub

The public repository contains core code, contracts, tests, and documentation only. The `main` branch is published at [Personalized-Desk-Companions](https://github.com/lemonsea66/Personalized-Desk-Companions).

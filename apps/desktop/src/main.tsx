import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { getBackendHealth } from "./backend";
import "./styles.css";

function IterationShell() {
  const [backendStatus, setBackendStatus] = useState("正在检查本地服务...");

  useEffect(() => {
    const controller = new AbortController();
    getBackendHealth(controller.signal)
      .then((health) => setBackendStatus(`本地服务：${health.status} · ${health.version}`))
      .catch(() => setBackendStatus("本地服务未启动"));
    return () => controller.abort();
  }, []);

  return (
    <main className="iteration-shell" aria-label="Desktop Companion Agent Iteration 0 shell">
      <p className="eyebrow">Desktop Companion Agent</p>
      <h1>Iteration 0 工具链壳</h1>
      <p>桌宠互动功能将在后续迭代中接入。当前页面只用于验证 Tauri、React 和本地服务边界。</p>
      <p className="status" aria-live="polite">{backendStatus}</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IterationShell />
  </StrictMode>
);

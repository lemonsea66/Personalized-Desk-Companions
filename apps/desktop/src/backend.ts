import type { HealthResponse } from "@desktop-companion/shared-types";

const backendUrl = import.meta.env.VITE_COMPANION_BACKEND_URL ?? "http://127.0.0.1:18082";

export async function getBackendHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${backendUrl}/api/v1/health`, { signal });
  if (!response.ok) {
    throw new Error(`Backend health check failed with HTTP ${response.status}`);
  }
  return (await response.json()) as HealthResponse;
}

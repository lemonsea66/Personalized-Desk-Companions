import type {
  AvatarLibraryResponse,
  RegisterAvatarRequest,
  SelectAvatarRequest,
  CompanionState,
  HealthResponse,
  PetInteractionEvent,
  PetInteractionResponse,
  PetInteractionType
} from "@desktop-companion/shared-types";

const backendUrl = import.meta.env.VITE_COMPANION_BACKEND_URL ?? "http://127.0.0.1:18082";

export async function getBackendHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${backendUrl}/api/v1/health`, { signal });
  if (!response.ok) {
    throw new Error(`Backend health check failed with HTTP ${response.status}`);
  }
  return (await response.json()) as HealthResponse;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(error?.message ?? `Backend request failed with HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export function getCompanionState(): Promise<CompanionState> {
  return requestJson("/api/v1/companion/state");
}

export function sendInteraction(
  type: PetInteractionType,
  payload: Record<string, unknown> = {}
): Promise<PetInteractionResponse> {
  const event: PetInteractionEvent = {
    schema_version: "1.0.0",
    event_id: crypto.randomUUID(),
    type,
    occurred_at: new Date().toISOString(),
    source: "desktop",
    payload
  };
  return requestJson("/api/v1/companion/interactions", {
    method: "POST",
    body: JSON.stringify(event)
  });
}

export async function resetCompanionState(): Promise<CompanionState> {
  const response = await requestJson<{ state: CompanionState }>("/api/v1/companion/reset", {
    method: "POST"
  });
  return response.state;
}

export function getAvatarLibrary(): Promise<AvatarLibraryResponse> {
  return requestJson("/api/v1/avatars");
}

export function selectAvatar(request: SelectAvatarRequest): Promise<AvatarLibraryResponse> {
  return requestJson("/api/v1/avatars/select", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

export function registerAvatar(request: RegisterAvatarRequest): Promise<AvatarLibraryResponse> {
  return requestJson("/api/v1/avatars/register", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

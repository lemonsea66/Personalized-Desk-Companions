export type SchemaVersion = string;

export interface EventEnvelope<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  schema_version: SchemaVersion;
  event_id: string;
  type: string;
  occurred_at: string;
  source: string;
  payload: TPayload;
}

export interface HealthResponse {
  schema_version: SchemaVersion;
  status: "ok";
  service: string;
  version: string;
  runtime?: Record<string, unknown>;
}

export interface AvatarManifest {
  schema_version: SchemaVersion;
  avatar_id: string;
  version: string;
  canvas: { width: number; height: number };
  layers: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
}

export interface SkillManifest {
  schema_version: SchemaVersion;
  id: string;
  version: string;
  display_name: string;
  permissions: string[];
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
}

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

export interface CompanionState {
  schema_version: SchemaVersion;
  mood: number;
  hunger: number;
  energy: number;
  affection: number;
  quiet_mode: boolean;
  last_interaction_at: string;
  updated_at: string;
  revision: number;
}

export type PetInteractionType =
  | "pet.petted"
  | "pet.fed"
  | "pet.quiet_mode_set"
  | "pet.sleep_requested"
  | "pet.wake_requested"
  | "pet.angry_triggered";

export interface PetInteractionEvent {
  schema_version: "1.0.0";
  event_id: string;
  type: PetInteractionType;
  occurred_at: string;
  source: string;
  payload: Record<string, unknown>;
}

export interface PetInteractionResponse {
  schema_version: "1.0.0";
  applied: boolean;
  effect: string;
  state: CompanionState;
}

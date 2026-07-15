from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


SCHEMA_VERSION = "1.0.0"
InteractionType = Literal[
    "pet.petted",
    "pet.fed",
    "pet.quiet_mode_set",
    "pet.sleep_requested",
    "pet.wake_requested",
    "pet.angry_triggered",
]


class CompanionState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = SCHEMA_VERSION
    mood: int = Field(ge=0, le=100)
    hunger: int = Field(ge=0, le=100)
    energy: int = Field(ge=0, le=100)
    affection: int = Field(ge=0, le=100)
    quiet_mode: bool
    last_interaction_at: datetime
    updated_at: datetime
    revision: int = Field(ge=0)


class InteractionEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str
    event_id: str = Field(min_length=1, max_length=128)
    type: InteractionType
    occurred_at: datetime
    source: str = Field(min_length=1, max_length=64)
    payload: dict[str, Any] = Field(default_factory=dict)

    @field_validator("schema_version")
    @classmethod
    def require_supported_schema(cls, value: str) -> str:
        if value != SCHEMA_VERSION:
            raise ValueError(f"unsupported schema version: {value}")
        return value


class InteractionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = SCHEMA_VERSION
    applied: bool
    effect: str
    state: CompanionState


class ResetResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = SCHEMA_VERSION
    state: CompanionState

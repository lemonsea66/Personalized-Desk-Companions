from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


SCHEMA_VERSION = "1.0.0"


class AvatarRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*$", min_length=1, max_length=64)
    display_name: str = Field(min_length=1, max_length=80)
    manifest_url: str
    preview_url: str
    source: Literal["builtin", "user"]

    @field_validator("manifest_url", "preview_url")
    @classmethod
    def require_local_asset_url(cls, value: str) -> str:
        if not value.startswith(("/pet/", "/user-assets/")):
            raise ValueError("avatar assets must use a local /pet/ or /user-assets/ URL")
        return value


class AvatarLibraryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = SCHEMA_VERSION
    selected_avatar_id: str
    avatars: list[AvatarRecord]


class SelectAvatarRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    avatar_id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*$", min_length=1, max_length=64)


class RegisterAvatarRequest(AvatarRecord):
    source: Literal["user"] = "user"

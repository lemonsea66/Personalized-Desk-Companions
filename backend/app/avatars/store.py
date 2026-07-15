from __future__ import annotations

import json
import os
import sqlite3
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.avatars.schemas import AvatarLibraryResponse, AvatarRecord, RegisterAvatarRequest


class AvatarLibraryError(Exception):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


class AvatarLibraryStore:
    def __init__(self, database_path: Path, library_path: Path) -> None:
        self.database_path = database_path
        self.library_path = library_path
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self.initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path, timeout=5.0)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        return connection

    def initialize(self) -> None:
        library = json.loads(self.library_path.read_text(encoding="utf-8"))
        default_avatar_id = str(library["default_avatar_id"])
        avatars = [AvatarRecord.model_validate(item) for item in library["avatars"]]
        now = datetime.now(UTC).isoformat()

        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS avatar_library (
                    id TEXT PRIMARY KEY,
                    display_name TEXT NOT NULL,
                    manifest_url TEXT NOT NULL,
                    preview_url TEXT NOT NULL,
                    source TEXT NOT NULL CHECK (source IN ('builtin', 'user')),
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS avatar_selection (
                    singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
                    avatar_id TEXT NOT NULL REFERENCES avatar_library(id),
                    updated_at TEXT NOT NULL
                );
                """
            )
            for avatar in avatars:
                connection.execute(
                    """
                    INSERT INTO avatar_library(id, display_name, manifest_url, preview_url, source, created_at)
                    VALUES(?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        display_name = excluded.display_name,
                        manifest_url = excluded.manifest_url,
                        preview_url = excluded.preview_url
                    WHERE avatar_library.source = 'builtin'
                    """,
                    (
                        avatar.id,
                        avatar.display_name,
                        avatar.manifest_url,
                        avatar.preview_url,
                        avatar.source,
                        now,
                    ),
                )
            connection.execute(
                "INSERT OR IGNORE INTO avatar_selection(singleton_id, avatar_id, updated_at) VALUES(1, ?, ?)",
                (default_avatar_id, now),
            )

    def list_library(self) -> AvatarLibraryResponse:
        with self._connect() as connection:
            selected = connection.execute(
                "SELECT avatar_id FROM avatar_selection WHERE singleton_id = 1"
            ).fetchone()
            rows = connection.execute(
                """
                SELECT id, display_name, manifest_url, preview_url, source
                FROM avatar_library
                ORDER BY CASE source WHEN 'builtin' THEN 0 ELSE 1 END, created_at, id
                """
            ).fetchall()
        if selected is None or not rows:
            raise AvatarLibraryError("AVATAR_LIBRARY_NOT_READY", "Avatar library is not initialized")
        return AvatarLibraryResponse(
            selected_avatar_id=str(selected["avatar_id"]),
            avatars=[AvatarRecord.model_validate(dict(row)) for row in rows],
        )

    def select(self, avatar_id: str) -> AvatarLibraryResponse:
        now = datetime.now(UTC).isoformat()
        with self._connect() as connection:
            exists = connection.execute("SELECT 1 FROM avatar_library WHERE id = ?", (avatar_id,)).fetchone()
            if exists is None:
                raise AvatarLibraryError(
                    "AVATAR_NOT_FOUND",
                    "The requested avatar does not exist",
                    {"avatar_id": avatar_id},
                )
            connection.execute(
                "UPDATE avatar_selection SET avatar_id = ?, updated_at = ? WHERE singleton_id = 1",
                (avatar_id, now),
            )
        return self.list_library()

    def register(self, request: RegisterAvatarRequest) -> AvatarLibraryResponse:
        now = datetime.now(UTC).isoformat()
        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO avatar_library(id, display_name, manifest_url, preview_url, source, created_at)
                    VALUES(?, ?, ?, ?, 'user', ?)
                    """,
                    (request.id, request.display_name, request.manifest_url, request.preview_url, now),
                )
        except sqlite3.IntegrityError as error:
            raise AvatarLibraryError(
                "AVATAR_ALREADY_EXISTS",
                "An avatar with this id already exists",
                {"avatar_id": request.id},
            ) from error
        return self.list_library()


def _default_library_path() -> Path:
    return Path(__file__).resolve().parents[3] / "assets" / "pet" / "library.json"


@lru_cache(maxsize=1)
def get_avatar_library_store() -> AvatarLibraryStore:
    configured = os.getenv("COMPANION_DATA_DIR")
    data_dir = Path(configured).expanduser().resolve() if configured else Path(__file__).resolve().parents[2] / "data"
    return AvatarLibraryStore(data_dir / "companion.sqlite3", _default_library_path())

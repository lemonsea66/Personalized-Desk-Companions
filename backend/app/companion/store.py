from __future__ import annotations

import json
import os
import sqlite3
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.companion.schemas import CompanionState, InteractionEvent


DECAY_INTERVAL = timedelta(minutes=30)


class CompanionError(Exception):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


@dataclass(frozen=True, slots=True)
class InteractionResult:
    applied: bool
    effect: str
    state: CompanionState


class CompanionStore:
    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self.initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path, timeout=5.0)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        return connection

    def initialize(self) -> None:
        now = _utc_now()
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version INTEGER PRIMARY KEY,
                    applied_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS companion_state (
                    singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
                    mood INTEGER NOT NULL CHECK (mood BETWEEN 0 AND 100),
                    hunger INTEGER NOT NULL CHECK (hunger BETWEEN 0 AND 100),
                    energy INTEGER NOT NULL CHECK (energy BETWEEN 0 AND 100),
                    affection INTEGER NOT NULL CHECK (affection BETWEEN 0 AND 100),
                    quiet_mode INTEGER NOT NULL CHECK (quiet_mode IN (0, 1)),
                    last_interaction_at TEXT NOT NULL,
                    last_decay_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    revision INTEGER NOT NULL CHECK (revision >= 0)
                );

                CREATE TABLE IF NOT EXISTS processed_companion_events (
                    event_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    occurred_at TEXT NOT NULL,
                    source TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    processed_at TEXT NOT NULL
                );
                """
            )
            connection.execute(
                "INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES(1, ?)",
                (_iso(now),),
            )
            connection.execute(
                """
                INSERT OR IGNORE INTO companion_state(
                    singleton_id, mood, hunger, energy, affection, quiet_mode,
                    last_interaction_at, last_decay_at, updated_at, revision
                ) VALUES(1, 50, 20, 80, 0, 0, ?, ?, ?, 0)
                """,
                (_iso(now), _iso(now), _iso(now)),
            )

    def get_state(self, *, now: datetime | None = None) -> CompanionState:
        effective_now = _as_utc(now or _utc_now())
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            row = self._require_state(connection)
            row = self._apply_decay(connection, row, effective_now)
            connection.commit()
            return _state_from_row(row)

    def apply_event(self, event: InteractionEvent, *, now: datetime | None = None) -> InteractionResult:
        effective_now = _as_utc(now or _utc_now())
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            row = self._apply_decay(connection, self._require_state(connection), effective_now)
            duplicate = connection.execute(
                "SELECT event_type FROM processed_companion_events WHERE event_id = ?",
                (event.event_id,),
            ).fetchone()
            if duplicate is not None:
                connection.commit()
                return InteractionResult(False, "duplicate_ignored", _state_from_row(row))

            updates, effect = self._event_updates(event, row, effective_now)
            updates["last_interaction_at"] = _iso(effective_now)
            updates["updated_at"] = _iso(effective_now)
            updates["revision"] = int(row["revision"]) + 1
            if event.type == "pet.quiet_mode_set":
                updates["last_decay_at"] = _iso(effective_now)

            assignments = ", ".join(f"{column} = ?" for column in updates)
            connection.execute(
                f"UPDATE companion_state SET {assignments} WHERE singleton_id = 1",
                tuple(updates.values()),
            )
            connection.execute(
                """
                INSERT INTO processed_companion_events(
                    event_id, event_type, occurred_at, source, payload_json, processed_at
                ) VALUES(?, ?, ?, ?, ?, ?)
                """,
                (
                    event.event_id,
                    event.type,
                    _iso(_as_utc(event.occurred_at)),
                    event.source,
                    json.dumps(event.payload, ensure_ascii=True, sort_keys=True),
                    _iso(effective_now),
                ),
            )
            updated = self._require_state(connection)
            connection.commit()
            return InteractionResult(True, effect, _state_from_row(updated))

    def reset(self, *, now: datetime | None = None) -> CompanionState:
        effective_now = _as_utc(now or _utc_now())
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            connection.execute("DELETE FROM processed_companion_events")
            connection.execute(
                """
                UPDATE companion_state
                SET mood = 50, hunger = 20, energy = 80, affection = 0,
                    quiet_mode = 0, last_interaction_at = ?, last_decay_at = ?,
                    updated_at = ?, revision = revision + 1
                WHERE singleton_id = 1
                """,
                (_iso(effective_now), _iso(effective_now), _iso(effective_now)),
            )
            row = self._require_state(connection)
            connection.commit()
            return _state_from_row(row)

    @staticmethod
    def _require_state(connection: sqlite3.Connection) -> sqlite3.Row:
        row = connection.execute("SELECT * FROM companion_state WHERE singleton_id = 1").fetchone()
        if row is None:
            raise CompanionError("STATE_NOT_FOUND", "Companion state is not initialized")
        return row

    @staticmethod
    def _event_updates(
        event: InteractionEvent,
        row: sqlite3.Row,
        now: datetime,
    ) -> tuple[dict[str, Any], str]:
        if event.type == "pet.petted":
            return {
                "mood": _clamp(int(row["mood"]) + 1),
                "affection": _clamp(int(row["affection"]) + 1),
            }, "petted"
        if event.type == "pet.fed":
            return {
                "mood": _clamp(int(row["mood"]) + 1),
                "hunger": _clamp(int(row["hunger"]) - 10),
            }, "fed"
        if event.type == "pet.quiet_mode_set":
            enabled = event.payload.get("enabled")
            if not isinstance(enabled, bool):
                raise CompanionError(
                    "INVALID_INTERACTION_PAYLOAD",
                    "pet.quiet_mode_set requires a boolean payload.enabled",
                    {"event_id": event.event_id},
                )
            return {"quiet_mode": int(enabled), "last_decay_at": _iso(now)}, "quiet_mode_updated"
        effects = {
            "pet.sleep_requested": "sleep_requested",
            "pet.wake_requested": "wake_requested",
            "pet.angry_triggered": "angry_triggered",
        }
        return {}, effects[event.type]

    @staticmethod
    def _apply_decay(
        connection: sqlite3.Connection,
        row: sqlite3.Row,
        now: datetime,
    ) -> sqlite3.Row:
        last_decay = _parse_datetime(str(row["last_decay_at"]))
        elapsed = now - last_decay
        intervals = max(0, int(elapsed.total_seconds() // DECAY_INTERVAL.total_seconds()))
        if intervals == 0:
            return row

        next_decay_at = last_decay + (DECAY_INTERVAL * intervals)
        next_mood = int(row["mood"])
        if not bool(row["quiet_mode"]):
            next_mood = _clamp(next_mood - intervals)
        connection.execute(
            """
            UPDATE companion_state
            SET mood = ?, last_decay_at = ?, updated_at = ?, revision = revision + 1
            WHERE singleton_id = 1
            """,
            (next_mood, _iso(next_decay_at), _iso(now)),
        )
        return CompanionStore._require_state(connection)


def _state_from_row(row: sqlite3.Row) -> CompanionState:
    return CompanionState(
        mood=int(row["mood"]),
        hunger=int(row["hunger"]),
        energy=int(row["energy"]),
        affection=int(row["affection"]),
        quiet_mode=bool(row["quiet_mode"]),
        last_interaction_at=_parse_datetime(str(row["last_interaction_at"])),
        updated_at=_parse_datetime(str(row["updated_at"])),
        revision=int(row["revision"]),
    )


def _clamp(value: int) -> int:
    return min(100, max(0, value))


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _iso(value: datetime) -> str:
    return _as_utc(value).isoformat()


def _parse_datetime(value: str) -> datetime:
    return _as_utc(datetime.fromisoformat(value))


@lru_cache(maxsize=1)
def get_companion_store() -> CompanionStore:
    configured = os.getenv("COMPANION_DATA_DIR")
    if configured:
        data_dir = Path(configured).expanduser().resolve()
    else:
        data_dir = Path(__file__).resolve().parents[2] / "data"
    return CompanionStore(data_dir / "companion.sqlite3")

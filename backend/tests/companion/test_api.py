from fastapi.testclient import TestClient

from app.companion.store import CompanionStore, get_companion_store
from app.main import app


def payload(event_id: str, event_type: str, extra: dict | None = None) -> dict:
    return {
        "schema_version": "1.0.0",
        "event_id": event_id,
        "type": event_type,
        "occurred_at": "2026-07-14T12:00:00Z",
        "source": "test",
        "payload": extra or {},
    }


def test_companion_api_round_trip(tmp_path) -> None:
    store = CompanionStore(tmp_path / "companion.sqlite3")
    app.dependency_overrides[get_companion_store] = lambda: store
    try:
        with TestClient(app) as client:
            assert client.get("/api/v1/companion/state").status_code == 200
            response = client.post(
                "/api/v1/companion/interactions",
                json=payload("pet-api-1", "pet.petted"),
            )
            assert response.status_code == 200
            assert response.json()["state"]["affection"] == 1

            duplicate = client.post(
                "/api/v1/companion/interactions",
                json=payload("pet-api-1", "pet.petted"),
            )
            assert duplicate.json()["applied"] is False

            reset = client.post("/api/v1/companion/reset")
            assert reset.status_code == 200
            assert reset.json()["state"]["mood"] == 50
    finally:
        app.dependency_overrides.clear()


def test_invalid_interaction_uses_standard_error(tmp_path) -> None:
    store = CompanionStore(tmp_path / "companion.sqlite3")
    app.dependency_overrides[get_companion_store] = lambda: store
    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/companion/interactions",
                json=payload("bad-1", "pet.quiet_mode_set", {"enabled": "yes"}),
            )
            assert response.status_code == 400
            assert response.json()["code"] == "INVALID_INTERACTION_PAYLOAD"

            invalid_type = client.post(
                "/api/v1/companion/interactions",
                json=payload("bad-2", "pet.unknown"),
            )
            assert invalid_type.status_code == 422
            assert invalid_type.json()["code"] == "VALIDATION_ERROR"
    finally:
        app.dependency_overrides.clear()

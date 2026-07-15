import json

from fastapi.testclient import TestClient

from app.avatars.store import AvatarLibraryStore, get_avatar_library_store
from app.main import app


def test_avatar_library_api(tmp_path) -> None:
    library_path = tmp_path / "library.json"
    library_path.write_text(
        json.dumps(
            {
                "default_avatar_id": "cute-dog",
                "avatars": [
                    {
                        "id": "cute-dog",
                        "display_name": "Cute Dog",
                        "manifest_url": "/pet/cute-dog/avatar_manifest.json",
                        "preview_url": "/pet/cute-dog/preview.png",
                        "source": "builtin",
                    },
                    {
                        "id": "default-mochi-star",
                        "display_name": "Mochi",
                        "manifest_url": "/pet/default/avatar_manifest.json",
                        "preview_url": "/pet/default/preview.png",
                        "source": "builtin",
                    },
                ],
            }
        ),
        encoding="utf-8",
    )
    store = AvatarLibraryStore(tmp_path / "companion.sqlite3", library_path)
    app.dependency_overrides[get_avatar_library_store] = lambda: store
    try:
        with TestClient(app) as client:
            listed = client.get("/api/v1/avatars")
            assert listed.status_code == 200
            assert listed.json()["selected_avatar_id"] == "cute-dog"

            selected = client.post("/api/v1/avatars/select", json={"avatar_id": "default-mochi-star"})
            assert selected.status_code == 200
            assert selected.json()["selected_avatar_id"] == "default-mochi-star"

            missing = client.post("/api/v1/avatars/select", json={"avatar_id": "missing"})
            assert missing.status_code == 400
            assert missing.json()["code"] == "AVATAR_NOT_FOUND"
    finally:
        app.dependency_overrides.clear()

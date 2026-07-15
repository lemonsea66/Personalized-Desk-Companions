import json

import pytest

from app.avatars.schemas import RegisterAvatarRequest
from app.avatars.store import AvatarLibraryError, AvatarLibraryStore


def library_file(tmp_path):
    path = tmp_path / "library.json"
    path.write_text(
        json.dumps(
            {
                "schema_version": "1.0.0",
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
    return path


def test_default_selection_and_persistence(tmp_path) -> None:
    database = tmp_path / "companion.sqlite3"
    library = library_file(tmp_path)
    store = AvatarLibraryStore(database, library)
    assert store.list_library().selected_avatar_id == "cute-dog"

    store.select("default-mochi-star")
    reloaded = AvatarLibraryStore(database, library)
    assert reloaded.list_library().selected_avatar_id == "default-mochi-star"


def test_unknown_selection_and_duplicate_registration(tmp_path) -> None:
    store = AvatarLibraryStore(tmp_path / "companion.sqlite3", library_file(tmp_path))
    with pytest.raises(AvatarLibraryError, match="does not exist"):
        store.select("missing")

    request = RegisterAvatarRequest(
        id="user-avatar",
        display_name="User Avatar",
        manifest_url="/user-assets/user-avatar/avatar_manifest.json",
        preview_url="/user-assets/user-avatar/preview.png",
    )
    result = store.register(request)
    assert any(avatar.id == "user-avatar" and avatar.source == "user" for avatar in result.avatars)
    with pytest.raises(AvatarLibraryError, match="already exists"):
        store.register(request)

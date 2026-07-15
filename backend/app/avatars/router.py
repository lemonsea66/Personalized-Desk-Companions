from fastapi import APIRouter, Depends

from app.avatars.schemas import AvatarLibraryResponse, RegisterAvatarRequest, SelectAvatarRequest
from app.avatars.store import AvatarLibraryStore, get_avatar_library_store


router = APIRouter(prefix="/api/v1/avatars", tags=["avatars"])


@router.get("", response_model=AvatarLibraryResponse)
def list_avatars(store: AvatarLibraryStore = Depends(get_avatar_library_store)) -> AvatarLibraryResponse:
    return store.list_library()


@router.post("/select", response_model=AvatarLibraryResponse)
def select_avatar(
    request: SelectAvatarRequest,
    store: AvatarLibraryStore = Depends(get_avatar_library_store),
) -> AvatarLibraryResponse:
    return store.select(request.avatar_id)


@router.post("/register", response_model=AvatarLibraryResponse)
def register_avatar(
    request: RegisterAvatarRequest,
    store: AvatarLibraryStore = Depends(get_avatar_library_store),
) -> AvatarLibraryResponse:
    return store.register(request)

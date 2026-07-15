from fastapi import APIRouter, Depends

from app.companion.schemas import (
    CompanionState,
    InteractionEvent,
    InteractionResponse,
    ResetResponse,
)
from app.companion.store import CompanionStore, get_companion_store


router = APIRouter(prefix="/api/v1/companion", tags=["companion"])


@router.get("/state", response_model=CompanionState)
def get_state(store: CompanionStore = Depends(get_companion_store)) -> CompanionState:
    return store.get_state()


@router.post("/interactions", response_model=InteractionResponse)
def apply_interaction(
    event: InteractionEvent,
    store: CompanionStore = Depends(get_companion_store),
) -> InteractionResponse:
    result = store.apply_event(event)
    return InteractionResponse(
        applied=result.applied,
        effect=result.effect,
        state=result.state,
    )


@router.post("/reset", response_model=ResetResponse)
def reset_state(store: CompanionStore = Depends(get_companion_store)) -> ResetResponse:
    return ResetResponse(state=store.reset())

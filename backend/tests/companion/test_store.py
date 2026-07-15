from datetime import UTC, datetime, timedelta

from app.companion.schemas import InteractionEvent
from app.companion.store import CompanionStore


START = datetime(2026, 7, 14, 12, 0, tzinfo=UTC)


def event(event_id: str, event_type: str, payload: dict | None = None) -> InteractionEvent:
    return InteractionEvent(
        schema_version="1.0.0",
        event_id=event_id,
        type=event_type,
        occurred_at=START,
        source="test",
        payload=payload or {},
    )


def test_defaults_and_interactions(tmp_path) -> None:
    store = CompanionStore(tmp_path / "companion.sqlite3")

    initial = store.reset(now=START)
    assert (initial.mood, initial.hunger, initial.energy, initial.affection) == (50, 20, 80, 0)

    petted = store.apply_event(event("pet-1", "pet.petted"), now=START + timedelta(seconds=1))
    assert petted.applied is True
    assert petted.state.mood == 51
    assert petted.state.affection == 1

    fed = store.apply_event(event("feed-1", "pet.fed"), now=START + timedelta(seconds=2))
    assert fed.state.mood == 52
    assert fed.state.hunger == 10


def test_duplicate_event_is_idempotent(tmp_path) -> None:
    store = CompanionStore(tmp_path / "companion.sqlite3")
    store.reset(now=START)
    first = store.apply_event(event("same-id", "pet.petted"), now=START)
    duplicate = store.apply_event(event("same-id", "pet.petted"), now=START + timedelta(seconds=1))

    assert first.applied is True
    assert duplicate.applied is False
    assert duplicate.effect == "duplicate_ignored"
    assert duplicate.state.mood == first.state.mood


def test_decay_and_quiet_mode(tmp_path) -> None:
    store = CompanionStore(tmp_path / "companion.sqlite3")
    store.reset(now=START)

    decayed = store.get_state(now=START + timedelta(minutes=61))
    assert decayed.mood == 48

    quiet = store.apply_event(
        event("quiet-on", "pet.quiet_mode_set", {"enabled": True}),
        now=START + timedelta(minutes=62),
    )
    assert quiet.state.quiet_mode is True
    later = store.get_state(now=START + timedelta(hours=4))
    assert later.mood == quiet.state.mood


def test_values_are_clamped(tmp_path) -> None:
    store = CompanionStore(tmp_path / "companion.sqlite3")
    store.reset(now=START)

    for index in range(15):
        state = store.apply_event(event(f"feed-{index}", "pet.fed"), now=START).state
    assert state.hunger == 0

    for index in range(60):
        state = store.apply_event(event(f"pet-{index}", "pet.petted"), now=START).state
    assert state.mood == 100

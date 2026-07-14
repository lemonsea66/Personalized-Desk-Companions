from __future__ import annotations

from collections.abc import AsyncIterator, Mapping, Sequence
from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True, slots=True)
class ProviderRequest:
    request_id: str
    messages: Sequence[Mapping[str, Any]]
    metadata: Mapping[str, Any]


@dataclass(frozen=True, slots=True)
class ProviderChunk:
    request_id: str
    text: str
    finish_reason: str | None = None


@dataclass(frozen=True, slots=True)
class RetrievedRecord:
    record_id: str
    source_type: str
    content: str
    score: float
    metadata: Mapping[str, Any]


class ChatProvider(Protocol):
    async def stream(self, request: ProviderRequest) -> AsyncIterator[ProviderChunk]: ...


class VisionProvider(Protocol):
    async def analyze(self, image: bytes, metadata: Mapping[str, Any]) -> Mapping[str, Any]: ...


class ImageProvider(Protocol):
    async def generate(self, prompt: str, references: Sequence[bytes]) -> bytes: ...


class EmbeddingProvider(Protocol):
    async def embed(self, texts: Sequence[str]) -> Sequence[Sequence[float]]: ...


class Retriever(Protocol):
    async def search(
        self,
        query: str,
        *,
        limit: int,
        filters: Mapping[str, Any] | None = None,
    ) -> Sequence[RetrievedRecord]: ...


class MemoryRepository(Protocol):
    async def put(self, record: Mapping[str, Any]) -> str: ...

    async def delete(self, record_id: str) -> bool: ...


class DocumentIndexer(Protocol):
    async def index(self, source: Mapping[str, Any]) -> Sequence[str]: ...


class SkillHandler(Protocol):
    async def invoke(self, payload: Mapping[str, Any]) -> Mapping[str, Any]: ...

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


SCHEMA_VERSION = "1.0.0"
SERVICE_VERSION = "0.0.0"

app = FastAPI(
    title="Desktop Companion Agent Local Service",
    version=SERVICE_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:1420",
        "http://tauri.localhost",
        "tauri://localhost",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Content-Type"],
)


def health_payload() -> dict[str, object]:
    return {
        "schema_version": SCHEMA_VERSION,
        "status": "ok",
        "service": "desktop-companion-agent-backend",
        "version": SERVICE_VERSION,
        "runtime": {
            "mode": "iteration-0",
            "features": [],
        },
    }


@app.get("/health")
def health() -> dict[str, object]:
    return health_payload()


@app.get("/api/v1/health")
def versioned_health() -> dict[str, object]:
    return health_payload()

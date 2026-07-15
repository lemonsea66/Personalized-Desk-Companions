from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.companion.router import router as companion_router
from app.companion.store import CompanionError


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
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(companion_router)


@app.exception_handler(CompanionError)
def companion_error_handler(_request: Request, error: CompanionError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={
            "schema_version": SCHEMA_VERSION,
            "code": error.code,
            "message": error.message,
            "details": error.details,
        },
    )


@app.exception_handler(RequestValidationError)
def validation_error_handler(_request: Request, error: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "schema_version": SCHEMA_VERSION,
            "code": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "details": {"errors": error.errors()},
        },
    )


def health_payload() -> dict[str, object]:
    return {
        "schema_version": SCHEMA_VERSION,
        "status": "ok",
        "service": "desktop-companion-agent-backend",
        "version": SERVICE_VERSION,
        "runtime": {
            "mode": "iteration-1",
            "features": ["companion_state"],
        },
    }


@app.get("/health")
def health() -> dict[str, object]:
    return health_payload()


@app.get("/api/v1/health")
def versioned_health() -> dict[str, object]:
    return health_payload()

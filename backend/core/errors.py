"""Central exception handling.

`HTTPException` and `RequestValidationError` keep FastAPI's default
`{"detail": ...}` response shape — the frontend depends on it. This module
adds the one missing piece: a catch-all so an unexpected exception returns a
clean 500 (still keyed `detail`) and is logged server-side instead of leaking
a stack trace to the client.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("stobaeus")


def register_exception_handlers(app: FastAPI) -> None:
    """Attach the catch-all exception handler to the app."""

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):  # noqa: ANN202
        logger.exception("Unhandled error: %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

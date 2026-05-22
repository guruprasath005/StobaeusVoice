"""StobaeusVoice API — application entry point."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from core.errors import register_exception_handlers
from db import init_db
from routers import (
    admin_ipd,
    appointments,
    auth,
    consultations,
    discharge,
    echo,
    ipd,
    nurse,
    patients,
    prescriptions,
    radiology,
    streaming,
    voice_bot,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Run schema bootstrap on startup."""
    init_db()
    yield


app = FastAPI(title="StobaeusVoice API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

# Routers — auth first, then clinical workflow, then engagement/streaming.
for module in (
    auth,
    patients,
    consultations,
    echo,
    prescriptions,
    discharge,
    nurse,
    ipd,
    admin_ipd,
    voice_bot,
    appointments,
    radiology,
    streaming,
):
    app.include_router(module.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "StobaeusVoice"}

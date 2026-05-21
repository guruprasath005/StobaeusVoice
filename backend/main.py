from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from database import init_db
from routers import patients, consultations, auth, echo, prescriptions, discharge, nurse, ipd, voice_bot, appointments, radiology

load_dotenv()

app = FastAPI(title="StobaeusVoice API", version="0.1.0")

_cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(consultations.router)
app.include_router(echo.router)
app.include_router(prescriptions.router)
app.include_router(discharge.router)
app.include_router(nurse.router)
app.include_router(ipd.router)
app.include_router(voice_bot.router)
app.include_router(appointments.router)
app.include_router(radiology.router)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/health")
def health():
    return {"status": "ok", "service": "StobaeusVoice"}

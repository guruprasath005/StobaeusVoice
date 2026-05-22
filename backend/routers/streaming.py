"""
Live dictation transcription.

The doctor's microphone audio is streamed from the browser to this WebSocket,
which proxies it to Deepgram's streaming STT (Nova-3 — supports Tamil + English,
including code-switching) and relays interim/final transcripts back live.

Dictation mode: the doctor narrates the clinical note (referring to the patient
as "the patient" / "PT-XXXX"), so the audio carries no patient PII. Audio is
streamed straight through — never written to disk or stored.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import websockets
import asyncio
import json

from config import settings
from db import SessionLocal
from models import User
from routers.auth import SECRET_KEY, ALGORITHM

router = APIRouter(tags=["streaming"])

DEEPGRAM_API_KEY = settings.deepgram_api_key

# Nova-3 supports Tamil + English on the streaming API; language=multi enables
# Tamil<->English code-switching, common in Indian cardiology dictation.
DEEPGRAM_URL = (
    "wss://api.deepgram.com/v1/listen"
    "?model=nova-3"
    "&language=multi"
    "&interim_results=true"
    "&smart_format=true"
    "&punctuate=true"
    "&endpointing=300"
)


def _authenticate(token: str) -> User | None:
    """WebSockets can't send headers, so the JWT arrives as a query param."""
    if not token:
        return None
    try:
        user_id = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]).get("sub")
    except JWTError:
        return None
    if not user_id:
        return None
    db: Session = SessionLocal()
    try:
        return db.query(User).filter(User.id == user_id, User.is_active == True).first()
    finally:
        db.close()


@router.websocket("/ws/transcribe")
async def ws_transcribe(websocket: WebSocket):
    user = _authenticate(websocket.query_params.get("token", ""))
    if not user:
        await websocket.close(code=1008)  # policy violation
        return

    await websocket.accept()

    if not DEEPGRAM_API_KEY:
        await websocket.send_json({
            "type": "error",
            "message": "DEEPGRAM_API_KEY is not configured on the server.",
        })
        await websocket.close(code=1011)
        return

    try:
        async with websockets.connect(
            DEEPGRAM_URL,
            additional_headers={"Authorization": f"Token {DEEPGRAM_API_KEY}"},
        ) as dg:

            async def browser_to_deepgram():
                """Forward the doctor's audio chunks straight to Deepgram."""
                try:
                    while True:
                        msg = await websocket.receive()
                        if msg["type"] == "websocket.disconnect":
                            break
                        if msg.get("bytes"):
                            await dg.send(msg["bytes"])
                        elif msg.get("text"):
                            # client signals end of dictation
                            break
                finally:
                    # ask Deepgram to flush remaining audio and emit final results
                    try:
                        await dg.send(json.dumps({"type": "CloseStream"}))
                    except Exception:
                        pass

            async def deepgram_to_browser():
                """Relay interim + final transcripts back to the doctor's screen."""
                async for raw in dg:
                    evt = json.loads(raw)
                    if evt.get("type") != "Results":
                        continue
                    alts = evt.get("channel", {}).get("alternatives", [])
                    text = alts[0].get("transcript", "") if alts else ""
                    if text:
                        await websocket.send_json({
                            "type": "transcript",
                            "text": text,
                            "is_final": evt.get("is_final", False),
                        })

            uplink = asyncio.create_task(browser_to_deepgram())
            downlink = asyncio.create_task(deepgram_to_browser())
            # Wait for Deepgram's stream to end — this happens AFTER CloseStream
            # flushes the trailing final transcripts, so none are lost.
            await downlink
            uplink.cancel()

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": f"Transcription stream failed: {e}"})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass

from openai import OpenAI, APIError
from fastapi import HTTPException
import io

from config import settings

client = OpenAI(api_key=settings.openai_api_key)

async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    Send audio bytes to OpenAI Whisper. Audio is NEVER written to disk.
    Returns transcript text only. Audio buffer discarded after this call.
    """
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    try:
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="text",  # language auto-detected (English / Tamil)
        )
        return response
    except APIError as e:
        raise HTTPException(status_code=502, detail=f"Transcription service unavailable: {e.message}")
    except Exception as e:
        raise HTTPException(status_code=502, detail="Transcription failed — please try again")

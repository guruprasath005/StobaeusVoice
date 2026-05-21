"""
Transcript translation.

A doctor may dictate in Tamil (or mix Tamil + English). Before the SOAP note
is generated, the raw transcript is normalised to English here. Already-English
text is returned essentially unchanged.
"""
from openai import OpenAI, APIError
from fastapi import HTTPException
import os

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

_SYSTEM_PROMPT = (
    "You translate a doctor's clinical dictation into fluent, professional English. "
    "If the text is already entirely in English, return it unchanged. "
    "Preserve every medical term, drug name, dose, number, and unit exactly as given. "
    "Do not summarise, add, or omit any clinical detail. "
    "Output only the translated transcript text — no preamble, no notes."
)


async def translate_to_english(text: str) -> str:
    """Return the transcript in English. No-op for text that is already English."""
    if not text or not text.strip():
        return text
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=0,
        )
        return (response.choices[0].message.content or text).strip()
    except APIError as e:
        raise HTTPException(status_code=502, detail=f"Translation service unavailable: {e.message}")
    except Exception:
        raise HTTPException(status_code=502, detail="Transcript translation failed — please try again")

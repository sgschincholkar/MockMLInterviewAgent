"""
Voice layer:
  - transcribe(audio_bytes) → text via OpenAI Whisper
  - speak(text) → audio bytes via ElevenLabs TTS
"""
import httpx
from openai import OpenAI
from backend.config import OPENAI_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID

openai_client = OpenAI(api_key=OPENAI_API_KEY)

ELEVENLABS_TTS_URL = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"


def transcribe(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Transcribe audio bytes using OpenAI Whisper. Returns the transcript text."""
    import io

    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    transcript = openai_client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        response_format="text",
    )
    return transcript.strip()


def speak(text: str) -> bytes:
    """
    Convert text to speech using ElevenLabs.
    Returns raw MP3 audio bytes, or empty bytes if TTS is unavailable.
    """
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {
            "stability": 0.55,
            "similarity_boost": 0.75,
            "style": 0.1,
            "use_speaker_boost": True,
        },
    }

    try:
        with httpx.Client(timeout=30) as http:
            response = http.post(ELEVENLABS_TTS_URL, json=payload, headers=headers)
            response.raise_for_status()
            return response.content
    except httpx.HTTPStatusError as e:
        # Gracefully degrade — return empty bytes, interview continues in text mode
        print(f"[TTS unavailable] {e.response.status_code}: {e.response.text[:200]}")
        return b""

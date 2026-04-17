"""
Voice layer:
  - transcribe(audio_bytes, session_id) → text via OpenAI Whisper
  - speak(text, session_id) → audio bytes via ElevenLabs (primary)
                              falls back to OpenAI TTS, then empty bytes
"""
import io
import httpx
from openai import OpenAI
from backend.config import OPENAI_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
from backend.token_tracker import track_tts, track_stt

openai_client = OpenAI(api_key=OPENAI_API_KEY)

# OpenAI TTS fallback — "onyx" is deep and professional
OPENAI_TTS_VOICE = "onyx"
OPENAI_TTS_MODEL = "tts-1"

ELEVENLABS_TTS_URL = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"


def transcribe(audio_bytes: bytes, filename: str = "audio.webm", session_id: str | None = None) -> str:
    """Transcribe audio bytes using OpenAI Whisper. Returns the transcript text."""
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    transcript = openai_client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        response_format="text",
    )
    text = transcript.strip()
    track_stt(session_id, len(text))
    return text


def speak(text: str, session_id: str | None = None) -> bytes:
    """
    Convert text to speech.
    Primary: ElevenLabs (paid plan required for library voice).
    Fallback: OpenAI TTS (onyx voice — professional, measured tone).
    Returns raw MP3 audio bytes, or empty bytes on failure.
    """
    # Primary: ElevenLabs
    if ELEVENLABS_API_KEY:
        try:
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
            with httpx.Client(timeout=30) as http:
                resp = http.post(ELEVENLABS_TTS_URL, json=payload, headers=headers)
                resp.raise_for_status()
                track_tts(session_id, len(text), "elevenlabs")
                return resp.content
        except Exception as e:
            print(f"[ElevenLabs TTS failed] {e} — trying OpenAI TTS")

    # Fallback: OpenAI TTS
    try:
        response = openai_client.audio.speech.create(
            model=OPENAI_TTS_MODEL,
            voice=OPENAI_TTS_VOICE,
            input=text,
            response_format="mp3",
        )
        track_tts(session_id, len(text), "openai")
        return response.content
    except Exception as e:
        print(f"[OpenAI TTS failed] {e}")

    return b""

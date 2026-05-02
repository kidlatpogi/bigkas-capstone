import io
import json
import logging
import os
import subprocess
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence, Tuple

import google.generativeai as genai
import librosa
import numpy as np
import soundfile
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client, create_client

from scoring_logic import compute_full_diagnostic, format_diagnostic_log_line

load_dotenv()

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
MAX_AUDIO_SIZE_MB = int(os.getenv("MAX_AUDIO_SIZE_MB", "20"))

DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def _parse_origins(raw_origins: str) -> List[str]:
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or DEFAULT_CORS_ORIGINS


app = FastAPI(
    title="Bigkas Triple V Backend",
    description="Visual + Vocal + Verbal analysis service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_origins(os.getenv("CORS_ORIGINS", ",".join(DEFAULT_CORS_ORIGINS))),
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)

_supabase_client: Optional[Client] = None


def _require_env(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return value


_gemini_model: Optional[Any] = None


def get_gemini_model() -> Any:
    global _gemini_model
    if _gemini_model is None:
        genai.configure(api_key=_require_env("GEMINI_API_KEY"))  # type: ignore[attr-defined]
        model = genai.GenerativeModel(GEMINI_MODEL)  # type: ignore[attr-defined]
        _gemini_model = model
    return _gemini_model


def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            _require_env("SUPABASE_URL"),
            _require_env("SUPABASE_SERVICE_KEY"),
        )
    return _supabase_client


def parse_visual_metrics(raw_visual_metrics: str) -> Dict[str, Any]:
    try:
        visual_metrics = json.loads(raw_visual_metrics)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"visual_metrics must be a valid JSON object: {exc.msg}",
        ) from exc

    if not isinstance(visual_metrics, dict):
        raise HTTPException(
            status_code=400,
            detail="visual_metrics must decode to a JSON object.",
        )

    return visual_metrics


def validate_audio_upload(audio_file: UploadFile, audio_bytes: bytes) -> None:
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="audio_file is empty.")

    content_type = (audio_file.content_type or "").lower()
    if content_type and not content_type.startswith("audio/"):
        raise HTTPException(
            status_code=400,
            detail="audio_file must use an audio/* content type.",
        )

    max_size_bytes = MAX_AUDIO_SIZE_MB * 1024 * 1024
    if len(audio_bytes) > max_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"audio_file is too large. Max allowed size is {MAX_AUDIO_SIZE_MB}MB.",
        )


def _decode_audio_with_soundfile(audio_bytes: bytes) -> Tuple[np.ndarray, int]:
    audio_fp = io.BytesIO(audio_bytes)
    with soundfile.SoundFile(audio_fp) as sf:
        y = sf.read(dtype="float32")
        sr = int(sf.samplerate)

    if len(y.shape) > 1:
        y = librosa.to_mono(y.T)

    return np.asarray(y, dtype=np.float32), sr


def _decode_audio_with_ffmpeg(audio_bytes: bytes) -> Tuple[np.ndarray, int]:
    ffmpeg_result = subprocess.run(
        [
            "ffmpeg",
            "-nostdin",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            "pipe:0",
            "-f",
            "wav",
            "-ac",
            "1",
            "-ar",
            "16000",
            "pipe:1",
        ],
        input=audio_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )

    if not ffmpeg_result.stdout:
        raise ValueError("ffmpeg produced empty output")

    return _decode_audio_with_soundfile(ffmpeg_result.stdout)


def extract_vocal_metrics(audio_bytes: bytes, _filename: str) -> Tuple[Dict[str, float], float]:
    try:
        try:
            y, sr = _decode_audio_with_soundfile(audio_bytes)
        except Exception:
            y, sr = _decode_audio_with_ffmpeg(audio_bytes)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Audio format not supported. Please ensure you are sending a valid audio file.",
        ) from exc

    if y.size == 0:
        raise ValueError("decoded waveform is empty")

    if sr != 16000:
        y = librosa.resample(y, orig_sr=sr, target_sr=16000)
        sr = 16000

    duration_seconds = float(librosa.get_duration(y=y, sr=sr))
    if duration_seconds <= 0:
        raise ValueError("audio duration is zero")

    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    onset_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)
    speaking_pace_estimate_spm = float((len(onset_frames) / duration_seconds) * 60.0)

    f0, _, _ = librosa.pyin(
        y,
        fmin=float(librosa.note_to_hz("C2")),
        fmax=float(librosa.note_to_hz("C7")),
        sr=sr,
    )
    voiced_f0 = f0[np.isfinite(f0)]

    if voiced_f0.size > 0:
        pitch_mean_hz = float(np.mean(voiced_f0))
        pitch_std_hz = float(np.std(voiced_f0))
        pitch_stability = float(max(0.0, 1.0 - (pitch_std_hz / (pitch_mean_hz + 1e-6))))

        if voiced_f0.size > 1:
            jitter_percent = float(
                np.mean(np.abs(np.diff(voiced_f0)) / (voiced_f0[:-1] + 1e-6)) * 100.0
            )
        else:
            jitter_percent = 0.0
    else:
        pitch_mean_hz = 0.0
        pitch_std_hz = 0.0
        pitch_stability = 0.0
        jitter_percent = 0.0

    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
    total_rms = float(np.sum(np.abs(rms))) if rms.size > 0 else 0.0
    valid_rms = rms[rms > 0]
    if valid_rms.size > 1:
        shimmer_db = float(
            np.mean(np.abs(20.0 * np.log10(valid_rms[1:] / (valid_rms[:-1] + 1e-6))))
        )
    else:
        shimmer_db = 0.0

    vocal_metrics = {
        "speaking_pace_estimate_spm": round(speaking_pace_estimate_spm, 2),
        "pitch_mean_hz": round(pitch_mean_hz, 2),
        "pitch_std_hz": round(pitch_std_hz, 2),
        "pitch_stability": round(pitch_stability, 4),
        "jitter_percent": round(jitter_percent, 4),
        "shimmer_db": round(shimmer_db, 4),
        "total_rms": round(total_rms, 6),
        "duration_seconds": round(duration_seconds, 2),
    }
    return vocal_metrics, duration_seconds


def parse_gemini_json(raw_text: str) -> Dict[str, Any]:
    payload = (raw_text or "").strip()
    if not payload:
        raise ValueError("Gemini returned an empty response")

    try:
        parsed = json.loads(payload)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    start = payload.find("{")
    end = payload.rfind("}")
    if start != -1 and end != -1 and end > start:
        parsed = json.loads(payload[start : end + 1])
        if isinstance(parsed, dict):
            return parsed

    raise ValueError("Gemini response did not contain valid JSON")


def _extract_transcript_text(payload: Dict[str, Any]) -> str:
    candidates = [
        payload.get("transcript"),
        payload.get("transcript_exact"),
        payload.get("transcription"),
        payload.get("transcript_text"),
        payload.get("spoken_text"),
        payload.get("text"),
    ]
    for candidate in candidates:
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()
    return ""


def _fallback_transcribe_with_gemini(audio_bytes: bytes, mime_type: str) -> str:
    resolved_mime = (mime_type or "").lower()
    if "webm" in resolved_mime:
        resolved_mime = "audio/webm"
    elif "mp4" in resolved_mime or "octet-stream" in resolved_mime or not resolved_mime:
        resolved_mime = "audio/mp4"
    else:
        resolved_mime = "audio/wav"

    model = get_gemini_model()
    try:
        response = model.generate_content(
            [
                "Transcribe this audio accurately. Return only the spoken words as plain text, with no JSON and no explanations.",
                {
                    "mime_type": resolved_mime, # <--- CRITICAL FIX
                    "data": audio_bytes,
                },
            ],
            generation_config={
                "temperature": 0.1,
            },
            request_options={"timeout": 30},
        )
    except Exception:
        return ""

    fallback_text = str(getattr(response, "text", "") or "").strip()
    if fallback_text.startswith("```"):
        fallback_text = fallback_text.strip("`").strip()
        if fallback_text.lower().startswith("json"):
            fallback_text = fallback_text[4:].strip()
    return fallback_text


def _is_failed_transcript_text(value: Any) -> bool:
    text = str(value or "").strip().lower()
    if not text:
        return False
    # If the text is long, it's a real transcript, not a brief API error message
    if len(text) > 50:
        return False
        
    failure_markers = (
        "analysis failed",
        "gemini error",
        "check api key",
        "verify model name",
    )
    return any(marker in text for marker in failure_markers)


def _sanitize_transcript_text(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if _is_failed_transcript_text(text):
        return ""
    return text


def _coerce_score(value: Any) -> float:
    try:
        score = float(value)
    except (TypeError, ValueError):
        return 0.0
    return round(max(0.0, min(100.0, score)), 2)


def _average_scores(values: Sequence[Any]) -> float:
    numeric_values = [_coerce_score(value) for value in values if value is not None]
    if not numeric_values:
        return 0.0
    return round(sum(numeric_values) / len(numeric_values), 2)


def _filler_density(filler_count: int, duration_seconds: float) -> float:
    """Fillers per minute."""
    if duration_seconds <= 0:
        return 0.0
    return round((filler_count / duration_seconds) * 60.0, 2)


def _coerce_context_score(value: Any) -> float:
    """Contextual relevance on 1.0–5.0 scale."""
    try:
        score = float(value)
    except (TypeError, ValueError):
        return 3.0
    return round(max(1.0, min(5.0, score)), 2)


def _extract_face_detection_count(visual: Dict[str, Any]) -> int:
    for key in (
        "face_detection_count",
        "face_detected_frames",
        "detected_face_frames",
        "face_count",
    ):
        raw_value = visual.get(key)
        if raw_value is None:
            continue
        try:
            return max(0, int(float(raw_value)))
        except (TypeError, ValueError):
            continue
    eye = float(visual.get("eye_contact_score", 0) or 0)
    gesture = float(visual.get("gesture_score", 0) or 0)
    return 1 if (eye > 0 or gesture > 0) else 0


def _context_score_to_0_100(context_score: float) -> float:
    """Linear map 1–5 → 0–100 for downstream verbal heuristics."""
    cs = max(1.0, min(5.0, context_score))
    return round(((cs - 1.0) / 4.0) * 100.0, 2)


def _scale_1_5_to_100(value: float) -> float:
    """Map diagnostic sub-scores on 1.0–5.0 band to 0–100 for API / UI."""
    v = float(value)
    v = max(1.0, min(5.0, v))
    return round(((v - 1.0) / 4.0) * 100.0, 2)


def normalize_session_origin(value: str) -> str:
    normalized = (value or "").strip().lower()
    if not normalized:
        return "training"
    if "pre-test" in normalized or "pretest" in normalized or "pre-testing" in normalized:
        return "pre-test"
    if "practice" in normalized:
        return "practice"
    if "activity" in normalized:
        return "training"
    if "training" in normalized:
        return "training"
    return "training"


def normalize_session_mode(session_origin: str, speaking_mode: str) -> str:
    origin = normalize_session_origin(session_origin)
    mode_hint = (speaking_mode or "").strip().lower()

    if origin == "practice":
        return "randomizer"

    if mode_hint in {"free", "free_speech", "free speech"}:
        return "free_speech"

    return "activity"


logger = logging.getLogger("bigkas")


def _log_supabase_error(table: str, payload: Any, exc: Exception) -> None:
    err = str(exc)
    keys = list(payload.keys()) if isinstance(payload, dict) else "[batch]"
    logger.error("Supabase insert to '%s' failed: %s | payload keys: %s", table, err, keys)
    if "PGRST" in err:
        logger.error(
            "PGRST column mismatch in '%s'. Verify payload keys match the DB schema exactly.",
            table,
        )


def analyze_with_gemini(audio_bytes: bytes, mime_type: str, topic: str) -> Dict[str, Any]:
    safe_topic = (topic or "").strip() or "(no topic provided)"
    
    # Dynamically resolve MIME type for Gemini
    resolved_mime = (mime_type or "").lower()
    if "webm" in resolved_mime:
        resolved_mime = "audio/webm"
    elif "mp4" in resolved_mime or "octet-stream" in resolved_mime or not resolved_mime:
        resolved_mime = "audio/mp4"
    else:
        resolved_mime = "audio/wav"

    prompt = f"""Act as a professional Speech Coach for Project Bigkas.
1. Transcribe this audio accurately.
2. The assigned topic is: '{safe_topic}'.
3. Compare the transcript to the topic and provide a 'Contextual Relevance Score' (1.0 - 5.0).
4. Identify the number of filler words (um, uh, like, etc.).
5. Provide 2-3 specific recommendations for verbal improvement.

Return the response strictly as a JSON object:
{{
  "transcript": "...",
  "context_score": 0.0,
  "filler_count": 0,
  "recommendations": []
}}"""

    model = get_gemini_model()
    try:
        response = model.generate_content(
            [
                prompt,
                {
                    "mime_type": resolved_mime, # <--- CRITICAL FIX
                    "data": audio_bytes,
                },
            ],
            generation_config={
                "temperature": 0.2,
                "response_mime_type": "application/json",
            },
            request_options={"timeout": 30},
        )
    except Exception as exc:
        fallback_transcript = _sanitize_transcript_text(
            _fallback_transcribe_with_gemini(audio_bytes, mime_type)
        )
        return {
            "transcript_exact": fallback_transcript,
            "verbal_metrics": {
                "context_score": 1.0,
                "filler_words_count": 0,
            },
            "feedback_summary": f"Gemini Error: {str(exc)}",
            "recommendations": ["Check API Key", "Verify Model Name"],
        }

    parsed = parse_gemini_json(getattr(response, "text", ""))
    transcript = _extract_transcript_text(parsed)
    if not transcript:
        transcript = _fallback_transcribe_with_gemini(audio_bytes, mime_type)
    transcript = _sanitize_transcript_text(transcript)

    context_score = _coerce_context_score(parsed.get("context_score"))

    try:
        filler_count = int(parsed.get("filler_count") or 0)
    except (TypeError, ValueError):
        filler_count = 0
    filler_count = max(0, filler_count)

    recommendations = parsed.get("recommendations", [])
    if isinstance(recommendations, str):
        recommendations = [recommendations]
    if not isinstance(recommendations, list):
        recommendations = []
    recommendations = [str(item).strip() for item in recommendations if str(item).strip()]

    feedback_summary = (
        "; ".join(recommendations)
        if recommendations
        else "Verbal analysis complete."
    )

    normalized_verbal = {
        "context_score": context_score,
        "filler_words_count": filler_count,
    }

    return {
        "transcript_exact": transcript,
        "verbal_metrics": normalized_verbal,
        "feedback_summary": feedback_summary,
        "recommendations": recommendations,
    }



def persist_to_supabase(
    user_id: str,
    combined_analysis: Dict[str, Any],
    profiling_answers: List[str],
    session_origin: str = "training",
    speaking_mode: str = "",
) -> Dict[str, Any]:
    supabase_client = get_supabase_client()
    origin = normalize_session_origin(session_origin)
    origin_normalized = origin.lower()
    is_pretest = origin_normalized in {"pre-test", "pretest"}

    visual = combined_analysis.get("visual", {})
    vocal = combined_analysis.get("vocal", {})
    verbal = combined_analysis.get("verbal", {})
    duration = vocal.get("duration_seconds", 0.0)

    filler_count = int(verbal.get("filler_words_count", 0))
    ctx = float(verbal.get("context_score", 3.0))
    pronunciation_0_100 = _context_score_to_0_100(ctx)
    total_rms = float(vocal.get("total_rms", 0.0) or 0.0)
    face_detection_count = _extract_face_detection_count(visual)

    if is_pretest:
        diagnostic = compute_full_diagnostic(
            profiling_answers=profiling_answers,
            gaze_stability=float(visual.get("eye_contact_score", 0)),
            gesture_score=float(visual.get("gesture_score", 0)),
            jitter_percent=float(vocal.get("jitter_percent", 0)),
            shimmer_db=float(vocal.get("shimmer_db", 0)),
            pronunciation_score=pronunciation_0_100,
            filler_density=_filler_density(filler_count, float(duration)),
            total_rms=total_rms,
            face_detection_count=face_detection_count,
        )
    else:
        diagnostic = compute_full_diagnostic(
            profiling_answers=profiling_answers,
            gaze_stability=float(visual.get("eye_contact_score", 0)),
            gesture_score=float(visual.get("gesture_score", 0)),
            jitter_percent=float(vocal.get("jitter_percent", 0)),
            shimmer_db=float(vocal.get("shimmer_db", 0)),
            pronunciation_score=pronunciation_0_100,
            filler_density=_filler_density(filler_count, float(duration)),
            total_rms=total_rms,
            face_detection_count=face_detection_count,
        )

    logger.info(format_diagnostic_log_line(diagnostic))

    speak_mode = (speaking_mode or "").strip()
    session_mode = normalize_session_mode(origin, speak_mode)

    # 1. Create session (only columns that exist in `sessions` table)
    session_payload: Dict[str, Any] = {
        "user_id": user_id,
        "status": "completed",
        "source": "web",
        "session_origin": origin,
        "session_mode": session_mode,
    }
    if speak_mode:
        session_payload["speaking_mode"] = speak_mode
    dur_sec = float(vocal.get("duration_seconds") or 0.0)
    if dur_sec > 0:
        session_payload["duration"] = max(1, int(round(dur_sec)))
    try:
        session_result = (
            supabase_client.table("sessions").insert(session_payload).execute()
        )
    except Exception as exc:
        _log_supabase_error("sessions", session_payload, exc)
        raise

    session_rows = getattr(session_result, "data", None)
    if not isinstance(session_rows, list) or not session_rows:
        raise RuntimeError("Could not create session record in sessions table.")
    first_row = session_rows[0]
    if not isinstance(first_row, dict) or "id" not in first_row:
        raise RuntimeError("Session insert did not return an id.")
    session_id = first_row["id"]

    # 2. session_metrics — store Triple-V style 0–100 columns for UI; *_avg stays 1–5 diagnostic
    entry_100 = _scale_1_5_to_100(float(diagnostic["entry_point"]))
    visual_100 = _scale_1_5_to_100(float(diagnostic["visual_avg"]))
    vocal_100 = _scale_1_5_to_100(float(diagnostic["vocal_avg"]))
    verbal_100 = pronunciation_0_100
    total_score_value = float(diagnostic["entry_point"]) if is_pretest else entry_100

    metrics_payload = {
        "session_id": session_id,
        "total_score": total_score_value,
        "overall_score": entry_100,
        "confidence_score": entry_100,
        "visual_avg": float(diagnostic["visual_avg"]),
        "vocal_avg": float(diagnostic["vocal_avg"]),
        "verbal_avg": float(diagnostic["verbal_avg"]),
        "verbal_score": verbal_100,
        "vocal_score": vocal_100,
        "visual_score": visual_100,
        "filler_words_count": filler_count,
        "pitch_stability": vocal.get("pitch_stability", 0),
        "speaking_pace": vocal.get("speaking_pace_estimate_spm", 0),
        "jitter": vocal.get("jitter_percent", 0),
        "shimmer": vocal.get("shimmer_db", 0),
        "eye_contact_score": visual.get("eye_contact_score", 0),
        "gesture_score": visual.get("gesture_score", 0),
        "total_rms": total_rms,
        "face_detection_count": face_detection_count,
    }
    try:
        supabase_client.table("session_metrics").insert(metrics_payload).execute()
    except Exception as exc:
        _log_supabase_error("session_metrics", metrics_payload, exc)
        raise

    if is_pretest:
        profile_payload = {
            "current_level": int(diagnostic["level"]),
            "diagnostic_score": float(diagnostic["entry_point"]),
            "diagnostic_completed_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            supabase_client.table("profiles").update(profile_payload).eq("id", user_id).execute()
        except Exception as exc:
            _log_supabase_error("profiles", profile_payload, exc)
            raise

    # 3. session_media
    media_payload = {
        "session_id": session_id,
        "transcript": _sanitize_transcript_text(combined_analysis.get("transcript_exact", "")),
    }
    try:
        supabase_client.table("session_media").insert(media_payload).execute()
    except Exception as exc:
        _log_supabase_error("session_media", media_payload, exc)
        raise

    # 4. session_feedback — Gemini summary goes into general_feedback
    feedback_summary = str(combined_analysis.get("feedback_summary", "") or "").strip()
    recommendations = combined_analysis.get("recommendations", [])
    if isinstance(recommendations, str):
        recommendations = [recommendations]
    if not isinstance(recommendations, list):
        recommendations = []
    recommendations = [str(item).strip() for item in recommendations if str(item).strip()]
    if not feedback_summary and recommendations:
        feedback_summary = "; ".join(recommendations)
    if not feedback_summary:
        feedback_summary = "Verbal analysis complete."

    feedback_payload = {
        "session_id": session_id,
        "general_feedback": feedback_summary,
    }
    try:
        supabase_client.table("session_feedback").insert(feedback_payload).execute()
    except Exception as exc:
        _log_supabase_error("session_feedback", feedback_payload, exc)
        raise

    # 5. session_recommendations — one row per recommendation
    if recommendations:
        rec_rows = [
            {"session_id": session_id, "recommendation_text": rec}
            for rec in recommendations
        ]
        try:
            supabase_client.table("session_recommendations").insert(rec_rows).execute()
        except Exception as exc:
            _log_supabase_error("session_recommendations", rec_rows[0], exc)
            raise

    return {
        "session_id": session_id,
        "status": "success",
        "diagnostic": diagnostic,
    }


@app.post("/api/analyze-speech")
async def analyze_speech(
    audio_file: UploadFile = File(...),
    visual_metrics: str = Form(...),
    user_id: str = Form(...),
    profiling_answers: str = Form(...),
    topic: str = Form(...),
    session_origin: str = Form("training"),
    speaking_mode: str = Form(""),
) -> Dict[str, Any]:
    """
    Accepts audio, visual sensor data, user ID, 9 profiling answers, and assigned topic.

    topic: speaking prompt/title from your app or database (used for contextual scoring).

    profiling_answers: JSON array of 9 strings, e.g.
        '["No","Yes","Sometimes","No","Yes","Sometimes","No","No","Yes"]'
    """
    visual_payload = parse_visual_metrics(visual_metrics)
    audio_bytes = await audio_file.read()
    validate_audio_upload(audio_file, audio_bytes)
    try:
        parsed_answers: List[str] = json.loads(profiling_answers)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"profiling_answers error: {exc.msg}")

    # 1. EXTRACT METRICS (Handles ffmpeg fallback internally)
    try:
        vocal_metrics, duration_seconds = extract_vocal_metrics(audio_bytes, "recording.wav")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Vocal analysis failed: {exc}")

    if duration_seconds < 1.0:
        raise HTTPException(status_code=400, detail="Recording is too short.")

    # 2. REBUILD A PERFECT WAV FILE FOR GEMINI
    # Decode the raw browser bytes and encode them with mathematically perfect RIFF headers.
    try:
        try:
            y, sr = _decode_audio_with_soundfile(audio_bytes)
        except Exception:
            y, sr = _decode_audio_with_ffmpeg(audio_bytes)
        
        import soundfile as sf
        clean_wav_io = io.BytesIO()
        sf.write(clean_wav_io, y, sr, format='WAV')
        clean_audio_bytes = clean_wav_io.getvalue()
        mime_to_send = "audio/wav"
    except Exception as exc:
        logger.error(f"WAV rebuild failed: {exc}")
        clean_audio_bytes = audio_bytes
        mime_to_send = audio_file.content_type or "audio/wav"

    # 3. SEND TO GEMINI
    try:
        verbal_payload = analyze_with_gemini(
            clean_audio_bytes,
            mime_to_send,
            topic,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini analysis failed: {exc}")

    combined_analysis = {
        "visual": visual_payload,
        "vocal": vocal_metrics,
        "transcript_exact": verbal_payload.get("transcript_exact", ""),
        "verbal": verbal_payload.get("verbal_metrics", {}),
        "feedback_summary": verbal_payload.get("feedback_summary", ""),
        "recommendations": verbal_payload.get("recommendations", []),
    }

    try:
        persistence = persist_to_supabase(
            user_id=user_id,
            combined_analysis=combined_analysis,
            profiling_answers=parsed_answers,
            session_origin=session_origin,
            speaking_mode=speaking_mode,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Supabase persistence failed: {exc}")

    diagnostic = persistence["diagnostic"]
    visual = combined_analysis["visual"]
    vocal = combined_analysis["vocal"]
    verbal = combined_analysis["verbal"]
    ctx = float(verbal.get("context_score", 3.0))
    pronunciation_0_100 = _context_score_to_0_100(ctx)

    # Flat fields expected by the web client (SessionContext) — avoids duplicate rows with zero scores.
    client_scores = {
        "confidence_score": _scale_1_5_to_100(float(diagnostic["entry_point"])),
        "context_score": pronunciation_0_100,
        "pronunciation_score": pronunciation_0_100,
        "acoustic_score": _scale_1_5_to_100(float(diagnostic["vocal_avg"])),
        "visual_score": _scale_1_5_to_100(float(diagnostic["visual_avg"])),
        "verbal_score": pronunciation_0_100,
        "fluency_score": 0.0,
        "jitter_score": float(vocal.get("jitter_percent") or 0),
        "shimmer_score": float(vocal.get("shimmer_db") or 0),
        "gesture_score": float(visual.get("gesture_score") or 0),
        "facial_expression_score": float(visual.get("eye_contact_score") or 0),
        "transcript": _sanitize_transcript_text(combined_analysis.get("transcript_exact", "")),
        "summary": combined_analysis.get("feedback_summary", ""),
        "duration_sec": float(vocal.get("duration_seconds") or 0),
        "recommendations": combined_analysis.get("recommendations", []),
    }

    return {
        "ok": True,
        "session_id": persistence["session_id"],
        **client_scores,
        "entry_point": diagnostic["entry_point"],
        "level": diagnostic["level"],
        "level_label": diagnostic["level_label"],
        "profiling_score": diagnostic["profiling_score"],
        "pretest_score": diagnostic["pretest_score"],
        "visual_avg": diagnostic["visual_avg"],
        "vocal_avg": diagnostic["vocal_avg"],
        "verbal_avg": diagnostic["verbal_avg"],
        "analysis": combined_analysis,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)

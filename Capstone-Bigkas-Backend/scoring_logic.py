"""
Bigkas Technical Calibration and Heuristic Validation — Scoring Logic

All final scores operate on a 1.0–5.0 scale.
  - Profiling (S_score)  : 30 % weight
  - AI Pre-test          : 70 % weight
  - Pre-test uses Mehrabian's Principle (55 / 38 / 7)
"""

import math
from typing import Any, Dict, List

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PROFILING_WEIGHT = 0.30
PRETEST_WEIGHT = 0.70

MEHRABIAN_VISUAL = 0.55
MEHRABIAN_VOCAL = 0.38
MEHRABIAN_VERBAL = 0.07
MIN_ACTIVITY_RMS = 0.25
MIN_FACE_DETECTION_COUNT = 1

PROFILING_ANSWER_SCORES: Dict[str, int] = {
    "no": 5,
    "sometimes": 3,
    "yes": 1,
}

EXPECTED_PROFILING_COUNT = 9

LEVEL_THRESHOLDS = [
    (2.0, 1, "Mastering Fundamentals"),
    (3.0, 2, "Learning Your Style"),
    (4.0, 3, "Increasing Knowledge"),
    (5.0, 4, "Building Skills"),
]
LEVEL_MAX = (5, "Demonstrating Expertise")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clamp(value: float, low: float = 1.0, high: float = 5.0) -> float:
    return max(low, min(high, value))


def _map_0_100_to_1_5(value: float) -> float:
    """Linearly map a 0–100 metric to the 1–5 scale."""
    normalized = max(0.0, min(100.0, float(value)))
    if normalized == 0.0:
        return 1.0
    return _clamp(1.0 + (normalized / 100.0) * 4.0)


def _activity_is_below_threshold(total_rms: float, face_detection_count: int) -> bool:
    return float(total_rms) < MIN_ACTIVITY_RMS or int(face_detection_count) < MIN_FACE_DETECTION_COUNT


# ---------------------------------------------------------------------------
# 1. Profiling Calculation  (S_score — 30 % of final)
# ---------------------------------------------------------------------------

def calculate_profiling_score(answers: List[str]) -> float:
    """
    Accepts exactly 9 answers (Visual × 3, Vocal × 3, Verbal × 3).
    Each answer: 'No' → 5, 'Sometimes' → 3, 'Yes' → 1.
    Returns S_score = sum / 9   (range 1.0 – 5.0).
    """
    if len(answers) != EXPECTED_PROFILING_COUNT:
        raise ValueError(
            f"Expected {EXPECTED_PROFILING_COUNT} profiling answers, got {len(answers)}"
        )

    total = 0
    for answer in answers:
        key = answer.strip().lower()
        if key not in PROFILING_ANSWER_SCORES:
            raise ValueError(
                f"Invalid profiling answer '{answer}'. "
                "Must be 'Yes', 'No', or 'Sometimes'."
            )
        total += PROFILING_ANSWER_SCORES[key]

    return round(total / EXPECTED_PROFILING_COUNT, 2)


# ---------------------------------------------------------------------------
# 2. AI Pre-test Sub-scores  (each on 1–5 scale)
# ---------------------------------------------------------------------------

def calculate_visual_avg(gaze_stability: float, gesture_score: float) -> float:
    """
    Visual_Avg from gaze stability (eye-contact %) and gesture score (0–100).
    Both inputs are on 0–100 scale → mapped to 1–5, then averaged.
    """
    if float(gaze_stability) == 0.0 and float(gesture_score) == 0.0:
        return 1.0
    gaze = _map_0_100_to_1_5(gaze_stability)
    gesture = _map_0_100_to_1_5(gesture_score)
    return round((gaze + gesture) / 2.0, 2)


def calculate_vocal_avg(jitter_percent: float, shimmer_db: float) -> float:
    """
    Vocal_Avg derived from jitter (%) and shimmer (dB).
    Lower values indicate healthier voice quality → higher score.

    Jitter heuristic  (≤1 % → 5 … ≥8 % → 1):
        score = 5 − (jitter / 2)
    Shimmer heuristic (≤0.5 dB → 5 … ≥4 dB → 1):
        score = 5 − shimmer
    """
    if float(jitter_percent) == 0.0 and float(shimmer_db) == 0.0:
        return 1.0
    jitter_score = _clamp(5.0 - (jitter_percent / 2.0))
    shimmer_score = _clamp(5.0 - shimmer_db)
    return round((jitter_score + shimmer_score) / 2.0, 2)


def calculate_verbal_avg(
    pronunciation_score: float,
    filler_density: float,
) -> float:
    """
    Verbal_Avg from pronunciation quality and filler-word density.

    pronunciation_score: 0–100 (from Gemini clarity analysis) → mapped to 1–5.
    filler_density      : fillers per minute.  0 → 5 … ≥16 → 1.
        score = 5 − (density / 4)
    """
    pron = _map_0_100_to_1_5(pronunciation_score)
    filler = _clamp(5.0 - (filler_density / 4.0))
    return round((pron + filler) / 2.0, 2)


# ---------------------------------------------------------------------------
# 3. Composite Pre-test Score  (Mehrabian 55 / 38 / 7)
# ---------------------------------------------------------------------------

def calculate_pretest_score(
    visual_avg: float,
    vocal_avg: float,
    verbal_avg: float,
) -> float:
    """Pre-test_Score = (Visual × 0.55) + (Vocal × 0.38) + (Verbal × 0.07)."""
    score = (
        visual_avg * MEHRABIAN_VISUAL
        + vocal_avg * MEHRABIAN_VOCAL
        + verbal_avg * MEHRABIAN_VERBAL
    )
    return round(_clamp(score), 2)


# ---------------------------------------------------------------------------
# 4. Final Diagnostic Entry Point
# ---------------------------------------------------------------------------

def calculate_entry_point(pretest_score: float, profiling_score: float) -> float:
    """
    Entry Point = (Pre-test × 0.7) + (S_score × 0.3).
    Truncated to exactly one decimal place (e.g., 1.98 -> 1.9).
    """
    score = pretest_score * PRETEST_WEIGHT + profiling_score * PROFILING_WEIGHT
    clamped = _clamp(score)
    # Truncate to 1 decimal place without rounding
    return math.floor(clamped * 10) / 10


# ---------------------------------------------------------------------------
# 5. Level Assignment
# ---------------------------------------------------------------------------

def assign_level(entry_point: float) -> Dict[str, Any]:
    """
    1.0 – 1.9  →  Level 1  (Mastering Fundamentals)
    2.0 – 2.9  →  Level 2  (Learning Your Style)
    3.0 – 3.9  →  Level 3  (Increasing Knowledge)
    4.0 – 4.9  →  Level 4  (Building Skills)
    5.0        →  Level 5  (Demonstrating Expertise)
    """
    ep = _clamp(entry_point)
    for threshold, level, label in LEVEL_THRESHOLDS:
        if ep < threshold:
            return {"level": level, "label": label}
    return {"level": LEVEL_MAX[0], "label": LEVEL_MAX[1]}


# ---------------------------------------------------------------------------
# 6. Convenience: full pipeline in one call
# ---------------------------------------------------------------------------

def compute_full_diagnostic(
    profiling_answers: List[str],
    gaze_stability: float,
    gesture_score: float,
    jitter_percent: float,
    shimmer_db: float,
    pronunciation_score: float,
    filler_density: float,
    total_rms: float = 0.0,
    face_detection_count: int = 0,
) -> Dict[str, Any]:
    """Run the entire calibration pipeline and return all intermediate + final scores."""
    s_score = calculate_profiling_score(profiling_answers)

    visual_avg = calculate_visual_avg(gaze_stability, gesture_score)
    vocal_avg = calculate_vocal_avg(jitter_percent, shimmer_db)
    verbal_avg = calculate_verbal_avg(pronunciation_score, filler_density)
    if _activity_is_below_threshold(total_rms, face_detection_count):
        visual_avg = 1.0
        vocal_avg = 1.0
        verbal_avg = 1.0
    pretest_score = calculate_pretest_score(visual_avg, vocal_avg, verbal_avg)

    entry_point = calculate_entry_point(pretest_score, s_score)
    level_info = assign_level(entry_point)

    return {
        "profiling_score": s_score,
        "visual_avg": visual_avg,
        "vocal_avg": vocal_avg,
        "verbal_avg": verbal_avg,
        "pretest_score": pretest_score,
        "entry_point": entry_point,
        "level": level_info["level"],
        "level_label": level_info["label"],
    }


def format_diagnostic_log_line(diagnostic: Dict[str, Any]) -> str:
    """
    Single-line summary for Hugging Face / server logs.
    profiling = survey S_score; pretest = Mehrabian VVV composite; post = blended entry_point.
    """
    return (
        "[BIGKAS] profiling_baseline=%.2f | ai_pretest=%.2f | post_blend=%.2f | "
        "VVV_visual=%.2f VVV_vocal=%.2f VVV_verbal=%.2f | level=%s %s"
        % (
            float(diagnostic["profiling_score"]),
            float(diagnostic["pretest_score"]),
            float(diagnostic["entry_point"]),
            float(diagnostic["visual_avg"]),
            float(diagnostic["vocal_avg"]),
            float(diagnostic["verbal_avg"]),
            int(diagnostic["level"]),
            str(diagnostic["level_label"]),
        )
    )

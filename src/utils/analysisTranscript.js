/**
 * Detects placeholder / error strings that should not be shown as speech transcript or titles.
 */
export function isFailedAnalysisTranscript(text) {
  const s = String(text || '').trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  if (lower === 'analysis failed') return true;
  if (/^analysis failed\b/i.test(s)) return true;
  if (/^transcription failed\b/i.test(s)) return true;
  if (/^speech recognition failed\b/i.test(s)) return true;
  if (/^unable to transcribe\b/i.test(s)) return true;
  if (/^error\b/.test(lower) && lower.length < 120) return true;
  return false;
}

/**
 * Returns display-safe transcript, or empty string if the value is an error placeholder.
 */
export function sanitizeTranscriptForDisplay(text, fallback = '') {
  if (isFailedAnalysisTranscript(text)) return fallback;
  const t = String(text || '').trim();
  return t || fallback;
}

/** Placeholder strings returned by Capstone-Bigkas-Backend `main.py` when Gemini raises (see `analyze_with_gemini` except block). */
const BACKEND_GEMINI_FAILURE_RECOMMENDATIONS = new Set([
  'check api key',
  'verify model name',
]);

/**
 * Filters API recommendation lines that are actually error messages.
 */
export function sanitizeRecommendationLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines
    .map((x) => String(x || '').trim())
    .filter((x) => {
      if (!x || isFailedAnalysisTranscript(x)) return false;
      const lower = x.toLowerCase();
      if (BACKEND_GEMINI_FAILURE_RECOMMENDATIONS.has(lower)) return false;
      return true;
    });
}

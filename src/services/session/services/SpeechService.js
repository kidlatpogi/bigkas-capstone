import { ENV } from '../api/env.js';
import { PYTHON_AI_PATHS } from '../api/aiService.js';

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

async function parseApiResponseSafely(response) {
  const rawText = await response.text();
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return { rawText };
  }
}

/**
 * Speech / analysis orchestration for Bigkas.
 * Uses the Python service (`PYTHON_AI_PATHS.analyze`) when configured.
 */
const SpeechService = {
  /**
   * Sends transcript + metadata for server-side analysis.
   * @param {{ transcript: string, language?: string, durationMs?: number }} payload
   * @returns {Promise<unknown>}
   */
  async processSpeech(payload) {
    const { transcript = '', language = 'en', durationMs = 0 } = payload || {};

    const normalizedTranscript = transcript.trim();
    const localMetrics = this.calculateAcousticMetrics({
      transcript: normalizedTranscript,
      durationMs,
    });

    const base = normalizeBaseUrl(ENV.PYTHON_SERVICE_URL);
    if (!base) {
      throw new Error(
        'Python service URL is not configured. Set EXPO_PUBLIC_API_BASE_URL (or VITE_PYTHON_SERVICE_URL) in env.',
      );
    }

    const url = `${base}${PYTHON_AI_PATHS.analyze}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: normalizedTranscript,
        language,
        duration_ms: durationMs,
        metrics: localMetrics,
      }),
    });

    const data = await parseApiResponseSafely(response);

    if (!response.ok) {
      const detail = data?.detail;
      const message =
        typeof detail === 'object' && detail !== null
          ? detail.error || JSON.stringify(detail)
          : detail || data?.rawText || `HTTP ${response.status}`;
      const err = new Error(message);
      err.status = response.status;
      err.responseData = data;
      throw err;
    }

    return data;
  },

  /**
   * Basic local metric extraction (template for future DSP integration).
   * @param {{ transcript: string, durationMs: number }} params
   * @returns {{ wordsPerMinute: number, hesitationCount: number, confidenceHint: number }}
   */
  calculateAcousticMetrics({ transcript, durationMs }) {
    const wordCount = transcript ? transcript.split(/\s+/).length : 0;
    const minutes = durationMs > 0 ? durationMs / 60000 : 1;
    const wordsPerMinute = Math.round(wordCount / minutes);
    const hesitationCount = (transcript.match(/\b(um|uh|ah)\b/gi) || []).length;

    return {
      wordsPerMinute,
      hesitationCount,
      confidenceHint: Math.max(0, 100 - hesitationCount * 5),
    };
  },
};

export default SpeechService;

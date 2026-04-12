/**
 * Client for the Bigkas Python AI service (FastAPI).
 * Base URL: VITE_PYTHON_SERVICE_URL or VITE_API_BASE_URL — e.g. Hugging Face Space URL.
 *
 * Request/response shapes for script generation align with
 * `services/python-ai-service/api/routes/ai.py` (Pydantic models).
 * Analysis API JSON models live in `services/python-ai-service/models/schemas.py`.
 */

import { ENV } from './env.js';

export const PYTHON_AI_PATHS = {
  health: '/api/health',
  generateScript: '/api/ai/generate-script',
  userTokens: '/api/ai/user-tokens',
  dailyQuote: '/api/content/daily-quote',
  analyze: '/api/analysis/analyze',
  analyseAudio: '/api/analysis/analyse-audio',
  analyseFull: '/api/analysis/analyse-full',
};

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

/**
 * Resolved backend base URL (Hugging Face, local :8000, etc.).
 * @returns {string}
 */
export function getPythonServiceBaseUrl() {
  const base = normalizeBaseUrl(ENV.PYTHON_SERVICE_URL);
  if (!base) {
    throw new Error(
      'Python service URL is not configured. Set VITE_PYTHON_SERVICE_URL (or VITE_API_BASE_URL) in .env',
    );
  }
  return base;
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
 * Generate a speech script via the Python service (server-side LLM + rate limits).
 *
 * @param {object} userData
 * @param {string} userData.userId - Supabase user id
 * @param {string} userData.prompt
 * @param {string} userData.vibe - e.g. Professional, Casual, Humorous, Inspirational
 * @param {number} [userData.targetWordCount]
 * @param {number} [userData.durationMinutes]
 * @param {'new'|'regenerate'} [userData.action]
 * @returns {Promise<{ title: string, content: string, generation_tokens?: number, regeneration_tokens?: number }>}
 */
export async function generateSpeech(userData) {
  const {
    userId,
    prompt,
    vibe,
    targetWordCount = 450,
    durationMinutes = 3,
    action = 'new',
  } = userData;

  if (!userId) {
    throw new Error('userId is required for script generation.');
  }

  const base = normalizeBaseUrl(ENV.PYTHON_SERVICE_URL);
  if (!base) {
    throw new Error(
      'Python service URL is not configured. Set VITE_PYTHON_SERVICE_URL (or VITE_API_BASE_URL) in .env',
    );
  }

  const url = `${base}${PYTHON_AI_PATHS.generateScript}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      prompt: String(prompt).trim(),
      vibe,
      target_word_count: Math.round(targetWordCount),
      duration_minutes: Number(durationMinutes),
      action,
    }),
  });

  const responseData = await parseApiResponseSafely(response);

  if (!response.ok) {
    const detail = responseData?.detail;
    const message =
      typeof detail === 'object' && detail !== null
        ? detail.error || JSON.stringify(detail)
        : detail || responseData?.rawText || `HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.detail = detail;
    err.responseData = responseData;
    throw err;
  }

  return responseData;
}

export default generateSpeech;

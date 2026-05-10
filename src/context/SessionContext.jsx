import { createContext, useCallback, useEffect, useReducer } from 'react';
import { supabase } from '../lib/supabase';
import { ENV } from '../config/env';
import {
  isFailedAnalysisTranscript,
  sanitizeRecommendationLines,
  sanitizeTranscriptForDisplay,
} from '../utils/analysisTranscript';

const PAGE_SIZE = 10;
const LEGACY_LOCAL_SESSIONS_KEY = 'bigkas_local_sessions_v1';
const SESSION_TITLE_CACHE_KEY = 'bigkas_session_title_cache_v1';
const SESSION_TITLE_COLUMN_SUPPORT_KEY = 'bigkas_session_title_column_supported_v1';
const SESSION_VIDEO_CACHE_KEY = 'bigkas_session_video_cache_v1';
const SESSION_MEDIA_BUCKET = 'session-recordings';
const SESSIONS_CACHE_TTL_MS = 15000;
const SESSIONS_SELECT_QUERY = `
  id,
  user_id,
  status,
  session_mode,
  session_origin,
  speaking_mode,
  source,
  topic,
  duration,
  created_at,
  activity_id,
  activities (
    title,
    objective
  ),
  session_media (
    audio_url,
    transcript,
    video_storage_url,
    analysis
  ),
  session_metrics (
    overall_score,
    vocal_score,
    visual_score,
    verbal_score,
    visual_avg,
    vocal_avg,
    verbal_avg,
    confidence_score,
    pronunciation_score,
    jitter,
    shimmer,
    eye_contact_score,
    gesture_score
  ),
  session_feedback (
    general_feedback
  ),
  session_recommendations (
    recommendation_text
  )
`;

const sessionQueryCache = new Map();
const sessionDetailCache = new Map();
const inFlightSessionQueries = new Map();

function makeSessionListCacheKey(userId, page, pageSize) {
  return `list:${userId}:${page}:${pageSize}`;
}

function makeSessionAllCacheKey(userId) {
  return `all:${userId}`;
}

function makeSessionDetailCacheKey(sessionId) {
  return `detail:${sessionId}`;
}

function getCachedEntry(cacheMap, key) {
  const entry = cacheMap.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cacheMap.delete(key);
    return null;
  }
  return entry.payload;
}

function setCachedEntry(cacheMap, key, payload) {
  cacheMap.set(key, {
    payload,
    expiresAt: Date.now() + SESSIONS_CACHE_TTL_MS,
  });
}

function invalidateSessionCaches() {
  sessionQueryCache.clear();
  sessionDetailCache.clear();
  inFlightSessionQueries.clear();
}

function normalizeSessionOriginForPersistence(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'training';
  if (normalized.includes('pre-test') || normalized.includes('pretest')) return 'pre-test';
  if (normalized.includes('practice')) return 'practice';
  if (normalized.includes('activity')) return 'training';
  if (normalized.includes('training')) return 'training';
  return 'training';
}

function resolveAnalysisTranscript(analysisResult) {
  const candidates = [
    analysisResult?.transcript,
    analysisResult?.transcript_exact,
    analysisResult?.analysis?.transcript_exact,
    analysisResult?.analysis?.transcript,
    analysisResult?.data?.transcript,
    analysisResult?.data?.transcript_exact,
  ];
  const first = candidates.find((value) => typeof value === 'string' && value.trim());
  return first ? first.trim() : '';
}

function normalizeSessionModeForPersistence({ scriptType, speakingMode }) {
  const normalizedOrigin = normalizeSessionOriginForPersistence(scriptType);
  const normalizedSpeakingMode = String(speakingMode || '').trim().toLowerCase();

  if (normalizedOrigin === 'practice') return 'randomizer';
  if (normalizedOrigin === 'pre-test') return normalizedSpeakingMode === 'free' ? 'free_speech' : 'activity';
  if (normalizedSpeakingMode === 'free') return 'free_speech';
  return 'activity';
}

const initialState = {
  sessions:       [],
  currentSession: null,
  isLoading:      false,
  isAnalysing:    false,
  error:          null,
  pagination:     { page: 1, total: 0, hasMore: true, pageSize: PAGE_SIZE },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':      return { ...state, isLoading: action.payload };
    case 'SET_ANALYSING':   return { ...state, isAnalysing: action.payload };
    case 'SET_SESSIONS':    return { ...state, sessions: action.payload.sessions, pagination: { page: action.payload.page, total: action.payload.total, hasMore: action.payload.sessions.length === action.payload.pageSize, pageSize: action.payload.pageSize } };
    case 'APPEND_SESSIONS': return { ...state, sessions: [...state.sessions, ...action.payload.sessions], pagination: { page: action.payload.page, total: action.payload.total, hasMore: action.payload.sessions.length === action.payload.pageSize, pageSize: action.payload.pageSize } };
    case 'SET_CURRENT':     return { ...state, currentSession: action.payload };
    case 'ADD_SESSION':     return { ...state, sessions: [action.payload, ...state.sessions] };
    case 'REMOVE_SESSION':  return { ...state, sessions: state.sessions.filter((s) => s.id !== action.payload) };
    case 'CLEAR_MEDIA_URLS':
      return {
        ...state,
        sessions: state.sessions.map((s) => ({
          ...s,
          audio_url: null,
          video_storage_url: null,
        })),
        currentSession: state.currentSession
          ? { ...state.currentSession, audio_url: null, video_storage_url: null }
          : state.currentSession,
      };
    case 'SET_ERROR':       return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_ERROR':     return { ...state, error: null };
    case 'RESET':           return initialState;
    default:                return state;
  }
}

/**
 * Session Context
 * Manages practice session state throughout the app
 */

const SessionContext = createContext(null);

function normalizeSessionRow(session) {
  if (!session) return session;
  const cachedTitle = getSessionTitleCacheEntry(session.id);
  const cachedVideoUrl = getSessionVideoCacheEntry(session.id);
  const activity = Array.isArray(session.activities) ? session.activities[0] : session.activities;
  const activityTitle = String(activity?.title || '').trim() || null;
  const media = Array.isArray(session.session_media) ? session.session_media[0] : session.session_media;
  const metrics = Array.isArray(session.session_metrics) ? session.session_metrics[0] : session.session_metrics;
  const feedback = Array.isArray(session.session_feedback) ? session.session_feedback[0] : session.session_feedback;
  const recs = Array.isArray(session.session_recommendations) ? session.session_recommendations : [];

  const normalizedSpeechType = String(session.speaking_mode || session.session_mode || '').toLowerCase().trim();
  const normalizedSessionOrigin = String(session.session_origin || '').toLowerCase().trim();
  const recommendation_timestamps = recs
    .map((item) => ({
      text: String(item?.recommendation_text || '').trim(),
      pillar: '',
      start_sec: null,
      end_sec: null,
    }))
    .filter((item) => item.text && !isFailedAnalysisTranscript(item.text));
  const recommendations = sanitizeRecommendationLines(
    recs.map((item) => String(item?.recommendation_text || '').trim()),
  );
  const confidenceScore = toInt(metrics?.confidence_score ?? metrics?.overall_score ?? 0, 0);

  return {
    ...session,
    session_media: undefined,
    session_metrics: undefined,
    session_feedback: undefined,
    session_recommendations: undefined,
    activities: undefined,
    activity_id: session.activity_id || null,
    activity_title: activityTitle,
    speech_type: normalizedSpeechType || null,
    speaking_mode: session.speaking_mode || normalizedSpeechType || null,
    session_origin: normalizedSessionOrigin || null,
    script_title: session.topic ?? session.script_title ?? session.title ?? activityTitle ?? cachedTitle ?? null,
    score: toNumeric(metrics?.overall_score ?? confidenceScore, 0),
    confidence_score: confidenceScore,
    acoustic_score: toNumeric(metrics?.vocal_score ?? 0, 0),
    fluency_score: toNumeric(metrics?.fluency_score ?? 0, 0),
    visual_score: metrics?.visual_score == null ? null : toNumeric(metrics.visual_score, 0),
    context_score: metrics?.verbal_score == null ? null : toNumeric(metrics.verbal_score, 0),
    visual_avg: metrics?.visual_avg == null ? null : toNumeric(metrics.visual_avg, 0),
    vocal_avg: metrics?.vocal_avg == null ? null : toNumeric(metrics.vocal_avg, 0),
    verbal_avg: metrics?.verbal_avg == null ? null : toNumeric(metrics.verbal_avg, 0),
    pronunciation_score: metrics?.pronunciation_score == null ? null : toInt(metrics.pronunciation_score, 0),
    jitter_score: metrics?.jitter == null ? null : toInt(metrics.jitter, 0),
    shimmer_score: metrics?.shimmer == null ? null : toInt(metrics.shimmer, 0),
    gesture_score: metrics?.gesture_score == null ? null : toInt(metrics.gesture_score, 0),
    duration_sec: session.duration ?? 0,
    target_text: sanitizeTranscriptForDisplay(media?.transcript, ''),
    transcript: sanitizeTranscriptForDisplay(media?.transcript, ''),
    analysis: media?.analysis || null,
    feedback: feedback?.general_feedback || '',
    detailed_feedback: feedback?.detailed_feedback || '',
    objective_name: session.objective_name ?? activity?.objective ?? null,
    recommendations,
    recommendation_timestamps,
    audio_url: media?.audio_url || null,
    video_url: media?.video_storage_url || cachedVideoUrl || null,
    video_storage_url: media?.video_storage_url || cachedVideoUrl || null,
  };
}

function isMissingColumn(error, columnName) {
  if (!error || !columnName) return false;
  const msg = (error.message || '').toLowerCase();
  const name = String(columnName).toLowerCase();
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    (msg.includes('column') && msg.includes(name) && msg.includes('does not exist')) ||
    (msg.includes('could not find') && msg.includes(name) && msg.includes('schema cache'))
  );
}

function getSessionTitleCache() {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_TITLE_CACHE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function setSessionTitleCacheEntry(sessionId, title) {
  if (typeof window === 'undefined') return;
  const sid = String(sessionId || '').trim();
  const safeTitle = String(title || '').trim();
  if (!sid || !safeTitle) return;
  const cache = getSessionTitleCache();
  cache[sid] = safeTitle;
  window.localStorage.setItem(SESSION_TITLE_CACHE_KEY, JSON.stringify(cache));
}

function getSessionTitleCacheEntry(sessionId) {
  const sid = String(sessionId || '').trim();
  if (!sid) return null;
  const cache = getSessionTitleCache();
  const value = cache[sid];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getSessionVideoCache() {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_VIDEO_CACHE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function setSessionVideoCacheEntry(sessionId, videoUrl) {
  if (typeof window === 'undefined') return;
  const sid = String(sessionId || '').trim();
  const safeVideo = String(videoUrl || '').trim();
  if (!sid || !safeVideo) return;
  const cache = getSessionVideoCache();
  cache[sid] = safeVideo;
  window.localStorage.setItem(SESSION_VIDEO_CACHE_KEY, JSON.stringify(cache));
}

function getSessionVideoCacheEntry(sessionId) {
  const sid = String(sessionId || '').trim();
  if (!sid) return null;
  const cache = getSessionVideoCache();
  const value = cache[sid];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getScriptTitleColumnSupport() {
  if (typeof window === 'undefined') return true;
  const raw = window.localStorage.getItem(SESSION_TITLE_COLUMN_SUPPORT_KEY);
  if (raw === '1') return true;
  if (raw === '0') return false;
  return null;
}

function canUseScriptTitleColumn() {
  return getScriptTitleColumnSupport() === true;
}

function markScriptTitleColumnSupport(supported) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SESSION_TITLE_COLUMN_SUPPORT_KEY, supported ? '1' : '0');
}

function inferScriptTitleColumnSupportFromRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const hasField = rows.some((row) => row && Object.prototype.hasOwnProperty.call(row, 'script_title'));
  markScriptTitleColumnSupport(hasField);
}

function isSessionsTableMissing(error) {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  return (
    error.code === '42P01' ||
    error?.status === 404 ||
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('not found')
  );
}

function isMissingVideoUrlColumn(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return error.code === '42703' || msg.includes('video_url') || msg.includes('column') && msg.includes('does not exist');
}

function getFileExtension(blobType, fallback = 'webm') {
  if (!blobType) return fallback;
  const [, subtype = fallback] = String(blobType).split('/');
  const cleaned = subtype.split(';')[0].trim();
  return cleaned || fallback;
}

function toInt(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.round(num);
}

function toNumeric(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num;
}

function chunkArray(items, size) {
  if (!Array.isArray(items) || size <= 0) return [];
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function toSessionRecordingStoragePath(publicUrl) {
  if (!publicUrl || typeof publicUrl !== 'string') return null;
  const marker = `/storage/v1/object/public/${SESSION_MEDIA_BUCKET}/`;
  const markerIdx = publicUrl.indexOf(marker);
  if (markerIdx < 0) return null;
  const encodedPath = publicUrl.slice(markerIdx + marker.length);
  if (!encodedPath) return null;
  return decodeURIComponent(encodedPath);
}

function isObjectTooLargeError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('maximum allowed size')
    || message.includes('exceeded the maximum')
    || message.includes('entity too large')
    || message.includes('payload too large');
}

async function uploadSessionMediaBlob({ userId, blob, kind }) {
  if (!blob || !userId) return null;

  const extension = getFileExtension(blob.type, kind === 'video' ? 'webm' : 'webm');
  const random = Math.random().toString(36).slice(2, 8);
  const filePath = `${userId}/${kind}/${Date.now()}-${random}.${extension}`;

  const { error } = await supabase.storage
    .from(SESSION_MEDIA_BUCKET)
    .upload(filePath, blob, {
      contentType: blob.type || (kind === 'video' ? 'video/webm' : 'audio/webm'),
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || `Failed to upload ${kind} blob.`);
  }

  const { data } = supabase.storage.from(SESSION_MEDIA_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl ?? null;
}

async function listUserStoragePaths(userId, kind) {
  const prefix = `${userId}/${kind}`;
  const allPaths = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(SESSION_MEDIA_BUCKET)
      .list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      throw new Error(error.message || `Failed to list ${kind} recordings.`);
    }

    const files = Array.isArray(data) ? data.filter((item) => item?.name) : [];
    for (const file of files) {
      allPaths.push(`${prefix}/${file.name}`);
    }

    if (files.length < limit) break;
    offset += limit;
  }

  return allPaths;
}

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Prevent stale local-only records from being shown after switching to DB-only persistence.
    window.localStorage.removeItem(LEGACY_LOCAL_SESSIONS_KEY);
  }, []);

  /* ── Helpers ── */
  const getUserId = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  }, []);

  /* ── Fetch paginated sessions ── */
  const fetchSessions = useCallback(async (page = 1, refresh = false, pageSize = PAGE_SIZE) => {
    if (!ENV.ENABLE_SESSION_PERSISTENCE) {
      return {
        success: false,
        error: 'Session persistence is disabled. Enable database persistence to load sessions.',
      };
    }

    const uid = await getUserId();
    if (!uid) return { success: false, error: 'Not authenticated' };
    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : PAGE_SIZE;
    const listCacheKey = makeSessionListCacheKey(uid, page, safePageSize);
    if (!refresh) {
      const cachedListPayload = getCachedEntry(sessionQueryCache, listCacheKey);
      if (cachedListPayload) {
        dispatch({ type: page === 1 ? 'SET_SESSIONS' : 'APPEND_SESSIONS', payload: cachedListPayload });
        return { success: true, cached: true };
      }
    }

    const inFlightKey = `fetch:${listCacheKey}`;
    const existingRequest = inFlightSessionQueries.get(inFlightKey);
    if (existingRequest) {
      return existingRequest;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    const from = (page - 1) * safePageSize;
    const request = (async () => {
      const { data, error, count } = await supabase
        .from('sessions')
        .select(SESSIONS_SELECT_QUERY, { count: 'exact' })
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .range(from, from + safePageSize - 1);
      dispatch({ type: 'SET_LOADING', payload: false });
      if (error) {
        if (isSessionsTableMissing(error)) {
          const emptyPayload = { sessions: [], page: 1, total: 0, pageSize: safePageSize };
          setCachedEntry(sessionQueryCache, listCacheKey, emptyPayload);
          dispatch({ type: 'SET_SESSIONS', payload: emptyPayload });
          return { success: true };
        }
        dispatch({ type: 'SET_ERROR', payload: error.message });
        return { success: false, error: error.message };
      }
      inferScriptTitleColumnSupportFromRows(data ?? []);
      const normalized = (data ?? []).map(normalizeSessionRow);
      const next = { sessions: normalized, page, total: count ?? 0, pageSize: safePageSize };
      setCachedEntry(sessionQueryCache, listCacheKey, next);
      for (const session of normalized) {
        setCachedEntry(sessionDetailCache, makeSessionDetailCacheKey(session.id), session);
      }
      dispatch({ type: refresh || page === 1 ? 'SET_SESSIONS' : 'APPEND_SESSIONS', payload: next });
      return { success: true };
    })();

    inFlightSessionQueries.set(inFlightKey, request);
    try {
      return await request;
    } finally {
      inFlightSessionQueries.delete(inFlightKey);
    }
  }, [getUserId]);

  const fetchAllSessions = useCallback(async () => {
    if (!ENV.ENABLE_SESSION_PERSISTENCE) {
      return {
        success: false,
        error: 'Session persistence is disabled. Enable database persistence to load sessions.',
      };
    }

    const uid = await getUserId();
    if (!uid) return { success: false, error: 'Not authenticated' };

    const allCacheKey = makeSessionAllCacheKey(uid);
    const cachedAllPayload = getCachedEntry(sessionQueryCache, allCacheKey);
    if (cachedAllPayload) {
      dispatch({ type: 'SET_SESSIONS', payload: cachedAllPayload });
      return { success: true, sessions: cachedAllPayload.sessions, cached: true };
    }

    const inFlightKey = `fetch:${allCacheKey}`;
    const existingRequest = inFlightSessionQueries.get(inFlightKey);
    if (existingRequest) {
      return existingRequest;
    }

    const request = (async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      const allSessions = [];
      let page = 1;
      const batchSize = 200;

      try {
        while (true) {
          const from = (page - 1) * batchSize;
          const { data, error, count } = await supabase
            .from('sessions')
            .select(SESSIONS_SELECT_QUERY, { count: page === 1 ? 'exact' : undefined })
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .range(from, from + batchSize - 1);

          if (error) {
            if (isSessionsTableMissing(error)) {
              dispatch({ type: 'SET_SESSIONS', payload: { sessions: [], page: 1, total: 0, pageSize: batchSize } });
              dispatch({ type: 'SET_LOADING', payload: false });
              return { success: true, sessions: [] };
            }
            dispatch({ type: 'SET_ERROR', payload: error.message });
            dispatch({ type: 'SET_LOADING', payload: false });
            return { success: false, error: error.message };
          }

          inferScriptTitleColumnSupportFromRows(data ?? []);

          const normalizedBatch = (data ?? []).map(normalizeSessionRow);
          allSessions.push(...normalizedBatch);

          if (normalizedBatch.length < batchSize) {
            const payload = {
              sessions: allSessions,
              page,
              total: count ?? allSessions.length,
              pageSize: batchSize,
            };
            setCachedEntry(sessionQueryCache, allCacheKey, payload);
            for (const session of allSessions) {
              setCachedEntry(sessionDetailCache, makeSessionDetailCacheKey(session.id), session);
            }
            dispatch({
              type: 'SET_SESSIONS',
              payload,
            });
            dispatch({ type: 'SET_LOADING', payload: false });
            return { success: true, sessions: allSessions };
          }

          page += 1;
        }
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to load sessions.' });
        dispatch({ type: 'SET_LOADING', payload: false });
        return { success: false, error: err.message || 'Failed to load sessions.' };
      }
    })();

    inFlightSessionQueries.set(inFlightKey, request);
    try {
      return await request;
    } finally {
      inFlightSessionQueries.delete(inFlightKey);
    }
  }, [getUserId]);

  const loadMoreSessions = useCallback(async () => {
    if (!state.pagination.hasMore || state.isLoading) return;
    await fetchSessions(state.pagination.page + 1, false, state.pagination.pageSize || PAGE_SIZE);
  }, [fetchSessions, state.pagination, state.isLoading]);

  /* ── Fetch single session ── */
  const fetchSessionById = useCallback(async (sessionId) => {
    const normalizedId = String(sessionId || '');
    const detailCacheKey = makeSessionDetailCacheKey(normalizedId);
    const cachedDetail = getCachedEntry(sessionDetailCache, detailCacheKey);
    if (cachedDetail) {
      dispatch({ type: 'SET_CURRENT', payload: cachedDetail });
      return { success: true, session: cachedDetail, cached: true };
    }

    const inMemoryMatch = state.sessions.find((s) => String(s.id) === normalizedId);
    if (inMemoryMatch) {
      setCachedEntry(sessionDetailCache, detailCacheKey, inMemoryMatch);
      dispatch({ type: 'SET_CURRENT', payload: inMemoryMatch });
      return { success: true, session: inMemoryMatch };
    }

    if (!ENV.ENABLE_SESSION_PERSISTENCE) {
      dispatch({ type: 'SET_CURRENT', payload: null });
      return {
        success: false,
        error: 'Session persistence is disabled. Enable database persistence to load sessions.',
      };
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    const { data, error } = await supabase.from('sessions').select(SESSIONS_SELECT_QUERY).eq('id', sessionId).single();
    dispatch({ type: 'SET_LOADING', payload: false });
    if (isSessionsTableMissing(error)) {
      dispatch({ type: 'SET_CURRENT', payload: null });
      return { success: false, error: 'Session not found' };
    }
    if (error) { dispatch({ type: 'SET_ERROR', payload: error.message }); return { success: false, error: error.message }; }
    inferScriptTitleColumnSupportFromRows(data ? [data] : []);
    const normalized = normalizeSessionRow(data);
    setCachedEntry(sessionDetailCache, detailCacheKey, normalized);
    dispatch({ type: 'SET_CURRENT', payload: normalized });
    return { success: true, session: normalized };
  }, [state.sessions]);

  /* ── Analyse & save session (calls Python backend) ── */
  const analyseAndSave = useCallback(async ({
    audioBlob,
    videoBlob = null,
    targetText,
    scriptType = 'free-speech',
    speakingMode = '',
    scriptTitle = '',
    activityId = null,
    visualAnalysis = null,
    topic = '',
    profilingAnswers = [],
    onProgress = null,
  }) => {
    const uid = await getUserId();
    if (!uid) return { success: false, error: 'Not authenticated' };
    dispatch({ type: 'SET_ANALYSING', payload: true });
    try {
      const apiUrl = ENV.PYTHON_SERVICE_URL;
      // 0. Ensure session is fresh (prevents "exp" claim errors after long waits)
      const { data: { session: currentSession }, error: sessionErr } = await supabase.auth.refreshSession();
      if (sessionErr) console.warn('[SessionContext] Session refresh warning:', sessionErr.message);
      const authSession = currentSession;
      const baseVisualMetrics = {
        overall_score: toNumeric(visualAnalysis?.overall_score, 0),
        eye_contact_score: toNumeric(visualAnalysis?.eye_contact_score, 0),
        gesture_score: toNumeric(visualAnalysis?.gesture_score, 0),
      };

      const audioExt = getFileExtension(audioBlob?.type, 'webm');
      const formData = new FormData();
      formData.append('audio_file', audioBlob, `recording.${audioExt}`);
      formData.append('visual_metrics', JSON.stringify(baseVisualMetrics));
      formData.append('user_id', uid);
      formData.append('topic', topic || scriptTitle || 'General Speaking');
      formData.append('profiling_answers', JSON.stringify(
        Array.isArray(profilingAnswers) && profilingAnswers.length === 9
          ? profilingAnswers
          : ['No', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'No']
      ));
      formData.append('session_origin', normalizeSessionOriginForPersistence(scriptType));
      formData.append('speaking_mode', String(speakingMode || '').trim());

      if (onProgress) onProgress(20);

      // 3. BACKGROUND PERSISTENCE (Non-blocking)
      const backgroundPersistence = (async () => {
        try {
          console.log('[SessionContext] Starting background media upload...');
          const audioStorageUrl = await uploadSessionMediaBlob({ userId: uid, blob: audioBlob, kind: 'audio' });
          let videoStorageUrl = null;
          if (videoBlob) {
            try {
              videoStorageUrl = await uploadSessionMediaBlob({ userId: uid, blob: videoBlob, kind: 'video' });
            } catch (vErr) { console.warn('[SessionContext] Background video upload skipped:', vErr.message); }
          }
          console.log('[SessionContext] Background media upload successful.');
          return { audioStorageUrl, videoStorageUrl };
        } catch (err) {
          console.warn('[SessionContext] Background media upload failed:', err.message);
          return { audioStorageUrl: null, videoStorageUrl: null };
        }
      })();

      // 4. MAIN ANALYSIS (Blocking initial POST)
      console.log('[SessionContext] Requesting AI Analysis (No artificial timeout)...');
      
      let analysisResult;
      let postAttempts = 0;
      const maxPostAttempts = 5;

      while (postAttempts < maxPostAttempts) {
        postAttempts += 1;
        try {
          console.log(`[SessionContext] POST attempt ${postAttempts}/${maxPostAttempts}...`);
          
          // No AbortController — let the browser manage the connection
          // HF cold starts can take 2-3 minutes; aborting early causes the loop
          const res = await fetch(`${apiUrl}/api/analyze-speech`, {
            method: 'POST',
            headers: authSession?.access_token ? { Authorization: `Bearer ${authSession.access_token}` } : undefined,
            body: formData,
          });

          const responseText = await res.text();
          
          // Detect HTML (Hugging Face Starting/Restarting page)
          if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
            console.warn(`[SessionContext] POST received HTML (attempt ${postAttempts}/${maxPostAttempts}). Space is starting. Waiting 10s...`);
            await new Promise((r) => setTimeout(r, 10000));
            continue;
          }

          if (!res.ok) throw new Error(`Server returned ${res.status}: ${responseText.slice(0, 200)}`);
          
          analysisResult = JSON.parse(responseText);
          break; // Success!
        } catch (err) {
          console.warn(`[SessionContext] POST attempt ${postAttempts} failed:`, err.message);
          
          if (postAttempts >= maxPostAttempts) {
            console.error('[SessionContext] All POST attempts exhausted.');
            throw new Error(`AI service unreachable after ${maxPostAttempts} attempts. The server may still be starting up — please wait 1-2 minutes and try again.`);
          }
          
          // Exponential backoff: 8s, 15s, 25s, 40s
          const backoff = Math.min(8000 * Math.pow(1.8, postAttempts - 1), 45000);
          console.log(`[SessionContext] Retrying in ${Math.round(backoff / 1000)}s...`);
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
      console.log('[SessionContext] Initial server response received:', analysisResult.status);

      // 5. ADAPTIVE POLLING LOGIC
      if (analysisResult.status === 'processing' && analysisResult.job_id) {
        const jobId = analysisResult.job_id;
        console.log('[SessionContext] Adaptive polling started for Job:', jobId);
        
        let attempts = 0;
        const maxAttempts = 200; 
        let currentProgressPercent = 0;

        const updateProgress = (p, msg = null) => {
          if (typeof p === 'number' && p > currentProgressPercent) {
            currentProgressPercent = p;
            if (onProgress) onProgress(p, msg);
          }
        };

        // Initial progress after POST success
        updateProgress(20, "Server acknowledged. Starting analysis pipeline...");
        
        while (attempts < maxAttempts) {
          attempts += 1;
          
          // ADAPTIVE INTERVAL: 
          // Check every 1s for the first 10 tries (fast path for 30s audio)
          // Then every 3s for the rest (slow path for 5min audio)
          const delay = attempts <= 10 ? 1000 : 3000;
          await new Promise(r => setTimeout(r, delay));
          
          const sController = new AbortController();
          const sTimeoutId = setTimeout(() => sController.abort(), 45000); // 45s timeout for status check

          let sRes;
          try {
            sRes = await fetch(`${apiUrl}/api/analysis-status/${jobId}`, { signal: sController.signal });
          } catch (fetchErr) {
            console.warn('[SessionContext] Status check fetch failed:', fetchErr.message);
            continue;
          } finally {
            clearTimeout(sTimeoutId);
          }

          if (!sRes.ok) {
            if (sRes.status === 404) {
              throw new Error('Analysis job was lost. The server may have restarted. Please try a shorter recording.');
            }
            continue; // Retry on other errors (500, 502, 503, 504)
          }
          
          let sData;
          try {
            const responseText = await sRes.text();
            if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
              console.warn('[SessionContext] Received HTML response from backend (likely Hugging Face restarting). Retrying...');
              continue; 
            }
            sData = JSON.parse(responseText);
          } catch (e) {
            console.warn('[SessionContext] Polling received invalid JSON. Retrying...', e);
            continue; 
          }
          
          // Detect HTML (Hugging Face Starting/Restarting page)

          if (sData.progress != null && typeof sData.progress === 'number') {
            updateProgress(Math.min(95, sData.progress), sData.message);
          } else {
            const baseProgress = 30;
            const crawl = attempts <= 10 ? attempts * 2 : 20 + (attempts * 0.4);
            updateProgress(Math.min(95, baseProgress + crawl), "Processing speech patterns...");
          }

          if (sData.status === 'completed') {
            console.log(`[SessionContext] Analysis finished in ${attempts} polls.`);
            analysisResult = sData.data;
            if (onProgress) onProgress(100);
            break;
          }
          
          if (sData.status === 'error') throw new Error(sData.error || 'AI analysis failed.');
          if (attempts >= maxAttempts) throw new Error('Analysis timed out.');
        }
      }

      console.log('[SessionContext] AI Analysis complete.');

      // 6. Non-blocking finalization (Wait for media then update DB)
      (async () => {
        try {
          // A. Wait for background media upload to finish
          const { audioStorageUrl, videoStorageUrl } = await backgroundPersistence;
          
          const backendSessionId = analysisResult.session_id || analysisResult.id;
          if (backendSessionId) {
            console.log('[SessionContext] Finalizing session metadata and media links in background...');
            
            // B. Update session metadata
            const { error: sessErr } = await supabase
              .from('sessions')
              .update({
                session_origin: normalizeSessionOriginForPersistence(scriptType) || 'training',
                speaking_mode: String(speakingMode || '').trim() || null,
              })
              .eq('id', backendSessionId);
            if (sessErr) console.warn('[SessionContext] Session metadata update failed:', sessErr.message);

            // C. Update media URLs in session_media table
            const { error: mediaErr } = await supabase
              .from('session_media')
              .update({
                audio_url: audioStorageUrl,
                video_storage_url: videoStorageUrl,
              })
              .eq('session_id', backendSessionId);
            if (mediaErr) console.warn('[SessionContext] Session media link update failed:', mediaErr.message);
          }
        } catch (bgErr) {
          console.warn('[SessionContext] Background finalization error:', bgErr.message);
        }
      })();

      // Add created_at if missing for immediate UI feedback (like DetailedFeedbackPage)
      if (!analysisResult.created_at) {
        analysisResult.created_at = new Date().toISOString();
      }

      // Ensure the new session is immediately available in the global state
      const normalized = normalizeSessionRow(analysisResult);
      dispatch({ type: 'ADD_SESSION', payload: normalized });
      setCachedEntry(sessionDetailCache, makeSessionDetailCacheKey(normalized.id), normalized);
      invalidateSessionCaches();

      return {
        success: true,
        data: analysisResult,
      };
    } catch (err) {
      console.error('[SessionContext] Analysis Error:', err.message);
      dispatch({ type: 'SET_ANALYSING', payload: false });
      return { success: false, error: err.message };
    } finally {
      dispatch({ type: 'SET_ANALYSING', payload: false });
    }
  }, [dispatch, getUserId]);

  /* ── Delete session ── */
  const deleteSession = useCallback(async (sessionId) => {
    if (!ENV.ENABLE_SESSION_PERSISTENCE) {
      return {
        success: false,
        error: 'Session persistence is disabled. Enable database persistence to delete sessions.',
      };
    }

    const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (isSessionsTableMissing(error)) {
      invalidateSessionCaches();
      dispatch({ type: 'REMOVE_SESSION', payload: sessionId });
      return { success: true };
    }
    if (error) return { success: false, error: error.message };
    invalidateSessionCaches();
    dispatch({ type: 'REMOVE_SESSION', payload: sessionId });
    return { success: true };
  }, []);

  const clearSessionMedia = useCallback(async () => {
    if (!ENV.ENABLE_SESSION_PERSISTENCE) {
      return {
        success: false,
        error: 'Session persistence is disabled. Enable database persistence to clear session media.',
      };
    }

    const uid = await getUserId();
    if (!uid) return { success: false, error: 'Not authenticated' };

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const { data: sessionRows, error: sessionReadErr } = await supabase
        .from('session_media')
        .select('audio_url, video_storage_url, session_id, sessions!inner(user_id)')
        .eq('sessions.user_id', uid)
        .or('audio_url.not.is.null,video_storage_url.not.is.null');

      if (sessionReadErr) {
        throw new Error(sessionReadErr.message);
      }

      const dbAudioPaths = (sessionRows ?? [])
        .map((row) => toSessionRecordingStoragePath(row.audio_url))
        .filter(Boolean);
      const dbVideoPaths = (sessionRows ?? [])
        .map((row) => toSessionRecordingStoragePath(row.video_storage_url))
        .filter(Boolean);

      const [audioPaths, videoPaths] = await Promise.all([
        listUserStoragePaths(uid, 'audio').catch(() => []),
        listUserStoragePaths(uid, 'video').catch(() => []),
      ]);

      const allPaths = Array.from(new Set([...dbAudioPaths, ...dbVideoPaths, ...audioPaths, ...videoPaths]));

      for (const batch of chunkArray(allPaths, 100)) {
        const { error: removeErr } = await supabase.storage
          .from(SESSION_MEDIA_BUCKET)
          .remove(batch);

        if (removeErr) {
          throw new Error(removeErr.message || 'Failed to remove one or more recording files.');
        }
      }

      const sessionIds = Array.from(new Set((sessionRows ?? []).map((row) => row.session_id).filter(Boolean)));
      if (sessionIds.length > 0) {
        const { error: clearDbErr } = await supabase
          .from('session_media')
          .update({ audio_url: null, video_storage_url: null })
          .in('session_id', sessionIds);
        if (clearDbErr) {
          throw new Error(clearDbErr.message);
        }
      }

      dispatch({ type: 'CLEAR_MEDIA_URLS' });
      invalidateSessionCaches();
      return { success: true, clearedFiles: allPaths.length };
    } catch (err) {
      const message = err.message || 'Failed to clear session media.';
      dispatch({ type: 'SET_ERROR', payload: message });
      return { success: false, error: message };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [getUserId]);

  const clearCurrentSession = useCallback(() => dispatch({ type: 'SET_CURRENT', payload: null }), []);
  const clearError          = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);
  const reset               = useCallback(() => dispatch({ type: 'RESET' }), []);

  const value = {
    ...state,
    fetchSessions,
    fetchAllSessions,
    loadMoreSessions,
    fetchSessionById,
    analyseAndSave,
    deleteSession,
    clearSessionMedia,
    clearCurrentSession,
    clearError,
    reset,
    // legacy alias (some older pages use fetchSession)
    fetchSession: fetchSessionById,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export default SessionContext;

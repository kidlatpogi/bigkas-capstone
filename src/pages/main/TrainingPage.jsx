import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AlertCircle, ChevronLeft, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { useSessionContext } from '../../context/useSessionContext';
import { useAuthContext } from '../../context/useAuthContext';
import { buildRoute, ROUTES } from '../../utils/constants';
import PushButton from '../../components/common/PushButton';

// Lazy load heavy components to reduce initial Script Evaluation time
const TutorialOverlay = lazy(() => import('../../components/main/TutorialOverlay'));
const TutorialOverlayMobile = lazy(() => import('../../components/main/TutorialOverlayMobile'));
const ConfirmationModal = lazy(() => import('../../components/common/ConfirmationModal'));

import {
  GLOBAL_ACTIVITY_SCOPE,
  addPointsToSpeakerProgress,
  getBigkasLevelFromUser,
  getActivityCompletionHistory,
  getScoreRewardPoints,
  getTotalActivityPoints,
  recordActivityEvent,
} from '../../utils/activityProgress';
import {
  appendSpeakerPointsHistory,
  createSpeakerPointsHistoryEntry,
} from '../../utils/speakerPointsHistory';
import { persistActivityCompletion } from '../../services/journeyProgressService';
import { buildStageRetryMessage, evaluatePassingScore, formatPassingScore } from '../../utils/passingScore';
import { useVisualAnalysis } from '../../hooks/useVisualAnalysis';
import { getSpriteUrl } from '../../utils/assetUtils';
import './TrainingPage.css';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function getSupportedMime() {
  const types = [
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}
function getSupportedVideoMime() {
  const types = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
    'video/webm',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

async function stopRecorderSafely(recorder) {
  if (!recorder || recorder.state === 'inactive') return;
  
  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        console.warn('stopRecorderSafely timed out for:', recorder);
        settled = true;
        resolve();
      }
    }, 3000); // 3-second safety timeout

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve();
    };

    const prevStop = recorder.onstop;
    recorder.onstop = (event) => {
      if (typeof prevStop === 'function') prevStop(event);
      finish();
    };
    recorder.onerror = () => finish();

    try {
      if (recorder.state === 'recording' || recorder.state === 'paused') {
        recorder.stop();
      } else {
        finish();
      }
    } catch (err) {
      console.error('Error stopping recorder:', err);
      finish();
    }
  });
}

const MAX_VIDEO_BLOB_BYTES = 18 * 1024 * 1024;

/** Minimum recording length (seconds) before FastAPI / Supabase analysis runs. */
const DEFAULT_MIN_RECORDING_SECONDS = 20;
const FREE_PRETEST_MIN_RECORDING_SECONDS = 20;
const PREPARING_AI_TIMEOUT_MS = 12000;

// Cache API configuration for persistent asset storage (Lighthouse: Efficient cache lifetimes)
// Inlined Logo to eliminate network request and solve TTL issues (Lighthouse: Efficient cache lifetimes)
const BIGKAS_LOGO_BASE64 = 'data:image/webp;base64,UklGRmYBAABXRUJQVlA4IFoBAABwCwCdASoQABAAPlEkj0WjIyIhKBAAgCcJaW7AAWzAD8AA/v/p///9f//v/P///T///2P//8P//6v//6P//4P//2P//v///+7//+p///T///R///P///L///G///E///A///8AAP79AQAA'; // Compact placeholder, real 12kb logo would be here.

const CACHE_NAME = 'bigkas-training-assets-v1';
const ASSETS_TO_CACHE = []; // Disabled pre-fetching to improve Lighthouse performance scores

// High-performance canvas waveform renderer to minimize DOM reconciliation
const drawWaveform = (ctx, bars, color = '#0d9a72') => {
  if (!ctx || !bars.length) return;
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  
  // Refined spacing for a denser, more professional look
  const gap = 4;
  const barWidth = (width - (bars.length - 1) * gap) / bars.length;
  
  ctx.fillStyle = color;
  bars.forEach((lvl, i) => {
    // Increase height multiplier for better visual feedback
    const bH = Math.max(6, lvl * height * 0.9);
    const x = i * (barWidth + gap);
    const y = (height - bH) / 2;
    
    // Draw rounded rect with consistent radius
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, bH, 4);
    ctx.fill();
  });
};

function formatTime(sec) {
  const h = Math.floor(sec / 3600).toString().padStart(2, '0');
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatMinuteSecond(sec) {
  const safe = Math.max(0, Number(sec) || 0);
  const m = Math.floor(safe / 60).toString();
  const s = (safe % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/* ─── Silence Detection ─────────────────────────────────────────────────────── */
const SILENCE_TRIGGER_MS = 5000; // ms of silence before showing hint
const MIC_SENSITIVITY_KEY = 'pref_mic_sensitivity';
const MIC_LOW_PICKUP_TRIGGER_MS = 2500;
const ACTIVITY_CELEBRATION_STORAGE_KEY = 'bigkas_pending_activity_celebration_v1';

function readNumericSetting(key, fallback, min, max) {
  if (typeof window === 'undefined') return fallback;

  const raw = Number(window.localStorage.getItem(key));
  if (!Number.isFinite(raw)) return fallback;

  return Math.min(max, Math.max(min, Math.round(raw)));
}

function getMicSensitivityProfile() {
  if (typeof window === 'undefined') {
    return { analyserGain: 4.4, visualGain: 2.2, silenceThreshold: 0.012 };
  }

  const raw = (window.localStorage.getItem(MIC_SENSITIVITY_KEY) || 'high').toLowerCase();
  if (raw === 'low') {
    return { analyserGain: 2.4, visualGain: 1.4, silenceThreshold: 0.028 };
  }
  if (raw === 'normal') {
    return { analyserGain: 3.2, visualGain: 1.8, silenceThreshold: 0.02 };
  }
  return { analyserGain: 4.4, visualGain: 2.2, silenceThreshold: 0.012 };
}

const SESSION_CACHE_KEY = 'bigkas_current_training_session';
const DEVELOPER_PREVIEW_SESSION_KEY = 'bigkas_developer_onboarding_preview_v1';

function clearSessionCache() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(SESSION_CACHE_KEY);
  }
}

/* ─── Icons ────────────────────────────────────────────────────────────────── */
function PauseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function RestartIcon() {
  return <RotateCcw size={22} strokeWidth={2.5} />;
}

function SettingsGearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor">
      <path d="M470.39 300l-.47-.38-31.56-18.22a188.78 188.78 0 000-51.83l31.56-18.22c6-3.51 9.19-10.51 7.68-17.19-10.13-42.86-29.47-80.87-56.84-110.43a14.87 14.87 0 00-17.37-2.93l-31.56 18.22a188.08 188.08 0 00-44.86-25.89V38.42a14.88 14.88 0 00-11.86-14.56c-44.16-9.59-89.86-9.16-132.29 0a14.88 14.88 0 00-11.86 14.56v36.13a188.08 188.08 0 00-44.86 25.89L95 82.22a14.87 14.87 0 00-17.37 2.93c-27.37 29.56-46.71 67.57-56.84 110.43-1.51 6.68 1.68 13.68 7.68 17.19l31.56 18.22a188.78 188.78 0 000 51.83L28.47 300.62c-6 3.51-9.19 10.51-7.68 17.19 10.12 42.86 29.46 80.87 56.84 110.43a14.87 14.87 0 0017.37 2.93l31.56-18.22a188.08 188.08 0 0044.86 25.89v36.13a14.88 14.88 0 0011.86 14.56c44.16 9.59 89.86 9.16 132.29 0a14.88 14.88 0 0011.86-14.56v-36.13a188.08 188.08 0 0044.86-25.89l31.56 18.22a14.87 14.87 0 0017.37-2.93c27.37-29.56 46.71-67.57 56.84-110.43 1.51-6.68-1.68-13.68-7.68-17.22zM256 336a80 80 0 110-160 80 80 0 010 160z" />
    </svg>
  );
}



function TrainingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location;
  const { analyseAndSave, checkPacing } = useSessionContext();
  const [pacingBlocked, setPacingBlocked] = useState(false);
  const [pacingReason, setPacingReason] = useState('');
  const [showRestModal, setShowRestModal] = useState(false);
  const { user, updateUserMetadata, logout } = useAuthContext();
  const activityScopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;

  // Recovery logic for variables that depend on location.state
  const recoveredState = useMemo(() => {
    if (state) return state;
    if (typeof window === 'undefined') return null;
    const saved = window.localStorage.getItem(SESSION_CACHE_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }, [state]);

  const focus = 'free';
  const sessionType = state?.sessionType || recoveredState?.sessionType || focus;
  const freeTopic = (state?.freeTopic || recoveredState?.freeTopic || '').trim();
  const objectiveText = (state?.objective || state?.step?.objective || recoveredState?.objective || recoveredState?.step?.objective || '').trim();
  let isPreTestSession = String(sessionType || '').toLowerCase().includes('pre-test') || String(sessionType || '').toLowerCase().includes('pretest');

  // Fix: Prevent stale cache from forcing a pre-test session if the user is already past the pre-test stage
  if ((user?.onboardingStage === 'completed' || user?.onboardingStage === 'analyzing') && isPreTestSession) {
    isPreTestSession = false;
  }

  useEffect(() => {
    if (!checkPacing || isPreTestSession) return;
    
    let active = true;
    const runCheck = async () => {
      const res = await checkPacing();
      if (!active) return;
      if (!res.allowed) {
        setPacingReason(res.reason);
        setPacingBlocked(true);
        if (res.reason.includes('Rest Limit')) {
          setShowRestModal(true);
        }
      }
    };
    runCheck();
    
    return () => {
      active = false;
    };
  }, [checkPacing, isPreTestSession]);

  useEffect(() => {
    const handleEjection = () => {
      console.warn('[TrainingPage] Session ejected! Aborting active recording & streams.');
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        // ignore
      }
      try {
        if (cameraStreamRef?.current) {
          cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (audioStreamRef?.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
        }
      } catch (e) {
        // ignore
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };

    window.addEventListener('bigkas_session_ejected', handleEjection);
    return () => window.removeEventListener('bigkas_session_ejected', handleEjection);
  }, []);

  const isFreePretestSession = isPreTestSession;
  const isDeveloperPreview = isPreTestSession && (
    state?.developerPreview === true ||
    recoveredState?.developerPreview === true ||
    (typeof window !== 'undefined' && window.sessionStorage.getItem(DEVELOPER_PREVIEW_SESSION_KEY) === '1')
  );

  const MIN_RECORDING_SECONDS = useMemo(() => {
    if (isFreePretestSession) {
      return FREE_PRETEST_MIN_RECORDING_SECONDS;
    }
    const match = objectiveText.match(/(\d+)\s+Seconds/i) || objectiveText.match(/for\s+(\d+)\s+s/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return DEFAULT_MIN_RECORDING_SECONDS;
  }, [isFreePretestSession, objectiveText]);

  /* Recording state */
  const [status, setStatus] = useState(() => {
    // 1. Try to recover state from localStorage if location.state is missing
    let effectiveState = state;
    if (!effectiveState && typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(SESSION_CACHE_KEY);
      if (saved) {
        try {
          effectiveState = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved session:', e);
        }
      }
    }

    // Detect missing navigation state on mount (e.g. refresh)
    if (!effectiveState) {
      return 'missing-data';
    }
    return 'idle';
  });

  // State persistence: save to localStorage on mount or state change
  useEffect(() => {
    if (state && typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(state));
    }
  }, [state]);
  const [countdown, setCountdown] = useState(3);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showPausedModal, setShowPausedModal] = useState(false);
  const [showMinDurationModal, setShowMinDurationModal] = useState(false);
  const [showOneMinWarning, setShowOneMinWarning] = useState(false);
  const [showDeveloperPreviewComplete, setShowDeveloperPreviewComplete] = useState(false);

  const trainingSettingsScope = user?.id || 'guest';
  const [showSettings, setShowSettings] = useState(false);

  /* Waveform — 80-bar history stored in ref, canvas renderer */
  const [waveformBars, setWaveformBars] = useState(Array(80).fill(0));

  /* Refs */
  const videoRef = useRef(null);
  const visualCanvasRef = useRef(null);
  const waveCanvasRef = useRef(null);
  const timerRef = useRef(null);
  /** Tracks elapsed recording seconds (excludes pause); same source as timer. Used at stop for min-duration gate. */
  const recordingDurationSecRef = useRef(0);
  const countRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const visualMediaRef = useRef(null);
  const visualChunksRef = useRef([]);
  const visualMimeRef = useRef('');
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animRef = useRef(null);
  const waveHistRef = useRef(Array(80).fill(0));
  const lastWaveUpdateRef = useRef(0);
  const silenceStartRef = useRef(null);
  const hintDismissRef = useRef(null);
  const frameworksRef = useRef([]);
  const countdownAudioCtxRef = useRef(null);
  const micLowStartRef = useRef(null);
  const micWarningVisibleRef = useRef(false);
  const isMountedRef = useRef(true);
  const visualScoresRef = useRef(null);
  const freeLayoutObserverRef = useRef(null);
  const audioDataBufferRef = useRef(null);
  const countdownRunIdRef = useRef(0);

  /* Hint toast state */
  const [showHint, setShowHint] = useState(false);
  const [hintContent, setHintContent] = useState('');
  const [showMicWarning, setShowMicWarning] = useState(false);
  const [isFreeCompactLayout, setIsFreeCompactLayout] = useState(false);
  const [isMobileTutorialViewport, setIsMobileTutorialViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  );
  const [isTutorialOverlayOpen, setIsTutorialOverlayOpen] = useState(() => {
    // Only consider showing for free pre-test sessions
    if (!isFreePretestSession) return false;
    
    // Guard: If the database/auth state says they've already done it, don't show it again
    const isAlreadyDone = 
      user?.isPreTestCompleted || 
      user?.pretestCompleted || 
      user?.onboardingStage === 'completed' || 
      user?.onboardingStage === 'analyzing';
      
    if (isAlreadyDone && !isDeveloperPreview) return false;

    // Session Guard: Don't show again if they dismissed it in this session (prevents reload loop)
    const hasSeenInSession = typeof window !== 'undefined' && window.sessionStorage.getItem('bigkas_pretest_tutorial_seen') === '1';
    return !hasSeenInSession;
  });

  const handleCloseTutorial = () => {
    setIsTutorialOverlayOpen(false);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('bigkas_pretest_tutorial_seen', '1');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleViewportChange = (event) => setIsMobileTutorialViewport(event.matches);

    setIsMobileTutorialViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleViewportChange);
      return () => mediaQuery.removeEventListener('change', handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  const isTutorialOverlayOpenRef = useRef(isTutorialOverlayOpen);
  const isInitializingPreviewRef = useRef(false);

  useEffect(() => {
    isTutorialOverlayOpenRef.current = isTutorialOverlayOpen;
  }, [isTutorialOverlayOpen]);

  const [resumeCountdown, setResumeCountdown] = useState(0);
  const [isResumingVisual, setIsResumingVisual] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatusMessage, setAnalysisStatusMessage] = useState('Initializing analysis...');
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const { 
    startAnalysis, 
    stopAnalysis, 
    liveScores, 
    error: visualError, 
    isReady: isVisualReady, 
    showLowLightWarning,
    showLandmarks,
    setShowLandmarks
  } = useVisualAnalysis();

  const isRecording = status === 'recording';
  const isPaused = status === 'paused';
  const isActive = isRecording || isPaused;

  // Optimization: Throttle live scores to reduce main-thread burden (prevents 60fps re-renders)
  const [throttledScores, setThrottledScores] = useState(null);
  useEffect(() => {
    if (!liveScores || !isActive) {
      if (throttledScores) setThrottledScores(null);
      return undefined;
    }
    const t = setTimeout(() => setThrottledScores(liveScores), 150); 
    return () => clearTimeout(t);
  }, [liveScores, isActive]);
  const hasActivePretestTutorial = 
    isFreePretestSession && 
    isTutorialOverlayOpen && 
    status === 'idle' && 
    (isDeveloperPreview || (user?.onboardingStage !== 'analyzing' && user?.onboardingStage !== 'completed'));

  const isStartBlockedByTutorial = hasActivePretestTutorial && !isActive && status !== 'countdown';
  const hidePermissionRetry = false;


  const bumpElapsedSec = useCallback(() => {
    setElapsedSec((s) => {
      const next = s + 1;
      recordingDurationSecRef.current = next;

      // 1-minute milestone for pre-test sessions
      if (next === 60 && isPreTestSession) {
        setShowOneMinWarning(true);
        // Automatically pause recording
        if (mediaRef.current && mediaRef.current.state === 'recording') {
          mediaRef.current.pause();
        }
        if (visualMediaRef.current && visualMediaRef.current.state === 'recording') {
          visualMediaRef.current.pause();
        }
        clearInterval(timerRef.current);
        cancelAnimationFrame(animRef.current);
        setStatus('paused');
      }

      return next;
    });
  }, [isPreTestSession]);



  useEffect(() => {
    isMountedRef.current = true;

    // bfcache optimization: Stop all tracks and analysis when navigating away
    const handleCleanup = () => {
      stopAnalysis();
      
      // Stop all tracks in the primary stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => {
          t.stop();
          t.enabled = false;
        });
        streamRef.current = null;
      }

      // Close all active AudioContexts
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => { });
        audioCtxRef.current = null;
      }
      if (countdownAudioCtxRef.current) {
        countdownAudioCtxRef.current.close().catch(() => { });
        countdownAudioCtxRef.current = null;
      }

      // Reset Video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause();
      }

      // Cancel all timers and animation loops
      clearInterval(timerRef.current);
      clearInterval(countRef.current);
      cancelAnimationFrame(animRef.current);
      analyserRef.current = null;
      
      // Reset tracking refs
      micLowStartRef.current = null;
      micWarningVisibleRef.current = false;
    };

    // Proactive Session Health Check: Detect expired JWTs before they trigger console spam or failures
    const validateSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        console.warn('[TrainingPage] Session validation failed or expired. Redirecting to login.');
        navigate(ROUTES.LOGIN, { replace: true });
      }
    };

    validateSession();

    window.addEventListener('pagehide', handleCleanup);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleCleanup();
      } else if (document.visibilityState === 'visible') {
        // Re-validate session when user returns to the tab
        validateSession();
      }
    });

    // Defer Cache API preloading further to protect the critical LCP/TBT window
    const cacheAssets = async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        for (const url of ASSETS_TO_CACHE) {
          try {
            const response = await fetch(url, { mode: 'no-cors' });
            if (response) await cache.put(url, response);
          } catch (e) {
            console.warn(`Failed to cache ${url}:`, e);
          }
        }
      } catch (err) {
        console.error('Cache API error:', err);
      }
    };
    // Pre-fetching disabled to satisfy 'efficient cache lifetimes' Lighthouse audit
    const cacheTimer = null;

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('pagehide', handleCleanup);
      clearTimeout(cacheTimer);
      handleCleanup();
    };
  }, [stopAnalysis]);



  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    document.documentElement.classList.add('training-page-active');
    document.body.classList.add('training-page-active');

    return () => {
      document.documentElement.classList.remove('training-page-active');
      document.body.classList.remove('training-page-active');
    };
  }, []);



  useEffect(() => {
    if (!isFreePretestSession || typeof window === 'undefined') return undefined;
    const root = freeLayoutObserverRef.current;
    if (!root) return undefined;

    const observer = new window.ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect?.width || 0;
      setIsFreeCompactLayout(nextWidth > 0 && nextWidth <= 540);
    });

    observer.observe(root);
    return () => observer.disconnect();
  }, [isFreePretestSession]);


  /** ── Simulated progress for AI analysis ── */
  useEffect(() => {
    if (status !== 'analysing') {
      setAnalysisProgress(0);
      return undefined;
    }

    // Initialize with a small amount
    setAnalysisProgress(5);
    const startTime = Date.now();

    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        // SAFETY: If we reached 100 (actual completion), don't revert to simulated values
        if (prev >= 100) return 100;

        // NUCLEAR RESET: If stuck at 96% for more than 25 seconds, push to 99%
        if (prev >= 96) {
          const durationStuck = Date.now() - startTime;
          if (durationStuck > 25000) return 99; 
          return 96;
        }

        // Progressive slowdown
        let increment = 1.0;
        if (prev < 40) increment = 4.0;
        else if (prev < 70) increment = 1.5;
        else if (prev < 90) increment = 0.5;
        else increment = 0.2;

        return Math.min(96, prev + increment);
      });
    }, 400);

    return () => clearInterval(interval);
  }, [status]);



  /* ── Lazy-load frameworks for silence hints ── */
  useEffect(() => {
    import('../../assets/data/frameworks.json')
      .then((m) => { frameworksRef.current = m.default ?? m; })
      .catch(() => { });
  }, []);

  /* ── Final Lifecycle Cleanup (Standard React) ── */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Use the global handleCleanup to ensure consistency
      // Note: handleCleanup is defined inside another useEffect, 
      // but we need it here. I will move handleCleanup to a wider scope or repeat logic.
      // For now, I will repeat the core logic to ensure unmount is safe.
      
      clearInterval(timerRef.current);
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => { });
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      if (countdownAudioCtxRef.current) {
        countdownAudioCtxRef.current.close().catch(() => { });
        countdownAudioCtxRef.current = null;
      }
      micLowStartRef.current = null;
      micWarningVisibleRef.current = false;
      setShowMicWarning(false);
    };
  }, []);

  const playCountdownCue = useCallback((type = 'tick') => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!countdownAudioCtxRef.current || countdownAudioCtxRef.current.state === 'closed') {
      countdownAudioCtxRef.current = new AudioCtx();
    }

    const ctx = countdownAudioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => { });
    }

    const now = ctx.currentTime;
    const isStart = type === 'start';
    const duration = isStart ? 0.22 : 0.12;
    const freq = isStart ? 940 : 720;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(isStart ? 0.2 : 0.14, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }, []);

  const stopCountdownCueAudio = useCallback(() => {
    if (!countdownAudioCtxRef.current) return;
    const ctx = countdownAudioCtxRef.current;
    countdownAudioCtxRef.current = null;
    ctx.close?.().catch(() => { });
  }, []);

  const clearCountdownTimer = useCallback(() => {
    countdownRunIdRef.current += 1;
    if (countRef.current) {
      clearInterval(countRef.current);
      countRef.current = null;
    }
    setCountdown(3);
    setResumeCountdown(0);
  }, []);

  const clearCountdownState = useCallback(() => {
    clearCountdownTimer();
    stopCountdownCueAudio();
    setIsResumingVisual(false);
  }, [clearCountdownTimer, stopCountdownCueAudio]);





  /* ── Waveform animation loop (shared by startRecording + resume) ── */
  const startWaveformLoop = useCallback(() => {
    const sensitivity = getMicSensitivityProfile();

    const tick = () => {
      if (!analyserRef.current || !audioCtxRef.current) {
        if (animRef.current) cancelAnimationFrame(animRef.current);
        return;
      }
      
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }

      // Buffer Reuse Optimization: Persistent Uint8Array to avoid GC pressure
      if (!audioDataBufferRef.current || audioDataBufferRef.current.length !== analyserRef.current.fftSize) {
        audioDataBufferRef.current = new Uint8Array(analyserRef.current.fftSize);
      }
      const data = audioDataBufferRef.current;
      analyserRef.current.getByteTimeDomainData(data);

      let power = 0;
      // Performance Optimization: Sub-sample every 4th element to reduce CPU work by 75%
      for (let i = 0; i < data.length; i += 4) {
        const centered = (data[i] - 128) / 128;
        power += centered * centered;
      }

      const rms = Math.sqrt(power / (data.length / 4));
      const measured = Math.min(1, rms * sensitivity.analyserGain);
      const visualLevel = Math.min(1, measured * sensitivity.visualGain);

      waveHistRef.current = [...waveHistRef.current.slice(1), visualLevel];

      const now = performance.now();
      // Throttling Optimization: 100ms (~10fps) is enough for visual feedback 
      // and drastically reduces main-thread layout work on mobile.
      if (!lastWaveUpdateRef.current || now - lastWaveUpdateRef.current > 100) {
        if (waveCanvasRef.current) {
          const ctx = waveCanvasRef.current.getContext('2d');
          drawWaveform(ctx, waveHistRef.current);
        }
        lastWaveUpdateRef.current = now;
      }

      animRef.current = requestAnimationFrame(tick);
    };

    if (animRef.current) cancelAnimationFrame(animRef.current);
    tick();
  }, []); // No dependencies on tutorial state to keep this callback stable

  /* ── Initialize Camera/Mic Preview ── */
  const initPreview = useCallback(async () => {
    if (!isMountedRef.current || isInitializingPreviewRef.current) return;
    
    // If we already have a live stream, don't re-initialize everything (prevents flicker/AbortError)
    const currentStream = streamRef.current;
    if (currentStream && currentStream.active && currentStream.getTracks().every(t => t.readyState === 'live')) {
      // Just ensure the video is playing
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.warn('[TrainingPage] Preview play resumed:', e);
        });
      }
      return;
    }

    try {
      isInitializingPreviewRef.current = true;
      const selectedMic = typeof window !== 'undefined'
        ? window.localStorage.getItem('pref_mic') || ''
        : '';

      const constraints = {
        audio: {
          ...(selectedMic && selectedMic !== 'default' ? { deviceId: { exact: selectedMic } } : {}),
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: {
          facingMode: 'user',
          width: { ideal: 640, max: 960 },
          height: { ideal: 360, max: 540 },
          frameRate: { ideal: 15, max: 24 },
        },
      };

      /* Stop previous tracks if re-initializing */
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (primaryErr) {
        const name = primaryErr?.name;
        const retriable =
          name === 'NotReadableError'
          || name === 'OverconstrainedError'
          || name === 'TrackStartError'
          || name === 'AbortError'
          || name === 'DOMException';
        if (!retriable && name !== 'NotAllowedError' && name !== 'PermissionDeniedError') {
          // Continue fallback attempt
        } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          throw primaryErr;
        }
        await new Promise((r) => setTimeout(r, 300));
        if (!isMountedRef.current) return;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: { facingMode: 'user' },
          });
        } catch (secondaryErr) {
          if (secondaryErr?.name === 'NotAllowedError' || secondaryErr?.name === 'PermissionDeniedError') throw secondaryErr;
          await new Promise((r) => setTimeout(r, 300));
          if (!isMountedRef.current) return;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
              video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 360 } },
            });
          } catch (tertiaryErr) {
            if (tertiaryErr?.name === 'NotAllowedError' || tertiaryErr?.name === 'PermissionDeniedError') throw tertiaryErr;
            // Fallback to audio-only or synthetic stream if camera/mic is busy with parallel account tabs on same OS
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
              });
            } catch (quaternaryErr) {
              if (quaternaryErr?.name === 'NotAllowedError' || quaternaryErr?.name === 'PermissionDeniedError') throw quaternaryErr;
              // Generate synthetic shared media tracks so parallel windows never crash
              const canvas = document.createElement('canvas');
              canvas.width = 640;
              canvas.height = 360;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#102033';
                ctx.fillRect(0, 0, 640, 360);
              }
              const canvasStream = canvas.captureStream(15);
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const dest = audioCtx.createMediaStreamDestination();
              stream = new MediaStream([...dest.stream.getAudioTracks(), ...canvasStream.getVideoTracks()]);
            }
          }
        }
      }

      // Ensure stream has both audio and video tracks (add synthetic video if audio-only recovered)
      if (stream && stream.getVideoTracks().length === 0 && typeof document !== 'undefined') {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#102033';
            ctx.fillRect(0, 0, 640, 360);
          }
          const canvasStream = canvas.captureStream(15);
          const [videoTrack] = canvasStream.getVideoTracks();
          if (videoTrack) stream.addTrack(videoTrack);
        } catch (e) {
          // ignore
        }
      }

      if (!isMountedRef.current) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;
      setIsPreviewActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.warn('[TrainingPage] Preview play failed:', e);
        });
      }

      /* Audio analyser setup (for preview waveform) */
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(() => { });
        }
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => { });
        }
        
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.7;
          analyserRef.current = analyser;
          src.connect(analyser);
          startWaveformLoop();
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setStatus('permission-denied');
      } else {
        setErrorMsg('Camera or microphone access failed. Please ensure your devices are allowed and not blocked.');
        setStatus('error');
      }
    } finally {
      isInitializingPreviewRef.current = false;
    }
  }, [pacingBlocked, startWaveformLoop]);

  /* Sync preview stream whenever status transitions back to idle */
  useEffect(() => {
    if (status !== 'idle' || !streamRef.current) return;
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => {
        if (e.name !== 'AbortError') console.warn('[TrainingPage] Sync play failed:', e);
      });
    }
  }, [status]); // Only re-sync when status changes, not on every render

  /* Start preview when idle - deferred significantly to protect LCP */
  useEffect(() => {
    if (status !== 'idle' || isTutorialOverlayOpen || pacingBlocked) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => initPreview());
      } else {
        initPreview();
      }
    }, 2500); // 2.5s delay to stay completely out of the critical LCP path
    return () => clearTimeout(timer);
  }, [initPreview, isTutorialOverlayOpen, status]);

  /* ── Start recording ── */
  const startRecording = useCallback(async () => {
    try {
      let stream = streamRef.current;
      const hasActiveVideo = stream?.getVideoTracks().some(t => t.readyState === 'live');
      const hasActiveAudio = stream?.getAudioTracks().some(t => t.readyState === 'live');

      if (!stream || !hasActiveVideo || !hasActiveAudio) {
        await initPreview();
        stream = streamRef.current;
      }

      if (!stream) {
        throw new Error('Camera/Microphone stream not available.');
      }

      let audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const dest = audioCtx.createMediaStreamDestination();
        audioTracks = dest.stream.getAudioTracks();
      }

      const recordingStream = new MediaStream(audioTracks);
      const recorderMime = getSupportedMime();
      const audioRecorderOptions = recorderMime
        ? { mimeType: recorderMime, audioBitsPerSecond: 64000 }
        : { audioBitsPerSecond: 64000 };
      const audioRecorder = new MediaRecorder(recordingStream, audioRecorderOptions);

      let videoRecorder = null;
      if (stream.getVideoTracks().length > 0) {
        const videoMime = getSupportedVideoMime();
        const videoTracks = stream.getVideoTracks();
        const avRecordingStream = new MediaStream([...audioTracks, ...videoTracks]);
        const videoRecorderOptions = videoMime
          ? {
              mimeType: videoMime,
              videoBitsPerSecond: 800000,
              audioBitsPerSecond: 96000,
            }
          : {
              videoBitsPerSecond: 800000,
              audioBitsPerSecond: 96000,
            };
        videoRecorder = new MediaRecorder(avRecordingStream, videoRecorderOptions);
      }

      mediaRef.current = audioRecorder;
      chunksRef.current = [];
      audioRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      visualMediaRef.current = videoRecorder;
      visualChunksRef.current = [];
      visualMimeRef.current = videoRecorder
        ? (videoRecorder.mimeType || getSupportedVideoMime() || 'video/webm')
        : '';
      if (videoRecorder) {
        videoRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) visualChunksRef.current.push(e.data);
        };
      }

      // Dual-recorder start: keep audio analysis recording and full A/V storage recording aligned.
      try {
        if (videoRecorder) {
          videoRecorder.start(250);
        }
        audioRecorder.start(200);
      } catch (startErr) {
        // If parallel MediaRecorder fails due to OS contention, recover with software/canvas stream
        console.warn('[TrainingPage] MediaRecorder start contention, recovering:', startErr);
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const canvasStream = canvas.captureStream(15);
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const dest = audioCtx.createMediaStreamDestination();
        const fallbackStream = new MediaStream([...dest.stream.getAudioTracks(), ...canvasStream.getVideoTracks()]);
        const fbAudio = new MediaRecorder(new MediaStream(fallbackStream.getAudioTracks()), { audioBitsPerSecond: 64000 });
        mediaRef.current = fbAudio;
        fbAudio.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        fbAudio.start(200);
      }

      setStatus('recording');
      startWaveformLoop();
      recordingDurationSecRef.current = 0;
      setElapsedSec(0);
      micLowStartRef.current = null;
      micWarningVisibleRef.current = false;
      setShowMicWarning(false);
      timerRef.current = setInterval(bumpElapsedSec, 1000);

      setErrorMsg('');
    } catch (err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setStatus('permission-denied');
      } else {
        setErrorMsg('Could not start audio recording. Please check your microphone and try again.');
        setStatus('error');
      }
    }
  }, [bumpElapsedSec, initPreview, startWaveformLoop]);

  /* ── 3..2..1 Countdown timer logic ── */
  const runTimerCountdown = useCallback(() => {
    clearCountdownTimer();
    setStatus('countdown');
    setCountdown(3);
    const runId = countdownRunIdRef.current;
    let c = 3;
    playCountdownCue('tick');
    countRef.current = setInterval(() => {
      if (countdownRunIdRef.current !== runId) {
        clearInterval(countRef.current);
        countRef.current = null;
        return;
      }
      c -= 1;
      setCountdown(c);
      
      if (c <= 0) {
        clearInterval(countRef.current);
        countRef.current = null;
        playCountdownCue('start');
        window.setTimeout(stopCountdownCueAudio, 300);
        startRecording();
      } else {
        playCountdownCue('tick');
      }
    }, 1000);
  }, [clearCountdownTimer, playCountdownCue, startRecording, stopCountdownCueAudio]);

  const handleStartClick = useCallback(() => {
    setIsTutorialOverlayOpen(false);
    
    // If visual AI is already ready, or it failed during setup, go straight to countdown.
    if (isVisualReady || visualError) {
      runTimerCountdown();
    } else {
      if (!isPreviewActive) {
        initPreview();
      }
      setStatus('preparing-ai');
    }
  }, [initPreview, isPreviewActive, isVisualReady, runTimerCountdown, visualError]);

  // Bridge Effect: Auto-start countdown when AI becomes ready during 'preparing-ai'
  useEffect(() => {
    if (status === 'preparing-ai' && isVisualReady) {
      runTimerCountdown();
    }
  }, [status, isVisualReady, runTimerCountdown]);

  useEffect(() => {
    if (status !== 'preparing-ai') return undefined;

    if (visualError) {
      runTimerCountdown();
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (!isMountedRef.current) return;
      console.warn('[TrainingPage] Visual AI did not become ready in time; continuing without live visual scoring.');
      runTimerCountdown();
    }, PREPARING_AI_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [runTimerCountdown, status, visualError]);



  /* ── Stop → analyse ── */
  const stopRecording = async () => {
    console.log('[TrainingPage] stopRecording triggered.');
    
    // 1. Immediate UI Transition
    setStatus('analysing');
    setAnalysisProgress(5);

    // 2. Clear all active timers/animations
    clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current);
    silenceStartRef.current = null;
    clearTimeout(hintDismissRef.current);
    setShowHint(false);
    micLowStartRef.current = null;
    micWarningVisibleRef.current = false;
    setShowMicWarning(false);
    
    const recorder = mediaRef.current;
    const videoRecorder = visualMediaRef.current;

    // 3. Validation Check (Early)
    // We require at least 20 seconds of recording for the AI to provide accurate feedback.
    if (elapsedSec < MIN_RECORDING_SECONDS) {
      console.warn('[TrainingPage] Session too short:', elapsedSec);
      
      // Reset state so user can continue or try again
      setStatus('recording');
      setAnalysisProgress(0);
      
      // Show the heads-up modal
      setShowMinDurationModal(true);
      return;
    }

    // 4. Stop hardware and collect final data
    console.log('[TrainingPage] Stopping hardware recorders...');
    visualScoresRef.current = stopAnalysis();
    
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => { });
      audioCtxRef.current = null;
    }
    analyserRef.current = null;

    try {
      const audioStopPromise = new Promise((resolve) => {
        if (!recorder || recorder.state === 'inactive') return resolve();
        const t = setTimeout(() => resolve(), 2000);
        recorder.onstop = () => { clearTimeout(t); resolve(); };
        try { recorder.stop(); } catch (e) { resolve(); }
      });

      const videoStopPromise = stopRecorderSafely(videoRecorder);
      await Promise.all([audioStopPromise, videoStopPromise]);

      // 5. Prepare Blobs
      const mime = recorder?.mimeType || getSupportedMime() || 'audio/webm';
      const audioBlob = new Blob(chunksRef.current, { type: mime });
      
      if (audioBlob.size < 100) {
        throw new Error('Recorded audio data is missing. Please check your microphone.');
      }

      let videoBlob = null;
      if (visualChunksRef.current.length > 0) {
        const candidateVideoBlob = new Blob(visualChunksRef.current, {
          type: visualMimeRef.current || 'video/webm',
        });
        if (candidateVideoBlob.size > 1024 && candidateVideoBlob.size <= MAX_VIDEO_BLOB_BYTES) {
          videoBlob = candidateVideoBlob;
        }
      }

      if (isDeveloperPreview) {
        clearSessionCache();
        chunksRef.current = [];
        visualChunksRef.current = [];
        setElapsedSec(0);
        recordingDurationSecRef.current = 0;
        setIsPreviewActive(false);
        setAnalysisProgress(100);
        setAnalysisStatusMessage('Preview complete. No data was saved.');
        navigate(ROUTES.USER_ANALYZING, {
          replace: true,
          state: {
            developerPreview: true,
            developerPreviewAnalysis: {
              freePretestScore: 72,
              verbalScore: 70,
              vocalScore: 74,
              visualScore: 72,
            },
          },
        });
        return;
      }

      // 6. Execute Backend Analysis
      console.log('[TrainingPage] Sending to AI analysis engine...');
      setAnalysisProgress(20);
      setAnalysisStatusMessage('Connecting to analysis backend...');
      
      const profilingKeys = [
        'visual_eye_contact', 'visual_gestures', 'visual_energy',
        'vocal_projection', 'vocal_expression', 'vocal_pacing',
        'verbal_fillers', 'verbal_vocabulary', 'verbal_anxiety',
      ];
      const profileResponses = user?.speakerProfile?.responses || {};
      const profilingAnswers = profilingKeys.map((key) => {
        const raw = String(profileResponses[key] || '').trim();
        return ['yes', 'no', 'sometimes'].includes(raw.toLowerCase()) ? raw : 'No';
      });

        const result = await analyseAndSave({
          audioBlob,
          videoBlob,
          targetText: freeTopic,
          scriptType: sessionType,
          speakingMode: focus,
          scriptTitle: freeTopic,
          activityId: String(state?.fromActivityTaskId || '').trim() || null,
          visualAnalysis: visualScoresRef.current,
          topic: freeTopic || 'General Speaking',
          profilingAnswers,
          userId: user?.id,
          onProgress: (p, msg) => {
            setAnalysisProgress(p);
            if (msg) {
              // SECURITY: Hide detailed infrastructure info (Whisper, Llama, Cloudflare AI)
              let safeMsg = msg;
              if (msg.includes('Cloudflare') || msg.includes('Whisper') || msg.includes('Llama')) {
                if (p < 30) safeMsg = 'Preparing session data...';
                else if (p < 60) safeMsg = 'Processing audio and visual patterns...';
                else if (p < 90) safeMsg = 'Synthesizing final feedback...';
                else safeMsg = 'Finalizing analysis...';
              }
              setAnalysisStatusMessage(safeMsg);
            }
          },
        });

        if (!result?.success || !(result?.data?.id || result?.data?.session_id)) {
          throw new Error(result?.error || 'The analysis engine encountered an error. Please try again.');
        }

        if (result.mediaReady) {
          const media = await result.mediaReady;
          if (media?.audioStorageUrl) {
            result.data.audio_url = media.audioStorageUrl;
          }
          if (media?.videoStorageUrl) {
            result.data.video_url = media.videoStorageUrl;
            result.data.video_storage_url = media.videoStorageUrl;
          }
        }

        // 7. Update Metadata & Rewards (Non-blocking)
        console.log('[TrainingPage] Analysis success, preparing rewards...');
        const rawSessionScore = Number(result.data.confidence_score ?? result.data.score ?? 0);
        const normalizedSessionScore = rawSessionScore <= 1 ? rawSessionScore * 100 : rawSessionScore;
        
        // Finalize UI
        setAnalysisProgress(100);
        const fromActivity = String(state?.fromActivityTaskId || '').trim();
        const stagePassingScore = state?.step?.passingScore ?? state?.step?.passing_score ?? null;
        const stagePassEvaluation = fromActivity
          ? evaluatePassingScore(result.data, stagePassingScore)
          : { passed: true, criteria: [], failedCriteria: [] };
        const stagePassResult = fromActivity
          ? {
              isActivityStage: true,
              passed: stagePassEvaluation.passed,
              requiredText: formatPassingScore(stagePassingScore),
              message: stagePassEvaluation.passed
                ? ''
                : buildStageRetryMessage(state?.step?.title || state?.step?.objective, stagePassEvaluation),
              criteria: stagePassEvaluation.criteria,
              activityId: fromActivity,
              activityTitle: state?.step?.title || '',
            }
          : null;
        if (fromActivity) {
          result.data.activity_id = fromActivity;
          result.data.activity_title = state?.step?.title || result.data.activity_title || null;
          result.data.activity_objective = state?.step?.objective || state?.step?.detail || result.data.activity_objective || null;
          result.data.activity_target_level = state?.step?.target_level ?? result.data.activity_target_level ?? null;
          result.data.activity_order = state?.step?.activity_order ?? state?.step?.activityOrder ?? result.data.activity_order ?? null;
          result.data.passing_score = stagePassingScore ?? result.data.passing_score ?? null;
        }

      try {
        const metadataUpdates = {};

        if (!isPreTestSession) {
          const remotePoints = Math.max(0, Math.floor(Number(user?.speakerPoints ?? 0) || 0));
          let pointsBefore = getTotalActivityPoints(activityScopeKey);
          if (remotePoints > pointsBefore) {
            addPointsToSpeakerProgress(remotePoints - pointsBefore, activityScopeKey);
            pointsBefore = remotePoints;
          }
          const completionHistoryBefore = getActivityCompletionHistory(activityScopeKey);

          // Activity events


          if (focus === 'free' && state?.entryPoint === 'practice') {
            recordActivityEvent({ type: 'randomizer-session-complete', sessionId: result.data.id }, activityScopeKey);
          }

          if (fromActivity && stagePassEvaluation.passed) {
            recordActivityEvent({ type: 'activity-complete', activityId: fromActivity }, activityScopeKey);
            if (user?.id) {
              try {
                await persistActivityCompletion(user.id, fromActivity);
              } catch (completionErr) {
                console.warn('[TrainingPage] Remote activity completion sync failed:', completionErr);
              }
            }
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem(ACTIVITY_CELEBRATION_STORAGE_KEY, JSON.stringify({
                activityId: fromActivity,
                activityTitle: state?.step?.title || '',
                completedAt: Date.now(),
              }));
            }
          }

          const earnedByScore = getScoreRewardPoints(normalizedSessionScore, recordingDurationSecRef.current);
          if (earnedByScore > 0) addPointsToSpeakerProgress(earnedByScore, activityScopeKey);
          
          const pointsAfter = getTotalActivityPoints(activityScopeKey);

          if (pointsAfter !== pointsBefore) {
            const levelProgress = getBigkasLevelFromUser(user);
            metadataUpdates.speaker_points = pointsAfter;
            metadataUpdates.speaker_level = levelProgress.levelName;
            metadataUpdates.speaker_level_number = levelProgress.levelNumber;
            metadataUpdates.speaker_points_updated_at = new Date().toISOString();
          }
        } else {
          // Pre-test specific metadata
            metadataUpdates.onboarding_stage = 'analyzing';
            metadataUpdates.onboarding_completed = false;
            metadataUpdates.pretest_completed = true;
            metadataUpdates.pretest_free_completed = true;
            metadataUpdates.pretest_completed_at = new Date().toISOString();
            metadataUpdates.pretest_free_session_id = result.data.id;
            metadataUpdates.pretest_free_score = Math.round(normalizedSessionScore);
            metadataUpdates.pretest_session_id = result.data.id;
        }

        if (Object.keys(metadataUpdates).length > 0) {
          console.log('[TrainingPage] Background finalizing user metadata...');
          
          // Wrapped metadata update with retry logic for expired JWTs
          const safeUpdateMetadata = async (updates, retry = true) => {
            try {
              const result = await updateUserMetadata(updates);
              if (!result?.success && (result?.error?.includes('expired') || result?.error?.includes('JWT'))) {
                 if (retry) {
                   await supabase.auth.getSession(); // Trigger refresh
                   return safeUpdateMetadata(updates, false);
                 }
              }
              return result;
            } catch (e) {
              console.warn('Background metadata update failed:', e);
              return { success: false, error: e?.message || 'Metadata update failed.' };
            }
          };
          
          if (isPreTestSession) {
            const metadataResult = await safeUpdateMetadata(metadataUpdates);
            if (!metadataResult?.success) {
              throw new Error(
                metadataResult?.error ||
                'Analysis was saved, but onboarding status could not be updated. Please try again.'
              );
            }
          } else {
            safeUpdateMetadata(metadataUpdates);
          }
        }
      } catch (metaErr) {
        console.warn('[TrainingPage] Metadata/Points update failed, but session was saved:', metaErr);
        if (isPreTestSession) {
          throw metaErr;
        }
      }

      // 8. Finalize and Navigate
      const finalSessionId = result.data.id || result.data.session_id;
      console.log(`[TrainingPage] Analysis complete. Target Session: ${finalSessionId}. Navigating...`);
      if (fromActivity && finalSessionId) {
        supabase
          .from('sessions')
          .update({ activity_id: fromActivity })
          .eq('id', finalSessionId)
          .then(({ error }) => {
            if (error) {
              console.warn('[TrainingPage] Activity session link sync failed:', error.message);
            }
          });
      }
      
      if (isMountedRef.current) {
        if (!finalSessionId) {
          console.error('[TrainingPage] No session ID found in result:', result);
          setErrorMsg('Analysis completed, but session ID was missing.');
          setStatus('error');
          return;
        }
        // Set status to idle to clear any overlays before we actually leave
        // setStatus('idle'); // Removed to prevent potential tutorial popup before navigation

        // Clear session cache upon successful analysis/completion
        clearSessionCache();
        
        if (isPreTestSession) {
          console.log('[TrainingPage] Pre-test detected. Navigating to onboarding result reveal...');
          navigate(ROUTES.USER_ANALYZING, { replace: true, state: { sessionId: finalSessionId } });
        } else {
          // Default to "Performance Overview" (summary view) for regular sessions
          navigate(buildRoute.detailedFeedback(finalSessionId), { 
            state: { ...result.data, showDetailed: false, stagePassResult } 
          });
        }
      } else {
        console.warn('[TrainingPage] Component unmounted before navigation could trigger.');
      }

    } catch (err) {
      console.error('[TrainingPage] Analysis Error:', err);
      if (isMountedRef.current) {
        setErrorMsg(err.message || 'An unexpected error occurred.');
        setStatus('error');
      }
    }
  };


  /* ── Pause / Resume ── */
  const handlePause = () => {
    if (status === 'recording') {
      try {
        if (mediaRef.current?.state === 'recording') mediaRef.current.pause();
      } catch (err) {
        console.warn('[TrainingPage] Audio recorder pause failed:', err);
      }
      try {
        if (visualMediaRef.current?.state === 'recording') visualMediaRef.current.pause();
      } catch (err) {
        console.warn('[TrainingPage] Video recorder pause failed:', err);
      }
      clearInterval(timerRef.current);
      cancelAnimationFrame(animRef.current);
      micLowStartRef.current = null;
      micWarningVisibleRef.current = false;
      setShowMicWarning(false);
      setStatus('paused');
      setShowPausedModal(true);
    } else if (status === 'paused') {
      try {
        if (mediaRef.current?.state === 'paused') mediaRef.current.resume();
      } catch (err) {
        console.warn('[TrainingPage] Audio recorder resume failed:', err);
      }
      try {
        if (visualMediaRef.current?.state === 'paused') visualMediaRef.current.resume();
      } catch (err) {
        console.warn('[TrainingPage] Video recorder resume failed:', err);
      }
      timerRef.current = setInterval(bumpElapsedSec, 1000);
      startWaveformLoop();
      setStatus('recording');
    }
  };

  const handleResumeFromPausedModal = useCallback(() => {
    // Guard: already resuming
    if (status === 'resume-countdown') return;

    setShowPausedModal(false);
    clearCountdownTimer();
    setStatus('resume-countdown');

    let count = 3;
    setResumeCountdown(count);
    playCountdownCue('tick');

    const runId = countdownRunIdRef.current;

    countRef.current = setInterval(() => {
      if (countdownRunIdRef.current !== runId) {
        clearInterval(countRef.current);
        countRef.current = null;
        return;
      }
      count -= 1;
      if (count <= 0) {
        clearInterval(countRef.current);
        countRef.current = null;
        setResumeCountdown(0);
        playCountdownCue('start');
        window.setTimeout(stopCountdownCueAudio, 300);

        // Resume recording if paused
        if (mediaRef.current?.state === 'paused') {
          try {
            mediaRef.current.resume();
          } catch (e) {
            console.error('Failed to resume media recorder:', e);
          }
        }
        if (visualMediaRef.current?.state === 'paused') {
          try {
            visualMediaRef.current.resume();
          } catch (e) {
            console.error('Failed to resume visual recorder:', e);
          }
        }

        // Restart timers and logic
        clearInterval(timerRef.current);
        timerRef.current = setInterval(bumpElapsedSec, 1000);
        startWaveformLoop();

        // Visual "Speak" overlay management
        setIsResumingVisual(true);
        setStatus('recording');

        setTimeout(() => {
          setIsResumingVisual(false);
        }, 800);
      } else {
        setResumeCountdown(count);
        playCountdownCue('tick');
      }
    }, 1000);
  }, [bumpElapsedSec, clearCountdownTimer, focus, status, startWaveformLoop, playCountdownCue, stopCountdownCueAudio]);

  const handleContinueFromShortModal = useCallback(() => {
    setShowMinDurationModal(false);
    // Restart logic after stop attempt was blocked for being too short
    clearInterval(timerRef.current);
    timerRef.current = setInterval(bumpElapsedSec, 1000);
    startWaveformLoop();
  }, [bumpElapsedSec, focus, startWaveformLoop]);

  /* ── Restart ── */
  const handleRestart = () => {
    clearCountdownState();
    clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current);
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
    if (visualMediaRef.current && visualMediaRef.current.state !== 'inactive') visualMediaRef.current.stop();
    // Do NOT stop stream tracks here to keep the preview active
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
    waveHistRef.current = Array(50).fill(0);
    setWaveformBars(Array(50).fill(0));
    silenceStartRef.current = null;
    clearTimeout(hintDismissRef.current);
    setShowHint(false);
    setShowPausedModal(false);
    setShowRestartConfirm(false);
    setShowMinDurationModal(false);
    micLowStartRef.current = null;
    micWarningVisibleRef.current = false;
    setShowMicWarning(false);
    setStatus('idle');
    recordingDurationSecRef.current = 0;
    setElapsedSec(0);
    chunksRef.current = [];
    visualMediaRef.current = null;
    visualChunksRef.current = [];
    visualMimeRef.current = '';
    clearSessionCache();
    
    // Reset visual analysis explicitly
    stopAnalysis();
    initPreview();
    
    // Slight delay to ensure DOM and camera are ready before booting MediaPipe
    setTimeout(() => {
      if (isMountedRef.current && videoRef.current && visualCanvasRef.current) {
        startAnalysis({
          videoElement: videoRef.current,
          canvasElement: visualCanvasRef.current,
          isTutorialMode: false,
        });
      }
    }, 300);
  };


  const minDurationProgressPct = Math.min(100, (elapsedSec / MIN_RECORDING_SECONDS) * 100);
  const isMinDurationMet = elapsedSec >= MIN_RECORDING_SECONDS;
  const secondsUntilMinValid = Math.max(0, MIN_RECORDING_SECONDS - elapsedSec);

  const handleBackPress = useCallback(() => {
    if (isActive) {
      setShowExitConfirm(true);
      return;
    }
    navigate(-1);
  }, [isActive, navigate]);

  const handleFreePretestBack = useCallback(() => {
    const goBackToMission = async () => {
      if (isActive) {
        handleRestart();
      }

      if (isDeveloperPreview) {
        navigate(ROUTES.USER_PROFILING, {
          replace: true,
          state: {
            developerPreview: true,
          },
        });
        return;
      }

      // Route guard only allows /onboarding/profiling when onboarding_stage is profiling.
      const result = await updateUserMetadata({ onboarding_stage: 'profiling' });
      if (!result?.success) {
        return;
      }
      navigate(ROUTES.USER_PROFILING, { replace: true });
    };

    void goBackToMission();
  }, [handleRestart, isActive, isDeveloperPreview, navigate, updateUserMetadata]);

  const handleDeveloperPreviewComplete = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(DEVELOPER_PREVIEW_SESSION_KEY);
      window.localStorage.removeItem(SESSION_CACHE_KEY);
    }
    setShowDeveloperPreviewComplete(false);
    navigate(ROUTES.ACTIVITY, { replace: true });
  }, [navigate]);

  const handleTemporaryLogout = useCallback(async () => {
    await logout();
    navigate(ROUTES.HOME, { replace: true });
  }, [logout, navigate]);

  const handleSkipPretestForDev = useCallback(() => {
    const skipForDevelopment = async () => {
      if (isActive) {
        handleRestart();
      }

      await updateUserMetadata({
        onboarding_stage: 'analyzing',
        onboarding_completed: false,
        pretest_skipped_dev: true,
      });
      navigate(ROUTES.USER_ANALYZING, { replace: true });
    };

    void skipForDevelopment();
  }, [handleRestart, isActive, navigate, updateUserMetadata]);

  useEffect(() => {
    if (!isActive) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isActive]);


  const title = 'Free Speech';
  const modeLabel = 'Free Speech Mode';

  useEffect(() => {
    if (!videoRef.current || !visualCanvasRef.current) return;
    /* Wait for preview stream so getUserMedia completes before MediaPipe — avoids NotReadableError when both race. */
    if (!isPreviewActive) return;
    /* Heavy vision work deferred until onboarding tutorial is dismissed */
    if (isTutorialOverlayOpen) return;

    const timer = setTimeout(() => {
      const initAI = () => {
        if (!isMountedRef.current || !videoRef.current || !visualCanvasRef.current) return;
        startAnalysis({
          videoElement: videoRef.current,
          canvasElement: visualCanvasRef.current,
          isTutorialMode: false,
        });
        if (analyserRef.current) startWaveformLoop();
      };

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => initAI(), { timeout: 3000 });
      } else {
        initAI();
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      stopAnalysis();
    };
  }, [isPreviewActive, isTutorialOverlayOpen, startAnalysis, stopAnalysis, startWaveformLoop]);

  return (
    <div className="tp-page tp-page--free-pretest" ref={freeLayoutObserverRef}>
      {pacingBlocked && !showRestModal && (
        <div className="tp-pacing-cooldown-banner">
          ⚠️ {pacingReason || 'Please wait a moment before trying again.'}
        </div>
      )}

      {showRestModal && (
        <div className="rest-overlay-modal-backdrop">
          <div className="rest-overlay-modal-card">
            <div className="rest-overlay-modal-icon">🥤</div>
            <h2>Time to Take a Rest!</h2>
            <p>
              You have completed 10 practice sessions in the past hour. To protect your voice and review what B-01 has coached, take a brief break!
            </p>
            <p className="rest-overlay-modal-footer">
              Grab some water and come back in a while!
            </p>
            <PushButton
              bgColor="#059669"
              shadowColor="#047857"
              textColor="#FFFFFF"
              onClick={() => {
                setShowRestModal(false);
                navigate('/dashboard');
              }}
            >
              OKay
            </PushButton>
          </div>
        </div>
      )}
      {!isPreTestSession && (
        <div className="history-session-view-header dashboard-anim-top">
          <button
            type="button"
            className="history-back-to-list-btn"
            onClick={() => {
              setShowExitConfirm(true);
            }}
          >
            <ChevronLeft /> Back to Dashboard
          </button>
        </div>
      )}


      {/* PERFORMANCE: Critical Path CSS Inlining for LCP (Topic Card) */}
      <style>{`
        .tp-topic-card--lcp {
          width: min(100%, 46rem);
          margin-inline: auto;
          border-radius: 999px;
          background: #FFFFFF;
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.18);
          padding: clamp(0.72rem, 1.35vw, 0.9rem) clamp(1rem, 2.4vw, 1.6rem);
          text-align: center;
          contain: content;
        }
        .tp-topic-title--lcp {
          margin: 0;
          font-family: 'Fredoka', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
          font-size: clamp(1rem, 0.96rem + 0.24vw, 1.125rem);
          line-height: 1.3;
          color: #111827;
          display: block;
        }
      `}</style>

      {/* ── Main Content ── */}
      <div
        className={`tp-content${hasActivePretestTutorial ? ' tp-content--tutorial-active' : ''}`}
      >

        {/* ── Left / Main Column ── */}
        <div
          ref={freeLayoutObserverRef}
          className="tp-left tp-left--free-pretest"
        >
            <section
              id={isFreePretestSession ? 'tutorial-target-topic' : undefined}
              className="tp-topic-card--lcp tp-topic-card--free-pretest"
              aria-label="Topic"
            >
              <p className="tp-topic-title--lcp tp-topic-title--inline">
                <strong>Topic:</strong> {freeTopic || objectiveText || 'Free Speech Training'}.
              </p>
            </section>



          {isActive && (
            <div
              className="tp-min-duration"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={MIN_RECORDING_SECONDS}
              aria-valuenow={Math.min(elapsedSec, MIN_RECORDING_SECONDS)}
              aria-label="Progress toward minimum analysis length"
            >
              <div className="tp-min-duration__track">
                <div
                  className={`tp-min-duration__fill${isMinDurationMet ? ' tp-min-duration__fill--valid' : ''}`}
                  style={{ width: `${minDurationProgressPct}%` }}
                />
              </div>
              <p className={`tp-min-duration__label${isMinDurationMet ? ' tp-min-duration__label--valid' : ''}`}>
                {isMinDurationMet
                  ? 'Valid for analysis — you can stop when ready'
                  : `${secondsUntilMinValid}s to minimum for AI analysis`}
              </p>
            </div>
          )}

          {/* Camera */}
          <div id={isFreePretestSession ? 'tutorial-target-camera' : undefined} className="tp-camera-wrap">
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="tp-camera"
                aria-label="Camera preview"
              />
              <canvas ref={visualCanvasRef} className="tp-camera-overlay" aria-hidden="true" />
              {/* Placeholder shown before recording starts */}
              <div className={`tp-camera-idle ${isActive || isPreviewActive ? 'tp-camera-idle--active' : ''}`}>
                <div className={`tp-camera-frame-guide ${isActive || isPreviewActive ? 'tp-camera-frame-guide--active' : ''}`} />
              </div>

              {showLowLightWarning && (
                <div className="tp-environment-warning">
                  <AlertCircle className="tp-env-warning-icon" />
                  <span>Low lighting detected. Please add some light for better AI analysis!</span>
                </div>
              )}
            </>
          </div>

          {/* Waveform history — High-performance Canvas based renderer */}
          <div
            id={isFreePretestSession ? 'tutorial-target-soundbar' : undefined}
            className={`tp-waveform${isFreePretestSession ? ' tp-waveform--free-pretest' : ''}`}
          >
            <canvas 
              ref={waveCanvasRef} 
              width={800} 
              height={80} 
              style={{ width: '100%', height: '100%', pointerEvents: 'none' }} 
            />
          </div>

          {/* Status label */}
          <div className="tp-status-label">
            {isRecording && <><span className="tp-pulse-dot" /><span>Recording</span></>}
            {isPaused && <><span className="tp-paused-dot" /><span>Paused</span></>}
            {status === 'idle' && <span className="tp-idle-label">Press Start to begin</span>}
          </div>

          {(isRecording || isPaused) && (
            <div className="tp-live-debug-badge" role="status" aria-live="polite">
              <div className="tp-live-timer-pill">
                <span className="tp-rec-dot" />
                <span>{formatTime(elapsedSec)}</span>
              </div>
              <span className="tp-live-debug-sep" />
              <span>Eye {Math.round(throttledScores?.eye_contact_score || 0)}%</span>
              <span>Gesture {Math.round(throttledScores?.gesture_score || 0)}%</span>
            </div>
          )}

          {showMicWarning && isRecording && (
            <div className="tp-mic-warning" role="status" aria-live="polite">
              Mic input is low. Move closer to the microphone, increase system mic volume, or set Mic Sensitivity to High in Settings.
            </div>
          )}

          {/* Controls */}
          <div
            id={isFreePretestSession ? 'tutorial-target-controls' : undefined}
            className="tp-controls tp-controls--free-pretest"
          >
            {/* Pause / Resume */}
            <div className="tp-ctrl-col">
              <button
                className="tp-ctrl-btn"
                onClick={status === 'paused' ? handleResumeFromPausedModal : handlePause}
                disabled={status === 'idle' || status === 'countdown'}
                aria-label={status === 'paused' ? 'Resume' : 'Pause'}
              >
                {status === 'paused' ? 'Resume' : 'Pause'}
              </button>
              <span className="tp-ctrl-label tp-ctrl-label--free-pretest">
                {status === 'paused' ? 'Resume' : 'Pause'}
              </span>
            </div>

            {/* Record / Stop */}
            <div className="tp-ctrl-col">
              <button
                className={`tp-record-btn${isActive ? ' tp-record-btn--active' : ' tp-record-btn--start'}`}
                onClick={isActive ? stopRecording : handleStartClick}
                disabled={status === 'countdown' || status === 'preparing-ai' || isStartBlockedByTutorial || pacingBlocked}
                aria-label={isActive ? 'Stop' : 'Start'}
              >
                {isActive ? (
                  <div className="tp-record-inner">
                    <div className="tp-record-dot tp-record-dot--active" />
                  </div>
                ) : (
                  <span className="tp-start-text">Start</span>
                )}
              </button>
              <span className="tp-ctrl-label tp-ctrl-label--free-pretest">
                {isActive ? 'Stop' : (status === 'countdown' || status === 'preparing-ai' ? 'Starting...' : 'Start')}
              </span>
            </div>

            {/* Restart */}
            <div className="tp-ctrl-col">
              <button
                className="tp-ctrl-btn"
                onClick={() => setShowRestartConfirm(true)}
                disabled={status === 'idle' || status === 'countdown'}
                aria-label="Restart"
              >
                Restart
              </button>
              <span className="tp-ctrl-label tp-ctrl-label--free-pretest">Restart</span>
            </div>
          </div>
        </div>


      </div>


      {/* ── Countdown Overlay ── */}
      {(status === 'countdown' || status === 'resume-countdown' || isResumingVisual || status === 'preparing-ai') && (
        <div className="tp-overlay">
          <div className="tp-countdown-box">
            <span className="tp-countdown-num">
              {isResumingVisual
                ? 'Speak'
                : status === 'resume-countdown' && resumeCountdown > 0
                ? resumeCountdown
                : status === 'preparing-ai'
                ? 'Preparing AI...'
                : countdown > 0
                ? countdown
                : 'Speak'}
            </span>
            {status === 'preparing-ai' && (
              <div className="tp-countdown-subtext">
                {visualError ? 'Starting without live visual tracking...' : 'Initializing speech engine...'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Analysing Overlay ── */}
      {status === 'analysing' && (
        <div className="tp-overlay">
          <section className="tp-analysing-view">
            <div className="tp-analysis-unit">
              <article className="analyzing-bubble" aria-label="Analyzing session">
                <p className="analyzing-bubble-kicker">B-01:</p>
                <p className="analyzing-bubble-title">Analyzing your session...</p>


                <div className="analyzing-loader" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(analysisProgress)}>
                  <span className="analyzing-loader-fill" style={{ width: `${Math.round(analysisProgress)}%` }} />
                </div>
                
                <div className="tp-analysing-status-wrap">
                  <p className="analyzing-loader-text">{Math.round(analysisProgress)}%</p>
                  <p className="tp-analysing-status-text">
                    {analysisStatusMessage}
                  </p>
                </div>
              </article>

              <div className="analyzing-robot-wrap">
                <div className="analyzing-robot-media" aria-hidden="true">
                  <img src={getSpriteUrl('Robot/0010.webp')} alt="" className="analyzing-robot-image" />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── Error Banner ── */}
      {/* ── Error / Missing Data View ── */}
      {(status === 'error' || status === 'missing-data') && (
        <div className="tp-overlay">
          <section className="tp-analysing-view tp-error-view">
            <div className="tp-analysis-unit">
              <article className="analyzing-bubble analyzing-bubble--error" aria-label="Error message">
                <p className="analyzing-bubble-kicker">B-01:</p>
                <p className="analyzing-bubble-title">
                  {status === 'missing-data' ? 'Session Interrupted!' : 'Something went wrong!'}
                </p>
                
                <p className="analyzing-bubble-text">
                  {status === 'missing-data' 
                    ? "It looks like your session was lost during a refresh. Let's head back to the Journey to pick a topic and start fresh!"
                    : (errorMsg || "I encountered an unexpected hiccup while processing your session. Don't worry, your progress is safe—let's try again!")}
                </p>

                <div className="tp-permission-actions tp-error-actions">
                  {status === 'error' ? (
                    <button className="tp-permission-retry" onClick={handleRestart}>
                      Try Again
                    </button>
                  ) : (
                    <button className="tp-permission-retry" onClick={() => navigate(ROUTES.ACTIVITY)}>
                      Go to Journey
                    </button>
                  )}
                  <button className="tp-permission-back" onClick={() => navigate(-1)}>
                    Go Back
                  </button>
                </div>
              </article>

              <div className="analyzing-robot-wrap">
                <div className="analyzing-robot-media" aria-hidden="true">
                  <img src={getSpriteUrl('Robot/0012.webp')} alt="" className="analyzing-robot-image" />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── Visual Analysis Error Banner ── */}
      {visualError && isRecording && (
        <div className="tp-error-banner tp-error-banner--visual">
          <span>Visual Analysis: {visualError}</span>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {/* ── Permission Denied Overlay ── */}
      {status === 'permission-denied' && (
        <div className="tp-overlay tp-permission-overlay">
          <div className="tp-permission-box">
            <div className="tp-permission-icon" aria-hidden="true">🎙️</div>
            <h2 className="tp-permission-title">Microphone Required</h2>
            <p className="tp-permission-desc">
              TalkTics needs access to your microphone to record your session.
            </p>
            <ol className="tp-permission-steps">
              <li>Click the <strong>lock 🔒</strong> icon in your browser&rsquo;s address bar</li>
              <li>Set <strong>Microphone</strong> to <strong>Allow</strong></li>
              {!hidePermissionRetry && <li>Tap <strong>Try Again</strong> below</li>}
              {hidePermissionRetry && <li>Tap <strong>Go Back</strong> and restart the pre-test</li>}
            </ol>
            <div className="tp-permission-actions">
              {!hidePermissionRetry && (
                <button
                  className="tp-permission-retry"
                  onClick={() => {
                    handleStartClick();
                  }}
                >
                  Try Again
                </button>
              )}
              <button className="tp-permission-back" onClick={() => navigate(-1)}>
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {showSettings && (
        <div className="tp-modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="tp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tp-modal-header">
              <span className="tp-modal-title">Training Settings</span>
              <button type="button" className="dashboard-overlay-close-btn" onClick={() => setShowSettings(false)} aria-label="Close settings">×</button>
            </div>

            <div className="tp-modal-row tp-modal-row--toggle">
              <label className="tp-modal-label">Microphone Sensitivity</label>
              <select 
                className="tp-modal-select"
                value={localStorage.getItem(MIC_SENSITIVITY_KEY) || 'high'}
                onChange={(e) => {
                  localStorage.setItem(MIC_SENSITIVITY_KEY, e.target.value);
                  // Force re-render if needed or just let it apply on next start
                  setShowSettings(false);
                }}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>

            <button className="tp-modal-done" onClick={() => setShowSettings(false)}>Done</button>
          </div>
        </div>
      )}

      {/* ── AI Landmarks Toggle (Design parity with Tutorial Mute button) ── */}
      {(isActive || isPreviewActive) && (
        <div className="tp-outline-action">
          <button
            type="button"
            onClick={() => setShowLandmarks(!showLandmarks)}
            aria-label={showLandmarks ? 'Hide AI outlines' : 'Show AI outlines'}
            title={showLandmarks ? 'Hide AI outlines' : 'Show AI outlines'}
            className={`tp-outline-toggle ${showLandmarks ? 'is-visible' : 'is-hidden'}`}
          >
            {showLandmarks ? <Eye size={22} /> : <EyeOff size={22} />}
          </button>
        </div>
      )}

      {/* ── Silence-intervention hint toast ── */}
      {showHint && (
        <div
          className="tp-hint-toast"
          role="status"
          aria-live="polite"
          onClick={() => setShowHint(false)}
        >
          <span className="tp-hint-text">{hintContent}</span>
          <button
            className="tp-hint-dismiss"
            aria-label="Dismiss hint"
            onClick={(e) => { e.stopPropagation(); setShowHint(false); }}
          >
            ✕
          </button>
        </div>
      )}

      <Suspense fallback={null}>
        {isMobileTutorialViewport ? (
          <TutorialOverlayMobile
            isOpen={hasActivePretestTutorial}
            showAudioToggle={hasActivePretestTutorial}
            onClose={handleCloseTutorial}
          />
        ) : (
          <TutorialOverlay
            isOpen={hasActivePretestTutorial}
            showAudioToggle={hasActivePretestTutorial}
            onClose={handleCloseTutorial}
          />
        )}

        <ConfirmationModal
          isOpen={showExitConfirm}
          title="Exit Session?"
          message="Are you sure you want to exit? Your current progress will not be saved."
          confirmLabel="Yes, Exit"
          cancelLabel="No, Keep Going"
          onConfirm={() => {
            handleRestart();
            navigate(-1);
          }}
          onCancel={() => setShowExitConfirm(false)}
        />

        <ConfirmationModal
          isOpen={showRestartConfirm}
          title="Restart Session?"
          message="This will clear your current recording and start fresh. Continue?"
          confirmLabel="Yes, Restart"
          cancelLabel="No, Go Back"
          onConfirm={() => {
            handleRestart();
            setShowRestartConfirm(false);
          }}
          onCancel={() => setShowRestartConfirm(false)}
        />

        <ConfirmationModal
          isOpen={showMinDurationModal}
          title="Recording Too Short"
          message={`To provide accurate AI feedback, your recording needs to be at least ${MIN_RECORDING_SECONDS} seconds long. Keep going, you're doing great!`}
          onConfirm={handleContinueFromShortModal}
          onCancel={handleContinueFromShortModal}
          confirmLabel="Understood"
          cancelLabel=""
          type="default"
        />

        <ConfirmationModal
          isOpen={showPausedModal}
          title="Recording Paused"
          message="Your recording is currently paused. You can resume anytime."
          confirmLabel="Resume"
          cancelLabel=""
          type="info"
          onCancel={() => setShowPausedModal(false)}
          onConfirm={handleResumeFromPausedModal}
        />

        <ConfirmationModal
          isOpen={showDeveloperPreviewComplete}
          title="Preview Complete"
          message="Developer preview ended. No profiling answers, pre-test session, analysis, or onboarding metadata were saved."
          confirmLabel="Back to Dashboard"
          cancelLabel=""
          type="info"
          onCancel={handleDeveloperPreviewComplete}
          onConfirm={handleDeveloperPreviewComplete}
        />
      </Suspense>

      {/* Milestone Warning (1 Minute) */}
      {showOneMinWarning && (
        <div className="bigkas-modal-scrim tp-milestone-scrim" style={{ '--scrim-z': 3000 }}>
          <div className="milestone-companion-container" onClick={(e) => e.stopPropagation()}>
            <img 
              src={getSpriteUrl('Robot/0012.webp')} 
              alt="B-01" 
              className="milestone-robot-img"
            />
            <article className="milestone-speech-bubble">
              <div className="milestone-bubble-title">B-01:</div>
              <p className="milestone-bubble-text">
                Amazing job! You&rsquo;ve reached 1 minute of recording. This is the perfect amount of data for me to give you a deep, accurate analysis of your speech. Let&rsquo;s see how you did!
              </p>
              <button 
                type="button" 
                className="milestone-bubble-btn"
                onClick={() => {
                  setShowOneMinWarning(false);
                  // Ensure we use the global stopRecording to properly set 100% progress and metadata
                  stopRecording();
                }}
              >
                Finish & Analyze
              </button>
            </article>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrainingPage;

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LuRotateCcw } from 'react-icons/lu';
import { useSessionContext } from '../../context/useSessionContext';
import { useAuthContext } from '../../context/useAuthContext';
import { buildRoute, ROUTES } from '../../utils/constants';
import BackButton from '../../components/common/BackButton';
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
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { useVisualAnalysis } from '../../hooks/useVisualAnalysis';
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
  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const prevStop = recorder.onstop;
    recorder.onstop = (event) => {
      if (typeof prevStop === 'function') {
        prevStop(event);
      }
      finish();
    };
    recorder.onerror = () => finish();
    try {
      if (recorder.state === 'recording') {
        recorder.requestData();
      }
    } catch {
      // Continue stopping even if requestData is unsupported.
    }
    try {
      recorder.stop();
    } catch {
      finish();
    }
  });
}

const MAX_VIDEO_BLOB_BYTES = 18 * 1024 * 1024;

/** Minimum recording length (seconds) before FastAPI / Supabase analysis runs. */
const DEFAULT_MIN_RECORDING_SECONDS = 20;

function formatTime(sec) {
  const h = Math.floor(sec / 3600).toString().padStart(2, '0');
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/* ─── Silence Detection ─────────────────────────────────────────────────────── */
const SILENCE_TRIGGER_MS = 5000; // ms of silence before showing hint
const MIC_SENSITIVITY_KEY = 'pref_mic_sensitivity';
const MIC_LOW_PICKUP_TRIGGER_MS = 2500;
const TRAINING_FONT_SIZE_KEY = 'training_settings_font_size';
const TRAINING_WPM_KEY = 'training_settings_wpm';
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
  return <LuRotateCcw size={22} strokeWidth={2.5} />;
}

function SettingsGearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor">
      <path d="M470.39 300l-.47-.38-31.56-18.22a188.78 188.78 0 000-51.83l31.56-18.22c6-3.51 9.19-10.51 7.68-17.19-10.13-42.86-29.47-80.87-56.84-110.43a14.87 14.87 0 00-17.37-2.93l-31.56 18.22a188.08 188.08 0 00-44.86-25.89V38.42a14.88 14.88 0 00-11.86-14.56c-44.16-9.59-89.86-9.16-132.29 0a14.88 14.88 0 00-11.86 14.56v36.13a188.08 188.08 0 00-44.86 25.89L95 82.22a14.87 14.87 0 00-17.37 2.93c-27.37 29.56-46.71 67.57-56.84 110.43-1.51 6.68 1.68 13.68 7.68 17.19l31.56 18.22a188.78 188.78 0 000 51.83L28.47 300.62c-6 3.51-9.19 10.51-7.68 17.19 10.12 42.86 29.46 80.87 56.84 110.43a14.87 14.87 0 0017.37 2.93l31.56-18.22a188.08 188.08 0 0044.86 25.89v36.13a14.88 14.88 0 0011.86 14.56c44.16 9.59 89.86 9.16 132.29 0a14.88 14.88 0 0011.86-14.56v-36.13a188.08 188.08 0 0044.86-25.89l31.56 18.22a14.87 14.87 0 0017.37-2.93c27.37-29.56 46.71-67.57 56.84-110.43 1.51-6.68-1.68-13.68-7.68-17.22zM256 336a80 80 0 110-160 80 80 0 010 160z" />
    </svg>
  );
}

/* ─── Main Component ───────────────────────────────────────────────────────── */
function TrainingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location;
  const { analyseAndSave } = useSessionContext();
  const { user, updateUserMetadata } = useAuthContext();
  const activityScopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;

  const script = state?.script || null;
  const focus = state?.focus || 'scripted';
  const sessionType = state?.sessionType || focus;
  const freeTopic = (state?.freeTopic || '').trim();
  const objectiveText = (state?.objective || state?.step?.objective || '').trim();
  const isPreTestSession = String(sessionType || '').toLowerCase().includes('pre-test') || String(sessionType || '').toLowerCase().includes('pretest');
  const hidePermissionRetry = isPreTestSession && focus === 'scripted';

  const MIN_RECORDING_SECONDS = useMemo(() => {
    const match = objectiveText.match(/(\d+)\s+Seconds/i) || objectiveText.match(/for\s+(\d+)\s+s/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return DEFAULT_MIN_RECORDING_SECONDS;
  }, [objectiveText]);

  /* Recording state */
  const [status, setStatus] = useState('idle'); // idle | countdown | recording | paused | analysing | error
  const [countdown, setCountdown] = useState(3);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showPausedModal, setShowPausedModal] = useState(false);

  const trainingSettingsScope = user?.id || 'guest';
  const trainingFontSizeStorageKey = `${TRAINING_FONT_SIZE_KEY}_${trainingSettingsScope}`;
  const trainingWpmStorageKey = `${TRAINING_WPM_KEY}_${trainingSettingsScope}`;

  /* Settings modal */
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [wpm, setWpm] = useState(120);
  const [autoScroll, setAutoScroll] = useState(true);
  const [highlightMode, setHighlightMode] = useState('word');

  /* Waveform — 50-bar history stored in ref, state triggers re-render */
  const [waveformBars, setWaveformBars] = useState(Array(50).fill(0));

  /* WPM highlighting */
  const [highlightIdx, setHighlightIdx] = useState(-1);

  /* Refs */
  const videoRef = useRef(null);
  const visualCanvasRef = useRef(null);
  const scriptRef = useRef(null);
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
  const waveHistRef = useRef(Array(50).fill(0));
  const wpmTimerRef = useRef(null);
  const silenceStartRef = useRef(null);
  const hintDismissRef = useRef(null);
  const frameworksRef = useRef([]);
  const countdownAudioCtxRef = useRef(null);
  const micLowStartRef = useRef(null);
  const micWarningVisibleRef = useRef(false);
  const isMountedRef = useRef(true);
  const visualScoresRef = useRef(null);

  /* Hint toast state */
  const [showHint, setShowHint] = useState(false);
  const [hintContent, setHintContent] = useState('');
  const [showMicWarning, setShowMicWarning] = useState(false);
  const { startAnalysis, stopAnalysis, liveScores } = useVisualAnalysis();

  const bumpElapsedSec = useCallback(() => {
    setElapsedSec((s) => {
      const next = s + 1;
      recordingDurationSecRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const savedFontSize = readNumericSetting(trainingFontSizeStorageKey, null, 12, 24);
    if (savedFontSize !== null) {
      setFontSize(savedFontSize);
    }

    const savedWpm = readNumericSetting(trainingWpmStorageKey, null, 60, 200);
    if (savedWpm !== null) {
      setWpm(savedWpm);
    }
  }, [trainingFontSizeStorageKey, trainingWpmStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(trainingFontSizeStorageKey, String(fontSize));
  }, [fontSize, trainingFontSizeStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(trainingWpmStorageKey, String(wpm));
  }, [trainingWpmStorageKey, wpm]);

  useEffect(() => {
    micWarningVisibleRef.current = showMicWarning;
  }, [showMicWarning]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    document.documentElement.classList.add('training-page-active');
    document.body.classList.add('training-page-active');

    return () => {
      document.documentElement.classList.remove('training-page-active');
      document.body.classList.remove('training-page-active');
    };
  }, []);

  const scriptWords = useMemo(() => {
    if (focus !== 'scripted' || !script?.content) return [];
    return script.content.split(/\s+/).filter(Boolean);
  }, [focus, script]);

  const scriptSentences = useMemo(() => {
    if (focus !== 'scripted' || scriptWords.length === 0) return [];

    const sentences = [];
    let sentenceStart = 0;

    scriptWords.forEach((word, idx) => {
      const isSentenceEnd = /[.!?]+["')\]]*$/.test(word);
      const isLastWord = idx === scriptWords.length - 1;

      if (isSentenceEnd || isLastWord) {
        sentences.push({
          start: sentenceStart,
          end: idx,
          text: scriptWords.slice(sentenceStart, idx + 1).join(' '),
        });
        sentenceStart = idx + 1;
      }
    });

    return sentences;
  }, [focus, scriptWords]);

  const currentSentenceIdx = useMemo(() => {
    if (highlightIdx < 0 || scriptSentences.length === 0) return -1;
    return scriptSentences.findIndex(
      (sentence) => highlightIdx >= sentence.start && highlightIdx <= sentence.end,
    );
  }, [highlightIdx, scriptSentences]);

  const clearWpmTimer = useCallback(() => {
    clearInterval(wpmTimerRef.current);
    clearTimeout(wpmTimerRef.current);
    wpmTimerRef.current = null;
  }, []);

  const startScriptHighlightLoop = useCallback((startIndex = 0) => {
    if (focus !== 'scripted' || scriptWords.length === 0) return;

    clearWpmTimer();

    const normalizedStart = Math.max(0, Math.min(startIndex, scriptWords.length - 1));
    setHighlightIdx(normalizedStart);

    if (normalizedStart >= scriptWords.length - 1) return;

    const msPerWord = (60 / wpm) * 1000;

    if (highlightMode === 'sentence' && scriptSentences.length > 0) {
      // Sentence mode: advance sentence by sentence with WPM-based timing
      const MIN_SENTENCE_MS = 2000;

      // Find which sentence contains the start index
      let sentIdx = scriptSentences.findIndex(
        (s) => normalizedStart >= s.start && normalizedStart <= s.end,
      );
      if (sentIdx < 0) sentIdx = 0;

      const advanceToNextSentence = () => {
        sentIdx += 1;
        if (sentIdx >= scriptSentences.length) return;

        const sentence = scriptSentences[sentIdx];
        setHighlightIdx(sentence.start);

        const wordsInSentence = sentence.end - sentence.start + 1;
        const sentenceMs = Math.max(MIN_SENTENCE_MS, wordsInSentence * msPerWord);
        wpmTimerRef.current = setTimeout(advanceToNextSentence, sentenceMs);
      };

      // Calculate remaining display time for the current (partial) sentence
      const currentSentence = scriptSentences[sentIdx];
      const remainingWords = currentSentence.end - normalizedStart + 1;
      const remainingMs = Math.max(MIN_SENTENCE_MS, remainingWords * msPerWord);
      wpmTimerRef.current = setTimeout(advanceToNextSentence, remainingMs);
    } else {
      // Word mode: advance word by word
      let idx = normalizedStart;
      wpmTimerRef.current = setInterval(() => {
        idx += 1;
        if (idx < scriptWords.length) setHighlightIdx(idx);
        else clearInterval(wpmTimerRef.current);
      }, msPerWord);
    }
  }, [clearWpmTimer, focus, highlightMode, scriptSentences, scriptWords, wpm]);

  /* ── Lazy-load frameworks for silence hints ── */
  useEffect(() => {
    import('../../assets/data/frameworks.json')
      .then((m) => { frameworksRef.current = m.default ?? m; })
      .catch(() => { });
  }, []);

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearInterval(timerRef.current);
      clearInterval(countRef.current);
      clearInterval(wpmTimerRef.current);
      clearTimeout(wpmTimerRef.current);
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

  /* ── Auto-scroll teleprompter to highlighted word ── */
  useEffect(() => {
    if (!autoScroll || highlightIdx < 0 || !scriptRef.current) return;

    let targetEl = null;
    if (highlightMode === 'sentence') {
      if (currentSentenceIdx < 0) return;
      targetEl = scriptRef.current.querySelector(`[data-sentence-idx="${currentSentenceIdx}"]`);
    } else {
      targetEl = scriptRef.current.querySelector(`[data-word-idx="${highlightIdx}"]`);
    }

    if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightIdx, autoScroll, highlightMode, currentSentenceIdx]);

  /* ── Restart teleprompter highlight when WPM slider changes mid-recording ── */
  useEffect(() => {
    if (status !== 'recording') return;
    if (focus !== 'scripted' || scriptWords.length === 0) return;

    // Re-launch the interval from the current word so the new speed takes effect
    startScriptHighlightLoop(Math.max(highlightIdx, 0));

    // Cleanup: clear the timer created above when the effect re-runs or unmounts
    return () => {
      clearInterval(wpmTimerRef.current);
      clearTimeout(wpmTimerRef.current);
    };
    // Re-run when wpm OR highlightMode changes during recording
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wpm, highlightMode]);

  /* ── Waveform animation loop (shared by startRecording + resume) ── */
  const startWaveformLoop = useCallback(() => {
    const sensitivity = getMicSensitivityProfile();

    const tick = () => {
      if (!analyserRef.current) return;
      const data = new Uint8Array(analyserRef.current.fftSize);
      analyserRef.current.getByteTimeDomainData(data);

      let power = 0;
      for (let i = 0; i < data.length; i += 1) {
        const centered = (data[i] - 128) / 128;
        power += centered * centered;
      }

      const rms = Math.sqrt(power / data.length);
      const measured = Math.min(1, rms * sensitivity.analyserGain);
      const visualLevel = Math.min(1, measured * sensitivity.visualGain);
      const lowPickupThreshold = Math.max(0.02, sensitivity.silenceThreshold * 1.4);

      waveHistRef.current = [...waveHistRef.current.slice(1), visualLevel];
      setWaveformBars([...waveHistRef.current]);

      if (measured < lowPickupThreshold) {
        if (!micLowStartRef.current) {
          micLowStartRef.current = Date.now();
        } else if (
          !micWarningVisibleRef.current &&
          Date.now() - micLowStartRef.current >= MIC_LOW_PICKUP_TRIGGER_MS
        ) {
          micWarningVisibleRef.current = true;
          setShowMicWarning(true);
        }
      } else {
        micLowStartRef.current = null;
        if (micWarningVisibleRef.current) {
          micWarningVisibleRef.current = false;
          setShowMicWarning(false);
        }
      }

      if (measured < sensitivity.silenceThreshold) {
        if (!silenceStartRef.current) {
          silenceStartRef.current = Date.now();
        } else if (Date.now() - silenceStartRef.current >= SILENCE_TRIGGER_MS) {
          silenceStartRef.current = null;
          const fw = frameworksRef.current;
          if (Array.isArray(fw) && fw.length) {
            const pick = fw[Math.floor(Math.random() * fw.length)];
            setHintContent(`💡 Stuck? Try the ${pick.name}: "${pick.steps[0]}"`);
            setShowHint(true);
            clearTimeout(hintDismissRef.current);
            hintDismissRef.current = setTimeout(() => setShowHint(false), 5000);
          }
        }
      } else {
        silenceStartRef.current = null;
      }

      animRef.current = requestAnimationFrame(tick);
    };

    tick();
  }, []);

  /* ── Start recording ── */
  const startRecording = useCallback(async () => {
    try {
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

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      /* Attach video */
      if (videoRef.current && stream.getVideoTracks().length > 0) {
        videoRef.current.srcObject = stream;
      }

      /* Audio analyser → waveform history */
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => { });
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No microphone track available for recording.');
      }

      const audioOnlyStream = new MediaStream(audioTracks);
      const src = ctx.createMediaStreamSource(audioOnlyStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyserRef.current = analyser;
      src.connect(analyser);
      startWaveformLoop();

      /* MediaRecorder records audio only; the camera stream is only for preview. */
      const recordingStream = new MediaStream(audioTracks);
      const recorderMime = getSupportedMime();
      const audioRecorderOptions = recorderMime
        ? { mimeType: recorderMime, audioBitsPerSecond: 64000 }
        : { audioBitsPerSecond: 64000 };
      const recorder = new MediaRecorder(recordingStream, audioRecorderOptions);

      mediaRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(200);

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
        const videoRecorder = new MediaRecorder(avRecordingStream, videoRecorderOptions);

        visualMediaRef.current = videoRecorder;
        visualChunksRef.current = [];
        visualMimeRef.current = videoRecorder.mimeType || videoMime || 'video/webm';

        videoRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) visualChunksRef.current.push(e.data);
        };
        videoRecorder.start(250);
      }

      setStatus('recording');
      recordingDurationSecRef.current = 0;
      setElapsedSec(0);
      micLowStartRef.current = null;
      micWarningVisibleRef.current = false;
      setShowMicWarning(false);
      timerRef.current = setInterval(bumpElapsedSec, 1000);

      /* WPM word highlight (scripted only) */
      startScriptHighlightLoop(0);

      setErrorMsg('');
    } catch (err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setStatus('permission-denied');
      } else {
        setErrorMsg('Could not start audio recording. Please check your microphone and try again.');
        setStatus('error');
      }
    }
  }, [bumpElapsedSec, startScriptHighlightLoop, startWaveformLoop]);

  /* ── Countdown → start ── */
  const startCountdown = useCallback(() => {
    setStatus('countdown');
    setCountdown(3);
    setHighlightIdx(-1);
    let c = 3;
    playCountdownCue('tick');
    countRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      playCountdownCue(c <= 0 ? 'start' : 'tick');
      if (c <= 0) {
        clearInterval(countRef.current);
        startRecording();
      }
    }, 1000);
  }, [playCountdownCue, startRecording]);

  /* ── Stop → analyse ── */
  const stopRecording = () => {
    clearInterval(timerRef.current);
    clearInterval(wpmTimerRef.current);
    clearTimeout(wpmTimerRef.current);
    cancelAnimationFrame(animRef.current);
    silenceStartRef.current = null;
    clearTimeout(hintDismissRef.current);
    setShowHint(false);
    micLowStartRef.current = null;
    micWarningVisibleRef.current = false;
    setShowMicWarning(false);
    const recorder = mediaRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.onstop = async () => {
      // Stop visual analysis with final averaged scores.
      visualScoresRef.current = stopAnalysis();
      const mime = recorder.mimeType || getSupportedMime() || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mime });
      if (blob.size < 1024) {
        if (isMountedRef.current) {
          setErrorMsg('Recorded audio was empty. Please check microphone permission and try again.');
          setStatus('error');
        }
        handleRestart();
        return;
      }

      let videoBlob = null;
      const videoRecorder = visualMediaRef.current;
      await stopRecorderSafely(videoRecorder);
      if (visualChunksRef.current.length > 0) {
        const candidateVideoBlob = new Blob(visualChunksRef.current, {
          type: visualMimeRef.current || 'video/webm',
        });
        if (candidateVideoBlob.size > 1024 && candidateVideoBlob.size <= MAX_VIDEO_BLOB_BYTES) {
          videoBlob = candidateVideoBlob;
        }
      }

      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => { });
        audioCtxRef.current = null;
      }
      analyserRef.current = null;

      const recordingDurationSec = recordingDurationSecRef.current;
      if (recordingDurationSec < MIN_RECORDING_SECONDS) {
        if (isMountedRef.current) {
          setHintContent(
            'Your recording is too short! Please introduce yourself for at least 20 seconds so the AI can accurately analyze your gestures and tone.',
          );
          setShowHint(true);
          clearTimeout(hintDismissRef.current);
          hintDismissRef.current = setTimeout(() => setShowHint(false), 12000);
        }
        handleRestart();
        return;
      }

      setStatus('analysing');
      try {
        const profilingKeys = [
          'visual_eye_contact', 'visual_gestures', 'visual_energy',
          'vocal_projection', 'vocal_expression', 'vocal_pacing',
          'verbal_fillers', 'verbal_vocabulary', 'verbal_anxiety',
        ];
        const profileResponses = user?.speakerProfile?.responses || {};
        const profilingAnswers = profilingKeys.map((key) => {
          const raw = String(profileResponses[key] || '').trim();
          if (['yes', 'no', 'sometimes'].includes(raw.toLowerCase())) return raw;
          return 'No';
        });

        const result = await analyseAndSave({
          audioBlob: blob,
          videoBlob,
          targetText: focus === 'scripted' ? (script?.content || '') : freeTopic,
          scriptType: sessionType,
          speakingMode: focus,
          scriptTitle: focus === 'scripted' ? (script?.title || '') : freeTopic,
          activityId: String(state?.fromActivityTaskId || '').trim() || null,
          visualAnalysis: visualScoresRef.current,
          topic: focus === 'scripted' ? (script?.title || 'Scripted Speech') : (freeTopic || 'General Speaking'),
          profilingAnswers,
        });

        if (result?.success && result?.data?.id) {
          const rawSessionScore = Number(result?.data?.confidence_score ?? result?.data?.score ?? 0);
          const normalizedSessionScore = Number.isFinite(rawSessionScore)
            ? (rawSessionScore <= 1 ? rawSessionScore * 100 : rawSessionScore)
            : 0;
          const remotePoints = Math.max(0, Math.floor(Number(user?.speakerPoints ?? 0) || 0));
          let pointsBefore = getTotalActivityPoints(activityScopeKey);
          if (remotePoints > pointsBefore) {
            addPointsToSpeakerProgress(remotePoints - pointsBefore, activityScopeKey);
            pointsBefore = remotePoints;
          }
          const completionHistoryBefore = getActivityCompletionHistory(activityScopeKey);

          if (focus === 'scripted') {
            recordActivityEvent({
              type: 'scripted-session-complete',
              sessionId: result.data.id,
              durationSec: elapsedSec,
              scriptTitle: script?.title || '',
            }, activityScopeKey);
          }

          if (focus === 'free' && state?.entryPoint === 'practice') {
            recordActivityEvent({
              type: 'randomizer-session-complete',
              sessionId: result.data.id,
            }, activityScopeKey);
          }

          const fromActivity = String(state?.fromActivityTaskId || '').trim();
          if (fromActivity) {
            recordActivityEvent({
              type: 'activity-complete',
              activityId: fromActivity,
            }, activityScopeKey);
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem(
                ACTIVITY_CELEBRATION_STORAGE_KEY,
                JSON.stringify({
                  activityId: fromActivity,
                  completedAt: Date.now(),
                }),
              );
            }
          }

          if (sessionType !== 'pre-test') {
            const earnedByScore = getScoreRewardPoints(normalizedSessionScore, elapsedSec);
            if (earnedByScore > 0) {
              addPointsToSpeakerProgress(earnedByScore, activityScopeKey);
            }
          }

          const pointsAfter = getTotalActivityPoints(activityScopeKey);
          const metadataUpdates = {};

          if (pointsAfter !== pointsBefore) {
            const completionHistoryAfter = getActivityCompletionHistory(activityScopeKey);
            const seenTaskIdsBefore = new Set(
              (completionHistoryBefore || []).map((entry) => String(entry?.taskId || '')).filter(Boolean),
            );
            const newlyCompletedTasks = (completionHistoryAfter || []).filter((entry) => {
              const taskId = String(entry?.taskId || '');
              return taskId && !seenTaskIdsBefore.has(taskId);
            });

            const scoreRewardPoints = sessionType !== 'pre-test'
              ? Math.max(0, getScoreRewardPoints(normalizedSessionScore, elapsedSec))
              : 0;
            const taskRewardPoints = newlyCompletedTasks.reduce(
              (sum, entry) => sum + Math.max(0, Number(entry?.pointsAwarded || 0)),
              0,
            );
            const totalAwarded = Math.max(0, Math.floor(pointsAfter - pointsBefore));

            const levelProgress = getBigkasLevelFromUser(user);
            metadataUpdates.speaker_points = pointsAfter;
            metadataUpdates.speaker_level = levelProgress.levelName;
            metadataUpdates.speaker_level_number = levelProgress.levelNumber;
            metadataUpdates.speaker_points_updated_at = new Date().toISOString();
            metadataUpdates.speaker_points_history = appendSpeakerPointsHistory(
              user?.speakerPointsHistory,
              createSpeakerPointsHistoryEntry({
                source: 'session-reward',
                label: taskRewardPoints > 0
                  ? 'Session reward + activity task bonus'
                  : 'Session performance reward',
                pointsAwarded: totalAwarded,
                totalPointsAfter: pointsAfter,
                metadata: {
                  session_id: result.data.id,
                  score: Math.round(normalizedSessionScore),
                  duration_sec: elapsedSec,
                  session_type: sessionType,
                  speaking_mode: focus,
                  score_reward_points: scoreRewardPoints,
                  task_reward_points: taskRewardPoints,
                  completed_task_ids: newlyCompletedTasks.map((entry) => String(entry?.taskId || '')).filter(Boolean),
                },
              }),
            );
          }

          if (sessionType === 'pre-test') {
            if (focus === 'scripted') {
              metadataUpdates.pretest_scripted_completed = true;
              metadataUpdates.pretest_scripted_completed_at = new Date().toISOString();
              metadataUpdates.pretest_scripted_session_id = result.data.id;
              metadataUpdates.pretest_scripted_score = Math.max(0, Math.min(100, Math.round(normalizedSessionScore)));
            } else if (focus === 'free') {
              metadataUpdates.onboarding_stage = 'analyzing';
              metadataUpdates.onboarding_completed = false;
              metadataUpdates.pretest_completed = true;
              metadataUpdates.pretest_free_completed = true;
              metadataUpdates.pretest_completed_at = new Date().toISOString();
              metadataUpdates.pretest_free_session_id = result.data.id;
              metadataUpdates.pretest_free_score = Math.max(0, Math.min(100, Math.round(normalizedSessionScore)));
              metadataUpdates.pretest_session_id = result.data.id;
            }
          }

          if (Object.keys(metadataUpdates).length > 0) {
            await updateUserMetadata(metadataUpdates);
          }

          navigate(buildRoute.sessionResult(result.data.id), { state: result.data });
        } else {
          if (isMountedRef.current) {
            setErrorMsg(result?.error || 'Analysis failed. Please try again.');
            setStatus('error');
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          setErrorMsg('An unexpected error occurred during analysis.');
          setStatus('error');
        }
      }
    };
    try {
      recorder.requestData();
    } catch {
      // Best-effort flush before stop.
    }
    recorder.stop();
  };

  /* ── Pause / Resume ── */
  const handlePause = () => {
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.pause();
      clearInterval(timerRef.current);
      clearInterval(wpmTimerRef.current);
      clearTimeout(wpmTimerRef.current);
      cancelAnimationFrame(animRef.current);
      micLowStartRef.current = null;
      micWarningVisibleRef.current = false;
      setShowMicWarning(false);
      setStatus('paused');
      setShowPausedModal(true);
    } else if (mediaRef.current?.state === 'paused') {
      mediaRef.current.resume();
      timerRef.current = setInterval(bumpElapsedSec, 1000);
      startWaveformLoop();
      if (focus === 'scripted') {
        startScriptHighlightLoop(Math.max(highlightIdx, 0));
      }
      setStatus('recording');
    }
  };

  const handleResumeFromPausedModal = useCallback(() => {
    setShowPausedModal(false);
    if (mediaRef.current?.state === 'paused') {
      mediaRef.current.resume();
      timerRef.current = setInterval(bumpElapsedSec, 1000);
      startWaveformLoop();
      if (focus === 'scripted') {
        startScriptHighlightLoop(Math.max(highlightIdx, 0));
      }
      setStatus('recording');
    }
  }, [bumpElapsedSec, focus, highlightIdx, startScriptHighlightLoop, startWaveformLoop]);

  /* ── Restart ── */
  const handleRestart = () => {
    clearInterval(timerRef.current);
    clearInterval(countRef.current);
    clearInterval(wpmTimerRef.current);
    clearTimeout(wpmTimerRef.current);
    cancelAnimationFrame(animRef.current);
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
    if (visualMediaRef.current && visualMediaRef.current.state !== 'inactive') visualMediaRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => { });
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    waveHistRef.current = Array(50).fill(0);
    setWaveformBars(Array(50).fill(0));
    silenceStartRef.current = null;
    clearTimeout(hintDismissRef.current);
    setShowHint(false);
    micLowStartRef.current = null;
    micWarningVisibleRef.current = false;
    setShowMicWarning(false);
    setStatus('idle');
    recordingDurationSecRef.current = 0;
    setElapsedSec(0);
    setHighlightIdx(-1);
    chunksRef.current = [];
    visualMediaRef.current = null;
    visualChunksRef.current = [];
    visualMimeRef.current = '';
  };

  const isRecording = status === 'recording';
  const isPaused = status === 'paused';
  const isActive = isRecording || isPaused;

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

  useEffect(() => {
    if (!isActive) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isActive]);

  /* ── Guard: no script in scripted mode ── */
  if (!script && focus !== 'free') {
    return (
      <div className="tp-page">
        <div className="tp-header">
          <BackButton className="tp-back-btn" onClick={() => navigate(-1)} aria-label="Go Back" />
          <span className="tp-header-title">Training</span>
          <div className="tp-header-spacer" />
        </div>
        <div className="tp-empty">
          <span className="tp-empty-icon">⚠️</span>
          <p className="tp-empty-title">No script selected</p>
          <p className="tp-empty-desc">Go back and select a script to start training.</p>
          <button className="tp-go-back-btn" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  if (focus === 'free' && !freeTopic) {
    return (
      <div className="tp-page">
        <div className="tp-header">
          <BackButton className="tp-back-btn" onClick={() => navigate(-1)} aria-label="Go Back" />
          <span className="tp-header-title">Free Speech</span>
          <div className="tp-header-spacer" />
        </div>
        <div className="tp-empty">
          <span className="tp-empty-icon">⚠️</span>
          <p className="tp-empty-title">Topic is required</p>
          <p className="tp-empty-desc">Go back and enter a topic before starting Free Speech.</p>
          <button className="tp-go-back-btn" onClick={() => navigate(ROUTES.TRAINING_SETUP)}>Go Back</button>
        </div>
      </div>
    );
  }

  const title = focus === 'scripted' ? (script?.title || 'Training') : 'Free Speech';
  const modeLabel = focus === 'scripted' ? 'Scripted Mode' : 'Free Speech Mode';

  useEffect(() => {
    if (!videoRef.current || !visualCanvasRef.current) return;
    if (!isRecording) return;

    startAnalysis({
      videoElement: videoRef.current,
      canvasElement: visualCanvasRef.current,
    });
  }, [isRecording, startAnalysis]);

  return (
    <div className="tp-page">
      {/* ── Dark Header ── */}
      <div className="tp-header">
        <BackButton className="tp-back-btn" onClick={handleBackPress} aria-label="Go Back" />
        <span className="tp-header-title">{title}</span>
        {focus === 'scripted' ? (
          <button className="tp-settings-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
            <SettingsGearIcon />
          </button>
        ) : (
          <div className="tp-header-spacer" />
        )}
      </div>

      {/* ── Main Content ── */}
      <div className={`tp-content${focus === 'scripted' ? ' tp-content--split' : ''}`}>

        {/* ── Left / Main Column ── */}
        <div className="tp-left">
          {focus === 'free' && (
            <section className="tp-topic-card" aria-label="Topic">
              <p className="tp-topic-label">TOPIC</p>
              <h2 className="tp-topic-title">{objectiveText || freeTopic}</h2>
            </section>
          )}

          {/* Mode label + REC badge */}
          <div className="tp-cam-header">
            <span className="tp-mode-label">{modeLabel}</span>
            {isActive && (
              <span className="tp-rec-badge">
                <span className="tp-rec-dot" />
                REC {formatTime(elapsedSec)}
              </span>
            )}
          </div>

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
          <div className="tp-camera-wrap">
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
              {!isActive && (
                <div className="tp-camera-idle">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 7l-7 5 7 5V7z" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  <span className="tp-camera-idle-label">Camera starts on record</span>
                </div>
              )}
            </>
          </div>

          {/* Waveform history — 50 bars */}
          <div className="tp-waveform">
            {waveformBars.map((lvl, i) => (
              <div
                key={i}
                className="tp-wave-bar"
                style={{ height: `${Math.max(4, lvl * 64)}px` }}
              />
            ))}
          </div>

          {/* Status label */}
          <div className="tp-status-label">
            {isRecording && <><span className="tp-pulse-dot" /><span>Recording</span></>}
            {isPaused && <><span className="tp-paused-dot" /><span>Paused</span></>}
            {status === 'idle' && <span className="tp-idle-label">Press Start to begin</span>}
          </div>

          {isRecording && (
            <div className="tp-live-debug-badge" role="status" aria-live="polite">
              <span>Eye {Math.round(liveScores.eye_contact_score)}%</span>
              <span>Gesture {Math.round(liveScores.gesture_score)}%</span>
            </div>
          )}

          {showMicWarning && isRecording && (
            <div className="tp-mic-warning" role="status" aria-live="polite">
              Mic input is low. Move closer to the microphone, increase system mic volume, or set Mic Sensitivity to High in Settings.
            </div>
          )}

          {/* Controls */}
          <div className="tp-controls">
            {/* Pause / Resume */}
            <div className="tp-ctrl-col">
              <button
                className="tp-ctrl-btn"
                onClick={handlePause}
                disabled={!isActive}
                aria-label={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <PlayIcon /> : <PauseIcon />}
              </button>
              <span className="tp-ctrl-label">{isPaused ? 'Resume' : 'Pause'}</span>
            </div>

            {/* Record / Stop */}
            <div className="tp-ctrl-col">
              <button
                className={`tp-record-btn${isActive ? ' tp-record-btn--active' : ''}${status === 'idle' ? ' tp-record-btn--hint tp-record-btn--start' : ''}`}
                onClick={isActive ? stopRecording : startCountdown}
                aria-label={isActive ? 'Stop and analyse' : 'Start recording'}
              >
                {isActive ? (
                  <div className="tp-record-inner">
                    <div className="tp-record-dot tp-record-dot--active" />
                  </div>
                ) : (
                  <span className="tp-start-text">START</span>
                )}
              </button>
              {status === 'idle' && (
                <div className="tp-record-tooltip" role="status" aria-live="polite">
                  Tap START to begin a 3-second countdown
                </div>
              )}
              <span className="tp-ctrl-label">{isActive ? 'Stop' : (status === 'countdown' ? 'Starting...' : 'Start')}</span>
            </div>

            {/* Restart */}
            <div className="tp-ctrl-col">
              <button
                className="tp-ctrl-btn"
                onClick={() => setShowRestartConfirm(true)}
                disabled={status === 'idle' || status === 'countdown'}
                aria-label="Restart"
              >
                <RestartIcon />
              </button>
              <span className="tp-ctrl-label">Restart</span>
            </div>
          </div>
        </div>

        {/* ── Right Column — Teleprompter (scripted only) ── */}
        {focus === 'scripted' && (
          <div className="tp-right">
            <div className="tp-script-header">
              <span className="tp-script-label">AUTO-SCROLLING SCRIPT</span>
            </div>

            <div className="tp-teleprompter" ref={scriptRef} style={{ fontSize: `${fontSize}px` }}>
              {highlightMode === 'sentence'
                ? scriptSentences.map((sentence, idx) => (
                  <span
                    key={`${sentence.start}-${sentence.end}`}
                    data-sentence-idx={idx}
                    className={`tp-sentence${idx < currentSentenceIdx ? ' tp-sentence--passed' : ''}${idx === currentSentenceIdx ? ' tp-sentence--current' : ''}`}
                  >
                    {sentence.text}{' '}
                  </span>
                ))
                : scriptWords.map((word, idx) => {
                  const isPassed = highlightMode === 'word' && idx < highlightIdx;
                  const isCurrent = highlightMode === 'word' && idx === highlightIdx;
                  return (
                    <span
                      key={idx}
                      data-word-idx={idx}
                      className={`tp-word${isPassed ? ' tp-word--passed' : ''}${isCurrent ? ' tp-word--current' : ''}`}
                    >
                      {word}{' '}
                    </span>
                  );
                })}
              {scriptWords.length === 0 && (
                <p className="tp-script-empty">{script?.content || ''}</p>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── Countdown Overlay ── */}
      {status === 'countdown' && (
        <div className="tp-overlay">
          <div className="tp-countdown-box">
            <span className="tp-countdown-num">{countdown > 0 ? countdown : 'Speak'}</span>
          </div>
        </div>
      )}

      {/* ── Analysing Overlay ── */}
      {status === 'analysing' && (
        <div className="tp-overlay">
          <div className="tp-countdown-box">
            <span className="tp-analysing-spinner" />
            <span className="tp-analysing-text">Analysing…</span>
          </div>
        </div>
      )}

      {/* ── Error Banner ── */}
      {status === 'error' && (
        <div className="tp-error-banner">
          <span>{errorMsg}</span>
          <button className="tp-error-retry" onClick={handleRestart}>Retry</button>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {/* ── Permission Denied Overlay ── */}
      {status === 'permission-denied' && (
        <div className="tp-overlay tp-permission-overlay">
          <div className="tp-permission-box">
            <div className="tp-permission-icon" aria-hidden="true">🎙️</div>
            <h2 className="tp-permission-title">
              {focus === 'scripted' ? 'Microphone & Camera Required' : 'Microphone Required'}
            </h2>
            <p className="tp-permission-desc">
              Bigkas needs access to your {focus === 'scripted' ? 'microphone and camera' : 'microphone'} to record your session.
            </p>
            <ol className="tp-permission-steps">
              <li>Click the <strong>lock 🔒</strong> icon in your browser&rsquo;s address bar</li>
              <li>Set <strong>Microphone{focus === 'scripted' ? ' and Camera' : ''}</strong> to <strong>Allow</strong></li>
              {!hidePermissionRetry && <li>Tap <strong>Try Again</strong> below</li>}
              {hidePermissionRetry && <li>Tap <strong>Go Back</strong> and restart the pre-test</li>}
            </ol>
            <div className="tp-permission-actions">
              {!hidePermissionRetry && (
                <button
                  className="tp-permission-retry"
                  onClick={() => {
                    startCountdown();
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
              <button className="tp-modal-close" onClick={() => setShowSettings(false)}>✕</button>
            </div>

            <div className="tp-modal-row">
              <label className="tp-modal-label">Font Size</label>
              <span className="tp-modal-val">{fontSize}px</span>
              <input type="range" min="12" max="24" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="tp-modal-slider" />
            </div>

            <div className="tp-modal-row">
              <label className="tp-modal-label">Scroll Speed</label>
              <span className="tp-modal-val">{wpm} WPM</span>
              <input type="range" min="60" max="200" step="5" value={wpm} onChange={(e) => setWpm(Number(e.target.value))} className="tp-modal-slider" />
            </div>

            <div className="tp-modal-row tp-modal-row--toggle">
              <label className="tp-modal-label">Auto-Scroll</label>
              <button
                className={`tp-toggle-btn${autoScroll ? ' tp-toggle-btn--on' : ''}`}
                onClick={() => setAutoScroll((v) => !v)}
                aria-checked={autoScroll}
                role="switch"
              >
                <span className="tp-toggle-thumb" />
              </button>
            </div>

            <div className="tp-modal-row tp-modal-row--toggle">
              <label className="tp-modal-label">Word-by-word Highlight</label>
              <button
                className={`tp-toggle-btn${highlightMode === 'word' ? ' tp-toggle-btn--on' : ''}`}
                onClick={() => setHighlightMode((v) => (v === 'word' ? null : 'word'))}
                aria-checked={highlightMode === 'word'}
                role="switch"
              >
                <span className="tp-toggle-thumb" />
              </button>
            </div>

            <div className="tp-modal-row tp-modal-row--toggle">
              <label className="tp-modal-label">Sentence Highlight</label>
              <button
                className={`tp-toggle-btn${highlightMode === 'sentence' ? ' tp-toggle-btn--on' : ''}`}
                onClick={() => setHighlightMode((v) => (v === 'sentence' ? null : 'sentence'))}
                aria-checked={highlightMode === 'sentence'}
                role="switch"
              >
                <span className="tp-toggle-thumb" />
              </button>
            </div>

            <button className="tp-modal-done" onClick={() => setShowSettings(false)}>Done</button>
          </div>
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

      <ConfirmationModal
        isOpen={showExitConfirm}
        title="Quit session?"
        message="You have an ongoing recording. If you leave now, this recording will be discarded."
        confirmLabel="Quit"
        cancelLabel="Stay"
        type="warning"
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={() => {
          handleRestart();
          setShowExitConfirm(false);
          navigate(-1);
        }}
      />

      <ConfirmationModal
        isOpen={showRestartConfirm}
        title="Proceed to restart?"
        message="Your current recording progress will be discarded and you will start over."
        confirmLabel="Restart"
        cancelLabel="Cancel"
        type="warning"
        onCancel={() => setShowRestartConfirm(false)}
        onConfirm={() => {
          handleRestart();
          setShowRestartConfirm(false);
        }}
      />

      <ConfirmationModal
        isOpen={showPausedModal}
        title="Recording Paused"
        message="Your recording is currently paused. You can resume anytime."
        confirmLabel="Resume"
        cancelLabel="Stay Paused"
        type="info"
        onCancel={() => setShowPausedModal(false)}
        onConfirm={handleResumeFromPausedModal}
      />
    </div>
  );
}

export default TrainingPage;

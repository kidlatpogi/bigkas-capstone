import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import './TestAudioVideoPage.css';

const MIC_SENSITIVITY_KEY = 'pref_mic_sensitivity';

function getMicSensitivityProfile() {
  if (typeof window === 'undefined') {
    return { analyserGain: 4.4, visualGain: 2.2 };
  }

  const raw = (window.localStorage.getItem(MIC_SENSITIVITY_KEY) || 'high').toLowerCase();
  if (raw === 'low') return { analyserGain: 2.4, visualGain: 1.4 };
  if (raw === 'normal') return { analyserGain: 3.2, visualGain: 1.8 };
  return { analyserGain: 4.4, visualGain: 2.2 };
}

/* ── Audio level bar visualiser (adapted from mobile AudioLevelIndicator) ── */
function AudioLevelBars({ level = 0, isActive = false, barCount = 20 }) {
  return (
    <div className="av-bars" aria-hidden="true">
      {Array.from({ length: barCount }, (_, i) => {
        const threshold = (i + 1) / barCount;
        const filled = isActive && level >= threshold;
        const partial = isActive && level >= threshold - 1 / barCount && !filled;
        return (
          <div
            key={i}
            className={`av-bar${filled ? ' av-bar-lit' : ''}${partial ? ' av-bar-partial' : ''}`}
            style={{ opacity: isActive ? 1 : 0.25 }}
          />
        );
      })}
    </div>
  );
}

/* ── Status dot ── */
function StatusDot({ status }) {
  const colors = { ok: '#34C759', warn: '#FF9500', err: '#FF3B30' };
  return <span className="av-status-dot" style={{ background: colors[status] || colors.warn }} />;
}

/**
 * TestAudioVideoPage
 *
 * Web adaptation of AudioCameraTestScreen (Bigkas-mobile).
 * Tests camera (via getUserMedia + <video>) and microphone
 * (via Web Audio API AnalyserNode for real-time level meter).
 *
 * Route: /settings/test
 */
export default function TestAudioVideoPage() {
  const navigate = useNavigate();
  const videoRef  = useRef(null);
  const streamRef = useRef(null);   // camera stream
  const micStreamRef  = useRef(null);
  const audioCtxRef   = useRef(null);
  const analyserRef   = useRef(null);
  const animFrameRef  = useRef(null);

  const [cameraPermission, setCameraPermission] = useState(null); // null=unknown, true/false
  const [audioPermission,  setAudioPermission]  = useState(null);
  const [facing,      setFacing]      = useState('user'); // 'user' | 'environment'
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [audioLevel,  setAudioLevel]  = useState(0);
  const [cameraReady, setCameraReady] = useState(false);

  /* ── Start camera ── */
  const startCamera = useCallback(async (facingMode = 'user') => {
    try {
      // Stop previous stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
      setCameraPermission(true);
    } catch (err) {
      console.warn('Camera permission denied:', err);
      setCameraPermission(false);
      setCameraReady(false);
    }
  }, []);

  /* ── Stop mic ── */
  const stopMicTest = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (analyserRef.current) analyserRef.current.disconnect();
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
    }
    analyserRef.current  = null;
    audioCtxRef.current  = null;
    micStreamRef.current = null;
    animFrameRef.current = null;
    setAudioLevel(0);
    setIsMicTesting(false);
  }, []);

  /* ── Mic level polling via Web Audio API ── */
  const pollLevel = useCallback(function poll() {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(data);

    let power = 0;
    for (let i = 0; i < data.length; i += 1) {
      const centered = (data[i] - 128) / 128;
      power += centered * centered;
    }

    const rms = Math.sqrt(power / data.length);
    const sensitivity = getMicSensitivityProfile();
    const measured = Math.min(1, rms * sensitivity.analyserGain);
    const level = Math.min(1, measured * sensitivity.visualGain);
    setAudioLevel(+level.toFixed(3));
    animFrameRef.current = requestAnimationFrame(poll);
  }, []);

  /* ── Start mic test ── */
  const handleToggleMicTest = useCallback(async () => {
    if (isMicTesting) {
      stopMicTest();
      return;
    }
    try {
      const selectedMic = typeof window !== 'undefined'
        ? window.localStorage.getItem('pref_mic') || ''
        : '';

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(selectedMic && selectedMic !== 'default' ? { deviceId: { exact: selectedMic } } : {}),
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });
      micStreamRef.current  = stream;
      setAudioPermission(true);
      setIsMicTesting(true);

      const ctx     = new (window.AudioContext || window.webkitAudioContext)();
      const source  = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;
      analyser.minDecibels = -95;
      analyser.maxDecibels = -10;
      source.connect(analyser);
      audioCtxRef.current  = ctx;
      analyserRef.current  = analyser;

      animFrameRef.current = requestAnimationFrame(pollLevel);
    } catch (err) {
      console.warn('Mic permission denied:', err);
      setAudioPermission(false);
    }
  }, [isMicTesting, stopMicTest, pollLevel]);

  /* ── Flip camera ── */
  const handleFlipCamera = useCallback(() => {
    const next = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    startCamera(next);
  }, [facing, startCamera]);

  /* ── Lifecycle ── */
  useEffect(() => {
    startCamera(facing);
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      stopMicTest();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const camStatus = cameraPermission === null
    ? 'warn'
    : cameraPermission && cameraReady ? 'ok' : 'err';
  const camStatusText = cameraPermission === null
    ? 'Requesting camera permission…'
    : cameraPermission
      ? cameraReady ? `${facing === 'user' ? 'Front' : 'Back'} camera active` : 'Initialising camera…'
      : 'Camera permission not granted';

  const micStatusColor = audioPermission === false ? 'err' : isMicTesting ? 'ok' : 'warn';
  const micStatusText  = audioPermission === false
    ? 'Microphone permission not granted'
    : isMicTesting
      ? 'Listening… speak into your microphone'
      : 'Tap the button below to test';

  return (
    <div className="av-page">
      <section className="av-single-card">
        <nav className="av-breadcrumb" aria-label="Breadcrumb">
          <Link className="av-breadcrumb-link" to={ROUTES.SETTINGS}>
            Settings
          </Link>
          <span className="av-breadcrumb-sep">&gt;</span>
          <span className="av-breadcrumb-current">Test Audio/ Video</span>
        </nav>

        <p className="av-kicker">Hardware Check</p>
        <h1>Test Audio / Video</h1>
        <p className="av-subtitle">
          Verify your camera and microphone before starting your speaking sessions.
        </p>

        {/* Camera Preview */}
        <section className="av-section">
          <p className="av-section-label">CAMERA PREVIEW</p>
          <div className="av-camera-wrap">
            {cameraPermission !== false ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="av-video"
              />
            ) : (
              <div className="av-camera-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"/>
                  <path d="M21 21H3a2 2 0 01-2-2V8a2 2 0 012-2h3m3-3h6l2 3h4a2 2 0 012 2v9.34m-7.72-2.06A4 4 0 1111.17 12.98"/>
                </svg>
                <p>Camera permission not granted</p>
              </div>
            )}

            {/* Flip camera button */}
            {cameraPermission && cameraReady && (
              <button
                className="av-flip-btn"
                onClick={handleFlipCamera}
                aria-label="Flip camera"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 4v6h6"/>
                  <path d="M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4-4.64 4.36A9 9 0 013.51 15"/>
                </svg>
              </button>
            )}
          </div>
          <div className="av-status-row">
            <StatusDot status={camStatus} />
            <span className="av-status-text">{camStatusText}</span>
          </div>
        </section>

        {/* Microphone Test */}
        <section className="av-section">
          <p className="av-section-label">MICROPHONE TEST</p>
          <div className="av-mic-card">
            <div className="av-visualizer">
              <AudioLevelBars level={audioLevel} isActive={isMicTesting} barCount={24} />
            </div>
            <div className="av-status-row av-status-row--center">
              <StatusDot status={micStatusColor} />
              <span className="av-status-text">{micStatusText}</span>
            </div>
            <button
              className={`av-mic-btn${isMicTesting ? ' av-mic-btn-stop' : ''}`}
              onClick={handleToggleMicTest}
              disabled={audioPermission === false}
            >
              {isMicTesting ? 'Stop Mic Test' : 'Start Mic Test'}
            </button>
          </div>
        </section>

        <div className="av-done-wrap">
          <button className="av-done-btn" onClick={() => navigate(ROUTES.SETTINGS)}>
            Done
          </button>
        </div>
      </section>
    </div>
  );
}

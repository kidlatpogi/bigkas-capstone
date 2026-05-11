import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  IoChevronBack, 
  IoVideocam, 
  IoMic, 
  IoCameraReverse,
  IoSettingsOutline,
  IoCheckmarkCircle
} from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import TutorialOverlay from '../../components/main/TutorialOverlay';
import { getSpriteUrl } from '../../utils/assetUtils';

const mascotSprite = getSpriteUrl('Robot/0002.webp');
const bronzeRank = getSpriteUrl('Rank/rank-bronze.png');
const silverRank = getSpriteUrl('Rank/rank-silver.png');
const goldRank = getSpriteUrl('Rank/rank-gold.png');
const mythrilRank = getSpriteUrl('Rank/rank-mythril.png');
const legendaryRank = getSpriteUrl('Rank/rank-legendary.png');
import './TestAudioVideoPage.css';

const THEME_CONFIG = [
  { id: 'emerald', label: 'Default', requires: 0, decoration: null, className: 'emerald' },
  { id: 'mascot', label: 'B-01', requires: 0, decoration: mascotSprite, className: 'mascot' },
  { id: 'bronze', label: 'Bronze', requires: 1, decoration: bronzeRank, className: 'bronze' },
  { id: 'silver', label: 'Silver', requires: 2, decoration: silverRank, className: 'silver' },
  { id: 'gold', label: 'Gold', requires: 3, decoration: goldRank, className: 'gold' },
  { id: 'mythril', label: 'Mythril', requires: 4, decoration: mythrilRank, className: 'mythril' },
  { id: 'trophy', label: 'Legend', requires: 5, decoration: legendaryRank, className: 'trophy' },
];

const MIC_SENSITIVITY_KEY = 'pref_mic_sensitivity';

function getMicSensitivityProfile() {
  if (typeof window === 'undefined') {
    return { analyserGain: 4.4, visualGain: 2.2 };
  }

  const raw = (window.localStorage.getItem(MIC_SENSITIVITY_KEY) || '80').toLowerCase();
  const val = parseInt(raw, 10) || 80;
  return { analyserGain: (val / 100) * 5.5, visualGain: 2.2 };
}

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
            style={{ 
                opacity: isActive ? 1 : 0.25,
                height: `${30 + (i % 3) * 10}%`
            }}
          />
        );
      })}
    </div>
  );
}

function StatusDot({ status }) {
  const colors = { ok: '#059669', warn: '#F18F01', err: '#EF4444' };
  return <span className="av-status-dot" style={{ background: colors[status] || colors.warn }} />;
}

export default function TestAudioVideoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const micStreamRef  = useRef(null);
  const audioCtxRef   = useRef(null);
  const analyserRef   = useRef(null);
  const animFrameRef  = useRef(null);

  const [isTutorialOpen, setIsTutorialOpen] = useState(location.state?.launchTutorial || false);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [audioPermission,  setAudioPermission]  = useState(null);
  const [facing,      setFacing]      = useState('user');
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [audioLevel,  setAudioLevel]  = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [isMicOk, setIsMicOk] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const micOkRef = useRef(false);
  const successTriggeredRef = useRef(false);
  
  const [heroTheme] = useState(() => {
    return localStorage.getItem('pref_hero_theme') || 'emerald';
  });

  const getThemeDecoration = (themeId) => {
    const config = THEME_CONFIG.find(t => t.id === themeId);
    return config?.decoration || null;
  };

  const userInitials = useMemo(() => {
    if (!user) return '?';
    const first = user.firstName || '';
    const last = user.lastName || '';
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';
  }, [user]);

  const startCamera = useCallback(async (facingMode = 'user') => {
    try {
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

    // Auto-stop if clear audio is detected
    if (level > 0.15 && !micOkRef.current) {
      micOkRef.current = true;
      setIsMicOk(true);
      // Give it a moment for the user to see the bars moving before stopping
      setTimeout(() => stopMicTest(), 1200);
      return;
    }

    animFrameRef.current = requestAnimationFrame(poll);
  }, [stopMicTest]);

  const handleToggleMicTest = useCallback(async () => {
    if (isMicTesting) {
      stopMicTest();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      micStreamRef.current  = stream;
      setAudioPermission(true);
      setIsMicTesting(true);

      const ctx     = new (window.AudioContext || window.webkitAudioContext)();
      const source  = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioCtxRef.current  = ctx;
      analyserRef.current  = analyser;

      animFrameRef.current = requestAnimationFrame(pollLevel);
    } catch (err) {
      console.warn('Mic permission denied:', err);
      setAudioPermission(false);
    }
  }, [isMicTesting, stopMicTest, pollLevel]);

  const handleFlipCamera = useCallback(() => {
    const next = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    startCamera(next);
  }, [facing, startCamera]);

  useEffect(() => {
    startCamera(facing);
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      stopMicTest();
    };
  }, []);

  const camStatus = cameraPermission === null ? 'warn' : cameraPermission && cameraReady ? 'ok' : 'err';
  const camStatusText = cameraPermission === null ? 'Requesting camera...' : cameraPermission ? (cameraReady ? 'Camera active' : 'Initializing...') : 'Permission denied';
  const micStatusColor = audioPermission === false ? 'err' : isMicTesting ? 'ok' : 'warn';
  const micStatusText = audioPermission === false ? 'Mic denied' : isMicTesting ? 'Listening...' : 'Ready to test';

  useEffect(() => {
    if (camStatus === 'ok' && isMicOk && !successTriggeredRef.current) {
      successTriggeredRef.current = true;
      // Delay slightly for a smoother transition
      const timer = setTimeout(() => setShowSuccessModal(true), 800);
      return () => clearTimeout(timer);
    }
  }, [camStatus, isMicOk]);

  return (
    <div className="settings-profile-page dashboard-page-new av-page-new">
      <div className="history-session-view-header av-back-header-fixed">
        <button
          type="button"
          className="history-back-to-list-btn"
          onClick={() => navigate(ROUTES.SETTINGS)}
        >
          <IoChevronBack /> Back to Settings
        </button>
      </div>

      <div className="settings-profile-container">
        <div className={`profile-hero-card hero-theme--${heroTheme}`}>
          <div className="hero-decoration">
            {heroTheme === 'mascot' ? (
              <img src={mascotSprite} alt="" className="decoration-img decoration-mascot" />
            ) : (
              getThemeDecoration(heroTheme) && (
                <img 
                  src={getThemeDecoration(heroTheme)} 
                  alt="" 
                  className={`decoration-img ${heroTheme === 'trophy' ? 'decoration-trophy' : 'decoration-rank'}`} 
                />
              )
            )}
          </div>

          <div className="hero-info" style={{ position: 'relative', zIndex: 2 }}>
            <h1 className="hero-name">Hardware Check</h1>
            <p className="hero-email" style={{ opacity: 0.9 }}>Test your equipment for the best training experience.</p>
          </div>
        </div>

        <div className="settings-content-wrapper">
          <div className="settings-main-card">
            <div className="settings-form">
              {/* Camera Section */}
              <div className="settings-form-section">
                <div className="section-header-flex">
                   <h2 className="section-heading">Camera Preview</h2>
                   <div className="av-status-pill">
                      <StatusDot status={camStatus} />
                      <span>{camStatusText}</span>
                   </div>
                </div>
                
                <div className="av-camera-viewport">
                  {cameraPermission !== false ? (
                    <video ref={videoRef} autoPlay playsInline muted className="av-video-feed" />
                  ) : (
                    <div className="av-error-placeholder">
                      <p>Camera access was denied. Please check your browser settings.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="settings-divider" style={{ margin: '32px 0' }} />

              {/* Microphone Section */}
              <div className="settings-form-section">
                 <div className="section-header-flex">
                   <h2 className="section-heading">Microphone Test</h2>
                   <div className="av-status-pill">
                      <StatusDot status={micStatusColor} />
                      <span>{micStatusText}</span>
                   </div>
                </div>

                <div className="av-mic-test-area">
                  <div className="av-visualizer-container">
                    <AudioLevelBars level={audioLevel} isActive={isMicTesting} barCount={28} />
                  </div>
                  
                  <button 
                    className={`av-toggle-btn ${isMicTesting ? 'is-active' : ''}`}
                    onClick={handleToggleMicTest}
                    disabled={audioPermission === false}
                  >
                    {isMicTesting ? 'Stop Mic Test' : 'Start Mic Test'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showSuccessModal && (
            <motion.div 
              className="av-success-banner-wrap"
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
            >
              <div className="av-success-banner">
                <div className="av-banner-left">
                  <div className="av-banner-badge">
                    <IoCheckmarkCircle />
                  </div>
                  <div className="av-banner-info">
                    <h3 className="av-banner-title">Hardware Verified</h3>
                    <p className="av-banner-sub">Everything is working perfectly!</p>
                  </div>
                </div>
                <div className="av-banner-right">
                  <button 
                    type="button"
                    className="av-banner-launch-btn"
                    onClick={() => navigate(ROUTES.ACTIVITY)}
                  >
                    Start Training
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <TutorialOverlay
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onFinish={() => setIsTutorialOpen(false)}
        steps={location.state?.tutorialSteps}
      />
    </div>
  );
}

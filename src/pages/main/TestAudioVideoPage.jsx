import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { IoChevronForward, IoVideocamOutline, IoMicOutline, IoArrowBackOutline, IoRefreshOutline } from 'react-icons/io5';
import { ROUTES } from '../../utils/constants';
import TutorialOverlay from '../../components/main/TutorialOverlay';
import mascotSprite from '../../assets/Sprites/Robot/0001.webp';
import './TestAudioVideoPage.css';

const MIC_SENSITIVITY_KEY = 'pref_mic_sensitivity';

function getMicSensitivityProfile() {
  if (typeof window === 'undefined') {
    return { analyserGain: 4.4, visualGain: 2.2 };
  }

  const raw = (window.localStorage.getItem(MIC_SENSITIVITY_KEY) || '80').toLowerCase();
  const val = parseInt(raw, 10) || 80;
  // Map 0-100 to gains
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
                height: `${30 + (i % 3) * 10}%` // Add some variety in height
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
    animFrameRef.current = requestAnimationFrame(poll);
  }, []);

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

  return (
    <div className="settings-profile-page dashboard-page-new av-page-new">
      <div className="settings-profile-container">
        <div className="profile-hero-card hero-theme--emerald">
          <div className="hero-decoration">
            <img src={mascotSprite} alt="" className="decoration-img decoration-mascot" />
          </div>
          <div className="hero-info" style={{ position: 'relative', zIndex: 2 }}>
             <nav className="av-breadcrumb-new">
               <Link to={ROUTES.SETTINGS} className="av-back-link">
                 <IoArrowBackOutline /> Back to Settings
               </Link>
             </nav>
            <h1 className="hero-name">Hardware Check</h1>
            <p className="hero-email" style={{ opacity: 0.9 }}>Verify your camera and microphone for the best speaking experience.</p>
          </div>
        </div>

        <div className="settings-content-wrapper">
          <div className="settings-main-card sp-preferences-card av-main-card">
            
            {/* Camera Section */}
            <div className="settings-form-section">
              <div className="section-header-flex">
                 <h2 className="section-heading"><IoVideocamOutline /> Camera Preview</h2>
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
                {cameraPermission && cameraReady && (
                  <button className="av-action-btn flip" onClick={handleFlipCamera} title="Flip Camera">
                    <IoRefreshOutline />
                  </button>
                )}
              </div>
            </div>

            <div className="settings-divider" />

            {/* Microphone Section */}
            <div className="settings-form-section">
               <div className="section-header-flex">
                 <h2 className="section-heading"><IoMicOutline /> Microphone Test</h2>
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

            <div className="settings-divider" />
            
            <div className="av-footer-actions">
               <button className="bigkas-btn secondary" onClick={() => navigate(ROUTES.SETTINGS)}>
                  Return to Settings
               </button>
            </div>
          </div>
        </div>
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

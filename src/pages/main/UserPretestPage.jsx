import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';
import { ROUTES } from '../../utils/constants';
import { getAssetUrl, getVoiceUrl } from '../../utils/assetUtils';
import './UserPretestPage.css';

const PRETEST_TRAINING_STATE = {
  freeTopic: 'Tell me about yourself',
  focus: 'free',
  objective: 'Speak for 30 Seconds about yourself.',
  sessionType: 'pre-test',
};

const waveWebm = getAssetUrl('Sprites/Robot Animated/Wave-webm.webm');
const waveMp4 = getAssetUrl('Sprites/Robot Animated/Wave-mp4.mp4');
const beforePretestingVoice = getVoiceUrl('Profiling and Pre-Testing/Before pre-testing.mp3');
const PRETEST_MUTE_KEY = 'bigkas_profiling_intro_muted';

const introMessage = "You've made it to the final step! To wrap things up, let\u2019s try a quick Free Speech Pre-test.";
const missionMessage =
  "speak for at least 30 seconds on the topic, 'Tell me about yourself.' Don't overthink it\u2014just be you and let your voice lead the way!";

function Typewriter({ text, onComplete, delay = 18, charsPerTick = 2 }) {
  const [displayed, setDisplayed] = useState('');
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let index = 0;
    hasCompletedRef.current = false;
    setDisplayed('');

    const timer = window.setInterval(() => {
      index = Math.min(text.length, index + charsPerTick);
      setDisplayed(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(timer);
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onCompleteRef.current?.();
        }
      }
    }, delay);

    return () => window.clearInterval(timer);
  }, [text, delay, charsPerTick]);

  return <>{displayed}</>;
}

function UserPretestPage() {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(PRETEST_MUTE_KEY) === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const audio = new Audio(beforePretestingVoice);
    audio.preload = 'auto';
    audio.muted = isMuted;
    audioRef.current = audio;

    if (!isMuted) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, [isMuted]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PRETEST_MUTE_KEY, isMuted ? '1' : '0');
    }
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted((current) => {
      const next = !current;
      const audio = audioRef.current;

      if (audio) {
        audio.muted = next;
        if (next) {
          audio.pause();
          audio.currentTime = 0;
        } else {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }
      }

      return next;
    });
  };

  const handleProceed = () => {
    audioRef.current?.pause();

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('bigkas_current_training_session');
      window.sessionStorage.removeItem('bigkas_pretest_tutorial_seen');
    }

    navigate(ROUTES.TRAINING, {
      replace: true,
      state: PRETEST_TRAINING_STATE,
    });
  };

  return (
    <main className="pretest-confirm-page" aria-labelledby="pretest-confirm-title">
      <h1 id="pretest-confirm-title" className="pretest-confirm-sr-only">
        Free Speech Pre-test introduction
      </h1>

      <section className="pretest-confirm-intro" aria-label="B-01 Free Speech Pre-test intro">
        <div className="pretest-confirm-unit">
          <article className="pretest-confirm-bubble" aria-label="Before pre-testing message">
            <p className="pretest-confirm-text">
              <strong>B-01:</strong>
              <br />
              {introMessage}
            </p>
            <p className="pretest-confirm-text pretest-confirm-text--mission">
              <strong>Your mission:</strong>
              <br />
              {isTypingDone ? (
                <>
                  speak for at least <strong>30 seconds</strong> on the topic,{' '}
                  <strong>&apos;Tell me about yourself.&apos;</strong> Don&apos;t overthink it&mdash;just
                  be you and let your voice lead the way!
                </>
              ) : (
                <Typewriter text={missionMessage} onComplete={() => setIsTypingDone(true)} />
              )}
            </p>
            <div className="pretest-confirm-actions">
              <button type="button" className="pretest-confirm-btn" onClick={handleProceed} disabled={!isTypingDone}>
                Start Pre-test
              </button>
            </div>
          </article>

          <div className="pretest-confirm-robot" aria-hidden="true">
            <div className="pretest-confirm-robot-media">
              <video className="pretest-confirm-video" autoPlay loop muted playsInline>
                <source src={waveWebm} type="video/webm" />
                <source src={waveMp4} type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </section>

      <div className="pretest-confirm-audio-action">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
          title={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
          className={`pretest-confirm-audio-toggle ${isMuted ? 'is-muted' : 'is-unmuted'}`}
        >
          {isMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        </button>
      </div>
    </main>
  );
}

export default UserPretestPage;

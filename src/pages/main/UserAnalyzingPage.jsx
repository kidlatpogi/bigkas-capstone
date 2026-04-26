import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { useAuthContext } from '../../context/useAuthContext';
import { supabase } from '../../lib/supabase';
import { ROUTES } from '../../utils/constants';
import { getBigkasLevelFromScore, mapPercentToEntryScore } from '../../utils/activityProgress';
import analyzingRobotImage from '../../assets/Sprites/Robot/0010.webp';
import resultRobotImage from '../../assets/Sprites/Robot/0013.webp';
import robotImage0001 from '../../assets/Sprites/Robot/0001.webp';
import robotImage0002 from '../../assets/Sprites/Robot/0002.webp';
import robotImage0003 from '../../assets/Sprites/Robot/0003.webp';
import robotImage0004 from '../../assets/Sprites/Robot/0004.webp';
import robotImage0005 from '../../assets/Sprites/Robot/0005.webp';
import robotImage0012 from '../../assets/Sprites/Robot/0012.webp';
import robotImage0015 from '../../assets/Sprites/Robot/0015.webp';
import analyzingProgressVoice from '../../assets/Voices/Profiling and Pre-Testing/Analyzing/Analyzing your level....mp3';
import analyzingLevel1Voice from '../../assets/Voices/Profiling and Pre-Testing/Analyzing/Analyzing Level 1.mp3';
import analyzingLevel2Voice from '../../assets/Voices/Profiling and Pre-Testing/Analyzing/Analyzing Level 2.mp3';
import analyzingLevel3Voice from '../../assets/Voices/Profiling and Pre-Testing/Analyzing/Analyzing Level 3.mp3';
import analyzingLevel4Voice from '../../assets/Voices/Profiling and Pre-Testing/Analyzing/Analyzing Level 4.mp3';
import analyzingLevel5Voice from '../../assets/Voices/Profiling and Pre-Testing/Analyzing/Analyzing Level 5.mp3';
import './UserAnalyzingPage.css';

function clampScore(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function isPreTestSession(session) {
  const sessionOrigin = String(session?.session_origin || '').trim().toLowerCase();
  if (sessionOrigin.includes('pre-test') || sessionOrigin.includes('pretest')) return true;
  return false;
}

function isFreePreTest(session) {
  const speakingMode = String(session?.speaking_mode || '').trim().toLowerCase();
  const target = String(session?.transcript || '').trim().toLowerCase();
  return speakingMode.includes('free') || target.includes('tell me about yourself');
}

function pickScore(session) {
  const metrics = Array.isArray(session?.session_metrics) ? session.session_metrics[0] : session?.session_metrics;
  return clampScore(metrics?.confidence_score ?? metrics?.overall_score ?? session?.confidence_score ?? session?.score ?? 0);
}

function calculateMehrabianTotal({ verbalScore = 0, vocalScore = 0, visualScore = 0 }) {
  return clampScore((verbalScore * 0.07) + (vocalScore * 0.38) + (visualScore * 0.55));
}

/** Display Triple V / aggregate scores on the Bigkas 1.0–5.0 entry scale (from raw 0–100 metrics). */
function formatEntryScale(percent0to100) {
  return mapPercentToEntryScore(percent0to100).toFixed(1);
}

const ANALYZING_MUTE_KEY = 'bigkas_analyzing_muted';
const RESULT_ROBOT_POOL = [
  robotImage0001,
  robotImage0002,
  robotImage0003,
  robotImage0004,
  robotImage0005,
  robotImage0012,
  robotImage0015,
];

const LEVEL_CONTENT = {
  1: {
    text: "Yay, you made that look so easy! All the setup is done. Your journey begins right here at LEVEL 1. Don't sweat the small stuff-every great speaker you've ever seen started exactly where you are right now! We're going to build your confidence brick by brick. Get ready to transform that 'stage fright' into 'stage might'!",
    voice: analyzingLevel1Voice,
  },
  2: {
    text: "Beep! That was great! Setup is officially complete. You're skipping the basics to start right at LEVEL 2. You've already got some great skills to work with! Remember, every pro started as a beginner. Let's build on this foundation and transform that 'stage fright' into 'stage might'!",
    voice: analyzingLevel2Voice,
  },
  3: {
    text: "Whoa, nice job! Setup is completely done. My sensors picked up some seriously good speaking habits, so you're diving right in at LEVEL 3! We're halfway to the top already-let's keep this momentum going!",
    voice: analyzingLevel3Voice,
  },
  4: {
    text: 'Wowzers! Setup is clear! Your speech was so smooth it almost blew my circuits! You are starting way up at LEVEL 4. You\'re practically a pro already. Let\'s polish those skills to absolute perfection!',
    voice: analyzingLevel4Voice,
  },
  5: {
    text: 'Mind... blown! Setup is completely done. Your speaking skills are off the charts! You are starting at the very top-LEVEL 5! We are going straight into masterclass mode. I might need to take notes from you!',
    voice: analyzingLevel5Voice,
  },
};

function UserAnalyzingPage() {
  const navigate = useNavigate();
  const { user, updateUserMetadata } = useAuthContext();
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);
  const [isPersisted, setIsPersisted] = useState(false);
  const [showLevelReveal, setShowLevelReveal] = useState(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [loaderPct, setLoaderPct] = useState(1);
  const [typedResultText, setTypedResultText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(ANALYZING_MUTE_KEY) === '1';
  });
  const [analysis, setAnalysis] = useState({
    verbalScore: 0,
    vocalScore: 0,
    visualScore: 0,
    freePretestScore: 0,
    finalScore: 0,
    levelNumber: 1,
    levelName: 'Novice',
  });

  const userSpeakerPoints = Math.max(0, Math.floor(Number(user?.speakerPoints ?? 0) || 0));
  const userPretestFreeScore = clampScore(user?.pretestFreeScore ?? 0);
  const userPretestFreeSessionId = user?.pretestFreeSessionId || null;
  const analyzingAudioRef = useRef(null);
  const revealAudioRef = useRef(null);

  const levelContent = useMemo(
    () => LEVEL_CONTENT[analysis.levelNumber] || LEVEL_CONTENT[1],
    [analysis.levelNumber],
  );
  const staticRandomResultRobot = useMemo(() => {
    const randomIdx = Math.floor(Math.random() * RESULT_ROBOT_POOL.length);
    return RESULT_ROBOT_POOL[randomIdx] || resultRobotImage;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      let freePretestScore = 0;
      let verbalScore = 0;
      let vocalScore = 0;
      let visualScore = 0;

      if (userPretestFreeScore > 0) {
        freePretestScore = userPretestFreeScore;
      }

      const needsSessionFallback = freePretestScore === 0 || verbalScore === 0 || vocalScore === 0 || visualScore === 0;
      if (needsSessionFallback) {
        const metricsSelect =
          'confidence_score,overall_score,verbal_score,vocal_score,visual_score';

        const withTranscript = (s) => ({
          ...s,
          transcript:
            (Array.isArray(s.session_media) ? s.session_media[0]?.transcript : s.session_media?.transcript) || '',
        });

        let directNormalized = null;
        if (userPretestFreeSessionId) {
          const { data: one } = await supabase
            .from('sessions')
            .select(`id,session_origin,speaking_mode,created_at,session_media(transcript),session_metrics(${metricsSelect})`)
            .eq('user_id', user?.id)
            .eq('id', userPretestFreeSessionId)
            .maybeSingle();
          if (one) directNormalized = withTranscript(one);
        }

        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select(`id,session_origin,speaking_mode,created_at,session_media(transcript),session_metrics(${metricsSelect})`)
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(200);

        let freeSession = null;
        if (!sessionsError && Array.isArray(sessions)) {
          const normalizedSessions = sessions.map(withTranscript);
          const pretests = normalizedSessions.filter(isPreTestSession);
          const freeById = userPretestFreeSessionId
            ? pretests.find((session) => String(session?.id || '') === String(userPretestFreeSessionId))
            : null;
          freeSession = freeById || pretests.find(isFreePreTest);
        }
        if (!freeSession && directNormalized) {
          freeSession = directNormalized;
        }

        if (freePretestScore === 0) {
          freePretestScore = freeSession ? pickScore(freeSession) : 0;
        }

        const freeMetrics = Array.isArray(freeSession?.session_metrics)
          ? freeSession.session_metrics[0]
          : freeSession?.session_metrics;
        verbalScore = clampScore(freeMetrics?.verbal_score ?? 0);
        vocalScore = clampScore(freeMetrics?.vocal_score ?? 0);
        visualScore = clampScore(freeMetrics?.visual_score ?? 0);

        const overallTriple = clampScore(
          freeMetrics?.overall_score ?? freeMetrics?.confidence_score ?? 0,
        );
        if (verbalScore === 0 && vocalScore === 0 && visualScore === 0 && overallTriple > 0) {
          verbalScore = overallTriple;
          vocalScore = overallTriple;
          visualScore = overallTriple;
        }
      }

      if (verbalScore === 0 && vocalScore === 0 && visualScore === 0) {
        const fallback = freePretestScore;
        verbalScore = fallback;
        vocalScore = fallback;
        visualScore = fallback;
      } else {
        if (verbalScore === 0) verbalScore = freePretestScore;
        if (vocalScore === 0) vocalScore = freePretestScore;
        if (visualScore === 0) visualScore = freePretestScore;
      }

      const finalScore = calculateMehrabianTotal({
        verbalScore,
        vocalScore,
        visualScore,
      });

      const entryScore = mapPercentToEntryScore(finalScore);
      const levelBand = getBigkasLevelFromScore(entryScore);
      const levelNumber = levelBand.levelNumber;
      const levelName = levelBand.levelName;

      if (!cancelled) {
        setAnalysis({
          verbalScore,
          vocalScore,
          visualScore,
          freePretestScore,
          finalScore,
          levelNumber,
          levelName,
        });
        setIsReady(true);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [user?.id, userPretestFreeScore, userPretestFreeSessionId]);

  const persistAndReveal = useCallback(async () => {
    if (!isReady || isPersisting) return;
    if (showLevelReveal) return;

    if (!isPersisted) {
      setIsPersisting(true);
      setError('');

      const result = await updateUserMetadata({
        onboarding_stage: 'completed',
        onboarding_completed: true,
        speaker_entry_score: mapPercentToEntryScore(analysis.finalScore),
        speaker_level: analysis.levelName,
        speaker_level_number: analysis.levelNumber,
        speaker_points: userSpeakerPoints,
        onboarding_level_analysis: {
          analyzed_at: new Date().toISOString(),
          verbal_score: analysis.verbalScore,
          vocal_score: analysis.vocalScore,
          visual_score: analysis.visualScore,
          free_pretest_score: analysis.freePretestScore,
          pretest_bonus_points_awarded: 0,
          final_score: analysis.finalScore,
          estimated_level_number: analysis.levelNumber,
        },
      });

      // Update the profiles table with the new current_level
      if (result?.success && user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ current_level: analysis.levelNumber })
          .eq('id', user.id);

        if (profileError) {
          console.error('Failed to update current_level in profiles:', profileError);
        }
      }

      setIsPersisting(false);

      if (!result?.success) {
        setError(result?.error || 'Unable to complete onboarding level analysis.');
        return;
      }

      setIsPersisted(true);
    }

    if (analyzingAudioRef.current) {
      analyzingAudioRef.current.pause();
      analyzingAudioRef.current.currentTime = 0;
    }

    setShowLevelReveal(true);
  }, [
    analysis.finalScore,
    analysis.freePretestScore,
    analysis.levelName,
    analysis.levelNumber,
    analysis.verbalScore,
    analysis.visualScore,
    analysis.vocalScore,
    isPersisted,
    isPersisting,
    isReady,
    showLevelReveal,
    updateUserMetadata,
    user?.id,
    userSpeakerPoints,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const audio = new Audio(analyzingProgressVoice);
    audio.preload = 'auto';
    analyzingAudioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
      analyzingAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (showLevelReveal) return undefined;
    const timer = window.setInterval(() => {
      setLoaderPct((prev) => {
        if (!isReady) {
          return Math.min(94, prev + 1);
        }
        return Math.min(100, prev + 2);
      });
    }, 90);
    return () => window.clearInterval(timer);
  }, [isReady, showLevelReveal]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ANALYZING_MUTE_KEY, isMuted ? '1' : '0');
  }, [isMuted]);

  useEffect(() => {
    [analyzingAudioRef.current, revealAudioRef.current].forEach((audio) => {
      if (!audio) return;
      audio.muted = isMuted;
      if (isMuted) {
        audio.pause();
      }
    });
  }, [isMuted]);

  useEffect(() => {
    if (showLevelReveal || isMuted) return;
    if (revealAudioRef.current) {
      revealAudioRef.current.pause();
      revealAudioRef.current.currentTime = 0;
    }
    const audio = analyzingAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, [isMuted, showLevelReveal]);

  useEffect(() => {
    if (!showLevelReveal) {
      setTypedResultText('');
      setIsTypingDone(false);
      return undefined;
    }

    setTypedResultText('');
    setIsTypingDone(false);
    let index = 0;
    const typingTimer = window.setInterval(() => {
      index += 1;
      setTypedResultText(levelContent.text.slice(0, index));
      if (index >= levelContent.text.length) {
        window.clearInterval(typingTimer);
        setIsTypingDone(true);
      }
    }, 12);

    return () => {
      window.clearInterval(typingTimer);
    };
  }, [levelContent.text, showLevelReveal]);

  useEffect(() => {
    if (!showLevelReveal) return undefined;
    const audio = new Audio(levelContent.voice);
    audio.preload = 'auto';
    audio.muted = isMuted;
    revealAudioRef.current = audio;
    if (!isMuted) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
      revealAudioRef.current = null;
    };
  }, [isMuted, levelContent.voice, showLevelReveal]);

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        [analyzingAudioRef.current, revealAudioRef.current].forEach((audio) => {
          if (!audio) return;
          audio.pause();
          audio.currentTime = 0;
        });
      } else if (showLevelReveal && revealAudioRef.current) {
        revealAudioRef.current.currentTime = 0;
        revealAudioRef.current.play().catch(() => {});
      } else if (!showLevelReveal && analyzingAudioRef.current) {
        analyzingAudioRef.current.currentTime = 0;
        analyzingAudioRef.current.play().catch(() => {});
      }
      return next;
    });
  };

  const handleGoToDashboard = () => {
    navigate(ROUTES.DASHBOARD, { replace: true });
  };

  return (
    <div className="user-analyzing-page">
      {!showLevelReveal ? (
        <section className="analyzing-intro">
          <article className="analyzing-bubble" aria-label="Analyzing onboarding level">
            <p className="analyzing-bubble-kicker">B-01:</p>
            <p className="analyzing-bubble-title">Analyzing your level...</p>
            <p className="analyzing-bubble-copy">
              Hold tight while I process your Triple V metrics and calibrate your starting level.
            </p>

            <div className="analyzing-loader" role="progressbar" aria-valuemin={1} aria-valuemax={100} aria-valuenow={loaderPct}>
              <span className="analyzing-loader-fill" style={{ width: `${loaderPct}%` }} />
            </div>
            <p className="analyzing-loader-text">{loaderPct}%</p>
            {!error && (
              <div className="analyzing-actions">
                <button
                  type="button"
                  className="analyzing-action-btn analyzing-action-btn--primary"
                  onClick={() => void persistAndReveal()}
                  disabled={loaderPct < 100 || !isReady || isPersisting}
                >
                  {isPersisting ? 'Saving...' : 'Continue'}
                </button>
              </div>
            )}
            {error && <p className="analyzing-error">{error}</p>}
          </article>

          <div className="analyzing-robot-wrap">
            <div className="analyzing-robot-media" aria-hidden="true">
              <img src={analyzingRobotImage} alt="" className="analyzing-robot-image" />
            </div>
            <div className="analyzing-audio-action">
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                title={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                className={`analyzing-audio-toggle ${isMuted ? 'is-muted' : 'is-unmuted'}`}
              >
                {isMuted ? <FaVolumeMute aria-hidden="true" /> : <FaVolumeUp aria-hidden="true" />}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="analyzing-intro">
          <article className="analyzing-bubble analyzing-bubble--result" aria-label="Your level result">
            <p className="analyzing-bubble-kicker">B-01:</p>
            <p className="analyzing-result-text">{typedResultText}</p>

            <div className="analyzing-actions">
              <button
                type="button"
                className="analyzing-action-btn analyzing-action-btn--secondary"
                onClick={() => setShowScoreBreakdown((prev) => !prev)}
              >
                {showScoreBreakdown ? 'Hide Breakdown' : 'Score Breakdown'}
              </button>
              <button
                type="button"
                className="analyzing-action-btn analyzing-action-btn--primary"
                onClick={handleGoToDashboard}
                disabled={!isTypingDone}
              >
                Next
              </button>
            </div>

            {showScoreBreakdown && (
              <div className="analyzing-breakdown">
                <p className="analyzing-breakdown-scale">Bigkas entry scale (1.0-5.0) computed from your 0-100 metrics</p>
                <p>Verbal Score (7%): {formatEntryScale(analysis.verbalScore)}</p>
                <p>Vocal Score (38%): {formatEntryScale(analysis.vocalScore)}</p>
                <p>Visual Score (55%): {formatEntryScale(analysis.visualScore)}</p>
                <p>Free Speech Pre-Test: {formatEntryScale(analysis.freePretestScore)}</p>
                <p>Final weighted score: {formatEntryScale(analysis.finalScore)}</p>
                <p>Starting level: Level {analysis.levelNumber} ({analysis.levelName})</p>
              </div>
            )}
          </article>

          <div className="analyzing-robot-wrap">
            <div className="analyzing-robot-media analyzing-robot-media--result" aria-hidden="true">
              <img src={staticRandomResultRobot} alt="" className="analyzing-robot-image" />
            </div>
            <div className="analyzing-audio-action">
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                title={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                className={`analyzing-audio-toggle ${isMuted ? 'is-muted' : 'is-unmuted'}`}
              >
                {isMuted ? <FaVolumeMute aria-hidden="true" /> : <FaVolumeUp aria-hidden="true" />}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default UserAnalyzingPage;

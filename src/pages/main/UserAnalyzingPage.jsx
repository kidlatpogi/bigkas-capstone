import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { useAuthContext } from '../../context/useAuthContext';
import { supabase } from '../../lib/supabase';
import { ROUTES } from '../../utils/constants';
import { getBigkasLevelFromScore, mapPercentToEntryScore } from '../../utils/activityProgress';
import { getSpriteUrl, getVoiceUrl } from '../../utils/assetUtils';

const resultRobotImage = getSpriteUrl('Robot/0013.webp');
const robotImage0001 = getSpriteUrl('Robot/0001.webp');
const robotImage0002 = getSpriteUrl('Robot/0002.webp');
const robotImage0003 = getSpriteUrl('Robot/0003.webp');
const robotImage0004 = getSpriteUrl('Robot/0004.webp');
const robotImage0005 = getSpriteUrl('Robot/0005.webp');
const robotImage0012 = getSpriteUrl('Robot/0012.webp');
const robotImage0015 = getSpriteUrl('Robot/0015.webp');

const analyzingProgressVoice = getVoiceUrl('Profiling and Pre-Testing/Analyzing/Analyzing your level....mp3');
const analyzingLevel1Voice = getVoiceUrl('Profiling and Pre-Testing/Analyzing/Analyzing Level 1.mp3');
const analyzingLevel2Voice = getVoiceUrl('Profiling and Pre-Testing/Analyzing/Analyzing Level 2.mp3');
const analyzingLevel3Voice = getVoiceUrl('Profiling and Pre-Testing/Analyzing/Analyzing Level 3.mp3');
const analyzingLevel4Voice = getVoiceUrl('Profiling and Pre-Testing/Analyzing/Analyzing Level 4.mp3');
const analyzingLevel5Voice = getVoiceUrl('Profiling and Pre-Testing/Analyzing/Analyzing Level 5.mp3');
const scoreBreakdownVoice1 = getVoiceUrl('Profiling and Pre-Testing/Score Breakdown/Score Breakdown 1.mp3');
const scoreBreakdownVoice2 = getVoiceUrl('Profiling and Pre-Testing/Score Breakdown/Score Breakdown 2.mp3');
const scoreBreakdownVoice3 = getVoiceUrl('Profiling and Pre-Testing/Score Breakdown/Score Breakdown 3.mp3');
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

function formatEntryScale(percent0to100) {
  return Math.floor(mapPercentToEntryScore(percent0to100)).toString();
}

const GLOBAL_MUTE_KEY = 'bigkas_global_audio_muted_v1';
const DEVELOPER_PREVIEW_SESSION_KEY = 'bigkas_developer_onboarding_preview_v1';
const RESULT_ROBOT_POOL = [
  robotImage0001,
  robotImage0002,
  robotImage0003,
  robotImage0004,
  robotImage0005,
  robotImage0012,
  robotImage0015,
];
const SCORE_BREAKDOWN_VARIANTS = [
  {
    text: "Alright, the calculations are complete! Let's take a look at your score breakdown!",
    voice: scoreBreakdownVoice1,
  },
  {
    text: 'The numbers are in! Here is how you did across the board. Take a look!',
    voice: scoreBreakdownVoice2,
  },
  {
    text: 'Data processed! Check out your Triple-V stats below!',
    voice: scoreBreakdownVoice3,
  },
];

const LEVEL_CONTENT = {
  1: {
    text: "Yay, you made that look so easy! All the setup is done. Your journey begins right here at Level 1. Don't sweat the small stuff—every great speaker you've ever seen started exactly where you are right now! We're going to build your confidence brick by brick. Get ready to transform that 'stage fright' into 'stage might'!",
    voice: analyzingLevel1Voice,
  },
  2: {
    text: "Beep! That was great! Setup is officially complete. You're a Level 2 speaker, so your main path starts at Level 2. The full Level 1 journey is still available as optional practice whenever you want to review the foundations.",
    voice: analyzingLevel2Voice,
  },
  3: {
    text: "Whoa, nice job! Setup is completely done. My sensors picked up some seriously good speaking habits, so you're a Level 3 speaker! Your main path starts at Level 3, and the full earlier journeys stay open as optional practice.",
    voice: analyzingLevel3Voice,
  },
  4: {
    text: "Wowzers! Setup is clear! Your speech was so smooth it almost blew my circuits! You're a Level 4 speaker, so your main path starts at Level 4. Earlier journeys remain fully available as optional practice if you want extra polishing.",
    voice: analyzingLevel4Voice,
  },
  5: {
    text: "Mind... blown! Setup is completely done. Your speaking skills are off the charts! You're a Level 5 speaker, so your main path starts at Level 5. The full earlier journeys stay available as optional practice.",
    voice: analyzingLevel5Voice,
  },
};

function UserAnalyzingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUserMetadata } = useAuthContext();
  const isDeveloperPreview =
    location.state?.developerPreview === true ||
    (typeof window !== 'undefined' && window.sessionStorage.getItem(DEVELOPER_PREVIEW_SESSION_KEY) === '1');
  const developerPreviewAnalysis = location.state?.developerPreviewAnalysis || {};
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);
  const [isPersisted, setIsPersisted] = useState(false);
  const [showLevelReveal, setShowLevelReveal] = useState(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [typedResultText, setTypedResultText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(GLOBAL_MUTE_KEY) === '1';
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
  const scoreBreakdownAudioRef = useRef(null);

  const levelContent = useMemo(
    () => LEVEL_CONTENT[analysis.levelNumber] || LEVEL_CONTENT[1],
    [analysis.levelNumber],
  );
  const staticRandomResultRobot = useMemo(() => {
    const randomIdx = Math.floor(Math.random() * RESULT_ROBOT_POOL.length);
    return RESULT_ROBOT_POOL[randomIdx] || resultRobotImage;
  }, []);
  const scoreBreakdownContent = useMemo(() => {
    const randomIdx = Math.floor(Math.random() * SCORE_BREAKDOWN_VARIANTS.length);
    return SCORE_BREAKDOWN_VARIANTS[randomIdx] || SCORE_BREAKDOWN_VARIANTS[0];
  }, []);
  const profilingEntryScore = useMemo(() => {
    const rawProfileScore = clampScore(user?.speakerProfile?.baseline_score ?? 0);
    return formatEntryScale(rawProfileScore);
  }, [user?.speakerProfile?.baseline_score]);
  const profilingPercent = useMemo(
    () => clampScore(user?.speakerProfile?.baseline_score ?? 0),
    [user?.speakerProfile?.baseline_score],
  );
  const pretestEntryScore = useMemo(
    () => formatEntryScale(analysis.finalScore),
    [analysis.finalScore],
  );
  const visualEntryScore = useMemo(
    () => formatEntryScale(analysis.visualScore),
    [analysis.visualScore],
  );
  const vocalEntryScore = useMemo(
    () => formatEntryScale(analysis.vocalScore),
    [analysis.vocalScore],
  );
  const verbalEntryScore = useMemo(
    () => formatEntryScale(analysis.verbalScore),
    [analysis.verbalScore],
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      let freePretestScore = 0;
      let verbalScore = 0;
      let vocalScore = 0;
      let visualScore = 0;

      if (isDeveloperPreview) {
        freePretestScore = clampScore(developerPreviewAnalysis.freePretestScore ?? 72);
        verbalScore = clampScore(developerPreviewAnalysis.verbalScore ?? 70);
        vocalScore = clampScore(developerPreviewAnalysis.vocalScore ?? 74);
        visualScore = clampScore(developerPreviewAnalysis.visualScore ?? 72);

        const finalScore = calculateMehrabianTotal({
          verbalScore,
          vocalScore,
          visualScore,
        });
        const entryScore = mapPercentToEntryScore(finalScore);
        const levelBand = getBigkasLevelFromScore(entryScore);

        if (!cancelled) {
          setAnalysis({
            verbalScore,
            vocalScore,
            visualScore,
            freePretestScore,
            finalScore,
            levelNumber: levelBand.levelNumber,
            levelName: levelBand.levelName,
          });
          setIsReady(true);
        }
        return;
      }

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
  }, [
    developerPreviewAnalysis.freePretestScore,
    developerPreviewAnalysis.verbalScore,
    developerPreviewAnalysis.visualScore,
    developerPreviewAnalysis.vocalScore,
    isDeveloperPreview,
    user?.id,
    userPretestFreeScore,
    userPretestFreeSessionId,
  ]);

  const persistAndReveal = useCallback(async () => {
    if (!isReady || isPersisting) return;
    if (showLevelReveal) return;

    if (isDeveloperPreview) {
      if (analyzingAudioRef.current) {
        analyzingAudioRef.current.pause();
        analyzingAudioRef.current.currentTime = 0;
      }
      setIsPersisted(true);
      setShowLevelReveal(true);
      return;
    }

    if (!isPersisted) {
      setIsPersisting(true);
      setError('');

      const result = await updateUserMetadata({
        onboarding_stage: 'completed',
        onboarding_completed: true,
        speaker_entry_score: mapPercentToEntryScore(analysis.finalScore),
        speaker_level: analysis.levelName,
        speaker_level_number: analysis.levelNumber,
        progress_level_number: analysis.levelNumber,
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

      // Place advanced users on their assessed journey; earlier journeys remain optional.
      if (result?.success && user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            current_level: analysis.levelNumber,
            speaker_level: analysis.levelNumber,
            is_pre_test_completed: true
          })
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
    isDeveloperPreview,
    showLevelReveal,
    updateUserMetadata,
    user?.id,
    userSpeakerPoints,
  ]);

  useEffect(() => {
    if (isReady && !showLevelReveal && !isPersisting && !isPersisted) {
      persistAndReveal();
    }
  }, [isReady, showLevelReveal, isPersisting, isPersisted, persistAndReveal]);

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
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(GLOBAL_MUTE_KEY, isMuted ? '1' : '0');
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
    const audio = scoreBreakdownAudioRef.current;
    if (!audio) return;
    audio.muted = isMuted;
    if (isMuted) {
      audio.pause();
    }
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
    // Analysis voice removed as requested
    // audio.play().catch(() => {});
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
      audio.play().catch(() => { });
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
      revealAudioRef.current = null;
    };
  }, [isMuted, levelContent.voice, showLevelReveal]);

  useEffect(() => {
    if (!showScoreBreakdown) return undefined;
    const audio = new Audio(scoreBreakdownContent.voice);
    audio.preload = 'auto';
    audio.muted = isMuted;
    scoreBreakdownAudioRef.current = audio;

    if (revealAudioRef.current) {
      revealAudioRef.current.pause();
      revealAudioRef.current.currentTime = 0;
    }

    if (!isMuted) {
      audio.currentTime = 0;
      audio.play().catch(() => { });
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
      scoreBreakdownAudioRef.current = null;
    };
  }, [isMuted, scoreBreakdownContent.voice, showScoreBreakdown]);

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        [analyzingAudioRef.current, revealAudioRef.current, scoreBreakdownAudioRef.current].forEach((audio) => {
          if (!audio) return;
          audio.pause();
          audio.currentTime = 0;
        });
      } else if (showScoreBreakdown && scoreBreakdownAudioRef.current) {
        scoreBreakdownAudioRef.current.currentTime = 0;
        scoreBreakdownAudioRef.current.play().catch(() => { });
      } else if (showLevelReveal && revealAudioRef.current) {
        revealAudioRef.current.currentTime = 0;
        revealAudioRef.current.play().catch(() => { });
      } else if (!showLevelReveal && analyzingAudioRef.current) {
        analyzingAudioRef.current.currentTime = 0;
        // audio.play().catch(() => {});
      }
      return next;
    });
  };

  const handleGoToDashboard = () => {
    navigate(ROUTES.ACTIVITY, {
      replace: true,
      state: {
        developerPreview: isDeveloperPreview,
        skywardEntrance: true,
        launchFreeSpeechTutorial: true,
        t: Date.now(),
      },
    });
  };

  return (
    <div className="user-analyzing-page">
      {!showLevelReveal ? null : showScoreBreakdown ? (
        <section className="analyzing-intro">
          <div className="profiling-unit">
            <article className="analyzing-bubble analyzing-bubble--result analyzing-bubble--score-breakdown" aria-label="Score breakdown">
              <p className="analyzing-bubble-kicker">B-01:</p>
              <p className="analyzing-result-text">{scoreBreakdownContent.text}</p>

              <div className="analyzing-breakdown-score-page">
                <p>
                  Profiling (<strong className="analyzing-score-value">{profilingEntryScore}/5</strong>): Your answers created a comfort and confidence baseline: {profilingPercent}% mapped to the 1-5 scale.
                </p>
                <p>
                  AI Pre-test (<strong className="analyzing-score-value">{pretestEntryScore}/5</strong>): Your recording was scored with Triple V: Visual 55% + Vocal 38% + Verbal 7% = {analysis.finalScore}%.
                </p>
                <ul className="analyzing-breakdown-list">
                  <li>Visual (55%): <strong className="analyzing-score-value">{visualEntryScore}/5</strong> from {analysis.visualScore}% - eye contact, posture, and gestures.</li>
                  <li>Vocal (38%): <strong className="analyzing-score-value">{vocalEntryScore}/5</strong> from {analysis.vocalScore}% - pitch, projection, and pacing.</li>
                  <li>Verbal (7%): <strong className="analyzing-score-value">{verbalEntryScore}/5</strong> from {analysis.verbalScore}% - vocabulary, clarity, and filler control.</li>
                </ul>
                <p>
                  Your placement follows the weighted AI Pre-test score; profiling adds confidence context.
                </p>
              </div>

              <div className="analyzing-actions">
                <button
                  type="button"
                  className="analyzing-action-btn analyzing-action-btn--primary"
                  onClick={handleGoToDashboard}
                >
                  Next
                </button>
              </div>
            </article>

            <div className="analyzing-robot-wrap">
              <div className="analyzing-robot-media analyzing-robot-media--result" aria-hidden="true">
                <img src={robotImage0015} alt="" className="analyzing-robot-image" />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="analyzing-intro">
          <div className="profiling-unit">
            <article className="analyzing-bubble analyzing-bubble--result" aria-label="Your level result">
              <p className="analyzing-bubble-kicker">B-01:</p>
              <p className="analyzing-result-text">{typedResultText}</p>

              <div className="analyzing-actions">
                <button
                  type="button"
                  className="analyzing-action-btn analyzing-action-btn--secondary"
                  onClick={() => setShowScoreBreakdown(true)}
                >
                  Score Breakdown
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

            </article>

            <div className="analyzing-robot-wrap">
              <div className="analyzing-robot-media analyzing-robot-media--result" aria-hidden="true">
                <img src={staticRandomResultRobot} alt="" className="analyzing-robot-image" />
              </div>
            </div>
          </div>
        </section>
      )}

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
  );
}

export default UserAnalyzingPage;

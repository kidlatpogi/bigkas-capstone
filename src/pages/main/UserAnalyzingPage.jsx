import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { useAuthContext } from '../../context/useAuthContext';
import { supabase } from '../../lib/supabase';
import { ROUTES } from '../../utils/constants';
import { LEVEL_CONFIG } from '../../utils/activityProgress';
import {
  appendSpeakerPointsHistory,
  createSpeakerPointsHistoryEntry,
} from '../../utils/speakerPointsHistory';
import './UserAnalyzingPage.css';

function clampScore(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function getLevelFromScore(score) {
  if (score >= 90) return 6;
  if (score >= 80) return 5;
  if (score >= 70) return 4;
  if (score >= 55) return 3;
  if (score >= 40) return 2;
  return 1;
}

function getLevelName(levelNumber) {
  const entry = LEVEL_CONFIG[Math.max(0, Number(levelNumber || 1) - 1)];
  return entry?.name || 'Novice';
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

function getPretestBonusPoints(scriptedScore, freeScore) {
  const scripted = clampScore(scriptedScore);
  const free = clampScore(freeScore);
  const average = Math.round((scripted + free) / 2);

  if (average >= 85) return 45;
  if (average >= 70) return 30;
  if (average >= 55) return 20;
  if (average >= 40) return 12;
  if (average > 0) return 8;
  return 0;
}

function UserAnalyzingPage() {
  const navigate = useNavigate();
  const { user, updateUserMetadata } = useAuthContext();
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);
  const [isPersisted, setIsPersisted] = useState(false);
  const [showLevelPopup, setShowLevelPopup] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [analysis, setAnalysis] = useState({
    verbalScore: 0,
    vocalScore: 0,
    visualScore: 0,
    freePretestScore: 0,
    pretestBonusPoints: 0,
    nextSpeakerPoints: 0,
    finalScore: 0,
    levelNumber: 1,
    levelName: 'Novice',
  });

  const userSpeakerPoints = Math.max(0, Math.floor(Number(user?.speakerPoints ?? 0) || 0));
  const userPretestFreeScore = clampScore(user?.pretestFreeScore ?? 0);
  const userPretestFreeSessionId = user?.pretestFreeSessionId || null;
  const existingPretestBonusAwarded = Number(
    user?.onboardingLevelAnalysis?.pretest_bonus_points_awarded ?? 0,
  ) || 0;

  useEffect(() => {
    const syncWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    syncWindowSize();
    window.addEventListener('resize', syncWindowSize);

    return () => {
      window.removeEventListener('resize', syncWindowSize);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const delays = [700, 1300, 1800];
      for (let i = 0; i < delays.length; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, delays[i]));
        if (cancelled) return;
        setPhase(i + 1);
      }

      let freePretestScore = 0;
      let verbalScore = 0;
      let vocalScore = 0;
      let visualScore = 0;

      if (userPretestFreeScore > 0) {
        freePretestScore = userPretestFreeScore;
      }

      const needsSessionFallback = freePretestScore === 0 || verbalScore === 0 || vocalScore === 0 || visualScore === 0;
      if (needsSessionFallback) {
        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('id,session_origin,speaking_mode,created_at,session_media(transcript),session_metrics(confidence_score,overall_score,verbal_score,vocal_score,visual_score)')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(200);

        if (!sessionsError && Array.isArray(sessions)) {
          const normalizedSessions = sessions.map((s) => ({
            ...s,
            transcript: (Array.isArray(s.session_media) ? s.session_media[0]?.transcript : s.session_media?.transcript) || '',
          }));
          const pretests = normalizedSessions.filter(isPreTestSession);

          const freeById = userPretestFreeSessionId
            ? pretests.find((session) => String(session?.id || '') === String(userPretestFreeSessionId))
            : null;

          const freeSession = freeById || pretests.find(isFreePreTest);
          if (freePretestScore === 0) {
            freePretestScore = freeSession ? pickScore(freeSession) : 0;
          }

          const freeMetrics = Array.isArray(freeSession?.session_metrics) ? freeSession.session_metrics[0] : freeSession?.session_metrics;
          verbalScore = clampScore(freeMetrics?.verbal_score ?? 0);
          vocalScore = clampScore(freeMetrics?.vocal_score ?? 0);
          visualScore = clampScore(freeMetrics?.visual_score ?? 0);
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

      const pretestBonusPoints = (() => {
        if (finalScore >= 85) return 45;
        if (finalScore >= 70) return 30;
        if (finalScore >= 55) return 20;
        if (finalScore >= 40) return 12;
        if (finalScore > 0) return 8;
        return 0;
      })();

      const levelNumber = getLevelFromScore(finalScore);
      const levelName = getLevelName(levelNumber);
      const shouldAwardBonus = existingPretestBonusAwarded <= 0 && pretestBonusPoints > 0;
      const awardedBonusPoints = shouldAwardBonus ? pretestBonusPoints : 0;
      const nextSpeakerPoints = userSpeakerPoints + awardedBonusPoints;

      if (!cancelled) {
        setAnalysis({
          verbalScore,
          vocalScore,
          visualScore,
          freePretestScore,
          pretestBonusPoints: awardedBonusPoints,
          nextSpeakerPoints,
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
    existingPretestBonusAwarded,
    user?.id,
    userPretestFreeScore,
    userPretestFreeSessionId,
    userSpeakerPoints,
  ]);

  const progress = Math.min(100, 20 + phase * 25);

  const handleProceed = async () => {
    if (!isReady || isPersisting) return;

    if (!isPersisted) {
      setIsPersisting(true);
      setError('');

      const result = await updateUserMetadata({
        onboarding_stage: 'completed',
        onboarding_completed: true,
        speaker_level: analysis.levelName,
        speaker_level_number: analysis.levelNumber,
        speaker_points: analysis.nextSpeakerPoints,
        ...(analysis.pretestBonusPoints > 0 ? { speaker_points_updated_at: new Date().toISOString() } : {}),
        ...(analysis.pretestBonusPoints > 0
          ? {
            speaker_points_history: appendSpeakerPointsHistory(
              user?.speakerPointsHistory,
              createSpeakerPointsHistoryEntry({
                source: 'onboarding-bonus',
                label: 'Onboarding pre-test bonus',
                pointsAwarded: analysis.pretestBonusPoints,
                totalPointsAfter: analysis.nextSpeakerPoints,
                metadata: {
                  free_pretest_score: analysis.freePretestScore,
                  verbal_score: analysis.verbalScore,
                  vocal_score: analysis.vocalScore,
                  visual_score: analysis.visualScore,
                  final_score: analysis.finalScore,
                  estimated_level_number: analysis.levelNumber,
                },
              }),
            ),
          }
          : {}),
        onboarding_level_analysis: {
          analyzed_at: new Date().toISOString(),
          verbal_score: analysis.verbalScore,
          vocal_score: analysis.vocalScore,
          visual_score: analysis.visualScore,
          free_pretest_score: analysis.freePretestScore,
          pretest_bonus_points_awarded: analysis.pretestBonusPoints,
          final_score: analysis.finalScore,
          estimated_level_number: analysis.levelNumber,
        },
      });

      setIsPersisting(false);

      if (!result?.success) {
        setError(result?.error || 'Unable to complete onboarding level analysis.');
        return;
      }

      setIsPersisted(true);
    }

    setShowLevelPopup(true);
  };

  const handleGoToDashboard = () => {
    navigate(ROUTES.DASHBOARD, { replace: true });
  };

  return (
    <div className="user-analyzing-page">
      {showLevelPopup && (
        <>
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={320}
            gravity={0.28}
          />
          <div className="analyzing-popup-backdrop">
            <div className="analyzing-popup" role="dialog" aria-modal="true" aria-label="Your Level Result">
              <p className="analyzing-popup-kicker">Level Unlocked</p>
              <h2>You are now Level {analysis.levelNumber}: {getLevelName(analysis.levelNumber)}!</h2>
              <p className="analyzing-popup-text">
                Great work finishing your profiling and pre-tests. Your training journey is now personalized for your current level.
              </p>
              <button type="button" className="analyzing-proceed" onClick={handleGoToDashboard}>
                Go to Dashboard
              </button>
            </div>
          </div>
        </>
      )}

      <div className="analyzing-card">
        <p className="analyzing-kicker">Finalizing onboarding</p>
        <h1>Analyzing your Level</h1>
        <p className="analyzing-subtitle">
          We are using Triple V scores (Verbal, Vocal, Visual) and Mehrabian weighting to calibrate your starting level.
        </p>

        <div className="analyzing-meter" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>

        <ul className="analyzing-checklist">
          <li className={phase >= 1 ? 'done' : ''}>Collecting your Triple V pre-test metrics</li>
          <li className={phase >= 2 ? 'done' : ''}>Applying Mehrabian 7-38-55 weighting</li>
          <li className={phase >= 3 ? 'done' : ''}>Setting your starting speaker level</li>
        </ul>

        <div className="analyzing-estimate">
          <span>Estimated Starting Level</span>
          <strong>Level {analysis.levelNumber}: {getLevelName(analysis.levelNumber)}</strong>
        </div>

        <div className="analyzing-breakdown">
          <p>Verbal Score (7%): {analysis.verbalScore}</p>
          <p>Vocal Score (38%): {analysis.vocalScore}</p>
          <p>Visual Score (55%): {analysis.visualScore}</p>
          <p>Free Speech Pre-Test: {analysis.freePretestScore}</p>
          {analysis.pretestBonusPoints > 0 && (
            <p>Speaking Level Points Added: +{analysis.pretestBonusPoints}</p>
          )}
          <p>Final Score: {analysis.finalScore}</p>
        </div>

        {isReady && !error && (
          <div className="analyzing-actions">
            <button type="button" className="analyzing-proceed" onClick={handleProceed} disabled={isPersisting}>
              {isPersisting ? 'Saving...' : 'Proceed'}
            </button>
          </div>
        )}

        {error && <p className="analyzing-error">{error}</p>}
      </div>
    </div>
  );
}

export default UserAnalyzingPage;

import { useEffect, useMemo, useState } from 'react';

import { useNavigate, useParams, useLocation } from 'react-router-dom';

import Confetti from 'react-confetti';

import { IoChevronForward, IoPulse, IoStar } from 'react-icons/io5';

import { useSessionContext } from '../../context/useSessionContext';

import { useAuthContext } from '../../context/useAuthContext';

import { buildRoute, ROUTES } from '../../utils/constants';

import { getSessionMode } from '../../utils/sessionFormatting';

import { sanitizeRecommendationLines } from '../../utils/analysisTranscript';

import { getSpriteUrl } from '../../utils/assetUtils';

const verbalSprite = getSpriteUrl('common/Verbal.png');
const visualSprite = getSpriteUrl('common/Visual.png');
const vocalSprite = getSpriteUrl('common/Vocal.png');
const heroRobotImage = getSpriteUrl('Robot/0018.webp');

import SessionResultPageMobile from './SessionResultPageMobile';

import '../main/InnerPages.css';

import './SessionResultPage.css';



const FOREST_GREEN = '#5A7863';

const SOFT_SAGE = '#90AB8B';

const SLATE_CHARCOAL = '#3C4952';

const VIBRANT_ORANGE = '#F18F01';



function score100to15(val) {

  const v = Math.max(0, Math.min(100, Number(val) || 0));

  if (v === 0) return 1.0;

  return Math.round((1.0 + (v / 100) * 4.0) * 100) / 100;

}



function getTripleVScores(result) {

  const visualAvg = result.visual_avg ?? score100to15(result.visual_score ?? 0);

  const vocalAvg = result.vocal_avg ?? score100to15(result.acoustic_score ?? 0);

  const verbalAvg = result.verbal_avg ?? score100to15(result.context_score ?? 0);



  const entryPoint = result.entry_point

    ?? score100to15(result.confidence_score ?? 0);



  return {

    entryPoint: Math.round(Math.max(1, Math.min(5, Number(entryPoint) || 1)) * 100) / 100,

    visualAvg: Math.round(Math.max(1, Math.min(5, Number(visualAvg) || 1)) * 100) / 100,

    vocalAvg: Math.round(Math.max(1, Math.min(5, Number(vocalAvg) || 1)) * 100) / 100,

    verbalAvg: Math.round(Math.max(1, Math.min(5, Number(verbalAvg) || 1)) * 100) / 100,

  };

}



function getScoreTier15(score) {
  if (score >= 4.0) return { label: 'Stellar', color: '#10B981' };
  if (score >= 3.0) return { label: 'Strong', color: '#0D9488' };
  if (score >= 2.0) return { label: 'Developing', color: '#3B82F6' };
  return { label: 'Rising', color: '#F59E0B' };
}



function scoreBarPercent(score) {

  return Math.max(0, Math.min(100, ((score - 1) / 4) * 100));

}



function shouldCelebrateScore(session) {

  const score = Number(session?.confidence_score ?? 0);

  if (!Number.isFinite(score) || score < 60) return false;

  const raw = [

    session?.session_mode, session?.mode, session?.session_type,

    session?.session_origin, session?.speaking_mode,

  ].filter((v) => typeof v === 'string' && v.trim()).join(' ').toLowerCase();

  const isPreTest = raw.includes('pre-test') || raw.includes('pretest');

  const isPracticeOrTraining = raw.includes('practice') || raw.includes('train');

  return !isPreTest && isPracticeOrTraining;

}



function buildReplayAction(session, navigate) {

  const mode = getSessionMode(session);

  const isPractice = mode === 'Practice';

  const setupRoute = isPractice ? ROUTES.PRACTICE : ROUTES.TRAINING_SETUP;

  const label = isPractice ? 'Practice Again' : 'Train Again';

  const rawSpeech = [

    session?.session_mode, session?.mode, session?.speaking_mode,

  ].filter((v) => typeof v === 'string' && v.trim()).join(' ').toLowerCase();

  const isFree = rawSpeech.includes('free');

  const focus = isFree ? 'free' : 'scripted';



  const replayState = {

    focus,

    sessionType: isPractice ? 'practice' : 'training',

    entryPoint: isPractice ? 'practice' : 'training',

    autoStartCountdown: true,

  };



  if (focus === 'scripted') {

    const content = session?.transcript || '';

    if (!content.trim()) return { label, onClick: () => navigate(setupRoute) };

    replayState.script = {

      id: session?.script_id || `replay-${session?.id || 'session'}`,

      title: session?.script_title || session?.title || `${mode} Script`,

      content,

    };

  } else {

    replayState.freeTopic = session?.transcript || 'Free speech session';

  }



  return {

    label,

    onClick: () => navigate(`${ROUTES.TRAINING}?autostart=1`, { state: replayState }),

  };

}



function SessionResultPage({ sessionIdProp, isInnerView, onCloseInner, onViewDetailed }) {

  const navigate = useNavigate();

  const { sessionId: paramSessionId } = useParams();

  const activeSessionId = sessionIdProp || paramSessionId;

  const { state } = useLocation();

  const { currentSession, fetchSessionById, isLoading } = useSessionContext();

  const { user } = useAuthContext();

  const [windowSize, setWindowSize] = useState(() => ({

    width: typeof window !== 'undefined' ? window.innerWidth : 0,

    height: typeof window !== 'undefined' ? window.innerHeight : 0,

  }));



  const hasCompleteState = useMemo(() => {

    if (!state || typeof state !== 'object') return false;

    const sameSession = String(state?.id || '') === String(activeSessionId || '');

    if (!sameSession) return false;

    return Number.isFinite(Number(state?.confidence_score));

  }, [activeSessionId, state]);



  useEffect(() => {

    if (hasCompleteState) return;

    if (String(currentSession?.id || '') === String(activeSessionId || '')) return;

    fetchSessionById(activeSessionId);

  }, [currentSession, fetchSessionById, hasCompleteState, activeSessionId]);



  useEffect(() => {

    const updateSize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });

    updateSize();

    window.addEventListener('resize', updateSize);

    return () => window.removeEventListener('resize', updateSize);

  }, []);



  const result = useMemo(() => {

    if (hasCompleteState) return state;

    if (String(currentSession?.id || '') === String(activeSessionId || '')) return currentSession;

    return null;

  }, [currentSession, hasCompleteState, activeSessionId, state]);



  if (windowSize.width < 768) {

    return (

      <SessionResultPageMobile 

        sessionIdProp={activeSessionId}

        isInnerView={isInnerView}
        onCloseInner={onCloseInner}
        onViewDetailed={onViewDetailed}
      />
    );
  }

  if (!result && isLoading) {

    return (

      <div className="sr-page">

        <div className="sr-loading">Loading...</div>

      </div>

    );

  }



  if (!result) {

    return (

      <div className="sr-page">

        <div className="sr-empty">

          <p className="sr-empty-title">Session not found</p>

          <button className="sr-btn sr-btn-primary" onClick={() => navigate(ROUTES.DASHBOARD)}>

            Go Home

          </button>

        </div>

      </div>

    );

  }



  const tripleV = getTripleVScores(result);

  const overallTier = getScoreTier15(tripleV.entryPoint);

  const sessionTitle = result?.script_title || result?.title || 'Session';

  const mode = getSessionMode(result);

  const sourceNav = state?.source;



  let breadcrumbParent = mode === 'Practice' ? 'Practice' : 'Training';

  let breadcrumbRoute = mode === 'Practice' ? ROUTES.PRACTICE : ROUTES.TRAINING_SETUP;

  if (sourceNav === 'progress') {

    breadcrumbParent = 'Progress';

    breadcrumbRoute = ROUTES.PROGRESS;

  } else if (sourceNav === 'notification') {

    breadcrumbParent = 'Dashboard';

    breadcrumbRoute = state?.backTo || ROUTES.DASHBOARD;

  }

  

  const handleBackNavigation = () => {

    if (isInnerView && onCloseInner) {

      onCloseInner();

    } else {

      navigate(breadcrumbRoute, { replace: true });

    }

  };



  const recommendations = sanitizeRecommendationLines(

    Array.isArray(result.recommendations) ? result.recommendations : [],

  );

  const pillars = [

    { key: 'visual', label: 'Visual', desc: 'Eye contact & gestures', score: tripleV.visualAvg, image: visualSprite },

    { key: 'vocal', label: 'Vocal', desc: 'Voice quality & stability', score: tripleV.vocalAvg, image: vocalSprite },

    { key: 'verbal', label: 'Verbal', desc: 'Pronunciation & clarity', score: tripleV.verbalAvg, image: verbalSprite },

  ];



  const pillarRecommendations = pillars

    .filter((p) => p.score < 3.0)

    .map((p) => {

      let text = '';

      if (p.key === 'visual') text = 'Improve visual presence — maintain natural eye contact and use purposeful gestures.';

      else if (p.key === 'vocal') text = 'Steady your voice — practice deep breathing for pitch and volume control.';

      else text = 'Articulate more clearly — slow down on complex words and stay on topic.';

      

      return { text, pillar: p.key, image: p.image };

    });



  const rawRecommendations = recommendations.map(text => {

    const lowText = text.toLowerCase();

    let pillar = 'general';

    let image = null;

    

    if (lowText.includes('visual') || lowText.includes('eye') || lowText.includes('gesture')) {

      pillar = 'visual';

      image = visualSprite;

    } else if (lowText.includes('vocal') || lowText.includes('voice') || lowText.includes('pitch')) {

      pillar = 'vocal';

      image = vocalSprite;

    } else if (lowText.includes('verbal') || lowText.includes('word') || lowText.includes('pronunciation')) {

      pillar = 'verbal';

      image = verbalSprite;

    }

    

    return { text, pillar, image };

  });



  const allRecommendations = [...pillarRecommendations, ...rawRecommendations];

  

  if (allRecommendations.length === 0) {

    allRecommendations.push({ 

      text: 'Great job! Keep up the excellent work across all areas.', 

      pillar: 'general', 

      image: null 

    });

  }



  const replayAction = buildReplayAction(result, navigate);

  const isOnboarding = user?.onboardingStage === 'pretest' || user?.onboardingStage === 'analyzing';

  const onboardingRoute = user?.onboardingStage === 'analyzing' ? ROUTES.USER_ANALYZING : ROUTES.USER_PRETEST;

  const onboardingLabel = user?.onboardingStage === 'analyzing' ? 'Analyze Level' : 'Continue Onboarding';



  return (

    <div className={`sr-page-root ${isInnerView ? 'sr-page--inner' : ''} activity-page--skyward-entrance`}>

      {shouldCelebrateScore(result) && !isInnerView && (

        <Confetti

          width={windowSize.width}

          height={windowSize.height}

          recycle={false}

          numberOfPieces={260}

          gravity={0.25}

          className="score-confetti"

        />

      )}



      {/* Breadcrumb */}

      {!isInnerView && (

        <nav className="sr-breadcrumb">

          <button

            type="button"

            className="sr-breadcrumb-link"

            onClick={handleBackNavigation}

          >

            {breadcrumbParent}

          </button>

          <IoChevronForward className="sr-breadcrumb-sep" />

          <span className="sr-breadcrumb-current">

            {sessionTitle} Analysis Result

          </span>

        </nav>

      )}



      <div className="sr-content-layout">

        {/* Overall Score Hero (Full Width Coach) */}

        <section className="new-banner dashboard-anim-top dashboard-anim-delay-2" id="sr-hero-section">

          <div className="new-banner-left is-full-width">

            <img src={heroRobotImage} alt="" className="new-banner-robot" />

            <div className="new-banner-bubble" aria-label="Coach message">

              <p className="new-banner-kicker">B-01:</p>

              <div className="new-banner-feedback-content">

                <p className="new-banner-intro-text">

                  {tripleV.entryPoint >= 4.0

                    ? 'Outstanding! Your speech was clear and confident.'

                    : tripleV.entryPoint >= 3.0

                      ? 'Good job! A few areas to polish, but your delivery is becoming much more natural.'

                      : tripleV.entryPoint >= 2.0

                        ? 'Keep going! Regular practice is the key to steady improvement.'

                        : "Every session makes you stronger. Focus on the fundamentals and try again."}

                </p>

                <ul className="new-banner-recs-minilist">

                  {allRecommendations.slice(0, 2).map((rec, idx) => (

                    <li key={idx} className="new-banner-rec-item">

                      <span className="new-banner-rec-bullet">•</span>

                      {rec.text}

                    </li>

                  ))}

                </ul>

              </div>

            </div>

          </div>

        </section>



        {/* Overview Row (Relocated Widgets) */}

        <div className="sr-overview-row dashboard-anim-bottom dashboard-anim-delay-3">

          {/* Overall Score Card */}

          <div className="progress-stat-card new-banner-widget overall-score-card">

            <div className="widget-content">

              <div className="new-widget-head">

                <h2 className="new-widget-title">Overall Score</h2>

                <span className="new-widget-chip performance-chip">PERFORMANCE</span>

              </div>

              <div className="score-display">

                <span className="score-value" style={{ color: overallTier.color }}>

                  {tripleV.entryPoint.toFixed(1)}

                </span>

                <span className="score-max">/ 5.0</span>

              </div>

              <div className="score-label">

                <div className="tier-indicator" style={{ '--tier-color': overallTier.color }}>

                  <span className="tier-dot" />

                  {overallTier.label}

                </div>

              </div>

            </div>

          </div>



          {/* Analysis Focus Card */}

          <div className="progress-stat-card new-banner-widget analysis-focus-card">

            <div className="widget-content">

              <div className="new-widget-head">

                <h2 className="new-widget-title">Primary Strength</h2>

                <span className="new-widget-chip focus-chip">ANALYSIS</span>

              </div>

              <div className="strength-display">

                {(() => {

                  const topPillar = pillars.sort((a, b) => b.score - a.score)[0];

                  return (

                    <>

                      <img src={topPillar.image} alt="" className="strength-sprite" />

                      <span className="strength-name">{topPillar.label}</span>

                    </>

                  );

                })()}

              </div>

              <p className="strength-kicker">Top Performance Area</p>

            </div>

          </div>

        </div>



        {/* Triple V Breakdown (Grid of Cards) */}

        <section className="sr-pillars-section">

          <div className="sr-section-header">

            <h2 className="sr-section-title">Triple V Breakdown</h2>

            <p className="sr-section-subtitle">Deep dive into your visual, vocal, and verbal metrics</p>

          </div>

          <div className="sr-pillars-grid">

            {pillars.map((p, index) => {

              const tier = getScoreTier15(p.score);

              const scorePercent = scoreBarPercent(p.score);

              return (

                <div 

                  key={p.key} 

                  className={`pillar-card sr-pillar-progress-card dashboard-anim-bottom dashboard-anim-delay-${5 + index}`} 

                  id={`pillar-${p.key}`}

                >

                  <div className="new-widget-head">

                    <h2 className="new-widget-title">{p.label}</h2>

                    <span className="new-widget-chip" style={{ background: `${tier.color}20`, color: tier.color }}>

                      {tier.label}

                    </span>

                  </div>

                  

                  <div className="new-widget-rank-card">

                    <img src={p.image} alt="" className="new-widget-rank-sprite" />

                    <div className="new-widget-rank-content">

                      <p className="new-widget-kicker">Score</p>

                      <p className="new-widget-value">{p.score.toFixed(1)} / 5.0</p>

                    </div>

                  </div>

                  

                  <div className="progress-pillar-track-header">
                    <span className="progress-pillar-track-label">{p.desc}</span>
                    <span className="progress-pillar-track-percent">{p.score.toFixed(1)} / 5.0</span>
                  </div>

                  

                  <div className="progress-pillar-track">

                    <div

                      className="progress-pillar-track-fill"

                      style={{ 

                        width: `${scorePercent}%`, 

                        background: tier.color 

                      }}

                    />

                  </div>

                </div>

              );

            })}

          </div>

        </section>



        {/* Final Actions Footer */}

        <footer className="sr-footer-layout dashboard-anim-bottom dashboard-anim-delay-8">

          <button

            type="button"

            className="sr-detailed-feedback-card-v2"

            onClick={() => {

              if (isInnerView && onViewDetailed) {

                onViewDetailed();

              } else {

                navigate(ROUTES.DETAILED_FEEDBACK.replace(':sessionId', activeSessionId), {

                  state: {

                    ...result,

                    source: state?.source,

                    backTo: state?.backTo,

                  },

                });

              }

            }}

          >

            <div className="sr-detailed-card-icon">

              <IoChevronForward />
            </div>
            <div className="sr-detailed-card-content">

              <span className="sr-detailed-card-kicker">ANALYTICS INSIGHTS</span>

              <h3 className="sr-detailed-card-title">Detailed Feedback</h3>

            </div>

          </button>



          <button className="sr-btn-action sr-btn-primary-v2" onClick={replayAction.onClick}>

            {replayAction.label}

          </button>

        </footer>

      </div>

    </div>

  );

}



export default SessionResultPage;


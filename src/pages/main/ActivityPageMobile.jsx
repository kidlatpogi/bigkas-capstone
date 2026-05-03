import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import Lottie from 'lottie-react';
import { useAuthContext } from '../../context/useAuthContext';
import { useSessions } from '../../hooks/useSessions';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/common/Button';
import PushButton from '../../components/common/PushButton';
import TutorialOverlay from '../../components/main/TutorialOverlay';
import {
  GLOBAL_ACTIVITY_SCOPE,
  getActivityTaskProgress,
  getActivityMetrics,
  getActivityCompletionHistory,
  getBigkasLevelFromUser,
  getTaskXp,
  isActivityTaskCompleted,
} from '../../utils/activityProgress';
import { addClaimableAchievement } from '../../utils/achievementClaims';
import SkywardJourneyShell from '../../components/journey/SkywardJourneyShell';
import StreakCalendarModal from '../../components/main/StreakCalendarModal';
import RankListModal from '../../components/main/RankListModal';
import { useActivitiesJourneyTasks } from '../../hooks/useActivitiesJourneyTasks';
import { ensureJourneyStarted, updateJourneyCurrentActivity } from '../../services/journeyProgressService';
import { RANDOM_TOPICS } from '../../utils/practiceData';
import { getAssetUrl, getSpriteUrl } from '../../utils/assetUtils';

const iconFire = getAssetUrl('icons/Icon-Fire.svg');
const robotMorningImage = getSpriteUrl('Robot/0018.webp');
const robotNoonImage = getSpriteUrl('Robot/0001.webp');
const robotNightImage = getSpriteUrl('Robot/0013.webp');
const tutorialRobotStep1 = getSpriteUrl('Robot/0001.webp');
const tutorialRobotStep2 = getSpriteUrl('Robot/0010.webp');
const tutorialRobotStep3 = getSpriteUrl('Robot/0018.webp');
const tutorialRobotStep4 = getSpriteUrl('Robot/0001.webp');
const tutorialRobotStep5 = getSpriteUrl('Robot/0002.webp');
const tutorialRobotStep6 = getSpriteUrl('Robot/0004.webp');
const randomizerRobotImage = getSpriteUrl('Robot/0005.webp');
const rankBronze = getSpriteUrl('Rank/rank-bronze.png');
const rankSilverImage = getSpriteUrl('Rank/rank-silver.png');
const rankGoldImage = getSpriteUrl('Rank/rank-gold.png');
const rankMythrilImage = getSpriteUrl('Rank/rank-mythril.png');
const rankLegendaryImage = getSpriteUrl('Rank/rank-legendary.png');
const crystalBallImage = getSpriteUrl('common/crystal-ball.png');
const crownImage = getSpriteUrl('common/crown.png');
import fireAnimationData from '../../assets/Lottie/fire.json';
import './InnerPages.css';
import './ActivityPageMobile.css';

const DAY_MS = 86_400_000;
const ACTIVITY_CELEBRATION_STORAGE_KEY = 'bigkas_pending_activity_celebration_v1';
const LAST_SHOWN_COMPLETION_EVENT_KEY = 'bigkas_last_completion_event_v1';
const FREE_SPEECH_TUTORIAL_SEEN_KEY = 'bigkas_free_speech_tutorial_seen_v1';

const FREE_SPEECH_TUTORIAL_STEPS = [
  {
    id: 'step-intro',
    title: 'B-01:',
    robot: tutorialRobotStep1,
    robotClassName: 'is-activity-home-step-1',
    button: 'Next',
    targetElementId: null,
    text: 'Welcome aboard! You made it, and I know you are going to do great things here. Let me give you a quick, guided tour of your Home screen so you know exactly where everything is.',
  },
  {
    id: 'step-companion',
    title: 'B-01:',
    robot: tutorialRobotStep2,
    robotClassName: 'is-activity-home-step-2',
    button: 'Next',
    targetElementId: 'tutorial-target-home-banner',
    text: "Your AI Companion, hey that's me! See my panel right at the top? I will be checking in with you from time to time. Depending on your progress, I'll drop by with daily greetings, personalized tips, and a little extra encouragement to keep your momentum going.",
  },
  {
    id: 'step-streak',
    title: 'B-01:',
    robot: tutorialRobotStep3,
    robotClassName: 'is-activity-home-step-3',
    button: 'Next',
    targetElementId: 'tutorial-target-home-streak',
    text: 'Up in the top right is your Streak counter. Consistency is the true secret to mastering public speaking! Log in and complete a daily activity to keep the fire burning and watch that number grow.',
  },
  {
    id: 'step-rank',
    title: 'B-01:',
    robot: tutorialRobotStep4,
    button: 'Next',
    targetElementId: 'tutorial-target-home-rank',
    text: 'To keep an eye on the big picture, check out the Journey Progression card on the right! This handy panel lets you quickly track your current speaking Rank and see exactly how many tasks you have conquered so far.',
  },
  {
    id: 'step-roadmap',
    title: 'B-01:',
    robot: tutorialRobotStep5,
    robotClassName: 'is-roadmap-step',
    button: 'Next',
    targetElementId: 'tutorial-target-home-journey',
    text: 'This path is your customized learning roadmap! You will start at your first stage and unlock the next ones as you move forward. The activities gradually become more challenging, and once you complete all tasks on your path, you unlock a final Post-test challenge to advance.',
  },
  {
    id: 'step-practice',
    title: 'B-01:',
    robot: tutorialRobotStep6,
    robotClassName: 'is-practice-step',
    button: 'Finish!',
    targetElementId: 'tutorial-target-home-practice',
    text: 'Need extra training? The Practice card gives you two ways to sharpen your skills anytime: Randomizer for surprise prompts, and Free Speech for open-topic confidence building. Ready? Let us start your Free Speech session now!',
  },
];

const RANDOMIZER_DEFAULT_TOPIC = 'How does artificial intelligence impact our everyday lives?';

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLocalDayIndex(dateInput) {
  const date = new Date(dateInput);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

function getSessionDate(session) {
  const rawDate = session?.created_at ?? session?.createdAt;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDayKeyFromDate(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;
  return getLocalDateKey(date);
}

function isPreTestSession(session) {
  const raw = [
    session?.session_mode, session?.mode, session?.session_type,
    session?.session_origin, session?.speaking_mode, session?.entry_point,
  ].filter((v) => typeof v === 'string' && v.trim()).join(' ').toLowerCase();
  return raw.includes('pre-test') || raw.includes('pretest');
}

function buildStreakStats(sessions = [], historyEntries = []) {
  const dayIndexes = new Set();
  const addDate = (dateInput) => {
    const parsed = new Date(dateInput);
    if (!Number.isNaN(parsed.getTime())) dayIndexes.add(getLocalDayIndex(parsed));
  };
  sessions.forEach((s) => { if (!isPreTestSession(s)) { const d = getSessionDate(s); if (d) addDate(d); } });
  historyEntries.forEach((e) => { if (e?.completedAt) addDate(e.completedAt); });
  const sortedIndexes = Array.from(dayIndexes).sort((a, b) => a - b);
  if (!sortedIndexes.length) return { currentStreak: 0, longestStreak: 0, activeDays: [] };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayIndex = getLocalDayIndex(now);
  const yesterdayIndex = todayIndex - 1;
  let rl = 0;
  let nl = 0;
  let ol = null;
  sortedIndexes.forEach((ll) => {
    ol !== null && ll === ol + 1 ? (rl += 1) : (rl = 1), (nl = Math.max(nl, rl)), (ol = ll);
  });
  const isTodayActive = dayIndexes.has(todayIndex);
  const isYesterdayActive = dayIndexes.has(yesterdayIndex);
  const currentStreak = isTodayActive || isYesterdayActive ? rl : 0;
  return { currentStreak, longestStreak: nl, activeDays: sortedIndexes };
}

function getWeekdayPills(qa = new Set()) {
  const $a = new Date();
  $a.setHours(0, 0, 0, 0);
  const Ya = $a.getDay();
  const Za = $a.getDate() - Ya + (Ya === 0 ? -6 : 1);
  $a.setDate(Za);
  const pills = Array.from({ length: 7 }, (Ja, Qa) => {
    const el = new Date($a);
    el.setDate($a.getDate() + Qa);
    const tl = getLocalDateKey(el);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const isToday = el.getTime() === now.getTime();
    return { label: ['M', 'T', 'W', 'Th', 'F', 'S', 'S'][Qa], active: qa.has(tl), isToday };
  });
  return pills;
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'noon';
  return 'night';
}

function getRankSprite(levelNumber, levelName) {
  const level = Number(levelNumber || 1);
  if (level <= 1) return rankBronze;
  if (level <= 2) return rankSilverImage;
  if (level <= 3) return rankGoldImage;
  if (level <= 4) return rankMythrilImage;
  return rankLegendaryImage;
}

function ActivityPageMobile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUserMetadata } = useAuthContext();
  const { sessions = [] } = useSessions();

  // Activity state
  const Qa = user?.id || GLOBAL_ACTIVITY_SCOPE;
  const activityHistory = useMemo(() => (user?.id ? getActivityCompletionHistory(Qa) : []), [Qa, user?.id]);
  const activityMetrics = useMemo(() => getActivityMetrics(Qa), [Qa]);

  // Journey & tasks
  const {
    tasks = [],
    loading: activitiesLoading,
    refresh: refreshJourney,
  } = useActivitiesJourneyTasks(user?.id, Qa);

  // State
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [showFreeSpeechTutorial, setShowFreeSpeechTutorial] = useState(false);
  const [showRandomizerOverlay, setShowRandomizerOverlay] = useState(false);
  const [showFreeSpeechOverlay, setShowFreeSpeechOverlay] = useState(false);
  const [freeSpeechDraftTopic, setFreeSpeechDraftTopic] = useState('');
  const [randomizerTopic, setRandomizerTopic] = useState(RANDOM_TOPICS[0] || {});
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);
  const [completionModalTaskTitle, setCompletionModalTaskTitle] = useState('');
  const [recentStampedTaskId, setRecentStampedTaskId] = useState(null);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [showDashboardOverlay, setShowDashboardOverlay] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [entranceFromNav, setEntranceFromNav] = useState(false);
  const stampResetTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);

  // Clean up effects
  useEffect(() => {
    return () => {
      if (stampResetTimeoutRef.current) {
        window.clearTimeout(stampResetTimeoutRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'image';
    preloadLink.href = randomizerRobotImage;
    document.head.appendChild(preloadLink);
    return () => {
      if (document.head.contains(preloadLink)) {
        document.head.removeChild(preloadLink);
      }
    };
  }, []);

  const levelProgress = useMemo(() => getBigkasLevelFromUser(user), [user]);
  const recommendedLevel = useMemo(() => {
    const level = Number(levelProgress?.levelNumber || 1);
    if (!Number.isFinite(level)) return 1;
    return Math.max(1, Math.min(5, Math.round(level)));
  }, [levelProgress?.levelNumber]);

  useEffect(() => {
    if (!user?.id) return;
  }, [recommendedLevel, user?.id]);

  const completedTaskCount = useMemo(
    () => tasks.filter((t) => isActivityTaskCompleted(t.id, activityMetrics)).length,
    [tasks, activityMetrics],
  );

  const totalTaskXp = useMemo(
    () => tasks.reduce((sum, t) => sum + getTaskXp(t.id), 0),
    [tasks],
  );

  const earnedTaskXp = useMemo(
    () => tasks.reduce((sum, t) => sum + (isActivityTaskCompleted(t.id, activityMetrics) ? getTaskXp(t.id) : 0), 0),
    [tasks, activityMetrics],
  );

  const sidebarProgressPct = tasks.length
    ? Math.round((completedTaskCount / tasks.length) * 100)
    : 0;

  const activeDayKeys = useMemo(() => {
    const keys = new Set();
    sessions.forEach((s) => {
      if (isPreTestSession(s)) return;
      const d = getSessionDate(s);
      if (d) keys.add(getLocalDateKey(d));
    });
    activityHistory.forEach((e) => {
      if (!e?.completedAt) return;
      const k = getDayKeyFromDate(e.completedAt);
      if (k) keys.add(k);
    });
    return keys;
  }, [sessions, activityHistory]);

  const streakStats = useMemo(() => buildStreakStats(sessions, activityHistory), [sessions, activityHistory]);
  const weekPills = useMemo(() => getWeekdayPills(activeDayKeys), [activeDayKeys]);
  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const heroRobotImage = useMemo(() => {
    if (timeOfDay === 'morning') return robotMorningImage;
    if (timeOfDay === 'noon') return robotNoonImage;
    return robotNightImage;
  }, [timeOfDay]);
  const rankSpriteImage = useMemo(
    () => getRankSprite(levelProgress?.levelNumber, levelProgress?.levelName),
    [levelProgress?.levelNumber, levelProgress?.levelName],
  );

  useEffect(() => {
    if (!user?.id || activitiesLoading) return undefined;
    let cancelled = false;
    (async () => {
      try {
        await ensureJourneyStarted(user.id);
        if (!cancelled) await refreshJourney();
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, activitiesLoading, refreshJourney]);

  const taskState = useMemo(() => {
    return tasks.reduce((state, task) => {
      state[task.id] = isActivityTaskCompleted(task.id, activityMetrics);
      return state;
    }, {});
  }, [tasks, activityMetrics]);

  const taskProgress = useMemo(() => {
    return tasks.reduce((state, task) => {
      state[task.id] = getActivityTaskProgress(task.id, activityMetrics);
      return state;
    }, {});
  }, [tasks, activityMetrics]);

  const taskUnlockState = useMemo(() => {
    return tasks.reduce((state, task) => {
      const prerequisites = Array.isArray(task.prerequisiteIds) ? task.prerequisiteIds : [];
      const isUnlocked = prerequisites.every((prerequisiteId) => taskState[prerequisiteId] === true);
      state[task.id] = isUnlocked;
      return state;
    }, {});
  }, [taskState, tasks]);

  const taskTitleById = useMemo(() => tasks.reduce((acc, task) => {
    acc[task.id] = String(task.title || '').trim();
    return acc;
  }, {}), [tasks]);

  // Automatic Tutorial Trigger
  useEffect(() => {
    if (!user?.id || activitiesLoading) return;
    
    // Condition: finished profiling AND pre-testing
    const isReadyForTutorial = 
      user.onboardingStage === 'completed' || 
      (user.profilingCompleted && user.pretestCompleted) ||
      (user.isProfilingCompleted && user.isPreTestCompleted);
    
    if (isReadyForTutorial) {
      const localSeen = window.localStorage.getItem(FREE_SPEECH_TUTORIAL_SEEN_KEY);
      const remoteSeen = !!user.dashboardTutorialSeen;

      if (localSeen !== '1' && !remoteSeen) {
        setShowFreeSpeechTutorial(true);
      }
    }
  }, [user?.id, user?.onboardingStage, user?.profilingCompleted, user?.pretestCompleted, user?.isProfilingCompleted, user?.isPreTestCompleted, user?.dashboardTutorialSeen, activitiesLoading]);

  useEffect(() => {
    if (location.state?.launchFreeSpeechTutorial !== true) return undefined;
    
    // Explicitly reset the seen flag if we're coming from the onboarding reveal
    window.localStorage.setItem(FREE_SPEECH_TUTORIAL_SEEN_KEY, '0');
    setShowFreeSpeechTutorial(true);

    const t = setTimeout(() => {
      navigate(location.pathname, {
        replace: true,
        state: { ...(location.state || {}), launchFreeSpeechTutorial: false },
      });
    }, 100);

    return () => clearTimeout(t);
  }, [location.pathname, location.state, navigate, FREE_SPEECH_TUTORIAL_SEEN_KEY]);

  const handleActiveTaskIdChange = useCallback((id) => {
    setActiveTaskId(id);
    if (user?.id) {
      updateJourneyCurrentActivity(user.id, id ?? null).catch(() => {});
    }
  }, [user?.id]);

  const handleTaskAction = useCallback((task) => {
    navigate(`${ROUTES.TRAINING}?autostart=1`, {
      state: {
        freeTopic: task.title,
        objective: task.objective || task.detail,
        focus: 'free',
        sessionType: 'training',
        entryPoint: 'activity',
        autoStartCountdown: true,
        fromActivityTaskId: task.id,
        step: task,
      },
    });
  }, [navigate]);

  const handleRandomizerClick = useCallback(() => {
    setShowRandomizerOverlay(true);
  }, []);

  const handleCloseRandomizerOverlay = useCallback(() => {
    setShowRandomizerOverlay(false);
  }, []);

  const handleRandomizeTopic = useCallback(() => {
    if (!RANDOM_TOPICS.length) return;
    setRandomizerTopic((current) => {
      if (RANDOM_TOPICS.length === 1) return RANDOM_TOPICS[0];
      let next = current;
      while (next?.title === current?.title) {
        next = RANDOM_TOPICS[Math.floor(Math.random() * RANDOM_TOPICS.length)];
      }
      return next;
    });
  }, []);

  const handleStartRandomizerTopic = useCallback(() => {
    if (!randomizerTopic?.title) return;
    navigate(`${ROUTES.TRAINING}?autostart=1`, {
      state: {
        freeTopic: randomizerTopic.title,
        freeSpeechContext: randomizerTopic.body || '',
        focus: 'free',
        sessionType: 'practice',
        entryPoint: 'practice',
        autoStartCountdown: true,
      },
    });
  }, [navigate, randomizerTopic]);

  const handleFreeSpeechClick = useCallback(() => {
    setShowFreeSpeechOverlay(true);
  }, []);

  const handleCloseFreeSpeechOverlay = useCallback(() => {
    setShowFreeSpeechOverlay(false);
    setFreeSpeechDraftTopic('');
  }, []);

  const handleStartFreeSpeechOverlay = useCallback(() => {
    const topic = freeSpeechDraftTopic.trim();
    if (!topic) return;
    navigate(`${ROUTES.TRAINING}?autostart=1`, {
      state: {
        focus: 'free',
        freeTopic: topic,
        sessionType: 'practice',
        entryPoint: 'practice',
        autoStartCountdown: true,
      },
    });
  }, [freeSpeechDraftTopic, navigate]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (showRandomizerOverlay || showFreeSpeechOverlay) {
      document.body.classList.add('randomizer-overlay-open');
    } else {
      document.body.classList.remove('randomizer-overlay-open');
    }
    return () => document.body.classList.remove('randomizer-overlay-open');
  }, [showRandomizerOverlay, showFreeSpeechOverlay]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (showFreeSpeechTutorial) {
      document.body.classList.add('activity-tutorial-open');
    } else {
      document.body.classList.remove('activity-tutorial-open');
    }
    return () => document.body.classList.remove('activity-tutorial-open');
  }, [showFreeSpeechTutorial]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (showDashboardOverlay) {
      document.body.classList.add('dashboard-overlay-open');
    } else {
      document.body.classList.remove('dashboard-overlay-open');
    }
    return () => document.body.classList.remove('dashboard-overlay-open');
  }, [showDashboardOverlay]);

  const handleTutorialFinish = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FREE_SPEECH_TUTORIAL_SEEN_KEY, '1');
    }

    // Persist to database so it doesn't show again on other devices
    if (user?.id) {
      updateUserMetadata({ dashboard_tutorial_seen: true }).catch(() => {});
    }
  }, [user?.id, updateUserMetadata]);

  const renderTaskCardForShell = useCallback(({ task, animationClass = '' }) => {
    const done = taskState[task.id] === true;
    const isUnlocked = taskUnlockState[task.id] === true;
    const isLocked = !done && !isUnlocked;
    const shouldAnimateStamp = done && recentStampedTaskId === task.id;
    const progress = taskProgress[task.id] || { current: 0, target: 1 };
    const canShowProgress = !isLocked && progress.target > 1;
    const progressPctForTask = Math.max(0, Math.min(100, Math.round((progress.current / progress.target) * 100)));
    const clampedProgressCurrent = Math.min(progress.current, progress.target);
    const ctaLabel = done
      ? 'Completed'
      : isLocked
        ? 'Locked'
        : progress.current > 0
          ? `Continue ${clampedProgressCurrent}/${progress.target}`
          : 'Start';
    const w = task.weights || {};
    const weightsLine = [w.vis, w.voc, w.ver].some((n) => Number.isFinite(n))
      ? `VVV weights — Visual ${Math.round(Number(w.vis) * 100)}% · Vocal ${Math.round(Number(w.voc) * 100)}% · Verbal ${Math.round(Number(w.ver) * 100)}%`
      : null;

    return (
      <div key={task.id} className={`page-card activity-task-card${done ? ' done' : ''}${isLocked ? ' locked' : ''} ${animationClass}`.trim()}>
        <div className="activity-task-top">
          <div className="activity-task-heading">
            <span className={`activity-task-name${done ? ' done' : ''}`}>{task.title}</span>
            {done ? (
              <span className={`activity-task-done-stamp${shouldAnimateStamp ? ' popping' : ''}`}>DONE</span>
            ) : null}
          </div>
          <span className="activity-task-xp">+ {getTaskXp(task.id)} EXP</span>
        </div>

        <p className="activity-task-detail">{task.objective || task.detail}</p>
        {weightsLine ? <p className="activity-task-detail" style={{ opacity: 0.85, fontSize: '0.9em' }}>{weightsLine}</p> : null}

        {isLocked ? (
          <p className="activity-task-lock-note">Finish previous activities first to unlock this step.</p>
        ) : null}

        <div className="activity-task-actions">
          <button
            type="button"
            className={`activity-action-btn${isLocked ? ' is-locked' : ''}${canShowProgress ? ' with-progress' : ''}`}
            onClick={() => handleTaskAction(task)}
            disabled={isLocked || done}
          >
            {canShowProgress ? (
              <span className="activity-action-progress-fill" style={{ width: `${progressPctForTask}%` }} />
            ) : null}
            <span className="activity-action-btn-text">{ctaLabel}</span>
          </button>
        </div>
      </div>
    );
  }, [taskState, taskUnlockState, taskProgress, recentStampedTaskId, handleTaskAction]);

  return (
    <div className="activity-page-mobile-root activity-page--skyward-entrance">
      <TutorialOverlay
        isOpen={showFreeSpeechTutorial}
        steps={FREE_SPEECH_TUTORIAL_STEPS}
        showAudioToggle
        onClose={() => setShowFreeSpeechTutorial(false)}
        onFinish={handleTutorialFinish}
      />
      {showCompletionCelebration && (
        <Confetti
          width={viewportSize.width}
          height={viewportSize.height}
          recycle
          numberOfPieces={280}
          gravity={0.24}
        />
      )}
      {showCompletionCelebration && (
        <div className="activity-clear-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="activity-clear-modal-title">
          <div className="activity-clear-modal">
            <h3 id="activity-clear-modal-title" className="activity-clear-modal-title">
              Congratulations, you've cleared: {completionModalTaskTitle || 'This stage'}
            </h3>
            <PushButton
              className="activity-clear-modal-continue-btn"
              bgColor="#2d5a27"
              shadowColor="#1a3b16"
              textColor="#ffffff"
              onClick={() => {
                setShowCompletionCelebration(false);
                setCompletionModalTaskTitle('');
              }}
            >
              Continue
            </PushButton>
          </div>
        </div>
      )}

      {showRandomizerOverlay && (
        <section className="randomizer-overlay-wrapper" aria-label="Randomizer overlay">
          <div className="bigkas-modal-scrim" aria-hidden="true" onClick={handleCloseRandomizerOverlay} />
          <div className="randomizer-overlay-content">
            <div className="randomizer-overlay-card">
              <div className="randomizer-overlay-card-top">
                <h2 className="randomizer-overlay-title">Randomizer</h2>
                <button
                  type="button"
                  className="randomizer-overlay-close-btn"
                  onClick={handleCloseRandomizerOverlay}
                  aria-label="Close randomizer overlay"
                >
                  ×
                </button>
              </div>
              <p className="randomizer-overlay-copy">
                <span className="randomizer-overlay-copy-kicker">B-01:</span>
                Ready to put your skills to the test? Click the 'Generate' button for a random topic, and whenever you're ready, hit 'Start' to begin your speaking practice!
              </p>
              <p className="randomizer-overlay-topic">
                <span className="randomizer-overlay-topic-label">Topic:</span>
                {' '}
                {randomizerTopic?.title || RANDOMIZER_DEFAULT_TOPIC}
              </p>
              <div className="randomizer-overlay-actions">
                <Button
                  variant="practice"
                  className="randomizer-overlay-randomize-btn"
                  onClick={handleRandomizeTopic}
                >
                  Randomize Topic
                </Button>
                <Button
                  variant="practice"
                  className="randomizer-overlay-start-btn"
                  onClick={handleStartRandomizerTopic}
                >
                  Start
                </Button>
              </div>
            </div>
            <div className="randomizer-overlay-robot-wrap">
              <img
                src={randomizerRobotImage}
                alt=""
                className="randomizer-overlay-robot"
                aria-hidden="true"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </div>
        </section>
      )}
      {showFreeSpeechOverlay && (
        <section className="randomizer-overlay-wrapper" aria-label="Free speech overlay">
          <div className="bigkas-modal-scrim" aria-hidden="true" onClick={handleCloseFreeSpeechOverlay} />
          <div className="randomizer-overlay-content">
            <div className="randomizer-overlay-card free-speech-overlay-card">
              <div className="randomizer-overlay-card-top">
                <h2 className="randomizer-overlay-title">Free Speech</h2>
                <button
                  type="button"
                  className="randomizer-overlay-close-btn"
                  onClick={handleCloseFreeSpeechOverlay}
                  aria-label="Close free speech overlay"
                >
                  ×
                </button>
              </div>
              <p className="randomizer-overlay-copy">
                <span className="randomizer-overlay-copy-kicker">B-01:</span>
                In this mode, you have the freedom to speak about any topic of your choice. When you're ready, just hit the 'Start' button and let your words flow!
              </p>
              <label className="randomizer-overlay-topic free-speech-overlay-topic-input-wrap">
                <span className="randomizer-overlay-topic-label">Your Topic:</span>
                <textarea
                  className="free-speech-overlay-topic-input"
                  rows={3}
                  placeholder="Type what you will be speaking about..."
                  value={freeSpeechDraftTopic}
                  onChange={(event) => setFreeSpeechDraftTopic(event.target.value)}
                />
              </label>
              <div className="randomizer-overlay-actions free-speech-overlay-actions">
                <Button
                  variant="practice"
                  className="randomizer-overlay-start-btn free-speech-overlay-start-btn"
                  onClick={handleStartFreeSpeechOverlay}
                  disabled={!freeSpeechDraftTopic.trim()}
                >
                  Start
                </Button>
              </div>
            </div>
            <div className="randomizer-overlay-robot-wrap">
              <img
                src={randomizerRobotImage}
                alt=""
                className="randomizer-overlay-robot"
                aria-hidden="true"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </div>
        </section>
      )}

      <div className="activity-mobile-top-strip">
        <div className="activity-mobile-banner-left" id="tutorial-target-home-banner" aria-label="Coach message">
          <img src={heroRobotImage} alt="" className="activity-mobile-banner-robot" />
          <div className="activity-mobile-banner-bubble">
            <p className="activity-mobile-banner-kicker">B-01:</p>
            <p className="activity-mobile-banner-copy">
              You're on a roll. Keep doing your activities and improve your speaking.
            </p>
          </div>
        </div>
      </div>

      <div className="activity-mobile-journey-container" id="tutorial-target-home-journey">
        <SkywardJourneyShell
          initialLevel={recommendedLevel}
          recommendedLevel={recommendedLevel}
          entranceFromNav={entranceFromNav}
          scrollToStepIndex={null}
          renderTaskCard={renderTaskCardForShell}
          onActiveTaskIdChange={handleActiveTaskIdChange}
        />
      </div>

      <div className={`activity-mobile-dashboard-section${(showDashboardOverlay || showRandomizerOverlay || showFreeSpeechOverlay) ? ' is-hidden' : ''}`}>
        <Button 
          variant="practice" 
          className="activity-mobile-dashboard-btn"
          onClick={() => setShowDashboardOverlay(true)}
        >
          Dashboard
        </Button>
      </div>

      {showDashboardOverlay && (
        <section className="dashboard-overlay-wrapper" aria-label="Dashboard overlay">
          <div className="bigkas-modal-scrim" aria-hidden="true" onClick={() => setShowDashboardOverlay(false)} />
          <div className="dashboard-overlay-content no-scrollbar">
            <div className="dashboard-overlay-header">
              <h2 className="dashboard-overlay-title">Dashboard</h2>
              <button
                type="button"
                className="dashboard-overlay-close-btn"
                onClick={() => setShowDashboardOverlay(false)}
                aria-label="Close dashboard"
              >
                ×
              </button>
            </div>

            <div className="dashboard-overlay-scroll-content">
              {/* Streak Widget */}
              <div 
                className="new-banner-streak" 
                id="tutorial-target-home-streak" 
                aria-label="Daily streak"
                onClick={() => {
                  setShowDashboardOverlay(false);
                  setIsStreakModalOpen(true);
                }}
              >
                <div className="new-streak-top">
                  <div className="new-streak-fire">
                    <Lottie animationData={fireAnimationData} loop={true} />
                  </div>
                  <div className="new-streak-headline">
                    <div className="new-streak-value">{streakStats.currentStreak}</div>
                    <p className="new-streak-label">day streak</p>
                  </div>
                </div>
                <div className="new-streak-week" aria-label="This week streak activity">
                  {weekPills.map((pill, idx) => (
                    <span
                      key={`${pill.label}-${idx}`}
                      className={`new-streak-pill${pill.active ? ' is-active' : ''}${pill.isToday ? ' is-today' : ''}`}
                    >
                      {pill.label}
                    </span>
                  ))}
                </div>
                <p className="new-streak-copy">Build a daily speaking habit to keep stacking your streak.</p>
              </div>

              {/* Rank Widget */}
              <section className="new-widget" id="tutorial-target-home-rank">
                <div className="new-widget-head">
                  <h2 className="new-widget-title">Journey Progression</h2>
                  <span className="new-widget-chip">Level</span>
                </div>
                <div 
                  className="new-widget-rank-card"
                  onClick={() => {
                    setShowDashboardOverlay(false);
                    setIsRankModalOpen(true);
                  }}
                >
                  <img src={rankSpriteImage} alt="" className="new-widget-rank-sprite" />
                  <div className="new-widget-rank-content">
                    <p className="new-widget-kicker">Current Level</p>
                    <p className="new-widget-value">LEVEL {levelProgress.levelNumber}</p>
                  </div>
                </div>
                <p className="new-widget-caption">
                  {completedTaskCount}/{Math.max(tasks.length, 1)} Tasks Complete
                  <span className="new-widget-caption-sep"> - </span>
                  {sidebarProgressPct}% Cleared
                </p>
              </section>

              {/* Practice Widget */}
              <section className="new-widget new-widget--practice" id="tutorial-target-home-practice">
                <div className="new-widget-head">
                  <h2 className="new-widget-title">Practice</h2>
                </div>
                <p className="new-practice-subtitle">Choose a mode and jump straight into speaking.</p>

                <div className="new-btn-group">
                  <div 
                    className="new-btn-row--card"
                    onClick={() => {
                      setShowDashboardOverlay(false);
                      handleRandomizerClick();
                    }}
                  >
                    <div className="new-btn-visual new-btn-visual--randomizer">
                      <img src={crystalBallImage} alt="" className="new-btn-visual-img new-btn-visual-img--randomizer" />
                    </div>
                    <div className="new-btn-meta">
                      <p className="new-btn-kicker" style={{ color: '#7c3aed' }}>Mode</p>
                      <p className="new-btn-label">Randomizer</p>
                      <p className="new-btn-hint">Instant prompt to warm up.</p>
                    </div>
                  </div>
                  
                  <div 
                    className="new-btn-row--card"
                    onClick={() => {
                      setShowDashboardOverlay(false);
                      handleFreeSpeechClick();
                    }}
                  >
                    <div className="new-btn-visual new-btn-visual--speech">
                      <img src={crownImage} alt="" className="new-btn-visual-img" />
                    </div>
                    <div className="new-btn-meta">
                      <p className="new-btn-kicker" style={{ color: '#f59e0b' }}>Mode</p>
                      <p className="new-btn-label">Free Speech</p>
                      <p className="new-btn-hint">Open topic confidence building.</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>
      )}

      <StreakCalendarModal
        isOpen={isStreakModalOpen}
        onClose={() => setIsStreakModalOpen(false)}
        activeDayKeys={activeDayKeys}
        streakStats={streakStats}
      />

      <RankListModal
        isOpen={isRankModalOpen}
        onClose={() => setIsRankModalOpen(false)}
        currentLevelNumber={levelProgress.levelNumber}
      />
    </div>
  );
}

export default ActivityPageMobile;

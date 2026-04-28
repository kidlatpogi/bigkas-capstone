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
import { useJourneyRemoteState } from '../../hooks/useJourneyRemoteState';
import { ensureJourneyStarted, updateJourneyCurrentActivity } from '../../services/journeyProgressService';
import { RANDOM_TOPICS } from '../../utils/practiceData';
import iconFire from '../../assets/icons/Icon-Fire.svg';
import robotMorningImage from '../../assets/Sprites/Robot/0018.webp';
import robotNoonImage from '../../assets/Sprites/Robot/0001.webp';
import robotNightImage from '../../assets/Sprites/Robot/0013.webp';
import tutorialRobotStep1 from '../../assets/Sprites/Robot/0001.webp';
import tutorialRobotStep2 from '../../assets/Sprites/Robot/0010.webp';
import tutorialRobotStep3 from '../../assets/Sprites/Robot/0018.webp';
import tutorialRobotStep4 from '../../assets/Sprites/Robot/0001.webp';
import tutorialRobotStep5 from '../../assets/Sprites/Robot/0002.webp';
import tutorialRobotStep6 from '../../assets/Sprites/Robot/0004.webp';
import randomizerRobotImage from '../../assets/Sprites/Robot/0005.webp';
import rankBronzeImage from '../../assets/Sprites/Rank/rank-bronze.png';
import rankSilverImage from '../../assets/Sprites/Rank/rank-silver.png';
import rankGoldImage from '../../assets/Sprites/Rank/rank-gold.png';
import rankMythrilImage from '../../assets/Sprites/Rank/rank-mythril.png';
import rankLegendaryImage from '../../assets/Sprites/Rank/rank-legendary.png';
import crystalBallImage from '../../assets/Sprites/common/crystal-ball.png';
import crownImage from '../../assets/Sprites/common/crown.png';
import fireAnimationData from '../../assets/Sprites/common/fire.json';
import './InnerPages.css';
import './ActivityPage.css';

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
    button: 'Next',
    targetElementId: 'tutorial-target-home-journey',
    text: 'This path is your customized learning roadmap! You will start at your first stage and unlock the next ones as you move forward. The activities gradually become more challenging, and once you complete all tasks on your path, you unlock a final Post-test challenge to advance.',
  },
  {
    id: 'step-practice',
    title: 'B-01:',
    robot: tutorialRobotStep6,
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
  const activeDays = [...dayIndexes].sort((a, b) => a - b);
  if (!activeDays.length) return { currentStreak: 0 };
  const todayIndex = getLocalDayIndex(new Date());
  const last = activeDays[activeDays.length - 1];
  let currentStreak = 0;
  if (todayIndex - last <= 1) {
    const set = new Set(activeDays);
    let cursor = last;
    while (set.has(cursor)) { currentStreak += 1; cursor -= 1; }
  }
  return { currentStreak };
}

function getWeekdayPills(activeDayKeys = new Set()) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  const day = start.getDay();
  start.setDate(start.getDate() - day); // Sunday-first week
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i],
      active: activeDayKeys.has(getLocalDateKey(d)),
      isToday: getLocalDateKey(d) === getLocalDateKey(today),
    };
  });
}

function getTimeOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'noon';
  return 'night';
}

function getRankSprite(levelNumber, levelName = '') {
  const numeric = Number(levelNumber);
  if (numeric === 1) return rankBronzeImage;
  if (numeric === 2) return rankSilverImage;
  if (numeric === 3) return rankGoldImage;
  if (numeric === 4) return rankMythrilImage;
  if (numeric >= 5) return rankLegendaryImage;

  const normalized = String(levelName).toLowerCase();
  if (normalized.includes('bronze')) return rankBronzeImage;
  if (normalized.includes('silver')) return rankSilverImage;
  if (normalized.includes('gold')) return rankGoldImage;
  if (normalized.includes('mythril')) return rankMythrilImage;
  if (normalized.includes('legend')) return rankLegendaryImage;
  return rankBronzeImage;
}

function ActivityPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1025px)').matches,
  );
  const [entranceFromNav] = useState(() => location.state?.skywardEntrance === true);
  const scopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;
  /** Activities are filtered by `target_level` = Bigkas rank (same as dashboard `levelProgress.levelName`). */
  const { tasks, loading: activitiesLoading, error: activitiesError } = useActivitiesJourneyTasks(1);
  const { metricsSyncKey, refreshJourney } = useJourneyRemoteState(user);
  const stampResetTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const previousTaskStateRef = useRef({});
  const hasTaskStateHydratedRef = useRef(false);

  const [recentStampedTaskId, setRecentStampedTaskId] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);
  const [completionModalTaskTitle, setCompletionModalTaskTitle] = useState('');
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));
  const [showFreeSpeechTutorial, setShowFreeSpeechTutorial] = useState(false);
  const [showFreeSpeechOverlay, setShowFreeSpeechOverlay] = useState(false);
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [freeSpeechDraftTopic, setFreeSpeechDraftTopic] = useState('');
  const [showRandomizerOverlay, setShowRandomizerOverlay] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [randomizerTopic, setRandomizerTopic] = useState(() => {
    const defaultTopic = RANDOM_TOPICS.find((entry) => entry.title === RANDOMIZER_DEFAULT_TOPIC);
    return defaultTopic || { title: RANDOMIZER_DEFAULT_TOPIC, body: '' };
  });
  const { sessions, fetchAllSessions } = useSessions();
  const activityMetrics = useMemo(
    () => getActivityMetrics(scopeKey),
    [scopeKey, metricsSyncKey],
  );
  const activityHistory = useMemo(
    () => (user?.id ? getActivityCompletionHistory(scopeKey) : []),
    [scopeKey, user?.id, metricsSyncKey],
  );

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
    fetchAllSessions?.();
  }, [fetchAllSessions, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = () => {
      setShowDesktopSidebar(window.matchMedia('(min-width: 1025px)').matches);
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
    // No longer sets selectedLevel here — shell handles it
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
    const isReadyForTutorial = user.profilingCompleted && user.pretestCompleted;
    
    if (isReadyForTutorial) {
      const seen = window.localStorage.getItem(FREE_SPEECH_TUTORIAL_SEEN_KEY);
      if (seen !== '1') {
        setShowFreeSpeechTutorial(true);
      }
    }
  }, [user?.id, user?.profilingCompleted, user?.pretestCompleted, activitiesLoading]);

  const handleActiveTaskIdChange = useCallback((id) => {
    setActiveTaskId(id);
    if (user?.id) {
      updateJourneyCurrentActivity(user.id, id ?? null).catch(() => {});
    }
  }, [user?.id]);

  const playCompletionSound = useCallback(() => {
    if (typeof window === 'undefined') return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContextClass();
    }

    const audioCtx = audioContextRef.current;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.24);
  }, []);

  const maybeShowCompletionCelebration = useCallback((titleFallback = 'This activity') => {
    if (typeof window === 'undefined') return;
    setCompletionModalTaskTitle(String(titleFallback || 'This activity'));
    setShowCompletionCelebration(true);
    playCompletionSound();
  }, [playCompletionSound]);

  useEffect(() => {
    if (!hasTaskStateHydratedRef.current) {
      previousTaskStateRef.current = taskState;
      hasTaskStateHydratedRef.current = true;
      return;
    }

    const newlyCompletedTask = tasks.find((task) => {
      const wasDone = previousTaskStateRef.current[task.id] === true;
      const isDoneNow = taskState[task.id] === true;
      return !wasDone && isDoneNow;
    });

    previousTaskStateRef.current = taskState;
    if (!newlyCompletedTask) return;

    setRecentStampedTaskId(newlyCompletedTask.id);
    addClaimableAchievement({
      id: newlyCompletedTask.id,
      title: newlyCompletedTask.title || 'Activity achievement',
      source: 'activity-task',
      createdAt: Date.now(),
    });

    if (stampResetTimeoutRef.current) {
      window.clearTimeout(stampResetTimeoutRef.current);
    }

    stampResetTimeoutRef.current = window.setTimeout(() => {
      setRecentStampedTaskId((current) => (current === newlyCompletedTask.id ? null : current));
    }, 700);
  }, [taskState, tasks]);

  useEffect(() => {
    if (typeof window === 'undefined' || !tasks.length) return;
    const raw = window.sessionStorage.getItem(ACTIVITY_CELEBRATION_STORAGE_KEY);
    if (!raw) return;

    try {
      const payload = JSON.parse(raw);
      const activityId = String(payload?.activityId || '').trim();
      const activityTitleFromPayload = String(payload?.activityTitle || '').trim();
      const completedAt = Number(payload?.completedAt || 0);
      const eventKey = `${activityId}:${Number.isFinite(completedAt) ? completedAt : 0}`;
      if (!activityId) {
        window.sessionStorage.removeItem(ACTIVITY_CELEBRATION_STORAGE_KEY);
        return;
      }
      if (taskState[activityId] !== true) {
        return;
      }
      const lastShown = window.sessionStorage.getItem(LAST_SHOWN_COMPLETION_EVENT_KEY);
      if (lastShown === eventKey) {
        window.sessionStorage.removeItem(ACTIVITY_CELEBRATION_STORAGE_KEY);
        return;
      }

      setRecentStampedTaskId(activityId);
      maybeShowCompletionCelebration(
        activityTitleFromPayload || taskTitleById[activityId] || 'This activity',
      );
      window.sessionStorage.setItem(LAST_SHOWN_COMPLETION_EVENT_KEY, eventKey);
      window.sessionStorage.removeItem(ACTIVITY_CELEBRATION_STORAGE_KEY);
    } catch {
      window.sessionStorage.removeItem(ACTIVITY_CELEBRATION_STORAGE_KEY);
    }
  }, [maybeShowCompletionCelebration, taskState, taskTitleById, tasks.length]);

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

  const totalStages = tasks.length;

  const scrollToStepIndex = useMemo(() => {
    if (location.state?.focusCurrentStage !== true || !totalStages) return null;
    const activeId = activeTaskId;
    const idx = tasks.findIndex((t) => t.id === activeId);
    return idx >= 0 ? idx : 0;
  }, [location.state?.focusCurrentStage, tasks, totalStages, activeTaskId]);

  useEffect(() => {
    if (location.state?.focusCurrentStage !== true) return undefined;
    const t = window.setTimeout(() => {
      navigate(location.pathname, {
        replace: true,
        state: { ...(location.state || {}), focusCurrentStage: false },
      });
    }, 800);
    return () => window.clearTimeout(t);
  }, [location.pathname, location.state?.focusCurrentStage, navigate]);

  useEffect(() => {
    if (location.state?.launchFreeSpeechTutorial !== true) return;
    setShowFreeSpeechTutorial(true);
    navigate(location.pathname, {
      replace: true,
      state: { ...(location.state || {}), launchFreeSpeechTutorial: false },
    });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (showFreeSpeechTutorial) {
      document.body.classList.add('activity-tutorial-open');
    } else {
      document.body.classList.remove('activity-tutorial-open');
    }
    return () => document.body.classList.remove('activity-tutorial-open');
  }, [showFreeSpeechTutorial]);

  const launchFreeSpeechSession = useCallback(() => {
    navigate(ROUTES.TRAINING_SETUP);
  }, [navigate]);

  const handleFreeSpeechClick = useCallback(() => {
    setShowFreeSpeechOverlay(true);
  }, []);

  const handleTutorialFinish = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FREE_SPEECH_TUTORIAL_SEEN_KEY, '1');
    }
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

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (showRandomizerOverlay || showFreeSpeechOverlay) {
      document.body.classList.add('randomizer-overlay-open');
    } else {
      document.body.classList.remove('randomizer-overlay-open');
    }
    return () => document.body.classList.remove('randomizer-overlay-open');
  }, [showRandomizerOverlay, showFreeSpeechOverlay]);

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

  const renderTaskCard = ({ task, historyEntry = null, animationClass = '' }) => {
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
    const completedDateText = historyEntry?.completedAt
      ? new Date(historyEntry.completedAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      : null;

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

        {completedDateText ? <p className="activity-task-history-meta">Completed {completedDateText}</p> : null}

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
  };

  if (activitiesLoading) {
    return (
      <div className="activity-page-root">
        <div className="activity-content-wrap" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="section-label">Loading journey…</p>
        </div>
      </div>
    );
  }

  if (activitiesError) {
    return (
      <div className="activity-page-root">
        <div className="activity-content-wrap" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="activity-task-lock-note">Could not load activities: {activitiesError}</p>
          <p className="activity-task-detail">Ensure the `activities` table exists and RLS allows read for authenticated users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-page-root activity-page--skyward-entrance">
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
          <div className="bigkas-modal-scrim" style={{ '--scrim-z': 1 }} aria-hidden="true" onClick={handleCloseRandomizerOverlay} />
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
          <div className="bigkas-modal-scrim" style={{ '--scrim-z': 1 }} aria-hidden="true" onClick={handleCloseFreeSpeechOverlay} />
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

      <div className="activity-page-grid">
        {/* Banner */}
        <section className="new-banner dashboard-anim-top dashboard-anim-delay-2">
           <div className="new-banner-left" id="tutorial-target-home-banner">
              <img src={heroRobotImage} alt="" className="new-banner-robot" />
              <div className="new-banner-bubble" aria-label="Coach message">
                <p className="new-banner-kicker">B-01:</p>
                <p className="new-banner-copy">You're on a roll. Keep doing your activities and improve your speaking.</p>
              </div>
           </div>
           <div className="new-banner-right">
              <div 
                className="new-banner-streak" 
                id="tutorial-target-home-streak" 
                aria-label="Daily streak"
                onClick={() => setIsStreakModalOpen(true)}
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
           </div>
        </section>

        {/* Left Column (Journey Shell) */}
        <div className="new-left-col" id="tutorial-target-home-journey">
          <div className="new-left-col-inner">
             <SkywardJourneyShell
               initialLevel={recommendedLevel}
               recommendedLevel={recommendedLevel}
               entranceFromNav={entranceFromNav}
               scrollToStepIndex={scrollToStepIndex}
               renderTaskCard={renderTaskCardForShell}
               onActiveTaskIdChange={handleActiveTaskIdChange}
             />
          </div>
        </div>

        {/* Right Column (Widgets) */}
        <div className="new-right-col no-scrollbar">
            <section className="new-widget dashboard-anim-left dashboard-anim-delay-2" id="tutorial-target-home-rank">
              <div className="new-widget-head">
                <h2 className="new-widget-title">Journey Progression</h2>
                <span className="new-widget-chip">Rank</span>
              </div>
              <div 
                className="new-widget-rank-card"
                onClick={() => setIsRankModalOpen(true)}
              >
                <img src={rankSpriteImage} alt="" className="new-widget-rank-sprite" />
                <div className="new-widget-rank-content">
                  <p className="new-widget-kicker">Current Rank</p>
                  <p className="new-widget-value">{levelProgress.levelName}</p>
                </div>
              </div>
              <p className="new-widget-caption">
                {completedTaskCount}/{Math.max(tasks.length, 1)} Tasks Complete
                <span className="new-widget-caption-sep"> - </span>
                {sidebarProgressPct}% Cleared
              </p>
            </section>

            <section className="new-widget new-widget--practice dashboard-anim-bottom dashboard-anim-delay-4" id="tutorial-target-home-practice">
              <div className="new-widget-head">
                <h2 className="new-widget-title">Practice</h2>
              </div>
              <p className="new-practice-subtitle">Choose a mode and jump straight into speaking.</p>

              <div className="new-btn-group">
                <div className="new-btn-row new-btn-row--card">
                  <div className="new-btn-visual new-btn-visual--randomizer">
                    <img src={crystalBallImage} alt="" className="new-btn-visual-img new-btn-visual-img--randomizer" />
                  </div>
                  <div className="new-btn-meta">
                    <p className="new-btn-label">
                      Randomizer
                    </p>
                    <p className="new-btn-hint">Instant prompt to warm up your delivery.</p>
                  </div>
                  <Button
                    variant="practice"
                    className="activity-practice-cta activity-practice-cta--randomizer dashboard-anim-bottom dashboard-anim-delay-5"
                    onClick={handleRandomizerClick}
                  >
                    Randomizer
                  </Button>
                </div>
                
                <div className="new-btn-row new-btn-row--card">
                  <div className="new-btn-visual new-btn-visual--speech">
                    <img src={crownImage} alt="" className="new-btn-visual-img" />
                  </div>
                  <div className="new-btn-meta">
                    <p className="new-btn-label">
                      Free Speech
                    </p>
                    <p className="new-btn-hint">Open topic mode for confidence building.</p>
                  </div>
                  <Button
                    variant="training"
                    className="activity-practice-cta activity-practice-cta--speech dashboard-anim-bottom dashboard-anim-delay-6"
                    onClick={handleFreeSpeechClick}
                  >
                    Free Speech
                  </Button>
                </div>
              </div>
            </section>
          </div>


      </div>
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

export default ActivityPage;

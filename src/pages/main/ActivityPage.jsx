import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import Lottie from 'lottie-react';
import { useAuthContext } from '../../context/useAuthContext';
import { useSessions } from '../../hooks/useSessions';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/common/Button';
import PushButton from '../../components/common/PushButton';
import { IoChatbubbleEllipsesOutline, IoSend, IoFlame, IoTrophyOutline } from 'react-icons/io5';
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
import SkywardJourneyShell from '../../components/journey/SkywardJourneyShell';
import StreakCalendarModal from '../../components/main/StreakCalendarModal';
import RankListModal from '../../components/main/RankListModal';
import { useActivitiesJourneyTasks } from '../../hooks/useActivitiesJourneyTasks';
import { useJourneyRemoteState } from '../../hooks/useJourneyRemoteState';
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
const rankBronzeImage = getSpriteUrl('Rank/rank-bronze.png');
const rankSilverImage = getSpriteUrl('Rank/rank-silver.png');
const rankGoldImage = getSpriteUrl('Rank/rank-gold.png');
const rankMythrilImage = getSpriteUrl('Rank/rank-mythril.png');
const rankLegendaryImage = getSpriteUrl('Rank/rank-legendary.png');
const crystalBallImage = getSpriteUrl('common/crystal-ball.png');
const crownImage = getSpriteUrl('common/crown.png');
import b01ChatHead from '../../assets/logos/0015.png';
import fireAnimationData from '../../assets/Lottie/fire.json';
import './InnerPages.css';
import './ActivityPage.css';

const DAY_MS = 86_400_000;
const ACTIVITY_CELEBRATION_STORAGE_KEY = 'bigkas_pending_activity_celebration_v1';
const LAST_SHOWN_COMPLETION_EVENT_KEY = 'bigkas_last_completion_event_v1';
const FREE_SPEECH_TUTORIAL_SEEN_KEY = 'bigkas_free_speech_tutorial_seen_v1';
const AI_BANNER_CACHE_KEY = 'bigkas_ai_banner_cache_v1';
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

const B01_SUGGESTIONS = [
  "Summarize my progress so far",
  "How can I improve my confidence?",
  "Give me tips for vocal variety",
  "Explain my current rank and growth",
  "What should I practice next?"
];

const FREE_SPEECH_TUTORIAL_STEPS = [
  {
    id: 'step-intro',
    title: 'B-01:',
    robot: tutorialRobotStep1,
    robotClassName: 'is-activity-home-step-1',
    button: 'Next',
    targetElementId: null,
    text: "Welcome aboard! You made it, and I know you're going to do great things here. Let me give you a quick, guided tour of your Home screen so you know exactly where everything is.",
  },
  {
    id: 'step-companion',
    title: 'B-01:',
    robot: tutorialRobotStep2,
    robotClassName: 'is-activity-home-step-2',
    button: 'Next',
    targetElementId: 'tutorial-target-home-banner',
    text: "Your AI Companion—hey, that's me! See my panel right at the top? I'll be checking in with you from time to time. Depending on your progress, I'll drop by with daily greetings, personalized tips, and a little extra encouragement to keep your momentum going.",
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
  sessions.forEach((s) => {
    if (!isPreTestSession(s)) {
      const d = getSessionDate(s);
      if (d) addDate(d);
    }
  });
  historyEntries.forEach((e) => {
    if (e?.completedAt) addDate(e.completedAt);
  });
  const activeDays = [...dayIndexes].sort((a, b) => a - b);
  if (!activeDays.length) return { currentStreak: 0, canRecover: false, potentialStreak: 0, recoverySessionsToday: 0, requiredRecoveryTasks: 1 };
  
  const todayIndex = getLocalDayIndex(new Date());
  const last = activeDays[activeDays.length - 1];
  const daySet = new Set(activeDays);

  const recoverySessionsToday = sessions.filter((s) => {
    const d = getSessionDate(s);
    const entry = s?.entry_point ?? s?.entryPoint;
    const score = s?.overall_score ?? s?.score ?? s?.overallScore ?? 0;
    return d && getLocalDayIndex(d) === todayIndex && entry === 'streak-recovery' && score >= 45;
  }).length;

  // Determine potential streak and required tasks
  let potentialStreak = 0;
  if (todayIndex === last && !daySet.has(todayIndex - 1)) {
    let pCursor = todayIndex - 2;
    while (daySet.has(pCursor)) {
      potentialStreak += 1;
      pCursor -= 1;
    }
  } else if (todayIndex - last === 2) {
    let pCursor = last;
    while (daySet.has(pCursor)) {
      potentialStreak += 1;
      pCursor -= 1;
    }
  }

  const requiredRecoveryTasks = Math.min(5, Math.max(1, Math.floor((potentialStreak - 1) / 3) + 1));
  const hasFinishedRecovery = recoverySessionsToday >= requiredRecoveryTasks;

  let currentStreak = 0;
  let canRecover = false;

  if (todayIndex - last <= 1) {
    let cursor = last;
    // Current streak includes today if today is done, and incorporates the recovery if finished
    while (daySet.has(cursor) || (hasFinishedRecovery && cursor === todayIndex - 1)) {
      currentStreak += 1;
      cursor -= 1;
    }

    if (todayIndex === last && !daySet.has(todayIndex - 1) && !hasFinishedRecovery) {
      if (potentialStreak > 0) {
        canRecover = true;
      }
    }
  } else if (todayIndex - last === 2 && !hasFinishedRecovery) {
    if (potentialStreak > 0) {
      canRecover = true;
    }
  }

  return { 
    currentStreak, 
    canRecover: canRecover && potentialStreak > 0, 
    potentialStreak,
    recoverySessionsToday,
    requiredRecoveryTasks
  };
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
  const { user, updateUserMetadata } = useAuthContext();
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1025px)').matches,
  );
  const [entranceFromNav] = useState(() => location.state?.skywardEntrance === true);
  const scopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;
  /** Activities are filtered by `target_level` = Bigkas rank (same as dashboard `levelProgress.levelName`). */
  const { tasks, loading: activitiesLoading, error: activitiesError } = useActivitiesJourneyTasks(user?.speakerLevelNumber || 1);
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
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [isAskB01ModalOpen, setIsAskB01ModalOpen] = useState(false);
  const [askB01Query, setAskB01Query] = useState('');
  const [isB01Typing, setIsB01Typing] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Hello! I'm B-01, your AI speaking coach. What would you like to know about public speaking or your progress today?", id: 'initial-greeting' }
  ]);
  const chatScrollRef = useRef(null);

  const [randomizerTopic, setRandomizerTopic] = useState(null);
  const [isStreakRecoveryMode, setIsStreakRecoveryMode] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("You're on a roll. Keep doing your activities and improve your speaking.");
  const [isBannerLoading, setIsBannerLoading] = useState(false);
  const [isRandomizingTopic, setIsRandomizingTopic] = useState(false);
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
    // We always call fetchAllSessions to ensure the AI coach (B-01) has a complete context.
    // The SessionContext internal caching will prevent redundant network requests.
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

  const sessionCountsByDay = useMemo(() => {
    const counts = new Map();
    sessions.forEach((s) => {
      if (isPreTestSession(s)) return;
      const d = getSessionDate(s);
      if (d) {
        const k = getLocalDateKey(d);
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    });
    activityHistory.forEach((e) => {
      if (!e?.completedAt) return;
      const k = getDayKeyFromDate(e.completedAt);
      if (k) {
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    });
    return counts;
  }, [sessions, activityHistory]);

  const streakStats = useMemo(() => buildStreakStats(sessions, activityHistory), [sessions, activityHistory]);
  const { currentStreak, canRecover, potentialStreak, recoverySessionsToday, requiredRecoveryTasks } = streakStats;

  const getProgressContext = useCallback(() => {
    // Sort sessions by date to find the most recent ones
    const sortedSessions = [...sessions]
      .filter(s => !isPreTestSession(s)) // Exclude pre-tests for growth comparison
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const latest = sortedSessions[0];
    const first = sortedSessions[sortedSessions.length - 1];

    const latestScore = Math.floor(latest?.score || latest?.overall_score || latest?.overallScore || 0);
    const firstScore = Math.floor(first?.score || first?.overall_score || first?.overallScore || 0);
    const totalGrowth = latestScore - firstScore;

    return {
      totalSessionCount: (sessions || []).length, // Absolute count of ALL sessions
      analyzedSessionsCount: sortedSessions.length, // Count of sessions excluding pre-tests
      averageScore: activityMetrics?.averageScore || "N/A",
      currentLevel: levelProgress.levelNumber,
      levelName: levelProgress.levelName,
      
      // Pre-calculated Math for B-01 to ensure accurate summaries
      growthSummary: {
        firstSessionScore: firstScore,
        latestSessionScore: latestScore,
        totalPercentagePointGrowth: totalGrowth.toFixed(1),
        status: totalGrowth > 0 ? "Improving" : totalGrowth < 0 ? "Declining" : "Stable"
      },

      // Comparison Points
      latestSession: latest ? {
        score: latestScore,
        topic: latest.topic || latest.script_title || latest.activity_title,
        date: latest.created_at
      } : null,
      
      // Recent history (Truncated to avoid token limits, but enough for trends)
      recentTimeline: sortedSessions.slice(0, 15).map(s => ({
        date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: `${Math.floor(s.score || s.overall_score || s.overallScore || 0)}%`,
        topic: s.topic || s.script_title || s.activity_title
      }))
    };
  }, [sessions, activityMetrics, levelProgress, streakStats.currentStreak, completedTaskCount, tasks]);

  useEffect(() => {
    const fetchBannerMessage = async () => {
      if (!user?.id) return;

      // 1. Check Cache
      try {
        const cached = window.localStorage.getItem(AI_BANNER_CACHE_KEY);
        if (cached) {
          const { message, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < EIGHT_HOURS_MS) {
            setBannerMessage(message);
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to read banner cache', e);
      }

      // 2. Fetch New if expired or missing
      setIsBannerLoading(true);
      try {
        const response = await fetch('https://b01-ai-worker.dzeref4000.workers.dev/banner-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: getProgressContext() }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.message) {
            setBannerMessage(data.message);
            // 3. Update Cache
            window.localStorage.setItem(AI_BANNER_CACHE_KEY, JSON.stringify({
              message: data.message,
              timestamp: Date.now()
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch AI banner:', error);
      } finally {
        setIsBannerLoading(false);
      }
    };
    fetchBannerMessage();
  }, [user?.id, getProgressContext]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isB01Typing]);

  const handleSendMessage = async (customQuery = null) => {
    const query = (customQuery || askB01Query).trim();
    if (!query || isB01Typing) return;

    const userMessage = { role: 'user', content: query };
    const newMessages = [...chatMessages, userMessage];
    
    setChatMessages(newMessages);
    setAskB01Query('');
    setIsB01Typing(true);

    const assistantMessageId = Date.now();
    setChatMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantMessageId }]);

    try {
      const contextMessage = { 
        role: 'system', 
        content: `CONTEXT: User Progress Snapshot: ${JSON.stringify(getProgressContext())}. Reference these specific numbers if asked about progress, growth, or stats.` 
      };

      const response = await fetch('https://b01-ai-worker.dzeref4000.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [contextMessage, ...newMessages] 
        }),
      });

      if (!response.ok) throw new Error('Failed to connect to B-01');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedResponse = '';

      setIsB01Typing(false); // Hide spinner as text starts coming in

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        
        // Cloudflare Workers AI streaming returns data prefixes like "data: {...}"
        const lines = chunkValue.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            if (line.includes('[DONE]')) break;
            try {
              const data = JSON.parse(line.slice(6));
              accumulatedResponse += data.response || '';
              
              setChatMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: accumulatedResponse }
                  : msg
              ));
            } catch (e) {
              console.warn("Chunk parse error", e);
            }
          }
        }
      }
    } catch (error) {
      console.error('B-01 Error:', error);
      setChatMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: "I'm having a little trouble connecting to my brain right now. Please try again in a moment!" }
          : msg
      ));
    } finally {
      setIsB01Typing(false);
    }
  };
  const weekPills = useMemo(() => getWeekdayPills(sessionCountsByDay), [sessionCountsByDay]);
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

  const lottieFireNode = useMemo(() => <Lottie animationData={fireAnimationData} loop={true} />, []);

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
    
    // Condition: finished profiling AND pre-testing OR finished entire onboarding
    const isReadyForTutorial = 
      user.onboardingStage === 'completed' || 
      (user.isProfilingCompleted && user.isPreTestCompleted) ||
      (user.profilingCompleted && user.pretestCompleted);
    
    if (isReadyForTutorial) {
      const localSeen = window.localStorage.getItem(FREE_SPEECH_TUTORIAL_SEEN_KEY);
      const remoteSeen = !!user.dashboardTutorialSeen;

      if (localSeen !== '1' && !remoteSeen) {
        setShowFreeSpeechTutorial(true);
      }
    }
  }, [user?.id, user?.onboardingStage, user?.profilingCompleted, user?.pretestCompleted, user?.isProfilingCompleted, user?.isPreTestCompleted, activitiesLoading]);

  const assessmentTutorialSteps = useMemo(() => [
    {
      id: 'assessment-notice',
      title: 'B-01:',
      text: `We assessed your speaking level as Level ${levelProgress?.levelNumber || 1}, so we fast-tracked earlier lessons and placed you where your growth is most meaningful.`,
      button: 'Got it!',
      targetElementId: null,
      robot: tutorialRobotStep1,
    },
  ], [levelProgress?.levelNumber]);

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
    
    // Explicitly reset the seen flag if we're coming from the onboarding reveal
    window.localStorage.setItem(FREE_SPEECH_TUTORIAL_SEEN_KEY, '0');
    setShowFreeSpeechTutorial(true);

    // Short delay to ensure the overlay renders before we clear the state flag
    const t = setTimeout(() => {
      navigate(location.pathname, {
        replace: true,
        state: { ...(location.state || {}), launchFreeSpeechTutorial: false },
      });
    }, 100);

    return () => clearTimeout(t);
  }, [location.pathname, location.state, navigate, FREE_SPEECH_TUTORIAL_SEEN_KEY]);

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

    // Persist to database so it doesn't show again on other devices
    if (user?.id) {
      updateUserMetadata({ dashboard_tutorial_seen: true }).catch(() => {});
    }

    const curLevel = Number(levelProgress?.levelNumber || 1);
    const recLevel = Number(recommendedLevel || 1);
    if (curLevel > 1 && curLevel === recLevel) {
      setShowAssessmentModal(true);
    }
  }, [user?.id, levelProgress?.levelNumber, recommendedLevel, updateUserMetadata]);

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
    setIsStreakRecoveryMode(false);
    setShowRandomizerOverlay(true);
  }, []);

  const handleCloseRandomizerOverlay = useCallback(() => {
    setIsStreakRecoveryMode(false);
    setShowRandomizerOverlay(false);
  }, []);

  const handleRandomizeTopic = useCallback(async () => {
    setIsRandomizingTopic(true);
    try {
      const response = await fetch('https://b01-ai-worker.dzeref4000.workers.dev/random-topic');
      if (response.ok) {
        const data = await response.json();
        if (data.title) {
          setRandomizerTopic({ title: data.title, body: data.body || '' });
          return;
        }
      }
    } catch (error) {
      console.error('Failed to fetch AI topic:', error);
    } finally {
      setIsRandomizingTopic(false);
    }

    // Fallback to local randomization
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
    const isRecovery = isStreakRecoveryMode;
    
    navigate(`${ROUTES.TRAINING}?autostart=1`, {
      state: {
        freeTopic: randomizerTopic.title,
        freeSpeechContext: randomizerTopic.body || '',
        focus: 'free',
        sessionType: 'practice',
        entryPoint: isRecovery ? 'streak-recovery' : 'practice',
        objective: isRecovery 
          ? `Recover your ${potentialStreak} day streak by completing this Level 1-5 Randomizer session!` 
          : randomizerTopic.title,
        autoStartCountdown: true,
      },
    });
  }, [navigate, randomizerTopic, isStreakRecoveryMode, potentialStreak]);

  const handleRecoverStreak = useCallback(() => {
    setIsStreakRecoveryMode(true);
    setShowRandomizerOverlay(true);
    // Optionally trigger randomization immediately for a better UX
    if (!randomizerTopic) {
      handleRandomizeTopic();
    }
  }, [handleRandomizeTopic, randomizerTopic]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const isAnyOverlayOpen = showRandomizerOverlay || showFreeSpeechOverlay || isRankModalOpen || isAskB01ModalOpen || isStreakModalOpen;
    if (isAnyOverlayOpen) {
      document.body.classList.add('randomizer-overlay-open');
    } else {
      document.body.classList.remove('randomizer-overlay-open');
    }
    return () => document.body.classList.remove('randomizer-overlay-open');
  }, [showRandomizerOverlay, showFreeSpeechOverlay, isRankModalOpen, isAskB01ModalOpen, isStreakModalOpen]);

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
          <Button
            variant="practice"
            className={`activity-action-btn${isLocked ? ' is-locked' : ''}${canShowProgress ? ' with-progress' : ''}`}
            onClick={() => handleTaskAction(task)}
            disabled={isLocked || done}
          >
            {canShowProgress ? (
              <span className="activity-action-progress-fill" style={{ width: `${progressPctForTask}%` }} />
            ) : null}
            <span className="activity-action-btn-text">{ctaLabel}</span>
          </Button>
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

  return (
    <div className={`activity-page-root ${!activitiesLoading ? 'activity-page--skyward-entrance' : ''} ${(showFreeSpeechTutorial || showAssessmentModal) ? 'is-tutorial-active' : ''}`}>
      <TutorialOverlay
        isOpen={showFreeSpeechTutorial}
        steps={FREE_SPEECH_TUTORIAL_STEPS}
        showAudioToggle
        onClose={() => setShowFreeSpeechTutorial(false)}
        onFinish={handleTutorialFinish}
      />

      <div className="activity-page-grid">
        {/* Loading Overlay (Only if no data yet) */}
        {activitiesLoading && tasks.length === 0 && (
          <div className="activity-loading-overlay-root">
            <div className="activity-loading-content">
              <div className="loading-spinner" style={{ width: '50px', height: '50px', borderWidth: '4px', marginBottom: '1.5rem' }} />
              <p className="section-label" style={{ margin: 0, color: '#059669', letterSpacing: '0.1em' }}>Loading your journey…</p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {activitiesError && tasks.length === 0 && (
          <div className="activity-loading-overlay-root">
            <div className="activity-content-wrap" style={{ padding: '4rem', textAlign: 'center' }}>
              <p className="activity-task-lock-note">Could not load activities: {activitiesError}</p>
              <p className="activity-task-detail">Please try refreshing the page.</p>
            </div>
          </div>
        )}

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
                <h2 className="randomizer-overlay-title">
                  {isStreakRecoveryMode ? 'Streak Recovery Task' : 'Randomizer × B-01'}
                </h2>
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
                {isStreakRecoveryMode 
                  ? `Ready to put your skills to the test? To recover your streak, you'll need to complete ${requiredRecoveryTasks} randomizer tasks with a score of 45% or higher. Whenever you're ready, hit 'Start' to begin!`
                  : "Ready to put your skills to the test? Click the 'Generate' button for a random topic, and whenever you're ready, hit 'Start' to begin your speaking practice!"
                }
              </p>

              {isStreakRecoveryMode && (
                <div className="randomizer-recovery-progress">
                  <div className="randomizer-recovery-progress-header">
                    <div className="randomizer-recovery-progress-label">Recovery Progress</div>
                    <div className="randomizer-recovery-progress-requirement">
                      <IoTrophyOutline className="requirement-icon" />
                      <span>Target: 45%+ Score</span>
                    </div>
                  </div>
                  <div className="randomizer-recovery-progress-bar-wrap">
                    <div 
                      className="randomizer-recovery-progress-bar-fill" 
                      style={{ width: `${(recoverySessionsToday / requiredRecoveryTasks) * 100}%` }}
                    />
                  </div>
                  <div className="randomizer-recovery-progress-count">
                    {recoverySessionsToday} / {requiredRecoveryTasks} Tasks Completed
                  </div>
                </div>
              )}
              <p className="randomizer-overlay-topic">
                <span className="randomizer-overlay-topic-label">Topic:</span>
                {' '}
                {isRandomizingTopic 
                  ? 'Thinking of a topic...' 
                  : (randomizerTopic?.title || "Click 'Randomize Topic' below to get started!")}
              </p>
              <div className="randomizer-overlay-actions">
                <Button
                  variant="practice"
                  className="randomizer-overlay-randomize-btn"
                  onClick={handleRandomizeTopic}
                  disabled={isRandomizingTopic}
                >
                  {isRandomizingTopic ? 'Randomizing...' : 'Generate'}
                </Button>
                <Button
                  variant="practice"
                  className="randomizer-overlay-start-btn"
                  onClick={handleStartRandomizerTopic}
                  disabled={!randomizerTopic?.title || isRandomizingTopic}
                >
                  {isStreakRecoveryMode 
                    ? `Start Task ${Math.min(requiredRecoveryTasks, recoverySessionsToday + 1)} of ${requiredRecoveryTasks}` 
                    : 'Start'
                  }
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

        {/* Banner */}
        <section className="new-banner dashboard-anim-top dashboard-anim-delay-2">
           <div className="new-banner-left" id="tutorial-target-home-banner">
              <img src={heroRobotImage} alt="" className="new-banner-robot" />
              <div className="new-banner-bubble" aria-label="Coach message">
                <p className="new-banner-kicker">B-01:</p>
                <p className="new-banner-copy">
                  {isBannerLoading ? 'Checking your progress...' : bannerMessage}
                </p>
                <div className="new-banner-bubble-footer">
                  <Button 
                    variant="practice"
                    className="ask-b01-trigger" 
                    onClick={() => setIsAskB01ModalOpen(true)}
                    aria-label="Ask B-01 a question"
                  >
                    <IoChatbubbleEllipsesOutline />
                    <span>Ask B-01</span>
                  </Button>
                </div>
              </div>
           </div>
           <div className="new-banner-right">
              <div 
                className="new-banner-streak" 
                id="tutorial-target-home-streak" 
                aria-label="Daily streak"
                onClick={() => setIsStreakModalOpen(true)}
              >
                 <div className="new-streak-top" style={{ justifyContent: 'space-between', width: '100%' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <div className="new-streak-fire">
                       {lottieFireNode}
                     </div>
                     <div className="new-streak-headline">
                       <div className="new-streak-value">
                         {streakStats.currentStreak}
                       </div>
                       <p className="new-streak-label">day streak</p>
                     </div>
                   </div>

                   {streakStats.canRecover && (
                     <Button 
                       variant="practice"
                       className="ask-b01-trigger streak-recovery-trigger" 
                       onClick={(e) => {
                         e.stopPropagation();
                         handleRecoverStreak();
                       }}
                       aria-label={`Recover your ${streakStats.potentialStreak} day streak`}
                       style={{ margin: 0, width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.8rem' }}
                     >
                       <IoFlame />
                       <span>Recover {streakStats.potentialStreak} Day Streak</span>
                     </Button>
                   )}
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
                <span className="new-widget-chip">Level</span>
              </div>
              <div 
                className="new-widget-rank-card"
                onClick={() => setIsRankModalOpen(true)}
              >
                <img src={rankSpriteImage} alt="" className="new-widget-rank-sprite" />
                <div className="new-widget-rank-content">
                  <p className="new-widget-kicker">Current Level</p>
                  <p className="new-widget-value">LEVEL {levelProgress.levelNumber}</p>
                </div>
              </div>
              <p className="new-widget-caption">
                {completedTaskCount}/{Math.max(tasks.length, 1)} Stages Completed
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
                <div 
                  className="new-btn-row new-btn-row--card"
                  role="button"
                  tabIndex={0}
                  onClick={handleRandomizerClick}
                  onKeyDown={(e) => e.key === 'Enter' && handleRandomizerClick()}
                >
                  <div className="new-btn-visual new-btn-visual--randomizer">
                    <img src={crystalBallImage} alt="" className="new-btn-visual-img new-btn-visual-img--randomizer" />
                  </div>
                  <div className="new-btn-meta">
                    <p className="new-btn-label">Randomizer</p>
                    <p className="new-btn-hint">Instant prompt to warm up your delivery.</p>
                  </div>
                </div>
                
                <div 
                  className="new-btn-row new-btn-row--card"
                  role="button"
                  tabIndex={0}
                  onClick={handleFreeSpeechClick}
                  onKeyDown={(e) => e.key === 'Enter' && handleFreeSpeechClick()}
                >
                  <div className="new-btn-visual new-btn-visual--speech">
                    <img src={crownImage} alt="" className="new-btn-visual-img" />
                  </div>
                  <div className="new-btn-meta">
                    <p className="new-btn-label">Free Speech</p>
                    <p className="new-btn-hint">Open topic mode for confidence building.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
      </div>
      <StreakCalendarModal 
        isOpen={isStreakModalOpen} 
        onClose={() => setIsStreakModalOpen(false)} 
        sessionCountsByDay={sessionCountsByDay} 
        streakStats={streakStats}
      />

      <RankListModal
        isOpen={isRankModalOpen}
        onClose={() => setIsRankModalOpen(false)}
        currentLevelNumber={levelProgress.levelNumber}
      />
      <TutorialOverlay
        isOpen={showAssessmentModal}
        onClose={() => setShowAssessmentModal(false)}
        onFinish={() => setShowAssessmentModal(false)}
        steps={assessmentTutorialSteps}
      />
      
      {/* Ask B-01 Modal */}
      {isAskB01ModalOpen && (
        <section className="randomizer-overlay-wrapper ask-b01-modal-wrapper" aria-label="Ask B-01 modal">
          <div className="bigkas-modal-scrim ask-b01-scrim" onClick={() => setIsAskB01ModalOpen(false)} />
          <div className="ask-b01-modal-card">
            <div className="ask-b01-modal-header">
              <h2 className="ask-b01-modal-title">
                <img src={b01ChatHead} alt="" className="ask-b01-modal-title-logo" />
                Ask <span>B-01</span>
              </h2>
              <button 
                className="ask-b01-modal-close" 
                onClick={() => setIsAskB01ModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className="ask-b01-chat-container" ref={chatScrollRef}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`ask-b01-chat-row ${msg.role === 'assistant' ? 'b01-row' : 'user-row'}`}>
                  {msg.role === 'assistant' && (
                    <div className="ask-b01-chat-head b01-chat-head-square">
                      <img src={b01ChatHead} alt="B-01" />
                    </div>
                  )}
                  
                  <div className={`ask-b01-message ask-b01-message--${msg.role === 'assistant' ? 'b01' : 'user'} ${!msg.content && msg.role === 'assistant' ? 'typing-indicator' : ''}`}>
                    {msg.content || (msg.role === 'assistant' && (
                      <><span>.</span><span>.</span><span>.</span></>
                    ))}
                  </div>

                  {msg.role === 'user' && (
                    <div className="ask-b01-chat-head user-head">
                      {(user?.avatarUrl || user?.avatar_url) ? (
                        <img src={user.avatarUrl || user.avatar_url} alt="Me" />
                      ) : (
                        <div className="ask-b01-avatar-placeholder">
                          {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {chatMessages.length === 1 && !isB01Typing && (
                <div className="ask-b01-suggestions">
                  {B01_SUGGESTIONS.map((suggestion, sIdx) => (
                    <button 
                      key={sIdx} 
                      className="ask-b01-suggestion-chip"
                      onClick={() => handleSendMessage(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

            </div>

            <div className="ask-b01-input-area">
              <form 
                className="ask-b01-input-wrapper"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <input 
                  type="text" 
                  className="ask-b01-input"
                  placeholder="Ask me anything..."
                  value={askB01Query}
                  onChange={(e) => setAskB01Query(e.target.value)}
                  disabled={isB01Typing}
                />
                <button 
                  type="submit"
                  className="ask-b01-send-btn"
                  disabled={!askB01Query.trim() || isB01Typing}
                >
                  <IoSend />
                </button>
              </form>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default ActivityPage;

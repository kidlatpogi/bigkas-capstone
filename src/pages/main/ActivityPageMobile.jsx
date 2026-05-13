import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import Lottie from 'lottie-react';
import { useAuthContext } from '../../context/useAuthContext';
import { useSessions } from '../../hooks/useSessions';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/common/Button';
import PushButton from '../../components/common/PushButton';
import { FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { IoChatbubbleEllipsesOutline, IoSend, IoTrophyOutline } from 'react-icons/io5';
import TutorialOverlayMobile from '../../components/main/TutorialOverlayMobile';
import {
  GLOBAL_ACTIVITY_SCOPE,
  getActivityTaskProgress,
  getActivityMetrics,
  getActivityCompletionHistory,
  getBigkasLevelFromUser,
  getTaskXp,
  isActivityTaskCompleted,
  resolveDashboardTutorialSpeakerLevel,
} from '../../utils/activityProgress';
import SkywardJourneyShell from '../../components/journey/SkywardJourneyShell';
import StreakCalendarModal from '../../components/main/StreakCalendarModal';
import RankListModal from '../../components/main/RankListModal';
import { useActivitiesJourneyTasks } from '../../hooks/useActivitiesJourneyTasks';
import { ensureJourneyStarted, updateJourneyCurrentActivity } from '../../services/journeyProgressService';
import { RANDOM_TOPICS } from '../../utils/practiceData';
import { getAssetUrl, getSpriteUrl } from '../../utils/assetUtils';
import { filterActivitiesForJourney, JOURNEY_STAGE_LIMITS } from '../../utils/journeyFiltering';
import { generateCoachInsights } from '../../utils/coachInsights';
import fireAnimationData from '../../assets/Lottie/fire.json';
import './InnerPages.css';
import './ActivityPageMobile.css';
import './ActivityPage.css';

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
const rankBronze = getSpriteUrl('Rank/rank-bronze.webp');
const rankSilverImage = getSpriteUrl('Rank/rank-silver.webp');
const rankGoldImage = getSpriteUrl('Rank/rank-gold.webp');
const rankMythrilImage = getSpriteUrl('Rank/rank-mythril.webp');
const rankLegendaryImage = getSpriteUrl('Rank/rank-legendary.webp');
const crystalBallImage = getSpriteUrl('common/crystal-ball.webp');
const crownImage = getSpriteUrl('common/crown.webp');
const b01ChatHead = getAssetUrl('Images/Bigkas-Logo.webp');
const B01_SUGGESTIONS = [
  'Summarize my progress so far',
  'How can I improve my confidence?',
  'Give me tips for vocal variety',
  'Explain my current rank and growth',
  'What should I practice next?',
];

const DAY_MS = 86_400_000;
const ACTIVITY_CELEBRATION_STORAGE_KEY = 'bigkas_pending_activity_celebration_v1';
const LAST_SHOWN_COMPLETION_EVENT_KEY = 'bigkas_last_completion_event_v1';
const FREE_SPEECH_TUTORIAL_SEEN_KEY = 'bigkas_free_speech_tutorial_seen_v1';



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

function buildStreakStats(sessions = []) {
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
    requiredRecoveryTasks,
  };
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
    tasks: allTasks,
    loading: activitiesLoading,
    refresh: refreshJourney,
  } = useActivitiesJourneyTasks(user?.progressLevelNumber || 1);

  const levelProgress = useMemo(() => getBigkasLevelFromUser(user), [user]);
  const tasks = useMemo(() => {
    const sLevel = levelProgress?.levelNumber || 1;
    return filterActivitiesForJourney(allTasks, sLevel, user?.progressLevelNumber || 1);
  }, [allTasks, levelProgress?.levelNumber, user?.progressLevelNumber]);

  // State
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [showFreeSpeechTutorial, setShowFreeSpeechTutorial] = useState(false);
  const [showRandomizerOverlay, setShowRandomizerOverlay] = useState(false);
  const [showFreeSpeechOverlay, setShowFreeSpeechOverlay] = useState(false);
  const [freeSpeechDraftTopic, setFreeSpeechDraftTopic] = useState('');
  const [randomizerTopic, setRandomizerTopic] = useState(null);
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);
  const [completionModalTaskTitle, setCompletionModalTaskTitle] = useState('');
  const [recentStampedTaskId, setRecentStampedTaskId] = useState(null);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [showDashboardOverlay, setShowDashboardOverlay] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [entranceFromNav, setEntranceFromNav] = useState(false);
  const [isStreakRecoveryMode, setIsStreakRecoveryMode] = useState(false);
  const [isRandomizingTopic, setIsRandomizingTopic] = useState(false);
  const [isAskB01ModalOpen, setIsAskB01ModalOpen] = useState(false);
  const [askB01Query, setAskB01Query] = useState('');
  const [isB01Typing, setIsB01Typing] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hello! I'm B-01, your AI speaking coach. What would you like to know about public speaking or your progress today?",
      id: 'initial-greeting',
    },
  ]);
  const stampResetTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const overlayAudioRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Clean up effects
  useEffect(() => {
    return () => {
      if (stampResetTimeoutRef.current) {
        window.clearTimeout(stampResetTimeoutRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (overlayAudioRef.current) {
        overlayAudioRef.current.pause();
        overlayAudioRef.current = null;
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

  const recommendedLevel = useMemo(() => {
    const pLevel = Number(user?.progressLevelNumber || 1);
    return Math.max(1, Math.min(5, Math.round(pLevel)));
  }, [user?.progressLevelNumber]);

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

  /** Same shape as ActivityPage — Map<YYYY-MM-DD, number> for streak calendar heatmap + weekday pills */
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

  const streakStats = useMemo(() => buildStreakStats(sessions), [sessions]);
  const { potentialStreak, recoverySessionsToday, requiredRecoveryTasks } = streakStats;

  const getProgressContext = useCallback(() => {
    const sortedSessions = [...sessions]
      .filter((s) => {
        const isError = s.status === 'error' || s.is_error === true;
        return !isPreTestSession(s) && !isError;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const latest = sortedSessions[0];
    const first = sortedSessions[sortedSessions.length - 1];

    const latestScore = Math.floor(latest?.score || latest?.overall_score || latest?.overallScore || 0);
    const firstScore = Math.floor(first?.score || first?.overall_score || first?.overallScore || 0);

    const insights = generateCoachInsights(sessions);

    return {
      totalSessionCount: (sessions || []).filter((s) => s.status !== 'error' && s.is_error !== true).length,
      analyzedSessionsCount: sortedSessions.length,
      averageScore: activityMetrics?.averageScore || 'N/A',
      currentLevel: levelProgress.levelNumber,
      levelName: levelProgress.levelName,

      growthSummary: {
        firstSessionScore: firstScore,
        latestSessionScore: latestScore,
        growthPercentage: insights.growth.toFixed(1),
        strongestPillar: insights.strongestPillar,
        coachNarrative: insights.growthUpdate,
        positiveQuote: insights.positiveQuote,
        status: insights.growth > 0 ? 'Improving' : insights.growth < 0 ? 'Declining' : 'Stable',
      },

      latestSession: latest
        ? {
            score: latestScore,
            topic: latest.topic || latest.script_title || latest.activity_title,
            date: latest.created_at,
          }
        : null,

      recentTimeline: sortedSessions.slice(0, 15).map((s) => ({
        date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: `${Math.floor(s.score || s.overall_score || s.overallScore || 0)}%`,
        topic: s.topic || s.script_title || s.activity_title,
      })),
    };
  }, [sessions, activityMetrics, levelProgress, streakStats.currentStreak, completedTaskCount, tasks]);

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
    setChatMessages((prev) => [...prev, { role: 'assistant', content: '', id: assistantMessageId }]);

    try {
      const contextMessage = {
        role: 'system',
        content: `CONTEXT: User Progress Snapshot: ${JSON.stringify(getProgressContext())}. Reference these specific numbers if asked about progress, growth, or stats.`,
      };

      const response = await fetch('https://b01-ai-worker.dzeref4000.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [contextMessage, ...newMessages],
        }),
      });

      if (!response.ok) throw new Error('Failed to connect to B-01');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedResponse = '';

      setIsB01Typing(false);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);

        const lines = chunkValue.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            if (line.includes('[DONE]')) break;
            try {
              const data = JSON.parse(line.slice(6));
              accumulatedResponse += data.response || '';

              setChatMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId ? { ...msg, content: accumulatedResponse } : msg,
                ),
              );
            } catch (e) {
              console.warn('Chunk parse error', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('B-01 Error:', error);
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content:
                  "I'm having a little trouble connecting to my brain right now. Please try again in a moment!",
              }
            : msg,
        ),
      );
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

  useEffect(() => {
    if (user?.isAudioMuted) return;

    if (showRandomizerOverlay && !isStreakRecoveryMode) {
      if (overlayAudioRef.current) overlayAudioRef.current.pause();
      const audio = new Audio("https://assets.bigkas.site/Voices/Home%20Page/Randomizer%20and%20Free%20Speech%20Button/Randomizer.mp3");
      overlayAudioRef.current = audio;
      audio.play().catch(() => {});
    } else if (showFreeSpeechOverlay) {
      if (overlayAudioRef.current) overlayAudioRef.current.pause();
      const audio = new Audio("https://assets.bigkas.site/Voices/Home%20Page/Randomizer%20and%20Free%20Speech%20Button/Free%20Speech.mp3");
      overlayAudioRef.current = audio;
      audio.play().catch(() => {});
    } else {
      if (overlayAudioRef.current) {
        overlayAudioRef.current.pause();
        overlayAudioRef.current = null;
      }
    }
  }, [showRandomizerOverlay, showFreeSpeechOverlay, user?.isAudioMuted]);

  const handleActiveTaskIdChange = useCallback((id) => {
    setActiveTaskId(id);
    if (user?.id) {
      updateJourneyCurrentActivity(user.id, id ?? null).catch(() => {});
    }
  }, [user?.id]);

  const handleTaskAction = useCallback((task) => {
    const activityPromptTopic = String(task.detail || task.objective || task.title || '').trim();
    navigate(`${ROUTES.TRAINING}?autostart=1`, {
      state: {
        freeTopic: activityPromptTopic,
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
    setIsStreakRecoveryMode(false);
    setShowRandomizerOverlay(true);
  }, []);

  const handleCloseRandomizerOverlay = useCallback(() => {
    setIsStreakRecoveryMode(false);
    setShowRandomizerOverlay(false);
  }, []);

  const handleToggleMute = async () => {
    const nextMute = !user?.isAudioMuted;
    await updateUserMetadata({ is_audio_muted: nextMute });
    localStorage.setItem('bigkas_global_audio_muted_v1', nextMute ? '1' : '0');

    // Immediate feedback: pause if muting
    if (nextMute && overlayAudioRef.current) {
      overlayAudioRef.current.pause();
    }
  };

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
    setShowDashboardOverlay(false);
    setIsStreakRecoveryMode(true);
    setShowRandomizerOverlay(true);
    if (!randomizerTopic) {
      handleRandomizeTopic();
    }
  }, [handleRandomizeTopic, randomizerTopic]);

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
    if (showRandomizerOverlay || showFreeSpeechOverlay || isAskB01ModalOpen) {
      document.body.classList.add('randomizer-overlay-open');
    } else {
      document.body.classList.remove('randomizer-overlay-open');
    }
    return () => document.body.classList.remove('randomizer-overlay-open');
  }, [showRandomizerOverlay, showFreeSpeechOverlay, isAskB01ModalOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (showFreeSpeechTutorial) {
      document.body.classList.add('activity-tutorial-open');
    } else {
      document.body.classList.remove('activity-tutorial-open');
    }
    return () => document.body.classList.remove('activity-tutorial-open');
  }, [showFreeSpeechTutorial]);

  const freeSpeechTutorialSteps = useMemo(() => {
    const level = resolveDashboardTutorialSpeakerLevel(user);
    let welcomeText = "Welcome aboard! You made it, and I know you're going to do great things here. Let me give you a quick, guided tour of your Home screen so you know exactly where everything is.";
    let welcomeVoice = null;
    
    if (level === 1) {
      welcomeText = "Welcome! I’ve analyzed your profile and we’re starting from the ground up. You’ll be taking the full 30-stage path for Journey 1 to ensure your vocal and visual foundations are unbreakable. Let’s build your mastery, stage by stage.";
      welcomeVoice = "https://assets.bigkas.site/Voices/Home%20Page/Welcome/Level%201.mp3";
    } else if (level === 2) {
      welcomeText = "Welcome! Based on your level, I’ve optimized your curriculum. Since you already show solid potential, I’ve trimmed Journey 1 down to 20 essential stages. We’ll move faster through the basics so you can reach the advanced challenges sooner. Let’s begin.";
      welcomeVoice = "https://assets.bigkas.site/Voices/Home%20Page/Welcome/Level%202.mp3";
    } else if (level === 3) {
      welcomeText = "Welcome back. Your experience allows us to skip the fluff. I’ve recalibrated your Journey 1 to just 15 high-impact stages, and Journey 2 to 20. We’re focusing only on the core essentials before we dive into the deep technical training. Systems ready?";
      welcomeVoice = "https://assets.bigkas.site/Voices/Home%20Page/Welcome/Level%203.mp3";
    } else if (level === 4) {
      welcomeText = "Welcome! Your skills are advanced, so I’ve streamlined your training. I’ve cut Journeys 1, 2, and 3 down to the bare essentials, removing over 40 stages of repetitive drills. We’re moving fast through the basics to get you straight to the Specialist training. Let’s get to work.";
      welcomeVoice = "https://assets.bigkas.site/Voices/Home%20Page/Welcome/Level%204.mp3";
    } else if (level >= 5) {
      welcomeText = "Welcome, Expert. We’re skipping the grind. I’ve compressed Journeys 1 through 4 into a rapid-fire calibration to respect your expertise. We’re fast-forwarding past the basics so you can focus entirely on the high-stakes challenges of the final Journey. Mastery starts here.";
      welcomeVoice = "https://assets.bigkas.site/Voices/Home%20Page/Welcome/Level%205_new.mp3";
    }

    const fullSteps = [
      {
        id: 'step-intro',
        title: 'B-01:',
        robot: tutorialRobotStep1,
        robotClassName: 'is-activity-home-step-1',
        button: 'Next',
        targetElementId: null,
        text: welcomeText,
        voice: welcomeVoice,
      },
      {
        id: 'step-companion',
        title: 'B-01:',
        robot: tutorialRobotStep2,
        robotClassName: 'is-activity-home-step-2',
        button: 'Next',
        targetElementId: 'tutorial-target-home-banner',
        text: "Your AI Companion—hey, that's me! See my panel right at the top? I'll be checking in with you from time to time. Depending on your progress, I'll drop by with daily greetings, personalized tips, and a little extra encouragement to keep your momentum going.",
        voice: "https://assets.bigkas.site/Voices/Home%20Page/Tutorials/Home%20Page%20Tutorial%201.mp3",
      },
      {
        id: 'step-streak',
        title: 'B-01:',
        robot: tutorialRobotStep3,
        robotClassName: 'is-activity-home-step-3',
        button: 'Next',
        targetElementId: 'tutorial-target-home-streak',
        text: 'Up in the top right is your Streak counter. Consistency is the true secret to mastering public speaking! Log in and complete a daily activity to keep the fire burning and watch that number grow.',
        voice: "https://assets.bigkas.site/Voices/Home%20Page/Tutorials/Home%20Page%20Tutorial%202.mp3",
      },
      {
        id: 'step-rank',
        title: 'B-01:',
        robot: tutorialRobotStep4,
        button: 'Next',
        targetElementId: 'tutorial-target-home-rank',
        text: 'To keep an eye on the big picture, check out the Journey Progression card on the right! This handy panel lets you quickly track your current speaking Rank and see exactly how many tasks you have conquered so far.',
        voice: "https://assets.bigkas.site/Voices/Home%20Page/Tutorials/Home%20Page%20Tutorial%204.mp3",
      },
      {
        id: 'step-roadmap',
        title: 'B-01:',
        robot: tutorialRobotStep5,
        robotClassName: 'is-roadmap-step',
        button: 'Next',
        targetElementId: 'tutorial-target-home-journey',
        text:
          'This path is your customized learning roadmap! You will start at your first stage and unlock the next ones as you move forward.',
        textPart2:
          'The activities gradually become more challenging, and once you complete all tasks on your path, you unlock a final Post-test challenge to advance.',
        voice:
          'https://assets.bigkas.site/Voices/Home%20Page/Tutorials/Home%20Page%20Tutorial%203%20Part%201.mp3',
        voicePart2:
          'https://assets.bigkas.site/Voices/Home%20Page/Tutorials/Home%20Page%20Tutorial%203%20Part%202.mp3',
      },
      {
        id: 'step-practice',
        title: 'B-01:',
        robot: tutorialRobotStep6,
        robotClassName: 'is-practice-step',
        button: 'Finish!',
        targetElementId: 'tutorial-target-home-practice',
        text: 'Need extra training? The Practice card gives you two ways to sharpen your skills anytime: Randomizer for surprise prompts, and Free Speech for open-topic confidence building. Ready? Let us start your Free Speech session now!',
        voice: "https://assets.bigkas.site/Voices/Home%20Page/Tutorials/Home%20Page%20Tutorial%205.mp3",
      },
    ];

    if (location.state?.skipTutorialIntro) {
      return fullSteps.filter((s) => s.id !== 'step-intro');
    }
    return fullSteps;
  }, [user?.speakerLevelNumber, user?.onboardingLevelAnalysis, user?.speakerEntryScore, user?.speaker_entry_score, location.state?.skipTutorialIntro]);

  const assessmentTutorialSteps = useMemo(() => {
    const sLevel = resolveDashboardTutorialSpeakerLevel(user);
    const pLevel = user?.progressLevelNumber || 1;
    const reducedTo = JOURNEY_STAGE_LIMITS[sLevel]?.[pLevel] ?? 30;

    let text = `We noticed that you are a level ${sLevel} speaker, so we reduced Journey ${pLevel} to ${reducedTo} stages for you!`;
    if (reducedTo >= 30) {
      text = `Welcome to Journey ${pLevel}! You have ${reducedTo} stages to complete. Let's get started!`;
    }

    return [
      {
        id: 'assessment-notice',
        title: 'B-01:',
        text,
        button: 'Got it!',
        targetElementId: null,
        robot: tutorialRobotStep1,
      },
    ];
  }, [user?.speakerLevelNumber, user?.onboardingLevelAnalysis, user?.speakerEntryScore, user?.speaker_entry_score, user?.progressLevelNumber]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (showDashboardOverlay) {
      document.body.classList.add('dashboard-overlay-open');
    } else {
      document.body.classList.remove('dashboard-overlay-open');
    }
    return () => document.body.classList.remove('dashboard-overlay-open');
  }, [showDashboardOverlay]);

  const closeDashboardForHomeJourneyTutorial = useCallback(() => {
    setShowDashboardOverlay(false);
  }, []);

  const handleTutorialFinish = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FREE_SPEECH_TUTORIAL_SEEN_KEY, '1');
    }

    // Persist to database so it doesn't show again on other devices
    if (user?.id) {
      updateUserMetadata({ dashboard_tutorial_seen: true }).catch(() => {});
    }

    const sLevel = resolveDashboardTutorialSpeakerLevel(user);
    const pLevel = Number(user?.progressLevelNumber || 1);
    const reducedTo = JOURNEY_STAGE_LIMITS[sLevel]?.[pLevel] ?? 30;

    if (reducedTo < 30) {
      setShowAssessmentModal(true);
    }
  }, [user, updateUserMetadata]);

  const renderTaskCardForShell = useCallback(({ task, isLocked: shellLocked, animationClass = '' }) => {
    const done = taskState[task.id] === true;
    const isUnlocked = taskUnlockState[task.id] === true;
    const isLocked = shellLocked ?? (!done && !isUnlocked);
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

  return (
    <div className="activity-page-mobile-root activity-page--skyward-entrance">
      <style>
        {`
          @media (max-width: 767px) {
            /*
             * Mobile viewport: prerequisite banner inside SkywardJourney — stack logo above title,
             * tighten padding, keep copy centered for narrow widths.
             */
            .activity-page-mobile-root.activity-page--skyward-entrance .skyward-journey-prerequisite-banner {
              padding: 4px 10px 6px;
              border-top: 1.5px solid rgba(52, 211, 153, 0.35);
              background: linear-gradient(180deg, rgba(236, 253, 245, 0.95) 0%, rgba(209, 250, 229, 0.85) 100%);
            }
            .activity-page-mobile-root.activity-page--skyward-entrance .skyward-journey-prerequisite-banner-inner {
              max-width: none;
            }
            .activity-page-mobile-root.activity-page--skyward-entrance .skyward-journey-prerequisite-body {
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
            }
            .activity-page-mobile-root.activity-page--skyward-entrance .skyward-journey-prerequisite-title-row {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 4px;
              margin-bottom: 4px;
              width: 100%;
            }
            .activity-page-mobile-root.activity-page--skyward-entrance .skyward-journey-prerequisite-logo {
              height: 26px;
              width: auto;
              max-width: 80px;
              flex-shrink: 0;
              opacity: 1;
            }
            .activity-page-mobile-root.activity-page--skyward-entrance .skyward-journey-prerequisite-title {
              font-size: 0.65rem;
              letter-spacing: 0.055em;
              line-height: 1.25;
              max-width: 17.5rem;
              color: #059669;
              font-weight: 800;
            }
            .activity-page-mobile-root.activity-page--skyward-entrance .skyward-journey-prerequisite-list {
              font-size: 0.7rem;
              line-height: 1.32;
              font-weight: 600;
              padding: 0 2px;
              color: #0f766e;
            }
            .activity-page-mobile-root.activity-page--skyward-entrance .skyward-journey-prerequisite-list li {
              max-width: 18rem;
            }
          }
        `}
      </style>
      <TutorialOverlayMobile
        isOpen={showFreeSpeechTutorial}
        steps={freeSpeechTutorialSteps}
        showAudioToggle
        onCloseDashboard={closeDashboardForHomeJourneyTutorial}
        onClose={() => setShowFreeSpeechTutorial(false)}
        onFinish={handleTutorialFinish}
      />
      <TutorialOverlayMobile
        isOpen={showAssessmentModal}
        onClose={() => setShowAssessmentModal(false)}
        onFinish={() => setShowAssessmentModal(false)}
        steps={assessmentTutorialSteps}
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
        <section className="randomizer-overlay-wrapper activity-mobile-overlay-wrapper" aria-label="Randomizer overlay">
          <div className="bigkas-modal-scrim" aria-hidden="true" onClick={handleCloseRandomizerOverlay} />
          <div className="randomizer-overlay-content activity-mobile-overlay-content">
            <div className="randomizer-overlay-card">
              <div className="randomizer-overlay-card-top">
                <h2 className="randomizer-overlay-title">
                  <img src={b01ChatHead} alt="" className="randomizer-overlay-title-logo" width={22} height={22} />
                  {isStreakRecoveryMode ? 'Streak Recovery Task' : 'Randomizer × B-01'}
                </h2>
                <button
                  type="button"
                  className="dashboard-overlay-close-btn"
                  onClick={handleCloseRandomizerOverlay}
                  aria-label="Close randomizer overlay"
                >
                  ×
                </button>
              </div>
              {!isStreakRecoveryMode && (
                <p className="randomizer-overlay-copy">
                  <span className="randomizer-overlay-copy-kicker">B-01:</span>
                  Ready to put your skills to the test? Click the 'Generate' button for a random topic, and whenever you're ready, hit 'Start' to begin your speaking practice!
                </p>
              )}

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
                    : 'Start'}
                </Button>
              </div>
            </div>
            {!isStreakRecoveryMode && (
              <div className="tutorial-audio-action">
                <button
                  type="button"
                  aria-label={user?.isAudioMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                  title={user?.isAudioMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                  className={`tutorial-audio-toggle ${user?.isAudioMuted ? 'is-muted' : 'is-unmuted'}`}
                  onClick={handleToggleMute}
                >
                  {user?.isAudioMuted ? <FaVolumeMute aria-hidden="true" /> : <FaVolumeUp aria-hidden="true" />}
                </button>
              </div>
            )}
          </div>
        </section>
      )}
      {showFreeSpeechOverlay && (
        <section className="randomizer-overlay-wrapper activity-mobile-overlay-wrapper" aria-label="Free speech overlay">
          <div className="bigkas-modal-scrim" aria-hidden="true" onClick={handleCloseFreeSpeechOverlay} />
          <div className="randomizer-overlay-content activity-mobile-overlay-content">
            <div className="randomizer-overlay-card free-speech-overlay-card">
              <div className="randomizer-overlay-card-top">
                <h2 className="randomizer-overlay-title">
                  <img src={b01ChatHead} alt="" className="randomizer-overlay-title-logo" width={22} height={22} />
                  Free Speech
                </h2>
                <button
                  type="button"
                  className="dashboard-overlay-close-btn"
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
            <div className="tutorial-audio-action">
              <button
                type="button"
                aria-label={user?.isAudioMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                title={user?.isAudioMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                className={`tutorial-audio-toggle ${user?.isAudioMuted ? 'is-muted' : 'is-unmuted'}`}
                onClick={handleToggleMute}
              >
                {user?.isAudioMuted ? <FaVolumeMute aria-hidden="true" /> : <FaVolumeUp aria-hidden="true" />}
              </button>
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

      <div
        className={`activity-mobile-dashboard-section${showDashboardOverlay || showRandomizerOverlay || showFreeSpeechOverlay || isAskB01ModalOpen || showFreeSpeechTutorial ? ' is-hidden' : ''}`}
      >
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
              <Button
                variant="practice"
                className="activity-mobile-dashboard-btn"
                style={{ width: '100%', marginBottom: '1rem', height: '44px' }}
                onClick={() => {
                  setShowDashboardOverlay(false);
                  setShowFreeSpeechTutorial(true);
                }}
              >
                Launch Tutorial (Temp)
              </Button>
              <Button
                variant="practice"
                className="ask-b01-trigger activity-mobile-dashboard-btn"
                style={{ width: '100%', marginBottom: '1rem', height: '44px' }}
                onClick={() => {
                  setShowDashboardOverlay(false);
                  setIsAskB01ModalOpen(true);
                }}
                aria-label="Ask B-01 a question"
              >
                <IoChatbubbleEllipsesOutline aria-hidden />
                <span>Ask B-01</span>
              </Button>
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
                {streakStats.canRecover ? (
                  <Button 
                    variant="practice"
                    className="activity-mobile-dashboard-btn streak-recovery-trigger" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRecoverStreak();
                    }}
                    aria-label={`Recover your ${streakStats.potentialStreak} day streak`}
                    style={{ marginTop: '8px', width: '100%', height: '44px' }}
                  >
                    Recover Streak
                  </Button>
                ) : (
                  <p className="new-streak-copy">Build a daily speaking habit to keep stacking your streak.</p>
                )}
              </div>

              {/* Rank Widget */}
              <section className="new-widget" id="tutorial-target-home-rank">
                <div className="new-widget-head">
                  <h2 className="new-widget-title">Speaker Level Progression</h2>
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
                    <p className="new-widget-kicker">Current Mastery</p>
                    <p className="new-widget-value">LEVEL {user?.progressLevelNumber || 1}</p>
                  </div>
                </div>
                <p className="new-widget-caption">
                  {tasks.length > 0 ? (
                    <>
                      {completedTaskCount}/{tasks.length} Stages Completed
                      <span className="new-widget-caption-sep"> - </span>
                      {sidebarProgressPct}% Cleared
                    </>
                  ) : (
                    'No activities found for this level.'
                  )}
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
        sessionCountsByDay={sessionCountsByDay}
        streakStats={streakStats}
      />

      <RankListModal
        isOpen={isRankModalOpen}
        onClose={() => setIsRankModalOpen(false)}
        currentLevelNumber={levelProgress.levelNumber}
      />

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
                type="button"
                className="dashboard-overlay-close-btn"
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

                  <div
                    className={`ask-b01-message ask-b01-message--${msg.role === 'assistant' ? 'b01' : 'user'} ${!msg.content && msg.role === 'assistant' ? 'typing-indicator' : ''}`}
                  >
                    {msg.content ||
                      (msg.role === 'assistant' && (
                        <>
                          <span>.</span>
                          <span>.</span>
                          <span>.</span>
                        </>
                      ))}
                  </div>

                  {msg.role === 'user' && (
                    <div className="ask-b01-chat-head user-head">
                      {user?.avatarUrl || user?.avatar_url ? (
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
                      type="button"
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
                <button type="submit" className="ask-b01-send-btn" disabled={!askB01Query.trim() || isB01Typing}>
                  <IoSend />
                </button>
              </form>
              <p className="ask-b01-disclaimer">B-01 can make mistakes. Please verify important information.</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default ActivityPageMobile;

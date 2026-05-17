import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { buildRoute } from '../../utils/constants';
import { getSessionMode } from '../../utils/sessionFormatting';
import { sanitizeTranscriptForDisplay } from '../../utils/analysisTranscript';
import { getSpriteUrl } from '../../utils/assetUtils';
import { buildStagePassResultForSession } from '../../utils/passingScore';

const verbalSprite = getSpriteUrl('common/Verbal.webp');
const visualSprite = getSpriteUrl('common/Visual.webp');
const vocalSprite = getSpriteUrl('common/Vocal.webp');
import './HistoryPage.css';
import DetailedFeedbackPage from '../session/DetailedFeedbackPage';

const HISTORY_FILTERS = ['All', 'Today', 'This Week', 'This Month'];
const HISTORY_SCORE_SORT_OPTIONS = [
  { label: '81-100%', value: '4.2' },
  { label: '61-80%', value: '3.4' },
  { label: '41-60%', value: '2.6' },
  { label: '21-40%', value: '1.8' },
  { label: '0-20%', value: '1.0' },
];
const HISTORY_SCORE_SORT_NONE = '';

function buildActivityLookup(activityTasks) {
  const lookup = new Map();
  if (!Array.isArray(activityTasks)) return lookup;
  activityTasks.forEach((activity) => {
    const id = String(activity?.id || '').trim();
    if (id) lookup.set(id, activity);
  });
  return lookup;
}

function mergeSessionActivity(session, activityLookup) {
  const activity = activityLookup.get(String(session?.activity_id || '').trim());
  if (!activity) return session;
  return {
    ...session,
    activity_title: session.activity_title || activity.title || activity.objective || null,
    activity_objective: session.activity_objective || activity.objective || null,
    activity_target_level: session.activity_target_level ?? activity.target_level ?? null,
    activity_order: session.activity_order ?? activity.activity_order ?? activity.activityOrder ?? null,
    passing_score: session.passing_score ?? activity.passing_score ?? activity.passingScore ?? null,
  };
}

function formatCompactStageRequirement(requiredText) {
  return String(requiredText || '').replace(/\s+Score\b/g, '').trim();
}

function toFivePointScore(rawScore) {
  const numeric = Number(rawScore);
  if (!Number.isFinite(numeric)) return 1;
  if (numeric <= 5) return Math.round(Math.max(1, Math.min(5, numeric)) * 10) / 10;
  const normalized = Math.max(0, Math.min(100, numeric));
  return Math.round((1 + (normalized / 100) * 4) * 10) / 10;
}

function getScoreTier15(score) {
  if (score >= 3.0) return { label: 'Strong', color: '#10B981' };
  if (score >= 2.0) return { label: 'Developing', color: '#3B82F6' };
  return { label: 'Rising', color: '#F59E0B' };
}

function clamp15(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(1, Math.min(5, numeric));
}

function score100to15(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return 1 + (Math.max(0, Math.min(100, numeric)) / 100) * 4;
}

function score15ToPercent(score15) {
  const clamped = Math.max(1, Math.min(5, Number(score15) || 1));
  return Math.round(((clamped - 1) / 4) * 100);
}

function resolveSessionPillars(session) {
  const visual = clamp15(session?.visual_avg) ?? score100to15(session?.visual_score) ?? 1;
  const verbal = clamp15(session?.verbal_avg) ?? score100to15(session?.context_score) ?? 1;
  const vocal = clamp15(session?.vocal_avg) ?? score100to15(session?.acoustic_score) ?? 1;

  return [
    { key: 'visual', label: 'Visual', sprite: visualSprite, score: visual, lackHint: 'eye contact & gestures' },
    { key: 'verbal', label: 'Verbal', sprite: verbalSprite, score: verbal, lackHint: 'wording & clarity' },
    { key: 'vocal', label: 'Vocal', sprite: vocalSprite, score: vocal, lackHint: 'pace & voice control' },
  ];
}

function buildLacksSummary(pillars) {
  const sorted = [...pillars].sort((a, b) => a.score - b.score);
  const weakest = sorted.filter((pillar) => pillar.score <= 2.5);
  const shortlist = (weakest.length ? weakest : sorted.slice(0, 1)).slice(0, 2);
  const text = shortlist.map((pillar) => pillar.lackHint).join(' • ');
  return `Focus: ${text}`;
}

function sortSessionsByTargetScore(sessions, scoreTarget) {
  const target = Number(scoreTarget);
  if (!Number.isFinite(target)) return sessions;
  const { min, max } = getScoreBandBounds(scoreTarget);
  return [...sessions].sort((a, b) => {
    const scoreA = toFivePointScore(a?.confidence_score);
    const scoreB = toFivePointScore(b?.confidence_score);
    const inBandA = scoreA >= min && scoreA <= max;
    const inBandB = scoreB >= min && scoreB <= max;
    if (inBandA !== inBandB) return inBandA ? -1 : 1;
    const distanceA = Math.abs(scoreA - target);
    const distanceB = Math.abs(scoreB - target);
    if (distanceA !== distanceB) return distanceA - distanceB;
    if (scoreA !== scoreB) return target <= 2.5 ? scoreA - scoreB : scoreB - scoreA;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

function getScoreBandBounds(scoreTarget) {
  const target = Number(scoreTarget);
  if (!Number.isFinite(target)) return { min: 1, max: 1.8 };
  const clamped = Math.max(1, Math.min(5, target));
  return { min: clamped, max: Math.min(5, clamped + 0.8) };
}

function buildSessionTitleOrTopic(session) {
  const candidates = [
    session?.activity_title,
    session?.script_title,
    session?.title,
    session?.topic,
    session?.objective_name,
    session?.objective,
    session?.prompt,
    session?.free_topic,
    session?.target_text,
  ];

  const firstMatch = candidates.find((value) => typeof value === 'string' && value.trim());
  let result = '';

  if (firstMatch) {
    result = firstMatch.trim();
  } else {
    const transcript = sanitizeTranscriptForDisplay(session?.transcript, '');
    if (transcript) {
      result = transcript;
    } else {
      const mode = getSessionMode(session);
      if (mode === 'Pre-Test') result = 'Pre-Test Session';
      else if (mode === 'Practice') result = 'Practice Session';
      else result = 'Training Session';
    }
  }

  // Truncate to first 3 words as requested
  const words = result.split(/\s+/);
  if (words.length > 3) {
    return words.slice(0, 3).join(' ') + '...';
  }
  return result;
}

function getResponsiveHistoryPageSize(viewportHeight = 0) {
  if (viewportHeight >= 1300) return 5;
  if (viewportHeight >= 900) return 4;
  return 3;
}

function getAdaptiveHistoryPages(pageCount, activePage) {
  if (pageCount <= 6) return Array.from({ length: pageCount }, (_, index) => index);
  const leadingWindow = [0, 1, 2, 3].filter((index) => index < pageCount - 1);
  const trailingWindow = [pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1].filter((index) => index > 0);
  if (activePage < Math.ceil(pageCount / 2)) return [...leadingWindow, 'end-ellipsis', pageCount - 1];
  return [0, 'start-ellipsis', ...trailingWindow];
}

export default function HistoryPage({ isOpen, onClose, userSessions = [], isLoading, isMobile = false, activityTasks = [] }) {
  const navigate = useNavigate();
  const [historyFilter, setHistoryFilter] = useState('All');
  const [scoreSortTarget, setScoreSortTarget] = useState(HISTORY_SCORE_SORT_NONE);
  const [historyPage, setHistoryPage] = useState(0);
  const [selectedSessionId, setSelectedSessionId] = useState(null); // State for selected session ID
  const [innerViewMode, setInnerViewMode] = useState('results'); // 'results' or 'detailed'

  // Reset inner view mode to results when opening a new session
  useEffect(() => {
    if (selectedSessionId) {
      setInnerViewMode('results');
    }
  }, [selectedSessionId]);
  const [historyPageSize, setHistoryPageSize] = useState(() =>
    getResponsiveHistoryPageSize(typeof window !== 'undefined' ? window.innerHeight : 1080)
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const syncHistoryPageSize = () => setHistoryPageSize(getResponsiveHistoryPageSize(window.innerHeight));
    window.addEventListener('resize', syncHistoryPageSize);
    return () => window.removeEventListener('resize', syncHistoryPageSize);
  }, []);

  const dateFilteredHistorySessions = useMemo(() => {
    const filtered = userSessions.filter((s) => {
      const d = new Date(s.created_at);
      if (historyFilter === 'Today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d >= today;
      }
      if (historyFilter === 'This Week') {
        const week = new Date();
        week.setDate(week.getDate() - 7);
        return d >= week;
      }
      if (historyFilter === 'This Month') {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        return d >= monthStart;
      }
      return true;
    });
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [historyFilter, userSessions]);

  const historySessions = useMemo(() => {
    if (scoreSortTarget === HISTORY_SCORE_SORT_NONE) return dateFilteredHistorySessions;
    const { min, max } = getScoreBandBounds(scoreSortTarget);
    const scoreBandMatches = dateFilteredHistorySessions.filter((session) => {
      const score = toFivePointScore(session?.confidence_score);
      return score >= min && score <= max;
    });
    return sortSessionsByTargetScore(scoreBandMatches, scoreSortTarget);
  }, [dateFilteredHistorySessions, scoreSortTarget]);

  const sessionsForDisplay = historySessions;

  const historyPageCount = useMemo(() => Math.ceil(sessionsForDisplay.length / historyPageSize), [sessionsForDisplay.length, historyPageSize]);
  const safeHistoryPage = Math.min(historyPage, Math.max(0, historyPageCount - 1));
  const paginationPageCount = Math.max(1, historyPageCount);
  const paginatedHistorySessions = useMemo(() => {
    const start = safeHistoryPage * historyPageSize;
    return sessionsForDisplay.slice(start, start + historyPageSize);
  }, [safeHistoryPage, sessionsForDisplay, historyPageSize]);
  const adaptiveHistoryPages = useMemo(
    () => getAdaptiveHistoryPages(paginationPageCount, safeHistoryPage),
    [paginationPageCount, safeHistoryPage]
  );
  const activityLookup = useMemo(() => buildActivityLookup(activityTasks), [activityTasks]);

  if (!isOpen) return null;

  const historyControls = (
    <div className="history-controls">
      <div className="history-sort-row">
        <div className="history-score-sort">
          <select
            className="history-score-sort-select"
            value={scoreSortTarget}
            onChange={(event) => {
              setScoreSortTarget(event.target.value);
              setHistoryPage(0);
            }}
            aria-label="Sort history by score target"
          >
            <option value={HISTORY_SCORE_SORT_NONE}>---</option>
            {HISTORY_SCORE_SORT_OPTIONS.map((opt) => (
              <option key={`score-sort-${opt.value}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="history-filters">
        {HISTORY_FILTERS.map((f) => (
          <button
            key={f}
            className={`history-filter-btn ${historyFilter === f ? 'active' : ''}`}
            onClick={() => {
              setHistoryFilter(f);
              setHistoryPage(0);
            }}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );

  const handleClose = () => {
    if (selectedSessionId) {
      setSelectedSessionId(null);
    } else {
      onClose();
    }
  };

  return (
    <>
      <div className="bigkas-modal-scrim" onClick={handleClose} style={{ '--scrim-z': 1100 }} aria-hidden="true" />
      <div
        id="progress-history-sidebar"
        className={`progress-history-sidebar history-visible${isMobile ? ' progress-history-sidebar--mobile' : ''} ${selectedSessionId ? 'history-viewing-session' : ''}`}
      >
        <div className={`history-container ${selectedSessionId ? 'slide-out-left' : 'slide-in-right'}`}>
          <div className={`${isMobile ? 'history-overlay-header' : 'history-sticky-header'} dashboard-anim-top dashboard-anim-delay-1`}>
            <div className="history-header-row">
              {isMobile ? (
                <div className="history-title-row">
                  <h2 className="history-title">History</h2>
                  <button
                    type="button"
                    className="dashboard-overlay-close-btn"
                    onClick={handleClose}
                    aria-label="Close history"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="history-title">History</h2>
                  <div className="history-score-sort history-score-sort--inline">
                    <span className="history-score-sort-label">Sort score</span>
                    <select
                      className="history-score-sort-select"
                      value={scoreSortTarget}
                      onChange={(event) => {
                        setScoreSortTarget(event.target.value);
                        setHistoryPage(0);
                      }}
                      aria-label="Sort history by score target"
                    >
                      <option value={HISTORY_SCORE_SORT_NONE}>---</option>
                      {HISTORY_SCORE_SORT_OPTIONS.map((opt) => (
                        <option key={`score-sort-${opt.value}`} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="history-filters">
                    {HISTORY_FILTERS.map((f) => (
                      <button
                        key={f}
                        className={`history-filter-btn ${historyFilter === f ? 'active' : ''}`}
                        onClick={() => {
                          setHistoryFilter(f);
                          setHistoryPage(0);
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          {isMobile ? historyControls : null}

          <div className="history-overlay-scroll-content">
            <div className="history-list">
              {paginatedHistorySessions.map((s, index) => {
                const sessionForStage = mergeSessionActivity(s, activityLookup);
                const mode = getSessionMode(s);
                const score = toFivePointScore(s.confidence_score);
                const tier = getScoreTier15(score);
                const pillars = resolveSessionPillars(s);
                const lacksSummary = buildLacksSummary(pillars);
                const stageGoal = buildStagePassResultForSession(sessionForStage);
                const stageGoalColor = stageGoal?.passed ? '#059669' : '#2563EB';
                const stageRequirement = formatCompactStageRequirement(stageGoal?.requiredText);
                const delay = Math.min(index + 2, 9);
                const dateObj = new Date(s.created_at);
                const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

                return (
                  <div
                    key={s.id}
                    className={`history-item dashboard-anim-bottom dashboard-anim-delay-${delay}`}
                    onClick={() => {
                      setSelectedSessionId(s.id); // Set selected session ID instead of navigating
                    }}
                    style={{
                      '--tier-color': tier.color,
                      '--tier-border': `${tier.color}2e`,
                      '--tier-border-hover': `${tier.color}5a`,
                      '--stage-goal-color': stageGoalColor,
                      '--stage-goal-bg': `${stageGoalColor}12`,
                      '--stage-goal-border': `${stageGoalColor}36`,
                    }}
                  >
                    <div className="history-item-row-left">
                      <div className="history-item-title-section">
                        <h3 className="history-item-main-title">{buildSessionTitleOrTopic(sessionForStage)}</h3>
                        <p className="history-item-session-type">{mode}</p>
                      </div>
                    </div>

                    <div className="history-item-row-center">
                      <div className="history-item-info-compact">
                        <p className="history-item-info-line">{formattedDate} • {formattedTime}</p>
                        <p className="history-item-lacks-line">{lacksSummary}</p>
                        {stageGoal ? (
                          <div className={`history-item-stage-goal ${stageGoal.passed ? 'history-item-stage-goal--unlocked' : 'history-item-stage-goal--next'}`}>
                            <span className="history-item-stage-goal-label">
                              {stageGoal.passed ? 'Unlocked' : 'Next goal'}
                            </span>
                            {stageRequirement ? (
                              <span className="history-item-stage-goal-text">{stageRequirement}</span>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="history-item-pillars">
                          {pillars.map((pillar) => (
                            <div
                              key={pillar.key}
                              className={`history-item-pillar-chip ${
                                pillar.score <= 2.0
                                  ? 'history-item-pillar-chip--rising'
                                  : pillar.score <= 3.0
                                    ? 'history-item-pillar-chip--developing'
                                    : 'history-item-pillar-chip--strong'
                              }`}
                            >
                              <img src={pillar.sprite} alt={pillar.label} className="history-item-pillar-sprite" />
                              <span className="history-item-pillar-label">{pillar.label}</span>
                              <span className="history-item-pillar-score">{Math.round(score15ToPercent(pillar.score))}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="history-item-row-right">
                      <div className="history-item-performance-section">
                        <span className="history-item-badge" style={{ borderColor: tier.color, backgroundColor: `${tier.color}15` }}>
                          <span className="history-item-badge-dot" style={{ backgroundColor: tier.color }} />
                          {tier.label}
                        </span>
                        <div className="history-item-score-label-compact">Confidence</div>
                      </div>

                      <div className="history-item-score-compact">
                        <div
                          className="history-item-score-ring-compact"
                          style={{
                            background: `conic-gradient(${tier.color} ${(score / 5) * 100}%, #f1f5f9 0)`
                          }}
                        >
                          <div className="history-item-score-ring-inner-compact">
                            {Math.round(score15ToPercent(score))}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="history-item-glow" style={{ background: `radial-gradient(circle at bottom, ${tier.color} 0%, transparent 70%)` }} />
                  </div>
                );
              })}

              {isLoading && sessionsForDisplay.length === 0 && (
                <p style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>Loading history...</p>
              )}
              {!isLoading && sessionsForDisplay.length === 0 && (
                <p style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>No sessions found.</p>
              )}
            </div>

            {!isLoading && (
              <div className="history-pagination-shell">
                <ul className="history-pagination" aria-label="History pagination">
                  <li className={`history-pagination-page history-pagination-nav ${safeHistoryPage <= 0 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="history-pagination-link"
                      onClick={() => setHistoryPage((current) => Math.max(0, current - 1))}
                      disabled={safeHistoryPage <= 0 || paginationPageCount <= 1}
                    >
                      <IoChevronBack />
                    </button>
                  </li>

                  {adaptiveHistoryPages.map((entry, idx) => {
                    if (entry === 'start-ellipsis' || entry === 'end-ellipsis') {
                      return <li key={`${entry}-${idx}`} className="history-pagination-break">...</li>;
                    }
                    const isActive = entry === safeHistoryPage;
                    return (
                      <li key={`page-${entry}`} className={`history-pagination-page ${isActive ? 'active' : ''}`}>
                        <button
                          type="button"
                          className="history-pagination-link"
                          onClick={() => setHistoryPage(entry)}
                        >
                          {entry + 1}
                        </button>
                      </li>
                    );
                  })}

                  <li className={`history-pagination-page history-pagination-nav ${safeHistoryPage >= paginationPageCount - 1 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="history-pagination-link"
                      onClick={() => setHistoryPage((current) => Math.min(paginationPageCount - 1, current + 1))}
                      disabled={safeHistoryPage >= paginationPageCount - 1 || paginationPageCount <= 1}
                    >
                      <IoChevronForward />
                    </button>
                  </li>
                </ul>
              </div>
            )}

            <div className="history-footer">
              <button
                className="history-back-btn"
                onClick={onClose}
              >
                Close History
              </button>
            </div>
          </div>
        </div>

        {selectedSessionId && (
          <div className="history-session-view slide-in-right">
             <div className="history-session-view-header dashboard-anim-top">
                <button
                  type="button"
                  className="history-back-to-list-btn"
                  onClick={() => {
                    if (innerViewMode === 'detailed') {
                      setInnerViewMode('results');
                    } else {
                      setSelectedSessionId(null);
                    }
                  }}
                >
                   <IoChevronBack /> {innerViewMode === 'detailed' ? 'Back to Results' : 'Back to History'}
                </button>
             </div>
             <div className="history-session-view-content dashboard-anim-bottom dashboard-anim-delay-1">
                <DetailedFeedbackPage 
                  sessionIdProp={selectedSessionId} 
                  isInnerView={true} 
                  initialShowDetailed={innerViewMode === 'detailed'}
                  activityTasks={activityTasks}
                  onCloseInner={() => {
                    if (innerViewMode === 'detailed') {
                      setInnerViewMode('results');
                    } else {
                      setSelectedSessionId(null);
                    }
                  }}
                  onViewDetailed={() => setInnerViewMode('detailed')}
                />
             </div>
          </div>
        )}
      </div>
    </>
  );
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { buildRoute } from '../../utils/constants';
import { getSessionMode } from '../../utils/sessionFormatting';
import { sanitizeTranscriptForDisplay } from '../../utils/analysisTranscript';
import verbalSprite from '../../assets/Sprites/common/Verbal.png';
import visualSprite from '../../assets/Sprites/common/Visual.png';
import vocalSprite from '../../assets/Sprites/common/Vocal.png';
import './HistoryPage.css';

const HISTORY_FILTERS = ['All', 'Today', 'This Week', 'This Month'];
const HISTORY_SCORE_SORT_OPTIONS = [5, 4, 3, 2, 1];

function toFivePointScore(rawScore) {
  const numeric = Number(rawScore);
  if (!Number.isFinite(numeric)) return 1;
  if (numeric <= 5) return Math.round(Math.max(1, Math.min(5, numeric)) * 10) / 10;
  const normalized = Math.max(0, Math.min(100, numeric));
  return Math.round((1 + (normalized / 100) * 4) * 10) / 10;
}

function getScoreTier15(score) {
  if (score >= 4.0) return { label: 'Excellent', color: '#5A7863' };
  if (score >= 3.0) return { label: 'Good', color: '#90AB8B' };
  if (score >= 2.0) return { label: 'Fair', color: '#F18F01' };
  return { label: 'Needs Work', color: '#D94F3B' };
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
  return `Lacks: ${text}`;
}

function sortSessionsByTargetScore(sessions, scoreTarget) {
  const target = Number(scoreTarget);
  if (!Number.isFinite(target)) return sessions;
  return [...sessions].sort((a, b) => {
    const scoreA = toFivePointScore(a?.confidence_score);
    const scoreB = toFivePointScore(b?.confidence_score);
    const deltaA = Math.abs(scoreA - target);
    const deltaB = Math.abs(scoreB - target);
    if (deltaA !== deltaB) return deltaA - deltaB;
    if (scoreA !== scoreB) {
      return target <= 2.5 ? scoreA - scoreB : scoreB - scoreA;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });
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
  if (firstMatch) return firstMatch.trim();

  const transcript = sanitizeTranscriptForDisplay(session?.transcript, '');
  if (transcript) {
    return transcript.length > 64 ? `${transcript.slice(0, 61)}...` : transcript;
  }

  const mode = getSessionMode(session);
  if (mode === 'Pre-Test') return 'Pre-Test Session';
  if (mode === 'Practice') return 'Practice Session';
  return 'Training Session';
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

export default function HistoryPage({ isOpen, onClose, userSessions = [], isLoading }) {
  const navigate = useNavigate();
  const scoreMenuRef = useRef(null);
  const [historyFilter, setHistoryFilter] = useState('All');
  const [scoreSortTarget, setScoreSortTarget] = useState('5.0');
  const [scoreMenuOpen, setScoreMenuOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(() =>
    getResponsiveHistoryPageSize(typeof window !== 'undefined' ? window.innerHeight : 1080)
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const syncHistoryPageSize = () => setHistoryPageSize(getResponsiveHistoryPageSize(window.innerHeight));
    window.addEventListener('resize', syncHistoryPageSize);
    return () => window.removeEventListener('resize', syncHistoryPageSize);
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!scoreMenuRef.current?.contains(event.target)) {
        setScoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const historySessions = useMemo(() => {
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
    return sortSessionsByTargetScore(filtered, scoreSortTarget);
  }, [historyFilter, scoreSortTarget, userSessions]);

  const historyPageCount = useMemo(() => Math.ceil(historySessions.length / historyPageSize), [historySessions.length, historyPageSize]);
  const safeHistoryPage = Math.min(historyPage, Math.max(0, historyPageCount - 1));
  const paginationPageCount = Math.max(1, historyPageCount);
  const paginatedHistorySessions = useMemo(() => {
    const start = safeHistoryPage * historyPageSize;
    return historySessions.slice(start, start + historyPageSize);
  }, [safeHistoryPage, historySessions, historyPageSize]);
  const adaptiveHistoryPages = useMemo(
    () => getAdaptiveHistoryPages(paginationPageCount, safeHistoryPage),
    [paginationPageCount, safeHistoryPage]
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="bigkas-modal-scrim" onClick={onClose} style={{ '--scrim-z': 1100 }} aria-hidden="true" />
      <div id="progress-history-sidebar" className="progress-history-sidebar history-visible">
        <div className="history-container">
          <div className="history-sticky-header dashboard-anim-top dashboard-anim-delay-1">
            <div className="history-header-row">
              <h2 className="history-title">History</h2>
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
            <div className="history-sort-row">
              <div className="history-score-sort" ref={scoreMenuRef}>
                <span className="history-score-sort-label">Sort score</span>
                <button
                  type="button"
                  className={`history-score-sort-trigger ${scoreMenuOpen ? 'open' : ''}`}
                  onClick={() => setScoreMenuOpen((current) => !current)}
                  aria-haspopup="menu"
                  aria-expanded={scoreMenuOpen}
                >
                  {scoreSortTarget}
                </button>
                {scoreMenuOpen && (
                  <div className="history-score-sort-menu" role="menu" aria-label="Sort score options">
                    {HISTORY_SCORE_SORT_OPTIONS.map((scoreOption) => {
                      const optionValue = scoreOption.toFixed(1);
                      const isActive = scoreSortTarget === optionValue;
                      return (
                        <button
                          key={`score-sort-${optionValue}`}
                          type="button"
                          role="menuitemradio"
                          aria-checked={isActive}
                          className={`history-score-sort-option ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            setScoreSortTarget(optionValue);
                            setHistoryPage(0);
                            setScoreMenuOpen(false);
                          }}
                        >
                          {optionValue}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="history-list">
            {paginatedHistorySessions.map((s, index) => {
              const mode = getSessionMode(s);
              const score = toFivePointScore(s.confidence_score);
              const tier = getScoreTier15(score);
              const pillars = resolveSessionPillars(s);
              const lacksSummary = buildLacksSummary(pillars);
              const delay = Math.min(index + 2, 9);
              const dateObj = new Date(s.created_at);
              const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

              return (
                <div
                  key={s.id}
                  className={`history-item dashboard-anim-bottom dashboard-anim-delay-${delay}`}
                  onClick={() => {
                    onClose();
                    navigate(buildRoute.sessionResult(s.id), { state: { ...s, source: 'progress' } });
                  }}
                  style={{
                    '--tier-color': tier.color,
                    '--tier-border': `${tier.color}2e`,
                    '--tier-border-hover': `${tier.color}5a`,
                  }}
                >
                  <div className="history-item-row-left">
                    <div className="history-item-title-section">
                      <h3 className="history-item-main-title">{buildSessionTitleOrTopic(s)}</h3>
                      <p className="history-item-session-type">{mode}</p>
                    </div>
                  </div>

                  <div className="history-item-row-center">
                    <div className="history-item-info-compact">
                      <p className="history-item-info-line">{formattedDate} • {formattedTime}</p>
                      <p className="history-item-lacks-line">{lacksSummary}</p>
                      <div className="history-item-pillars">
                        {pillars.map((pillar) => (
                          <div
                            key={pillar.key}
                            className={`history-item-pillar-chip ${
                              pillar.score <= 2.0
                                ? 'history-item-pillar-chip--critical'
                                : pillar.score <= 3.0
                                  ? 'history-item-pillar-chip--warning'
                                  : 'history-item-pillar-chip--healthy'
                            }`}
                          >
                            <img src={pillar.sprite} alt={pillar.label} className="history-item-pillar-sprite" />
                            <span className="history-item-pillar-label">{pillar.label}</span>
                            <span className="history-item-pillar-score">{pillar.score.toFixed(1)}</span>
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
                    </div>

                    <div className="history-item-score-compact">
                      <div className="history-item-score-label-compact">Confidence</div>
                      <div
                        className="history-item-score-ring-compact"
                        style={{
                          background: `conic-gradient(${tier.color} ${(score / 5) * 100}%, #f1f5f9 0)`
                        }}
                      >
                        <div className="history-item-score-ring-inner-compact">
                          {score.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="history-item-glow" style={{ background: `radial-gradient(circle at bottom, ${tier.color} 0%, transparent 70%)` }} />
                </div>
              );
            })}

            {isLoading && historySessions.length === 0 && (
              <p style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>Loading history...</p>
            )}
            {!isLoading && historySessions.length === 0 && (
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
    </>
  );
}

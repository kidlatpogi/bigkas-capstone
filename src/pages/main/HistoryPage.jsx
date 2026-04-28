import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { buildRoute } from '../../utils/constants';
import { getSessionMode } from '../../utils/sessionFormatting';
import { sanitizeTranscriptForDisplay } from '../../utils/analysisTranscript';
import './HistoryPage.css';

const HISTORY_FILTERS = ['All', 'Today', 'This Week', 'This Month'];

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
  const [historyFilter, setHistoryFilter] = useState('All');
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
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [historyFilter, userSessions]);

  const historyPageCount = useMemo(() => Math.ceil(historySessions.length / historyPageSize), [historySessions.length, historyPageSize]);
  const safeHistoryPage = Math.min(historyPage, Math.max(0, historyPageCount - 1));
  const paginatedHistorySessions = useMemo(() => {
    const start = safeHistoryPage * historyPageSize;
    return historySessions.slice(start, start + historyPageSize);
  }, [safeHistoryPage, historySessions, historyPageSize]);
  const adaptiveHistoryPages = useMemo(() => getAdaptiveHistoryPages(historyPageCount, safeHistoryPage), [historyPageCount, safeHistoryPage]);

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
          </div>

          <div className="history-list">
            {paginatedHistorySessions.map((s, index) => {
              const mode = getSessionMode(s);
              const score = toFivePointScore(s.confidence_score);
              const tier = getScoreTier15(score);
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
                  style={{ '--tier-color': tier.color }}
                >
                  <div className="history-item-content">
                    <div className="history-item-left">
                      <p className="history-item-date">{formattedDate} • {formattedTime}</p>
                      <h3 className="history-item-main-title">{buildSessionTitleOrTopic(s)}</h3>
                    </div>
                    <div className="history-item-right">
                      <div className="history-item-stat">
                        <span className="history-item-comparison">10% better than last session</span>
                        <span className="history-item-tier" style={{ color: tier.color }}>{tier.label}</span>
                      </div>
                      <div className="history-item-score-wrapper">
                        <div
                          className="history-item-score-ring"
                          style={{
                            background: `conic-gradient(${tier.color} ${(score / 5) * 100}%, #f1f5f9 0)`
                          }}
                        >
                          <div className="history-item-score-ring-inner">
                            {score.toFixed(1)}
                          </div>
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

          {!isLoading && historyPageCount > 1 && (
            <div className="history-pagination-shell">
              <ul className="history-pagination" aria-label="History pagination">
                <li className={`history-pagination-page history-pagination-nav ${safeHistoryPage <= 0 ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="history-pagination-link"
                    onClick={() => setHistoryPage((current) => Math.max(0, current - 1))}
                    disabled={safeHistoryPage <= 0}
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

                <li className={`history-pagination-page history-pagination-nav ${safeHistoryPage >= historyPageCount - 1 ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="history-pagination-link"
                    onClick={() => setHistoryPage((current) => Math.min(historyPageCount - 1, current + 1))}
                    disabled={safeHistoryPage >= historyPageCount - 1}
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
              Back
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

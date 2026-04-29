import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { buildRoute } from '../../utils/constants';
import { getSessionMode } from '../../utils/sessionFormatting';
import { sanitizeTranscriptForDisplay } from '../../utils/analysisTranscript';
import verbalSprite from '../../assets/Sprites/common/Verbal.png';
import visualSprite from '../../assets/Sprites/common/Visual.png';
import vocalSprite from '../../assets/Sprites/common/Vocal.png';
import SessionResultPage from '../session/SessionResultPage';
import DetailedFeedbackPage from '../session/DetailedFeedbackPage';
import './HistoryPage.css';

const HISTORY_FILTERS = ['All', 'Today', 'This Week', 'This Month'];
const HISTORY_SCORE_SORT_OPTIONS = [5, 4, 3, 2, 1];
const HISTORY_SCORE_SORT_NONE = '';

// --- Helpers (1:1 with HistoryPage) ---
function toFivePointScore(rawScore) {
  const numeric = Number(rawScore);
  if (!Number.isFinite(numeric)) return 1;
  if (numeric <= 5) return Math.round(Math.max(1, Math.min(5, numeric)) * 10) / 10;
  const normalized = Math.max(0, Math.min(100, numeric));
  return Math.round((1 + (normalized / 100) * 4) * 10) / 10;
}

function getScoreTier15(score) {
  if (score >= 4.0) return { label: 'Excellent', color: '#059669' };
  if (score >= 3.0) return { label: 'Good', color: '#059669' };
  if (score >= 2.0) return { label: 'Fair', color: '#F97316' };
  return { label: 'Needs Work', color: '#FF0000' };
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
  return `Lacks: ${shortlist.map((pillar) => pillar.lackHint).join(' • ')}`;
}

function getScoreBandBounds(scoreTarget) {
  const target = Number(scoreTarget);
  if (!Number.isFinite(target)) return { min: 1, max: 1.9 };
  const clamped = Math.max(1, Math.min(5, target));
  if (clamped >= 5) return { min: 5, max: 5 };
  return { min: clamped, max: Math.min(5, clamped + 0.9) };
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
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

function buildSessionTitleOrTopic(session) {
  const candidates = [session?.activity_title, session?.script_title, session?.title, session?.topic, session?.target_text];
  const firstMatch = candidates.find((v) => typeof v === 'string' && v.trim());
  if (firstMatch) return firstMatch.trim();
  const transcript = sanitizeTranscriptForDisplay(session?.transcript, '');
  if (transcript) return transcript.length > 64 ? `${transcript.slice(0, 61)}...` : transcript;
  return 'Training Session';
}

function getAdaptiveHistoryPages(pageCount, activePage) {
  if (pageCount <= 6) return Array.from({ length: pageCount }, (_, idx) => idx);
  const leading = [0, 1, 2, 3].filter(i => i < pageCount - 1);
  const trailing = [pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1].filter(i => i > 0);
  if (activePage < Math.ceil(pageCount / 2)) return [...leading, 'end-ellipsis', pageCount - 1];
  return [0, 'start-ellipsis', ...trailing];
}

// --- Main Component ---
export default function HistoryPageMobile({ isOpen, onClose, userSessions = [], isLoading }) {
  const navigate = useNavigate();
  const [historyFilter, setHistoryFilter] = useState('All');
  const [scoreSortTarget, setScoreSortTarget] = useState(HISTORY_SCORE_SORT_NONE);
  const [historyPage, setHistoryPage] = useState(0);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [innerViewMode, setInnerViewMode] = useState('results');
  const historyPageSize = 3; // Fixed for mobile

  useEffect(() => {
    if (selectedSessionId) setInnerViewMode('results');
  }, [selectedSessionId]);

  const dateFilteredSessions = useMemo(() => {
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
    if (scoreSortTarget === HISTORY_SCORE_SORT_NONE) return dateFilteredSessions;
    const { min, max } = getScoreBandBounds(scoreSortTarget);
    const scoreBandMatches = dateFilteredSessions.filter((s) => {
      const score = toFivePointScore(s?.confidence_score);
      return score >= min && score <= max;
    });
    return sortSessionsByTargetScore(scoreBandMatches, scoreSortTarget);
  }, [dateFilteredSessions, scoreSortTarget]);

  const pageCount = Math.ceil(historySessions.length / historyPageSize);
  const safePage = Math.min(historyPage, Math.max(0, pageCount - 1));
  const paginatedSessions = useMemo(() => {
    const start = safePage * historyPageSize;
    return historySessions.slice(start, start + historyPageSize);
  }, [safePage, historySessions]);

  const adaptivePages = useMemo(() => getAdaptiveHistoryPages(pageCount, safePage), [pageCount, safePage]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (selectedSessionId) setSelectedSessionId(null);
    else onClose();
  };

  return (
    <>
      <div className="bigkas-modal-scrim" onClick={handleClose} style={{ '--scrim-z': 1100 }} aria-hidden="true" />
      <div id="progress-history-sidebar" className={`progress-history-sidebar history-visible progress-history-sidebar--mobile ${selectedSessionId ? 'history-viewing-session' : ''}`}>
        <div className={`history-container ${selectedSessionId ? 'slide-out-left' : 'slide-in-right'}`}>
          
          <div className="history-overlay-header dashboard-anim-top">
            <div className="history-title-row">
              <h2 className="history-title">History</h2>
              <button type="button" className="history-mobile-close-btn" onClick={onClose} style={{ display: 'flex' }}>×</button>
            </div>
          </div>

          {/* Fixed History Controls for Mobile */}
          <div className="history-controls" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px', padding: '12px 24px' }}>
            <div className="history-filters" style={{ width: 'fit-content', display: 'flex', gap: '4px', background: '#f1f5f9', padding: '5px', borderRadius: '999px' }}>
              {HISTORY_FILTERS.map((f) => (
                <button
                  key={f}
                  className={`history-filter-btn ${historyFilter === f ? 'active' : ''}`}
                  onClick={() => { setHistoryFilter(f); setHistoryPage(0); }}
                  style={{ 
                    padding: '6px 14px', 
                    fontSize: '12px', 
                    fontWeight: 700, 
                    borderRadius: '999px', 
                    border: 'none',
                    background: historyFilter === f ? '#059669' : 'transparent',
                    color: historyFilter === f ? '#fff' : '#64748b',
                    minHeight: 'auto',
                    boxShadow: historyFilter === f ? '0 4px 12px rgba(5, 150, 105, 0.2)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            
            <div className="history-sort-row" style={{ justifyContent: 'space-between', width: '100%' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Target Score</span>
              <select
                className="history-score-sort-select"
                value={scoreSortTarget}
                onChange={(e) => { setScoreSortTarget(e.target.value); setHistoryPage(0); }}
                style={{ minHeight: '36px', height: '36px', padding: '0 32px 0 16px', minWidth: '120px' }}
              >
                <option value={HISTORY_SCORE_SORT_NONE}>All Scores</option>
                {HISTORY_SCORE_SORT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt.toFixed(1)}>{opt.toFixed(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="history-overlay-scroll-content">
            <div className="history-list" style={{ padding: '16px 24px 24px' }}>
              {paginatedSessions.map((s, idx) => {
                const score = toFivePointScore(s.confidence_score);
                const tier = getScoreTier15(score);
                const pillars = resolveSessionPillars(s);
                const dateObj = new Date(s.created_at);
                const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                
                return (
                  <div
                    key={s.id}
                    className={`history-item dashboard-anim-bottom`}
                    onClick={() => setSelectedSessionId(s.id)}
                    style={{ 
                      '--tier-color': tier.color, 
                      '--tier-border': `${tier.color}2e`, 
                      marginBottom: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <h3 className="history-item-main-title" style={{ fontSize: '0.95rem' }}>{buildSessionTitleOrTopic(s)}</h3>
                        <p className="history-item-session-type" style={{ fontSize: '0.7rem' }}>{getSessionMode(s)} • {formattedDate}</p>
                      </div>
                      <div className="history-item-score-ring-compact" style={{ width: '40px', height: '40px', background: `conic-gradient(${tier.color} ${(score/5)*100}%, #f1f5f9 0)` }}>
                        <div className="history-item-score-ring-inner-compact" style={{ width: '30px', height: '30px', fontSize: '11px' }}>{score.toFixed(1)}</div>
                      </div>
                    </div>
                    
                    <div className="history-item-pillars" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {pillars.map(p => (
                        <div 
                          key={p.key} 
                          className={`history-item-pillar-chip ${p.score <= 2.0 ? 'history-item-pillar-chip--critical' : p.score <= 3.0 ? 'history-item-pillar-chip--warning' : 'history-item-pillar-chip--healthy'}`} 
                          style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '12px', minHeight: 'auto' }}
                        >
                          <img src={p.sprite} alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                          <span style={{ fontSize: '11px', fontWeight: 800 }}>{p.label} {p.score.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {isLoading && <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>Loading...</p>}
              {!isLoading && historySessions.length === 0 && <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>No sessions found.</p>}
            </div>

            {pageCount > 1 && (
              <div className="history-pagination-shell" style={{ marginBottom: '24px' }}>
                <ul className="history-pagination">
                  <li className={`history-pagination-page ${safePage <= 0 ? 'disabled' : ''}`}>
                    <button className="history-pagination-link" onClick={() => setHistoryPage(p => Math.max(0, p - 1))} disabled={safePage <= 0}><IoChevronBack /></button>
                  </li>
                  {adaptivePages.map((p, i) => (
                    <li key={i} className={`history-pagination-page ${p === safePage ? 'active' : ''} ${typeof p !== 'number' ? 'history-pagination-break' : ''}`}>
                      {typeof p === 'number' ? (
                        <button className="history-pagination-link" onClick={() => setHistoryPage(p)}>{p + 1}</button>
                      ) : '...'}
                    </li>
                  ))}
                  <li className={`history-pagination-page ${safePage >= pageCount - 1 ? 'disabled' : ''}`}>
                    <button className="history-pagination-link" onClick={() => setHistoryPage(p => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1}><IoChevronForward /></button>
                  </li>
                </ul>
              </div>
            )}

            <div className="history-footer" style={{ position: 'static', padding: '0 24px 24px', background: 'transparent' }}>
              <button className="history-back-btn" onClick={onClose} style={{ width: '100%', maxWidth: 'none' }}>Close History</button>
            </div>
          </div>
        </div>

        {selectedSessionId && (
          <div className="history-session-view slide-in-right">
             <div className="history-session-view-header">
                <button type="button" className="history-back-to-list-btn" onClick={() => { if (innerViewMode === 'detailed') setInnerViewMode('results'); else setSelectedSessionId(null); }}>
                   <IoChevronBack /> {innerViewMode === 'detailed' ? 'Back to Results' : 'Back to History'}
                </button>
             </div>
             <div className="history-session-view-content">
                {innerViewMode === 'results' ? (
                  <SessionResultPage sessionIdProp={selectedSessionId} isInnerView={true} onCloseInner={() => setSelectedSessionId(null)} onViewDetailed={() => setInnerViewMode('detailed')} />
                ) : (
                  <DetailedFeedbackPage sessionIdProp={selectedSessionId} isInnerView={true} onCloseInner={() => setInnerViewMode('results')} />
                )}
             </div>
          </div>
        )}
      </div>
    </>
  );
}

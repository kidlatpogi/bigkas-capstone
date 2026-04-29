import React, { useState, useEffect, useMemo } from 'react';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
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

// --- Helpers ---
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
    { key: 'visual', label: 'Visual', sprite: visualSprite, score: visual, lackHint: 'eye contact' },
    { key: 'verbal', label: 'Verbal', sprite: verbalSprite, score: verbal, lackHint: 'clarity' },
    { key: 'vocal', label: 'Vocal', sprite: vocalSprite, score: vocal, lackHint: 'pace' },
  ];
}

function buildLacksSummary(pillars) {
  const sorted = [...pillars].sort((a, b) => a.score - b.score);
  const weakest = sorted.filter((pillar) => pillar.score <= 2.5);
  const shortlist = (weakest.length ? weakest : sorted.slice(0, 1)).slice(0, 2);
  return `Lacks: ${shortlist.map(p => p.lackHint).join(' • ')}`;
}

function buildSessionTitleOrTopic(session) {
  const candidates = [session?.activity_title, session?.script_title, session?.title, session?.topic];
  const firstMatch = candidates.find((value) => typeof value === 'string' && value.trim());
  if (firstMatch) return firstMatch.trim();
  const transcript = sanitizeTranscriptForDisplay(session?.transcript, '');
  if (transcript) return transcript.length > 40 ? `${transcript.slice(0, 37)}...` : transcript;
  return getSessionMode(session) + ' Session';
}

function getScoreBandBounds(scoreTarget) {
  const target = Number(scoreTarget);
  if (!Number.isFinite(target)) return { min: 1, max: 1.9 };
  const clamped = Math.max(1, Math.min(5, target));
  if (clamped >= 5) return { min: 5, max: 5 };
  return { min: clamped, max: Math.min(5, clamped + 0.9) };
}

// --- Component ---
function HistoryPageMobile({ isOpen, onClose, userSessions = [], isLoading }) {
  const [historyFilter, setHistoryFilter] = useState('All');
  const [scoreSortTarget, setScoreSortTarget] = useState(HISTORY_SCORE_SORT_NONE);
  const [historyPage, setHistoryPage] = useState(0);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [innerViewMode, setInnerViewMode] = useState('results');
  const pageSize = 4;

  useEffect(() => {
    if (selectedSessionId) setInnerViewMode('results');
  }, [selectedSessionId]);

  const filteredHistorySessions = useMemo(() => {
    let result = userSessions.filter((s) => {
      const d = new Date(s.created_at);
      if (historyFilter === 'Today') {
        const today = new Date();
        today.setHours(0,0,0,0);
        return d >= today;
      }
      if (historyFilter === 'This Week') {
        const week = new Date();
        week.setDate(week.getDate() - 7);
        return d >= week;
      }
      if (historyFilter === 'This Month') {
        const monthStart = new Date();
        monthStart.setDate(1); monthStart.setHours(0,0,0,0);
        return d >= monthStart;
      }
      return true;
    });

    if (scoreSortTarget !== HISTORY_SCORE_SORT_NONE) {
      const { min, max } = getScoreBandBounds(scoreSortTarget);
      result = result.filter(s => {
        const score = toFivePointScore(s?.confidence_score);
        return score >= min && score <= max;
      });
    }

    return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [historyFilter, userSessions, scoreSortTarget]);

  const paginatedSessions = useMemo(() => {
    const start = historyPage * pageSize;
    return filteredHistorySessions.slice(start, start + pageSize);
  }, [historyPage, filteredHistorySessions]);

  const pageCount = Math.ceil(filteredHistorySessions.length / pageSize);

  if (!isOpen) return null;

  return (
    <>
      <div className="bigkas-modal-scrim" onClick={onClose} style={{ zIndex: 1100 }} aria-hidden="true" />
      <div 
        className={`progress-history-sidebar history-visible progress-history-sidebar--mobile ${selectedSessionId ? 'history-viewing-session' : ''}`}
        style={{ height: '90vh', top: '10vh', borderRadius: '32px 32px 0 0', overflow: 'hidden' }}
      >
        <div className={`history-container ${selectedSessionId ? 'slide-out-left' : 'slide-in-right'}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          
          {/* Mobile Header */}
          <div className="history-overlay-header" style={{ padding: '24px 24px 12px', background: '#fff' }}>
            <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 16px' }} />
            <div className="history-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="history-title" style={{ fontSize: '1.5rem', fontWeight: 800 }}>Session History</h2>
              <button 
                onClick={onClose} 
                style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '18px', fontSize: '1.2rem', fontWeight: 700, color: '#64748b' }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Filters & Sorting */}
          <div style={{ padding: '0 24px 20px', background: '#fff' }}>
            <div className="history-controls" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="history-filters" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }} className="no-scrollbar">
                {HISTORY_FILTERS.map((f) => (
                  <button
                    key={f}
                    className={`history-filter-btn ${historyFilter === f ? 'active' : ''}`}
                    onClick={() => { setHistoryFilter(f); setHistoryPage(0); }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: historyFilter === f ? '#10b981' : '#f1f5f9',
                      color: historyFilter === f ? '#fff' : '#64748b',
                      border: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '8px 16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Filter by Score:</span>
                <select 
                  value={scoreSortTarget}
                  onChange={(e) => { setScoreSortTarget(e.target.value); setHistoryPage(0); }}
                  style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', outline: 'none' }}
                >
                  <option value={HISTORY_SCORE_SORT_NONE}>All Scores</option>
                  {HISTORY_SCORE_SORT_OPTIONS.map(opt => <option key={opt} value={opt.toFixed(1)}>{opt.toFixed(1)} Range</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Scrollable List */}
          <div className="history-overlay-scroll-content" style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
            <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {paginatedSessions.map((s, idx) => {
                const score = toFivePointScore(s.confidence_score);
                const tier = getScoreTier15(score);
                const pillars = resolveSessionPillars(s);
                return (
                  <div 
                    key={s.id} 
                    className="history-item" 
                    onClick={() => setSelectedSessionId(s.id)}
                    style={{ 
                      background: '#fff', 
                      borderRadius: '24px', 
                      padding: '16px', 
                      border: '1px solid #f1f5f9', 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>{buildSessionTitleOrTopic(s)}</h3>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 12px' }}>
                        {new Date(s.created_at).toLocaleDateString()} • {getSessionMode(s)}
                      </p>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {pillars.map(p => (
                          <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '4px 8px', borderRadius: '8px' }}>
                            <img src={p.sprite} alt="" style={{ width: '12px', height: '12px' }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e293b' }}>{p.score.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginLeft: '12px' }}>
                      <div style={{ 
                        width: '48px', height: '48px', borderRadius: '24px', 
                        background: `conic-gradient(${tier.color} ${(score/5)*100}%, #f1f5f9 0)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <div style={{ width: '38px', height: '38px', background: '#fff', borderRadius: '19px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                          {score.toFixed(1)}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: tier.color, textTransform: 'uppercase' }}>{tier.label}</span>
                    </div>
                  </div>
                );
              })}
              
              {isLoading && <p style={{ textAlign: 'center', padding: '20px' }}>Loading sessions...</p>}
              {!isLoading && filteredHistorySessions.length === 0 && <p style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No sessions found.</p>}
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px', marginBottom: '24px' }}>
                <button 
                  disabled={historyPage === 0} 
                  onClick={() => setHistoryPage(p => p - 1)}
                  style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '12px', color: historyPage === 0 ? '#cbd5e1' : '#64748b' }}
                >
                  <IoChevronBack />
                </button>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{historyPage + 1} / {pageCount}</span>
                <button 
                  disabled={historyPage >= pageCount - 1} 
                  onClick={() => setHistoryPage(p => p + 1)}
                  style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '12px', color: historyPage >= pageCount - 1 ? '#cbd5e1' : '#64748b' }}
                >
                  <IoChevronForward />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Footer - Removed Big Gap */}
          <div style={{ padding: '16px 24px 32px', background: '#fff', borderTop: '1px solid #f1f5f9' }}>
            <button 
              onClick={onClose}
              style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#1e293b', color: '#fff', fontSize: '1rem', fontWeight: 800, border: 'none' }}
            >
              Close History
            </button>
          </div>
        </div>

        {/* Selected Session View Overlay */}
        {selectedSessionId && (
          <div className="history-session-view slide-in-right" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#fff', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
             <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (innerViewMode === 'detailed') setInnerViewMode('results');
                    else setSelectedSessionId(null);
                  }}
                  style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 700, fontSize: '0.9rem' }}
                >
                   <IoChevronBack /> {innerViewMode === 'detailed' ? 'Back to Results' : 'Back to History'}
                </button>
             </div>
             <div style={{ flex: 1, overflowY: 'auto' }}>
                {innerViewMode === 'results' ? (
                  <SessionResultPage 
                    sessionIdProp={selectedSessionId} 
                    isInnerView={true} 
                    onCloseInner={() => setSelectedSessionId(null)}
                    onViewDetailed={() => setInnerViewMode('detailed')}
                  />
                ) : (
                  <DetailedFeedbackPage 
                    sessionIdProp={selectedSessionId} 
                    isInnerView={true} 
                    onCloseInner={() => setInnerViewMode('results')}
                  />
                )}
             </div>
          </div>
        )}
      </div>
    </>
  );
}

export default HistoryPageMobile;

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '../../context/useSessionContext';
import { buildRoute, getScoreTier, ROUTES } from '../../utils/constants';
import { formatDate, formatDuration } from '../../utils/formatters';
import './InnerPages.css';

const FILTER_REFERENCE_NOW = Date.now();

function HistoryPage() {
  const navigate = useNavigate();
  const { sessions, fetchSessions, loadMoreSessions, isLoading, hasMore, error } = useSessionContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    fetchSessions(1, true);
  }, [fetchSessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const score = session.confidence_score ?? 0;
      const tier = getScoreTier(score);
      const targetText = (session.transcript || 'Practice session').toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      const matchesQuery = !query || targetText.includes(query);
      const matchesScore =
        scoreFilter === 'all' ||
        (scoreFilter === 'excellent' && tier.label === 'Excellent') ||
        (scoreFilter === 'good' && tier.label === 'Good') ||
        (scoreFilter === 'fair' && tier.label === 'Fair') ||
        (scoreFilter === 'needs-work' && tier.label === 'Needs Work');

      const createdAt = new Date(session.created_at).getTime();
      const daysAgo = Number.isFinite(createdAt) ? (FILTER_REFERENCE_NOW - createdAt) / (1000 * 60 * 60 * 24) : Infinity;
      const matchesDate =
        dateFilter === 'all' ||
        (dateFilter === '7d' && daysAgo <= 7) ||
        (dateFilter === '30d' && daysAgo <= 30) ||
        (dateFilter === '90d' && daysAgo <= 90);

      return matchesQuery && matchesScore && matchesDate;
    });
  }, [dateFilter, scoreFilter, searchQuery, sessions]);

  return (
    <div className="inner-page">
      <div className="inner-page-header">
        <h1 className="inner-page-title">History</h1>
        <span className="history-session-count">
          {sessions.length > 0 ? `${sessions.length} session${sessions.length !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      {isLoading && sessions.length === 0 && (
        <div className="page-loading">Loading sessions...</div>
      )}

      {error && !isLoading && (
        <div className="page-error">{error}</div>
      )}

      {!isLoading && !error && sessions.length === 0 && (
        <div className="empty-state">
          <p className="empty-title">No sessions yet</p>
          <p className="empty-desc">Start practicing to see your history here.</p>
          <button
            className="btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => navigate(ROUTES.DASHBOARD)}
          >
            Start Practice
          </button>
        </div>
      )}

      {!isLoading && !error && sessions.length > 0 && (
        <div className="page-card history-controls-card">
          <div className="history-controls-grid">
            <div className="form-group history-control-group">
              <label htmlFor="history-search" className="form-label">Search Session Text</label>
              <div className="history-search-wrap">
                <input
                  id="history-search"
                  type="search"
                  className="form-input history-search-input"
                  placeholder="Search by script or spoken text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="history-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear history search"
                  >
                    x
                  </button>
                )}
              </div>
            </div>

            <div className="history-filter-row">
              <div className="form-group history-control-group">
                <label htmlFor="history-score-filter" className="form-label">Score</label>
                <select
                  id="history-score-filter"
                  className="form-select"
                  value={scoreFilter}
                  onChange={(e) => setScoreFilter(e.target.value)}
                >
                  <option value="all">All Scores</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="needs-work">Needs Work</option>
                </select>
              </div>

              <div className="form-group history-control-group">
                <label htmlFor="history-date-filter" className="form-label">Date Range</label>
                <select
                  id="history-date-filter"
                  className="form-select"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            </div>
          </div>

          <p className="history-results-count">
            Showing {filteredSessions.length} of {sessions.length} sessions
          </p>
        </div>
      )}

      {!isLoading && !error && sessions.length > 0 && filteredSessions.length === 0 && (
        <div className="empty-state">
          <p className="empty-title">No matching sessions</p>
          <p className="empty-desc">Try adjusting your search or filters.</p>
        </div>
      )}

      <div className="sessions-list">
        {filteredSessions.map((s) => {
          const score = s.confidence_score ?? 0;
          const tier = getScoreTier(score);
          const durationSec = s.duration_sec ?? s.duration ?? 0;
          return (
            <div
              key={s.id}
              className="session-row"
              onClick={() => navigate(buildRoute.sessionResult(s.id), { state: s })}
            >
              <div className="session-row-info">
                <p className="session-row-text">
                  {s.transcript?.slice(0, 70) || 'Practice session'}
                </p>
                <p className="session-row-date">
                  {formatDate(s.created_at)}
                  {durationSec ? ` - ${formatDuration(durationSec)}` : ''}
                </p>
              </div>
              <span
                className="score-badge"
                style={{ background: `${tier.color}22`, color: tier.color }}
              >
                {score}
              </span>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="history-load-more-wrap">
          <button
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 28px' }}
            onClick={loadMoreSessions}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;

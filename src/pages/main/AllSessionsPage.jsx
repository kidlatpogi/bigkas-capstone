import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSessionContext } from '../../context/useSessionContext';
import { useAuthContext } from '../../context/useAuthContext';
import { buildRoute } from '../../utils/constants';
import BackButton from '../../components/common/BackButton';
import FilterTabs from '../../components/common/FilterTabs';
import SessionListItem from '../../components/common/SessionListItem';
import { getSpeakerPointsSourceLabel } from '../../utils/speakerPointsHistory';
import './InnerPages.css';
import './ProgressPage.css';

const FILTER_TABS = [
  { label: 'All', value: 'All' },
  { label: 'Today', value: 'Today' },
  { label: 'This Week', value: 'This Week' },
  { label: 'This Month', value: 'This Month' },
];
import {
  getSessionMode,
  getRecentToneClass,
} from '../../utils/sessionFormatting';
function AllSessionsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { sessions, fetchAllSessions, isLoading } = useSessionContext();
  const isPointsHistoryMode = location.state?.historyMode === 'points';
  const [filter, setFilter] = useState(location.state?.defaultFilter || 'All');

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (isPointsHistoryMode) return;
    fetchAllSessions();
  }, [fetchAllSessions, isPointsHistoryMode]);

  const filterSession = (s) => {
    if (getSessionMode(s) === 'Pre-Test') return false;

    const d = new Date(s.created_at);
    const now = new Date();
    if (filter === 'Today') {
      return d.toDateString() === now.toDateString();
    }
    if (filter === 'This Week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }
    if (filter === 'This Month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filterHistoryEntry = (entry) => {
    const d = new Date(entry?.createdAt || '');
    if (Number.isNaN(d.getTime())) return false;

    const now = new Date();
    if (filter === 'Today') {
      return d.toDateString() === now.toDateString();
    }
    if (filter === 'This Week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }
    if (filter === 'This Month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const pointsHistory = Array.isArray(user?.speakerPointsHistory) ? user.speakerPointsHistory : [];
  const filteredHistory = pointsHistory.filter(filterHistoryEntry);

  const formatHistoryTime = (iso) => {
    const parsed = new Date(iso || '');
    if (Number.isNaN(parsed.getTime())) return 'Recently';
    return parsed.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getHistoryBreakdown = (entry) => {
    const meta = entry?.metadata || {};
    const scorePoints = Math.max(0, Number(meta?.score_reward_points || 0));
    const taskPoints = Math.max(0, Number(meta?.task_reward_points || 0));

    if (scorePoints > 0 && taskPoints > 0) {
      return `Score reward +${scorePoints} • Task bonus +${taskPoints}`;
    }
    if (scorePoints > 0) {
      return `Score reward +${scorePoints}`;
    }
    if (taskPoints > 0) {
      return `Task bonus +${taskPoints}`;
    }
    return null;
  };

  const getHistoryDetail = (entry) => {
    const meta = entry?.metadata || {};
    const score = Number(meta?.score);
    const taskIds = Array.isArray(meta?.completed_task_ids) ? meta.completed_task_ids.filter(Boolean) : [];

    if (taskIds.length > 0) {
      return `${taskIds.length} task milestone${taskIds.length > 1 ? 's' : ''}`;
    }

    if (Number.isFinite(score) && score > 0) {
      return `Score ${Math.round(score)}/100`;
    }

    const taskId = String(meta?.task_id || '').trim();
    if (taskId) {
      return taskId.replace(/-/g, ' ');
    }

    return 'Speaking level update';
  };

  const filtered = sessions.filter(filterSession);

  return (
    <div className="inner-page">
      <div className="inner-page-header centered-header">
        <BackButton />
        <h1 className="inner-page-title">{isPointsHistoryMode ? 'Points History' : 'All Sessions'}</h1>
      </div>

      {/* Filter tabs */}
      <div style={{ marginTop: 8, marginBottom: 12 }}>
        <FilterTabs
          tabs={FILTER_TABS}
          active={filter}
          onChange={(val) => { setFilter(val); setPage(1); }}
        />
      </div>

      {!isPointsHistoryMode && isLoading && sessions.length === 0 && (
        <div className="page-loading">Loading…</div>
      )}

      {!isPointsHistoryMode && !isLoading && filtered.length === 0 && (
        <div className="empty-state">
          <p className="empty-title">No sessions</p>
          <p className="empty-desc">No sessions found for the selected period.</p>
        </div>
      )}

      {isPointsHistoryMode && filteredHistory.length === 0 && (
        <div className="empty-state">
          <p className="empty-title">No points history</p>
          <p className="empty-desc">No speaking points found for the selected period.</p>
        </div>
      )}

      {!isPointsHistoryMode && (
        <div className="sessions-list">
          {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => {
            const mode = getSessionMode(s);
            return (
              <SessionListItem
                key={s.id}
                session={s}
                title={s?.script_title || s?.title || 'Session'}
                mode={mode}
                toneClass={getRecentToneClass(s.confidence_score ?? 0)}
                onClick={() => navigate(buildRoute.sessionResult(s.id), { state: s })}
              />
            );
          })}
        </div>
      )}

      {isPointsHistoryMode && (
        <div className="sessions-list">
          {filteredHistory.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((entry) => (
            <div key={entry.id} className="session-row points-history-row">
              <div className="points-history-main">
                <span className="session-title">{entry.label || getSpeakerPointsSourceLabel(entry.source)}</span>
                <span className="points-history-points">+{entry.pointsAwarded} pts</span>
              </div>
              <div className="points-history-meta">
                <span>{getHistoryDetail(entry)}</span>
                <span className="points-history-sep">•</span>
                <span>{formatHistoryTime(entry.createdAt)}</span>
              </div>
              {getHistoryBreakdown(entry) && (
                <p className="points-history-sub">{getHistoryBreakdown(entry)}</p>
              )}
              {Number.isFinite(Number(entry?.totalPointsAfter)) && (
                <p className="points-history-sub">Speaking Level total: {Math.max(0, Number(entry.totalPointsAfter))} pts</p>
              )}
            </div>
          ))}
        </div>
      )}

      {Math.ceil((isPointsHistoryMode ? filteredHistory.length : filtered.length) / PAGE_SIZE) > 1 && (
        <div className="paged-nav">
          <button className="paged-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>&#8249; Prev</button>
          <span className="paged-info">{page} / {Math.ceil((isPointsHistoryMode ? filteredHistory.length : filtered.length) / PAGE_SIZE)}</span>
          <button className="paged-btn" disabled={page >= Math.ceil((isPointsHistoryMode ? filteredHistory.length : filtered.length) / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}>Next &#8250;</button>
        </div>
      )}
    </div>
  );
}

export default AllSessionsPage;

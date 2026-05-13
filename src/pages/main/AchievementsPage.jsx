import { useState, useMemo, useEffect, useCallback } from 'react';
import { IoCheckmarkCircle, IoLockClosed } from 'react-icons/io5';
import { getSpriteUrl } from '../../utils/assetUtils';
import { useAuthContext } from '../../context/useAuthContext';
import { useActivitiesJourneyTasks } from '../../hooks/useActivitiesJourneyTasks';
import { useJourneyRemoteState } from '../../hooks/useJourneyRemoteState';
import {
  getActivityMetrics,
  isActivityTaskCompleted,
  GLOBAL_ACTIVITY_SCOPE,
} from '../../utils/activityProgress';
import {
  acknowledgeAllPublishedUnlockedBadges,
  syncUnlockedBadgeIds,
} from '../../utils/achievementNavBadge';
import { fetchUserAchievements } from '../../services/achievementsService';
import './AchievementsPage.css';

const trophyImg   = getSpriteUrl('Thropies/Thropy.png');
const badgeImg    = getSpriteUrl('Badges/Badge.png');
const rankBronze  = getSpriteUrl('Rank/rank-bronze.webp');
const rankSilver  = getSpriteUrl('Rank/rank-silver.webp');
const rankGold    = getSpriteUrl('Rank/rank-gold.webp');
const rankMythril = getSpriteUrl('Rank/rank-mythril.webp');
const rankLegendary = getSpriteUrl('Rank/rank-legendary.webp');

const RANK_IMGS  = [rankBronze, rankSilver, rankGold, rankMythril, rankLegendary];
const RANK_NAMES = ['BRONZE', 'SILVER', 'GOLD', 'MYTHRIL', 'LEGENDARY'];

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
  } catch {
    return null;
  }
}

export default function AchievementsPage() {
  const { user } = useAuthContext();
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(true);
  const [badgesError, setBadgesError] = useState('');

  const currentLevelNumber = user?.speakerLevelNumber || 1;

  const { tasks, loading: tasksLoading } = useActivitiesJourneyTasks(currentLevelNumber);
  const { metricsSyncKey } = useJourneyRemoteState(user);

  const scopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;
  const activityMetrics = useMemo(() => getActivityMetrics(scopeKey), [scopeKey, metricsSyncKey]);

  /* ── Fetch badges ── */
  const loadAchievements = useCallback(async () => {
    if (!user?.id) return;
    setLoadingBadges(true);
    setBadgesError('');
    try {
      const data = await fetchUserAchievements(user.id);
      setAchievements(data);
      syncUnlockedBadgeIds(data.filter((a) => a.unlocked).map((a) => a.id));
      acknowledgeAllPublishedUnlockedBadges();
    } catch (err) {
      setBadgesError(err?.message ?? 'Failed to load badges.');
    } finally {
      setLoadingBadges(false);
    }
  }, [user?.id]);

  useEffect(() => { loadAchievements(); }, [loadAchievements]);

  /* ── Trophies (level progress) ── */
  const trophies = useMemo(() => {
    return [1, 2, 3, 4, 5].map((lvl) => {
      const isCurrentLevel = lvl === currentLevelNumber;
      const isCompleted    = lvl < currentLevelNumber;
      const isLocked       = lvl > currentLevelNumber;

      const total   = isCurrentLevel ? tasks.length : 0;
      const current = isCurrentLevel
        ? tasks.filter((t) => isActivityTaskCompleted(t.id, activityMetrics)).length
        : 0;

      return {
        id: lvl,
        name: RANK_NAMES[lvl - 1],
        rankImg: RANK_IMGS[lvl - 1],
        total,
        current,
        isCompleted,
        isLocked,
      };
    });
  }, [currentLevelNumber, tasks, activityMetrics]);

  /* ── Filtered & Sorted badges ── */
  const filteredBadges = useMemo(() => {
    let result = achievements.filter((a) => {
      if (filterStatus === 'unlocked') return a.unlocked;
      if (filterStatus === 'locked') return !a.unlocked;
      return true;
    });

    result = [...result];
    if (sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name-desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => {
        const timeA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : new Date(a.createdAt).getTime();
        const timeB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => {
        const timeA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : new Date(a.createdAt).getTime();
        const timeB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : new Date(b.createdAt).getTime();
        return timeA - timeB;
      });
    }
    return result;
  }, [achievements, filterStatus, sortBy]);

  return (
    <div className="achievements-container dashboard-anim-fade">
      <header className="achievements-header dashboard-anim-top">
        <span className="achievements-kicker">Milestones</span>
        <h1 className="achievements-title">Achievements</h1>
      </header>

      {/* ── Trophy Showcase ── */}
      <section className="trophy-showcase-card dashboard-anim-top dashboard-anim-delay-1">
        {trophies.map((trophy) => (
          <div key={trophy.id} className={`trophy-item ${trophy.isLocked ? 'locked' : ''}`}>
            <div className="trophy-rank-badge">
              <img src={trophy.rankImg} alt={trophy.name} className="rank-icon" />
              <span className="rank-name">LEVEL {trophy.id}</span>
            </div>
            <div className="trophy-wrapper">
              <img src={trophyImg} alt={trophy.name} className="trophy-img" />
            </div>
            <div className="trophy-progress-container">
              <div className="trophy-progress-bar">
                <div
                  className="trophy-progress-fill"
                  style={{
                    width: trophy.isCompleted
                      ? '100%'
                      : trophy.total > 0
                        ? `${(trophy.current / trophy.total) * 100}%`
                        : '0%',
                  }}
                />
              </div>
              <span className="trophy-progress-text">
                {trophy.isLocked
                  ? 'Locked'
                  : trophy.isCompleted
                    ? 'Completed'
                    : tasksLoading
                      ? '…'
                      : `${trophy.current}/${trophy.total}`}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* ── Filter & Sort Bar ── */}
      <div className="achievements-filter-bar dashboard-anim-top dashboard-anim-delay-2">
        <div className="filter-tabs-group" role="group" aria-label="Filter achievements">
          <button
            type="button"
            className={`filter-tab-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${filterStatus === 'unlocked' ? 'active' : ''}`}
            onClick={() => setFilterStatus('unlocked')}
          >
            Unlocked
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${filterStatus === 'locked' ? 'active' : ''}`}
            onClick={() => setFilterStatus('locked')}
          >
            Locked
          </button>
        </div>

        <div className="sort-wrapper">
          <label htmlFor="achievements-sort-select" className="sort-label">Sort By:</label>
          <select
            id="achievements-sort-select"
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="default">Default</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
          </select>
        </div>
      </div>

      {/* ── Badges Grid ── */}
      <section className="badges-grid dashboard-anim-bottom dashboard-anim-delay-3">
        {loadingBadges && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'rgba(1,1,1,0.45)', fontWeight: 600 }}>
            Loading badges…
          </div>
        )}

        {!loadingBadges && badgesError && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: '12px' }}>{badgesError}</p>
            <button
              onClick={loadAchievements}
              style={{ color: '#059669', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
            >
              Try again
            </button>
          </div>
        )}

        {!loadingBadges && !badgesError && filteredBadges.length === 0 && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '12px', color: 'rgba(1,1,1,0.45)', textAlign: 'center' }}>
            <IoLockClosed size={36} style={{ opacity: 0.35 }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>
              {filterStatus === 'unlocked' ? 'No unlocked badges found' : filterStatus === 'locked' ? 'No locked badges found' : 'No badges yet'}
            </p>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              Keep training — earned badges will appear here.
            </p>
          </div>
        )}

        {!loadingBadges && !badgesError && filteredBadges.map((badge) => (
          <div
            key={badge.id}
            className={`badge-card ${!badge.unlocked ? 'locked' : ''}`}
            onClick={() => setSelectedBadge(badge)}
          >
            <span className="badge-status-top">
              {badge.unlocked ? (formatDate(badge.unlockedAt) ?? 'Unlocked') : 'Locked'}
            </span>

            <div className="badge-icon-wrapper">
              <img
                src={badge.badgeUrl ?? badgeImg}
                alt={badge.name}
                className="badge-img"
                onError={(e) => { e.currentTarget.src = badgeImg; }}
              />
            </div>

            <h3 className="badge-title">
              {badge.name}
              {badge.unlocked && <IoCheckmarkCircle className="checkmark-icon" />}
            </h3>

            <div className="badge-progress-container">
              <div className="badge-progress-bar">
                <div
                  className="badge-progress-fill"
                  style={{ width: badge.unlocked ? '100%' : '0%' }}
                />
              </div>
              <span className="badge-progress-text">
                {badge.unlocked ? '1/1' : '0/1'}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* ── Badge Detail Modal ── */}
      {selectedBadge && (
        <div className="badge-modal-overlay" onClick={() => setSelectedBadge(null)}>
          <div className="badge-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="dashboard-overlay-close-btn badge-modal-close"
              onClick={() => setSelectedBadge(null)}
              aria-label="Close modal"
              style={{ position: 'absolute', top: '20px', right: '20px' }}
            >
              ×
            </button>

            <span className="badge-modal-status">
              {selectedBadge.unlocked ? (formatDate(selectedBadge.unlockedAt) ?? 'Unlocked') : 'Locked'}
            </span>

            <div className={`badge-modal-icon ${!selectedBadge.unlocked ? 'locked' : ''}`}>
              <img
                src={selectedBadge.badgeUrl ?? badgeImg}
                alt={selectedBadge.name}
                className="badge-modal-img"
                onError={(e) => { e.currentTarget.src = badgeImg; }}
              />
            </div>

            <h2 className="badge-modal-title">
              {selectedBadge.name}
              {selectedBadge.unlocked && <IoCheckmarkCircle className="checkmark-icon" />}
            </h2>

            {!selectedBadge.unlocked ? (
              <>
                <span className="badge-modal-req-label">HOW TO UNLOCK</span>
                <p className="badge-modal-desc" style={{ fontWeight: 700, color: '#059669' }}>
                  {selectedBadge.unlockDescription || 'Keep training and completing tasks to earn this milestone.'}
                </p>
                {selectedBadge.description && (
                  <p className="badge-modal-desc" style={{ opacity: 0.65, fontSize: '0.88rem', marginTop: '-18px' }}>
                    {selectedBadge.description}
                  </p>
                )}
              </>
            ) : (
              <p className="badge-modal-desc">{selectedBadge.description}</p>
            )}

            <div className="badge-modal-progress">
              <div className="badge-progress-bar">
                <div
                  className="badge-progress-fill"
                  style={{ width: selectedBadge.unlocked ? '100%' : '0%' }}
                />
              </div>
              <span className="badge-progress-text">
                {selectedBadge.unlocked ? '1/1 Completed' : '0/1 Incomplete'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

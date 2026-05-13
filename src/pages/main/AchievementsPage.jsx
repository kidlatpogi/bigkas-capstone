import { useState, useMemo, useEffect, useCallback } from 'react';
import { IoCheckmarkCircle, IoLockClosed, IoGift } from 'react-icons/io5';
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
import { syncClaimableAchievements } from '../../utils/achievementClaims';
import { fetchUserAchievements, claimAchievementInDB } from '../../services/achievementsService';
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
  const [claimingId, setClaimingId] = useState(null);
  const [justClaimedIds, setJustClaimedIds] = useState(new Set());

  const currentLevelNumber = user?.speakerLevelNumber || 1;
  const { tasks, loading: tasksLoading } = useActivitiesJourneyTasks(currentLevelNumber);
  const { metricsSyncKey } = useJourneyRemoteState(user);
  const scopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;
  const activityMetrics = useMemo(() => getActivityMetrics(scopeKey), [scopeKey, metricsSyncKey]);

  const loadAchievements = useCallback(async () => {
    if (!user?.id) return;
    setLoadingBadges(true);
    setBadgesError('');
    try {
      const data = await fetchUserAchievements(user.id, user);
      setAchievements(data);
      syncClaimableAchievements(data);
      const unlockedIds = data.filter((a) => a.claimed).map((a) => a.id);
      syncUnlockedBadgeIds(unlockedIds);
      acknowledgeAllPublishedUnlockedBadges();
    } catch (err) {
      setBadgesError(err?.message ?? 'Failed to load badges.');
    } finally {
      setLoadingBadges(false);
    }
  }, [user?.id, user?.profilingCompleted, user?.pretestCompleted]);

  useEffect(() => { loadAchievements(); }, [loadAchievements]);

  const handleClaim = useCallback(async (badge) => {
    if (!user?.id || claimingId) return;
    setClaimingId(badge.id);
    try {
      const unlockedAt = await claimAchievementInDB(user.id, badge.id);
      setJustClaimedIds((prev) => new Set(prev).add(badge.id));
      setAchievements((prev) =>
        prev.map((a) =>
          a.id === badge.id
            ? { ...a, claimed: true, claimable: false, unlocked: true, unlockedAt }
            : a
        )
      );
      // Remove from notification tray
      const { claimAchievement: removeNotif } = await import('../../utils/achievementClaims');
      removeNotif(badge.id);
      syncUnlockedBadgeIds(
        achievements
          .filter((a) => a.claimed || a.id === badge.id)
          .map((a) => a.id)
      );
    } catch {
      // Silently fail — user can retry
    } finally {
      setClaimingId(null);
    }
  }, [user?.id, claimingId, achievements]);

  const trophies = useMemo(() => {
    return [1, 2, 3, 4, 5].map((lvl) => {
      const isCurrentLevel = lvl === currentLevelNumber;
      const isCompleted    = lvl < currentLevelNumber;
      const isLocked       = lvl > currentLevelNumber;
      const total   = isCurrentLevel ? tasks.length : 0;
      const current = isCurrentLevel
        ? tasks.filter((t) => isActivityTaskCompleted(t.id, activityMetrics)).length
        : 0;
      return { id: lvl, name: RANK_NAMES[lvl - 1], rankImg: RANK_IMGS[lvl - 1], total, current, isCompleted, isLocked };
    });
  }, [currentLevelNumber, tasks, activityMetrics]);

  const filteredBadges = useMemo(() => {
    let result = achievements.filter((a) => {
      if (filterStatus === 'unlocked') return a.claimed;
      if (filterStatus === 'locked') return !a.claimed && !a.claimable;
      if (filterStatus === 'claimable') return a.claimable;
      return true;
    });
    result = [...result];
    if (sortBy === 'name-asc') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'name-desc') result.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortBy === 'newest') result.sort((a, b) => (new Date(b.unlockedAt || b.createdAt)) - (new Date(a.unlockedAt || a.createdAt)));
    else if (sortBy === 'oldest') result.sort((a, b) => (new Date(a.unlockedAt || a.createdAt)) - (new Date(b.unlockedAt || b.createdAt)));
    return result;
  }, [achievements, filterStatus, sortBy]);

  const getCardClass = (badge) => {
    if (justClaimedIds.has(badge.id)) return 'badge-card badge-card--just-claimed';
    if (badge.claimed) return 'badge-card unlocked';
    if (badge.claimable) return 'badge-card badge-card--claimable';
    return 'badge-card locked';
  };

  return (
    <div className="achievements-container dashboard-anim-fade">
      <header className="achievements-header dashboard-anim-top">
        <span className="achievements-kicker">Milestones</span>
        <h1 className="achievements-title">Achievements</h1>
      </header>

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
                <div className="trophy-progress-fill" style={{ width: trophy.isCompleted ? '100%' : trophy.total > 0 ? `${(trophy.current / trophy.total) * 100}%` : '0%' }} />
              </div>
              <span className="trophy-progress-text">
                {trophy.isLocked ? 'Locked' : trophy.isCompleted ? 'Completed' : tasksLoading ? '…' : `${trophy.current}/${trophy.total}`}
              </span>
            </div>
          </div>
        ))}
      </section>

      <div className="achievements-filter-bar dashboard-anim-top dashboard-anim-delay-2">
        <div className="filter-tabs-group" role="group" aria-label="Filter achievements">
          {[
            { val: 'all', label: 'All' },
            { val: 'claimable', label: 'Claimable' },
            { val: 'unlocked', label: 'Claimed' },
            { val: 'locked', label: 'Locked' },
          ].map((f) => (
            <button key={f.val} type="button" className={`filter-tab-btn ${filterStatus === f.val ? 'active' : ''}`} onClick={() => setFilterStatus(f.val)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="sort-wrapper">
          <label htmlFor="achievements-sort-select" className="sort-label">Sort By:</label>
          <select id="achievements-sort-select" className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="default">Default</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
          </select>
        </div>
      </div>

      <section className="badges-grid dashboard-anim-bottom dashboard-anim-delay-3">
        {loadingBadges && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'rgba(1,1,1,0.45)', fontWeight: 600 }}>Loading badges…</div>
        )}
        {!loadingBadges && badgesError && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: '12px' }}>{badgesError}</p>
            <button onClick={loadAchievements} style={{ color: '#059669', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}>Try again</button>
          </div>
        )}
        {!loadingBadges && !badgesError && filteredBadges.length === 0 && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '12px', color: 'rgba(1,1,1,0.45)', textAlign: 'center' }}>
            <IoLockClosed size={36} style={{ opacity: 0.35 }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>
              {filterStatus === 'claimable' ? 'No claimable badges right now' : filterStatus === 'unlocked' ? 'No claimed badges yet' : filterStatus === 'locked' ? 'No locked badges' : 'No badges yet'}
            </p>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Keep training — earned badges will appear here.</p>
          </div>
        )}

        {!loadingBadges && !badgesError && filteredBadges.map((badge) => (
          <div
            key={badge.id}
            className={getCardClass(badge)}
            onClick={() => {
              if (badge.claimable) return;
              setSelectedBadge(badge);
            }}
          >
            <span className="badge-status-top">
              {badge.claimed
                ? (formatDate(badge.unlockedAt) ?? 'Claimed')
                : badge.claimable
                  ? 'Ready to claim!'
                  : 'Locked'}
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
              {badge.claimed && <IoCheckmarkCircle className="checkmark-icon" />}
            </h3>

            <div className="badge-progress-container">
              <div className="badge-progress-bar">
                <div className="badge-progress-fill" style={{ width: badge.claimed ? '100%' : '0%' }} />
              </div>
              <span className="badge-progress-text">{badge.claimed ? '1/1' : '0/1'}</span>
            </div>

            {badge.claimable && (
              <button
                type="button"
                className="badge-claim-btn"
                disabled={claimingId === badge.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClaim(badge);
                }}
              >
                <IoGift style={{ fontSize: '1.1rem' }} />
                {claimingId === badge.id ? 'Claiming…' : 'Claim Reward'}
              </button>
            )}
          </div>
        ))}
      </section>

      {selectedBadge && (
        <div className="badge-modal-overlay" onClick={() => setSelectedBadge(null)}>
          <div className="badge-modal-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="dashboard-overlay-close-btn badge-modal-close" onClick={() => setSelectedBadge(null)} aria-label="Close" style={{ position: 'absolute', top: '20px', right: '20px' }}>×</button>
            <span className="badge-modal-status">{selectedBadge.claimed ? (formatDate(selectedBadge.unlockedAt) ?? 'Claimed') : selectedBadge.claimable ? 'Ready to claim!' : 'Locked'}</span>
            <div className={`badge-modal-icon ${!selectedBadge.claimed && !selectedBadge.claimable ? 'locked' : ''}`}>
              <img src={selectedBadge.badgeUrl ?? badgeImg} alt={selectedBadge.name} className="badge-modal-img" onError={(e) => { e.currentTarget.src = badgeImg; }} />
            </div>
            <h2 className="badge-modal-title">{selectedBadge.name}{selectedBadge.claimed && <IoCheckmarkCircle className="checkmark-icon" />}</h2>
            {!selectedBadge.claimed ? (
              <>
                <span className="badge-modal-req-label">HOW TO UNLOCK</span>
                <p className="badge-modal-desc" style={{ fontWeight: 700, color: '#059669' }}>{selectedBadge.unlockDescription || 'Keep training to earn this.'}</p>
                {selectedBadge.description && <p className="badge-modal-desc" style={{ opacity: 0.65, fontSize: '0.88rem', marginTop: '-18px' }}>{selectedBadge.description}</p>}
              </>
            ) : (
              <p className="badge-modal-desc">{selectedBadge.description}</p>
            )}
            <div className="badge-modal-progress">
              <div className="badge-progress-bar"><div className="badge-progress-fill" style={{ width: selectedBadge.claimed ? '100%' : '0%' }} /></div>
              <span className="badge-progress-text">{selectedBadge.claimed ? '1/1 Completed' : '0/1 Incomplete'}</span>
            </div>
            {selectedBadge.claimable && (
              <button type="button" className="badge-claim-btn" style={{ marginTop: '12px' }} disabled={claimingId === selectedBadge.id} onClick={() => { handleClaim(selectedBadge); setSelectedBadge(null); }}>
                <IoGift style={{ fontSize: '1.1rem' }} />{claimingId === selectedBadge.id ? 'Claiming…' : 'Claim Reward'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

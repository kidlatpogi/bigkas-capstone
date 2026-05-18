import { useState, useMemo, useEffect, useCallback } from 'react';
import { IoCheckmarkCircle, IoLockClosed, IoGift, IoTrophy } from 'react-icons/io5';
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
import {
  ACHIEVEMENTS_UPDATED_EVENT,
  syncClaimableAchievements,
  claimAchievement as removeNotif,
} from '../../utils/achievementClaims';
import { fetchUserAchievements, claimAchievementInDB } from '../../services/achievementsService';
import { claimTrophyLevel, getClaimedTrophyLevels, getTrophyImageUrl } from '../../utils/trophyClaims';
import './AchievementsPage.css';

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

function formatJourneyStage(badge) {
  if (!badge?.journeyNumber || !badge?.stageNumber) return null;
  return `Journey ${badge.journeyNumber} • Stage ${String(badge.stageNumber).padStart(2, '0')}`;
}

function getTrophyImagePriorityProps(trophy, currentLevelNumber) {
  const isCurrentTrophy = trophy.id === currentLevelNumber;
  return {
    loading: isCurrentTrophy ? 'eager' : 'lazy',
    fetchPriority: isCurrentTrophy ? 'high' : 'auto',
  };
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
  const [congratsBadge, setCongratsBadge] = useState(null);
  const [congratsQueue, setCongratsQueue] = useState([]);
  const [claimedTrophyLevels, setClaimedTrophyLevels] = useState(() => getClaimedTrophyLevels(user?.id));

  const currentLevelNumber = user?.speakerLevelNumber || 1;
  const { tasks, loading: tasksLoading } = useActivitiesJourneyTasks(currentLevelNumber);
  const { metricsSyncKey } = useJourneyRemoteState(user);
  const scopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;
  const activityMetrics = useMemo(() => {
    void metricsSyncKey;
    return getActivityMetrics(scopeKey);
  }, [scopeKey, metricsSyncKey]);

  useEffect(() => {
    setClaimedTrophyLevels(getClaimedTrophyLevels(user?.id));
  }, [user?.id]);

  const loadAchievements = useCallback(async () => {
    if (!user?.id) return;
    setLoadingBadges(true);
    setBadgesError('');
    try {
      const data = await fetchUserAchievements(user.id, user);
      setAchievements(data);
      syncClaimableAchievements(data, user.id);
      syncUnlockedBadgeIds(data.filter((a) => a.claimed).map((a) => a.id));
      acknowledgeAllPublishedUnlockedBadges();
    } catch (err) {
      setBadgesError(err?.message ?? 'Failed to load badges.');
    } finally {
      setLoadingBadges(false);
    }
  }, [user]);

  useEffect(() => { loadAchievements(); }, [loadAchievements]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const handleAchievementsUpdated = (event) => {
      const detail = event.detail || {};
      if (String(detail.userId || '') !== String(user.id) || detail.action !== 'claimed' || !detail.id) return;
      const claimedId = String(detail.id);
      const unlockedAt = detail.unlockedAt || new Date().toISOString();
      setAchievements((prev) =>
        prev.map((a) => (
          String(a.id) === claimedId
            ? { ...a, claimed: true, claimable: false, unlocked: true, unlockedAt }
            : a
        ))
      );
      setSelectedBadge((badge) => (
        badge && String(badge.id) === claimedId
          ? { ...badge, claimed: true, claimable: false, unlocked: true, unlockedAt }
          : badge
      ));
    };
    window.addEventListener(ACHIEVEMENTS_UPDATED_EVENT, handleAchievementsUpdated);
    return () => window.removeEventListener(ACHIEVEMENTS_UPDATED_EVENT, handleAchievementsUpdated);
  }, [user?.id]);

  const markBadgeClaimed = useCallback((badge, unlockedAt) => {
    setAchievements((prev) =>
      prev.map((a) => a.id === badge.id ? { ...a, claimed: true, claimable: false, unlocked: true, unlockedAt } : a)
    );
    removeNotif(badge.id, user?.id, { unlockedAt });
    syncUnlockedBadgeIds(
      achievements.filter((a) => a.claimed || a.id === badge.id).map((a) => a.id)
    );
  }, [achievements, user?.id]);

  const handleClaim = useCallback(async (badge) => {
    if (!user?.id || claimingId) return;
    setClaimingId(badge.id);
    try {
      const unlockedAt = await claimAchievementInDB(user.id, badge.id);
      markBadgeClaimed(badge, unlockedAt);
      setCongratsBadge({ ...badge, unlockedAt });
    } catch {
      // user can retry
    } finally {
      setClaimingId(null);
    }
  }, [user?.id, claimingId, markBadgeClaimed]);

  const handleCongratsClose = useCallback(() => {
    if (congratsQueue.length > 0) {
      setCongratsBadge(congratsQueue[0]);
      setCongratsQueue((q) => q.slice(1));
    } else {
      setCongratsBadge(null);
    }
  }, [congratsQueue]);

  const trophies = useMemo(() => {
    return [1, 2, 3, 4, 5].map((lvl) => {
      const isCurrentLevel = lvl === currentLevelNumber;
      const total = isCurrentLevel ? tasks.length : 0;
      const current = isCurrentLevel ? tasks.filter((t) => isActivityTaskCompleted(t.id, activityMetrics)).length : 0;
      const isCompleted    = lvl < currentLevelNumber || (isCurrentLevel && total > 0 && current >= total);
      const isLocked       = lvl > currentLevelNumber;
      const claimed = claimedTrophyLevels.includes(lvl);
      return { id: lvl, name: RANK_NAMES[lvl - 1], rankImg: RANK_IMGS[lvl - 1], trophyImg: getTrophyImageUrl(lvl), total, current, isCompleted, isLocked, claimed, claimable: isCompleted && !claimed };
    });
  }, [currentLevelNumber, tasks, activityMetrics, claimedTrophyLevels]);

  const handleClaimTrophy = useCallback((trophy) => {
    if (!trophy?.claimable) return;
    const next = claimTrophyLevel(user?.id, trophy.id);
    setClaimedTrophyLevels(next);
    setCongratsBadge({
      id: `trophy-${trophy.id}`,
      name: `Level ${trophy.id} Trophy`,
      description: `You claimed your Level ${trophy.id} completion trophy.`,
      badgeUrl: trophy.trophyImg,
    });
  }, [user?.id]);

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
    else result.sort((a, b) => (
      (Number(a.journeyNumber) || 999) - (Number(b.journeyNumber) || 999) ||
      (Number(a.stageNumber) || 999) - (Number(b.stageNumber) || 999) ||
      a.name.localeCompare(b.name)
    ));
    return result;
  }, [achievements, filterStatus, sortBy]);

  const getCardClass = (badge) => {
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

      <section className="trophy-showcase-card dashboard-anim-top dashboard-anim-delay-1" aria-label="Trophy showcase">
        {trophies.map((trophy) => (
          <div
            key={trophy.id}
            className={`trophy-item ${trophy.isLocked ? 'locked' : ''} ${trophy.claimable ? 'trophy-item--claimable' : ''} ${trophy.claimed ? 'trophy-item--claimed' : ''}`}
            role={trophy.claimable ? 'button' : undefined}
            tabIndex={trophy.claimable ? 0 : undefined}
            aria-label={trophy.claimable ? `Claim Level ${trophy.id} trophy` : undefined}
            onClick={() => handleClaimTrophy(trophy)}
            onKeyDown={(event) => {
              if (!trophy.claimable) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleClaimTrophy(trophy);
              }
            }}
          >
            <div className="trophy-rank-badge">
              <img src={trophy.rankImg} alt={`Level ${trophy.id} ${trophy.name}`} className="rank-icon" loading="lazy" width="40" height="40" />
              <span className="rank-name">LEVEL {trophy.id}</span>
            </div>
            <div className="trophy-wrapper">
              <img
                src={trophy.trophyImg}
                alt=""
                className="trophy-img"
                width="80"
                height="80"
                {...getTrophyImagePriorityProps(trophy, currentLevelNumber)}
              />
            </div>
            <div className="trophy-progress-container">
              <div className="trophy-progress-bar" role="progressbar" aria-valuenow={trophy.current} aria-valuemin={0} aria-valuemax={trophy.total || 1}>
                <div className="trophy-progress-fill" style={{ width: trophy.isCompleted ? '100%' : trophy.total > 0 ? `${(trophy.current / trophy.total) * 100}%` : '0%' }} />
              </div>
              <span className="trophy-progress-text">
                {trophy.isLocked ? 'Locked' : trophy.claimed ? 'Claimed' : trophy.claimable ? 'Ready' : trophy.isCompleted ? 'Completed' : tasksLoading ? '…' : `${trophy.current}/${trophy.total}`}
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
            <button key={f.val} type="button" className={`filter-tab-btn ${filterStatus === f.val ? 'active' : ''}`} onClick={() => setFilterStatus(f.val)} aria-pressed={filterStatus === f.val}>
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

      <section className="badges-grid dashboard-anim-bottom dashboard-anim-delay-3" aria-label="Badges">
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
            <IoLockClosed size={36} style={{ opacity: 0.35 }} aria-hidden="true" />
            <p style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>
              {filterStatus === 'claimable' ? 'No claimable badges right now' : filterStatus === 'unlocked' ? 'No claimed badges yet' : filterStatus === 'locked' ? 'No locked badges' : 'No badges yet'}
            </p>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Keep training — earned badges will appear here.</p>
          </div>
        )}

        {!loadingBadges && !badgesError && filteredBadges.map((badge) => (
          <div key={badge.id} className={getCardClass(badge)} onClick={() => { if (!badge.claimable) setSelectedBadge(badge); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' && !badge.claimable) setSelectedBadge(badge); }}>
            <span className="badge-status-top">{badge.claimed ? (formatDate(badge.unlockedAt) ?? 'Claimed') : badge.claimable ? 'Ready to claim!' : 'Locked'}</span>
            <div className="badge-icon-wrapper">
              <img src={badge.badgeUrl ?? badgeImg} alt={badge.name} className="badge-img" loading="lazy" width="100" height="100" onError={(e) => { e.currentTarget.src = badgeImg; }} />
            </div>
            {formatJourneyStage(badge) && <span className="badge-journey-chip">{formatJourneyStage(badge)}</span>}
            <h3 className="badge-title">{badge.name}{badge.claimed && <IoCheckmarkCircle className="checkmark-icon" aria-label="Claimed" />}</h3>
            <div className="badge-progress-container">
              <div className="badge-progress-bar" role="progressbar" aria-valuenow={badge.claimed ? 1 : 0} aria-valuemin={0} aria-valuemax={1}>
                <div className="badge-progress-fill" style={{ width: badge.claimed ? '100%' : '0%' }} />
              </div>
              <span className="badge-progress-text">{badge.claimed ? '1/1' : '0/1'}</span>
            </div>
            {badge.claimable && (
              <button type="button" className="badge-claim-btn" disabled={claimingId === badge.id} onClick={(e) => { e.stopPropagation(); handleClaim(badge); }} aria-label={`Claim ${badge.name}`}>
                <IoGift aria-hidden="true" style={{ fontSize: '1.1rem' }} />
                {claimingId === badge.id ? 'Claiming…' : 'Claim Reward'}
              </button>
            )}
          </div>
        ))}
      </section>

      {/* ── Badge Detail Modal ── */}
      {selectedBadge && (
        <div className="badge-modal-overlay" onClick={() => setSelectedBadge(null)} role="dialog" aria-modal="true" aria-labelledby="badge-modal-title">
          <div className="badge-modal-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="dashboard-overlay-close-btn badge-modal-close" onClick={() => setSelectedBadge(null)} aria-label="Close" style={{ position: 'absolute', top: '20px', right: '20px' }}>×</button>
            <span className="badge-modal-status">{selectedBadge.claimed ? (formatDate(selectedBadge.unlockedAt) ?? 'Claimed') : selectedBadge.claimable ? 'Ready to claim!' : 'Locked'}</span>
            <div className={`badge-modal-icon ${!selectedBadge.claimed && !selectedBadge.claimable ? 'locked' : ''}`}>
              <img src={selectedBadge.badgeUrl ?? badgeImg} alt={selectedBadge.name} className="badge-modal-img" loading="lazy" width="120" height="120" onError={(e) => { e.currentTarget.src = badgeImg; }} />
            </div>
            {formatJourneyStage(selectedBadge) && <span className="badge-journey-chip badge-journey-chip--modal">{formatJourneyStage(selectedBadge)}</span>}
            <h2 id="badge-modal-title" className="badge-modal-title">{selectedBadge.name}{selectedBadge.claimed && <IoCheckmarkCircle className="checkmark-icon" aria-label="Claimed" />}</h2>
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
              <div className="badge-progress-bar" role="progressbar" aria-valuenow={selectedBadge.claimed ? 1 : 0} aria-valuemin={0} aria-valuemax={1}>
                <div className="badge-progress-fill" style={{ width: selectedBadge.claimed ? '100%' : '0%' }} />
              </div>
              <span className="badge-progress-text">{selectedBadge.claimed ? '1/1 Completed' : '0/1 Incomplete'}</span>
            </div>
            {selectedBadge.claimable && (
              <button type="button" className="badge-claim-btn" style={{ marginTop: '12px' }} disabled={claimingId === selectedBadge.id} onClick={() => { handleClaim(selectedBadge); setSelectedBadge(null); }} aria-label={`Claim ${selectedBadge.name}`}>
                <IoGift aria-hidden="true" style={{ fontSize: '1.1rem' }} />{claimingId === selectedBadge.id ? 'Claiming…' : 'Claim Reward'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Congratulations Modal ── */}
      {congratsBadge && (
        <div className="badge-congrats-overlay" onClick={handleCongratsClose} role="dialog" aria-modal="true" aria-labelledby="badge-congrats-title">
          <div className="badge-congrats-card" onClick={(e) => e.stopPropagation()}>
            <div className="badge-congrats-icon-wrap">
              <img src={congratsBadge.badgeUrl ?? badgeImg} alt={congratsBadge.name} className="badge-congrats-img" width="120" height="120" />
            </div>
            <IoTrophy className="badge-congrats-trophy" aria-hidden="true" />
            <h2 id="badge-congrats-title" className="badge-congrats-title">Congratulations!</h2>
            <p className="badge-congrats-name">{congratsBadge.name}</p>
            <p className="badge-congrats-desc">{congratsBadge.description}</p>
            <button type="button" className="badge-congrats-done-btn" onClick={handleCongratsClose}>
              {congratsQueue.length > 0 ? 'Next' : 'Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

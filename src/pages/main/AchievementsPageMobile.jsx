import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { IoCheckmarkCircle, IoSearch, IoNotificationsOutline, IoLockClosed, IoGift, IoTrophy } from 'react-icons/io5';
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
  claimAllAchievements as clearAllNotifs,
} from '../../utils/achievementClaims';
import { fetchUserAchievements, claimAchievementInDB } from '../../services/achievementsService';
import { claimTrophyLevel, getClaimedTrophyLevels, getTrophyImageUrl } from '../../utils/trophyClaims';
import './AchievementsPageMobile.css';

const badgeImg      = getSpriteUrl('Badges/Badge.png');
const rankBronze    = getSpriteUrl('Rank/rank-bronze.webp');
const rankSilver    = getSpriteUrl('Rank/rank-silver.webp');
const rankGold      = getSpriteUrl('Rank/rank-gold.webp');
const rankMythril   = getSpriteUrl('Rank/rank-mythril.webp');
const rankLegendary = getSpriteUrl('Rank/rank-legendary.webp');

const RANK_IMGS  = [rankBronze, rankSilver, rankGold, rankMythril, rankLegendary];
const RANK_NAMES = ['BRONZE', 'SILVER', 'GOLD', 'MYTHRIL', 'LEGENDARY'];

function formatDate(iso) {
  if (!iso) return null;
  try { return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso)); }
  catch { return null; }
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

export default function AchievementsPageMobile() {
  const { user } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [rewardsModalOpen, setRewardsModalOpen] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(true);
  const [badgesError, setBadgesError] = useState('');
  const [selectedBadge, setSelectedBadge] = useState(null);
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

  useEffect(() => {
    if (!rewardsModalOpen) return undefined;
    const onKeyDown = (e) => { if (e.key === 'Escape') setRewardsModalOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rewardsModalOpen]);

  useEffect(() => {
    if (!rewardsModalOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [rewardsModalOpen]);

  const markBadgeClaimed = useCallback((badge, unlockedAt) => {
    setAchievements((prev) =>
      prev.map((a) => a.id === badge.id ? { ...a, claimed: true, claimable: false, unlocked: true, unlockedAt } : a)
    );
    removeNotif(badge.id, user?.id, { unlockedAt });
    syncUnlockedBadgeIds(
      achievements.filter((a) => a.claimed || a.id === badge.id).map((a) => a.id)
    );
    acknowledgeAllPublishedUnlockedBadges();
  }, [achievements, user?.id]);

  const handleClaim = useCallback(async (badge) => {
    if (!user?.id || claimingId) return;
    setClaimingId(badge.id);
    try {
      const unlockedAt = await claimAchievementInDB(user.id, badge.id);
      markBadgeClaimed(badge, unlockedAt);
      setCongratsBadge({ ...badge, unlockedAt });
    } catch { /* user can retry */ }
    finally { setClaimingId(null); }
  }, [user?.id, claimingId, markBadgeClaimed]);

  const handleClaimAll = useCallback(async () => {
    const claimables = achievements.filter((a) => a.claimable);
    if (!user?.id || claimables.length === 0) return;
    const claimed = [];
    for (const badge of claimables) {
      try {
        const unlockedAt = await claimAchievementInDB(user.id, badge.id);
        claimed.push({ ...badge, unlockedAt });
      } catch { /* continue */ }
    }
    if (claimed.length > 0) {
      setAchievements((prev) => prev.map((a) => {
        const found = claimed.find((c) => c.id === a.id);
        return found ? { ...a, claimed: true, claimable: false, unlocked: true, unlockedAt: found.unlockedAt } : a;
      }));
      syncUnlockedBadgeIds([
        ...new Set([
          ...achievements.filter((a) => a.claimed).map((a) => a.id),
          ...claimed.map((a) => a.id),
        ]),
      ]);
      acknowledgeAllPublishedUnlockedBadges();
      clearAllNotifs(user.id);
      setCongratsBadge(claimed[0]);
      if (claimed.length > 1) setCongratsQueue(claimed.slice(1));
    }
    setRewardsModalOpen(false);
  }, [user?.id, achievements]);

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
      const isCompleted = lvl < currentLevelNumber || (isCurrentLevel && total > 0 && current >= total);
      const isLocked = lvl > currentLevelNumber;
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
    const q = searchTerm.trim().toLowerCase();
    const sorted = [...achievements].sort((a, b) => (
      (Number(a.journeyNumber) || 999) - (Number(b.journeyNumber) || 999) ||
      (Number(a.stageNumber) || 999) - (Number(b.stageNumber) || 999) ||
      a.name.localeCompare(b.name)
    ));
    if (!q) return sorted;
    return sorted.filter((a) => (
      a.name.toLowerCase().includes(q) ||
      String(a.description || '').toLowerCase().includes(q) ||
      formatJourneyStage(a)?.toLowerCase().includes(q)
    ));
  }, [achievements, searchTerm]);

  const claimableAchievements = useMemo(() => achievements.filter((a) => a.claimable), [achievements]);

  const getCardClass = (badge) => {
    if (badge.claimed) return 'badge-card unlocked';
    if (badge.claimable) return 'badge-card badge-card--claimable';
    return 'badge-card locked';
  };

  return (
    <div className="achievements-mobile-page dashboard-anim-fade">
      <div className="achievements-mobile-container">
        <header className="achievements-mobile-header dashboard-anim-top">
          <div className="achievements-mobile-header-row">
            <div className="header-titles">
              <span className="achievements-kicker">Milestones</span>
              <h1 className="achievements-title">Achievements</h1>
            </div>
            <div className="achievements-header-actions">
              <button
                type="button"
                className={`achievements-bell-btn${claimableAchievements.length > 0 ? ' achievements-bell-btn--active' : ''}`}
                aria-label={claimableAchievements.length > 0 ? `${claimableAchievements.length} achievements to claim` : 'No achievements to claim'}
                aria-expanded={rewardsModalOpen}
                aria-haspopup="dialog"
                onClick={() => setRewardsModalOpen((o) => !o)}
              >
                <IoNotificationsOutline aria-hidden="true" className="achievements-bell-icon" />
                {claimableAchievements.length > 0 && (
                  <span className="achievements-bell-badge" aria-hidden="true">{claimableAchievements.length > 9 ? '9+' : claimableAchievements.length}</span>
                )}
              </button>
            </div>
          </div>
        </header>

        {rewardsModalOpen && (
          <div className="achievements-rewards-modal-root">
            <button type="button" className="achievements-rewards-modal-backdrop" aria-label="Close" onClick={() => setRewardsModalOpen(false)} />
            <div className="achievements-rewards-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="achievements-rewards-panel-title" onClick={(e) => e.stopPropagation()}>
              <div className="achievements-rewards-modal-header-row">
                <h2 id="achievements-rewards-panel-title" className="achievements-rewards-panel-title">
                  {claimableAchievements.length === 0 ? "You're all caught up" : `${claimableAchievements.length} achievement${claimableAchievements.length === 1 ? '' : 's'} to claim`}
                </h2>
                <button type="button" className="dashboard-overlay-close-btn" aria-label="Close" onClick={() => setRewardsModalOpen(false)}>×</button>
              </div>
              {claimableAchievements.length > 0 ? (
                <div className="achievements-rewards-list">
                  {claimableAchievements.map((badge) => (
                    <div key={badge.id} className="achievements-reward-item">
                      <img src={badge.badgeUrl ?? badgeImg} alt="" className="achievements-reward-item-img" loading="lazy" width="44" height="44" onError={(e) => { e.currentTarget.src = badgeImg; }} />
                      <div className="achievements-reward-item-info">
                        <span className="achievements-reward-item-name">{badge.name}</span>
                        <span className="achievements-reward-item-desc">{badge.description.length > 60 ? `${badge.description.slice(0, 60)}…` : badge.description}</span>
                      </div>
                      <button type="button" className="achievements-reward-item-claim" disabled={claimingId === badge.id} onClick={() => { setRewardsModalOpen(false); handleClaim(badge); }} aria-label={`Claim ${badge.name}`}>
                        {claimingId === badge.id ? '…' : 'Claim'}
                      </button>
                    </div>
                  ))}
                  {claimableAchievements.length > 1 && (
                    <button type="button" className="achievements-rewards-claim-all-btn" onClick={handleClaimAll}>Claim All</button>
                  )}
                </div>
              ) : (
                <p className="achievements-rewards-panel-hint">New badges will appear here when you earn them.</p>
              )}
            </div>
          </div>
        )}

        <div className="achievements-mobile-scroll-content">
          <section className="trophy-podium-section dashboard-anim-top dashboard-anim-delay-1" aria-label="Trophy podium">
            <div className="trophy-showcase-card">
              <div className="trophy-podium-scroll no-scrollbar">
                {trophies.map((trophy) => (
                  <div
                    key={trophy.id}
                    className={`trophy-podium-item ${trophy.isLocked ? 'locked' : ''} ${trophy.claimable ? 'trophy-podium-item--claimable' : ''} ${trophy.claimed ? 'trophy-podium-item--claimed' : ''}`}
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
                    <div className="podium-rank-badge">
                      <img src={trophy.rankImg} alt={`Level ${trophy.id}`} className="rank-icon" loading="lazy" width="36" height="36" />
                      <span className="rank-name">LEVEL {trophy.id}</span>
                    </div>
                    <div className="podium-pillar">
                      <div className="podium-trophy-wrap">
                        <img
                          src={trophy.trophyImg}
                          alt=""
                          className="podium-img"
                          width="60"
                          height="60"
                          {...getTrophyImagePriorityProps(trophy, currentLevelNumber)}
                        />
                      </div>
                      <div className="podium-stats">
                        <div className="podium-progress-bar" role="progressbar" aria-valuenow={trophy.current} aria-valuemin={0} aria-valuemax={trophy.total || 1}>
                          <div className="podium-progress-fill" style={{ width: trophy.isCompleted ? '100%' : trophy.total > 0 ? `${(trophy.current / trophy.total) * 100}%` : '0%' }} />
                        </div>
                        <span className="podium-count">{trophy.isLocked ? 'LOCKED' : trophy.claimed ? 'CLAIMED' : trophy.claimable ? 'READY' : trophy.isCompleted ? 'DONE' : tasksLoading ? '…' : `${trophy.current}/${trophy.total}`}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="achievements-mobile-filters dashboard-anim-top dashboard-anim-delay-2">
            <div className="mobile-search-wrapper">
              <IoSearch className="search-icon" aria-hidden="true" />
              <input type="text" placeholder="Search badges" className="mobile-search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} aria-label="Search badges" />
            </div>
          </div>

          <section className="badges-mobile-grid dashboard-anim-bottom dashboard-anim-delay-3" aria-label="Badges">
            {loadingBadges && <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem', color: 'rgba(1,1,1,0.45)', fontWeight: 600 }}>Loading badges…</div>}
            {!loadingBadges && badgesError && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem' }}>
                <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: '10px' }}>{badgesError}</p>
                <button onClick={loadAchievements} style={{ color: '#059669', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Try again</button>
              </div>
            )}
            {!loadingBadges && !badgesError && filteredBadges.length === 0 && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', gap: '10px', color: 'rgba(1,1,1,0.45)', textAlign: 'center' }}>
                <IoLockClosed size={32} style={{ opacity: 0.35 }} aria-hidden="true" />
                <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>{searchTerm ? `No badges for "${searchTerm}"` : 'No badges yet'}</p>
                <p style={{ fontSize: '0.82rem', margin: 0 }}>Keep training — earned badges will appear here.</p>
              </div>
            )}
            {!loadingBadges && !badgesError && filteredBadges.map((badge) => (
              <div
                key={badge.id}
                className={getCardClass(badge)}
                onClick={() => { if (!badge.claimable) setSelectedBadge(badge); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' && !badge.claimable) setSelectedBadge(badge); }}
              >
                <span className="badge-status-top">{badge.claimed ? (formatDate(badge.unlockedAt) ?? 'Claimed') : badge.claimable ? 'Ready to claim!' : 'Locked'}</span>
                <div className="badge-icon-wrapper">
                  <img src={badge.badgeUrl ?? badgeImg} alt={badge.name} className="badge-img" loading="lazy" width="80" height="80" onError={(e) => { e.currentTarget.src = badgeImg; }} />
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
                    <IoGift aria-hidden="true" style={{ fontSize: '1rem' }} />{claimingId === badge.id ? 'Claiming…' : 'Claim'}
                  </button>
                )}
              </div>
            ))}
          </section>
          <div className="mobile-footer-spacer" />
        </div>
      </div>

      {/* ── Badge Detail Modal ── */}
      {selectedBadge && typeof document !== 'undefined' && createPortal(
        <div className="badge-modal-overlay" onClick={() => setSelectedBadge(null)} role="dialog" aria-modal="true" aria-labelledby="badge-modal-title-m">
          <div className="badge-modal-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="dashboard-overlay-close-btn badge-modal-close" onClick={() => setSelectedBadge(null)} aria-label="Close" style={{ position: 'absolute', top: '20px', right: '20px' }}>×</button>
            <span className="badge-modal-status">{selectedBadge.claimed ? (formatDate(selectedBadge.unlockedAt) ?? 'Claimed') : selectedBadge.claimable ? 'Ready to claim!' : 'Locked'}</span>
            <div className={`badge-modal-icon ${!selectedBadge.claimed && !selectedBadge.claimable ? 'locked' : ''}`}>
              <img src={selectedBadge.badgeUrl ?? badgeImg} alt={selectedBadge.name} className="badge-modal-img" loading="lazy" width="100" height="100" onError={(e) => { e.currentTarget.src = badgeImg; }} />
            </div>
            {formatJourneyStage(selectedBadge) && <span className="badge-journey-chip badge-journey-chip--modal">{formatJourneyStage(selectedBadge)}</span>}
            <h2 id="badge-modal-title-m" className="badge-modal-title">{selectedBadge.name}{selectedBadge.claimed && <IoCheckmarkCircle className="checkmark-icon" aria-label="Claimed" />}</h2>
            {!selectedBadge.claimed ? (
              <>
                <span className="badge-modal-req-label">HOW TO UNLOCK</span>
                <p className="badge-modal-desc" style={{ fontWeight: 700, color: '#059669' }}>{selectedBadge.unlockDescription || 'Keep training to earn this.'}</p>
                {selectedBadge.description && <p className="badge-modal-desc" style={{ opacity: 0.65, fontSize: '0.85rem', marginTop: '-14px' }}>{selectedBadge.description}</p>}
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
                <IoGift aria-hidden="true" style={{ fontSize: '1rem' }} />{claimingId === selectedBadge.id ? 'Claiming…' : 'Claim'}
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── Congratulations Modal ── */}
      {congratsBadge && typeof document !== 'undefined' && createPortal(
        <div className="badge-congrats-overlay" onClick={handleCongratsClose} role="dialog" aria-modal="true" aria-labelledby="badge-congrats-title-m">
          <div className="badge-congrats-card" onClick={(e) => e.stopPropagation()}>
            <div className="badge-congrats-icon-wrap">
              <img src={congratsBadge.badgeUrl ?? badgeImg} alt={congratsBadge.name} className="badge-congrats-img" width="120" height="120" />
            </div>
            <IoTrophy className="badge-congrats-trophy" aria-hidden="true" />
            <h2 id="badge-congrats-title-m" className="badge-congrats-title">Congratulations!</h2>
            <p className="badge-congrats-name">{congratsBadge.name}</p>
            <p className="badge-congrats-desc">{congratsBadge.description}</p>
            <button type="button" className="badge-congrats-done-btn" onClick={handleCongratsClose}>
              {congratsQueue.length > 0 ? 'Next' : 'Done'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback } from 'react';
import { IoCheckmarkCircle, IoSearch, IoNotificationsOutline, IoLockClosed } from 'react-icons/io5';
import { getSpriteUrl } from '../../utils/assetUtils';
import { useAuthContext } from '../../context/useAuthContext';
import { useActivitiesJourneyTasks } from '../../hooks/useActivitiesJourneyTasks';
import { useJourneyRemoteState } from '../../hooks/useJourneyRemoteState';
import {
  getActivityMetrics,
  isActivityTaskCompleted,
  GLOBAL_ACTIVITY_SCOPE,
} from '../../utils/activityProgress';
import Button from '../../components/common/Button';
import {
  acknowledgeAllPublishedUnlockedBadges,
  claimAllPublishedRewards,
  getClaimableRewardCount,
  subscribeAchievementBadgeUpdates,
  syncUnlockedBadgeIds,
} from '../../utils/achievementNavBadge';
import { fetchUserAchievements } from '../../services/achievementsService';
import './AchievementsPageMobile.css';

const trophyImg     = getSpriteUrl('Thropies/Thropy.png');
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
  try {
    return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
  } catch {
    return null;
  }
}

function readClaimable() {
  if (typeof window === 'undefined') return 0;
  return getClaimableRewardCount();
}

export default function AchievementsPageMobile() {
  const { user } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [rewardsModalOpen, setRewardsModalOpen] = useState(false);
  const [claimableCount, setClaimableCount] = useState(readClaimable);
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

  /* ── Claimable rewards sync ── */
  useEffect(() => {
    const sync = () => setClaimableCount(getClaimableRewardCount());
    sync();
    return subscribeAchievementBadgeUpdates(sync);
  }, []);

  /* ── Modal keyboard + scroll lock ── */
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

  /* ── Filtered badges ── */
  const filteredBadges = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return achievements;
    return achievements.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [achievements, searchTerm]);

  const bellBadgeLabel = claimableCount >= 10 ? '9+' : String(Math.max(0, claimableCount));

  const handleClaimAll = useCallback(() => {
    if (claimableCount === 0) return;
    claimAllPublishedRewards();
    setClaimableCount(0);
    setRewardsModalOpen(false);
  }, [claimableCount]);

  return (
    <div className="achievements-mobile-page dashboard-anim-fade">
      <div className="achievements-mobile-container">

        {/* ── Header ── */}
        <header className="achievements-mobile-header dashboard-anim-top">
          <div className="achievements-mobile-header-row">
            <div className="header-titles">
              <span className="achievements-kicker">Milestones</span>
              <h1 className="achievements-title">Achievements</h1>
            </div>
            <div className="achievements-header-actions">
              <button
                type="button"
                className={`achievements-bell-btn${claimableCount > 0 ? ' achievements-bell-btn--active' : ''}`}
                aria-label={
                  claimableCount > 0
                    ? `Rewards, ${claimableCount >= 10 ? '9 or more' : claimableCount} to claim`
                    : 'Rewards, nothing to claim'
                }
                aria-expanded={rewardsModalOpen}
                aria-haspopup="dialog"
                onClick={() => setRewardsModalOpen((o) => !o)}
              >
                <IoNotificationsOutline aria-hidden className="achievements-bell-icon" />
                {claimableCount > 0 && (
                  <span className="achievements-bell-badge" aria-hidden>
                    {bellBadgeLabel}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {rewardsModalOpen && (
          <div className="achievements-rewards-modal-root">
            <button
              type="button"
              className="achievements-rewards-modal-backdrop"
              aria-label="Close rewards"
              onClick={() => setRewardsModalOpen(false)}
            />
            <div
              className="achievements-rewards-modal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="achievements-rewards-panel-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="achievements-rewards-modal-header-row">
                <h2 id="achievements-rewards-panel-title" className="achievements-rewards-panel-title">
                  {claimableCount === 0
                    ? "You're all caught up"
                    : `You have ${claimableCount >= 10 ? '9+' : claimableCount} reward${claimableCount === 1 ? '' : 's'} to claim`}
                </h2>
                <button
                  type="button"
                  className="dashboard-overlay-close-btn"
                  aria-label="Close"
                  onClick={() => setRewardsModalOpen(false)}
                >
                  ×
                </button>
              </div>
              <p className="achievements-rewards-panel-hint">
                {claimableCount === 0
                  ? 'New badges will appear here when you earn them.'
                  : 'Collect everything in one tap, or claim individual badges below.'}
              </p>
              <Button
                type="button"
                variant="practice"
                className="achievements-rewards-claim-all"
                disabled={claimableCount === 0}
                onClick={handleClaimAll}
              >
                Claim all
              </Button>
            </div>
          </div>
        )}

        <div className="achievements-mobile-scroll-content">
          {/* ── Trophy Podium ── */}
          <section className="trophy-podium-section dashboard-anim-top dashboard-anim-delay-1">
            <div className="trophy-showcase-card">
              <div className="trophy-podium-scroll no-scrollbar">
                {trophies.map((trophy) => (
                  <div key={trophy.id} className={`trophy-podium-item ${trophy.isLocked ? 'locked' : ''}`}>
                    <div className="podium-rank-badge">
                      <img src={trophy.rankImg} alt={trophy.name} className="rank-icon" />
                      <span className="rank-name">LEVEL {trophy.id}</span>
                    </div>
                    <div className="podium-pillar">
                      <div className="podium-trophy-wrap">
                        <img src={trophyImg} alt={trophy.name} className="podium-img" />
                      </div>
                      <div className="podium-stats">
                        <div className="podium-progress-bar">
                          <div
                            className="podium-progress-fill"
                            style={{
                              width: trophy.isCompleted
                                ? '100%'
                                : trophy.total > 0
                                  ? `${(trophy.current / trophy.total) * 100}%`
                                  : '0%',
                            }}
                          />
                        </div>
                        <span className="podium-count">
                          {trophy.isLocked
                            ? 'LOCKED'
                            : trophy.isCompleted
                              ? 'DONE'
                              : tasksLoading
                                ? '…'
                                : `${trophy.current}/${trophy.total}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Filter Bar ── */}
          <div className="achievements-mobile-filters dashboard-anim-top dashboard-anim-delay-2">
            <div className="mobile-search-wrapper">
              <IoSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search badges"
                className="mobile-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* ── Badges Grid ── */}
          <section className="badges-mobile-grid dashboard-anim-bottom dashboard-anim-delay-3">
            {loadingBadges && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem', color: 'rgba(1,1,1,0.45)', fontWeight: 600 }}>
                Loading badges…
              </div>
            )}

            {!loadingBadges && badgesError && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem' }}>
                <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: '10px' }}>{badgesError}</p>
                <button
                  onClick={loadAchievements}
                  style={{ color: '#059669', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem' }}
                >
                  Try again
                </button>
              </div>
            )}

            {!loadingBadges && !badgesError && filteredBadges.length === 0 && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', gap: '10px', color: 'rgba(1,1,1,0.45)', textAlign: 'center' }}>
                <IoLockClosed size={32} style={{ opacity: 0.35 }} />
                <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                  {searchTerm ? `No badges found for "${searchTerm}"` : 'No badges yet'}
                </p>
                <p style={{ fontSize: '0.82rem', margin: 0 }}>
                  Keep training — earned badges will appear here.
                </p>
              </div>
            )}

            {!loadingBadges && !badgesError && filteredBadges.map((badge) => (
              <div key={badge.id} className={`badge-card ${!badge.unlocked ? 'locked' : ''}`}>
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

                <p className="badge-description">{badge.description}</p>

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

          <div className="mobile-footer-spacer" />
        </div>
      </div>
    </div>
  );
}

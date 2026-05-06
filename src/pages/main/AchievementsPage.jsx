import { useState, useMemo, useEffect } from 'react';
import { IoCheckmarkCircle, IoSearch, IoLockClosed } from 'react-icons/io5';
import { getSpriteUrl } from '../../utils/assetUtils';
import { useAuthContext } from '../../context/useAuthContext';
import { useActivitiesJourneyTasks } from '../../hooks/useActivitiesJourneyTasks';
import { useJourneyRemoteState } from '../../hooks/useJourneyRemoteState';
import { 
  getActivityMetrics, 
  isActivityTaskCompleted, 
  GLOBAL_ACTIVITY_SCOPE 
} from '../../utils/activityProgress';
import './AchievementsPage.css';

const trophyImg = getSpriteUrl('Thropies/Thropy.png');
const badgeImg = getSpriteUrl('Badges/Badge.png');
const rankBronze = getSpriteUrl('Rank/rank-bronze.png');
const rankSilver = getSpriteUrl('Rank/rank-silver.png');
const rankGold = getSpriteUrl('Rank/rank-gold.png');
const rankMythril = getSpriteUrl('Rank/rank-mythril.png');
const rankLegendary = getSpriteUrl('Rank/rank-legendary.png');

const MOCK_BADGES = [
  { id: 1, title: 'New here', desc: 'Finish profiling and pre-testing', status: '01/01/2026', progress: 1, total: 1, unlocked: true },
  { id: 2, title: 'First', desc: 'Complete your first recording', status: 'Locked', progress: 0, total: 1, unlocked: false },
  { id: 3, title: 'First', desc: 'Complete your first recording', status: 'Locked', progress: 0, total: 1, unlocked: false },
  { id: 4, title: 'First', desc: 'Complete your first recording', status: 'Locked', progress: 0, total: 1, unlocked: false },
  { id: 5, title: 'First', desc: 'Complete your first recording', status: 'Locked', progress: 0, total: 1, unlocked: false },
];

const RANK_IMGS = [rankBronze, rankSilver, rankGold, rankMythril, rankLegendary];
const RANK_NAMES = ['BRONZE', 'SILVER', 'GOLD', 'MYTHRIL', 'LEGENDARY'];

export default function AchievementsPage() {
  const { user } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Current user rank (Level 1-5)
  const currentLevelNumber = user?.speakerLevelNumber || 1;
  
  // Fetch tasks for the current level to show real progress on the current trophy
  const { tasks, loading: tasksLoading } = useActivitiesJourneyTasks(currentLevelNumber);
  const { metricsSyncKey } = useJourneyRemoteState(user);
  
  const scopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;
  const activityMetrics = useMemo(() => getActivityMetrics(scopeKey), [scopeKey, metricsSyncKey]);

  const trophies = useMemo(() => {
    return [1, 2, 3, 4, 5].map((lvl) => {
      const isCurrentLevel = lvl === currentLevelNumber;
      const isUnlocked = lvl <= currentLevelNumber;
      
      // Real data for current level, fallback to mock for others
      let total = lvl === 1 ? 31 : lvl === 2 ? 50 : lvl === 3 ? 100 : lvl === 4 ? 200 : 500;
      let current = isUnlocked ? total : 0;

      if (isCurrentLevel) {
        total = tasks.length || total;
        current = tasks.filter((t) => isActivityTaskCompleted(t.id, activityMetrics)).length;
      } else if (lvl > currentLevelNumber) {
        current = 0;
      }

      return {
        id: lvl,
        name: RANK_NAMES[lvl - 1],
        rank: RANK_NAMES[lvl - 1],
        rankImg: RANK_IMGS[lvl - 1],
        total,
        current,
        unlocked: isUnlocked
      };
    });
  }, [currentLevelNumber, tasks, activityMetrics]);

  return (
    <div className="achievements-container dashboard-anim-fade">
      <header className="achievements-header dashboard-anim-top">
        <span className="achievements-kicker">Milestones</span>
        <h1 className="achievements-title">Achievements</h1>
      </header>

      {/* ── Trophy Showcase ── */}
      <section className="trophy-showcase-card dashboard-anim-top dashboard-anim-delay-1">
        {trophies.map((trophy) => (
          <div key={trophy.id} className={`trophy-item ${!trophy.unlocked ? 'locked' : ''}`}>
            <div className="trophy-rank-badge">
              <img src={trophy.rankImg} alt={trophy.rank} className="rank-icon" />
              <span className="rank-name">LEVEL {trophy.id}</span>
            </div>
            <div className="trophy-wrapper">
              <img src={trophyImg} alt={trophy.name} className="trophy-img" />
            </div>
            <div className="trophy-progress-container">
              <div className="trophy-progress-bar">
                <div 
                  className="trophy-progress-fill" 
                  style={{ width: `${trophy.total > 0 ? (trophy.current / trophy.total) * 100 : 0}%` }}
                />
              </div>
              <span className="trophy-progress-text">
                {!trophy.unlocked ? 'Locked' : `${trophy.current}/${trophy.total}`}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* ── Filter Bar ── */}
      <div className="achievements-filter-bar dashboard-anim-top dashboard-anim-delay-2">
        <div className="search-wrapper">
          <input 
            type="text" 
            placeholder="Search" 
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select className="filter-select">
          <option>Levels</option>
        </select>
        <select className="filter-select">
          <option>Ascending</option>
        </select>
      </div>

      {/* ── Badges Grid ── */}
      <section className="badges-grid dashboard-anim-bottom dashboard-anim-delay-3">
        {MOCK_BADGES.map((badge) => (
          <div key={badge.id} className={`badge-card ${!badge.unlocked ? 'locked' : ''}`}>
            <span className="badge-status-top">{badge.status}</span>
            
            <div className="badge-icon-wrapper">
              <img src={badgeImg} alt={badge.title} className="badge-img" />
            </div>

            <h3 className="badge-title">
              {badge.title} 
              {badge.unlocked && <IoCheckmarkCircle className="checkmark-icon" />}
            </h3>
            
            <p className="badge-description">{badge.desc}</p>

            <div className="badge-progress-container">
              <div className="badge-progress-bar">
                <div 
                  className="badge-progress-fill" 
                  style={{ width: `${(badge.progress / badge.total) * 100}%` }}
                />
              </div>
              <span className="badge-progress-text">
                {badge.progress}/{badge.total}
              </span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

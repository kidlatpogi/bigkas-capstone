import { useState } from 'react';
import { IoCheckmarkCircle, IoSearch, IoLockClosed, IoChevronBack } from 'react-icons/io5';
import { getSpriteUrl } from '../../utils/assetUtils';

const trophyImg = getSpriteUrl('Thropies/Thropy.png');
const badgeImg = getSpriteUrl('Badges/Badge.png');
const rankBronze = getSpriteUrl('Rank/rank-bronze.png');
const rankSilver = getSpriteUrl('Rank/rank-silver.png');
const rankGold = getSpriteUrl('Rank/rank-gold.png');
const rankMythril = getSpriteUrl('Rank/rank-mythril.png');
const rankLegendary = getSpriteUrl('Rank/rank-legendary.png');
import './AchievementsPageMobile.css';

const MOCK_TROPHIES = [
  { id: 1, name: 'Bronze', rank: 'BRONZE', rankImg: rankBronze, total: 31, current: 1, unlocked: true },
  { id: 2, name: 'Silver', rank: 'SILVER', rankImg: rankSilver, total: 50, current: 0, unlocked: false },
  { id: 3, name: 'Gold', rank: 'GOLD', rankImg: rankGold, total: 100, current: 0, unlocked: false },
  { id: 4, name: 'Mythril', rank: 'MYTHRIL', rankImg: rankMythril, total: 200, current: 0, unlocked: false },
  { id: 5, name: 'Legendary', rank: 'LEGENDARY', rankImg: rankLegendary, total: 500, current: 0, unlocked: false },
];

const MOCK_BADGES = [
  {
    id: 1,
    title: 'New here',
    desc: 'Finish profiling and pre-testing',
    status: '01/01/2026',
    progress: 1,
    total: 1,
    unlocked: true
  },
  {
    id: 2,
    title: 'First',
    desc: 'Complete your first recording',
    status: 'Locked',
    progress: 0,
    total: 1,
    unlocked: false
  },
  {
    id: 3,
    title: 'Explorer',
    desc: 'Try all session modes',
    status: 'Locked',
    progress: 1,
    total: 4,
    unlocked: false
  },
  {
    id: 4,
    title: 'Consistency',
    desc: '3-day training streak',
    status: 'Locked',
    progress: 0,
    total: 3,
    unlocked: false
  },
];

export default function AchievementsPageMobile() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="achievements-mobile-page dashboard-anim-fade">
      <div className="achievements-mobile-container">
        
        {/* ── Header ── */}
        <header className="achievements-mobile-header dashboard-anim-top">
          <div className="header-titles">
            <span className="achievements-kicker">Milestones</span>
            <h1 className="achievements-title">Achievements</h1>
          </div>
        </header>

        <div className="achievements-mobile-scroll-content">
          {/* ── Trophy Podium ── */}
          <section className="trophy-podium-section dashboard-anim-top dashboard-anim-delay-1">
            <div className="trophy-showcase-card">
              <div className="trophy-podium-scroll no-scrollbar">
                {MOCK_TROPHIES.map((trophy) => (
                  <div key={trophy.id} className={`trophy-podium-item ${!trophy.unlocked ? 'locked' : ''}`}>
                    <div className="podium-rank-badge">
                      <img src={trophy.rankImg} alt={trophy.rank} className="rank-icon" />
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
                            style={{ width: `${(trophy.current / trophy.total) * 100}%` }}
                          />
                        </div>
                        <span className="podium-count">
                          {trophy.unlocked ? `${trophy.current}/${trophy.total}` : 'LOCKED'}
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
                placeholder="Search" 
                className="mobile-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="mobile-filter-row">
              <select className="mobile-filter-select">
                <option>Levels</option>
              </select>
              <select className="mobile-filter-select">
                <option>Ascending</option>
              </select>
            </div>
          </div>

          {/* ── Badges Grid ── */}
          <section className="badges-mobile-grid dashboard-anim-bottom dashboard-anim-delay-3">
            {MOCK_BADGES.filter(b => b.title.toLowerCase().includes(searchTerm.toLowerCase())).map((badge) => (
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

          <div className="mobile-footer-spacer" />
        </div>
      </div>
    </div>
  );
}

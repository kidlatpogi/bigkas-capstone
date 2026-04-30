import { useState } from 'react';
import { IoCheckmarkCircle, IoSearch, IoLockClosed } from 'react-icons/io5';
import trophyImg from '../../assets/Sprites/Thropies/Thropy.png';
import badgeImg from '../../assets/Sprites/Badges/Badge.png';
import './AchievementsPage.css';

const MOCK_TROPHIES = [
  { id: 1, name: 'Bronze', total: 31, current: 1, unlocked: true },
  { id: 2, name: 'Silver', total: 50, current: 0, unlocked: false },
  { id: 3, name: 'Gold', total: 100, current: 0, unlocked: false },
  { id: 4, name: 'Platinum', total: 200, current: 0, unlocked: false },
  { id: 5, name: 'Diamond', total: 500, current: 0, unlocked: false },
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
    title: 'First', 
    desc: 'Complete your first recording', 
    status: 'Locked', 
    progress: 0, 
    total: 1, 
    unlocked: false 
  },
  { 
    id: 4, 
    title: 'First', 
    desc: 'Complete your first recording', 
    status: 'Locked', 
    progress: 0, 
    total: 1, 
    unlocked: false 
  },
  { 
    id: 5, 
    title: 'First', 
    desc: 'Complete your first recording', 
    status: 'Locked', 
    progress: 0, 
    total: 1, 
    unlocked: false 
  },
];

export default function AchievementsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="achievements-container dashboard-anim-fade">
      <header className="achievements-header dashboard-anim-top">
        <span className="achievements-kicker">Milestones</span>
        <h1 className="achievements-title">Achievements</h1>
      </header>

      {/* ── Trophy Showcase ── */}
      <section className="trophy-showcase-card dashboard-anim-top dashboard-anim-delay-1">
        {MOCK_TROPHIES.map((trophy) => (
          <div key={trophy.id} className={`trophy-item ${!trophy.unlocked ? 'locked' : ''}`}>
            <div className="trophy-wrapper">
              <img src={trophyImg} alt={trophy.name} className="trophy-img" />
              {!trophy.unlocked && (
                <div className="lock-overlay">
                  <div className="lock-icon-bg">
                    <IoLockClosed />
                  </div>
                </div>
              )}
            </div>
            <div className="trophy-progress-container">
              <div className="trophy-progress-bar">
                <div 
                  className="trophy-progress-fill" 
                  style={{ width: `${(trophy.current / trophy.total) * 100}%` }}
                />
              </div>
              <span className="trophy-progress-text">
                {trophy.unlocked ? `${trophy.current}/${trophy.total}` : 'Locked'}
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

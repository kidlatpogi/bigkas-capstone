import { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import {
  IoBookOutline,
  IoMedalOutline,
  IoHomeOutline,
  IoSettingsOutline,
  IoStatsChartOutline,
} from 'react-icons/io5';
import { ROUTES } from '../../utils/constants';
import { useAchievementNavBadge } from '../../hooks/useAchievementNavBadge';
import ProfileModal from './ProfileModal';
import './BottomNav.css';

const NAV_ITEMS = [
  { label: 'Home', to: ROUTES.ACTIVITY, icon: IoHomeOutline, type: 'link' },
  { label: 'Progress', to: ROUTES.PROGRESS, icon: IoStatsChartOutline, type: 'link' },
  { label: 'Learn', to: ROUTES.FRAMEWORKS, icon: IoBookOutline, type: 'link' },
  { label: 'Achievement', to: ROUTES.ACHIEVEMENTS, icon: IoMedalOutline, type: 'link' },
  { label: 'Settings', to: null, icon: IoSettingsOutline, type: 'modal' },
];

function BottomNav() {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const achievementPendingCount = useAchievementNavBadge();

  const handleProfileClick = (e) => {
    e.preventDefault();
    setIsProfileModalOpen((prev) => !prev);
  };

  const navContent = (
    <nav className="bottom-nav" aria-label="Mobile bottom navigation">
      {NAV_ITEMS.map(({ label, to, icon: Icon, type }) => {
        if (type === 'modal') {
          return (
            <button
              key={label}
              type="button"
              className={`bottom-nav__item bottom-nav__item--modal${isProfileModalOpen ? ' active active-nav-item' : ''}`}
              aria-label={label}
              onClick={handleProfileClick}
            >
              <div className="bottom-nav__pill">
                <div className="bottom-nav__icon-wrapper">
                  <Icon aria-hidden="true" />
                </div>
                <span>{label}</span>
              </div>
            </button>
          );
        }

        const isAchievementTab = to === ROUTES.ACHIEVEMENTS;
        const showAchievementBadge = isAchievementTab && achievementPendingCount > 0;
        const badgeLabel =
          achievementPendingCount >= 10 ? '9+' : String(achievementPendingCount);
        const navAriaLabel =
          showAchievementBadge && isAchievementTab
            ? `${label}, ${achievementPendingCount >= 10 ? '9 or more' : achievementPendingCount} new rewards`
            : label;

        return (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => 
              `bottom-nav__item${(isActive && !isProfileModalOpen) ? ' active active-nav-item' : ''}`
            }
            aria-label={navAriaLabel}
            onClick={() => setIsProfileModalOpen(false)}
          >
            <div className="bottom-nav__pill">
              <div
                className={`bottom-nav__icon-wrapper${showAchievementBadge ? ' bottom-nav__icon-wrapper--badged' : ''}`}
              >
                <Icon aria-hidden="true" />
                {showAchievementBadge && (
                  <span className="bottom-nav__badge" aria-hidden="true">
                    {badgeLabel}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </div>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <>
      {typeof document !== 'undefined' ? createPortal(navContent, document.body) : navContent}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </>
  );
}

export default BottomNav;

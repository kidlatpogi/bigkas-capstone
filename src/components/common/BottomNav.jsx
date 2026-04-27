import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  IoBookOutline,
  IoMedalOutline,
  IoHomeOutline,
  IoSettingsOutline,
} from 'react-icons/io5';
import { ROUTES } from '../../utils/constants';
import ProfileModal from './ProfileModal';
import './BottomNav.css';

const NAV_ITEMS = [
  { label: 'Home', to: ROUTES.ACTIVITY, icon: IoHomeOutline, type: 'link' },
  { label: 'Learn', to: ROUTES.FRAMEWORKS, icon: IoBookOutline, type: 'link' },
  { label: 'Achievement', to: ROUTES.ACHIEVEMENTS, icon: IoMedalOutline, type: 'link' },
  { label: 'Profile', to: null, icon: IoSettingsOutline, type: 'modal' },
];

function BottomNav() {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleProfileClick = (e) => {
    e.preventDefault();
    setIsProfileModalOpen(true);
  };

  return (
    <>
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
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `bottom-nav__item${isActive ? ' active active-nav-item' : ''}`}
              aria-label={label}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </>
  );
}

export default BottomNav;

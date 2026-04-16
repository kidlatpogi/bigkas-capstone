import { NavLink } from 'react-router-dom';
import {
  IoBookOutline,
  IoHomeOutline,
  IoSettingsOutline,
  IoSpeedometerOutline,
  IoStatsChartOutline,
} from 'react-icons/io5';
import { ROUTES } from '../../utils/constants';
import './BottomNav.css';

const NAV_ITEMS = [
  { label: 'Dashboard', to: ROUTES.DASHBOARD, icon: IoSpeedometerOutline },
  { label: 'Progress', to: ROUTES.PROGRESS, icon: IoStatsChartOutline },
  { label: 'Home', to: ROUTES.ACTIVITY, icon: IoHomeOutline },
  { label: 'Learn', to: ROUTES.FRAMEWORKS, icon: IoBookOutline },
  { label: 'Settings', to: ROUTES.SETTINGS, icon: IoSettingsOutline },
];

function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Mobile bottom navigation">
      {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `bottom-nav__item${isActive ? ' active' : ''}`}
          aria-label={label}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;

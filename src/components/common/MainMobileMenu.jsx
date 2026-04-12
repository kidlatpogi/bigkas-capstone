import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import StaggeredMenu from './StaggeredMenu';
import './MainMobileMenu.css';

function MainMobileMenu() {
  const { pathname } = useLocation();
  const { user, logout } = useAuthContext();

  const displayName = user?.nickname || user?.name || 'Speaker';

  const navItems = useMemo(
    () => [
      { label: 'Home', link: ROUTES.DASHBOARD, active: pathname === ROUTES.DASHBOARD },
      { label: 'Progress', link: ROUTES.PROGRESS, active: pathname === ROUTES.PROGRESS },
      { label: 'Activity', link: ROUTES.ACTIVITY, active: pathname === ROUTES.ACTIVITY },
      { label: 'Learn', link: ROUTES.FRAMEWORKS, active: pathname === ROUTES.FRAMEWORKS },
      { label: 'Profile', link: ROUTES.PROFILE, active: pathname === ROUTES.PROFILE },
      { label: 'Log Out', link: '#', onClick: logout },
    ],
    [logout, pathname],
  );

  return (
    <StaggeredMenu
      items={navItems}
      brandName="Bigkas"
      userName={displayName}
      menuButtonColor="#002d4f"
      accentColor="#ff9f1c"
      colors={['#002d4f', '#0a3d5c', '#2d3d2a']}
      displaySocials={false}
      displayItemNumbering={true}
      className="main-mobile-menu"
      isFixed={true}
    />
  );
}

export default MainMobileMenu;
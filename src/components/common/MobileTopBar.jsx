import { Link } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import tempProfile from '../../assets/Temporary Logo.png';
import './MobileTopBar.css';

function MobileTopBar() {
  const { user } = useAuthContext();
  const profileImageSrc =
    user?.avatarUrl ||
    user?.avatar_url ||
    user?.profileImage ||
    user?.photoURL ||
    tempProfile;

  return (
    <header className="mobile-top-bar" aria-label="Mobile top navigation">
      <span className="mobile-top-bar__brand">Bigkas</span>
      <Link className="mobile-top-bar__profile-link" to={ROUTES.PROFILE} aria-label="Go to profile">
        <img
          className="mobile-topbar-profile-img"
          src={profileImageSrc}
          alt="Profile"
        />
      </Link>
    </header>
  );
}

export default MobileTopBar;

import { Link } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import bigkasLogo from '../../assets/logos/0015.png';
import './MobileTopBar.css';

function getUserInitials(user) {
  const fullName = String(user?.user_metadata?.full_name || user?.name || '').trim();
  const email = String(user?.email || '').trim();
  const source = fullName || email.split('@')[0] || '';
  const parts = source
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return 'U';
  }

  const firstInitial = parts[0]?.[0] || '';
  const lastInitial = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
  return `${firstInitial}${lastInitial || ''}`.toUpperCase() || 'U';
}

function MobileTopBar() {
  const { user } = useAuthContext();
  const userInitials = getUserInitials(user);

  return (
    <header className="mobile-top-bar" aria-label="Mobile top navigation">
      <div className="mobile-top-bar__brand-wrap">
        <img src={bigkasLogo} alt="" className="mobile-top-bar__logo" />
        <span className="mobile-top-bar__brand">Bigkas</span>
      </div>
      <Link className="mobile-top-bar__profile-link" to={ROUTES.PROFILE} aria-label="Go to profile">
        <div className="mobile-avatar" aria-hidden="true">
          {userInitials}
        </div>
      </Link>
    </header>
  );
}

export default MobileTopBar;

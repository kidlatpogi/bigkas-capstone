import { Link } from 'react-router-dom';
import { IoPersonCircleOutline } from 'react-icons/io5';
import { ROUTES } from '../../utils/constants';
import './MobileTopBar.css';

function MobileTopBar() {
  return (
    <header className="mobile-top-bar" aria-label="Mobile top navigation">
      <span className="mobile-top-bar__brand">Bigkas</span>
      <Link className="mobile-top-bar__profile-link" to={ROUTES.PROFILE} aria-label="Go to profile">
        <IoPersonCircleOutline aria-hidden="true" />
      </Link>
    </header>
  );
}

export default MobileTopBar;

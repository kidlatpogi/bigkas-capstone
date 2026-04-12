import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import LandingPage from '../landing/LandingPage';
import LoginPage from './LoginPage';
import './LandingLoginTransition.css';

function LandingLoginTransition() {
  const { pathname } = useLocation();
  const isLogin = pathname === ROUTES.LOGIN;

  useEffect(() => {
    // Ensure register route classes never leak into the transition container.
    document.documentElement.classList.remove('register-page-active');
    document.body.classList.remove('register-page-active');

    document.documentElement.classList.add('auth-slide-active');
    document.body.classList.add('auth-slide-active');

    document.documentElement.classList.toggle('landing-page-active', !isLogin);
    document.body.classList.toggle('landing-page-active', !isLogin);

    document.documentElement.classList.toggle('login-page-active', isLogin);
    document.body.classList.toggle('login-page-active', isLogin);

    return () => {
      document.documentElement.classList.remove('auth-slide-active');
      document.body.classList.remove('auth-slide-active');
      document.documentElement.classList.remove('landing-page-active');
      document.body.classList.remove('landing-page-active');
      document.documentElement.classList.remove('login-page-active');
      document.body.classList.remove('login-page-active');
      document.documentElement.classList.remove('register-page-active');
      document.body.classList.remove('register-page-active');
    };
  }, [isLogin]);

  return (
    <div className={`auth-slide-stage ${isLogin ? 'is-login' : 'is-landing'}`}>
      <div className="auth-slide-track">
        <section className="auth-slide-panel auth-slide-panel--landing" aria-hidden={isLogin}>
          <LandingPage managePageClass={false} />
        </section>

        <section className="auth-slide-panel auth-slide-panel--login" aria-hidden={!isLogin}>
          <LoginPage managePageClass={false} />
        </section>
      </div>
    </div>
  );
}

export default LandingLoginTransition;

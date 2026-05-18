import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isInitializing } = useAuthContext();

  useEffect(() => {
    if (isInitializing) return;
    navigate(isAuthenticated ? ROUTES.ACTIVITY : ROUTES.LOGIN, { replace: true });
  }, [isAuthenticated, isInitializing, navigate]);

  return null;
}

export default OAuthCallbackPage;

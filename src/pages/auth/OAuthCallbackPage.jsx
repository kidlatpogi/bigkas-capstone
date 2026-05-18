import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { supabase } from '../../lib/supabase';
import { ROUTES } from '../../utils/constants';

function resolvePostAuthRoute(user) {
  if (user?.onboardingStage === 'profiling') return ROUTES.USER_PROFILING;
  if (user?.onboardingStage === 'pretest') return ROUTES.USER_PRETEST;
  if (user?.onboardingStage === 'analyzing') return ROUTES.USER_ANALYZING;
  return ROUTES.ACTIVITY;
}

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isInitializing, user } = useAuthContext();

  useEffect(() => {
    if (isInitializing) return;

    if (isAuthenticated) {
      navigate(resolvePostAuthRoute(user), { replace: true });
      return;
    }

    let isCancelled = false;
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (isCancelled) return;
        navigate(session ? ROUTES.ACTIVITY : ROUTES.LOGIN, { replace: true });
      })
      .catch(() => {
        if (!isCancelled) navigate(ROUTES.LOGIN, { replace: true });
      });

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, isInitializing, navigate, user]);

  return null;
}

export default OAuthCallbackPage;

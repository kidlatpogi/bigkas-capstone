import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAuthContext } from '../context/useAuthContext';
import { ENV } from '../config/env';
import { ROUTES } from '../utils/constants';

// Auth Pages
const AdminLoginPage = lazy(() => import('../pages/auth/AdminLoginPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const LandingPage = lazy(() => import('../pages/landing/LandingPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));

// Main Pages
const AdminDashboardPage = lazy(() => import('../pages/main/AdminDashboardPage'));
const ProgressPage = lazy(() => import('../pages/main/ProgressPage'));
const ProgressPageMobile = lazy(() => import('../pages/main/ProgressPageMobile'));
const AchievementsPage = lazy(() => import('../pages/main/AchievementsPage'));
const SettingsProfilePage = lazy(() => import('../pages/main/SettingsProfilePage'));
const SettingsProfilePageMobile = lazy(() => import('../pages/main/SettingsProfilePageMobile'));
const SettingsPage = lazy(() => import('../pages/main/SettingsPage'));
const SettingsPageMobile = lazy(() => import('../pages/main/SettingsPageMobile'));
const ChangePasswordPage = lazy(() => import('../pages/main/ChangePasswordPage'));
const AccountSettingsPage = lazy(() => import('../pages/main/AccountSettingsPage'));
const TrainingSetupPage = lazy(() => import('../pages/main/TrainingSetupPage'));
const TrainingPage = lazy(() => import('../pages/main/TrainingPage'));
const FrameworksPage = lazy(() => import('../pages/main/FrameworksPage'));
const TestAudioVideoPage = lazy(() => import('../pages/main/TestAudioVideoPage'));
const UserProfilingPage = lazy(() => import('../pages/main/UserProfilingPage'));
const UserPretestPage = lazy(() => import('../pages/main/UserPretestPage'));
const UserAnalyzingPage = lazy(() => import('../pages/main/UserAnalyzingPage'));
const ActivityPage = lazy(() => import('../pages/main/ActivityPage'));
const ActivityPageMobile = lazy(() => import('../pages/main/ActivityPageMobile'));
const AchievementsPageMobile = lazy(() => import('../pages/main/AchievementsPageMobile'));

// Session Pages
const SessionDetailPage = lazy(() => import('../pages/session/SessionDetailPage'));
const DetailedFeedbackPage = lazy(() => import('../pages/session/DetailedFeedbackPage'));

// Main Pages (continued)
const PracticePage = lazy(() => import('../pages/main/PracticePage'));

// Components
const SideNav = lazy(() => import('../components/common/SideNav'));
const BottomNav = lazy(() => import('../components/common/BottomNav'));
import { getAssetUrl } from '../utils/assetUtils';

const bigkasLogo = getAssetUrl('Images/Bigkas-Logo.webp');

/**
 * ActivityPageWrapper - Conditionally renders desktop or mobile version
 * based on viewport size
 */
function ActivityPageWrapper() {
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleViewportChange = (event) => setIsMobileViewport(event.matches);

    setIsMobileViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleViewportChange);
      return () => mediaQuery.removeEventListener('change', handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  return isMobileViewport ? <ActivityPageMobile /> : <ActivityPage />;
}

function ProgressPageWrapper() {
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleViewportChange = (event) => setIsMobileViewport(event.matches);

    setIsMobileViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleViewportChange);
      return () => mediaQuery.removeEventListener('change', handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  return isMobileViewport ? <ProgressPageMobile /> : <ProgressPage />;
}

function AchievementsPageWrapper() {
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleViewportChange = (event) => setIsMobileViewport(event.matches);

    setIsMobileViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleViewportChange);
      return () => mediaQuery.removeEventListener('change', handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  return isMobileViewport ? <AchievementsPageMobile /> : <AchievementsPage />;
}

function SettingsProfilePageWrapper() {
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleViewportChange = (event) => setIsMobileViewport(event.matches);

    setIsMobileViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleViewportChange);
      return () => mediaQuery.removeEventListener('change', handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  return isMobileViewport ? <SettingsProfilePageMobile /> : <SettingsProfilePage />;
}

function SettingsPageWrapper() {
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleViewportChange = (event) => setIsMobileViewport(event.matches);

    setIsMobileViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleViewportChange);
      return () => mediaQuery.removeEventListener('change', handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  return isMobileViewport ? <SettingsPageMobile /> : <SettingsPage />;
}

function getAuthenticatedRedirect(user, isAdminAuthenticated) {
  if (isAdminAuthenticated) return ROUTES.ADMIN_DASHBOARD;
  if (user?.onboardingStage === 'profiling') return ROUTES.USER_PROFILING;
  if (user?.onboardingStage === 'pretest') return ROUTES.USER_PRETEST;
  if (user?.onboardingStage === 'analyzing') return ROUTES.USER_ANALYZING;
  return ROUTES.ACTIVITY;
}

/**
 * Protected Route Wrapper
 * - If not authenticated → redirect to login
 * - Otherwise render the protected page with Navbar
 */
function ProtectedRoute() {
  const { isAuthenticated, isInitializing, user } = useAuthContext();
  const { pathname } = useLocation();
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleViewportChange = (event) => setIsMobileViewport(event.matches);

    setIsMobileViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleViewportChange);
      return () => mediaQuery.removeEventListener('change', handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  const hideMainNav =
    pathname === ROUTES.USER_PROFILING ||
    pathname === ROUTES.USER_PRETEST ||
    pathname === ROUTES.USER_ANALYZING ||
    (pathname.startsWith(ROUTES.TRAINING) && pathname !== ROUTES.TRAINING_SETUP);

  if (isInitializing) {
    // Only show the app-level loading screen if we're not on the landing page,
    // since the landing page has its own loader.
    if (window.location.pathname === ROUTES.HOME) {
      return null;
    }
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <img src={bigkasLogo} alt="Bigkas" className="loading-logo-image" />
          <span>Bigkas</span>
        </div>
        <div className="loading-spinner" aria-label="Loading" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (user?.onboardingStage === 'profiling' && pathname !== ROUTES.USER_PROFILING) {
    return <Navigate to={ROUTES.USER_PROFILING} replace />;
  }

  if (
    user?.onboardingStage === 'pretest' &&
    pathname !== ROUTES.USER_PRETEST &&
    !pathname.startsWith(ROUTES.TRAINING) &&
    !pathname.startsWith('/session')
  ) {
    return <Navigate to={ROUTES.USER_PRETEST} replace />;
  }

  if (
    user?.onboardingStage === 'analyzing' &&
    pathname !== ROUTES.USER_ANALYZING &&
    !pathname.startsWith('/session')
  ) {
    return <Navigate to={ROUTES.USER_ANALYZING} replace />;
  }

  return (
    <>
      {!hideMainNav && isMobileViewport && (
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      )}
      {!hideMainNav && !isMobileViewport && (
        <Suspense fallback={null}>
          <SideNav />
        </Suspense>
      )}
      <main
        className={`main-content${hideMainNav ? ' main-content--full' : ''}`}
      >
        <Outlet />
      </main>
    </>
  );
}

function AdminRoute() {
  const { isAuthenticated, isInitializing, isAdminAuthenticated } = useAuthContext();

  if (isInitializing) {
    if (window.location.pathname === ROUTES.HOME) {
      return null;
    }
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <img src={bigkasLogo} alt="Bigkas" className="loading-logo-image" />
          <span>Bigkas</span>
        </div>
        <div className="loading-spinner" aria-label="Loading" />
      </div>
    );
  }

  if (isAdminAuthenticated) {
    return (
      <>
        <main className="main-content">
          <Outlet />
        </main>
      </>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ENV.ADMIN_LOGIN_PATH || ROUTES.ADMIN_LOGIN_BASE} replace />;
  }

  if (!isAdminAuthenticated) {
    return <Navigate to={ENV.ADMIN_LOGIN_PATH || ROUTES.ADMIN_LOGIN_BASE} replace />;
  }

  return (
    <>
      <main className="main-content">
        <Outlet />
      </main>
    </>
  );
}

/**
 * Public Route Wrapper
 * Redirects to dashboard if user is already authenticated
 */
function PublicRoute() {
  const { isAuthenticated, isInitializing, isAdminAuthenticated, user } = useAuthContext();

  if (isInitializing) {
    if (window.location.pathname === ROUTES.HOME) {
      return null;
    }
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <img src={bigkasLogo} alt="Bigkas" className="loading-logo-image" />
          <span>Bigkas</span>
        </div>
        <div className="loading-spinner" aria-label="Loading" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getAuthenticatedRedirect(user, isAdminAuthenticated)} replace />;
  }

  return (
    <>
      <Outlet />
    </>
  );
}

/**
 * App Router Component
 * Defines all application routes
 */
function AppRouter() {
  const isNative = Capacitor.isNativePlatform();

  return (
    <Routes>
      {/* Public Routes - accessible only when not logged in */}
      <Route element={<PublicRoute />}>
        <Route
          path={ROUTES.HOME}
          element={isNative ? <Navigate to={ROUTES.LOGIN} replace /> : (
            <Suspense fallback={null}>
              <LandingPage />
            </Suspense>
          )}
        />
        <Route
          path={ROUTES.LOGIN}
          element={
            <Suspense fallback={null}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.ADMIN_LOGIN_BASE}
          element={
            <Suspense fallback={null}>
              <AdminLoginPage />
            </Suspense>
          }
        />
        {ENV.ADMIN_LOGIN_PATH && (
          <Route
            path={ENV.ADMIN_LOGIN_PATH}
            element={
              <Suspense fallback={null}>
                <AdminLoginPage />
              </Suspense>
            }
          />
        )}
        <Route
          path={ROUTES.REGISTER}
          element={
            <Suspense fallback={null}>
              <RegisterPage />
            </Suspense>
          }
        />
      </Route>

      {/* Email Verification - accessible anytime */}
      <Route
        path={ROUTES.VERIFY_EMAIL}
        element={
          <Suspense fallback={null}>
            <VerifyEmailPage />
          </Suspense>
        }
      />

      {/* Forgot Password - accessible anytime */}
      <Route
        path={ROUTES.FORGOT_PASSWORD}
        element={
          <Suspense fallback={null}>
            <ForgotPasswordPage />
          </Suspense>
        }
      />

      {/* Protected Routes - require authentication */}
      <Route
        element={
          <Suspense fallback={null}>
            <ProtectedRoute />
          </Suspense>
        }
      >
        <Route path={ROUTES.USER_PROFILING} element={<UserProfilingPage />} />
        <Route path={ROUTES.USER_PRETEST} element={<UserPretestPage />} />
        <Route path={ROUTES.USER_ANALYZING} element={<UserAnalyzingPage />} />

        {/* Practice */}
        <Route path={ROUTES.PRACTICE} element={<PracticePage />} />

        {/* Training */}
        <Route path={ROUTES.TRAINING_SETUP} element={<TrainingSetupPage />} />
        <Route path={ROUTES.TRAINING} element={<TrainingPage />} />

        {/* Frameworks / Training Hub */}
        <Route path={ROUTES.FRAMEWORKS} element={<FrameworksPage />} />

        {/* Progress / Activity */}
        <Route path={ROUTES.PROGRESS} element={<ProgressPageWrapper />} />
        <Route path={ROUTES.ACHIEVEMENTS} element={<AchievementsPageWrapper />} />
        <Route path={ROUTES.ACTIVITY} element={<ActivityPageWrapper />} />

        {/* Profile */}
        <Route path={ROUTES.PROFILE} element={<SettingsProfilePageWrapper />} />

        {/* Settings */}
        <Route path={ROUTES.SETTINGS} element={<SettingsPageWrapper />} />
        <Route path={ROUTES.CHANGE_PASSWORD} element={<ChangePasswordPage />} />
        <Route path={ROUTES.ACCOUNT_SETTINGS} element={<AccountSettingsPage />} />
        <Route path={ROUTES.AUDIO_TEST} element={<TestAudioVideoPage />} />

        {/* Session */}
        <Route path={ROUTES.SESSION_DETAIL} element={<SessionDetailPage />} />
        <Route path={ROUTES.SESSION_RESULT} element={<DetailedFeedbackPage initialShowDetailed={false} />} />
        <Route path={ROUTES.DETAILED_FEEDBACK} element={<DetailedFeedbackPage initialShowDetailed={true} />} />
      </Route>

      <Route
        element={
          <Suspense fallback={null}>
            <AdminRoute />
          </Suspense>
        }
      >
        <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboardPage />} />
      </Route>

      {/* 404 - Redirect to landing */}
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}

export default AppRouter;

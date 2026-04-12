import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/useAuthContext';
import { ENV } from '../config/env';
import { ROUTES } from '../utils/constants';

// Auth Pages
import AdminLoginPage from '../pages/auth/AdminLoginPage';
import LoginPage from '../pages/auth/LoginPage';
import LandingPage from '../pages/landing/LandingPage';
import RegisterPage from '../pages/auth/RegisterPage';
import VerifyEmailPage from '../pages/auth/VerifyEmailPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';

// Main Pages
import DashboardPage from '../pages/main/DashboardPage';
import AdminDashboardPage from '../pages/main/AdminDashboardPage';
import ProgressPage from '../pages/main/ProgressPage';
import HistoryPage from '../pages/main/HistoryPage';
import AllSessionsPage from '../pages/main/AllSessionsPage';
import PreTestHistoryPage from '../pages/main/PreTestHistoryPage';
import SettingsProfilePage from '../pages/main/SettingsProfilePage';
import EditProfilePage from '../pages/main/EditProfilePage';
import SettingsPage from '../pages/main/SettingsPage';
import ChangePasswordPage from '../pages/main/ChangePasswordPage';
import AccountSettingsPage from '../pages/main/AccountSettingsPage';
import TrainingSetupPage from '../pages/main/TrainingSetupPage';
import TrainingPage from '../pages/main/TrainingPage';
import FrameworksPage from '../pages/main/FrameworksPage';
import TestAudioVideoPage from '../pages/main/TestAudioVideoPage';
import UserProfilingPage from '../pages/main/UserProfilingPage';
import UserPretestPage from '../pages/main/UserPretestPage';
import UserAnalyzingPage from '../pages/main/UserAnalyzingPage';
import ActivityPage from '../pages/main/ActivityPage';

// Session Pages
import SessionDetailPage from '../pages/session/SessionDetailPage';
import SessionResultPage from '../pages/session/SessionResultPage';
import DetailedFeedbackPage from '../pages/session/DetailedFeedbackPage';

// Main Pages (continued)
import PracticePage from '../pages/main/PracticePage';

// Components
import SideNav from '../components/common/SideNav';
import MainMobileMenu from '../components/common/MainMobileMenu';
import BackgroundAnalysisToast from '../components/common/BackgroundAnalysisToast';
import bigkasLogo from '../assets/Temporary Logo.png';

function getAuthenticatedRedirect(user, isAdminAuthenticated) {
  if (isAdminAuthenticated) return ROUTES.ADMIN_DASHBOARD;
  if (user?.onboardingStage === 'profiling') return ROUTES.USER_PROFILING;
  if (user?.onboardingStage === 'pretest') return ROUTES.USER_PRETEST;
  if (user?.onboardingStage === 'analyzing') return ROUTES.USER_ANALYZING;
  return ROUTES.DASHBOARD;
}

/**
 * Protected Route Wrapper
 * - If not authenticated → redirect to login
 * - Otherwise render the protected page with Navbar
 */
function ProtectedRoute() {
  const { isAuthenticated, isInitializing, user } = useAuthContext();
  const { pathname } = useLocation();

  const showMobileMainMenu =
    pathname === ROUTES.DASHBOARD ||
    pathname === ROUTES.PROGRESS ||
    pathname === ROUTES.ACTIVITY ||
    pathname === ROUTES.FRAMEWORKS ||
    pathname === ROUTES.PROFILE;

  const hideMainNav =
    pathname === ROUTES.USER_PROFILING ||
    pathname === ROUTES.USER_PRETEST ||
    pathname === ROUTES.USER_ANALYZING ||
    pathname.startsWith(ROUTES.TRAINING);

  if (isInitializing) {
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
      <BackgroundAnalysisToast />
      {!hideMainNav && <SideNav />}
      {showMobileMainMenu && <MainMobileMenu />}
      <main className={`main-content${hideMainNav ? ' main-content--full' : ''}${showMobileMainMenu ? ' main-content--with-mobile-menu' : ''}`}>
        <Outlet />
      </main>
    </>
  );
}

function AdminRoute() {
  const { isAuthenticated, isInitializing, isAdminAuthenticated } = useAuthContext();

  if (isInitializing) {
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
    return <Navigate to={ENV.ADMIN_LOGIN_PATH || ROUTES.LOGIN} replace />;
  }

  if (!isAdminAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
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
  return (
    <Routes>
      {/* Public Routes - accessible only when not logged in */}
      <Route element={<PublicRoute />}>
        <Route path={ROUTES.HOME} element={<LandingPage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        {ENV.ADMIN_LOGIN_PATH && <Route path={ENV.ADMIN_LOGIN_PATH} element={<AdminLoginPage />} />}
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      </Route>

      {/* Email Verification - accessible anytime */}
      <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />

      {/* Forgot Password - accessible anytime */}
      <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />

      {/* Protected Routes - require authentication */}
      <Route element={<ProtectedRoute />}>
        <Route path={ROUTES.USER_PROFILING} element={<UserProfilingPage />} />
        <Route path={ROUTES.USER_PRETEST} element={<UserPretestPage />} />
        <Route path={ROUTES.USER_ANALYZING} element={<UserAnalyzingPage />} />

        {/* Dashboard */}
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />

        {/* Practice */}
        <Route path={ROUTES.PRACTICE} element={<PracticePage />} />

        {/* Training */}
        <Route path={ROUTES.TRAINING_SETUP} element={<TrainingSetupPage />} />
        <Route path={ROUTES.TRAINING} element={<TrainingPage />} />

        {/* Frameworks / Training Hub */}
        <Route path={ROUTES.FRAMEWORKS} element={<FrameworksPage />} />

        {/* History / Progress */}
        <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
        <Route path={ROUTES.ALL_SESSIONS} element={<AllSessionsPage />} />
        <Route path={ROUTES.PRETEST_HISTORY} element={<PreTestHistoryPage />} />
        <Route path={ROUTES.PROGRESS} element={<ProgressPage />} />
        <Route path={ROUTES.ACTIVITY} element={<ActivityPage />} />

        {/* Profile */}
        <Route path={ROUTES.PROFILE} element={<SettingsProfilePage />} />
        <Route path={ROUTES.EDIT_PROFILE} element={<EditProfilePage />} />

        {/* Settings */}
        <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
        <Route path={ROUTES.CHANGE_PASSWORD} element={<ChangePasswordPage />} />
        <Route path={ROUTES.ACCOUNT_SETTINGS} element={<AccountSettingsPage />} />
        <Route path={ROUTES.AUDIO_TEST} element={<TestAudioVideoPage />} />

        {/* Session */}
        <Route path={ROUTES.SESSION_DETAIL} element={<SessionDetailPage />} />
        <Route path={ROUTES.SESSION_RESULT} element={<SessionResultPage />} />
        <Route path={ROUTES.DETAILED_FEEDBACK} element={<DetailedFeedbackPage />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboardPage />} />
      </Route>

      {/* 404 - Redirect to landing */}
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}

export default AppRouter;


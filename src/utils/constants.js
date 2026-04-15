/**
 * Application constants
 */

// Route paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  ADMIN_LOGIN_BASE: '/admin-login',
  ADMIN_DASHBOARD: '/admin/dashboard',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  NICKNAME: '/nickname',
  USER_PROFILING: '/onboarding/profiling',
  USER_PRETEST: '/onboarding/pretest',
  USER_ANALYZING: '/onboarding/analyzing',
  // Main
  DASHBOARD: '/dashboard',
  PRACTICE: '/practice',
  TRAINING_SETUP: '/training/setup',
  TRAINING: '/training',
  PROGRESS: '/progress',
  ACTIVITY: '/activity',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  CHANGE_PASSWORD: '/settings/change-password',
  ACCOUNT_SETTINGS: '/settings/account',
  AUDIO_TEST: '/settings/test',
  // Training Hub (Framework Library)
  FRAMEWORKS: '/frameworks',
  // Session
  SESSION_DETAIL: '/session/:sessionId',
  SESSION_RESULT: '/session/:sessionId/result',
  DETAILED_FEEDBACK: '/session/:sessionId/feedback',
};

// Helper to build paths with params
export const buildRoute = {
  sessionDetail: (id) => `/session/${id}`,
  sessionResult: (id) => `/session/${id}/result`,
  detailedFeedback: (id) => `/session/${id}/feedback`,
};

// UI Constants
export const UI = {
  TOAST_DURATION: 5000,
  DEBOUNCE_DELAY: 300,
  PAGE_SIZE: 10,
};

export const WORDS_PER_MINUTE = 150;

// Score tiers
export const SCORE_TIER = {
  excellent: { min: 85, label: 'Excellent', color: '#34C759' },
  good: { min: 65, label: 'Good', color: '#FCBA04' },
  fair: { min: 45, label: 'Fair', color: '#FF9500' },
  poor: { min: 0, label: 'Needs Work', color: '#FF3B30' },
};

export function getScoreTier(score) {
  if (score >= 85) return SCORE_TIER.excellent;
  if (score >= 65) return SCORE_TIER.good;
  if (score >= 45) return SCORE_TIER.fair;
  return SCORE_TIER.poor;
}

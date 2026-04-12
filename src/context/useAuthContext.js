import { useContext } from 'react';
import AuthContext from './AuthContext';

const FALLBACK_AUTH_CONTEXT = {
  user: null,
  isInitializing: false,
  isLoading: false,
  isAuthenticated: false,
  isAdminAuthenticated: false,
  error: 'Auth context unavailable.',
  pendingEmailVerification: false,
  pendingEmail: null,
  login: async () => ({ success: false, error: 'Auth provider is not mounted.' }),
  logout: async () => ({ success: false, error: 'Auth provider is not mounted.' }),
  register: async () => ({ success: false, error: 'Auth provider is not mounted.' }),
  updateNickname: async () => ({ success: false, error: 'Auth provider is not mounted.' }),
  updateProfile: async () => ({ success: false, error: 'Auth provider is not mounted.' }),
  updateUserMetadata: async () => ({ success: false, error: 'Auth provider is not mounted.' }),
  changePassword: async () => ({ success: false, error: 'Auth provider is not mounted.' }),
  uploadAvatar: async () => ({ success: false, error: 'Auth provider is not mounted.' }),
  deleteAccount: async () => ({ success: false, error: 'Auth provider is not mounted.' }),
  deactivateAccount: async () => ({ success: false, error: 'Auth provider is not mounted.' }),
  clearError: () => {},
  adminLogin: async () => ({ success: false, error: 'Auth provider is not mounted.' }),
  loginWithGoogle: async () => ({ success: false, error: 'Auth provider is not mounted.' }),
  resendVerificationEmail: async () => ({ success: false, error: 'Auth provider is not mounted.' }),
};

/**
 * Hook to use auth context
 * @returns {Object} Auth context value
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    // Keep app routes functional instead of crashing during transient mount/HMR issues.
    return FALLBACK_AUTH_CONTEXT;
  }
  return context;
}

export default useAuthContext;

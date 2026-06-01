/**
 * authApi.js — thin wrappers around supabase.auth for components that prefer a named API.
 * Most auth logic now lives in AuthContext.jsx.
 */
import { supabase } from './supabaseClient.js';

export const PENDING_SIGNUP_PASSWORD_KEY = 'bigkas_pending_signup_password_v1';

function popPendingSignupPassword() {
  if (typeof window === 'undefined') return '';
  const password = window.sessionStorage.getItem(PENDING_SIGNUP_PASSWORD_KEY) || '';
  window.sessionStorage.removeItem(PENDING_SIGNUP_PASSWORD_KEY);
  return password;
}

export const authApi = {
  login:  (email, password) => supabase.auth.signInWithPassword({ email, password }),
  register: (email, password, name) =>
    supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { full_name: name },
      },
    }),
  logout: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),
  getUser: () => supabase.auth.getUser(),
  updateUser: (updates) => supabase.auth.updateUser(updates),

  /**
   * Verify a 6-digit email OTP submitted by the user after registration.
   * @param {string} email - The email address the OTP was sent to.
   * @param {string} token - The 6-digit OTP code entered by the user.
   * @returns {Promise<{ data, error }>}
   */
  verifyEmailOtp: async (email, token) => {
    const response = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (response.error) return response;

    const pendingPassword = popPendingSignupPassword();
    if (pendingPassword) {
      const { error } = await supabase.auth.updateUser({ password: pendingPassword });
      if (error) return { ...response, error };
    }

    return response;
  },

  /**
   * Resend the email OTP code to the given address.
   * @param {string} email
   * @returns {Promise<{ data, error }>}
   */
  resendSignupOtp: (email) =>
    supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    }),
};

export default authApi;

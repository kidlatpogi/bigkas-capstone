/**
 * authApi.js — thin wrappers around supabase.auth for components that prefer a named API.
 * Most auth logic now lives in AuthContext.jsx.
 */
import { supabase } from './supabaseClient.js';

export const authApi = {
  login:  (email, password) => supabase.auth.signInWithPassword({ email, password }),
  register: (email, password, name) =>
    supabase.auth.signUp({ email, password, options: { data: { full_name: name } } }),
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
  verifyEmailOtp: (email, token) =>
    supabase.auth.verifyOtp({ email, token, type: 'signup' }),

  /**
   * Resend the signup OTP email to the given address.
   * @param {string} email
   * @returns {Promise<{ data, error }>}
   */
  resendSignupOtp: (email) =>
    supabase.auth.resend({ type: 'signup', email }),
};

export default authApi;

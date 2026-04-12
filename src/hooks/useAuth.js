import { useAuthContext } from '../context/useAuthContext';

/**
 * Thin wrapper — returns the full AuthContext value.
 */
export function useAuth() {
  return useAuthContext();
}

export default useAuth;

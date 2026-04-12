import { useSessionContext } from '../context/useSessionContext';

/**
 * Thin wrapper — returns the full SessionContext value.
 */
export function useSessions() {
  return useSessionContext();
}

export default useSessions;

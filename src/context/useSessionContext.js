import { useContext } from 'react';
import SessionContext from './SessionContext';

/**
 * Hook to use session context
 */
export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}

export default useSessionContext;

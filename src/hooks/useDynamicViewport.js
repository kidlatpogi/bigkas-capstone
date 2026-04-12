import { useCallback, useEffect } from 'react';

/**
 * Keeps a CSS custom property in sync with the visible viewport height.
 * This is a practical fallback for browsers where 100dvh may not behave consistently.
 */
export default function useDynamicViewport(variableName = '--app-dvh') {
  const syncViewportHeight = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const nextHeight = window.innerHeight * 0.01;
    document.documentElement.style.setProperty(variableName, `${nextHeight}px`);
  }, [variableName]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    syncViewportHeight();

    const viewport = window.visualViewport;

    window.addEventListener('resize', syncViewportHeight, { passive: true });
    window.addEventListener('orientationchange', syncViewportHeight, { passive: true });
    viewport?.addEventListener('resize', syncViewportHeight, { passive: true });

    return () => {
      window.removeEventListener('resize', syncViewportHeight);
      window.removeEventListener('orientationchange', syncViewportHeight);
      viewport?.removeEventListener('resize', syncViewportHeight);
    };
  }, [syncViewportHeight]);

  return syncViewportHeight;
}

import { useCallback, useEffect, useMemo, useState } from 'react';

function getFullscreenElement() {
  if (typeof document === 'undefined') return null;
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function getRequestFullscreen(target) {
  if (!target) return null;
  return target.requestFullscreen?.bind(target)
    || target.webkitRequestFullscreen?.bind(target)
    || null;
}

function getExitFullscreen() {
  if (typeof document === 'undefined') return null;
  return document.exitFullscreen?.bind(document)
    || document.webkitExitFullscreen?.bind(document)
    || null;
}

/**
 * Fullscreen helper with vendor fallbacks, error handling, and cleanup.
 */
export default function useFullscreen(targetRef, options = {}) {
  const { exitOnUnmount = false } = options;
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(getFullscreenElement()));
  const [error, setError] = useState(null);

  const isSupported = useMemo(() => {
    if (typeof document === 'undefined') return false;
    return Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  }, []);

  const resolveTarget = useCallback(() => {
    return targetRef?.current || document.documentElement;
  }, [targetRef]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const enter = useCallback(async () => {
    if (!isSupported) {
      const nextError = new Error('Fullscreen API is not supported in this browser.');
      setError(nextError);
      return false;
    }

    try {
      const target = resolveTarget();
      const request = getRequestFullscreen(target);

      if (!request) {
        throw new Error('Request fullscreen is unavailable for this element.');
      }

      await request();
      setError(null);
      return true;
    } catch (caughtError) {
      const nextError = caughtError instanceof Error
        ? caughtError
        : new Error('Failed to enter fullscreen mode.');
      setError(nextError);
      return false;
    }
  }, [isSupported, resolveTarget]);

  const exit = useCallback(async () => {
    try {
      const exitFullscreen = getExitFullscreen();
      if (!exitFullscreen) return true;

      await exitFullscreen();
      setError(null);
      return true;
    } catch (caughtError) {
      const nextError = caughtError instanceof Error
        ? caughtError
        : new Error('Failed to exit fullscreen mode.');
      setError(nextError);
      return false;
    }
  }, []);

  const toggle = useCallback(async () => {
    if (getFullscreenElement()) {
      return exit();
    }
    return enter();
  }, [enter, exit]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(getFullscreenElement()));
    };

    const handleFullscreenError = () => {
      setError(new Error('Fullscreen request was blocked or failed.'));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('fullscreenerror', handleFullscreenError);
    document.addEventListener('webkitfullscreenerror', handleFullscreenError);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('fullscreenerror', handleFullscreenError);
      document.removeEventListener('webkitfullscreenerror', handleFullscreenError);

      if (exitOnUnmount && getFullscreenElement()) {
        const exitFullscreen = getExitFullscreen();
        if (exitFullscreen) {
          exitFullscreen().catch(() => {
            // Swallow unmount cleanup errors.
          });
        }
      }
    };
  }, [exitOnUnmount]);

  return {
    isSupported,
    isFullscreen,
    error,
    clearError,
    enter,
    exit,
    toggle,
  };
}

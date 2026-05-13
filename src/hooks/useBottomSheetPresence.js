import { useState, useEffect, useRef } from 'react';

/** Match `--bigkas-bottom-sheet-duration-exit` in `bigkas-bottom-sheet-motion.css` (ms). */
export const BIGKAS_BOTTOM_SHEET_EXIT_MS = 340;

/**
 * Keeps a bottom sheet mounted after `isOpen` becomes false so exit CSS can run.
 * Returns `mounted` for conditional render and `rootClassName` including `bigkas-bottom-sheet--exiting` while closing.
 */
export function useBottomSheetPresence(isOpen, exitDurationMs = BIGKAS_BOTTOM_SHEET_EXIT_MS) {
  const [mounted, setMounted] = useState(isOpen);
  const [exiting, setExiting] = useState(false);
  const mountedRef = useRef(mounted);

  mountedRef.current = mounted;

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setExiting(false);
      return undefined;
    }

    if (!mountedRef.current) return undefined;

    setExiting(true);
    const id = window.setTimeout(() => {
      setMounted(false);
      setExiting(false);
    }, exitDurationMs);

    return () => window.clearTimeout(id);
  }, [isOpen, exitDurationMs]);

  const rootClassName = exiting ? 'bigkas-bottom-sheet--exiting' : '';

  return { mounted, exiting, rootClassName };
}

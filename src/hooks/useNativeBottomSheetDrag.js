import { useCallback, useRef, useState } from 'react';

export function useNativeBottomSheetDrag(isOpen, onClose) {
  const [dragOffset, setDragOffset] = useState(0);
  const dragStateRef = useRef({
    active: false,
    pointerId: null,
    startY: 0,
    lastY: 0,
    startTime: 0,
  });

  const endDrag = useCallback((event) => {
    const state = dragStateRef.current;
    if (!state.active) return;

    const elapsed = Math.max(1, performance.now() - state.startTime);
    const offset = Math.max(0, state.lastY - state.startY);
    const velocity = offset / elapsed;

    state.active = false;
    state.pointerId = null;

    if (event?.currentTarget?.releasePointerCapture && event.pointerId != null) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* Pointer capture may already be released by the browser. */
      }
    }

    if (offset > 120 || velocity > 0.65) {
      onClose();
      setDragOffset(0);
      return;
    }

    setDragOffset(0);
  }, [onClose]);

  const onPointerDown = useCallback((event) => {
    if (!isOpen || (event.pointerType === 'mouse' && event.button !== 0)) return;

    const state = dragStateRef.current;
    state.active = true;
    state.pointerId = event.pointerId;
    state.startY = event.clientY;
    state.lastY = event.clientY;
    state.startTime = performance.now();
    setDragOffset(0.01);

    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [isOpen]);

  const onPointerMove = useCallback((event) => {
    const state = dragStateRef.current;
    if (!state.active || state.pointerId !== event.pointerId) return;

    state.lastY = event.clientY;
    setDragOffset(Math.max(0, event.clientY - state.startY));
  }, []);

  const onPointerCancel = useCallback((event) => {
    dragStateRef.current.active = false;
    dragStateRef.current.pointerId = null;
    setDragOffset(0);

    if (event?.currentTarget?.releasePointerCapture && event.pointerId != null) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* Pointer capture may already be released by the browser. */
      }
    }
  }, []);

  return {
    dragOffset,
    isDragging: dragOffset > 0,
    sheetStyle: { '--native-bottom-sheet-drag-y': `${dragOffset}px` },
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel,
    },
  };
}

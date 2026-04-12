import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IoCheckmarkCircle,
  IoLockClosed,
  IoMic,
  IoMusicalNote,
  IoPulse,
  IoShuffle,
  IoTrophy,
  IoVolumeHigh,
} from 'react-icons/io5';
import {
  getLabelSideForLane,
  getUnitLabel,
  isMilestoneStep,
  JOURNEY_NODE_THEMES,
  NODE_STATE,
} from './journeyConstants';
import './SkywardJourney.css';

const JOURNEY_ICONS = [IoMic, IoVolumeHigh, IoMusicalNote, IoPulse, IoShuffle, IoTrophy];

const FOCUS_SCALE = 1.5;
const EXPLORE_SCALE = 1;
const IDLE_MS = 3000;
const SCROLL_SUPPRESS_MS = 1100;

/**
 * With transform translate(tx,ty) scale(s), keep the scaled content AABB inside the viewport.
 */
function clampMapState(state, viewportEl, contentEl, scale) {
  if (!viewportEl || !contentEl) return state;
  const W = viewportEl.clientWidth;
  const H = viewportEl.clientHeight;
  const cw = contentEl.scrollWidth;
  const ch = contentEl.scrollHeight;
  const { tx, ty } = state;
  const w = cw * scale;
  const h = ch * scale;
  if (!Number.isFinite(W) || !Number.isFinite(H) || W <= 0 || H <= 0) return state;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return state;

  const minX = Math.min(0, W - w);
  const maxX = Math.max(0, W - w);
  const minY = Math.min(0, H - h);
  const maxY = Math.max(0, H - h);

  return {
    tx: Math.min(maxX, Math.max(minX, tx)),
    ty: Math.min(maxY, Math.max(minY, ty)),
  };
}

function JourneyNodeIcon({ index, className = '' }) {
  const Cmp = JOURNEY_ICONS[index % JOURNEY_ICONS.length];
  return <Cmp aria-hidden className={`skyward-journey-node-icon ${className}`.trim()} />;
}

function LockedIconTeaser({ index, milestone }) {
  return (
    <>
      <span className="skyward-journey-node-teaser" aria-hidden>
        {milestone ? (
          <IoTrophy className="skyward-journey-node-icon skyward-journey-node-icon--boss skyward-journey-node-icon--teaser" />
        ) : (
          <JourneyNodeIcon index={index} className="skyward-journey-node-icon--teaser" />
        )}
      </span>
      <span className="skyward-journey-node-lock-corner" aria-hidden>
        <IoLockClosed />
      </span>
    </>
  );
}

/**
 * @param {object} props
 * @param {Array<{ id: string, nodeState: string, task?: object, title?: string }>} props.steps
 * @param {(step: object, meta: object) => React.ReactNode} props.renderStepContent
 */
export default function SkywardJourney({ steps, renderStepContent }) {
  const gradId = useId().replace(/:/g, '');
  const flowGradId = useId().replace(/:/g, '');
  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const mapContentRef = useRef(null);
  const mapLayerRef = useRef(null);
  const drawerRef = useRef(null);
  const nodeRefs = useRef([]);
  const tapDismissedRef = useRef(false);
  const mapRef = useRef({ tx: 0, ty: 0 });
  const pointerPanRef = useRef(null);
  const pinchRef = useRef(null);
  const idleTimerRef = useRef(null);
  const suppressExploreUntilRef = useRef(0);
  const isExploringRef = useRef(false);

  const activeIndex = useMemo(
    () => steps.findIndex((s) => s.nodeState === NODE_STATE.ACTIVE),
    [steps],
  );

  const activeStepId = activeIndex >= 0 ? steps[activeIndex]?.id : null;

  const lastCompletedIndex = useMemo(() => {
    let last = -1;
    steps.forEach((s, i) => {
      if (s.nodeState === NODE_STATE.COMPLETED) last = i;
    });
    return last;
  }, [steps]);

  const [pathPoints, setPathPoints] = useState([]);
  const [indexedNodePoints, setIndexedNodePoints] = useState([]);
  const [panelOpenId, setPanelOpenId] = useState(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const panelClosePendingRef = useRef(false);
  const [jiggleIndex, setJiggleIndex] = useState(null);
  const [showTapHint, setShowTapHint] = useState(false);
  const [map, setMap] = useState(() => ({ tx: 0, ty: 0 }));
  const [isExploring, setIsExploring] = useState(false);

  useLayoutEffect(() => {
    mapRef.current = map;
  }, [map]);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const scheduleReturnToFocus = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = window.setTimeout(() => {
      isExploringRef.current = false;
      setIsExploring(false);
      setMap({ tx: 0, ty: 0 });
      const el = nodeRefs.current[activeIndex];
      if (el && activeIndex >= 0) {
        suppressExploreUntilRef.current = Date.now() + SCROLL_SUPPRESS_MS;
        el.scrollIntoView({
          block: 'center',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        });
      }
    }, IDLE_MS);
  }, [activeIndex, clearIdleTimer]);

  const bumpExplore = useCallback(() => {
    if (Date.now() < suppressExploreUntilRef.current) return;
    isExploringRef.current = true;
    setIsExploring(true);
    scheduleReturnToFocus();
  }, [scheduleReturnToFocus]);

  const requestClosePanel = useCallback(() => {
    panelClosePendingRef.current = true;
    setPanelVisible(false);
  }, []);

  const handlePanelTransitionEnd = useCallback((e) => {
    if (drawerRef.current && e.target !== drawerRef.current) return;
    if (!panelClosePendingRef.current) return;
    if (e.propertyName !== 'opacity') return;
    panelClosePendingRef.current = false;
    setPanelOpenId(null);
  }, []);

  const recomputePath = useCallback(() => {
    const content = mapContentRef.current;
    if (!content || steps.length < 2) {
      setPathPoints([]);
      setIndexedNodePoints([]);
      return;
    }

    const cr = content.getBoundingClientRect();
    if (!cr.width || !cr.height) {
      setPathPoints([]);
      setIndexedNodePoints([]);
      return;
    }

    const sx = content.scrollWidth / cr.width;
    const sy = content.scrollHeight / cr.height;
    const indexed = [];

    for (let i = 0; i < steps.length; i += 1) {
      const el = nodeRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      indexed[i] = {
        x: (r.left + r.width / 2 - cr.left) * sx,
        y: (r.top + r.height / 2 - cr.top) * sy,
      };
    }

    setIndexedNodePoints(indexed);

    const pts = indexed.filter((p) => p != null);
    if (pts.length < 2) {
      setPathPoints([]);
      return;
    }

    pts.sort((a, b) => b.y - a.y);
    setPathPoints(pts);
  }, [steps.length]);

  useLayoutEffect(() => {
    const run = () => {
      requestAnimationFrame(() => {
        recomputePath();
        const vp = viewportRef.current;
        const content = mapContentRef.current;
        if (vp && content) {
          setMap((m) =>
            clampMapState(m, vp, content, isExploringRef.current ? EXPLORE_SCALE : FOCUS_SCALE),
          );
        }
      });
    };
    run();
    window.addEventListener('resize', run);
    let ro;
    const content = mapContentRef.current;
    const root = rootRef.current;
    const vp = viewportRef.current;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(run);
      if (content) ro.observe(content);
      if (root) ro.observe(root);
      if (vp) ro.observe(vp);
    }
    return () => {
      window.removeEventListener('resize', run);
      ro?.disconnect();
    };
  }, [recomputePath]);

  /** Hero focus: zoom (1.5) + scroll current active stage into view. Resets explore when the active step changes. */
  useLayoutEffect(() => {
    if (activeIndex < 0) return undefined;
    const el = nodeRefs.current[activeIndex];
    if (!el) return undefined;

    suppressExploreUntilRef.current = Date.now() + SCROLL_SUPPRESS_MS;
    clearIdleTimer();

    const raf = requestAnimationFrame(() => {
      isExploringRef.current = false;
      setIsExploring(false);
      setMap({ tx: 0, ty: 0 });
    });

    const delay = 0;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ block: 'center', behavior: 'auto', inline: 'nearest' });
    }, delay);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [activeIndex, clearIdleTimer]);

  useEffect(() => {
    return () => clearIdleTimer();
  }, [clearIdleTimer]);

  /** Wheel deltaY (or deltaX) → bird's-eye explore + idle refocus */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;

    const onWheel = (e) => {
      if (panelOpenId) return;
      if (Math.abs(e.deltaY) > 1.5 || Math.abs(e.deltaX) > 1.5) {
        bumpExplore();
      }
    };

    const onScroll = () => {
      if (panelOpenId) return;
      bumpExplore();
    };

    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', onScroll);
    };
  }, [panelOpenId, bumpExplore]);

  const onPointerDownViewport = useCallback(
    (e) => {
      if (panelOpenId) return;
      if (pinchRef.current) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const t = e.target;
      if (t instanceof Element && t.closest('.skyward-journey-node-shell')) return;
      if (t instanceof Element && t.closest('.skyward-journey-unit-header')) return;
      if (t instanceof Element && t.closest('.skyward-journey-start-callout')) return;
      bumpExplore();
      const m = mapRef.current;
      pointerPanRef.current = {
        pid: e.pointerId,
        sx: e.clientX,
        sy: e.clientY,
        tx: m.tx,
        ty: m.ty,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [panelOpenId, bumpExplore],
  );

  const onPointerMoveViewport = useCallback((e) => {
    const p = pointerPanRef.current;
    if (!p || p.pid !== e.pointerId) return;
    const dx = e.clientX - p.sx;
    const dy = e.clientY - p.sy;
    const vp = viewportRef.current;
    const content = mapContentRef.current;
    if (!vp || !content) return;
    setMap((m) =>
      clampMapState({ ...m, tx: p.tx + dx, ty: p.ty + dy }, vp, content, EXPLORE_SCALE),
    );
  }, []);

  const onPointerUpViewport = useCallback((e) => {
    const p = pointerPanRef.current;
    if (!p || p.pid !== e.pointerId) return;
    pointerPanRef.current = null;
    scheduleReturnToFocus();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, [scheduleReturnToFocus]);

  const onTouchStartPinch = useCallback((e) => {
    if (e.touches.length === 2) {
      pointerPanRef.current = null;
      pinchRef.current = { active: true };
      bumpExplore();
    }
  }, [bumpExplore]);

  const onTouchMovePinch = useCallback(
    (e) => {
      if (e.touches.length < 2 || !pinchRef.current) return;
      e.preventDefault();
      bumpExplore();
    },
    [bumpExplore],
  );

  const onTouchEndPinch = useCallback((e) => {
    if (e.touches.length < 2) pinchRef.current = null;
  }, []);

  useEffect(() => {
    if (panelOpenId) {
      document.body.classList.add('skyward-journey-modal-open');
    } else {
      document.body.classList.remove('skyward-journey-modal-open');
    }
  }, [panelOpenId]);

  useEffect(() => {
    if (!panelOpenId) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') requestClosePanel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panelOpenId, requestClosePanel]);

  useEffect(() => {
    if (!panelOpenId) return;
    panelClosePendingRef.current = false;
    const resetVis = window.setTimeout(() => setPanelVisible(false), 0);
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => setPanelVisible(true));
    });
    return () => {
      window.clearTimeout(resetVis);
      cancelAnimationFrame(outerRaf);
      if (innerRaf) cancelAnimationFrame(innerRaf);
    };
  }, [panelOpenId]);

  useEffect(() => {
    if (panelVisible || !panelOpenId) return undefined;
    if (!panelClosePendingRef.current) return undefined;
    const t = window.setTimeout(() => {
      if (panelClosePendingRef.current) {
        panelClosePendingRef.current = false;
        setPanelOpenId(null);
      }
    }, 360);
    return () => window.clearTimeout(t);
  }, [panelVisible, panelOpenId]);

  useEffect(() => {
    tapDismissedRef.current = false;
    const clearHint = window.setTimeout(() => setShowTapHint(false), 0);
    if (!activeStepId) {
      return () => window.clearTimeout(clearHint);
    }
    const t = window.setTimeout(() => {
      if (!tapDismissedRef.current) setShowTapHint(true);
    }, 3000);
    return () => {
      window.clearTimeout(clearHint);
      window.clearTimeout(t);
    };
  }, [activeStepId]);

  const polylinePoints = useMemo(() => {
    if (pathPoints.length < 2) return '';
    return pathPoints.map((p) => `${p.x},${p.y}`).join(' ');
  }, [pathPoints]);

  const flowSegmentPoints = useMemo(() => {
    if (activeIndex < 0 || lastCompletedIndex < 0) return '';
    if (activeIndex <= lastCompletedIndex) return '';
    const a = indexedNodePoints[lastCompletedIndex];
    const b = indexedNodePoints[activeIndex];
    if (!a || !b) return '';
    return `${a.x},${a.y} ${b.x},${b.y}`;
  }, [indexedNodePoints, lastCompletedIndex, activeIndex]);

  const closePanel = requestClosePanel;

  const handleNodeClick = useCallback(
    (step, index) => {
      if (step.nodeState === NODE_STATE.LOCKED) {
        setJiggleIndex(index);
        window.setTimeout(() => setJiggleIndex(null), 520);
      }
      if (step.nodeState === NODE_STATE.ACTIVE) {
        tapDismissedRef.current = true;
        setShowTapHint(false);
      }
      if (panelOpenId === step.id && panelVisible) {
        requestClosePanel();
        return;
      }
      if (panelOpenId === step.id && !panelVisible) {
        panelClosePendingRef.current = false;
        setPanelVisible(true);
        return;
      }
      setPanelOpenId(step.id);
    },
    [panelOpenId, panelVisible, requestClosePanel],
  );

  const selectedStep = useMemo(
    () => (panelOpenId ? steps.find((s) => s.id === panelOpenId) : null),
    [panelOpenId, steps],
  );

  const selectedMeta = useMemo(() => {
    if (!selectedStep) return null;
    const i = steps.findIndex((s) => s.id === selectedStep.id);
    return {
      theme: JOURNEY_NODE_THEMES[i % JOURNEY_NODE_THEMES.length],
      stepIndex: i,
    };
  }, [selectedStep, steps]);

  if (!steps.length) {
    return null;
  }

  const columnChildren = [];
  const unitOneLabel = getUnitLabel(0);

  steps.forEach((step, i) => {
    const theme = JOURNEY_NODE_THEMES[i % JOURNEY_NODE_THEMES.length];
    const isActive = step.nodeState === NODE_STATE.ACTIVE;
    const isDone = step.nodeState === NODE_STATE.COMPLETED;
    const isLocked = step.nodeState === NODE_STATE.LOCKED;
    const title = step.title ?? step.task?.title ?? step.id;
    const milestone = isMilestoneStep(i);
    const jiggle = jiggleIndex === i;
    const lane = ((i % 4) + 4) % 4;
    const labelSide = getLabelSideForLane(lane);

    columnChildren.push(
      <div
        key={step.id}
        className={`skyward-journey-row skyward-journey-row--lane-${lane}`}
      >
        <div className="skyward-journey-track">
          <div
            className={`skyward-journey-node-shell${
              i === 0 && isActive ? ' skyward-journey-node-shell--start-onboarding' : ''
            }`}
          >
            <div
              className={`skyward-journey-node-cluster${milestone ? ' skyward-journey-node-cluster--milestone' : ''}`}
            >
              {i === 0 && isActive ? (
                <div className="skyward-journey-start-callout" aria-hidden>
                  <span className="skyward-journey-start-unit">
                    UNIT {unitOneLabel.unitNum}: {unitOneLabel.title}
                  </span>
                  <span className="skyward-journey-start-badge">START</span>
                  <span className="skyward-journey-start-bubble">
                    Begin here!
                    <span className="skyward-journey-start-bubble-tail" />
                  </span>
                </div>
              ) : null}
              <button
                type="button"
                ref={(el) => {
                  nodeRefs.current[i] = el;
                }}
                className={[
                  'skyward-journey-node',
                  `skyward-journey-node--${step.nodeState}`,
                  isActive ? 'skyward-journey-node--pulse skyward-journey-node--float' : '',
                  milestone ? 'skyward-journey-node--milestone' : '',
                  jiggle ? 'skyward-journey-node--jiggle' : '',
                  !isLocked ? 'skyward-journey-node--unlocked' : '',
                  isLocked ? 'skyward-journey-node--locked-teaser' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-current={isActive ? 'step' : undefined}
                aria-expanded={panelOpenId === step.id}
                aria-label={`${milestone ? 'Milestone: ' : ''}${theme.shortLabel}: ${title}. ${
                  isDone ? 'Completed' : isLocked ? 'Locked' : 'Current step'
                }. Open quest details.`}
                onClick={() => handleNodeClick(step, i)}
              >
                <span className="skyward-journey-node-ring" />
                {isDone ? (
                  <IoCheckmarkCircle className="skyward-journey-node-state-icon" aria-hidden />
                ) : null}
                {isLocked ? <LockedIconTeaser index={i} milestone={milestone} /> : null}
                {!isDone && !isLocked ? (
                  milestone ? (
                    <IoTrophy
                      className="skyward-journey-node-icon skyward-journey-node-icon--boss"
                      aria-hidden
                    />
                  ) : (
                    <JourneyNodeIcon index={i} />
                  )
                ) : null}
              </button>
              <div
                className={`level-label level-label--side-${labelSide}`}
                aria-hidden
              >
                <span className="level-label__title">
                  {milestone ? 'Summit' : theme.shortLabel}
                </span>
                <span className="level-label__stage">
                  {milestone ? `Boss · Stage ${i + 1}` : `Stage ${i + 1}`}
                </span>
              </div>
            </div>
            {isActive && showTapHint ? (
              <p className="skyward-journey-tap-hint">Tap to open</p>
            ) : null}
          </div>
        </div>
      </div>,
    );

    if ((i + 1) % 4 === 0 && i + 1 < steps.length) {
      const u = getUnitLabel(i + 1);
      columnChildren.push(
        <div
          key={`unit-gap-${u.unitNum}`}
          className="skyward-journey-unit-header"
          role="presentation"
        >
          <span className="skyward-journey-unit-line" aria-hidden />
          <span className="skyward-journey-unit-label">
            UNIT {u.unitNum}: {u.title}
          </span>
          <span className="skyward-journey-unit-line" aria-hidden />
        </div>,
      );
    }
  });

  return (
    <div className="skyward-journey" ref={rootRef}>
      <div
        className={`skyward-journey-map-viewport${isExploring ? ' is-exploring' : ''}`}
        ref={viewportRef}
        onPointerDown={onPointerDownViewport}
        onPointerMove={onPointerMoveViewport}
        onPointerUp={onPointerUpViewport}
        onPointerCancel={onPointerUpViewport}
        onTouchStart={onTouchStartPinch}
        onTouchMove={onTouchMovePinch}
        onTouchEnd={onTouchEndPinch}
        role="application"
        aria-label="Skyward journey path. Scroll to browse stages, drag to pan, pause to refocus on your current quest."
      >
        <div
          className="skyward-journey-map-layer"
          ref={mapLayerRef}
          style={{
            transform: `translate(${map.tx}px, ${map.ty}px) scale(${isExploring ? EXPLORE_SCALE : FOCUS_SCALE})`,
          }}
        >
          <div className="skyward-journey-map-content" ref={mapContentRef}>
            {pathPoints.length > 1 ? (
              <svg className="skyward-journey-svg" aria-hidden shapeRendering="geometricPrecision">
                <defs>
                  <linearGradient id={`skyward-journey-line-grad-${gradId}`} x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="var(--skyward-path-completed, #5a7863)" />
                    <stop offset="100%" stopColor="var(--skyward-path-locked, #a1a1aa)" />
                  </linearGradient>
                  <linearGradient id={`skyward-journey-flow-grad-${flowGradId}`} x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--skyward-flow-from, #5a7863)" />
                    <stop offset="100%" stopColor="var(--skyward-flow-to, #f18f01)" />
                  </linearGradient>
                </defs>
                <polyline
                  className="skyward-journey-polyline skyward-journey-polyline--rim"
                  fill="none"
                  points={polylinePoints}
                  stroke="var(--skyward-path-rim, #e4e4e7)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="var(--skyward-line-rim, 16)"
                />
                <polyline
                  className="skyward-journey-polyline skyward-journey-polyline--main"
                  fill="none"
                  points={polylinePoints}
                  stroke={`url(#skyward-journey-line-grad-${gradId})`}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="var(--skyward-line-width, 10)"
                />
                {flowSegmentPoints ? (
                  <polyline
                    className="skyward-journey-polyline skyward-journey-polyline--flow"
                    fill="none"
                    points={flowSegmentPoints}
                    stroke={`url(#skyward-journey-flow-grad-${flowGradId})`}
                    strokeDasharray="10 16"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="7"
                  />
                ) : null}
              </svg>
            ) : null}

            <div className="skyward-journey-column">{columnChildren}</div>
          </div>
        </div>
      </div>

      {typeof document !== 'undefined' && selectedStep && selectedMeta
        ? createPortal(
            <div className="skyward-journey-panel-root" role="presentation">
              <button
                type="button"
                className={`skyward-journey-backdrop${panelVisible ? ' skyward-journey-backdrop--open' : ''}`}
                aria-label="Close quest details"
                onClick={closePanel}
              />
              <div
                ref={drawerRef}
                className={`skyward-journey-drawer${panelVisible ? ' skyward-journey-drawer--open' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="skyward-journey-drawer-title"
                onTransitionEnd={handlePanelTransitionEnd}
              >
                <div className="skyward-journey-drawer-handle" aria-hidden />
                <div className="skyward-journey-drawer-header">
                  <h2 id="skyward-journey-drawer-title" className="skyward-journey-drawer-title">
                    Quest details
                  </h2>
                  <button type="button" className="skyward-journey-drawer-close" onClick={closePanel}>
                    Close
                  </button>
                </div>
                <div className="skyward-journey-drawer-body">
                  {renderStepContent(selectedStep, selectedMeta)}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IoCheckmarkCircle,
  IoMic,
  IoMusicalNote,
  IoPulse,
  IoShuffle,
  IoTrophy,
  IoVolumeHigh,
} from 'react-icons/io5';
import {
  isMilestoneStep,
  JOURNEY_NODE_THEMES,
  NODE_STATE,
} from './journeyConstants';
import SkywardJourneyNodeButton from './SkywardJourneyNodeButton';
import './SkywardJourney.css';

const JOURNEY_ICONS = [IoMic, IoVolumeHigh, IoMusicalNote, IoPulse, IoShuffle, IoTrophy];

const MAP_SCALE = 1.5;
const MAP_EDGE_PAN_PADDING = 96;
const HORIZONTAL_OFFSET_PATTERN = [0, 25, 50, 25, 0, -25, -50, -25];
const PILLAR_TITLES = ['Vocal Clarity', 'Verbal Flow', 'Visual Presence', 'Stage Mastery'];
const PILLAR_SECTION_SIZE = 2;

function getHorizontalOffset(index) {
  return HORIZONTAL_OFFSET_PATTERN[((index % HORIZONTAL_OFFSET_PATTERN.length) + HORIZONTAL_OFFSET_PATTERN.length) % HORIZONTAL_OFFSET_PATTERN.length];
}

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

  const horizontalPadding = Math.max(MAP_EDGE_PAN_PADDING * 0.4, W * 0.08);
  const verticalPadding = 20; // Tighten vertical padding to prevent excessive scroll
  const minX = Math.min(0, W - w) - horizontalPadding;
  const maxX = Math.max(0, W - w) + horizontalPadding;
  const minY = Math.min(0, H - h) - verticalPadding;
  const maxY = Math.max(0, H - h) + verticalPadding;

  return {
    tx: Math.min(maxX, Math.max(minX, tx)),
    ty: Math.min(maxY, Math.max(minY, ty)),
  };
}

function JourneyNodeIcon({ index, className = '' }) {
  const Cmp = JOURNEY_ICONS[index % JOURNEY_ICONS.length];
  return <Cmp aria-hidden className={`skyward-journey-node-icon ${className}`.trim()} />;
}

/**
 * @param {object} props
 * @param {Array<{ id: string, nodeState: string, task?: object, title?: string }>} props.steps
 * @param {(step: object, meta: object) => React.ReactNode} props.renderStepContent
 * @param {boolean} [props.entranceFromNav] — play zoom-to-current-quest when navigating from side nav
 */
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const MapHeaderCard = styled.div`
  max-width: 400px;
  width: 90%;
  margin: 0 auto;
  padding: 24px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 2px solid #f18f01;
  position: sticky;
  top: 12px;
  z-index: 20;
  flex-shrink: 0;
`;

const HeaderTitle = styled.h1`
  font-size: 1.4rem;
  font-weight: 800;
  color: #f18f01;
  margin: 0;
  text-transform: uppercase;
`;

const HeaderDescription = styled.p`
  font-size: 14px;
  font-weight: 600;
  color: rgba(11, 57, 84, 0.6);
  margin: 0;
  line-height: 1.4;
`;

const HeaderStatBadge = styled.div`
  background: rgba(11, 57, 84, 0.06);
  color: #0b3954;
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  margin-top: 4px;
`;

const TooltipBox = styled.div`
  background: #ffffff;
  padding: 16px;
  border-radius: 16px;
  box-shadow:
    0 4px 0 0 #e5e5e5,
    0 12px 24px rgba(0, 0, 0, 0.12);
  min-width: 200px;
  max-height: min(70vh, 420px);
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  align-items: center;
  text-align: center;
`;

const TooltipBeak = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  
  /* Smart Beak Direction */
  ${(props) =>
    props.$placement === 'bottom'
      ? `
    top: -10px;
    border-bottom: 10px solid #ffffff;
  `
      : `
    bottom: -10px;
    border-top: 10px solid #ffffff;
  `}
`;

const TooltipTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #3c3c3c;
`;

const TooltipDescription = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #777777;
`;

const StartButton = styled.button`
  background-color: ${(props) => (props.disabled ? '#e5e5e5' : '#f18f01')};
  color: white;
  border: none;
  border-radius: 12px;
  padding: 10px 24px;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.8px;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  box-shadow: ${(props) => (props.disabled ? '#d5d5d5' : '#cd8b76')} 0 4px 0 0;
  transition: all 0.1s ease;
  width: 100%;
  text-transform: uppercase;

  &:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow: #cd8b76 0 2px 0 0;
  }
`;

const TOOLTIP_VIEW_MARGIN = 12;
const TOOLTIP_GAP = 14;
/** Conservative height for first layout; keeps bubble inside the viewport. */
const TOOLTIP_EST_HEIGHT = 280;

function computeTooltipLayout(nodeEl) {
  if (!nodeEl) return { left: 0, top: 0, transform: 'translate(-50%, -100%)', placement: 'top' };
  const rect = nodeEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  
  // Use window height for 25% calculation as requested
  const isTopArea = rect.top < (window.innerHeight * 0.25);

  const placement = isTopArea ? 'bottom' : 'top';

  const top =
    placement === 'bottom' ? rect.bottom + TOOLTIP_GAP : rect.top - TOOLTIP_GAP;
  const transform =
    placement === 'bottom' ? 'translateX(-50%)' : 'translate(-50%, -100%)';

  return { left: cx, top, transform, placement };
}

export const JourneyTooltip = ({ step, onStart, nodeRef }) => {
  const [layout, setLayout] = useState(null);

  useLayoutEffect(() => {
    const node = nodeRef?.current;
    if (!node) return undefined;

    const update = () => {
      setLayout(computeTooltipLayout(node));
    };

    update();
    window.addEventListener('resize', update);
    // Track scroll events in capture phase to ensure we react to map panning
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [nodeRef, step.id]);

  const isLocked = step.nodeState === 'locked';

  if (!layout) {
    return null;
  }

  const bubble = (
    <div
      className="skyward-journey-tooltip-anchor"
      style={{
        position: 'fixed',
        left: layout.left,
        top: layout.top,
        transform: layout.transform,
        zIndex: 10060,
        pointerEvents: 'auto',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
        style={{ maxWidth: 'min(22rem, calc(100vw - 24px))', transformOrigin: layout.placement === 'bottom' ? 'top center' : 'bottom center' }}
      >
        <TooltipBox>
          <TooltipTitle>{step.title || 'Lesson'}</TooltipTitle>
          <TooltipDescription>
            {isLocked
              ? 'Finish previous stages to unlock!'
              : step.nodeState === 'completed'
                ? '100% Complete'
                : 'Ready to start!'}
          </TooltipDescription>
          <StartButton
            disabled={isLocked}
            onClick={(e) => {
              e.stopPropagation();
              if (!isLocked) onStart(step);
            }}
          >
            {isLocked ? 'LOCKED' : 'START'}
          </StartButton>
          <TooltipBeak $placement={layout.placement} />
        </TooltipBox>
      </motion.div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(bubble, document.body);
};

export default function SkywardJourney({ steps, renderStepContent, entranceFromNav = false }) {
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

  const activeIndex = useMemo(
    () => steps.findIndex((s) => s.nodeState === NODE_STATE.ACTIVE),
    [steps],
  );

  const lastCompletedIndex = useMemo(() => {
    let last = -1;
    steps.forEach((s, i) => {
      if (s.nodeState === NODE_STATE.COMPLETED) last = i;
    });
    return last;
  }, [steps]);
  
  const completedCount = useMemo(() => steps.filter(s => s.nodeState === NODE_STATE.COMPLETED).length, [steps]);

  const [pathPoints, setPathPoints] = useState([]);
  const [indexedNodePoints, setIndexedNodePoints] = useState([]);
  const [svgBounds, setSvgBounds] = useState({ width: 1, height: 1 });
  const [panelOpenId, setPanelOpenId] = useState(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const panelClosePendingRef = useRef(false);
  const [jiggleIndex, setJiggleIndex] = useState(null);
  // removed showTapHint
  const [map, setMap] = useState(() => ({ tx: 0, ty: 0 }));
  const [tooltipNodeId, setTooltipNodeId] = useState(null);

  useLayoutEffect(() => {
    mapRef.current = map;
  }, [map]);

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
      setSvgBounds({ width: 1, height: 1 });
      return;
    }

    const cr = content.getBoundingClientRect();
    if (!cr.width || !cr.height) {
      setPathPoints([]);
      setIndexedNodePoints([]);
      setSvgBounds({ width: 1, height: 1 });
      return;
    }

    const sx = content.scrollWidth / cr.width;
    const sy = content.scrollHeight / cr.height;
    setSvgBounds({
      width: Math.max(1, content.scrollWidth),
      height: Math.max(1, content.scrollHeight),
    });
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
          setMap((m) => clampMapState(m, vp, content, MAP_SCALE));
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

  useEffect(() => {
    const id = requestAnimationFrame(() => recomputePath());
    return () => cancelAnimationFrame(id);
  }, [map.tx, map.ty, recomputePath]);

  /** Hero focus: keep map centered and scroll current active stage into view. */
  useLayoutEffect(() => {
    if (activeIndex < 0) return undefined;
    const el = nodeRefs.current[activeIndex];
    if (!el) return undefined;

    const raf = requestAnimationFrame(() => setMap({ tx: 0, ty: 0 }));

    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = entranceFromNav ? 160 : 80;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth', inline: 'nearest' });
    }, delay);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [activeIndex, entranceFromNav]);

  /** Wheel pans map vertically while preserving current zoom scale. */
  useEffect(() => {
    const vp = viewportRef.current;
    const content = mapContentRef.current;
    if (!vp || !content) return undefined;

    const onWheel = (e) => {
      if (panelOpenId) return;
      const dominantDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(dominantDelta) < 0.5) return;
      e.preventDefault();
      const panStep = dominantDelta * 0.8;
      setMap((m) => clampMapState({ ...m, ty: m.ty - panStep }, vp, content, MAP_SCALE));
    };

    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      vp.removeEventListener('wheel', onWheel);
    };
  }, [panelOpenId]);

  const onPointerDownViewport = useCallback(
    (e) => {
      if (panelOpenId) return;
      if (pinchRef.current) return;
      if (tooltipNodeId) setTooltipNodeId(null);
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const t = e.target;
      if (t instanceof Element && t.closest('.skyward-journey-node-shell')) return;
      if (t instanceof Element && t.closest('.skyward-journey-unit-header')) return;
      if (t instanceof Element && t.closest('.skyward-journey-start-callout')) return;
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
    [panelOpenId, tooltipNodeId],
  );

  const onPointerMoveViewport = useCallback((e) => {
    const p = pointerPanRef.current;
    if (!p || p.pid !== e.pointerId) return;
    const dy = e.clientY - p.sy;
    const vp = viewportRef.current;
    const content = mapContentRef.current;
    if (!vp || !content) return;
    setMap((m) =>
      clampMapState({ ...m, ty: p.ty + dy }, vp, content, MAP_SCALE),
    );
  }, []);

  const onPointerUpViewport = useCallback((e) => {
    const p = pointerPanRef.current;
    if (!p || p.pid !== e.pointerId) return;
    pointerPanRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onTouchStartPinch = useCallback((e) => {
    if (e.touches.length === 2) {
      pointerPanRef.current = null;
      pinchRef.current = { active: true };
    }
  }, []);

  const onTouchMovePinch = useCallback(
    (e) => {
      if (e.touches.length < 2 || !pinchRef.current) return;
      e.preventDefault();
    },
    [],
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
      setTooltipNodeId(step.id);
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

  const sections = [];
  let currentSectionRows = [];
  let currentSectionKey = 0;

  const pushCurrentSection = () => {
    if (!currentSectionRows.length) return;
    const pillarTitle = PILLAR_TITLES[currentSectionKey % PILLAR_TITLES.length];
    const sectionTitle = `Pillar ${currentSectionKey + 1}: ${pillarTitle}`;
    sections.push(
      <section key={`pillar-section-${currentSectionKey}`} className="skyward-journey-section">
        <div className="skyward-journey-section-rows">{currentSectionRows}</div>
        <div className="skyward-journey-section-header" role="presentation">
          <span className="skyward-journey-section-line" aria-hidden />
          <span className="skyward-journey-section-title">{sectionTitle}</span>
          <span className="skyward-journey-section-line" aria-hidden />
        </div>
      </section>,
    );
    currentSectionRows = [];
    currentSectionKey += 1;
  };

  steps.forEach((step, i) => {
    const theme = JOURNEY_NODE_THEMES[i % JOURNEY_NODE_THEMES.length];
    const isActive = step.nodeState === NODE_STATE.ACTIVE;
    const isDone = step.nodeState === NODE_STATE.COMPLETED;
    const isLocked = step.nodeState === NODE_STATE.LOCKED;
    const title = step.title ?? step.task?.title ?? step.id;
    const milestone = isMilestoneStep(i);
    const jiggle = jiggleIndex === i;
    const horizontalOffset = getHorizontalOffset(i);
    const labelSide = horizontalOffset > 0 ? 'left' : 'right';

    currentSectionRows.push(
      <div
        key={step.id}
        className="skyward-journey-row"
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
              {i === 0 && isActive ? null : null}
              <SkywardJourneyNodeButton
                type="button"
                nodeState={step.nodeState}
                ref={(el) => {
                  nodeRefs.current[i] = el;
                }}
                className={[
                  'skyward-journey-node',
                  `skyward-journey-node--${step.nodeState}`,
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
                style={{
                  '--skyward-node-offset': `${horizontalOffset}%`,
                }}
                onClick={() => handleNodeClick(step, i)}
              >
                {isDone ? (
                  <IoCheckmarkCircle className="skyward-journey-node-state-icon" aria-hidden />
                ) : milestone ? (
                  <IoTrophy
                    className="skyward-journey-node-icon skyward-journey-node-icon--boss"
                    aria-hidden
                  />
                ) : (
                  <JourneyNodeIcon index={i} />
                )}
              </SkywardJourneyNodeButton>
              <AnimatePresence>
                {tooltipNodeId === step.id && (
                  <JourneyTooltip
                    key={step.id}
                    step={step}
                    onStart={(s) => setPanelOpenId(s.id)}
                    nodeRef={{ get current() { return nodeRefs.current[i]; } }}
                  />
                )}
              </AnimatePresence>
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
            {/* removed tap hint */}
          </div>
        </div>
      </div>,
    );

    if ((i + 1) % PILLAR_SECTION_SIZE === 0) {
      pushCurrentSection();
    }
  });
  pushCurrentSection();

  return (
    <div className="skyward-journey skyward-journey-container skyward-journey-anim-root no-scrollbar" ref={rootRef}>
      <MapHeaderCard className="skyward-journey-anim-header">
        <HeaderTitle>CHAPTER 1: VOCAL CLARITY</HeaderTitle>
        <HeaderDescription>Master your speaking fundamentals</HeaderDescription>
        <HeaderStatBadge>{completedCount} / {steps.length} Stages Completed</HeaderStatBadge>
      </MapHeaderCard>
      <div className="skyward-journey-map skyward-journey-anim-map">
      <div
        className="skyward-journey-map-viewport"
        ref={viewportRef}
        onPointerDown={onPointerDownViewport}
        onPointerMove={onPointerMoveViewport}
        onPointerUp={onPointerUpViewport}
        onPointerCancel={onPointerUpViewport}
        onTouchStart={onTouchStartPinch}
        onTouchMove={onTouchMovePinch}
        onTouchEnd={onTouchEndPinch}
        role="application"
        aria-label="Skyward journey path. Scroll wheel to move the map up or down, and drag to pan."
      >
        <div
          className="skyward-journey-map-layer"
          ref={mapLayerRef}
          style={{
            transform: `translate(${map.tx}px, ${map.ty}px) scale(${MAP_SCALE})`,
          }}
        >
          <div className="skyward-journey-map-content" ref={mapContentRef}>
            {pathPoints.length > 1 ? (
              <svg
                className="skyward-journey-svg"
                aria-hidden
                shapeRendering="geometricPrecision"
                preserveAspectRatio="none"
                viewBox={`0 0 ${svgBounds.width} ${svgBounds.height}`}
              >
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

            <div className="skyward-journey-column">
              {sections}
            </div>
          </div>
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

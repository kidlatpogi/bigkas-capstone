import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoTrophy,
  IoChatbubbleEllipses,
  IoCheckmarkCircle,
  IoClose,
  IoEye,
  IoMic,
  IoPulse,
  IoStar,
  IoSync,
} from 'react-icons/io5';
import { FaBrain, FaGhost } from 'react-icons/fa';
import { GiGoblinHead, GiFishMonster, GiWerewolf, GiVampireDracula } from 'react-icons/gi';
import { SiDungeonsanddragons } from 'react-icons/si';
import {
  JOURNEY_NODE_THEMES,
  NODE_STATE,
} from './journeyConstants';
import SkywardJourneyNodeButton from './SkywardJourneyNodeButton';
import './SkywardJourney.css';

const MAP_SCALE = 1.5;
const MAP_EDGE_PAN_PADDING = 96;
const ORTHOGONAL_OFFSETS = [0, 90, 90, 0, -90, -90];

function getHorizontalOffset(index) {
  return ORTHOGONAL_OFFSETS[index % ORTHOGONAL_OFFSETS.length];
}

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
  /** Keep the map from being panned completely off-screen (vertical). */
  const minX = Math.min(0, W - w) - horizontalPadding;
  const maxX = Math.max(0, W - w) + horizontalPadding;
  let minY;
  let maxY;
  if (h > H) {
    minY = H - h;
    maxY = 0;
  } else {
    minY = Math.min(0, H - h);
    maxY = Math.max(0, H - h);
  }

  return {
    tx: Math.min(maxX, Math.max(minX, tx)),
    ty: Math.min(maxY, Math.max(minY, ty)),
  };
}

function isStartNode(step, index) {
  return Number(step?.stageNumber) === 1 || Number(step?.task?.activity_order) === 1 || index === 0;
}

function getPhaseIcon(step) {
  const phase = getStepPhaseName(step).toLowerCase();
  switch (true) {
    case phase.includes('gaze'):
      return IoEye;
    case phase.includes('vocal'):
      return IoMic;
    case phase.includes('verbal'):
      return IoChatbubbleEllipses;
    case phase.includes('sync'):
    case phase.includes('multi'):
      return IoSync;
    case phase.includes('context'):
    case phase.includes('advanced'):
      return FaBrain;
    default:
      return IoCheckmarkCircle;
  }
}

function JourneyNodeIcon({ step, index, className = '' }) {
  const Cmp = isStartNode(step, index) ? IoStar : getPhaseIcon(step);
  return <Cmp aria-hidden className={`skyward-journey-node-icon ${className}`.trim()} />;
}

function getStepLevel(step) {
  const targetLevel = Number(step?.task?.target_level);
  if (Number.isFinite(targetLevel) && targetLevel > 0) return targetLevel;
  return 1;
}

function getBossMonsterIcon(level) {
  switch (Number(level)) {
    case 1:
      return GiGoblinHead;
    case 2:
      return GiFishMonster;
    case 3:
      return GiWerewolf;
    case 4:
      return GiVampireDracula;
    case 5:
      return SiDungeonsanddragons;
    default:
      return GiGoblinHead;
  }
}

/**
 * @param {object} props
 * @param {Array<{ id: string, nodeState: string, task?: object, title?: string }>} props.steps
 * @param {(step: object, meta: object) => React.ReactNode} props.renderStepContent
 * @param {boolean} [props.entranceFromNav] — play zoom-to-current-quest when navigating from side nav
 */

const MapHeaderCard = styled.div`
  width: min(90vw, 882px);
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
  top: max(14px, env(safe-area-inset-top, 0px));
  z-index: 1400;
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
  background: ${(props) => (props.$nodeState === 'locked' ? '#ffffff' : '#2d5a27')};
  color: ${(props) => (props.$nodeState === 'locked' ? '#333333' : '#ffffff')};
  padding: 20px;
  border-radius: 16px;
  border: ${(props) => (props.$nodeState === 'locked' ? '2px solid #e5e5e5' : '2px solid #1a3b16')};
  border-bottom: ${(props) => (props.$nodeState === 'locked' ? '4px solid #e5e5e5' : '4px solid #1a3b16')};
  width: min(380px, calc(100vw - 32px));
  box-sizing: border-box;
  max-height: min(70vh, 420px);
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  &::-webkit-scrollbar {
    display: none;
  } /* Chrome/Safari */
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  align-items: center;
  text-align: center;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);

  /* The Beak (Pointer) */
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    z-index: 2;

    ${(props) =>
      props.$placement === 'bottom'
        ? `
      top: -10px;
      border-bottom: 10px solid ${props.$nodeState === 'locked' ? '#ffffff' : '#2d5a27'};
    `
        : `
      bottom: -10px;
      border-top: 10px solid ${props.$nodeState === 'locked' ? '#ffffff' : '#2d5a27'};
    `}
  }

  /* Beak border for locked/active state */
  &::before {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12.5px solid transparent;
    border-right: 12.5px solid transparent;
    z-index: 1;
    ${(props) =>
      props.$placement === 'bottom'
        ? `top: -13px; border-bottom: 13px solid ${props.$nodeState === 'locked' ? '#e5e5e5' : '#1a3b16'};`
        : `bottom: -13px; border-top: 13px solid ${props.$nodeState === 'locked' ? '#e5e5e5' : '#1a3b16'};`
    }
  }
`;

const TooltipCloseBtn = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: ${(props) => (props.$nodeState === 'locked' ? '#a1a1aa' : '#ffffff')};
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 3;

  &:hover {
    color: ${(props) => (props.$nodeState === 'locked' ? '#333333' : '#e5e5e5')};
  }
`;

const TooltipTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: inherit;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-top: 8px; /* space for absolute close btn */
`;

const TooltipDescription = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$nodeState === 'locked' ? '#777777' : 'rgba(255, 255, 255, 0.85)')};
`;

const TooltipStartButton = styled.button`
  background-color: ${(props) => (props.$nodeState === 'locked' ? '#f5f5f5' : '#ffffff')};
  color: ${(props) => (props.$nodeState === 'locked' ? '#a1a1aa' : '#2d5a27')};
  border: ${(props) => (props.$nodeState === 'locked' ? '2px solid #e5e5e5' : '2px solid #e5e5e5')};
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 1px;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  box-shadow: ${(props) => (props.$nodeState === 'locked' ? '#d5d5d5' : '#d5d5d5')} 0 4px 0 0;
  transition: all 0.1s ease;
  width: 100%;
  text-transform: uppercase;
  margin-top: 4px;

  &:active:not(:disabled) {
    transform: translateY(4px);
    box-shadow: ${(props) => (props.$nodeState === 'locked' ? '#d5d5d5' : '#d5d5d5')} 0 0px 0 0;
  }
`;

const TOOLTIP_VIEW_MARGIN = 12;
const TOOLTIP_GAP = 14;
/** Conservative height for first layout; keeps bubble inside the viewport. */
const TOOLTIP_EST_HEIGHT = 280;

function computeTooltipLayout(nodeEl, forceBottom = false) {
  if (!nodeEl) return { left: 0, top: 0, transform: 'translate(-50%, -100%)', placement: 'top' };
  const rect = nodeEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;

  // Use window height for 25% calculation as requested
  const isTopArea = rect.top < window.innerHeight * 0.25;

  const placement = (isTopArea || forceBottom) ? 'bottom' : 'top';

  const top = placement === 'bottom' ? rect.bottom + TOOLTIP_GAP : rect.top - TOOLTIP_GAP;
  const transform = placement === 'bottom' ? 'translateX(-50%)' : 'translate(-50%, -100%)';

  return { left: cx, top, transform, placement };
}

export const JourneyTooltip = ({ step, onStart, onClose, nodeRef, forceBottom = false }) => {
  const [layout, setLayout] = useState(null);

  useLayoutEffect(() => {
    const node = nodeRef?.current;
    if (!node) return undefined;

    const update = () => {
      setLayout(computeTooltipLayout(node, forceBottom));
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
        style={{
          maxWidth: 'min(30rem, calc(100vw - 24px))',
          width: '100%',
          transformOrigin: layout.placement === 'bottom' ? 'top center' : 'bottom center',
        }}
      >
        <TooltipBox $placement={layout.placement} $nodeState={step.nodeState}>
          <TooltipCloseBtn
            $nodeState={step.nodeState}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <IoClose />
          </TooltipCloseBtn>
          <TooltipTitle>
            {(() => {
              const obj = String(step.task?.objective ?? step.objective ?? '').trim();
              return obj || step.title || 'Lesson';
            })()}
          </TooltipTitle>
          <TooltipDescription $nodeState={step.nodeState}>
            {isLocked
              ? 'Finish previous stages to unlock!'
              : (() => {
                  const n = Number(step.stageNumber);
                  const total = Number(step.totalStages);
                  const safeTotal = Number.isFinite(total) && total > 0 ? total : 1;
                  const safeN = Number.isFinite(n) && n > 0 ? n : 1;
                  return `Stage ${safeN} of ${safeTotal}`;
                })()}
          </TooltipDescription>
          <TooltipStartButton
            $nodeState={step.nodeState}
            disabled={isLocked}
            onClick={(e) => {
              e.stopPropagation();
              if (!isLocked) onStart(step);
            }}
          >
            {isLocked ? 'LOCKED' : 'START'}
          </TooltipStartButton>
        </TooltipBox>
      </motion.div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(bubble, document.body);
};

/** Section grouping + header: `public.activities.phase_name` */
function getStepPhaseName(step) {
  const raw =
    step?.task?.phase_name ??
    step?.task?.pillarName ??
    step?.pillarName ??
    '';
  const s = String(raw).trim();
  return s || 'Training';
}

/** Node row primary label: `public.activities.title` */
function getStepActivityTitle(step) {
  const raw = step?.title ?? step?.task?.title ?? '';
  const s = String(raw).trim();
  return s || String(step?.id ?? 'Activity');
}

export default function SkywardJourney({
  steps,
  groupedTasks,
  renderStepContent,
  entranceFromNav = false,
  scrollToStepIndex = null,
}) {
  const gradId = useId().replace(/:/g, '');
  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const mapContentRef = useRef(null);
  const mapLayerRef = useRef(null);
  const drawerRef = useRef(null);
  const sectionWrapperRefs = useRef([]);
  const nodeRefs = useRef([]);
  const tapDismissedRef = useRef(false);
  const mapRef = useRef({ tx: 0, ty: 0 });
  const pointerPanRef = useRef(null);
  const pinchRef = useRef(null);

  const activeIndex = useMemo(
    () => steps.findIndex((s) => s.nodeState === NODE_STATE.ACTIVE),
    [steps],
  );
  
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
      if (indexedNodePoints.length !== 0) setIndexedNodePoints([]);
      setPathPoints([]);
      setSvgBounds({ width: 1, height: 1 });
      return;
    }

    const cr = content.getBoundingClientRect();
    if (!cr.width || !cr.height) {
      if (indexedNodePoints.length !== 0) setIndexedNodePoints([]);
      setPathPoints([]);
      setSvgBounds({ width: 1, height: 1 });
      return;
    }

    const centerX = content.clientWidth / 2;
    const indexed = [];

    for (let i = 0; i < steps.length; i += 1) {
      const node = nodeRefs.current[i];
      if (!node) continue;

      let top = 0;
      let el = node;
      while (el && el !== content) {
        top += el.offsetTop;
        el = el.offsetParent;
      }
      const y = top + (node.offsetHeight / 2);
      const x = centerX + getHorizontalOffset(i);
      indexed[i] = { x, y };
    }

    setIndexedNodePoints(indexed);

    const pts = indexed.filter((p) => p != null);
    if (pts.length < 2) {
      setPathPoints([]);
      return;
    }

    setSvgBounds({
      width: Math.max(1, content.clientWidth),
      height: Math.max(1, content.clientHeight),
    });
    setPathPoints(pts);
  }, [steps.length, indexedNodePoints.length]);

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
    // Only recompute path on mount and when steps change to avoid unnecessary re-renders during scroll
    const id = requestAnimationFrame(() => recomputePath());
    return () => cancelAnimationFrame(id);
  }, [recomputePath]);

  /** Hero focus: Mathematically pan the map to center the active node using CSS transforms. */
  useLayoutEffect(() => {
    const targetIndex =
      scrollToStepIndex != null && scrollToStepIndex >= 0 ? scrollToStepIndex : activeIndex;
    if (targetIndex < 0) return undefined;

    const fromDashboard = scrollToStepIndex != null && scrollToStepIndex >= 0;
    const delay = entranceFromNav || fromDashboard ? 200 : 80;

    const t = window.setTimeout(() => {
      const el = nodeRefs.current[targetIndex];
      const vp = viewportRef.current;
      const content = mapContentRef.current;
      if (!el || !vp || !content) return;

      // Find exact unscaled Y position of the target node
      let top = 0;
      let currentEl = el;
      while (currentEl && currentEl !== content) {
        top += currentEl.offsetTop;
        currentEl = currentEl.offsetParent;
      }
      const nodeCenterY = top + (el.offsetHeight / 2);
      const nodeCenterX = (content.clientWidth / 2) + getHorizontalOffset(targetIndex);

      // We want the node exactly at the focus point (32% from the top of the screen)
      const focusScreenY = vp.clientHeight * 0.32;
      const targetTy = focusScreenY - (nodeCenterY * MAP_SCALE);
      const targetTx = (vp.clientWidth / 2) - (nodeCenterX * MAP_SCALE);

      setMap((m) => clampMapState({ tx: targetTx, ty: targetTy }, vp, content, MAP_SCALE));
    }, delay);

    return () => {
      window.clearTimeout(t);
    };
  }, [activeIndex, entranceFromNav, scrollToStepIndex]);

  /** Wheel pans map vertically while preserving current zoom scale. */
  useEffect(() => {
    const vp = viewportRef.current;
    const content = mapContentRef.current;
    if (!vp || !content) return undefined;

    const onWheel = (e) => {
      if (panelOpenId) return;
      const dominantDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(dominantDelta) < 0.5) return;
      const panStep = dominantDelta * 0.8;
      const current = mapRef.current;
      const next = clampMapState({ ...current, ty: current.ty - panStep }, vp, content, MAP_SCALE);
      const didPan = Math.abs(next.ty - current.ty) > 0.1 || Math.abs(next.tx - current.tx) > 0.1;
      if (!didPan) return;
      e.preventDefault();
      setMap(next);
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

  const { solidPathD, dashedPathD } = useMemo(() => {
    let solid = '';
    let dashed = '';
    if (pathPoints.length < 2) return { solidPathD: '', dashedPathD: '' };

    for (let i = 1; i < pathPoints.length; i++) {
      const prev = pathPoints[i - 1];
      const curr = pathPoints[i];
      const midY = prev.y + (curr.y - prev.y) / 2;
      const segment = `M ${prev.x} ${prev.y} V ${midY} H ${curr.x} V ${curr.y} `;

      const prevPhase = getStepPhaseName(steps[i - 1]);
      const currPhase = getStepPhaseName(steps[i]);

      if (prevPhase !== currPhase) {
        dashed += segment;
      } else {
        solid += segment;
      }
    }
    return { solidPathD: solid, dashedPathD: dashed };
  }, [pathPoints, steps]);

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
  const sectionMeta = [];
  let currentSectionRows = [];
  let sectionPillarTitle = null;
  let pillarSectionIndex = 0;

  const flushPillarSection = () => {
    if (!currentSectionRows.length) return;
    const sectionTitle = sectionPillarTitle || 'Training';
    pillarSectionIndex += 1;
    sections.push(
      <section key={`pillar-section-${sectionTitle}-${pillarSectionIndex}`} className="skyward-journey-section">
        <div className="skyward-journey-section-rows">{currentSectionRows}</div>
        <div className="skyward-journey-section-header" role="presentation">
          <span className="skyward-journey-section-line" aria-hidden />
          <span className="skyward-journey-section-title">{sectionTitle}</span>
          <span className="skyward-journey-section-line" aria-hidden />
        </div>
      </section>,
    );
    currentSectionRows = [];
  };

  const totalStageCount = steps.length;
  let globalNodeIndex = 0;

  if (groupedTasks && groupedTasks.length > 0) {
    groupedTasks.forEach((section) => {
      const sectionTitle = section.phaseName || 'Training';
      const sectionIndex = sectionMeta.length;
      const sectionStartIndex = globalNodeIndex;
      const currentSectionRows = section.tasks.map((step, sectionTaskIndex) => {
        const i = globalNodeIndex++;
        const theme = JOURNEY_NODE_THEMES[i % JOURNEY_NODE_THEMES.length];
        const isActive = step.nodeState === NODE_STATE.ACTIVE;
        const isDone = step.nodeState === NODE_STATE.COMPLETED;
        const isLocked = step.nodeState === NODE_STATE.LOCKED;
        const title = getStepActivityTitle(step);
        const isSectionEnd = sectionTaskIndex === section.tasks.length - 1;
        const currentLevel = getStepLevel(step);
        const nextStep = steps[i + 1];
        const nextLevel = nextStep ? getStepLevel(nextStep) : currentLevel;

        const isGlobalEnd = i === steps.length - 1;
        const isStage31 = Number(step.stageNumber) === 31 || Number(step.task?.activity_order) === 31;

        // The Ultimate Boss (Circle/Ghost) is ONLY at the end of Level 5
        const isUltimateBoss = (isGlobalEnd || isStage31) && currentLevel === 5;

        // A Level End (Square/Monster) triggers if it's Stage 31 of Levels 1-4, OR if the next step jumps to a new level
        const isLevelEnd = !isUltimateBoss && (isStage31 || (!nextStep || nextLevel !== currentLevel));

        // A Section Trophy is any section end that isn't a Boss
        const isSectionTrophy = isSectionEnd && !isUltimateBoss && !isLevelEnd;
        const isEnhancedTrophyNode = !isUltimateBoss && (isSectionTrophy || isLevelEnd);
        const BossMonsterIcon = getBossMonsterIcon(currentLevel);
        const startStage = sectionTaskIndex === 0;
        const jiggle = jiggleIndex === i;
        const horizontalOffset = getHorizontalOffset(i);
        let labelSide = 'right';
        if (horizontalOffset > 0) {
          labelSide = 'left';
        } else if (horizontalOffset < 0) {
          labelSide = 'right';
        } else {
          labelSide = i % 2 === 0 ? 'right' : 'left';
        }
        const stageNum = Number(step.stageNumber);
        const stageTotal = Number(step.totalStages);
        const safeStageTotal =
          Number.isFinite(stageTotal) && stageTotal > 0 ? stageTotal : totalStageCount;
        const safeStageNum =
          Number.isFinite(stageNum) && stageNum > 0 ? stageNum : i + 1;

        return (
          <div
            key={step.id}
            className="skyward-journey-row dashboard-anim-bottom"
          >
            <div className="skyward-journey-track">
              <div
                className={`skyward-journey-node-shell${
                  i === 0 && isActive ? ' skyward-journey-node-shell--start-onboarding' : ''
                }`}
                style={{ zIndex: 10, position: 'relative' }}
              >
                <div
                  className={`skyward-journey-node-cluster${isUltimateBoss ? ' skyward-journey-node-cluster--boss' : ''}`}
                  style={{
                    transform: `translateX(${horizontalOffset}px)`,
                  }}
                >
                  {(isUltimateBoss || isLevelEnd) ? (
                    <div className="skyward-journey-start-callout" aria-hidden>
                      <span className="skyward-journey-start-badge" style={{ backgroundColor: '#d32f2f', color: '#fff' }}>
                        BOSS
                      </span>
                    </div>
                  ) : startStage ? (
                    <div className="skyward-journey-start-callout" aria-hidden>
                      <span className="skyward-journey-start-badge">START</span>
                    </div>
                  ) : null}
                  <SkywardJourneyNodeButton
                    type="button"
                    nodeState={step.nodeState}
                    ref={(el) => {
                      nodeRefs.current[i] = el;
                    }}
                    className={[
                      'skyward-journey-node',
                      `skyward-journey-node--${step.nodeState}`,
                      (isUltimateBoss || isLevelEnd) ? 'skyward-journey-node--boss' : '',
                      isEnhancedTrophyNode ? 'skyward-journey-node--trophy' : '',
                      jiggle ? 'skyward-journey-node--jiggle' : '',
                      !isLocked ? 'skyward-journey-node--unlocked' : '',
                      isLocked ? 'skyward-journey-node--locked-teaser' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-current={isActive ? 'step' : undefined}
                    aria-expanded={panelOpenId === step.id}
                    aria-label={`${isUltimateBoss ? 'Milestone: ' : ''}${theme.shortLabel}: ${title}. ${
                      isDone ? 'Completed' : isLocked ? 'Locked' : 'Current step'
                    }. Open quest details.`}
                    onClick={() => handleNodeClick(step, i)}
                  >
                    {isUltimateBoss ? (
                      <FaGhost
                        className="skyward-journey-node-icon skyward-journey-node-icon--boss"
                        aria-hidden
                      />
                    ) : isLevelEnd ? (
                      <BossMonsterIcon
                        className="skyward-journey-node-icon skyward-journey-node-icon--boss"
                        aria-hidden
                      />
                    ) : isSectionTrophy ? (
                      <IoTrophy
                        className="skyward-journey-node-icon skyward-journey-node-icon--trophy"
                        aria-hidden
                      />
                    ) : startStage ? (
                      <IoStar
                        className="skyward-journey-node-icon"
                        aria-hidden
                      />
                    ) : isDone ? (
                      <IoCheckmarkCircle className="skyward-journey-node-state-icon" aria-hidden />
                    ) : (
                      <JourneyNodeIcon step={step} index={i} />
                    )}
                  </SkywardJourneyNodeButton>
                  <AnimatePresence>
                    {tooltipNodeId === step.id && (
                      <JourneyTooltip
                        key={step.id}
                        step={step}
                        onStart={(s) => setPanelOpenId(s.id)}
                        onClose={() => setTooltipNodeId(null)}
                        nodeRef={{ get current() { return nodeRefs.current[i]; } }}
                        forceBottom={i >= steps.length - 2}
                      />
                    )}
                  </AnimatePresence>
                  <div
                    className={`level-label level-label--side-${labelSide}`}
                    aria-hidden
                  >
                    <span className="level-label__title">
                      {isUltimateBoss ? 'Summit' : title}
                    </span>
                    <span className="level-label__stage">
                      {isUltimateBoss
                        ? `Boss · Stage ${safeStageNum} of ${safeStageTotal}`
                        : `Stage ${safeStageNum} of ${safeStageTotal}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      });

      sectionMeta.push({
        title: sectionTitle,
        step: section.tasks?.[0] ?? null,
        firstStepIndex: sectionStartIndex,
      });

      sections.push(
        <section
          key={`pillar-section-${sectionTitle}`}
          className="skyward-journey-section"
          ref={(el) => { sectionWrapperRefs.current[sectionIndex] = el; }}
          data-pillar-text={`Pillar ${getStepLevel(section.tasks[0])}: ${sectionTitle}`}
        >
          <div className="skyward-journey-section-rows">{currentSectionRows}</div>
          <div
            className="skyward-journey-section-header"
            role="presentation"
          >
            <span className="skyward-journey-section-line" aria-hidden />
            <span className="skyward-journey-section-title">{sectionTitle}</span>
            <span className="skyward-journey-section-line" aria-hidden />
          </div>
        </section>,
      );
    });
  }
  sectionWrapperRefs.current.length = sectionMeta.length;
  const activeStepIndex = steps.findIndex((s) => s.nodeState === NODE_STATE.ACTIVE);
  const lastCompletedStepIndex = (() => {
    for (let i = steps.length - 1; i >= 0; i -= 1) {
      if (steps[i]?.nodeState === NODE_STATE.COMPLETED) return i;
    }
    return -1;
  })();
  const indexToUse = activeStepIndex >= 0
    ? activeStepIndex
    : (lastCompletedStepIndex >= 0 ? lastCompletedStepIndex : 0);
  const initialStep = steps[indexToUse];
  const initialText = initialStep
    ? `Pillar ${getStepLevel(initialStep)}: ${getStepPhaseName(initialStep)}`
    : 'Pillar 1: General';
  const [currentPillarText, setCurrentPillarText] = useState(initialText);

  // Hybrid Section-Based Tracking (Ignores CSS Animation Delays)
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !sectionWrapperRefs.current.length) return;

    // What is the focus Y in the UNSCALED map coordinates?
    const vHeight = vp.clientHeight || window.innerHeight;
    const focusScreenY = vHeight * 0.32;
    // Reverse the transform to find exactly where the camera is mathematically
    const targetMapY = (focusScreenY - map.ty) / MAP_SCALE;

    let closestText = null;
    let minDistance = Infinity;

    sectionWrapperRefs.current.forEach((el) => {
      if (!el) return;
      // Use offsetTop to get the static layout position, completely bypassing CSS transform animations
      const sTop = el.offsetTop;
      const sBottom = sTop + el.offsetHeight;

      // Check if the mathematical camera intersects the static section box
      if (targetMapY >= sTop && targetMapY <= sBottom) {
        closestText = el.getAttribute('data-pillar-text');
        minDistance = 0;
      } else if (minDistance > 0) {
        const dist = Math.min(Math.abs(targetMapY - sTop), Math.abs(targetMapY - sBottom));
        if (dist < minDistance) {
          minDistance = dist;
          closestText = el.getAttribute('data-pillar-text');
        }
      }
    });

    if (closestText) {
      setCurrentPillarText(closestText);
    }
  }, [map.ty]);
  const activeOrHighestIndex = Math.max(activeStepIndex, lastCompletedStepIndex, 0);
  let pathFillPercentage = 0;
  if (pathPoints.length > 1 && pathPoints[activeOrHighestIndex]) {
    const startY = pathPoints[0].y;
    const endY = pathPoints[pathPoints.length - 1].y;
    const currentY = pathPoints[activeOrHighestIndex].y;

    if (startY !== endY) {
      pathFillPercentage = Math.max(0, Math.min(100, ((startY - currentY) / (startY - endY)) * 100));
    }
  }

  return (
    <div className="skyward-journey-wrap" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="skyward-journey skyward-journey-container no-scrollbar" ref={rootRef}>
        <MapHeaderCard className="skyward-journey-anim-header">
          <HeaderTitle>{currentPillarText}</HeaderTitle>
          <HeaderDescription>Master your speaking fundamentals</HeaderDescription>
          <HeaderStatBadge>{completedCount} / {steps.length} Stages Completed</HeaderStatBadge>
        </MapHeaderCard>
        <div className="skyward-journey-fixed-header-spacer" aria-hidden />
        <div className="skyward-journey-anim-root skyward-journey-map skyward-journey-anim-map">
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
              <div className="skyward-journey-map-content">
                <div className="skyward-journey-column" ref={mapContentRef} style={{ position: 'relative' }}>
                  {pathPoints.length > 1 ? (
                    <svg
                      className="skyward-journey-svg"
                      aria-hidden
                      shapeRendering="geometricPrecision"
                      preserveAspectRatio="none"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
                    >
                      <defs>
                        <linearGradient id={`skyward-journey-line-grad-${gradId}`} x1="0%" y1="100%" x2="0%" y2="0%">
                          <stop offset="0%" stopColor="#EBF4DD" />
                          <stop offset={`${pathFillPercentage}%`} stopColor="#EBF4DD" />
                          <stop offset={`${pathFillPercentage}%`} stopColor="#a1a1aa" />
                          <stop offset="100%" stopColor="#a1a1aa" />
                        </linearGradient>
                      </defs>
                      <path
                        className="skyward-journey-polyline skyward-journey-polyline--rim"
                        fill="none"
                        d={solidPathD}
                        stroke="var(--skyward-path-rim, #e4e4e7)"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="20"
                      />
                      <path
                        className="skyward-journey-polyline skyward-journey-polyline--main"
                        fill="none"
                        d={solidPathD}
                        stroke={`url(#skyward-journey-line-grad-${gradId})`}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="12"
                      />
                      <path
                        className="skyward-journey-polyline skyward-journey-polyline--dashed"
                        fill="none"
                        d={dashedPathD}
                        stroke="var(--skyward-path-locked, #a1a1aa)"
                        strokeDasharray="12 12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="6"
                      />
                    </svg>
                  ) : null}
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
    </div>
  );
}

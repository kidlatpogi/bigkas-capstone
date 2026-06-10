import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { IoChatbubbleEllipses } from '@react-icons/all-files/io5/IoChatbubbleEllipses';
import { IoCheckmarkCircle } from '@react-icons/all-files/io5/IoCheckmarkCircle';
import { IoClose } from '@react-icons/all-files/io5/IoClose';
import { IoEye } from '@react-icons/all-files/io5/IoEye';
import { IoMic } from '@react-icons/all-files/io5/IoMic';
import { IoPulse } from '@react-icons/all-files/io5/IoPulse';
import { IoStar } from '@react-icons/all-files/io5/IoStar';
import { IoSync } from '@react-icons/all-files/io5/IoSync';
import { IoRestaurant } from '@react-icons/all-files/io5/IoRestaurant';
import { IoFilm } from '@react-icons/all-files/io5/IoFilm';
import { IoMusicalNotes } from '@react-icons/all-files/io5/IoMusicalNotes';
import { IoBook } from '@react-icons/all-files/io5/IoBook';
import { IoFitness } from '@react-icons/all-files/io5/IoFitness';
import { IoAirplane } from '@react-icons/all-files/io5/IoAirplane';
import { IoCodeWorking } from '@react-icons/all-files/io5/IoCodeWorking';
import { IoColorPalette } from '@react-icons/all-files/io5/IoColorPalette';
import { IoSchool } from '@react-icons/all-files/io5/IoSchool';
import { IoHome } from '@react-icons/all-files/io5/IoHome';
import { IoChatbubbles } from '@react-icons/all-files/io5/IoChatbubbles';
import { IoTime } from '@react-icons/all-files/io5/IoTime';
import { IoCash } from '@react-icons/all-files/io5/IoCash';
import { IoCall } from '@react-icons/all-files/io5/IoCall';
import { IoEarth } from '@react-icons/all-files/io5/IoEarth';
import { IoPlanet } from '@react-icons/all-files/io5/IoPlanet';
import { IoImage } from '@react-icons/all-files/io5/IoImage';
import { IoBriefcase } from '@react-icons/all-files/io5/IoBriefcase';
import { IoCafe } from '@react-icons/all-files/io5/IoCafe';
import { IoLocation } from '@react-icons/all-files/io5/IoLocation';
import { IoPlayCircle } from '@react-icons/all-files/io5/IoPlayCircle';
import { IoPerson } from '@react-icons/all-files/io5/IoPerson';
import { IoSettings } from '@react-icons/all-files/io5/IoSettings';
import { IoHardwareChip } from '@react-icons/all-files/io5/IoHardwareChip';
import { IoTrophy } from '@react-icons/all-files/io5/IoTrophy';
import { IoPeople } from '@react-icons/all-files/io5/IoPeople';
import { IoList } from '@react-icons/all-files/io5/IoList';
import { IoLockClosed } from '@react-icons/all-files/io5/IoLockClosed';
import {
  JOURNEY_NODE_THEMES,
  NODE_STATE,
} from './journeyConstants';
import { BIGKAS_LEVELS } from '../../utils/activityProgress';
import { formatPassingScore } from '../../utils/passingScore';
import SkywardJourneyNodeButton from './SkywardJourneyNodeButton';
import { getSpriteUrl } from '../../utils/assetUtils';
import { getTrophyImageUrl } from '../../utils/trophyClaims';
import { FaBrain } from '@react-icons/all-files/fa/FaBrain';
import { FaDragon } from '@react-icons/all-files/fa/FaDragon';
import { FaGhost } from '@react-icons/all-files/fa/FaGhost';
import { GiGoblinHead } from '@react-icons/all-files/gi/GiGoblinHead';
import { GiFishMonster } from '@react-icons/all-files/gi/GiFishMonster';
import { GiWerewolf } from '@react-icons/all-files/gi/GiWerewolf';
import { GiVampireDracula } from '@react-icons/all-files/gi/GiVampireDracula';
import { GenIcon } from '@react-icons/all-files/lib';

const safetyBarrierImage = getSpriteUrl('common/safety-barrier.png');
const randomizerRobotImage = getSpriteUrl('Robot/0002.webp');
const rankBronzeImage = getSpriteUrl('Rank/rank-bronze.webp');
const rankSilverImage = getSpriteUrl('Rank/rank-silver.webp');
const rankGoldImage = getSpriteUrl('Rank/rank-gold.webp');
const rankMythrilImage = getSpriteUrl('Rank/rank-mythril.webp');
const rankLegendaryImage = getSpriteUrl('Rank/rank-legendary.webp');
const BIGKAS_PREREQ_LOGO_URL = 'https://assets.bigkas.site/Images/Bigkas-Logo.webp';
import './SkywardJourney.css';

const MotionTooltipFrame = React.lazy(async () => {
  const { motion } = await import('framer-motion');
  const MotionDiv = motion.div;

  return {
    default: function MotionTooltipFrameComponent(props) {
      return React.createElement(MotionDiv, props);
    },
  };
});

const IoSparkles = (props) => GenIcon({
  tag: 'svg',
  attr: { viewBox: '0 0 512 512' },
  child: [{
    tag: 'path',
    attr: { d: 'M208 512a24.84 24.84 0 0 1-23.34-16l-39.84-103.6a16.06 16.06 0 0 0-9.19-9.19L32 343.34a25 25 0 0 1 0-46.68l103.6-39.84a16.06 16.06 0 0 0 9.19-9.19L184.66 144a25 25 0 0 1 46.68 0l39.84 103.6a16.06 16.06 0 0 0 9.19 9.19l103 39.63a25.49 25.49 0 0 1 16.63 24.1 24.82 24.82 0 0 1-16 22.82l-103.6 39.84a16.06 16.06 0 0 0-9.19 9.19L231.34 496A24.84 24.84 0 0 1 208 512zm66.85-254.84zM88 176a14.67 14.67 0 0 1-13.69-9.4l-16.86-43.84a7.28 7.28 0 0 0-4.21-4.21L9.4 101.69a14.67 14.67 0 0 1 0-27.38l43.84-16.86a7.31 7.31 0 0 0 4.21-4.21L74.16 9.79A15 15 0 0 1 86.23.11a14.67 14.67 0 0 1 15.46 9.29l16.86 43.84a7.31 7.31 0 0 0 4.21 4.21l43.84 16.86a14.67 14.67 0 0 1 0 27.38l-43.84 16.86a7.28 7.28 0 0 0-4.21 4.21l-16.86 43.84A14.67 14.67 0 0 1 88 176zm312 80a16 16 0 0 1-14.93-10.26l-22.84-59.37a8 8 0 0 0-4.6-4.6l-59.37-22.84a16 16 0 0 1 0-29.86l59.37-22.84a8 8 0 0 0 4.6-4.6l22.67-58.95a16.45 16.45 0 0 1 13.17-10.57 16 16 0 0 1 16.86 10.15l22.84 59.37a8 8 0 0 0 4.6 4.6l59.37 22.84a16 16 0 0 1 0 29.86l-59.37 22.84a8 8 0 0 0-4.6 4.6l-22.84 59.37A16 16 0 0 1 400 256z' },
    child: [],
  }],
})(props);

const SiDungeonsanddragons = (props) => GenIcon({
  tag: 'svg',
  attr: { role: 'img', viewBox: '0 0 24 24' },
  child: [{
    tag: 'path',
    attr: { d: 'M3.921 2.217C4.859 1.297 6.122.742 7.988.838c2.944.152 4.358 2.096 4.358 4.193 0 1.011-.536 2.363-1.276 3.323-.045-.044-.083-.087-.13-.131a21.28 21.28 0 00-.49-.436c-.484-.421-1.03-.905-1.397-1.426.807-1.413.346-3.414-1.359-3.414-.998 0-1.83.88-1.759 2.047-.26.552-.387 1.352-.337 2.062-.489-.295-.901-.618-1.095-1.067l-.626-1.445-.493 1.492a2.515 2.515 0 00-.088 1.135l-.01-.001a3.27 3.27 0 01-.555-1.57c-.18-1.908.764-2.964 1.19-3.383zm-.45 6.824c.114-.434-.778-1.173-1.11-1.311 1.224-.047 1.833.175 1.833.175-.32-.454-.423-1.146-.242-1.695.667 1.539 3.052 1.786 3.642 3.062-.084-.55-.625-1.169-1.253-1.53-.337-.838-.085-2.383.327-2.808-.145 2.22 3.149 3.49 3.832 5.105-.4-1.383-1.936-2.258-2.664-3.086-.24-.55-.056-1.48.205-1.799-.077 1.488 1.592 2.648 2.483 3.48 1.051.979 1.349 1.845 1.207 2.553.23.058.547.273.493.638.336-.075.677-.445.76-.673.165 1.104-.51 2.273-1.266 2.621 0 0 .203-.527-.141-.93-.34-.398-1.305-.403-1.631-.38 0 0 .4-.57.242-.86-.2-.357-2.087-.2-2.93.094.287-.03.967.044 1.205.14-.132.189-.478.989-.23 1.229.23.22.53-.162.53-.162s-.294.875-.082 1.078c.21.203.662.059.662.059-.281.687-1.379 1.16-2.146 1.16.274-.084.725-.553.795-.836-.2.097-.726.153-.928.117.248-.097.746-.712.592-1.405-.229-1.009-1.69-1.137-2.425-.649.238-.678.95-1.312 1.507-1.52a7.523 7.523 0 00-1.117-.273c.468-.369 1.642-.67 2.241-.639-.914-.225-2.586.057-3.352.927.245 0 .875.114 1.118.19-1.048.182-2.478 1.122-2.898 1.566.11-.584.28-1.08.136-1.43-.202-.497-.826-.704-2.07-.457.84-.809 2.56-1.31 2.676-1.751zm5.724.783c.166.563.39 1.08 1.097 1.08 0 0-.248-.779-1.097-1.08zm10.479 6.203c.533.088 1.282.635 1.282 1.417 0 1.275-1.652 1.667-2.566 1.469.97-.648.84-2.512-.326-3.178.395 1.045-.79 2.082-1.942 1.172-.641-.506-2.123-1.694-2.785-2.206-.66-.511-1.434-.214-1.74-.437-.348-.254-.125-.97-.6-1.236-.399-.222-.79-.098-1.253-.246-.42-.133-.733-.448-.68-.872-.178.303-.19.83.129 1.186.316.352.844.57 1.062.957.282.5-.193 1.196 1.062 2.143.6.452 1.53 1.195 2.137 1.707 1.021.862.476 1.94.61 2.879.155 1.096 1.072 1.704 1.682 1.858-.526-.46-.725-1.62.014-2.33.038.916.725 2.35 2.292 2.753 1.667.427 3.439-.482 3.807-1.122-.643.28-1.854-.022-2.353-.472 1.956.267 3.686-1.038 3.686-2.712 0-1.633-1.645-2.898-3.518-2.73zm-8.5.793c-.667 1.1-2.088 2.531-3.529 2.531-2.651 0-3.98-3.61-1.007-6.564a1.435 1.435 0 00-.4-.06c-.255 0-.504.064-.668.174l-1.168.776.264-1.432a2.14 2.14 0 01.093-.225c-.675.322-1.339.782-1.588 1.045L2.02 14.28l.122-1.703c.025-.133.054-.262.08-.385.06-.275.135-.618.089-.732a.214.214 0 00-.083-.091C1.68 11.775.177 13.055 0 14.936c0 0 .291-.395.544-.487.167-.062.313.017.153.487-.061.184-1.51 3.96 1.34 6.57 0 0-.312-.768-.124-1 .092-.114.212-.123.376.08.123.156.251.306.438.51.187.205.447.447.729.657.853.575 2.011 1.037 3.329 1.037 3.526 0 5.395-2.34 6.43-4.305a1.551 1.551 0 00-.155-.15 57.001 57.001 0 00-1.887-1.515zm1.91-2.884c.208.067.42.158.627.319.244.188.603.471.987.776.306-.65 1.009-2.003 2.097-3.204.98-1.08 2.69-1.184 3.588-.526.577-.502 2.569-.974 3.617-.687-.639-.668-1.996-1.564-3.496-1.564-1.237 0-1.936.583-2.113.32-.228-.336.837-.833.837-.833-1.46.058-2.523 1.711-2.966 1.505-.262-.12.395-.92.395-.92-1.336.746-2.455 2.328-2.688 3.291 1.229-1.448 3.614-2.486 5.166-2.267-2.629.122-4.891 2.276-6.05 3.79Z' },
    child: [],
  }],
})(props);

const MAP_SCALE = 1;
/** Touch pan moves the map farther per finger pixel on narrow viewports (feels less “heavy”). */
const MOBILE_PAN_SPEED = 1.38;
const MOBILE_WHEEL_PAN_MULT = 1.12;
const TUTORIAL_AUTOSCROLL_DURATION_MS = 16000;
const DESKTOP_OFFSETS = [0, 120, 220, 220, 120, 0, -120, -220, -220, -120];
const MOBILE_OFFSETS = [0, 45, 85, 85, 45, 0, -45, -85, -85, -45];

function getHorizontalOffset(index, isMobile) {
  const arr = isMobile ? MOBILE_OFFSETS : DESKTOP_OFFSETS;
  return arr[index % arr.length];
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

  const horizontalPadding = 0;
  /** Keep the map from being panned completely off-screen. */
  const minX = Math.min(0, W - w) - horizontalPadding;
  const maxX = Math.max(0, W - w) + horizontalPadding;

  // Clamp vertical movement by real section bounds + container padding,
  // so the first section can't disappear and the last section remains reachable.
  let contentTop = 0;
  let contentBottom = ch;
  const sectionEls = contentEl.querySelectorAll('.skyward-journey-section');
  if (sectionEls.length > 0) {
    let minTop = Number.POSITIVE_INFINITY;
    let maxBottom = Number.NEGATIVE_INFINITY;
    sectionEls.forEach((el) => {
      const t = el.offsetTop;
      const b = t + el.offsetHeight;
      if (Number.isFinite(t) && Number.isFinite(b)) {
        if (t < minTop) minTop = t;
        if (b > maxBottom) maxBottom = b;
      }
    });
    if (Number.isFinite(minTop) && Number.isFinite(maxBottom) && maxBottom > minTop) {
      contentTop = minTop;
      // Ensure we respect the overall container padding at the bottom
      contentBottom = Math.max(maxBottom, ch - 40); // 40 is a small safety offset
    }
  }

  // Provide breathing room so users can pan to both extremes
  // without clipping the first/last section against viewport edges.
  // Adaptive travel buffers keep first/last nodes fully visible across
  // different container heights and prevent edge clipping.
  const verticalTopBuffer = Math.max(80, Math.round(H * 0.16));
  const verticalBottomBuffer = Math.max(160, Math.round(H * 0.25));
  const boundedHeight = ((contentBottom + verticalBottomBuffer) - (contentTop - verticalTopBuffer)) * scale;
  let minY;
  let maxY;
  if (boundedHeight > H) {
    minY = H - ((contentBottom + verticalBottomBuffer) * scale);
    maxY = -((contentTop - verticalTopBuffer) * scale);
  } else {
    const boundedMid = (((contentTop - verticalTopBuffer) + (contentBottom + verticalBottomBuffer)) / 2) * scale;
    const centeredY = (H / 2) - boundedMid;
    minY = centeredY;
    maxY = centeredY;
  }

  return {
    tx: Math.min(maxX, Math.max(minX, tx)),
    ty: Math.min(maxY, Math.max(minY, ty)),
  };
}

function isStartNode(step, index) {
  return Number(step?.stageNumber) === 1 || Number(step?.task?.activity_order) === 1 || index === 0;
}

function isFinalStageStep(step) {
  const stageNumber = Number(step?.stageNumber ?? step?.task?.activity_order ?? step?.task?.activityOrder);
  const title = String(step?.title ?? step?.task?.title ?? '').toLowerCase();
  return stageNumber === 30 || title.includes('final boss') || title.includes('final stage');
}

function getTooltipTitle(step) {
  if (isFinalStageStep(step)) return 'Final Stage';
  const objective = String(step?.task?.objective ?? step?.objective ?? '').trim();
  return objective || step?.title || 'Lesson';
}

function getPhaseIcon(step) {
  const phase = getStepPhaseName(step).toLowerCase();
  switch (true) {
    case phase.includes('visual anchor'):
    case phase.includes('gaze'):
    case phase.includes('physical authority'):
    case phase.includes('gesture'):
      return 'gaze';
    case phase.includes('vocal'):
    case phase.includes('voice projection'):
    case phase.includes('pace control'):
      return 'vocal';
    case phase.includes('verbal'):
    case phase.includes('filler'):
    case phase.includes('simple translation'):
      return 'verbal';
    case phase.includes('sync'):
    case phase.includes('tone variation'):
    case phase.includes('multi'):
      return 'sync';
    case phase.includes('context'):
    case phase.includes('advanced'):
    case phase.includes('structured'):
    case phase.includes('framework'):
    case phase.includes('professional'):
    case phase.includes('persuasion'):
    case phase.includes('impromptu'):
    case phase.includes('storytelling'):
    case phase.includes('executive'):
      return 'context';
    default:
      return 'default';
  }
}

/**
 * Keyword-priority table: first matching keyword wins.
 * Order matters — more specific keywords appear before broader ones.
 */
const TITLE_ICON_KEYWORDS = [
  // Technology & Innovation → IoHardwareChip
  { kw: 'technical',        cat: 'chip' },
  { kw: 'tech ',            cat: 'chip' },
  { kw: 'eli5',             cat: 'chip' },
  { kw: 'ai',               cat: 'chip' },
  { kw: 'startup',          cat: 'chip' },
  { kw: 'mic failure',      cat: 'chip' },
  { kw: 'time traveler',    cat: 'chip' },
  { kw: 'filler limit',     cat: 'chip' },
  { kw: 'masterclass',      cat: 'chip' },

  // Visual & Body → IoEye
  { kw: 'visual',           cat: 'eye' },
  { kw: 'spatial',          cat: 'eye' },
  { kw: 'posture',          cat: 'eye' },
  { kw: 'gaze',             cat: 'eye' },
  { kw: 'gesture',          cat: 'eye' },
  { kw: 'facial',           cat: 'eye' },
  { kw: 'body sync',        cat: 'eye' },
  { kw: 'impeccable',       cat: 'eye' },
  { kw: 'taking up space',  cat: 'eye' },
  { kw: 'constant volume',  cat: 'eye' },
  { kw: 'physical control', cat: 'eye' },

  // Location & Campus → IoLocation
  { kw: 'commute',          cat: 'location' },
  { kw: 'room carry',       cat: 'location' },
  { kw: 'directional',      cat: 'location' },
  { kw: 'distance',         cat: 'location' },
  { kw: 'construction',     cat: 'location' },
  { kw: 'strict prioritization', cat: 'location' },

  // Logic & Process → IoList
  { kw: 'logic',            cat: 'list' },
  { kw: 'logical',          cat: 'list' },
  { kw: 'deliberate',       cat: 'list' },
  { kw: 'precision',        cat: 'list' },
  { kw: 'continuous process', cat: 'list' },
  { kw: 'balanced',         cat: 'list' },
  { kw: 'problem solution', cat: 'list' },
  { kw: 'explicit',         cat: 'list' },
  { kw: 'argumentation',    cat: 'list' },
  { kw: 'unbiased',         cat: 'list' },
  { kw: 'analogy',          cat: 'list' },
  { kw: 'nuanced',          cat: 'list' },
  { kw: 'urgent pitch',     cat: 'list' },
  { kw: 'actionable',       cat: 'list' },
  { kw: 'instant definition', cat: 'list' },
  { kw: 'ending discipline', cat: 'list' },
  { kw: 'no you knows',     cat: 'list' },

  // Academic & Career → IoSchool
  { kw: 'academic',         cat: 'school' },
  { kw: 'school context',   cat: 'school' },
  { kw: 'vocabulary',       cat: 'school' },
  { kw: 'instructional',    cat: 'school' },
  { kw: 'familiarity',      cat: 'school' },
  { kw: 'jargon',           cat: 'school' },
  { kw: 'core understanding', cat: 'school' },
  { kw: 'constructive',     cat: 'school' },
  { kw: 'accountable',      cat: 'school' },
  { kw: 'capstone',         cat: 'school' },
  { kw: 'defense',          cat: 'school' },
  { kw: 'reporting',        cat: 'school' },
  { kw: 'room filling',     cat: 'school' },
  { kw: 'first second',     cat: 'school' },
  { kw: 'respectful',       cat: 'school' },
  { kw: 'vocal confidence', cat: 'school' },
  { kw: 'firm projection',  cat: 'school' },

  // Identity & Social → IoPeople
  { kw: 'identity',         cat: 'people' },
  { kw: 'confidence projection', cat: 'people' },
  { kw: 'dynamic range',    cat: 'people' },
  { kw: 'firm authority',   cat: 'people' },
  { kw: 'group',            cat: 'people' },
  { kw: 'authority',        cat: 'people' },
  { kw: 'conviction',       cat: 'people' },
  { kw: 'leadership',       cat: 'people' },
  { kw: 'formal',           cat: 'people' },
  { kw: 'measured',         cat: 'people' },
  { kw: 'commanding',       cat: 'people' },
  { kw: 'controlled leadership', cat: 'people' },
  { kw: 'doubt',            cat: 'people' },
  { kw: 'choose me',        cat: 'people' },
  { kw: 'apology',          cat: 'people' },
  { kw: 'negotiation',      cat: 'people' },
  { kw: 'resolution',       cat: 'people' },
  { kw: 'advocacy',         cat: 'people' },
  { kw: 'objection',        cat: 'people' },
  { kw: 'crisis',           cat: 'people' },
  { kw: 'accountability',   cat: 'people' },
  { kw: 'limitation',       cat: 'people' },
  { kw: 'value prop',       cat: 'people' },
  { kw: 'pace maintenance', cat: 'people' },
  { kw: 'elder',            cat: 'people' },
  { kw: 'slang bridge',     cat: 'people' },
  { kw: 'behavioral',       cat: 'people' },
  { kw: 'definitive',       cat: 'people' },

  // Hobbies & Entertainment → IoPlayCircle
  { kw: 'hobby',            cat: 'play' },
  { kw: 'pitch mapping',    cat: 'play' },
  { kw: 'speed',            cat: 'play' },
  { kw: 'excited',          cat: 'play' },
  { kw: 'patient',          cat: 'play' },
  { kw: 'comedic',          cat: 'play' },
  { kw: 'intensity',        cat: 'play' },

  // Aspirations & Storytelling → IoSparkles
  { kw: 'story',            cat: 'sparkles' },
  { kw: 'narrative',        cat: 'sparkles' },
  { kw: 'expressive',       cat: 'sparkles' },
  { kw: 'imaginative',      cat: 'sparkles' },
  { kw: 'emotional',        cat: 'sparkles' },
  { kw: 'sincere',          cat: 'sparkles' },
  { kw: 'grateful',         cat: 'sparkles' },
  { kw: 'resilient',        cat: 'sparkles' },
  { kw: 'smooth recovery',  cat: 'sparkles' },
  { kw: 'strategic',        cat: 'sparkles' },
  { kw: 'relatable',        cat: 'sparkles' },
  { kw: 'surprise',         cat: 'sparkles' },
  { kw: 'simplicity',       cat: 'sparkles' },
  { kw: 'wild idea',        cat: 'sparkles' },
  { kw: 'zero prep',        cat: 'sparkles' },
  { kw: 'suspense',         cat: 'sparkles' },
  { kw: 'joyful',           cat: 'sparkles' },
  { kw: 'nervous habit',    cat: 'sparkles' },
  { kw: 'engagement',       cat: 'sparkles' },
  { kw: 'intelligent',      cat: 'sparkles' },
  { kw: 'brevity',          cat: 'sparkles' },
  { kw: 'timeless',         cat: 'sparkles' },
  { kw: 'embodying',        cat: 'sparkles' },
  { kw: 'excellence',       cat: 'sparkles' },
  { kw: 'warm',             cat: 'sparkles' },
  { kw: 'seamless',         cat: 'sparkles' },
  { kw: 'intentional',      cat: 'sparkles' },
  { kw: 'open presence',    cat: 'sparkles' },
  { kw: 'sustained',        cat: 'sparkles' },
  { kw: 'high-energy',      cat: 'sparkles' },

  // Daily Life & Routines → IoCafe
  { kw: 'sensory',          cat: 'cafe' },
  { kw: 'baseline',         cat: 'cafe' },
  { kw: 'tension',          cat: 'cafe' },
  { kw: 'stability check',  cat: 'cafe' },
  { kw: 'calm',             cat: 'cafe' },
  { kw: 'rhythmic',         cat: 'cafe' },
  { kw: 'banning',          cat: 'cafe' },
  { kw: 'fluency',          cat: 'cafe' },
  { kw: 'clean delivery',   cat: 'cafe' },
  { kw: 'clarity projection', cat: 'cafe' },
  { kw: 'internal pacing',  cat: 'cafe' },
  { kw: 'sequence',         cat: 'cafe' },
  { kw: 'continuity',       cat: 'cafe' },

  // Program Milestones → IoTrophy
  { kw: 'milestone',        cat: 'trophy' },
  { kw: 'boss',             cat: 'trophy' },
  { kw: 'final',            cat: 'trophy' },
];

const TITLE_ICON_MAP = {
  chip:     <IoHardwareChip />,
  eye:      <IoEye />,
  location: <IoLocation />,
  list:     <IoList />,
  school:   <IoSchool />,
  people:   <IoPeople />,
  play:     <IoPlayCircle />,
  sparkles: <IoSparkles />,
  cafe:     <IoCafe />,
  trophy:   <IoTrophy />,
};

function getStepTitleIcon(step) {
  const title = getStepActivityTitle(step).toLowerCase();

  for (let i = 0; i < TITLE_ICON_KEYWORDS.length; i++) {
    if (title.includes(TITLE_ICON_KEYWORDS[i].kw)) {
      return TITLE_ICON_MAP[TITLE_ICON_KEYWORDS[i].cat] ?? null;
    }
  }

  return null;
}

function JourneyNodeIcon({ step, index, className = '' }) {
  const iconClassName = `skyward-journey-node-icon ${className}`.trim();
  const isDone = step.nodeState === 'completed';

  const renderIcon = (IconComponent) => {
    return (
      <div className="skyward-journey-icon-stack" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        {React.cloneElement(IconComponent, {
          'aria-hidden': true,
          className: iconClassName
        })}
      </div>
    );
  };

  if (isStartNode(step, index)) return renderIcon(<IoStar />);

  const TitleIcon = getStepTitleIcon(step);
  if (TitleIcon) {
    return renderIcon(TitleIcon);
  }

  switch (getPhaseIcon(step)) {
    case 'gaze':
      return renderIcon(<IoEye />);
    case 'vocal':
      return renderIcon(<IoMic />);
    case 'verbal':
      return renderIcon(<IoChatbubbleEllipses />);
    case 'sync':
      return renderIcon(<IoSync />);
    case 'context':
      return renderIcon(<FaBrain />);
    default:
      return renderIcon(<IoCheckmarkCircle />);
  }
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
      return FaDragon;
    default:
      return GiGoblinHead;
  }
}

function getLevelSubtitle(level) {
  const parsed = Number(level);
  const found = BIGKAS_LEVELS.find((entry) => Number(entry.number) === parsed);
  return found?.name || 'Master your speaking fundamentals';
}

function getRankForLevel(level) {
  const parsed = Number(level);
  switch (parsed) {
    case 1:
      return { name: 'Bronze', image: rankBronzeImage };
    case 2:
      return { name: 'Silver', image: rankSilverImage };
    case 3:
      return { name: 'Gold', image: rankGoldImage };
    case 4:
      return { name: 'Mythril', image: rankMythrilImage };
    case 5:
      return { name: 'Legendary', image: rankLegendaryImage };
    default:
      return { name: 'Bronze', image: rankBronzeImage };
  }
}

/**
 * @param {object} props
 * @param {Array<{ id: string, nodeState: string, task?: object, title?: string }>} props.steps
 * @param {(step: object, meta: object) => React.ReactNode} props.renderStepContent
 * @param {boolean} [props.entranceFromNav] — play zoom-to-current-quest when navigating from side nav
 */

const MapHeaderCard = styled.div`
  width: min(100%, 520px);
  margin: 0 auto;
  box-sizing: border-box;
  padding: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.96) 100%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  text-align: center;
  box-shadow: 0 8px 22px rgba(11, 57, 84, 0.1);
  border: 1.5px solid rgba(241, 143, 1, 0.9);
  position: sticky;
  top: max(14px, env(safe-area-inset-top, 0px));
  z-index: 10;
  flex-shrink: 0;

  @media (max-width: 768px) {
    margin-top: -2rem;
    top: calc(64px + -2rem + env(safe-area-inset-top, 0px));
    z-index: 11;
  }
`;

const HeaderTitle = styled.h1`
  font-size: clamp(0.78rem, 0.74rem + 0.18vw, 0.9rem);
  font-weight: 800;
  color: #f18f01;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const HeaderRankBadge = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  margin-top: 2px;
`;

const HeaderRankSprite = styled.img`
  width: 30px;
  height: 30px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(11, 57, 84, 0.2));
`;

const HeaderRankWord = styled.span`
  font-size: 0.72rem;
  font-weight: 900;
  color: #059669;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
`;

const HeaderDescription = styled.p`
  font-size: clamp(0.64rem, 0.61rem + 0.1vw, 0.72rem);
  font-weight: 700;
  color: rgba(11, 57, 84, 0.6);
  margin: 0;
  line-height: 1.3;
`;

const HeaderProgressWrap = styled.div`
  width: min(100%, 240px);
  margin-top: 0;
`;

const HeaderProgressTrack = styled.div`
  width: 100%;
  height: 7px;
  border-radius: 999px;
  background: rgba(11, 57, 84, 0.12);
  overflow: hidden;
`;

const HeaderProgressFill = styled.div`
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f97316 0%, #fb923c 100%);
  transition: width 0.25s ease;
`;

const HeaderProgressText = styled.p`
  margin: 3px 0 0;
  color: #0b3954;
  font-size: clamp(0.56rem, 0.54rem + 0.05vw, 0.62rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-align: center;
`;

const HeaderSkipNotice = styled.div`
  width: min(100%, 640px);
  background: rgba(90, 120, 99, 0.12);
  color: #3c4952;
  border: 1px solid rgba(90, 120, 99, 0.35);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
`;

const TooltipBox = styled.div`
  background: ${(props) => (props.$nodeState === 'locked' ? '#ffffff' : (props.$themeColor || '#059669'))};
  color: ${(props) => (props.$nodeState === 'locked' ? '#333333' : '#ffffff')};
  padding: 24px;
  border-radius: 20px;
  border: ${(props) => (props.$nodeState === 'locked' ? '2px solid #e5e5e5' : '2px solid rgba(255, 255, 255, 0.1)')};
  width: min(380px, calc(100vw - 32px));
  box-sizing: border-box;
  max-height: min(70vh, 420px);
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  align-items: center;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);

  /* Pointer notch that points to the node */
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    z-index: 2;

    ${(props) =>
    props.$placement === 'bottom'
      ? `
      top: -16px;
      border-left: 16px solid transparent;
      border-right: 16px solid transparent;
      border-bottom: 16px solid ${props.$nodeState === 'locked' ? '#ffffff' : (props.$themeColor || '#059669')};
    `
      : `
      bottom: -16px;
      border-left: 16px solid transparent;
      border-right: 16px solid transparent;
      border-top: 16px solid ${props.$nodeState === 'locked' ? '#ffffff' : (props.$themeColor || '#059669')};
    `}

    @media (max-width: 768px) {
      display: none;
      content: none;
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
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-top: 8px; /* space for absolute close btn */
  max-width: 100%;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
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
const TOOLTIP_GAP = 24;
const TOOLTIP_MAX_WIDTH = 380;
const MOBILE_TOOLTIP_CENTER_BREAKPOINT = 768;
/** Conservative height for first layout; keeps bubble inside the viewport. */
const TOOLTIP_EST_HEIGHT = 280;

function computeTooltipLayout(nodeEl, forceBottom = false) {
  if (!nodeEl) return { left: 0, top: 0, transform: 'translate(-50%, -100%)', placement: 'top' };
  const rect = nodeEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const viewportWidth = Math.max(window.innerWidth || 0, document.documentElement?.clientWidth || 0);
  const viewportHeight = Math.max(window.innerHeight || 0, document.documentElement?.clientHeight || 0);
  const isMobileViewport = viewportWidth <= MOBILE_TOOLTIP_CENTER_BREAKPOINT;

  // Use window height for 25% calculation as requested
  const isTopArea = rect.top < viewportHeight * 0.25;

  let placement = (isTopArea || forceBottom) ? 'bottom' : 'top';
  const spaceAbove = rect.top - TOOLTIP_GAP - TOOLTIP_VIEW_MARGIN;
  const spaceBelow = viewportHeight - rect.bottom - TOOLTIP_GAP - TOOLTIP_VIEW_MARGIN;

  if (placement === 'bottom' && spaceBelow < TOOLTIP_EST_HEIGHT && spaceAbove > spaceBelow) {
    placement = 'top';
  } else if (placement === 'top' && spaceAbove < TOOLTIP_EST_HEIGHT && spaceBelow > spaceAbove) {
    placement = 'bottom';
  }

  let top = placement === 'bottom' ? rect.bottom + TOOLTIP_GAP : rect.top - TOOLTIP_GAP;
  
  // Clamping to ensure visibility within viewport
  const minTop = placement === 'top'
    ? Math.min(viewportHeight - TOOLTIP_VIEW_MARGIN, TOOLTIP_VIEW_MARGIN + TOOLTIP_EST_HEIGHT)
    : TOOLTIP_VIEW_MARGIN;
  const maxTop = placement === 'bottom'
    ? Math.max(TOOLTIP_VIEW_MARGIN, viewportHeight - TOOLTIP_VIEW_MARGIN - TOOLTIP_EST_HEIGHT)
    : viewportHeight - TOOLTIP_VIEW_MARGIN;
  
  top = Math.max(minTop, Math.min(maxTop, top));

  const tooltipWidth = Math.min(TOOLTIP_MAX_WIDTH, Math.max(0, viewportWidth - (TOOLTIP_VIEW_MARGIN * 2)));
  const halfTooltipWidth = tooltipWidth / 2;
  const preferredLeft = isMobileViewport ? (viewportWidth / 2) : cx;
  const navEl = !isMobileViewport
    ? document.querySelector('aside[aria-label="Main navigation"], [role="complementary"][aria-label="Main navigation"]')
    : null;
  const navRect = navEl?.getBoundingClientRect();
  const visibleLeftEdge = navRect && navRect.left <= TOOLTIP_VIEW_MARGIN && navRect.right > TOOLTIP_VIEW_MARGIN
    ? navRect.right
    : 0;
  const minLeft = Math.max(
    TOOLTIP_VIEW_MARGIN + halfTooltipWidth,
    visibleLeftEdge + TOOLTIP_VIEW_MARGIN + halfTooltipWidth,
  );
  const maxLeft = Math.max(minLeft, viewportWidth - TOOLTIP_VIEW_MARGIN - halfTooltipWidth);
  const left = Math.max(minLeft, Math.min(maxLeft, preferredLeft));

  const transform = placement === 'bottom' ? 'translateX(-50%)' : 'translate(-50%, -100%)';

  return { left, top, transform, placement };
}

export const JourneyTooltip = ({ step, themeColor, onStart, onClose, nodeRef, forceBottom = false }) => {
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
  }, [nodeRef, step.id, forceBottom]);

  const isLocked = step.nodeState === 'locked';

  if (!layout) {
    return null;
  }

  const frameStyle = {
    maxWidth: 'min(30rem, calc(100vw - 24px))',
    width: '100%',
    transformOrigin: layout.placement === 'bottom' ? 'top center' : 'bottom center',
  };

  const tooltipContent = (
    <TooltipBox $placement={layout.placement} $nodeState={step.nodeState} $themeColor={themeColor}>
      <TooltipCloseBtn
        $nodeState={step.nodeState}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <IoClose />
      </TooltipCloseBtn>
      <TooltipTitle title={getTooltipTitle(step)}>
        {getTooltipTitle(step)}
      </TooltipTitle>
      <TooltipDescription $nodeState={step.nodeState}>
        {isLocked
          ? 'Finish previous stages to unlock!'
          : ''}
      </TooltipDescription>
      <TooltipStartButton
        type="button"
        $nodeState={step.nodeState}
        disabled={isLocked}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isLocked) onStart(step);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {isLocked
          ? 'LOCKED'
          : step.nodeState === NODE_STATE.ACTIVE
            ? 'CONTINUE'
            : step.nodeState === NODE_STATE.COMPLETED
              ? 'REVIEW'
              : 'START'}
      </TooltipStartButton>
    </TooltipBox>
  );

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
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <React.Suspense fallback={<div style={frameStyle}>{tooltipContent}</div>}>
        <MotionTooltipFrame
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          style={frameStyle}
        >
          {tooltipContent}
        </MotionTooltipFrame>
      </React.Suspense>
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
  let s = String(raw).trim();
  // Strip "Module 01: " prefix if present
  s = s.replace(/^Module\s+\d+:\s*/i, '');
  return s || 'Training';
}

/** Node row primary label: `public.activities.title` */
function getStepActivityTitle(step) {
  const raw = step?.title ?? step?.task?.title ?? '';
  let s = String(raw).trim();
  // Strip "Stage 01: " prefix if present
  s = s.replace(/^Stage\s+\d+:\s*/i, '');
  return s || String(step?.id ?? 'Activity');
}

export default function SkywardJourney({
  steps,
  groupedTasks,
  renderStepContent,
  entranceFromNav = false,
  scrollToStepIndex = null,
  autoScrollPreview = false,
  currentLevel = 1,
  recommendedLevel = 1,
  isPrevLevelDone = true,
  onLevelChange,
}) {
  const rank = useMemo(() => getRankForLevel(currentLevel), [currentLevel]);
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
  const tutorialAutoScrollRef = useRef(null);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeIndex = useMemo(
    () => steps.findIndex((s) => s.nodeState === NODE_STATE.ACTIVE),
    [steps],
  );
  
  // A level is locked if the user's progress hasn't reached it yet.
  const isLockedLevel = useMemo(() => {
    const curr = Number(currentLevel) || 1;
    const rec = Number(recommendedLevel) || 1;
    return curr > rec;
  }, [currentLevel, recommendedLevel]);

  /** When the previous journey’s final stage is not done yet. */
  const prerequisiteLines = useMemo(() => {
    const level = Number(currentLevel) || 1;
    const needsPrevJourneyComplete = level > 1 && !isPrevLevelDone;
    if (!needsPrevJourneyComplete) return [];

    return [
      {
        key: 'finish-previous-journey',
        text: `Complete every stage in Journey ${level - 1} before you can progress on Journey ${level}.`,
      },
    ];
  }, [currentLevel, isPrevLevelDone]);

  const completedCount = useMemo(() => steps.filter(s => s.nodeState === NODE_STATE.COMPLETED).length, [steps]);

  const [pathPoints, setPathPoints] = useState([]);
  const [indexedNodePoints, setIndexedNodePoints] = useState([]);
  const [panelOpenId, setPanelOpenId] = useState(null);
  const [jiggleIndex, setJiggleIndex] = useState(null);
  // removed showTapHint
  const [map, setMap] = useState(() => ({ tx: 0, ty: 0 }));
  const [tooltipNodeId, setTooltipNodeId] = useState(null);
  /** Disables CSS transform transition on the map layer while the user is dragging (mobile felt laggy). */
  const [mapLayerDragActive, setMapLayerDragActive] = useState(false);

  useLayoutEffect(() => {
    mapRef.current = map;
  }, [map]);

  // Removed map reset effect for locked levels to allow persistent centering logic.

  const requestClosePanel = useCallback(() => {
    setPanelOpenId(null);
  }, []);

  const recomputePath = useCallback(() => {
    const content = mapContentRef.current;
    if (!content || steps.length < 2) {
      if (indexedNodePoints.length !== 0) setIndexedNodePoints([]);
      setPathPoints([]);
      return;
    }

    const cr = content.getBoundingClientRect();
    if (!cr.width || !cr.height) {
      if (indexedNodePoints.length !== 0) setIndexedNodePoints([]);
      setPathPoints([]);
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
      const x = centerX + getHorizontalOffset(i, isMobile);
      indexed[i] = { x, y };
    }

    setIndexedNodePoints(indexed);

    const pts = indexed.filter((p) => p != null);
    if (pts.length < 2) {
      setPathPoints([]);
      return;
    }

    setPathPoints(pts);
  }, [steps.length, indexedNodePoints.length, isMobile]);

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
    const lastCompletedIndex = (() => {
      for (let i = steps.length - 1; i >= 0; i -= 1) {
        if (steps[i]?.nodeState === NODE_STATE.COMPLETED) return i;
      }
      return -1;
    })();
    const targetIndex =
      scrollToStepIndex != null && scrollToStepIndex >= 0 
        ? scrollToStepIndex 
        : (activeIndex >= 0 ? activeIndex : (lastCompletedIndex >= 0 ? lastCompletedIndex : 0));
    
    // Always proceed if steps exist
    if (steps.length === 0) return undefined;

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
      const nodeCenterX = (content.clientWidth / 2) + getHorizontalOffset(targetIndex, isMobile);

      // We want the node exactly at the focus point (32% from the top of the screen)
      const focusScreenY = vp.clientHeight * 0.32;
      const targetTy = focusScreenY - (nodeCenterY * MAP_SCALE);
      const targetTx = (vp.clientWidth / 2) - (nodeCenterX * MAP_SCALE);

      setMap(clampMapState({ tx: targetTx, ty: targetTy }, vp, content, MAP_SCALE));
    }, delay);

    return () => {
      window.clearTimeout(t);
    };
  }, [activeIndex, entranceFromNav, scrollToStepIndex, isMobile, steps]);

  /** Wheel pans map vertically while preserving current zoom scale. */
  useEffect(() => {
    const vp = viewportRef.current;
    const content = mapContentRef.current;
    if (!vp || !content) return undefined;

    const onWheel = (e) => {
      if (panelOpenId) return;
      const dominantDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(dominantDelta) < 0.5) return;
      const wheelMult =
        (typeof window !== 'undefined' && window.innerWidth <= 768 ? MOBILE_WHEEL_PAN_MULT : 1) * 0.8;
      const panStep = dominantDelta * wheelMult;
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
  }, [panelOpenId, isLockedLevel]);

  useEffect(() => {
    if (!autoScrollPreview || panelOpenId || pathPoints.length < 2) return undefined;
    const vp = viewportRef.current;
    const content = mapContentRef.current;
    if (!vp || !content) return undefined;

    if (tutorialAutoScrollRef.current) {
      window.cancelAnimationFrame(tutorialAutoScrollRef.current);
      tutorialAutoScrollRef.current = null;
    }

    const start = mapRef.current;
    const lastPoint = pathPoints[pathPoints.length - 1];
    const target = clampMapState(
      {
        tx: start.tx,
        ty: (vp.clientHeight * 0.62) - (lastPoint.y * MAP_SCALE),
      },
      vp,
      content,
      MAP_SCALE,
    );

    if (Math.abs(target.ty - start.ty) < 1) return undefined;

    const layer = mapLayerRef.current;
    let lastStateSync = 0;
    const startTime = performance.now();
    const animate = (now) => {
      const progress = Math.min(1, (now - startTime) / TUTORIAL_AUTOSCROLL_DURATION_MS);
      const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
      const next = clampMapState(
        {
          tx: start.tx + ((target.tx - start.tx) * eased),
          ty: start.ty + ((target.ty - start.ty) * eased),
        },
        vp,
        content,
        MAP_SCALE,
      );

      mapRef.current = next;
      if (layer) {
        layer.style.transform = `translate3d(${next.tx}px, ${next.ty}px, 0) scale(${MAP_SCALE})`;
        layer.style.willChange = 'transform';
      }

      if (now - lastStateSync > 650 || progress >= 1) {
        lastStateSync = now;
        setMap(next);
      }

      if (progress < 1) {
        tutorialAutoScrollRef.current = window.requestAnimationFrame(animate);
      } else {
        tutorialAutoScrollRef.current = null;
        if (layer) {
          layer.style.removeProperty('will-change');
        }
      }
    };

    tutorialAutoScrollRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (tutorialAutoScrollRef.current) {
        window.cancelAnimationFrame(tutorialAutoScrollRef.current);
        tutorialAutoScrollRef.current = null;
      }
      if (layer) {
        layer.style.removeProperty('will-change');
      }
      setMap(mapRef.current);
    };
  }, [autoScrollPreview, panelOpenId, pathPoints]);

  const onPointerDownViewport = useCallback(
    (e) => {
      if (panelOpenId) return;
      if (pinchRef.current) return;
      if (tooltipNodeId) setTooltipNodeId(null);
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const t = e.target;
      const m = mapRef.current;
      pointerPanRef.current = {
        pid: e.pointerId,
        sx: e.clientX,
        sy: e.clientY,
        tx: m.tx,
        ty: m.ty,
      };
      setMapLayerDragActive(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [panelOpenId, tooltipNodeId, isLockedLevel],
  );

  const onPointerMoveViewport = useCallback((e) => {
    // Removed isLockedLevel restriction to allow users to view locked maps.
    const p = pointerPanRef.current;
    if (!p || p.pid !== e.pointerId) return;
    let dy = e.clientY - p.sy;
    if (isMobile && e.pointerType === 'touch') {
      dy *= MOBILE_PAN_SPEED;
    }
    const vp = viewportRef.current;
    const content = mapContentRef.current;
    if (!vp || !content) return;
    setMap((m) =>
      clampMapState({ ...m, ty: p.ty + dy }, vp, content, MAP_SCALE),
    );
  }, [isLockedLevel, isMobile]);

  const onPointerUpViewport = useCallback((e) => {
    const p = pointerPanRef.current;
    if (!p || p.pid !== e.pointerId) return;
    pointerPanRef.current = null;
    setMapLayerDragActive(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onTouchStartPinch = useCallback((e) => {
    // Removed isLockedLevel restriction to allow users to view locked maps.
    if (e.touches.length === 2) {
      pointerPanRef.current = null;
      setMapLayerDragActive(false);
      pinchRef.current = { active: true };
    }
  }, [isLockedLevel]);

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
        if (tooltipNodeId) setTooltipNodeId(null);
        setJiggleIndex(index);
        window.setTimeout(() => setJiggleIndex(null), 520);
        return;
      }

      const sid = String(step.id);

      if (String(tooltipNodeId) === sid) {
        setTooltipNodeId(null);
        return;
      }
      if (String(panelOpenId) === sid) {
        requestClosePanel();
        return;
      }

      if (panelOpenId != null) {
        requestClosePanel();
      }

      setTooltipNodeId(step.id);
    },
    [panelOpenId, tooltipNodeId, requestClosePanel],
  );

  const selectedStep = useMemo(
    () => (panelOpenId ? steps.find((s) => String(s.id) === String(panelOpenId)) : null),
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

  const selectedPassingRateText = useMemo(() => {
    const rawPassingScore = selectedStep?.task?.passingScore ?? selectedStep?.task?.passing_score;
    return formatPassingScore(rawPassingScore);
  }, [selectedStep]);

  const sections = [];
  const sectionMeta = [];

  const totalStageCount = steps.length;
  let globalNodeIndex = 0;

  if (groupedTasks && groupedTasks.length > 0) {
    groupedTasks.forEach((section) => {
      const rawTitle = section.phaseName || 'Training';
      const sectionTitle = rawTitle.replace(/^Module\s+\d+:\s*/i, '');
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
        const isStage30 = Number(step.stageNumber) === 30 || Number(step.task?.activity_order) === 30;

        // The Ultimate Boss (Circle/Ghost) is ONLY at the end of Level 5
        const isUltimateBoss = (isGlobalEnd || isStage30) && currentLevel === 5;

        // A Level End (Square/Monster) triggers if it's Stage 30 of Levels 1-4, OR if the next step jumps to a new level
        const isLevelEnd = !isUltimateBoss && (isStage30 || (!nextStep || nextLevel !== currentLevel));
        const isCompletedJourneyTrophy = (isUltimateBoss || isLevelEnd) && isDone;

        const BossMonsterIcon = getBossMonsterIcon(currentLevel);
        const startStage = sectionTaskIndex === 0;
        const jiggle = jiggleIndex === i;
        const horizontalOffset = getHorizontalOffset(i, isMobile);
        let labelSide = 'right';
        if (horizontalOffset > 0) {
          labelSide = 'left';
        } else if (horizontalOffset < 0) {
          labelSide = 'right';
        } else {
          labelSide = i % 2 === 0 ? 'right' : 'left';
        }

        return (
          <div
            key={step.id}
            className={`skyward-journey-row${(isUltimateBoss || isLevelEnd) ? ' skyward-journey-row--milestone' : ''} dashboard-anim-bottom`}
            style={{
              position: 'relative',
              zIndex: isActive ? 320 : ((startStage && !isDone) ? 260 : 1),
            }}
          >
            <div className="skyward-journey-track">
              <div
                className={`skyward-journey-node-shell${i === 0 && isActive ? ' skyward-journey-node-shell--start-onboarding' : ''
                  }`}
                style={{ zIndex: isActive ? 140 : (startStage ? 120 : 10), position: 'relative' }}
              >
                <div
                  className={`skyward-journey-node-cluster${isUltimateBoss ? ' skyward-journey-node-cluster--boss' : ''}`}
                  style={{
                    transform: `translateX(${horizontalOffset}px)`,
                  }}
                >
                  {(isUltimateBoss || isLevelEnd) ? (
                    <div className="skyward-journey-start-callout" aria-hidden>
                      <span className={`skyward-journey-start-badge${isCompletedJourneyTrophy ? ' skyward-journey-start-badge--trophy' : ''}`}>
                        {isCompletedJourneyTrophy ? 'TROPHY' : 'BOSS'}
                      </span>
                    </div>
                  ) : startStage && !isDone && !isActive && !isLockedLevel ? (
                    <div className="skyward-journey-start-callout" aria-hidden>
                      <span className="skyward-journey-start-badge">START</span>
                    </div>
                  ) : null}
                  {isActive ? (
                    <div className="skyward-journey-current-callout" aria-hidden>
                      <span className="skyward-journey-current-badge">YOU ARE HERE</span>
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
                      isCompletedJourneyTrophy ? 'skyward-journey-node--trophy' : '',
                      jiggle ? 'skyward-journey-node--jiggle' : '',
                      !isLocked ? 'skyward-journey-node--unlocked' : '',
                      isLocked ? 'skyward-journey-node--locked-teaser' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-current={isActive ? 'step' : undefined}
                    aria-expanded={String(panelOpenId) === String(step.id) || String(tooltipNodeId) === String(step.id)}
                    aria-label={`${isUltimateBoss ? 'Milestone: ' : ''}${theme.shortLabel}: ${title}. ${isDone ? 'Completed' : isLocked ? 'Locked' : 'Current step'
                      }. Open quest details.`}
                    onClick={() => handleNodeClick(step, i)}
                    onPointerDown={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    style={undefined}
                  >
                    {isCompletedJourneyTrophy ? (
                      <img
                        src={getTrophyImageUrl(currentLevel)}
                        alt=""
                        className="skyward-journey-node-icon skyward-journey-node-icon--trophy-chest"
                        width="56"
                        height="56"
                        aria-hidden
                      />
                    ) : isUltimateBoss ? (
                      <FaGhost
                        className="skyward-journey-node-icon skyward-journey-node-icon--boss"
                        aria-hidden
                      />
                    ) : isLevelEnd ? (
                      <BossMonsterIcon
                        className="skyward-journey-node-icon skyward-journey-node-icon--boss"
                        aria-hidden
                      />
                    ) : startStage ? (
                      <IoStar
                        className="skyward-journey-node-icon"
                        aria-hidden
                      />
                    ) : (
                      <JourneyNodeIcon step={step} index={i} />
                    )}
                  </SkywardJourneyNodeButton>
                  {tooltipNodeId === step.id && (
                    <JourneyTooltip
                      key={step.id}
                      step={step}
                      onStart={() => {
                        setTooltipNodeId(null);
                        if (step.onActivate) step.onActivate();
                        else setPanelOpenId(step.id);
                      }}
                      onClose={() => setTooltipNodeId(null)}
                      nodeRef={{ get current() { return nodeRefs.current[i]; } }}
                      themeColor={
                        step.nodeState === 'active' 
                          ? '#f18f01' 
                          : step.nodeState === 'completed' 
                            ? '#10b981' 
                            : '#ffffff'
                      }
                      forceBottom={i >= steps.length - 2}
                    />
                  )}
                  <div
                    className={`level-label level-label--side-${labelSide}`}
                    aria-hidden
                  >
                    <span className="level-label__title">
                      {isUltimateBoss ? 'Summit' : title}
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
          data-pillar-text={`${sectionTitle}`}
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
    ? getStepPhaseName(initialStep)
    : 'General';
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
    <div className="skyward-journey-wrap" style={{ position: 'relative', width: '100%' }}>
      <div
        className={`skyward-journey skyward-journey-container no-scrollbar${steps.length === 0 ? ' skyward-journey-container--locked' : ''}`}
        ref={rootRef}
      >
        <MapHeaderCard
          className="skyward-journey-anim-header skyward-journey-header-card"
          style={{ cursor: 'default' }}
        >
          <div className="skyward-journey-header-title-row">
            <HeaderTitle>{steps.length > 0 ? currentPillarText : `Journey ${currentLevel}`}</HeaderTitle>
          </div>
          <HeaderRankBadge>
            <HeaderRankWord>JOURNEY {currentLevel}</HeaderRankWord>
          </HeaderRankBadge>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', width: '100%', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onLevelChange && onLevelChange(Math.max(1, currentLevel - 1));
              }}
              disabled={currentLevel <= 1}
              style={{
                height: '40px',
                minHeight: '40px',
                padding: isMobile ? '0 12px' : '0 14px',
                borderRadius: '999px',
                border: 'none',
                background: currentLevel <= 1 ? '#e5e5e5' : '#059669',
                color: currentLevel <= 1 ? '#a1a1aa' : '#fff',
                cursor: currentLevel <= 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 500,
                fontSize: isMobile ? '0.74rem' : '0.8rem',
                boxShadow: currentLevel <= 1 ? 'none' : '#047857 0 5px 0 0',
                flexShrink: 0,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              Prev
            </button>
            <div style={{ flex: 1, background: 'rgba(11, 57, 84, 0.06)', borderRadius: '10px', padding: '6px 10px' }}>
              <HeaderDescription>{getLevelSubtitle(currentLevel)}</HeaderDescription>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onLevelChange && onLevelChange(Math.min(5, currentLevel + 1));
              }}
              disabled={currentLevel >= 5}
              style={{
                height: '40px',
                minHeight: '40px',
                padding: isMobile ? '0 12px' : '0 14px',
                borderRadius: '999px',
                border: 'none',
                background: currentLevel >= 5 ? '#e5e5e5' : '#059669',
                color: currentLevel >= 5 ? '#a1a1aa' : '#fff',
                cursor: currentLevel >= 5 ? 'not-allowed' : 'pointer',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 500,
                fontSize: isMobile ? '0.74rem' : '0.8rem',
                boxShadow: currentLevel >= 5 ? 'none' : '#047857 0 5px 0 0',
                flexShrink: 0,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              Next
            </button>
          </div>

          {!isLockedLevel && steps.length > 0 ? (
            <HeaderProgressWrap>
              <HeaderProgressTrack>
                <HeaderProgressFill
                  style={{
                    width: `${Math.max(0, Math.min(100, (completedCount / Math.max(steps.length, 1)) * 100))}%`,
                  }}
                />
              </HeaderProgressTrack>
              <HeaderProgressText>{completedCount} / {steps.length} Stages Completed</HeaderProgressText>
            </HeaderProgressWrap>
          ) : isLockedLevel ? (
            <HeaderProgressWrap style={{ opacity: 0.85, padding: '4px 0' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                color: '#64748b', 
                fontWeight: 700, 
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <IoLockClosed style={{ fontSize: '1rem', color: '#94a3b8' }} />
                <span>Journey Locked</span>
              </div>
            </HeaderProgressWrap>
          ) : null}
        </MapHeaderCard>
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
              className={`skyward-journey-map-layer${mapLayerDragActive ? ' skyward-journey-map-layer--dragging' : ''}`}
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
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset={`${pathFillPercentage}%`} stopColor="#10b981" />
                          <stop offset={`${pathFillPercentage}%`} stopColor="#d1d5db" />
                          <stop offset="100%" stopColor="#d1d5db" />
                        </linearGradient>
                      </defs>
                      <path
                        className="skyward-journey-polyline skyward-journey-polyline--rim"
                        fill="none"
                        d={solidPathD}
                        stroke="#e5e7eb"
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
                  {steps.length > 0 && sections}
                </div>
              </div>
            </div>
          </div>
        </div>

        {prerequisiteLines.length > 0 && steps.length > 0 ? (
          <div
            className="skyward-journey-prerequisite-banner"
            role="region"
            aria-label="Prerequisites for this journey"
          >
            <div className="skyward-journey-prerequisite-banner-inner">
              <div className="skyward-journey-prerequisite-body">
                <div className="skyward-journey-prerequisite-title-row">
                  <img
                    src={BIGKAS_PREREQ_LOGO_URL}
                    alt=""
                    className="skyward-journey-prerequisite-logo"
                  />
                  <p className="skyward-journey-prerequisite-title">Before you start this journey</p>
                </div>
                <ul className="skyward-journey-prerequisite-list">
                  {prerequisiteLines.map((line) => (
                    <li key={line.key}>{line.text}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {typeof document !== 'undefined' && selectedStep
          ? createPortal(
              <div className="skyward-journey-panel-root">
                <div 
                  className="bigkas-modal-scrim"
                  onClick={closePanel}
                  aria-hidden="true"
                  style={{ '--scrim-z': 1100 }}
                />
                
                <div
                  ref={drawerRef}
                  className="skyward-journey-overlay-content"
                >
                  <div className="randomizer-overlay-card">
                    <div className="randomizer-overlay-card-top">
                      <h2 className="randomizer-overlay-title">Quest details</h2>
                      <button
                        type="button"
                        className="randomizer-overlay-close-btn"
                        onClick={closePanel}
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>
                    
                    <div className="skyward-journey-overlay-inner-body">
                      <p className="randomizer-overlay-copy">
                        <span className="randomizer-overlay-copy-kicker">
                          <img
                            src={BIGKAS_PREREQ_LOGO_URL}
                            alt=""
                            className="randomizer-overlay-copy-kicker-logo"
                            aria-hidden="true"
                            decoding="async"
                          />
                          B-01
                        </span>
                        <span className="randomizer-overlay-copy-lead">
                          Ready for your next stage? Here is what we’ll focus on:
                        </span>{' '}
                        <strong>{selectedStep?.title || 'General Speaking'}</strong>
                      </p>

                      {selectedStep?.task?.purpose && (
                        <div className="skyward-journey-purpose-box">
                          <span className="skyward-journey-purpose-label">B-01's Purpose:</span>
                          <p className="skyward-journey-purpose-text">{selectedStep.task.purpose}</p>
                        </div>
                      )}

                      {selectedPassingRateText && (
                        <div className="skyward-journey-passing-rate-box">
                          <span className="skyward-journey-passing-rate-label">Passing rate:</span>
                          <span className="skyward-journey-passing-rate-value">{selectedPassingRateText}</span>
                        </div>
                      )}
                      
                      <div className="randomizer-overlay-topic">
                        <span className="randomizer-overlay-topic-label">Topic:</span>
                        {' '}
                        {selectedStep?.task?.detail || selectedStep?.task?.objective || 'Ready to start your next challenge?'}
                      </div>

                      <div className="skyward-journey-overlay-task-inject">
                        {selectedStep && renderStepContent?.(selectedStep, selectedMeta)}
                      </div>
                    </div>
                  </div>

                  <div className="randomizer-overlay-robot-wrap">
                    <img 
                      src={getSpriteUrl('Robot/0002.webp')} 
                      alt="" 
                      className="randomizer-overlay-robot"
                      aria-hidden="true"
                    />
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

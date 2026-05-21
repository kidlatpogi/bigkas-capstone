import { getSpriteUrl } from './assetUtils';
import { getTrophyImageUrl } from './trophyClaims';

const JOURNEY_1_BADGE_URLS_BY_STAGE = Object.freeze({
  1: getSpriteUrl('Badges/Journey%201/First%20Words.png'),
  5: getSpriteUrl('Badges/Journey%201/Logical%20Thinker.webp'),
  10: getSpriteUrl('Badges/Journey%201/The%20Comfor%20Zone.webp'),
  15: getSpriteUrl('Badges/Journey%201/Rule%20of%20Three.webp'),
  20: getSpriteUrl('Badges/Journey%201/Pacesetter.webp'),
  25: getSpriteUrl('Badges/Journey%201/Humble%20Brag.webp'),
  30: getTrophyImageUrl(1),
});

const JOURNEY_2_BADGE_URLS_BY_STAGE = Object.freeze({
  1: getSpriteUrl('Badges/Journey%202/Room%20Filler.webp'),
  5: getSpriteUrl('Badges/Journey%202/Vocal%20Architect.webp'),
  10: getSpriteUrl('Badges/Journey%202/Unbroken%20Chain.webp'),
  15: getSpriteUrl('Badges/Journey%202/Grace%20Under%20Pressure.webp'),
  20: getSpriteUrl('Badges/Journey%202/The%20Steady%20Tour%20Guide.webp'),
  25: getSpriteUrl('Badges/Journey%202/Heartfelt%20Speaker.webp'),
  30: getTrophyImageUrl(2),
});

const JOURNEY_3_BADGE_URLS_BY_STAGE = Object.freeze({
  1: getSpriteUrl('Badges/Journey%203/The%20Sound%20of%20Silence.webp'),
  5: getSpriteUrl('Badges/Journey%203/Smooth%20Recovery.webp'),
  10: getSpriteUrl('Badges/Journey%203/Clean%20Communicator.webp'),
  15: getSpriteUrl('Badges/Journey%203/The%20Storyteller.webp'),
  20: getSpriteUrl('Badges/Journey%203/Empathetic%20Explainer.webp'),
  25: getSpriteUrl('Badges/Journey%203/The%20Debater.webp'),
  30: getTrophyImageUrl(3),
});

const JOURNEY_4_BADGE_URLS_BY_STAGE = Object.freeze({
  1: getSpriteUrl('Badges/Journey%204/Unwavering%20Focus.webp'),
  5: getSpriteUrl('Badges/Journey%204/Commanding%20Presence.webp'),
  10: getSpriteUrl('Badges/Journey%204/Absolute%20Certainty.webp'),
  15: getSpriteUrl('Badges/Journey%204/Measured%20Emotion.webp'),
  20: getSpriteUrl('Badges/Journey%204/The%20Embodiment%20of%20Excellence.webp'),
  25: getSpriteUrl('Badges/Journey%204/The%20Diplomat.webp'),
  30: getTrophyImageUrl(4),
});

const JOURNEY_5_BADGE_URLS_BY_STAGE = Object.freeze({
  1: getSpriteUrl('Badges/Jpurney%205/Quick%20Thinker.webp'),
  5: getSpriteUrl('Badges/Jpurney%205/The%20Ultimate%20Advocate.webp'),
  10: getSpriteUrl('Badges/Jpurney%205/The%20Fade%20Master.webp'),
  15: getSpriteUrl('Badges/Jpurney%205/The%20Executive%20Brief.webp'),
  20: getSpriteUrl('Badges/Jpurney%205/Transparent%20Leader.webp'),
  25: getSpriteUrl('Badges/Jpurney%205/Honest%20Problem%20Solver.webp'),
  30: getTrophyImageUrl(5),
});

const JOURNEY_BADGE_URLS_BY_STAGE = Object.freeze({
  1: JOURNEY_1_BADGE_URLS_BY_STAGE,
  2: JOURNEY_2_BADGE_URLS_BY_STAGE,
  3: JOURNEY_3_BADGE_URLS_BY_STAGE,
  4: JOURNEY_4_BADGE_URLS_BY_STAGE,
  5: JOURNEY_5_BADGE_URLS_BY_STAGE,
});

const JOURNEY_STAGE_BY_NAME = new Map([
  ['first words', { journey: 1, stage: 1 }],
  ['logical thinker', { journey: 1, stage: 5 }],
  ['the comfort zone', { journey: 1, stage: 10 }],
  ['rule of three', { journey: 1, stage: 15 }],
  ['pacesetter', { journey: 1, stage: 20 }],
  ['humble brag', { journey: 1, stage: 25 }],
  ['the unbroken minute', { journey: 1, stage: 30 }],
  ['room filler', { journey: 2, stage: 1 }],
  ['vocal architect', { journey: 2, stage: 5 }],
  ['unbroken chain', { journey: 2, stage: 10 }],
  ['grace under pressure', { journey: 2, stage: 15 }],
  ['the steady tour guide', { journey: 2, stage: 20 }],
  ['heartfelt speaker', { journey: 2, stage: 25 }],
  ['the vocal conductor', { journey: 2, stage: 30 }],
  ['the sound of silence', { journey: 3, stage: 1 }],
  ['smooth recovery', { journey: 3, stage: 5 }],
  ['clean communicator', { journey: 3, stage: 10 }],
  ['the storyteller', { journey: 3, stage: 15 }],
  ['empathetic explainer', { journey: 3, stage: 20 }],
  ['the debater', { journey: 3, stage: 25 }],
  ['the flawless timeline', { journey: 3, stage: 30 }],
  ['unwavering focus', { journey: 4, stage: 1 }],
  ['commanding presence', { journey: 4, stage: 5 }],
  ['absolute certainty', { journey: 4, stage: 10 }],
  ['measured emotion', { journey: 4, stage: 15 }],
  ['the embodiment of excellence', { journey: 4, stage: 20 }],
  ['the diplomat', { journey: 4, stage: 25 }],
  ['the synchronized catalyst', { journey: 4, stage: 30 }],
  ['quick thinker', { journey: 5, stage: 1 }],
  ['the ultimate advocate', { journey: 5, stage: 5 }],
  ['the fade master', { journey: 5, stage: 10 }],
  ['the executive brief', { journey: 5, stage: 15 }],
  ['transparent leader', { journey: 5, stage: 20 }],
  ['honest problem solver', { journey: 5, stage: 25 }],
  ['the ironclad defense', { journey: 5, stage: 30 }],
]);

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function getJourneyStageFromKey(key) {
  const match = String(key || '').match(/^journey-(\d+)-stage-(\d+)$/i);
  return match ? { journey: Number(match[1]), stage: Number(match[2]) } : null;
}

function getBadgeUrlByJourneyStage(journey, stage) {
  return JOURNEY_BADGE_URLS_BY_STAGE[Number(journey)]?.[Number(stage)] ?? null;
}

export function getAchievementBadgeUrl(achievement) {
  const stageFromKey = getJourneyStageFromKey(achievement?.achievement_key ?? achievement?.achievementKey);
  if (stageFromKey) {
    const keyedUrl = getBadgeUrlByJourneyStage(stageFromKey.journey, stageFromKey.stage);
    if (keyedUrl) return keyedUrl;
  }

  const journeyNumber = Number(achievement?.journey_number ?? achievement?.journeyNumber);
  const stageNumber = Number(achievement?.stage_number ?? achievement?.stageNumber);
  const journeyStageUrl = getBadgeUrlByJourneyStage(journeyNumber, stageNumber);
  if (journeyStageUrl) {
    return journeyStageUrl;
  }

  if (Number.isFinite(journeyNumber) && !JOURNEY_BADGE_URLS_BY_STAGE[journeyNumber]) {
    return null;
  }

  const namedStage = JOURNEY_STAGE_BY_NAME.get(normalizeName(achievement?.name));
  if (!namedStage) return null;

  if (Number.isFinite(journeyNumber) && journeyNumber !== namedStage.journey) {
    return null;
  }

  return getBadgeUrlByJourneyStage(namedStage.journey, namedStage.stage);
}

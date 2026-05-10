/**
 * Mapping of Journey Stage counts based on User Speaker Proficiency.
 * Format: [Speaker Level]: { [Progress Level]: Stage Count }
 */
export const JOURNEY_STAGE_LIMITS = {
  1: { 1: 30, 2: 30, 3: 30, 4: 30, 5: 30 },
  2: { 1: 20, 2: 30, 3: 30, 4: 30, 5: 30 },
  3: { 1: 15, 2: 20, 3: 30, 4: 30, 5: 30 },
  4: { 1: 10, 2: 15, 3: 20, 4: 30, 5: 30 },
  5: { 1: 5, 2: 10, 3: 15, 4: 20, 5: 30 },
};

/**
 * Filters a list of activities based on the user's speaker level and current progress level.
 * @param {Array} activities - List of activity objects (tasks)
 * @param {number} speakerLevel - The user's tested proficiency (1-5)
 * @param {number} progressLevel - The current journey level (1-5)
 * @returns {Array} - The subset of activities the user needs to complete
 */
export function filterActivitiesForJourney(activities, speakerLevel, progressLevel) {
  if (!Array.isArray(activities)) return [];
  
  const sLevel = Number(speakerLevel) || 1;
  const pLevel = Number(progressLevel) || 1;
  
  const limit = JOURNEY_STAGE_LIMITS[sLevel]?.[pLevel] ?? 30;
  
  // Advanced speakers take the "upper" part of the curriculum (the most challenging stages).
  // E.g., if limit is 15 and there are 30 total, we take 16-30.
  return activities.slice(-limit);
}

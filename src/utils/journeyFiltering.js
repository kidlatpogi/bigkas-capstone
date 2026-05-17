/**
 * Journey stage counts are no longer reduced for advanced speakers.
 * Every journey remains available as the full 30-stage curriculum.
 */
export const JOURNEY_STAGE_LIMITS = {
  1: { 1: 30, 2: 30, 3: 30, 4: 30, 5: 30 },
  2: { 1: 30, 2: 30, 3: 30, 4: 30, 5: 30 },
  3: { 1: 30, 2: 30, 3: 30, 4: 30, 5: 30 },
  4: { 1: 30, 2: 30, 3: 30, 4: 30, 5: 30 },
  5: { 1: 30, 2: 30, 3: 30, 4: 30, 5: 30 },
};

/**
 * Returns the full journey curriculum. Speaker level is kept in the signature
 * for existing callers, but it no longer reduces required stages.
 * @param {Array} activities - List of activity objects (tasks)
 * @param {number} speakerLevel - The user's tested proficiency (1-5)
 * @param {number} progressLevel - The current journey level (1-5)
 * @returns {Array} - The subset of activities the user needs to complete
 */
export function filterActivitiesForJourney(activities, speakerLevel, progressLevel) {
  if (!Array.isArray(activities)) return [];
  void speakerLevel;
  void progressLevel;
  return activities;
}

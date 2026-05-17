import { ensureFreshAccessToken, isJwtExpiredError, supabase } from '../lib/supabase';
import { ROUTES } from '../utils/constants';
import { getDefaultPassingScoreForActivity } from '../utils/passingScore';

const ACTIVITY_COLUMNS = 'id, target_level, activity_order, title, phase_name, objective, purpose';

/**
 * Fetches curriculum activities from Supabase (ordered journey nodes).
 */
export async function fetchActivities(currentLevel = 1) {
  const queryActivities = () =>
    supabase
      .from('activities')
      .select(ACTIVITY_COLUMNS)
      .eq('target_level', currentLevel)
      .order('activity_order', { ascending: true });

  let { data, error } = await queryActivities();

  if (error && isJwtExpiredError(error)) {
    await ensureFreshAccessToken();
    ({ data, error } = await queryActivities());
  }

  if (error) {
    throw new Error(error.message || 'Failed to load activities');
  }
  return Array.isArray(data) ? data : [];
}

/**
 * Maps DB rows to SkywardJourney task shapes (sequential unlock by activity_order).
 */
export function buildJourneyTasksFromActivities(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list.map((row, index) => {
    const phaseName = String(row.phase_name || '').trim();
    const title = String(row.title || '').trim();
    const objective = String(row.objective || '').trim() || `Activity ${row.activity_order ?? index + 1}`;
    const passingScore = row.passing_score ?? getDefaultPassingScoreForActivity(row.target_level, row.activity_order);
    return {
      id: row.id,
      title: title || objective,
      pillarName: phaseName || 'Training',
      phase_name: phaseName,
      objective,
      purpose: row.purpose,
      detail: objective,
      actionLabel: 'Start training',
      actionRoute: ROUTES.TRAINING_SETUP,
      prerequisiteIds: index === 0 ? [] : [list[index - 1].id],
      target_level: row.target_level,
      activity_order: row.activity_order,
      activityOrder: row.activity_order,
      passing_score: passingScore,
      passingScore,
    };
  });
}

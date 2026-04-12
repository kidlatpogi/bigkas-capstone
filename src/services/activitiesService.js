import { supabase } from '../lib/supabase';
import { ROUTES } from '../utils/constants';

/**
 * Fetches curriculum activities from Supabase (ordered journey nodes).
 */
export async function fetchActivities(currentLevel = 1) {
  const { data, error } = await supabase
    .from('activities')
    .select('id, target_level, activity_order, title, phase_name, objective, weight_vis, weight_voc, weight_ver, created_at')
    .eq('target_level', currentLevel)
    .order('activity_order', { ascending: true });

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
    return {
      id: row.id,
      title: title || objective,
      pillarName: phaseName || 'Training',
      phase_name: phaseName,
      objective,
      detail: objective,
      actionLabel: 'Start training',
      actionRoute: ROUTES.TRAINING_SETUP,
      prerequisiteIds: index === 0 ? [] : [list[index - 1].id],
      target_level: row.target_level,
      activity_order: row.activity_order,
      activityOrder: row.activity_order,
      weights: {
        vis: Number(row.weight_vis) || 0,
        voc: Number(row.weight_voc) || 0,
        ver: Number(row.weight_ver) || 0,
      },
    };
  });
}

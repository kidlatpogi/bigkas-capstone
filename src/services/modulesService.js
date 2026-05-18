import { ensureFreshAccessToken, isJwtExpiredError, supabase } from '../lib/supabase';
import { DEFAULT_MODULES } from '../data/modulesCatalog';

function normalizeModule(module) {
  const theory = module.theory || module.content || '';

  return {
    ...module,
    project_focus: module.project_focus || '',
    objectives: module.objectives || '',
    theory,
    assignment: module.assignment || '',
    content: module.content || theory,
  };
}

/**
 * Fetches all learning modules from the database, ordered by lesson number.
 * Gracefully falls back to the integrated PDF-derived dataset if remote table is
 * unseeded, offline, or still on the older schema.
 * @returns {Promise<Array>} Array of module rows.
 */
export async function fetchModules() {
  try {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('lesson_number', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map(normalizeModule);
    }
  } catch {
    // Ignore and use bundled data.
  }

  return DEFAULT_MODULES.map(normalizeModule);
}

export async function recordModuleView(moduleId) {
  if (!moduleId) return;
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return;

  const insertView = () => supabase
    .from('module_views')
    .insert({ user_id: userId, module_id: moduleId });

  let { error } = await insertView();

  if (error && isJwtExpiredError(error)) {
    await ensureFreshAccessToken();
    ({ error } = await insertView());
  }

  if (error) {
    console.warn('Failed to record module view:', error.message);
  }
}

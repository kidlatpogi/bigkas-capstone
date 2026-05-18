import { supabase } from '../lib/supabase';

function isMissingTrophyBackend(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === '42P01' ||
    error?.code === '42883' ||
    error?.code === 'PGRST202' ||
    message.includes('user_trophies') ||
    message.includes('claim_user_trophy') ||
    message.includes('set_featured_user_trophy') ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  );
}

function normalizeTrophyRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list
    .map((row) => ({
      level: Number(row.trophy_level),
      claimedAt: row.claimed_at ?? null,
      isFeatured: !!row.is_featured,
    }))
    .filter((row) => Number.isInteger(row.level) && row.level >= 1 && row.level <= 5)
    .sort((a, b) => a.level - b.level);
}

export async function fetchUserTrophyClaims(userId) {
  const uid = String(userId || '').trim();
  if (!uid) return { trophies: [], backendUnavailable: false };

  const { data, error } = await supabase
    .from('user_trophies')
    .select('trophy_level, claimed_at, is_featured')
    .eq('user_id', uid)
    .order('trophy_level', { ascending: true });

  if (error) {
    if (isMissingTrophyBackend(error)) {
      return { trophies: [], backendUnavailable: true };
    }
    throw error;
  }

  return { trophies: normalizeTrophyRows(data), backendUnavailable: false };
}

export async function claimTrophyInDB(level) {
  const trophyLevel = Number(level);
  if (!Number.isInteger(trophyLevel) || trophyLevel < 1 || trophyLevel > 5) {
    throw new Error('Invalid trophy level.');
  }

  const { data, error } = await supabase.rpc('claim_user_trophy', {
    p_trophy_level: trophyLevel,
  });

  if (error) {
    if (isMissingTrophyBackend(error)) {
      throw new Error('Trophy claiming is not ready yet. Please apply the latest database migration.');
    }
    throw error;
  }

  return normalizeTrophyRows(data);
}

export async function setFeaturedTrophyInDB(level) {
  const trophyLevel = Number(level);
  if (!Number.isInteger(trophyLevel) || trophyLevel < 1 || trophyLevel > 5) {
    throw new Error('Invalid trophy level.');
  }

  const { data, error } = await supabase.rpc('set_featured_user_trophy', {
    p_trophy_level: trophyLevel,
  });

  if (error) {
    if (isMissingTrophyBackend(error)) {
      throw new Error('Trophy featuring is not ready yet. Please apply the latest database migration.');
    }
    throw error;
  }

  return normalizeTrophyRows(data);
}

export function getClaimedTrophyLevelsFromRows(rows) {
  return normalizeTrophyRows(rows).map((row) => row.level);
}

export function getFeaturedTrophyLevelFromRows(rows) {
  const trophies = normalizeTrophyRows(rows);
  const featured = trophies.find((row) => row.isFeatured);
  if (featured) return featured.level;
  if (trophies.length === 0) return null;
  return Math.max(...trophies.map((row) => row.level));
}

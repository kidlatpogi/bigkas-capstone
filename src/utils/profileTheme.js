export const DEFAULT_PROFILE_THEME = 'emerald';
export const LEGACY_PROFILE_THEME_KEY = 'pref_hero_theme';

export const buildProfileThemeKey = (userId) => (
  userId ? `pref_hero_theme:${userId}` : LEGACY_PROFILE_THEME_KEY
);

export const getAllowedProfileTheme = (themeId, themeConfig, levelNumber) => {
  const fallback = DEFAULT_PROFILE_THEME;
  const requestedTheme = themeConfig.find((theme) => theme.id === themeId);
  if (!requestedTheme) return fallback;
  if (Number(levelNumber || 0) < Number(requestedTheme.requires || 0)) return fallback;
  return requestedTheme.id;
};

export const readStoredProfileTheme = (userId, themeConfig, levelNumber) => {
  if (typeof window === 'undefined') return DEFAULT_PROFILE_THEME;

  const scopedKey = buildProfileThemeKey(userId);
  const scopedTheme = window.localStorage.getItem(scopedKey);
  if (scopedTheme) {
    return getAllowedProfileTheme(scopedTheme, themeConfig, levelNumber);
  }

  if (!userId) {
    return getAllowedProfileTheme(
      window.localStorage.getItem(LEGACY_PROFILE_THEME_KEY),
      themeConfig,
      levelNumber,
    );
  }

  return DEFAULT_PROFILE_THEME;
};

export const writeStoredProfileTheme = (userId, themeId) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(buildProfileThemeKey(userId), themeId);
};

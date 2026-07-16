/**
 * Asset utilities for fetching assets from Cloudflare R2 or local storage.
 */

export const R2_BASE_URL = 'https://assets.bigkas.site';

/**
 * Returns the full URL for an asset.
 * @param {string} path - The relative path to the asset (e.g., 'Sprites/Rank/rank-bronze.webp')
 * @returns {string} - The full URL
 */
export function getAssetUrl(path) {
  if (!path) return '';
  
  // If it's already a full URL, return it
  if (path.startsWith('http')) return path;
  
  // Clean the path: remove leading slashes and any 'assets/' prefix if present
  const cleanedPath = path
    .replace(/^\/+/, '')
    .replace(/^assets\//, '');
    
  return `${R2_BASE_URL}/${cleanedPath}`;
}

/**
 * Specifically for Sprite assets
 */
export function getSpriteUrl(path) {
  const cleaned = path.replace(/^\/+/, '').replace(/^Sprites\//, '');
  return getAssetUrl(`Sprites/${cleaned}`);
}

/**
 * Specifically for Voice assets
 */
export function getVoiceUrl(path) {
  const cleaned = path.replace(/^\/+/, '').replace(/^Voices\//, '');
  return getAssetUrl(`Voices/${cleaned}`);
}

if (typeof window !== 'undefined' && !window.__bigkasAudioOverridden) {
  window.__bigkasAudioOverridden = true;
  const OriginalAudio = window.Audio;
  window.Audio = class DynamicAudio extends OriginalAudio {
    constructor(src) {
      let resolvedSrc = src;
      if (typeof src === 'string' && src.includes('/Voices/') && !src.includes('/Voice 1/') && !src.includes('/Voice 2/')) {
        const savedVoice = window.localStorage.getItem('bigkas_b01_voice');
        const voicePrefix = savedVoice === 'voice2' ? 'Voice 2/' : 'Voice 1/';
        const index = src.indexOf('/Voices/');
        if (index !== -1) {
          resolvedSrc = src.substring(0, index + 8) + voicePrefix + src.substring(index + 8);
        }
      }
      super(resolvedSrc);
    }
  };
}

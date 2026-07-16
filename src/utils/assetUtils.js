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

const VOICE_2_MAPPING = {
  // Introductions
  'Introductions/Intro 1.mp3': 'Introductions/Voice%202%20-%20Intro%201.mp3',
  'Introductions/Intro 2.mp3': 'Introductions/Voice%202%20-%20Intro%202.mp3',
  
  // Demographics
  'Demographic/Gender.mp3': 'Demographic/Voice%202%20-%20Gender.mp3',
  'Demographic/Age.mp3': 'Demographic/Voice%202%20-%20Age.mp3',

  // Profiling Questions
  'Profiling and Pre-Testing/Profiling Questions/Profiling Question 1.mp3': 'Profiling%20and%20Pre-Testing/Profiling%20Questions/Voice%202/Voice%202-%20Quesstion%201.mp3',
  'Profiling and Pre-Testing/Profiling Questions/Profiling Question 2.mp3': 'Profiling%20and%20Pre-Testing/Profiling%20Questions/Voice%202/Voice%202-%20Quesstion%202.mp3',
  'Profiling and Pre-Testing/Profiling Questions/Profiling Question 3.mp3': 'Profiling%20and%20Pre-Testing/Profiling%20Questions/Voice%202/Voice%202-%20Quesstion%203.mp3',
  'Profiling and Pre-Testing/Profiling Questions/Profiling Question 4.mp3': 'Profiling%20and%20Pre-Testing/Profiling%20Questions/Voice%202/Voice%202-%20Quesstion%204.mp3',
  'Profiling and Pre-Testing/Profiling Questions/Profiling Question 5.mp3': 'Profiling%20and%20Pre-Testing/Profiling%20Questions/Voice%202/Voice%202-%20Quesstion%205.mp3',
  'Profiling and Pre-Testing/Profiling Questions/Profiling Question 6.mp3': 'Profiling%20and%20Pre-Testing/Profiling%20Questions/Voice%202/Voice%202-%20Quesstion%206.mp3',
  'Profiling and Pre-Testing/Profiling Questions/Profiling Question 7.mp3': 'Profiling%20and%20Pre-Testing/Profiling%20Questions/Voice%202/Voice%202-%20Quesstion%207.mp3',
  'Profiling and Pre-Testing/Profiling Questions/Profiling Question 8.mp3': 'Profiling%20and%20Pre-Testing/Profiling%20Questions/Voice%202/Voice%202-%20Quesstion%208.mp3',
  'Profiling and Pre-Testing/Profiling Questions/Profiling Question 9.mp3': 'Profiling%20and%20Pre-Testing/Profiling%20Questions/Voice%202/Voice%202-%20Quesstion%209.mp3',
  'Profiling and Pre-Testing/Profiling Questions/Profiling Question 10.mp3': 'Profiling%20and%20Pre-Testing/Profiling%20Questions/Voice%202/Voice%202-%20Quesstion%2010.mp3',

  // Pre-testing
  'Profiling and Pre-Testing/Before pre-testing.mp3': 'Profiling%20and%20Pre-Testing/Voice%202%20-%20Before%20pre-testing.mp3',

  // Pre-testing Tutorial
  'Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 1.mp3': 'Profiling%20and%20Pre-Testing/Pre-Testing%20Tutorial/Voice%202/Voice%202%20-%20pre-testing%20tutorial%201.mp3',
  'Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 2.mp3': 'Profiling%20and%20Pre-Testing/Pre-Testing%20Tutorial/Voice%202/Voice%202%20-%20pre-testing%20tutorial%202.mp3',
  'Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 3.mp3': 'Profiling%20and%20Pre-Testing/Pre-Testing%20Tutorial/Voice%202/Voice%202%20-%20pre-testing%20tutorial%203.mp3',
  'Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 4.mp3': 'Profiling%20and%20Pre-Testing/Pre-Testing%20Tutorial/Voice%202/Voice%202%20-%20pre-testing%20tutorial%204.mp3',
  'Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 4_new.mp3': 'Profiling%20and%20Pre-Testing/Pre-Testing%20Tutorial/Voice%202/Voice%202%20-%20pre-testing%20tutorial%204.mp3',
  'Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 5.mp3': 'Profiling%20and%20Pre-Testing/Pre-Testing%20Tutorial/Voice%202/Voice%202%20-%20pre-testing%20tutorial%205.mp3',
  'Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial FINAL.mp3': 'Profiling%20and%20Pre-Testing/Pre-Testing%20Tutorial/Voice%202/Voice%202%20-%20pre-testing%20tutorial%20FINAL.mp3',

  // Level Analysis
  'Profiling and Pre-Testing/Analyzing/Analyzing Level 1.mp3': 'Profiling%20and%20Pre-Testing/Analyzing/Voice%202%20-%20Analyzing%20Level%201.mp3',
  'Profiling and Pre-Testing/Analyzing/Analyzing Level 2.mp3': 'Profiling%20and%20Pre-Testing/Analyzing/Voice%202%20-%20Analyzing%20Level%202.mp3',
  'Profiling and Pre-Testing/Analyzing/Analyzing Level 3.mp3': 'Profiling%20and%20Pre-Testing/Analyzing/Voice%202%20-%20Analyzing%20Level%203.mp3',
  'Profiling and Pre-Testing/Analyzing/Analyzing Level 4.mp3': 'Profiling%20and%20Pre-Testing/Analyzing/Voice%202%20-%20Analyzing%20Level%204.mp3',
  'Profiling and Pre-Testing/Analyzing/Analyzing Level 5.mp3': 'Profiling%20and%20Pre-Testing/Analyzing/Voice%202%20-%20Analyzing%20Level%205.mp3',

  // Score Breakdown
  'Profiling and Pre-Testing/Score Breakdown/Score Breakdown 1.mp3': 'Profiling%20and%20Pre-Testing/Score%20Breakdown/Voice%202%20-%20Score%20Breakdown%201.mp3',
  'Profiling and Pre-Testing/Score Breakdown/Score Breakdown 2.mp3': 'Profiling%20and%20Pre-Testing/Score%20Breakdown/Voice%202%20-%20Score%20Breakdown%202.mp3',
  'Profiling and Pre-Testing/Score Breakdown/Score Breakdown 3.mp3': 'Profiling%20and%20Pre-Testing/Score%20Breakdown/Voice%202%20-%20Score%20Breakdown%203.mp3',

  // Welcome Journey
  'Home Page/Welcome/Level 1.mp3': 'Home%20Page/Welcome/Voice%202%20-%20Level%201.mp3',
  'Home Page/Welcome/Level 2.mp3': 'Home%20Page/Welcome/Voice%202%20-%20Level%202.mp3',
  'Home Page/Welcome/Level 3.mp3': 'Home%20Page/Welcome/Voice%202%20-%20Level%203.mp3',
  'Home Page/Welcome/Level 4.mp3': 'Home%20Page/Welcome/Voice%202%20-%20Level%204.mp3',
  'Home Page/Welcome/Level 5.mp3': 'Home%20Page/Welcome/Voice%202%20-%20Level%205.mp3',
  'Home Page/Welcome/Level_1_NEW.mp3': 'Home%20Page/Welcome/Voice%202%20-%20Level%201.mp3',
  'Home Page/Welcome/Level_2_NEW.mp3': 'Home%20Page/Welcome/Voice%202%20-%20Level%202.mp3',
  'Home Page/Welcome/Level_3_NEW.mp3': 'Home%20Page/Welcome/Voice%202%20-%20Level%203.mp3',
  'Home Page/Welcome/Level_4_NEW.mp3': 'Home%20Page/Welcome/Voice%202%20-%20Level%204.mp3',
  'Home Page/Welcome/Level_5_NEW.mp3': 'Home%20Page/Welcome/Voice%202%20-%20Level%205.mp3',

  // Home Page Tutorials
  'Home Page/Tutorials/Home Page Tutorial 1.mp3': 'Home%20Page/Tutorials/Voice%202%20-%20Home%20Page%20Tutorial%201.mp3',
  'Home Page/Tutorials/Home Page Tutorial 2.mp3': 'Home%20Page/Tutorials/Voice%202%20-%20Home%20Page%20Tutorial%202.mp3',
  'Home Page/Tutorials/Home Page Tutorial 3.mp3': 'Home%20Page/Tutorials/Voice%202%20-%20Home%20Page%20Tutorial%203.mp3',
  'Home Page/Tutorials/Home Page Tutorial 4.mp3': 'Home%20Page/Tutorials/Voice%202%20-%20Home%20Page%20Tutorial%204.mp3',
  'Home Page/Tutorials/Home Page Tutorial 5.mp3': 'Home%20Page/Tutorials/Voice%202%20-%20Home%20Page%20Tutorial%205.mp3',
  'Home Page/Tutorials/Home Page Tutorial 6.mp3': 'Home%20Page/Tutorials/Voice%202%20-%20Home%20Page%20Tutorial%206.mp3',

  // Randomizer and Free Speech
  'Home Page/Randomizer and Free Speech Button/Randomizer.mp3': 'Home%20Page/Randomizer%20and%20Free%20Speech%20Button/Voice%202%20-%20Randomizer.mp3',
  'Home Page/Randomizer and Free Speech Button/Free Speech.mp3': 'Home%20Page/Randomizer%20and%20Free%20Speech%20Button/Voice%202%20-%20Free%20Speech.mp3',
};

if (typeof window !== 'undefined' && !window.__bigkasAudioOverridden) {
  window.__bigkasAudioOverridden = true;
  const OriginalAudio = window.Audio;
  window.Audio = class DynamicAudio extends OriginalAudio {
    constructor(src) {
      if (src === undefined) {
        super();
        return;
      }
      let resolvedSrc = src;
      if (typeof src === 'string' && src.includes('/Voices/')) {
        if (src.includes('/Voice 1/') || src.includes('/Voice 2/') || src.includes('/Voice 2 -')) {
          super(src);
          return;
        }

        const index = src.indexOf('/Voices/');
        if (index !== -1) {
          const relativePath = src.substring(index + 8);
          const decodedPath = decodeURIComponent(relativePath).replace(/^\/+/, '');
          const savedVoice = window.localStorage.getItem('bigkas_b01_voice');

          if (savedVoice === 'voice2') {
            if (VOICE_2_MAPPING[decodedPath]) {
              resolvedSrc = src.substring(0, index + 8) + VOICE_2_MAPPING[decodedPath];
            } else {
              resolvedSrc = src.substring(0, index + 8) + 'Voice 2/' + relativePath;
            }
          } else {
            // For Voice 1, keep it exactly as it is (root of Voices/) since there is no 'Voice 1/' folder on the server
            resolvedSrc = src;
          }
        }
      }
      super(resolvedSrc);
    }
  };
}

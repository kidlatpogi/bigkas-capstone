/**
 * Guard utility for Ask B-01 Chatbot
 * Validates user queries for profanity, prompt injection, and off-topic questions.
 * Ensures B-01 only answers queries related to public speaking, TalkTics, and user progress/stats.
 */

export const B01_SUGGESTIONS = [
  "Summarize my progress so far",
  "How can I improve my confidence?",
  "Give me tips for vocal variety",
  "Explain my current rank and growth",
  "What should I practice next?",
];

export const B01_VALIDATION_REFUSAL_MESSAGE =
  "I am B-01, your TalkTics AI speaking coach! I am only designed to assist you with public speaking, speech improvement tips, your practice progress, rank and stats, or using TalkTics. Please ask a question related to public speaking or your performance!";

// 1. Profanity & Bad Words Pattern List
const PROFANITY_PATTERNS = [
  /\b(fuck|fucking|fucked|fucker|fuckin|motherfucker|motherfucking)\b/i,
  /\b(shit|shitting|shitty|bullshit|horseshit)\b/i,
  /\b(bitch|bitches|bitchy|bitching)\b/i,
  /\b(asshole|assholes|dumbass|jackass|badass)\b/i,
  /\b(cunt|cunts|dick|dicks|pussy|pussies|slut|sluts|whore|whores)\b/i,
  /\b(nigger|nigga|faggot|retard|retarded|bastard|prick|cock|cocksucker)\b/i,
  /\b(idiot|stupid|dumb)\b/i
];

// 2. Prompt Injection Attacks
const PROMPT_INJECTION_PATTERNS = [
  /\b(ignore|disregard|forget|override|bypass|clear|reset)\s+(all\s+)?(previous|above|system|prior|initial|existing|safety)?\s*(instruction|instructions|prompt|prompts|rule|rules|guidelines|directives|context)/i,
  /\b(you\s+are\s+now|act\s+as|roleplay\s+as|pretend\s+(to\s+be|you\s+are)|simulate|take\s+on\s+the\s+role\s+of)\b/i,
  /\b(dan\s+mode|jailbreak|jailbroken|developer\s+mode|unfiltered|god\s+mode|chaos\s+mode)\b/i,
  /\b(system\s+prompt|developer\s+prompt|initial\s+prompt|reveal\s+(your|the)\s+(prompt|instructions|system)|print\s+(your|the)\s+(prompt|instructions|system)|repeat\s+(the\s+text\s+above|after\s+me|everything))\b/i,
  /\[system\]|<\|im_start\|>|```system|<<sys>>|<sys>/i,
  /\b(ignore\s+(safety|filters?|guardrails?|restrictions?|policies)|bypass\s+(safety|filters?|guardrails?))\b/i,
  /\b(new\s+rule:|new\s+instruction:|system\s+override:)/i,
  /\b(say\s+something\s+else|do\s+not\s+follow|stop\s+being\s+a\s+coach)\b/i
];

// 3. Allowed Domain Keywords (Public Speaking, User Progress, TalkTics App)
const ON_TOPIC_KEYWORDS = [
  // Public Speaking & Delivery
  'speak', 'speaking', 'speech', 'speeches', 'vocal', 'voice', 'pace', 'pacing', 'speed',
  'volume', 'pitch', 'tone', 'articulation', 'clarity', 'pronounce', 'pronunciation',
  'filler', 'fillers', 'confidence', 'confident', 'anxiety', 'nervous', 'nervousness',
  'fear', 'stage', 'audience', 'eye contact', 'gesture', 'gestures', 'body language',
  'posture', 'presentation', 'presentations', 'talk', 'talks', 'oratory', 'rhetoric',
  'pause', 'pauses', 'pausing', 'delivery', 'articulate', 'express', 'fluency', 'fluent',
  'breath', 'breathing', 'intonation', 'monotone', 'public', 'impromptu', 'persuasion',
  'storytelling', 'toastmaster', 'communication', 'communicate', 'tip', 'tips',
  'advice', 'improve', 'improvement', 'practice', 'practicing', 'rehearse', 'rehearsal',
  'variety',

  // Progress, Stats, User Profile & System
  'progress', 'rank', 'level', 'growth', 'score', 'scores', 'stat', 'stats', 'statistic',
  'statistics', 'session', 'sessions', 'streak', 'mastery', 'history', 'performance',
  'summary', 'summarize', 'eval', 'evaluation', 'record', 'records', 'badge', 'badges',
  'trophy', 'trophies', 'achievement', 'achievements', 'point', 'points', 'xp',
  'pillar', 'pillars', 'visual', 'audio', 'content', 'talktics', 'b-01', 'b01', 'coach',
  'randomizer', 'free speech', 'streak recovery', 'journey', 'app', 'system', 'mode', 'modes',
  'help', 'feature', 'features', 'next'
];

// Common conversational greetings / meta questions about B-01
const CONVERSATIONAL_PHRASES = [
  'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
  'who are you', 'what can you do', 'what do you do', 'how do you work',
  'can you help me', 'what is b-01', 'what is b01', 'what is talktics'
];

// Explicit Off-Topic Subject Patterns
const OFF_TOPIC_PATTERNS = [
  /\b(recipe|cook|cooking|bake|baking|ingredient|ingredients|food|kitchen)\b/i,
  /\b(python|javascript|java|c\+\+|html|css|sql|write\s+code|coding|programming|algorithm|software|bug|github)\b/i,
  /\b(math|equation|calculus|algebra|integral|solve\s+for|derivative|geometry)\b/i,
  /\b(capital\s+of|president\s+of|prime\s+minister|world\s+war|history\s+of|geography)\b/i,
  /\b(movie|film|actor|actress|hollywood|netflix|anime|manga|tv\s+show)\b/i,
  /\b(crypto|bitcoin|ethereum|stock\s+market|investing|trading|shares)\b/i,
  /\b(weather|temperature|forecast|climate|rain|snow)\b/i,
  /\b(football|basketball|soccer|baseball|nba|nfl|fifa|world\s+cup|sports)\b/i,
  /\b(joke|jokes|riddle|game|games|fortnite|minecraft|pokemon|video\s+game)\b/i
];

/**
 * Validates a user query for B-01 chatbot.
 * @param {string} query User input text
 * @returns {{ isValid: boolean, reason: string|null, refusalMessage?: string }}
 */
export function validateB01Query(query) {
  const trimmed = String(query || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      reason: 'empty',
      refusalMessage: 'Please enter a question.'
    };
  }

  const lower = trimmed.toLowerCase();

  // 1. Allow exact/near match for suggested chip buttons from UI
  const isSuggestedChip = B01_SUGGESTIONS.some(
    (suggestion) => suggestion.toLowerCase() === lower
  );
  if (isSuggestedChip) {
    return { isValid: true, reason: null };
  }

  // 2. Check Bad Words / Profanity
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        isValid: false,
        reason: 'profanity',
        refusalMessage: B01_VALIDATION_REFUSAL_MESSAGE
      };
    }
  }

  // 3. Check Prompt Injection
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        reason: 'prompt_injection',
        refusalMessage: B01_VALIDATION_REFUSAL_MESSAGE
      };
    }
  }

  // 4. Check Explicit Off-Topic patterns
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        isValid: false,
        reason: 'off_topic',
        refusalMessage: B01_VALIDATION_REFUSAL_MESSAGE
      };
    }
  }

  // 5. Check Conversational Greetings
  const isGreeting = CONVERSATIONAL_PHRASES.some(
    (phrase) => lower === phrase || lower.startsWith(phrase + ' ') || lower.endsWith(' ' + phrase)
  );
  if (isGreeting) {
    return { isValid: true, reason: null };
  }

  // 6. Check Domain Relevance (On-Topic Keywords)
  const isRelevant = ON_TOPIC_KEYWORDS.some((keyword) => lower.includes(keyword));
  if (isRelevant) {
    return { isValid: true, reason: null };
  }

  // Fallback: If query has no keywords related to public speaking, stats, or TalkTics
  return {
    isValid: false,
    reason: 'off_topic',
    refusalMessage: B01_VALIDATION_REFUSAL_MESSAGE
  };
}

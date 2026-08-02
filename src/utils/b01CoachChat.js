import ENV from '../config/env';
import { validateB01Query, B01_VALIDATION_REFUSAL_MESSAGE } from './b01Guard';

function normalizeMessages(messages) {
  return Array.isArray(messages)
    ? messages.filter((message) => message && typeof message.content === 'string')
    : [];
}

function getWorkerUrl() {
  const baseUrl = String(ENV.CLOUDFLARE_AI_WORKER_URL || '').replace(/\/+$/, '');
  return baseUrl || 'https://b01-ai-worker.kidlat.workers.dev';
}

function getLatestUserQuestion(messages) {
  const userMessages = normalizeMessages(messages).filter((message) => message.role === 'user');
  return String(userMessages[userMessages.length - 1]?.content || '').trim();
}

function buildFallbackCoachReply(question, context) {
  const normalizedQuestion = question.toLowerCase();
  const totalSessions = Number(context?.analyzedSessionsCount ?? context?.totalSessionCount ?? 0) || 0;
  const averageScore = context?.averageScore ?? 'N/A';
  const levelNumber = context?.currentLevel ?? 1;
  const levelName = context?.levelName || 'Novice';
  const growth = context?.growthSummary || {};
  const latest = context?.latestSession;
  const strongest = growth.strongestPillar || 'Visual';
  const growthText = growth.growthPercentage ?? '0.0';

  // 1. Progress & Rank Summary
  if (normalizedQuestion.includes('summarize') || normalizedQuestion.includes('progress') || normalizedQuestion.includes('stats') || normalizedQuestion.includes('rank') || normalizedQuestion.includes('growth')) {
    return `You are currently at Level ${levelNumber} (${levelName}) with ${totalSessions} analyzed practice session${totalSessions === 1 ? '' : 's'} and an average score of ${averageScore}. Your latest session scored ${latest?.score ?? 'N/A'}%, your overall growth is ${growthText}%, and your strongest pillar is ${strongest}.`;
  }

  // 2. Vocal Variety
  if (normalizedQuestion.includes('vocal') || normalizedQuestion.includes('variety') || normalizedQuestion.includes('pitch') || normalizedQuestion.includes('monotone') || normalizedQuestion.includes('inflection')) {
    return `To master vocal variety, try pitch contrast: elevate your pitch when introducing key ideas and lower it when delivering powerful takeaways. Practice alternating between a energetic fast pace for exciting details and a measured slow pace for emphasis. Leaning into your ${strongest} strength will help your natural expression shine!`;
  }

  // 3. Confidence & Anxiety
  if (normalizedQuestion.includes('confidence') || normalizedQuestion.includes('anxiety') || normalizedQuestion.includes('nervous') || normalizedQuestion.includes('fear') || normalizedQuestion.includes('stage fright')) {
    return `For instant confidence on stage: plant your feet firmly shoulder-width apart, take three deep diaphragmatic breaths before your first sentence, and make steady eye contact with one person per thought. You have already completed ${totalSessions} practice sessions—trust your training!`;
  }

  // 4. Pacing & Speed
  if (normalizedQuestion.includes('pace') || normalizedQuestion.includes('pacing') || normalizedQuestion.includes('speed') || normalizedQuestion.includes('fast') || normalizedQuestion.includes('slow')) {
    return `Great delivery relies on deliberate pacing. Aim for 130 to 150 words per minute. When transitioning between points, insert a full 2-second silent pause—silence feels authoritative to your audience and gives you time to compose your next statement cleanly.`;
  }

  // 5. Filler Words
  if (normalizedQuestion.includes('filler') || normalizedQuestion.includes('um') || normalizedQuestion.includes('uh') || normalizedQuestion.includes('like')) {
    return `To eliminate filler words like 'um' and 'ah', replace them with silent pauses. Whenever you feel a filler word coming, gently close your lips, breathe through your nose, and begin your next sentence once your thought is clear.`;
  }

  // 6. Practice Tips & Next Steps
  if (normalizedQuestion.includes('tip') || normalizedQuestion.includes('tips') || normalizedQuestion.includes('practice') || normalizedQuestion.includes('next') || normalizedQuestion.includes('recommend')) {
    return `Here is your target for your next practice run: launch a 45-second Randomizer round. Open with a captivating 1-sentence hook, support it with two concise examples, and close with a punchy conclusion. Focus on your ${strongest} pillar during delivery!`;
  }

  // 7. General Coaching Fallback
  return `As your B-01 AI speaking coach, I recommend focusing on structured delivery and intentional pausing. Based on your Level ${levelNumber} (${levelName}) profile with ${totalSessions} sessions logged and an average score of ${averageScore}, keep practicing regularly to sharpen your delivery!`;
}

function extractContentFromChunkData(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  return (
    data.choices?.[0]?.delta?.content ||
    data.choices?.[0]?.text ||
    data.choices?.[0]?.message?.content ||
    data.response ||
    data.message ||
    data.text ||
    data.answer ||
    ''
  );
}

async function readWorkerResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await response.json();
    return extractContentFromChunkData(data);
  }

  const text = await response.text();
  if (!text.trim()) return '';

  if (!text.includes('data:')) {
    try {
      const parsedJson = JSON.parse(text);
      const extracted = extractContentFromChunkData(parsedJson);
      if (extracted) return extracted;
    } catch {
      // Not JSON, return text directly
    }
    return text.trim();
  }

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data: ') && !line.includes('[DONE]'))
    .map((line) => {
      try {
        const data = JSON.parse(line.slice(6));
        return extractContentFromChunkData(data);
      } catch {
        return '';
      }
    })
    .join('')
    .trim();
}

const OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function fetchFromOpenRouter(messages) {
  const apiKey = ENV.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://talktics.site',
      'X-Title': 'TalkTics AI Coach',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 350,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter returned ${response.status}`);
  }

  const data = await response.json();
  const content = extractContentFromChunkData(data);
  return content ? content.trim() : null;
}

export async function askB01Coach({ messages, progressContext }) {
  void progressContext;

  const userQuestion = getLatestUserQuestion(messages);
  const validation = validateB01Query(userQuestion);

  // If query contains profanity, prompt injection, or is off-topic:
  // Do NOT call API or AI worker. Instantly return refusal response.
  if (!validation.isValid) {
    return validation.refusalMessage || B01_VALIDATION_REFUSAL_MESSAGE;
  }

  const normalizedMessages = normalizeMessages(messages);

  // 1. Try OpenRouter free tier API first
  if (ENV.OPENROUTER_API_KEY) {
    try {
      const openRouterReply = await fetchFromOpenRouter(normalizedMessages);
      if (openRouterReply) {
        return openRouterReply;
      }
    } catch (err) {
      console.warn('OpenRouter API call failed, falling back to worker:', err);
    }
  }

  // 2. Fallback to Cloudflare AI Worker
  const response = await fetch(getWorkerUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: normalizedMessages }),
  });

  if (!response.ok) {
    throw new Error(`B-01 worker returned ${response.status}`);
  }

  const reply = await readWorkerResponse(response);
  if (!reply) {
    throw new Error('B-01 worker returned an empty response');
  }

  return reply;
}

export async function fetchRandomizerTopicFromAI() {
  const systemPrompt = {
    role: 'system',
    content: `You are an expert public speaking topic generator for TalkTics. Generate ONE fun, engaging, and thought-provoking public speaking topic title with a short 1-sentence prompt body.
Format your output as raw JSON ONLY with keys "title" and "body". Example: {"title": "The Art of Storytelling", "body": "Explain how personal anecdotes make a speech memorable."}`
  };
  const userPrompt = {
    role: 'user',
    content: 'Generate a random public speaking practice topic.'
  };

  const messages = [systemPrompt, userPrompt];

  if (ENV.OPENROUTER_API_KEY) {
    try {
      const reply = await fetchFromOpenRouter(messages);
      if (reply) {
        const cleanJson = reply.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed.title) {
          return { title: parsed.title, body: parsed.body || '' };
        }
      }
    } catch (e) {
      console.warn('OpenRouter random topic generation failed:', e);
    }
  }

  return null;
}

export function getB01FallbackReply({ messages, progressContext }) {
  const userQuestion = getLatestUserQuestion(messages);
  const validation = validateB01Query(userQuestion);

  if (!validation.isValid) {
    return validation.refusalMessage || B01_VALIDATION_REFUSAL_MESSAGE;
  }

  return buildFallbackCoachReply(userQuestion, progressContext);
}


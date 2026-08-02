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

  // 1. Progress & Stats Summary
  if (normalizedQuestion.includes('summarize') || normalizedQuestion.includes('progress') || normalizedQuestion.includes('stats')) {
    return `You are currently at Level ${levelNumber} (${levelName}) with ${totalSessions} analyzed practice session${totalSessions === 1 ? '' : 's'} and an average score of ${averageScore}. Your latest session scored ${latest?.score ?? 'N/A'}%, your overall growth is ${growthText}%, and your strongest pillar is ${strongest}.`;
  }

  // 2. Default Fallback when AI service is unavailable
  return `As your B-01 AI speaking coach, I am ready to help you improve your public speaking skills! Based on your Level ${levelNumber} (${levelName}) profile with ${totalSessions} sessions logged and an average score of ${averageScore}, feel free to ask me any question about your delivery or practice goals.`;
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

const FREE_OPENROUTER_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'deepseek/deepseek-r1:free',
  'qwen/qwen-2.5-coder-32b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
];
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function fetchFromOpenRouter(messages) {
  const apiKey = ENV.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  for (const model of FREE_OPENROUTER_MODELS) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://talktics.site',
          'X-Title': 'TalkTics AI Coach',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 350,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = extractContentFromChunkData(data);
        if (content && content.trim()) {
          return content.trim();
        }
      }
    } catch (e) {
      console.warn(`OpenRouter model ${model} failed, trying next:`, e);
    }
  }

  return null;
}

export async function askB01Coach({ messages, progressContext }) {
  const userQuestion = getLatestUserQuestion(messages);
  const validation = validateB01Query(userQuestion);

  // If query contains profanity, prompt injection, or is off-topic:
  // Do NOT call API or AI worker. Instantly return refusal response.
  if (!validation.isValid) {
    return validation.refusalMessage || B01_VALIDATION_REFUSAL_MESSAGE;
  }

  const normalizedMessages = normalizeMessages(messages);

  const systemMessage = {
    role: 'system',
    content: `You are B-01, an encouraging, articulate, and expert AI Public Speaking Coach for TalkTics.
User context: Level ${progressContext?.currentLevel || 1} (${progressContext?.levelName || 'Novice'}), ${progressContext?.analyzedSessionsCount || 0} practice sessions, average score ${progressContext?.averageScore || 'N/A'}, strongest pillar: ${progressContext?.growthSummary?.strongestPillar || 'Visual'}.
Answer the user's question directly, clearly, concisely, and thoughtfully. Provide practical, actionable advice within 2-4 sentences.`
  };

  const fullMessages = [systemMessage, ...normalizedMessages];

  // 1. Try OpenRouter free tier API first
  if (ENV.OPENROUTER_API_KEY) {
    try {
      const openRouterReply = await fetchFromOpenRouter(fullMessages);
      if (openRouterReply) {
        return openRouterReply;
      }
    } catch (err) {
      console.warn('OpenRouter API call failed, falling back to worker:', err);
    }
  } else {
    console.warn('[Ask B-01] VITE_OPENROUTER_API_KEY is not configured in .env. OpenRouter requires an API key.');
  }

  // 2. Fallback to Cloudflare AI Worker
  try {
    const response = await fetch(getWorkerUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: fullMessages }),
    });

    if (response.ok) {
      const reply = await readWorkerResponse(response);
      if (reply) return reply;
    }
  } catch (err) {
    console.warn('B-01 worker failed:', err);
  }

  return buildFallbackCoachReply(userQuestion, progressContext);
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


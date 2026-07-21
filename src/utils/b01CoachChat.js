import ENV from '../config/env';

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

  if (normalizedQuestion.includes('summarize') || normalizedQuestion.includes('progress') || normalizedQuestion.includes('stats')) {
    return `You are at Level ${levelNumber} (${levelName}) with ${totalSessions} analyzed practice session${totalSessions === 1 ? '' : 's'} and an average score of ${averageScore}. Your latest session scored ${latest?.score ?? 'N/A'}%, your growth is ${growthText}%, and your strongest pillar is ${strongest}.`;
  }

  if (normalizedQuestion.includes('confidence') || normalizedQuestion.includes('improve')) {
    return `For confidence, keep your next answer simple: pause, breathe, then deliver one clear point with steady eye contact. Based on your data, lean on your ${strongest} strength while you build consistency through short daily practice.`;
  }

  if (normalizedQuestion.includes('tip') || normalizedQuestion.includes('tips') || normalizedQuestion.includes('practice')) {
    return `Try this next: record a 45-second answer, use one opening sentence, two supporting details, and one closing sentence. Focus on ${strongest} first, then review your pacing and filler words after the run.`;
  }

  return `I can help with that. Based on your current Level ${levelNumber} (${levelName}) profile, focus on one clear message, steady pacing, and a confident finish; your ${strongest} pillar is the best strength to build from right now.`;
}

async function readWorkerResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await response.json();
    return data.response || data.message || data.text || data.answer || '';
  }

  const text = await response.text();
  if (!text.trim()) return '';

  if (!text.includes('data:')) {
    return text.trim();
  }

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data: ') && !line.includes('[DONE]'))
    .map((line) => {
      try {
        const data = JSON.parse(line.slice(6));
        return data.response || data.message || data.text || '';
      } catch {
        return '';
      }
    })
    .join('')
    .trim();
}

export async function askB01Coach({ messages, progressContext }) {
  void progressContext;

  const normalizedMessages = normalizeMessages(messages);
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

export function getB01FallbackReply({ messages, progressContext }) {
  return buildFallbackCoachReply(getLatestUserQuestion(messages), progressContext);
}

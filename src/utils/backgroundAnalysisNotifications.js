const STORAGE_KEY = 'bigkas_background_analysis_notifications_v1';
const EVENT_NAME = 'bigkas-background-analysis-notification';
const MAX_ITEMS = 20;

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readAll() {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

function writeAll(items) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
}

export function pushBackgroundAnalysisNotification(payload) {
  if (typeof window === 'undefined') return;

  const item = {
    id: payload?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: String(payload?.title || '').trim() || 'Background Analysis',
    message: String(payload?.message || '').trim(),
    status: String(payload?.status || 'info').trim() || 'info',
    sessionId: payload?.sessionId || null,
    createdAt: payload?.createdAt || new Date().toISOString(),
    seen: false,
  };

  const items = readAll();
  items.push(item);
  writeAll(items);

  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: item }));
}

export function consumeNextBackgroundAnalysisNotification() {
  const items = readAll();
  const idx = items.findIndex((item) => item && item.seen === false);
  if (idx === -1) return null;

  const item = items[idx];
  items[idx] = { ...item, seen: true };
  writeAll(items);
  return item;
}

export function getAllBackgroundAnalysisNotifications() {
  if (typeof window === 'undefined') return [];
  return readAll().slice().reverse(); // Return in reverse chronological order
}

export function clearBackgroundAnalysisNotification(notificationId) {
  const items = readAll();
  const filtered = items.filter((item) => item?.id !== notificationId);
  writeAll(filtered);
}

export function clearAllBackgroundAnalysisNotifications() {
  writeAll([]);
}

export const BACKGROUND_ANALYSIS_NOTIFICATION_EVENT = EVENT_NAME;

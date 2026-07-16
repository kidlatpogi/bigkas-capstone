import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { HiOutlineUsers, HiOutlineChartBarSquare, HiOutlineHomeModern, HiOutlineCog6Tooth, HiCheckCircle, HiMagnifyingGlass, HiOutlineTrash, HiOutlinePencilSquare } from 'react-icons/hi2';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { ensureFreshAccessToken, supabase } from '../../lib/supabase';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import { getBigkasLevelFromScore, mapPercentToEntryScore } from '../../utils/activityProgress';
import { ENV } from '../../config/env';
import './AdminDashboardPage.css';

const SIDEBAR_WIDTH = 280;
const SERVICE_HEALTH_TIMEOUT_MS = 8000;
const DASHBOARD_QUERY_TIMEOUT_MS = 12000;
const SERVICE_HEALTH_CACHE_KEY = 'bigkas_admin_service_health_v1';
const SERVICE_HEALTH_CACHE_TTL_MS = 5 * 60 * 1000;
const ACTIVE_USERS_PER_PAGE = 5;
const BATCH_PREVIEW_ROWS_PER_PAGE = 5;
const STAGE_PASS_ROWS_PER_PAGE = 10;
const INDEPENDENT_LEARNERS_FILTER = 'independent-users';
const INDEPENDENT_LEARNERS_LABEL = 'Independent Users';
const DEFAULT_ADMIN_ACCESS_ROLE_ID = '00000000-0000-0000-0000-000000000101';
const STUDENT_ACCESS_ROLE_REVIEW_ID = 'bigkas-system-student-role';
const ADMIN_PERMISSION_ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
];
const ADMIN_PERMISSION_AREAS = [
  { key: 'overview', label: 'Overview', description: 'Dashboard summary', actions: ['view'] },
  { key: 'analytics', label: 'Analytics', description: 'Analytics workspace', actions: ['view'] },
  { key: 'users', label: 'Account Management', description: 'User and admin accounts', actions: ['view', 'create', 'update', 'delete'] },
  { key: 'activities', label: 'Activities', description: 'Activity content', actions: ['view', 'create', 'update', 'delete'] },
  { key: 'modules', label: 'Modules', description: 'Learning modules', actions: ['view', 'create', 'update', 'delete'] },
  { key: 'reports', label: 'Reports', description: 'Printable reports', actions: ['view', 'create'] },
  { key: 'audit', label: 'Audit Logs', description: 'System logs', actions: ['view'] },
];
const BATCH_STUDENT_TEMPLATE_COLUMNS = ['Last Name', 'First Name', 'Student Number', 'Email'];
const BATCH_TEACHER_TEMPLATE_COLUMNS = ['Last Name', 'First Name', 'Email'];
const STUDENT_ACCESS_ROLE_REVIEW = {
  id: STUDENT_ACCESS_ROLE_REVIEW_ID,
  name: 'User',
  description: 'Default user role for app access, practice activities, modules, progress, and profile settings.',
  system: true,
  scope: 'student',
  visibleAreas: ['Activities', 'Modules', 'Practice', 'Progress', 'Profile Settings'],
};
const USER_FORM_INITIAL = {
  email: '',
  first_name: '',
  last_name: '',
  username: '',
  student_number: '',
  section_id: '',
  role: 'user',
  current_level: 1,
  speaker_level: 1,
  speaker_points: 0,
};
const STAGE_PROGRESS_INITIAL = {
  journey: 1,
  completeThroughStage: 30,
  advanceJourney: true,
};
const ADMIN_FORM_INITIAL = {
  email: '',
  first_name: '',
  last_name: '',
  username: '',
  role: 'admin',
  access_role_id: DEFAULT_ADMIN_ACCESS_ROLE_ID,
};
const ADMIN_ACCESS_ROLE_FORM_INITIAL = {
  id: '',
  name: '',
  description: '',
  permissions: createPermissionState(false),
};

function createPermissionState(enabled = false) {
  return ADMIN_PERMISSION_AREAS.reduce((acc, area) => {
    acc[area.key] = area.actions.reduce((actions, action) => {
      actions[action] = enabled;
      return actions;
    }, {});
    return acc;
  }, {});
}

function createDefaultAccessRoles() {
  const adminPermissions = createPermissionState(true);
  adminPermissions.audit = { view: false };

  return [
    {
      id: DEFAULT_ADMIN_ACCESS_ROLE_ID,
      name: 'Admin',
      description: 'Default admin role for managing assigned sections, users, activities, and modules.',
      system: true,
      permissions: adminPermissions,
    },
  ];
}

function normalizeAccessRole(role) {
  const normalizedPermissions = createPermissionState(false);
  ADMIN_PERMISSION_AREAS.forEach((area) => {
    area.actions.forEach((action) => {
      normalizedPermissions[area.key][action] = Boolean(role?.permissions?.[area.key]?.[action]);
    });
  });
  return {
    id: role?.id || createAccessRoleId(role?.name || 'role'),
    name: String(role?.name || 'Untitled Role').trim() || 'Untitled Role',
    description: String(role?.description || '').trim(),
    system: Boolean(role?.system || role?.system_role),
    permissions: normalizedPermissions,
  };
}

function createAccessRoleId(name) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const slug = String(name || 'role').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'role';
  return `${slug}-${Date.now()}-0000-4000-8000-000000000000`;
}

function findAccessRole(roles, roleId) {
  return roles.find(role => role.id === roleId) || roles.find(role => role.id === DEFAULT_ADMIN_ACCESS_ROLE_ID) || roles[0] || null;
}

function findManagedAccessRole(roles, roleId) {
  if (roleId === STUDENT_ACCESS_ROLE_REVIEW_ID) return STUDENT_ACCESS_ROLE_REVIEW;
  return findAccessRole(roles, roleId);
}

function buildAccessRoles(roleRows = [], permissionRows = []) {
  const roleMap = new Map(createDefaultAccessRoles().map(role => [role.id, role]));

  roleRows.forEach((row) => {
    roleMap.set(row.id, normalizeAccessRole({
      id: row.id,
      name: row.name,
      description: row.description,
      system_role: row.system_role,
      permissions: {},
    }));
  });

  permissionRows.forEach((row) => {
    const roleTemplate = roleMap.get(row.role_id);
    if (!roleTemplate || !roleTemplate.permissions?.[row.area]) return;
    roleTemplate.permissions[row.area] = {
      view: Boolean(row.can_view),
      create: Boolean(row.can_create),
      update: Boolean(row.can_update),
      delete: Boolean(row.can_delete),
    };
  });

  return Array.from(roleMap.values());
}

function buildAccessAssignments(rows = []) {
  return rows.reduce((acc, row) => {
    if (row.admin_id && row.role_id) acc[row.admin_id] = row.role_id;
    return acc;
  }, {});
}

function permissionRowsFromRole(roleTemplate) {
  return ADMIN_PERMISSION_AREAS.map((area) => {
    const areaPermissions = roleTemplate.permissions?.[area.key] || {};
    return {
      role_id: roleTemplate.id,
      area: area.key,
      can_view: Boolean(areaPermissions.view),
      can_create: Boolean(areaPermissions.create),
      can_update: Boolean(areaPermissions.update),
      can_delete: Boolean(areaPermissions.delete),
    };
  });
}

function shiftRange(start, unit, amount) {
  const d = new Date(start);
  if (unit === 'day') d.setDate(d.getDate() + amount);
  else if (unit === 'week') d.setDate(d.getDate() + (7 * amount));
  else if (unit === 'month') d.setMonth(d.getMonth() + amount);
  else d.setFullYear(d.getFullYear() + amount);
  return d;
}

function getDisplayName(profile, fallbackId = '') {
  const full = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
  if (full) return full;
  if (profile?.username) return profile.username;
  return `User ${String(fallbackId).slice(0, 8)}`;
}

function getLearnerGroupLabel(profile, sectionById, sectionIdByStudentId, fallbackLabel = INDEPENDENT_LEARNERS_LABEL) {
  const sectionId = sectionIdByStudentId.get(profile?.id) || profile?.section_id || '';
  const section = sectionId ? sectionById.get(sectionId) : null;
  return section?.name || fallbackLabel;
}

function getAdminRoleLabel(profile, fallback = 'Admin') {
  if (profile?.role === 'superadmin') return 'Super Admin';
  if (profile?.role === 'admin') return 'Admin';
  if (profile?.role === 'user') return 'User';
  return fallback;
}

function getProfileEmail(profile) {
  return profile?.email || profile?.auth_email || profile?.login_email || profile?.profile_email || '-';
}

function getArchivedAt(profile) {
  if (profile?.archived_at === null || profile?.archived_at === undefined) return null;
  const archivedAt = String(profile.archived_at).trim();
  if (!archivedAt || archivedAt.toLowerCase() === 'null') return null;
  return archivedAt;
}

function getHealthUrl(baseUrl, path) {
  return `${String(baseUrl || '').replace(/\/+$/, '')}${path}`;
}

async function probeHealthEndpoint(url, options = {}) {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), SERVICE_HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      return {
        status: 'degraded',
        label: 'Starting',
        detail: 'Service returned startup page',
        latencyMs,
      };
    }

    if (!response.ok) {
      return {
        status: 'down',
        label: 'Offline',
        detail: `HTTP ${response.status}`,
        latencyMs,
      };
    }

    return {
      status: 'online',
      label: 'Healthy',
      detail: `HTTP ${response.status}`,
      latencyMs,
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function probeServiceHealth(candidates) {
  for (const candidate of candidates) {
    try {
      const result = await probeHealthEndpoint(candidate.url, candidate.options);
      if (result.status === 'online' || result.status === 'degraded') {
        return { ...result, checkedUrl: candidate.url };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          status: 'down',
          label: 'Timeout',
          detail: `No response within ${SERVICE_HEALTH_TIMEOUT_MS / 1000}s`,
          checkedUrl: candidate.url,
        };
      }
    }
  }

  return {
    status: 'down',
    label: 'Offline',
    detail: 'Health endpoint unavailable',
    checkedUrl: candidates[0]?.url || '',
  };
}

async function withTimeout(promise, label, timeoutMs = DASHBOARD_QUERY_TIMEOUT_MS) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(`${label} request timed out.`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getDefaultServiceHealth() {
  return {
    huggingFace: { status: 'checking', label: 'Checking', detail: 'Checking backend health', latencyMs: null },
    cloudflare: { status: 'checking', label: 'Checking', detail: 'Checking Worker health', latencyMs: null },
  };
}

function readCachedServiceHealth() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(SERVICE_HEALTH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.value || Date.now() - Number(parsed.timestamp || 0) > SERVICE_HEALTH_CACHE_TTL_MS) {
      window.localStorage.removeItem(SERVICE_HEALTH_CACHE_KEY);
      return null;
    }
    return parsed.value;
  } catch {
    window.localStorage.removeItem(SERVICE_HEALTH_CACHE_KEY);
    return null;
  }
}

function writeCachedServiceHealth(value) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(SERVICE_HEALTH_CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      value,
    }));
  } catch {
    // Health cache is an optimization only.
  }
}

function isDeletedProfile(profile) {
  return Boolean(getArchivedAt(profile));
}

function isAdminProfile(profile) {
  return profile?.role === 'admin' || profile?.role === 'superadmin';
}

function normalizeAdminLevelNumber(value) {
  const level = Number(value);
  if (!Number.isFinite(level)) return null;
  const rounded = Math.round(level);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

function normalizeAdminEntryScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score) || score <= 0) return null;
  if (score > 5 && score <= 100) return mapPercentToEntryScore(score);
  if (score < 1 || score > 5) return null;
  return Math.round(score * 100) / 100;
}

function firstElevatedAdminLevel(values) {
  for (const value of values) {
    const level = normalizeAdminLevelNumber(value);
    if (level && level > 1) return level;
  }
  return null;
}

function firstValidAdminLevel(values) {
  for (const value of values) {
    const level = normalizeAdminLevelNumber(value);
    if (level) return level;
  }
  return null;
}

function resolveAdminEntryScore(profile) {
  const direct = normalizeAdminEntryScore(profile?.speaker_entry_score);
  if (direct) return direct;

  const finalScore = Number(profile?.onboarding_level_analysis?.final_score);
  if (Number.isFinite(finalScore) && finalScore > 0) {
    return mapPercentToEntryScore(finalScore);
  }

  return normalizeAdminEntryScore(profile?.diagnostic_score);
}

function getSpeakerLevelValue(profile) {
  const entryScore = resolveAdminEntryScore(profile);
  const derivedFromEntry = entryScore
    ? normalizeAdminLevelNumber(getBigkasLevelFromScore(entryScore)?.levelNumber)
    : null;
  const assessedLevels = [
    profile?.speaker_level_number,
    profile?.onboarding_level_analysis?.estimated_level_number,
  ];
  const progressLevels = [
    profile?.progress_level_number,
  ];
  const legacyLevels = [
    profile?.speaker_level,
    profile?.current_level,
  ];

  return (
    firstElevatedAdminLevel(assessedLevels) ||
    (derivedFromEntry && derivedFromEntry > 1 ? derivedFromEntry : null) ||
    firstElevatedAdminLevel(progressLevels) ||
    firstElevatedAdminLevel(legacyLevels) ||
    derivedFromEntry ||
    firstValidAdminLevel(assessedLevels) ||
    firstValidAdminLevel(progressLevels) ||
    firstValidAdminLevel(legacyLevels) ||
    1
  );
}

function getProgressLevelValue(profile) {
  return firstValidAdminLevel([
    profile?.progress_level_number,
    profile?.current_level,
    profile?.onboarding_level_analysis?.estimated_level_number,
    profile?.speaker_level_number,
  ]) || 1;
}

function getAuditActionClass(action) {
  const normalized = String(action || '').toLowerCase();
  if (['create', 'update', 'delete', 'restore'].includes(normalized)) return `is-${normalized}`;
  if (normalized.startsWith('login_')) return 'is-security';
  return 'is-default';
}

function formatAuditAction(action) {
  const normalized = String(action || '').trim();
  if (!normalized) return 'Unknown';
  if (normalized === 'login_locked') return 'Account Locked';
  return normalized
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function getAuthSecurityAuditAction(event) {
  const metadata = event?.metadata || {};
  const reasonCode = String(event?.reason_code || '').toLowerCase();
  const eventType = String(event?.event_type || '').toLowerCase();

  if (
    eventType === 'login_blocked' ||
    reasonCode === 'account_locked' ||
    metadata.locked === true
  ) {
    return 'login_locked';
  }

  return eventType || 'login_failed';
}

function normalizeAuthSecurityEvent(event) {
  return {
    id: `auth-security-${event.id}`,
    actor_id: event.user_id || null,
    action: getAuthSecurityAuditAction(event),
    entity_type: 'auth_security',
    entity_id: event.user_id || null,
    old_values: null,
    new_values: {
      scope: event.scope,
      email_hash: event.email_hash,
      email_domain: event.email_domain,
      reason_code: event.reason_code,
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      metadata: event.metadata || {},
    },
    created_at: event.created_at,
    is_security_event: true,
  };
}

function getSessionDurationMinutes(session) {
  const seconds = Number(session?.duration_sec ?? session?.duration ?? session?.duration_seconds ?? 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return seconds / 60;
}

function getTimestamp(value) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getSessionUserId(session) {
  return session?.user_id || session?.profile_id || session?.student_id || session?.userId || '';
}

function getSessionActivityTimestamp(session) {
  return Math.max(
    getTimestamp(session?.created_at),
    getTimestamp(session?.updated_at),
    getTimestamp(session?.completed_at),
    getTimestamp(session?.timestamp),
    getTimestamp(session?.date)
  );
}

function getProfileActivityTimestamp(profile) {
  if (!profile) return 0;
  return Math.max(
    getTimestamp(profile.last_active_at),
    getTimestamp(profile.last_seen_at),
    getTimestamp(profile.last_login_at),
    getTimestamp(profile.last_sign_in_at),
    getTimestamp(profile.updated_at)
  );
}

function getActiveUserIdsForRange(users, sessions, startDate, endDate) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const userIds = new Set(users.map(user => user.id));
  const activeIds = new Set();

  sessions.forEach((session) => {
    const sessionUserId = getSessionUserId(session);
    if (!userIds.has(sessionUserId)) return;
    const timestamp = getSessionActivityTimestamp(session);
    if (timestamp >= start && timestamp < end) activeIds.add(sessionUserId);
  });

  users.forEach((user) => {
    const timestamp = getProfileActivityTimestamp(user);
    if (timestamp >= start && timestamp < end) activeIds.add(user.id);
  });

  return activeIds;
}

function normalizeDashboardScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score) || score <= 0) return null;
  if (score <= 5) return ((Math.min(Math.max(score, 1), 5) - 1) / 4) * 100;
  return Math.min(Math.max(score, 0), 100);
}

function averageDashboardScore(values) {
  const valid = values.map(normalizeDashboardScore).filter(Number.isFinite);
  if (!valid.length) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function getDashboardSessionScore(session, metricsRow) {
  const verbalScore = normalizeDashboardScore(firstFiniteNumber(metricsRow?.verbal, session?.verbal_score, session?.context_score));
  const vocalScore = normalizeDashboardScore(firstFiniteNumber(metricsRow?.vocal, session?.vocal_score, session?.acoustic_score));
  const visualScore = normalizeDashboardScore(firstFiniteNumber(metricsRow?.visual, session?.visual_score));

  if ([verbalScore, vocalScore, visualScore].every(Number.isFinite)) {
    return (verbalScore * 0.07) + (vocalScore * 0.38) + (visualScore * 0.55);
  }

  return firstFiniteNumber(session?.confidence_score, session?.score, metricsRow?.confidence, metricsRow?.overall);
}

function getAnalyticsMetricScore(session, metricsRow, metric) {
  if (metric === 'visual') return firstFiniteNumber(metricsRow?.visual, session?.visual_score);
  if (metric === 'vocal') return firstFiniteNumber(metricsRow?.vocal, session?.vocal_score, session?.acoustic_score);
  if (metric === 'verbal') return firstFiniteNumber(metricsRow?.verbal, session?.verbal_score, session?.context_score);
  return getDashboardSessionScore(session, metricsRow);
}

const CONFIDENCE_LEVELS = [
  { level: 1, range: '1-5 activities', label: 'New Speaker', min: 1, max: 5 },
  { level: 2, range: '6-10 activities', label: 'Developing Speaker', min: 6, max: 10 },
  { level: 3, range: '11-15 activities', label: 'Emerging Confidence', min: 11, max: 15 },
  { level: 4, range: '16-20 activities', label: 'Confident Speaker', min: 16, max: 20 },
  { level: 5, range: '21-30 activities', label: 'Advanced Speaker', min: 21, max: 30 },
];

function getConfidenceLevel(completedActivities) {
  const count = Math.max(0, Number(completedActivities) || 0);
  if (count <= 0) return { level: 0, range: '0 activities', label: 'No activity yet', min: 0, max: 0 };
  return CONFIDENCE_LEVELS.find(level => count >= level.min && count <= level.max) || CONFIDENCE_LEVELS[CONFIDENCE_LEVELS.length - 1];
}

function inferActivityFocus(activity) {
  const haystack = [
    activity?.skill_focus,
    activity?.target_skill,
    activity?.focus,
    activity?.analysis_type,
    activity?.category,
    activity?.phase_name,
    activity?.title,
    activity?.objective,
    activity?.description,
    activity?.instructions,
  ].filter(Boolean).join(' ').toLowerCase();

  const focus = [];
  if (haystack.includes('visual') || haystack.includes('gesture') || haystack.includes('eye contact') || haystack.includes('posture')) focus.push('Visual');
  if (haystack.includes('vocal') || haystack.includes('voice') || haystack.includes('pronunciation') || haystack.includes('pace') || haystack.includes('volume')) focus.push('Vocal');
  if (haystack.includes('verbal') || haystack.includes('clarity') || haystack.includes('word') || haystack.includes('structure') || haystack.includes('message')) focus.push('Verbal');

  return focus;
}

function formatActivityFocus(activitiesInRange) {
  const focusCounts = new Map();
  activitiesInRange.forEach((activity) => {
    inferActivityFocus(activity).forEach((focus) => {
      focusCounts.set(focus, (focusCounts.get(focus) || 0) + 1);
    });
  });

  const focus = ['Visual', 'Vocal', 'Verbal'].filter(label => focusCounts.has(label));
  if (focus.length) return focus.join(', ');
  return activitiesInRange.length ? 'Mixed skills' : '-';
}

function clampActivityProgress(count) {
  return Math.min(Math.max(0, Number(count) || 0), 30);
}

function escapeXmlCell(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getExcelColumnName(index) {
  let value = index;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function getExcelCellRef(rowIndex, columnIndex) {
  return `${getExcelColumnName(columnIndex)}${rowIndex}`;
}

function normalizeBatchHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getBatchTemplateColumns(accountType) {
  return accountType === 'admin' ? BATCH_TEACHER_TEMPLATE_COLUMNS : BATCH_STUDENT_TEMPLATE_COLUMNS;
}

function getBatchColumnKey(header) {
  const normalized = normalizeBatchHeader(header);
  if (normalized === 'lastname' || normalized === 'surname') return 'last_name';
  if (normalized === 'firstname' || normalized === 'firsname' || normalized === 'givenname') return 'first_name';
  if (normalized === 'studentnumber' || normalized === 'studentno' || normalized === 'studentid') return 'student_number';
  if (normalized === 'email' || normalized === 'emailaddress') return 'email';
  return '';
}

function parseDelimitedText(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === ',') {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell.trim());
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(value => value !== '')) rows.push(row);
  return rows;
}

function findZipEndOfCentralDirectory(view) {
  for (let i = view.byteLength - 22; i >= 0; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) return i;
  }
  return -1;
}

async function inflateZipBytes(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot read Excel files yet. Save the sheet as CSV and upload it again.');
  }

  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
}

async function readZipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const decoder = new TextDecoder();
  const endOffset = findZipEndOfCentralDirectory(view);

  if (endOffset < 0) {
    throw new Error('This Excel file could not be read. Please upload a valid .xlsx or .csv file.');
  }

  const entryCount = view.getUint16(endOffset + 10, true);
  let centralOffset = view.getUint32(endOffset + 16, true);
  const entries = new Map();

  for (let i = 0; i < entryCount; i += 1) {
    if (view.getUint32(centralOffset, true) !== 0x02014b50) break;
    const method = view.getUint16(centralOffset + 10, true);
    const compressedSize = view.getUint32(centralOffset + 20, true);
    const nameLength = view.getUint16(centralOffset + 28, true);
    const extraLength = view.getUint16(centralOffset + 30, true);
    const commentLength = view.getUint16(centralOffset + 32, true);
    const localOffset = view.getUint32(centralOffset + 42, true);
    const name = decoder.decode(bytes.slice(centralOffset + 46, centralOffset + 46 + nameLength));

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    const content = method === 0 ? compressed : await inflateZipBytes(compressed);
    entries.set(name, content);

    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function getXmlTextContent(node, tagName) {
  return Array.from(node.getElementsByTagName(tagName)).map(child => child.textContent || '').join('');
}

function getXlsxSharedStrings(xml) {
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return Array.from(doc.getElementsByTagName('si')).map(si => getXmlTextContent(si, 't'));
}

function getColumnIndexFromCellRef(ref) {
  const letters = String(ref || '').match(/[A-Z]+/i)?.[0] || 'A';
  return letters.toUpperCase().split('').reduce((sum, char) => (sum * 26) + char.charCodeAt(0) - 64, 0) - 1;
}

function parseXlsxWorksheet(xml, sharedStrings) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return Array.from(doc.getElementsByTagName('row')).map((row) => {
    const values = [];
    Array.from(row.getElementsByTagName('c')).forEach((cell, fallbackIndex) => {
      const index = cell.getAttribute('r') ? getColumnIndexFromCellRef(cell.getAttribute('r')) : fallbackIndex;
      const type = cell.getAttribute('t');
      const rawValue = type === 'inlineStr' ? getXmlTextContent(cell, 't') : cell.getElementsByTagName('v')[0]?.textContent || '';
      values[index] = type === 's' ? sharedStrings[Number(rawValue)] || '' : rawValue;
    });
    return values.map(value => String(value || '').trim());
  }).filter(row => row.some(value => value !== ''));
}

async function parseBatchSpreadsheetFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'csv') {
    return parseDelimitedText(await file.text());
  }
  if (extension === 'xls') {
    throw new Error('Old .xls files are not supported yet. Please save the template as .xlsx or .csv.');
  }
  if (extension !== 'xlsx') {
    throw new Error('Upload a .xlsx or .csv file.');
  }

  const entries = await readZipEntries(await file.arrayBuffer());
  const decoder = new TextDecoder();
  const readText = name => (entries.has(name) ? decoder.decode(entries.get(name)) : '');
  const sharedStrings = getXlsxSharedStrings(readText('xl/sharedStrings.xml'));
  const worksheetName = Array.from(entries.keys()).find(name => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name)) || 'xl/worksheets/sheet1.xml';
  const worksheetXml = readText(worksheetName);

  if (!worksheetXml) {
    throw new Error('No worksheet was found in the Excel file.');
  }

  return parseXlsxWorksheet(worksheetXml, sharedStrings);
}

function buildBatchPreview(matrix, accountType) {
  const rows = matrix.filter(row => row.some(value => String(value || '').trim()));
  if (!rows.length) {
    return {
      columns: [],
      rows: [],
      invalidRows: [],
      missingColumns: getBatchTemplateColumns(accountType),
    };
  }

  const headerRow = rows[0];
  const columnMap = headerRow.reduce((acc, header, index) => {
    const key = getBatchColumnKey(header);
    if (key) acc[key] = index;
    return acc;
  }, {});
  const requiredKeys = ['last_name', 'first_name', 'email'];
  const labelsByKey = {
    last_name: 'Last Name',
    first_name: 'First Name',
    student_number: 'Student Number',
    email: 'Email',
  };
  const missingColumns = requiredKeys
    .filter(key => columnMap[key] === undefined)
    .map(key => labelsByKey[key]);

  const parsedRows = rows.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    last_name: row[columnMap.last_name] || '',
    first_name: row[columnMap.first_name] || '',
    student_number: row[columnMap.student_number] || '',
    email: row[columnMap.email] || '',
  })).filter(row => row.last_name || row.first_name || row.student_number || row.email);
  const invalidRows = parsedRows.filter(row => (
    !row.last_name
    || !row.first_name
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)
  ));

  return {
    columns: headerRow,
    rows: parsedRows,
    invalidRows,
    missingColumns,
  };
}

function isExcelNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed !== '' && /^-?\d+(\.\d+)?$/.test(trimmed);
}

function createExcelCell(value, rowIndex, columnIndex, styleIndex = 0) {
  const ref = getExcelCellRef(rowIndex, columnIndex);
  const styleAttr = styleIndex ? ` s="${styleIndex}"` : '';
  if (isExcelNumber(value)) {
    return `<c r="${ref}"${styleAttr}><v>${Number(value)}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t>${escapeXmlCell(value)}</t></is></c>`;
}

function buildReportWorksheetXml(title, headers, rows) {
  const allRows = [
    [title],
    headers,
    ...rows,
  ];
  const columnCount = Math.max(headers.length, 1);
  const rowXml = allRows.map((row, rowIndex) => {
    const excelRow = rowIndex + 1;
    const styleIndex = rowIndex === 0 ? 1 : rowIndex === 1 ? 2 : 0;
    const cells = Array.from({ length: columnCount }).map((_, columnIndex) => (
      createExcelCell(row[columnIndex] ?? '', excelRow, columnIndex + 1, styleIndex)
    )).join('');
    return `<row r="${excelRow}">${cells}</row>`;
  }).join('');
  const lastCell = getExcelCellRef(allRows.length, columnCount);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastCell}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${Array.from({ length: columnCount }).map((_, index) => `<col min="${index + 1}" max="${index + 1}" width="${index === 0 ? 28 : 18}" customWidth="1"/>`).join('')}</cols>
  <sheetData>${rowXml}</sheetData>
  <mergeCells count="1"><mergeCell ref="A1:${getExcelCellRef(1, columnCount)}"/></mergeCells>
</worksheet>`;
}

let zipCrcTable = null;

function getZipCrcTable() {
  if (zipCrcTable) return zipCrcTable;
  zipCrcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    zipCrcTable[i] = value >>> 0;
  }
  return zipCrcTable;
}

function getZipCrc32(bytes) {
  const table = getZipCrcTable();
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function getZipDosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosDate, dosTime };
}

function createZipPart(size, writer) {
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  writer(bytes, view);
  return bytes;
}

function concatZipParts(parts) {
  const totalSize = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalSize);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function createZipArchive(files) {
  const encoder = new TextEncoder();
  const { dosDate, dosTime } = getZipDosDateTime();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = getZipCrc32(contentBytes);
    const localOffset = offset;
    const localHeader = createZipPart(30 + nameBytes.length, (bytes, view) => {
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, dosTime, true);
      view.setUint16(12, dosDate, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, contentBytes.length, true);
      view.setUint32(22, contentBytes.length, true);
      view.setUint16(26, nameBytes.length, true);
      view.setUint16(28, 0, true);
      bytes.set(nameBytes, 30);
    });
    localParts.push(localHeader, contentBytes);
    offset += localHeader.length + contentBytes.length;

    centralParts.push(createZipPart(46 + nameBytes.length, (bytes, view) => {
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, dosTime, true);
      view.setUint16(14, dosDate, true);
      view.setUint32(16, crc, true);
      view.setUint32(20, contentBytes.length, true);
      view.setUint32(24, contentBytes.length, true);
      view.setUint16(28, nameBytes.length, true);
      view.setUint16(30, 0, true);
      view.setUint16(32, 0, true);
      view.setUint16(34, 0, true);
      view.setUint16(36, 0, true);
      view.setUint32(38, 0, true);
      view.setUint32(42, localOffset, true);
      bytes.set(nameBytes, 46);
    }));
  });

  const centralDirectory = concatZipParts(centralParts);
  const endRecord = createZipPart(22, (bytes, view) => {
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, files.length, true);
    view.setUint16(10, files.length, true);
    view.setUint32(12, centralDirectory.length, true);
    view.setUint32(16, offset, true);
    view.setUint16(20, 0, true);
  });

  return concatZipParts([...localParts, centralDirectory, endRecord]);
}

function downloadReportWorkbook(filename, title, headers, rows) {
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
  const worksheetXml = buildReportWorksheetXml(title, headers, rows);
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFFAF6"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  const files = [
    { name: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
    { name: '_rels/.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/worksheets/sheet1.xml', content: worksheetXml },
    { name: 'xl/styles.xml', content: stylesXml },
    { name: 'docProps/core.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXmlCell(title)}</dc:title><dc:creator>Bigkas</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>` },
    { name: 'docProps/app.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Bigkas</Application></Properties>` },
  ];
  const archive = createZipArchive(files);
  const blob = new Blob([archive], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getSectionStudentStudentId(row) {
  return row?.student_id || row?.profile_id || row?.user_id || row?.student?.id || '';
}

function getSectionStudentSectionId(row) {
  return row?.section_id || row?.section?.id || '';
}

function mergeSectionStudentRows(...sources) {
  const map = new Map();
  sources.flat().forEach((row) => {
    const studentId = getSectionStudentStudentId(row);
    const sectionId = getSectionStudentSectionId(row);
    if (!studentId || !sectionId) return;
    map.set(studentId, { ...row, student_id: studentId, section_id: sectionId });
  });
  return Array.from(map.values());
}

function AdminUserField({ label, help, children }) {
  return (
    <label className="admin-user-field">
      <span>{label}</span>
      {help && <small>{help}</small>}
      {children}
    </label>
  );
}

function AdminLevelSelect({ value, onChange, label }) {
  return (
    <select value={String(value || 1)} onChange={onChange} aria-label={label}>
      {[1, 2, 3, 4, 5].map(level => (
        <option key={level} value={level}>
          Level {level}
        </option>
      ))}
    </select>
  );
}

function clampJourneyLevel(value) {
  return Math.min(5, Math.max(1, Number(value) || 1));
}

function clampStageNumber(value, maxStage = 30) {
  const max = Math.max(1, Number(maxStage) || 30);
  return Math.min(max, Math.max(1, Number(value) || 1));
}

function getAccountInviteRedirectUrl() {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}${ROUTES.CREATE_PASSWORD}`;
}

async function createConfirmedAdminUser(payload) {
  const { data, error } = await supabase.functions.invoke('admin-create-confirmed-user', {
    body: payload,
  });

  if (error) {
    let functionMessage = '';
    try {
      const details = await error.context?.json?.();
      functionMessage = details?.error || details?.message || '';
    } catch {
      functionMessage = '';
    }
    throw new Error(functionMessage || error.message || 'Failed to create account.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.user?.id) {
    throw new Error('Account was not created.');
  }

  return data;
}

async function setProfileArchiveStateWithAdminFunction(userId, shouldArchive) {
  const { data, error } = await supabase.functions.invoke('admin-set-profile-archive-state', {
    body: {
      user_id: userId,
      should_archive: shouldArchive,
    },
  });

  if (error) {
    let functionMessage = '';
    try {
      const details = await error.context?.json?.();
      functionMessage = details?.error || details?.message || '';
    } catch {
      functionMessage = '';
    }
    throw new Error(functionMessage || error.message || 'Failed to update profile archive state.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.profile?.id) {
    throw new Error('Profile archive state was not updated.');
  }

  return data.profile;
}

async function updateProfileWithAdminFunction(userId, payload) {
  const { data, error } = await supabase.functions.invoke('admin-update-profile', {
    body: {
      user_id: userId,
      ...payload,
    },
  });

  if (error) {
    let functionMessage = '';
    try {
      const details = await error.context?.json?.();
      functionMessage = details?.error || details?.message || '';
    } catch {
      functionMessage = '';
    }
    throw new Error(functionMessage || error.message || 'Failed to update user.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.profile?.id) {
    throw new Error('Profile was not updated.');
  }

  return data.profile;
}

async function applyStageProgressWithAdminFunction(userId, payload) {
  const { data, error } = await supabase.functions.invoke('admin-apply-stage-progress', {
    body: {
      user_id: userId,
      ...payload,
    },
  });

  if (error) {
    let functionMessage = '';
    try {
      const details = await error.context?.json?.();
      functionMessage = details?.error || details?.message || '';
    } catch {
      functionMessage = '';
    }
    throw new Error(functionMessage || error.message || 'Failed to apply stage progress.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.ok) {
    throw new Error('Stage progress was not updated.');
  }

  return data;
}

async function fetchAdminDirectory(options = {}) {
  const { session, error: refreshError } = await ensureFreshAccessToken(null, { force: Boolean(options.forceRefreshToken) });
  if (refreshError) {
    throw new Error(refreshError.message || 'Unable to refresh management session.');
  }

  const { data, error } = await supabase.functions.invoke('admin-list-profiles', {
    body: {
      include_analytics: Boolean(options.includeAnalytics),
    },
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : undefined,
  });

  if (error) {
    let functionMessage = '';
    try {
      const details = await error.context?.json?.();
      functionMessage = details?.error || details?.message || '';
    } catch {
      functionMessage = '';
    }
    throw new Error(functionMessage || error.message || 'Failed to load profiles.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!Array.isArray(data?.profiles)) {
    throw new Error('Profiles were not loaded.');
  }

  const sectionStudents = Array.isArray(data?.section_students) ? data.section_students : [];
  const sectionIdByProfileId = new Map(
    sectionStudents
      .map(row => [getSectionStudentStudentId(row), getSectionStudentSectionId(row)])
      .filter(([studentId, sectionId]) => studentId && sectionId)
  );

  return {
    profiles: data.profiles.map(profile => ({
      ...profile,
      email: profile.email || profile.auth_email || profile.profile_email || null,
      auth_email: profile.auth_email || null,
      profile_email: profile.profile_email || profile.email || null,
      section_id: profile.section_id || sectionIdByProfileId.get(profile.id) || null,
    })),
    sectionStudents,
    sessions: Array.isArray(data?.sessions) ? data.sessions : null,
    metrics: Array.isArray(data?.session_metrics) ? data.session_metrics : null,
  };
}

function userToForm(user) {
  return {
    email: '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || '',
    student_number: user?.student_number || '',
    section_id: '',
    role: user?.role || 'user',
    current_level: getProgressLevelValue(user),
    speaker_level: getSpeakerLevelValue(user),
    speaker_points: user?.speaker_points || 0,
  };
}

function AdminDashboardPage() {
  const navigate = useNavigate();
  const { logout } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState('');
  const [currentAdminId, setCurrentAdminId] = useState('');
  const [activePage, setActivePage] = useState('overview');

  const [profiles, setProfiles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [activityCompletions, setActivityCompletions] = useState([]);
  const [, setServiceHealth] = useState(() => readCachedServiceHealth() || getDefaultServiceHealth());
  const [auditLogs, setAuditLogs] = useState([]);
  const [authSecurityEvents, setAuthSecurityEvents] = useState([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditEntityFilter, setAuditEntityFilter] = useState('all');
  const [auditPage, setAuditPage] = useState(1);
  const AUDIT_PER_PAGE = 15;
  const [inspectingLog, setInspectingLog] = useState(null);
  const [adminStatusFilter, setAdminStatusFilter] = useState('active');
  const [editingUser, setEditingUser] = useState(null);
  const [pendingArchiveUser, setPendingArchiveUser] = useState(null);
  const [pendingDeleteConfirmation, setPendingDeleteConfirmation] = useState(null);
  const [stageProgressForm, setStageProgressForm] = useState(STAGE_PROGRESS_INITIAL);
  const [pendingStageProgress, setPendingStageProgress] = useState(null);
  const [applyingStageProgress, setApplyingStageProgress] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userAccountTypeFilter, setUserAccountTypeFilter] = useState('users');
  const [userLevelFilter, setUserLevelFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userSortKey, setUserSortKey] = useState('name_asc');
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 10;
  const [analyticsRange, setAnalyticsRange] = useState('30');
  const [analyticsSectionFilter, setAnalyticsSectionFilter] = useState('all');
  const [analyticsSpeakerLevelFilter, setAnalyticsSpeakerLevelFilter] = useState('all');
  const [analyticsStagePage, setAnalyticsStagePage] = useState(1);
  const [activities, setActivities] = useState([]);
  const [modules, setModules] = useState([]);
  const [sections, setSections] = useState([]);
  const [sectionStudents, setSectionStudents] = useState([]);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [contentTab, setContentTab] = useState('activities');
  const [creatingContent, setCreatingContent] = useState(false);
  const [editingContent, setEditingContent] = useState(null);
  const [contentPage, setContentPage] = useState(1);
  const [contentLevelFilter, setContentLevelFilter] = useState('all');
  const CONTENT_PER_PAGE = 10;
  const [contentLevelLimit, setContentLevelLimit] = useState(5);
  const [pendingContentSave, setPendingContentSave] = useState(null);
  const [pendingLevelAdd, setPendingLevelAdd] = useState(null);

  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [createAdminForm, setCreateAdminForm] = useState(ADMIN_FORM_INITIAL);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [adminAccountForm, setAdminAccountForm] = useState(ADMIN_FORM_INITIAL);
  const [adminAccessRoles, setAdminAccessRoles] = useState(createDefaultAccessRoles);
  const [adminAccessAssignments, setAdminAccessAssignments] = useState({});
  const [adminAccessRoleForm, setAdminAccessRoleForm] = useState(ADMIN_ACCESS_ROLE_FORM_INITIAL);
  const [selectedAccessRoleId, setSelectedAccessRoleId] = useState(DEFAULT_ADMIN_ACCESS_ROLE_ID);
  const [sectionForm, setSectionForm] = useState({ id: '', name: '', teacher_id: '' });
  const [batchAccountType, setBatchAccountType] = useState('user');
  const [batchAccessRoleId, setBatchAccessRoleId] = useState(DEFAULT_ADMIN_ACCESS_ROLE_ID);
  const [batchSectionId, setBatchSectionId] = useState('');
  const [batchImportFile, setBatchImportFile] = useState(null);
  const [batchImportStatus, setBatchImportStatus] = useState('idle');
  const [batchImportError, setBatchImportError] = useState('');
  const [batchPreview, setBatchPreview] = useState(null);
  const [batchPreviewPage, setBatchPreviewPage] = useState(1);
  const [reportType, setReportType] = useState('teachers');
  const [toastMessage, setToastMessage] = useState(null);
  const [showActiveUsersModal, setShowActiveUsersModal] = useState(false);
  const [showAccessRoleModal, setShowAccessRoleModal] = useState(false);
  const [showBatchAccountModal, setShowBatchAccountModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [activeUsersPage, setActiveUsersPage] = useState(1);
  const [activityStatusFilter, setActivityStatusFilter] = useState('all');
  const [successModal, setSuccessModal] = useState(null);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isSuperadmin = role === 'superadmin';
  const currentAdminAccessRole = useMemo(
    () => findAccessRole(adminAccessRoles, adminAccessAssignments[currentAdminId]),
    [adminAccessRoles, adminAccessAssignments, currentAdminId]
  );
  const currentAdminPermissions = useMemo(
    () => currentAdminAccessRole?.permissions || createPermissionState(false),
    [currentAdminAccessRole]
  );
  const canUseAdminPermission = (area, action = 'view') => (
    isSuperadmin || Boolean(currentAdminPermissions?.[area]?.[action])
  );

  useEffect(() => {
    if (isSuperadmin) return;
    const pagePermissionMap = {
      overview: ['overview'],
      analytics: ['analytics'],
      users: ['users'],
      content: ['activities', 'modules'],
      reports: ['reports'],
    };
    const requiredAreas = pagePermissionMap[activePage] || ['overview'];
    if (!requiredAreas.some(area => Boolean(currentAdminPermissions?.[area]?.view))) {
      setActivePage('overview');
    }
  }, [activePage, currentAdminPermissions, isSuperadmin]);

  useEffect(() => {
    if (activePage !== 'content' || isSuperadmin) return;
    const canViewActivities = Boolean(currentAdminPermissions?.activities?.view);
    const canViewModules = Boolean(currentAdminPermissions?.modules?.view);
    if (contentTab === 'activities' && !canViewActivities && canViewModules) setContentTab('modules');
    if (contentTab === 'modules' && !canViewModules && canViewActivities) setContentTab('activities');
  }, [activePage, contentTab, currentAdminPermissions, isSuperadmin]);

  useEffect(() => {
    if (selectedAccessRoleId === STUDENT_ACCESS_ROLE_REVIEW_ID) return;
    if (adminAccessRoles.some(roleTemplate => roleTemplate.id === selectedAccessRoleId)) return;
    setSelectedAccessRoleId(adminAccessRoles[0]?.id || DEFAULT_ADMIN_ACCESS_ROLE_ID);
  }, [adminAccessRoles, selectedAccessRoleId]);

  useEffect(() => {
    let active = true;
    async function loadCore() {
      setLoading(true);
      setError('');
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user?.id) throw new Error('Unable to verify management session.');

        const { data: roleProfile, error: roleError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();

        if (roleError || !roleProfile) throw new Error('Admin or Super Admin profile not found.');
        if (roleProfile.role !== 'admin' && roleProfile.role !== 'superadmin') {
          await supabase.auth.signOut();
          navigate(ROUTES.ADMIN_LOGIN_BASE, { replace: true });
          throw new Error('Access denied: Admin or Super Admin privileges required.');
        }

        if (!active) return;
        setCurrentAdminId(authData.user.id);
        setRole(roleProfile.role);

        const results = await Promise.allSettled([
          withTimeout(fetchAdminDirectory({ includeAnalytics: true }), 'Profiles'),
          withTimeout(supabase.from('sessions').select('*').order('created_at', { ascending: true }), 'Sessions'),
          withTimeout(supabase.from('session_metrics').select('session_id, overall_score, visual_score, vocal_score, verbal_score, visual_avg, vocal_avg, verbal_avg, confidence_score, pronunciation_score'), 'Session metrics'),
          withTimeout(supabase.from('activities').select('*').order('target_level', { ascending: true }).order('activity_order', { ascending: true }), 'Activities'),
          withTimeout(supabase.from('modules').select('*').order('level_number', { ascending: true }).order('lesson_number', { ascending: true }), 'Modules'),
          withTimeout(supabase.from('user_activity_completions').select('*').order('completed_at', { ascending: false }), 'Activity completions'),
          withTimeout(supabase.from('admin_access_roles').select('*').order('created_at', { ascending: true }), 'Access roles'),
          withTimeout(supabase.from('admin_role_permissions').select('*'), 'Role permissions'),
          withTimeout(supabase.from('admin_role_assignments').select('*'), 'Role assignments'),
          withTimeout(supabase.from('sections').select('*').order('created_at', { ascending: false }), 'Sections'),
          withTimeout(supabase.from('section_students').select('*'), 'Section students'),
        ]);

        const [
          adminProfilesResult,
          sessionsResult,
          metricsResult,
          activitiesResult,
          modulesResult,
          completionsResult,
          accessRolesResult,
          rolePermissionsResult,
          roleAssignmentsResult,
          sectionsResult,
          sectionStudentsResult,
        ] = results;

        const getResultData = (result, label) => {
          if (result.status === 'rejected') {
            console.warn(`[AdminDashboard] ${label} load failed:`, result.reason?.message || result.reason);
            return [];
          }

          if (result.value?.error) {
            console.warn(`[AdminDashboard] ${label} load failed:`, result.value.error.message);
            return [];
          }

          return Array.isArray(result.value) ? result.value : (result.value?.data || []);
        };

        const directoryData = adminProfilesResult.status === 'fulfilled' && !adminProfilesResult.value?.error
          ? adminProfilesResult.value
          : { profiles: [], sectionStudents: [] };
        const hasFunctionSessions = Array.isArray(directoryData.sessions);
        const hasFunctionMetrics = Array.isArray(directoryData.metrics);
        const failedLabels = results
          .map((result, index) => ({
            result,
            label: ['profiles', 'sessions', 'metrics', 'activities', 'modules', 'activity completions', 'access roles', 'role permissions', 'role assignments', 'sections', 'section students'][index],
          }))
          .filter(({ label }) => !((label === 'sessions' && hasFunctionSessions) || (label === 'metrics' && hasFunctionMetrics)))
          .filter(({ result }) => result.status === 'rejected' || result.value?.error)
          .map(({ label }) => label);

        if (!active) return;
        setProfiles(directoryData.profiles || []);
        setSessions(hasFunctionSessions ? directoryData.sessions : getResultData(sessionsResult, 'Sessions'));
        setMetrics(hasFunctionMetrics ? directoryData.metrics : getResultData(metricsResult, 'Session metrics'));
        setActivities(getResultData(activitiesResult, 'Activities'));
        setModules(getResultData(modulesResult, 'Modules'));
        setActivityCompletions(getResultData(completionsResult, 'Activity completions'));
        const loadedAccessRoles = getResultData(accessRolesResult, 'Access roles');
        const loadedRolePermissions = getResultData(rolePermissionsResult, 'Role permissions');
        setAdminAccessRoles(buildAccessRoles(loadedAccessRoles, loadedRolePermissions));
        setAdminAccessAssignments(buildAccessAssignments(getResultData(roleAssignmentsResult, 'Role assignments')));
        setSections(getResultData(sectionsResult, 'Sections'));
        setSectionStudents(mergeSectionStudentRows(directoryData.sectionStudents || [], getResultData(sectionStudentsResult, 'Section students')));
        if (failedLabels.length) {
          setError(`Some dashboard data did not load: ${failedLabels.join(', ')}.`);
        }
      } catch (e) {
        if (active) setError(e.message || 'Failed to load management dashboard.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadCore();
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    if (activePage !== 'overview') return;
    let active = true;

    async function loadServiceHealth() {
      const cached = readCachedServiceHealth();
      if (cached) {
        setServiceHealth(cached);
        return;
      }

      setServiceHealth(getDefaultServiceHealth());

      const [huggingFace, cloudflare] = await Promise.all([
        probeServiceHealth([
          { url: getHealthUrl(ENV.PYTHON_SERVICE_URL, '/health') },
          { url: getHealthUrl(ENV.PYTHON_SERVICE_URL, '/api/health') },
        ]),
        probeServiceHealth([
          { url: getHealthUrl(ENV.CLOUDFLARE_AI_WORKER_URL, '/health') },
          { url: getHealthUrl(ENV.CLOUDFLARE_AI_WORKER_URL, '/random-topic') },
        ]),
      ]);

      if (!active) return;
      const nextHealth = { huggingFace, cloudflare };
      setServiceHealth(nextHealth);
      writeCachedServiceHealth(nextHealth);
    }

    loadServiceHealth();
    return () => { active = false; };
  }, [activePage]);

  useEffect(() => {
    if (!isSuperadmin || (activePage !== 'audit' && activePage !== 'reports' && activePage !== 'analytics')) return;
    let active = true;
    async function loadSettingsData() {
      try {
        const [auditRes, securityRes] = await Promise.all([
          supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000),
          supabase
            .from('auth_security_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000),
        ]);
        const { data, error: auditErr } = auditRes;
        const { data: securityEvents, error: securityErr } = securityRes;
        if (auditErr) throw auditErr;
        if (securityErr) throw securityErr;
        if (!active) return;
        setAuditLogs(data || []);
        setAuthSecurityEvents(securityEvents || []);
      } catch (e) {
        if (active) setError(e.message || 'Failed to load audit data.');
      }
    }
    loadSettingsData();
    return () => { active = false; };
  }, [isSuperadmin, activePage]);

  const adminAccounts = useMemo(
    () => profiles
      .filter(isAdminProfile)
      .filter((profile) => {
        if (adminStatusFilter === 'active') return !isDeletedProfile(profile);
        if (adminStatusFilter === 'deleted') return isDeletedProfile(profile);
        return true;
      })
      .sort((a, b) => {
        const deletedDelta = Number(isDeletedProfile(a)) - Number(isDeletedProfile(b));
        if (deletedDelta !== 0) return deletedDelta;
        return getDisplayName(a, a.id).localeCompare(getDisplayName(b, b.id));
      }),
    [profiles, adminStatusFilter]
  );
  const visibleSections = useMemo(() => {
    const activeSections = sections.filter(section => !section.archived_at);
    if (isSuperadmin) return activeSections;
    return activeSections.filter(section => section.teacher_id === currentAdminId);
  }, [sections, isSuperadmin, currentAdminId]);

  const sectionById = useMemo(() => {
    const map = new Map();
    sections.forEach(section => map.set(section.id, section));
    return map;
  }, [sections]);

  const sectionIdByStudentId = useMemo(() => {
    const map = new Map();
    sectionStudents.forEach(row => {
      const studentId = getSectionStudentStudentId(row);
      const sectionId = getSectionStudentSectionId(row);
      if (studentId && sectionId) map.set(studentId, sectionId);
    });
    profiles.forEach(profile => {
      if (profile.role === 'user' && profile.section_id && !map.has(profile.id)) {
        map.set(profile.id, profile.section_id);
      }
    });
    return map;
  }, [profiles, sectionStudents]);

  const sectionStudentIdsBySectionId = useMemo(() => {
    const map = new Map();
    profiles.forEach((profile) => {
      if (profile.role !== 'user' || isDeletedProfile(profile)) return;
      const sectionId = sectionIdByStudentId.get(profile.id);
      if (!sectionId) return;
      if (!map.has(sectionId)) map.set(sectionId, new Set());
      map.get(sectionId).add(profile.id);
    });
    return map;
  }, [profiles, sectionIdByStudentId]);

  const visibleSectionStudentIds = useMemo(() => {
    if (isSuperadmin) return null;
    const ids = new Set();
    visibleSections.forEach((section) => {
      (sectionStudentIdsBySectionId.get(section.id) || new Set()).forEach(studentId => ids.add(studentId));
    });
    return ids;
  }, [sectionStudentIdsBySectionId, visibleSections, isSuperadmin]);

  useEffect(() => {
    if (analyticsSectionFilter === 'all') return;
    if (isSuperadmin && analyticsSectionFilter === INDEPENDENT_LEARNERS_FILTER) return;
    if (!visibleSections.some(section => section.id === analyticsSectionFilter)) {
      setAnalyticsSectionFilter('all');
    }
  }, [analyticsSectionFilter, isSuperadmin, visibleSections]);
  const adminTeacherOptions = useMemo(
    () => profiles.filter(profile => profile.role === 'admin' && !isDeletedProfile(profile)),
    [profiles]
  );
  const visibleUsers = useMemo(
    () => profiles.filter((p) => (
      p.role === 'user'
      && !isDeletedProfile(p)
      && (!visibleSectionStudentIds || visibleSectionStudentIds.has(p.id))
    )),
    [profiles, visibleSectionStudentIds]
  );

  const recordAuditLog = async ({ action, entityType, entityId = null, oldValues = null, newValues = null }) => {
    if (!currentAdminId) return;
    const payload = {
      actor_id: currentAdminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
    };
    const { data, error: auditError } = await supabase
      .from('audit_logs')
      .insert(payload)
      .select('*')
      .single();
    if (auditError) {
      console.warn('Failed to write audit log:', auditError.message);
      return;
    }
    if (data) setAuditLogs(prev => [data, ...prev]);
  };

  const metricBySession = useMemo(() => {
    const map = new Map();
    metrics.forEach((m) => map.set(m.session_id, {
      overall: firstFiniteNumber(m.overall_score, m.confidence_score),
      visual: firstFiniteNumber(m.visual_score, m.visual_avg, m.confidence_score),
      vocal: firstFiniteNumber(m.vocal_score, m.vocal_avg, m.pronunciation_score),
      verbal: firstFiniteNumber(m.verbal_score, m.verbal_avg),
      confidence: firstFiniteNumber(m.confidence_score),
      pronunciation: firstFiniteNumber(m.pronunciation_score)
    }));
    return map;
  }, [metrics]);

  const levelDistribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    visibleUsers.forEach((p) => {
      const lv = getSpeakerLevelValue(p);
      if (counts[lv] != null) counts[lv] += 1;
    });
    return Object.entries(counts).map(([lv, value]) => ({ label: `Level ${lv}`, value }));
  }, [visibleUsers]);

  const kpis = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = shiftRange(now, 'day', -7);
    const twoWeeksAgo = shiftRange(now, 'day', -14);
    const totalUsers = visibleUsers.length;
    const adminAccounts = profiles.filter(p => isAdminProfile(p) && !isDeletedProfile(p));
    const activeThisWeekSet = getActiveUserIdsForRange(visibleUsers, sessions, oneWeekAgo, now);
    const activeLastWeekSet = getActiveUserIdsForRange(visibleUsers, sessions, twoWeeksAgo, oneWeekAgo);
    const activeThisWeek = activeThisWeekSet.size;
    const activeLastWeek = activeLastWeekSet.size;
    const activeDelta = activeThisWeek - activeLastWeek;
    const inactiveThisWeek = Math.max(totalUsers - activeThisWeek, 0);
    return {
      totalUsers,
      usersDeltaText: `+${visibleUsers.filter(p => new Date(p.created_at) >= oneWeekAgo).length} new this week`,
      activeThisWeek,
      inactiveThisWeek,
      activeDeltaText: activeDelta >= 0 ? `+${activeDelta} vs last week` : `${activeDelta} vs last week`,
      totalAdmins: adminAccounts.length,
      adminsDeltaText: `+${adminAccounts.filter(p => new Date(p.created_at) >= oneWeekAgo).length} new this week`
    };
  }, [visibleUsers, profiles, sessions]);

  const weeklyStudentActivityRows = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = shiftRange(now, 'day', -7);
    const activeUserIds = getActiveUserIdsForRange(visibleUsers, sessions, oneWeekAgo, now);
    const visibleUserIds = new Set(visibleUsers.map(user => user.id));
    const sessionsThisWeek = sessions.filter((session) => {
      const sessionUserId = getSessionUserId(session);
      const timestamp = getSessionActivityTimestamp(session);
      return visibleUserIds.has(sessionUserId)
        && session.status !== 'error'
        && session.is_error !== true
        && timestamp >= oneWeekAgo.getTime()
        && timestamp < now.getTime();
    });
    const sessionsByUser = new Map();

    sessionsThisWeek.forEach((session) => {
      const sessionUserId = getSessionUserId(session);
      const userSessions = sessionsByUser.get(sessionUserId) || [];
      userSessions.push(session);
      sessionsByUser.set(sessionUserId, userSessions);
    });

    return visibleUsers
      .map((profile) => {
        const userSessions = sessionsByUser.get(profile.id) || [];
        const scoreValues = userSessions.map((session) => {
          const metricsRow = metricBySession.get(session.id);
          return getDashboardSessionScore(session, metricsRow);
        });
        const latestActiveMs = userSessions.reduce((latest, session) => (
          Math.max(latest, getSessionActivityTimestamp(session))
        ), getProfileActivityTimestamp(profile));
        const isActive = activeUserIds.has(profile.id);

        return {
          id: profile.id,
          isActive,
          name: getDisplayName(profile, profile.id),
          speeches: userSessions.length,
          minutes: Number(userSessions.reduce((sum, session) => sum + getSessionDurationMinutes(session), 0).toFixed(1)),
          averageScore: averageDashboardScore(scoreValues),
          lastActive: latestActiveMs ? new Date(latestActiveMs).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }) : 'N/A',
        };
      })
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.speeches - a.speeches || b.minutes - a.minutes || a.name.localeCompare(b.name));
  }, [sessions, visibleUsers, metricBySession]);

  const activeUsersThisWeek = useMemo(
    () => weeklyStudentActivityRows.filter(user => user.isActive),
    [weeklyStudentActivityRows]
  );
  const inactiveUsersThisWeek = useMemo(
    () => weeklyStudentActivityRows.filter(user => !user.isActive),
    [weeklyStudentActivityRows]
  );
  const filteredWeeklyStudentActivityRows = useMemo(() => {
    if (activityStatusFilter === 'active') return activeUsersThisWeek;
    if (activityStatusFilter === 'inactive') return inactiveUsersThisWeek;
    return weeklyStudentActivityRows;
  }, [activeUsersThisWeek, activityStatusFilter, inactiveUsersThisWeek, weeklyStudentActivityRows]);
  const totalActiveUserPages = Math.max(1, Math.ceil(filteredWeeklyStudentActivityRows.length / ACTIVE_USERS_PER_PAGE));
  const paginatedWeeklyStudentActivityRows = useMemo(() => {
    const start = (activeUsersPage - 1) * ACTIVE_USERS_PER_PAGE;
    return filteredWeeklyStudentActivityRows.slice(start, start + ACTIVE_USERS_PER_PAGE);
  }, [filteredWeeklyStudentActivityRows, activeUsersPage]);

  useEffect(() => {
    if (!showActiveUsersModal) return;
    setActiveUsersPage(1);
  }, [showActiveUsersModal]);

  useEffect(() => {
    setActiveUsersPage(1);
  }, [activityStatusFilter]);

  useEffect(() => {
    setActiveUsersPage(page => Math.min(page, totalActiveUserPages));
  }, [totalActiveUserPages]);

  const joinTrendData = useMemo(() => {
    const days = 14;
    const now = new Date();
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (days - 1) + i);
      const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = dayStart + 86400000;
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        users: visibleUsers.filter(p => {
          const ms = new Date(p.created_at).getTime();
          return ms >= dayStart && ms < dayEnd;
        }).length
      };
    });
  }, [visibleUsers]);

  const levelBarData = useMemo(() => levelDistribution.map(i => ({ level: i.label, users: i.value })), [levelDistribution]);

  const analyticsScopedUsers = useMemo(() => {
    let scopedUsers = visibleUsers;

    if (analyticsSectionFilter === INDEPENDENT_LEARNERS_FILTER) {
      scopedUsers = visibleUsers.filter(user => !sectionIdByStudentId.get(user.id));
    } else if (analyticsSectionFilter !== 'all') {
      scopedUsers = visibleUsers.filter(user => sectionIdByStudentId.get(user.id) === analyticsSectionFilter);
    }

    if (analyticsSpeakerLevelFilter !== 'all') {
      const selectedLevel = Number(analyticsSpeakerLevelFilter);
      scopedUsers = scopedUsers.filter(user => getSpeakerLevelValue(user) === selectedLevel);
    }

    return scopedUsers;
  }, [analyticsSectionFilter, analyticsSpeakerLevelFilter, sectionIdByStudentId, visibleUsers]);

  const analyticsUserIds = useMemo(
    () => new Set(analyticsScopedUsers.map(user => user.id)),
    [analyticsScopedUsers]
  );

  const analyticsRangeDays = Number(analyticsRange) || 30;
  const analyticsRangeStart = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (analyticsRangeDays - 1));
    return start;
  }, [analyticsRangeDays]);

  const analyticsSessions = useMemo(() => (
    sessions.filter((session) => {
      if (!analyticsUserIds.has(getSessionUserId(session))) return false;
      if (session.status === 'error' || session.is_error === true) return false;
      return getSessionActivityTimestamp(session) >= analyticsRangeStart.getTime();
    })
  ), [analyticsRangeStart, analyticsUserIds, sessions]);

  const analyticsCompletionCountByUser = useMemo(() => {
    const map = new Map();
    activityCompletions.forEach((completion) => {
      if (!completion.user_id) return;
      if (!analyticsUserIds.has(completion.user_id)) return;
      map.set(completion.user_id, clampActivityProgress((map.get(completion.user_id) || 0) + 1));
    });
    return map;
  }, [activityCompletions, analyticsUserIds]);

  const analyticsAttemptedActivityIdsByUser = useMemo(() => {
    const map = new Map();
    sessions.forEach((session) => {
      const sessionUserId = getSessionUserId(session);
      if (!sessionUserId || !analyticsUserIds.has(sessionUserId)) return;
      if (session.status === 'error' || session.is_error === true) return;
      const activityId = String(session.activity_id || '').trim();
      if (!activityId) return;
      if (!map.has(sessionUserId)) map.set(sessionUserId, new Set());
      map.get(sessionUserId).add(activityId);
    });
    return map;
  }, [analyticsUserIds, sessions]);

  const analyticsCompletionIdsByUser = useMemo(() => {
    const map = new Map();
    activityCompletions.forEach((completion) => {
      if (!completion.user_id || !completion.activity_id) return;
      if (!analyticsUserIds.has(completion.user_id)) return;
      if (!map.has(completion.user_id)) map.set(completion.user_id, new Set());
      map.get(completion.user_id).add(String(completion.activity_id));
    });
    return map;
  }, [activityCompletions, analyticsUserIds]);

  const analyticsActivityProgressCountByUser = useMemo(() => {
    const map = new Map();
    analyticsUserIds.forEach((userId) => {
      const activityIds = new Set([
        ...(analyticsAttemptedActivityIdsByUser.get(userId) || []),
        ...(analyticsCompletionIdsByUser.get(userId) || []),
      ]);
      map.set(userId, clampActivityProgress(activityIds.size));
    });
    return map;
  }, [analyticsAttemptedActivityIdsByUser, analyticsCompletionIdsByUser, analyticsUserIds]);

  const analyticsKpis = useMemo(() => {
    const selectedLevel = analyticsSpeakerLevelFilter === 'all' ? null : Number(analyticsSpeakerLevelFilter);
    const stageActivities = activities.filter((activity) => {
      const level = Number(activity.target_level) || 1;
      return selectedLevel == null || level === selectedLevel;
    });
    const stageActivityIds = stageActivities.map(activity => String(activity.id));
    const totalStageRequirements = stageActivityIds.length * analyticsScopedUsers.length;
    const stagesPassed = analyticsScopedUsers.reduce((total, user) => {
      const userCompletions = analyticsCompletionIdsByUser.get(user.id) || new Set();
      return total + stageActivityIds.filter(activityId => userCompletions.has(activityId)).length;
    }, 0);
    const averageStagesPassed = analyticsScopedUsers.length
      ? Math.round(stagesPassed / analyticsScopedUsers.length)
      : 0;
    const stagePassRate = totalStageRequirements
      ? Math.round((stagesPassed / totalStageRequirements) * 100)
      : 0;

    return {
      students: analyticsScopedUsers.length,
      stageCount: stageActivityIds.length,
      stagesPassed,
      totalStageRequirements,
      averageStagesPassed,
      stagePassRate,
    };
  }, [activities, analyticsCompletionIdsByUser, analyticsScopedUsers, analyticsSpeakerLevelFilter]);

  const analyticsConfidenceRows = useMemo(() => {
    const rowsByLevel = new Map(CONFIDENCE_LEVELS.map(level => [
      level.level,
      { ...level, students: 0, studentNames: [] },
    ]));
    const selectedActivityLevel = analyticsSpeakerLevelFilter === 'all' ? null : Number(analyticsSpeakerLevelFilter);
    const focusActivities = activities.filter((activity) => (
      selectedActivityLevel == null || Number(activity.target_level) === selectedActivityLevel
    ));
    const noActivityRow = {
      level: 0,
      range: '0 activities',
      label: 'No activity yet',
      focus: '-',
      students: 0,
      studentNames: [],
    };

    analyticsScopedUsers.forEach((user) => {
      const level = getConfidenceLevel(analyticsActivityProgressCountByUser.get(user.id) || 0);
      const targetRow = level.level === 0 ? noActivityRow : rowsByLevel.get(level.level);
      if (!targetRow) return;
      targetRow.students += 1;
      targetRow.studentNames.push(getDisplayName(user, user.id));
    });

    rowsByLevel.forEach((row) => {
      const activitiesInRange = focusActivities.filter((activity) => {
        const order = Number(activity.activity_order);
        return Number.isFinite(order) && order >= row.min && order <= row.max;
      });
      row.focus = formatActivityFocus(activitiesInRange);
      row.studentNames.sort((a, b) => a.localeCompare(b));
    });
    noActivityRow.studentNames.sort((a, b) => a.localeCompare(b));

    return [
      noActivityRow,
      ...CONFIDENCE_LEVELS.map(level => rowsByLevel.get(level.level)),
    ];
  }, [activities, analyticsActivityProgressCountByUser, analyticsScopedUsers, analyticsSpeakerLevelFilter]);

  const analyticsLevelPassRows = useMemo(() => {
    const selectedLevel = analyticsSpeakerLevelFilter === 'all' ? null : Number(analyticsSpeakerLevelFilter);
    const totalStudents = analyticsScopedUsers.length;

    return CONFIDENCE_LEVELS
      .filter(level => selectedLevel == null || level.level === selectedLevel)
      .map((level) => {
        const activitiesInRange = activities.filter((activity) => {
          const order = Number(activity.activity_order);
          return Number.isFinite(order) && order >= level.min && order <= level.max;
        });
        const passedStudents = [];
        const notPassedStudents = [];

        analyticsScopedUsers.forEach((user) => {
          const completed = analyticsCompletionCountByUser.get(user.id) || 0;
          const target = completed >= level.max ? passedStudents : notPassedStudents;
          target.push(getDisplayName(user, user.id));
        });

        passedStudents.sort((a, b) => a.localeCompare(b));
        notPassedStudents.sort((a, b) => a.localeCompare(b));

        return {
          level: `Level ${level.level}`,
          range: level.range,
          focus: formatActivityFocus(activitiesInRange),
          category: level.label,
          passed: passedStudents.length,
          notPassed: notPassedStudents.length,
          passRate: totalStudents ? Math.round((passedStudents.length / totalStudents) * 100) : 0,
          passedStudents,
          notPassedStudents,
        };
      });
  }, [activities, analyticsCompletionCountByUser, analyticsScopedUsers, analyticsSpeakerLevelFilter]);

  const analyticsStagePassRows = useMemo(() => {
    const selectedLevel = analyticsSpeakerLevelFilter === 'all' ? null : Number(analyticsSpeakerLevelFilter);
    const scopedActivities = activities
      .filter((activity) => {
        const level = Number(activity.target_level) || 1;
        return selectedLevel == null || level === selectedLevel;
      })
      .slice()
      .sort((a, b) => (
        (Number(a.target_level) || 1) - (Number(b.target_level) || 1)
        || (Number(a.activity_order) || 0) - (Number(b.activity_order) || 0)
        || String(a.title || '').localeCompare(String(b.title || ''))
      ));

    return scopedActivities.map((activity) => {
      const activityId = String(activity.id);
      const level = Number(activity.target_level) || 1;
      const stage = Number(activity.activity_order) || 0;
      const passedStudents = [];
      const notPassedStudents = [];

      analyticsScopedUsers.forEach((user) => {
        const userCompletions = analyticsCompletionIdsByUser.get(user.id) || new Set();
        const userAttempts = analyticsAttemptedActivityIdsByUser.get(user.id) || new Set();
        if (userCompletions.has(activityId)) {
          passedStudents.push(getDisplayName(user, user.id));
        } else if (userAttempts.has(activityId)) {
          notPassedStudents.push(getDisplayName(user, user.id));
        }
      });

      passedStudents.sort((a, b) => a.localeCompare(b));
      notPassedStudents.sort((a, b) => a.localeCompare(b));

      return {
        id: activity.id,
        level: `Level ${level}`,
        stage,
        stageLabel: `Stage ${stage}`,
        chartLabel: `L${level}-S${stage}`,
        title: activity.title || `Stage ${stage}`,
        focus: formatActivityFocus([activity]),
        passed: passedStudents.length,
        notPassed: notPassedStudents.length,
        passRate: passedStudents.length + notPassedStudents.length
          ? Math.round((passedStudents.length / (passedStudents.length + notPassedStudents.length)) * 100)
          : 0,
        passedStudents,
        notPassedStudents,
      };
    });
  }, [activities, analyticsAttemptedActivityIdsByUser, analyticsCompletionIdsByUser, analyticsScopedUsers, analyticsSpeakerLevelFilter]);

  useEffect(() => {
    setAnalyticsStagePage(1);
  }, [analyticsSectionFilter, analyticsSpeakerLevelFilter]);

  const analyticsStageTotalPages = Math.max(1, Math.ceil(analyticsStagePassRows.length / STAGE_PASS_ROWS_PER_PAGE));
  const safeAnalyticsStagePage = Math.min(analyticsStagePage, analyticsStageTotalPages);
  const analyticsStageStartIndex = (safeAnalyticsStagePage - 1) * STAGE_PASS_ROWS_PER_PAGE;
  const paginatedAnalyticsStagePassRows = analyticsStagePassRows.slice(
    analyticsStageStartIndex,
    analyticsStageStartIndex + STAGE_PASS_ROWS_PER_PAGE
  );

  const analyticsStudentRows = useMemo(() => (
    analyticsScopedUsers.map((user) => {
      const userSessions = analyticsSessions.filter(session => getSessionUserId(session) === user.id);
      const scores = userSessions.map(session => getDashboardSessionScore(session, metricBySession.get(session.id)));
      const visualScores = [];
      const vocalScores = [];
      const verbalScores = [];
      userSessions.forEach((session) => {
        const metrics = metricBySession.get(session.id);
        const visualScore = normalizeDashboardScore(getAnalyticsMetricScore(session, metrics, 'visual'));
        const vocalScore = normalizeDashboardScore(getAnalyticsMetricScore(session, metrics, 'vocal'));
        const verbalScore = normalizeDashboardScore(getAnalyticsMetricScore(session, metrics, 'verbal'));
        if (Number.isFinite(visualScore)) visualScores.push(visualScore);
        if (Number.isFinite(vocalScore)) vocalScores.push(vocalScore);
        if (Number.isFinite(verbalScore)) verbalScores.push(verbalScore);
      });
      const latestMs = userSessions.reduce((latest, session) => Math.max(latest, getSessionActivityTimestamp(session)), 0);
      const completedActivities = analyticsActivityProgressCountByUser.get(user.id) || 0;
      const speakerLevel = getSpeakerLevelValue(user);
      return {
        id: user.id,
        name: getDisplayName(user, user.id),
        section: getLearnerGroupLabel(user, sectionById, sectionIdByStudentId),
        speeches: userSessions.length,
        minutes: Number(userSessions.reduce((sum, session) => sum + getSessionDurationMinutes(session), 0).toFixed(1)),
        averageScore: averageDashboardScore(scores),
        completedActivities,
        confidenceLevel: getConfidenceLevel(completedActivities),
        speakerLevel,
        visualScore: averageDashboardScore(visualScores),
        vocalScore: averageDashboardScore(vocalScores),
        verbalScore: averageDashboardScore(verbalScores),
        lastActiveMs: latestMs || getProfileActivityTimestamp(user),
      };
    })
  ), [analyticsActivityProgressCountByUser, analyticsScopedUsers, analyticsSessions, metricBySession, sectionById, sectionIdByStudentId]);

  const analyticsRankedStudentRows = useMemo(() => (
    analyticsStudentRows
      .slice()
      .sort((a, b) => (
        b.completedActivities - a.completedActivities
        || (b.averageScore ?? -1) - (a.averageScore ?? -1)
        || a.name.localeCompare(b.name)
      ))
  ), [analyticsStudentRows]);

  const analyticsSkillBreakdown = useMemo(() => {
    const metricRows = [
      {
        key: 'visual',
        skill: 'Visual',
        description: 'Gesture, posture, eye contact, and visible delivery confidence.',
        scores: [],
        students: new Set(),
      },
      {
        key: 'vocal',
        skill: 'Vocal',
        description: 'Voice delivery, pace, volume, pronunciation, and vocal confidence.',
        scores: [],
        students: new Set(),
      },
      {
        key: 'verbal',
        skill: 'Verbal',
        description: 'Word choice, clarity, structure, and spoken message confidence.',
        scores: [],
        students: new Set(),
      },
    ];

    analyticsSessions.forEach((session) => {
      const metrics = metricBySession.get(session.id);
      metricRows.forEach((row) => {
        const score = normalizeDashboardScore(getAnalyticsMetricScore(session, metrics, row.key));
        if (!Number.isFinite(score)) return;
        row.scores.push(score);
        row.students.add(getSessionUserId(session));
      });
    });

    return metricRows.map(row => ({
      skill: row.skill,
      description: row.description,
      average: averageDashboardScore(row.scores),
      measuredStudents: row.students.size,
    }));
  }, [analyticsSessions, metricBySession]);

  const reportTeacherRows = useMemo(() => (
    profiles
      .filter(profile => profile.role === 'admin')
      .sort((a, b) => getDisplayName(a, a.id).localeCompare(getDisplayName(b, b.id)))
  ), [profiles]);

  const filteredReportTeacherRows = useMemo(() => {
    let filtered = reportTeacherRows;
    if (reportStartDate) {
      const start = new Date(reportStartDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(p => new Date(p.created_at || '') >= start);
    }
    if (reportEndDate) {
      const end = new Date(reportEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => new Date(p.created_at || '') <= end);
    }
    return filtered;
  }, [reportTeacherRows, reportStartDate, reportEndDate]);

  const reportStudentRows = useMemo(() => (
    profiles
      .filter(profile => (
        profile.role === 'user'
        && (!visibleSectionStudentIds || visibleSectionStudentIds.has(profile.id))
      ))
      .sort((a, b) => getDisplayName(a, a.id).localeCompare(getDisplayName(b, b.id)))
  ), [profiles, visibleSectionStudentIds]);

  const filteredReportStudentRows = useMemo(() => {
    let filtered = reportStudentRows;
    if (reportStartDate) {
      const start = new Date(reportStartDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(p => new Date(p.created_at || '') >= start);
    }
    if (reportEndDate) {
      const end = new Date(reportEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => new Date(p.created_at || '') <= end);
    }
    return filtered;
  }, [reportStudentRows, reportStartDate, reportEndDate]);

  const reportStudentPerformanceRows = useMemo(() => {
    const start = reportStartDate ? new Date(reportStartDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    const end = reportEndDate ? new Date(reportEndDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    return reportStudentRows.map((student) => {
      let studentSessions = sessions.filter(session => getSessionUserId(session) === student.id && session.status !== 'error' && session.is_error !== true);
      if (start) {
        studentSessions = studentSessions.filter(s => new Date(s.created_at || '') >= start);
      }
      if (end) {
        studentSessions = studentSessions.filter(s => new Date(s.created_at || '') <= end);
      }

      const scores = studentSessions.map(session => getDashboardSessionScore(session, metricBySession.get(session.id)));
      
      let filteredCompletions = activityCompletions.filter(completion => completion.user_id === student.id);
      if (start) {
        filteredCompletions = filteredCompletions.filter(c => new Date(c.completed_at || '') >= start);
      }
      if (end) {
        filteredCompletions = filteredCompletions.filter(c => new Date(c.completed_at || '') <= end);
      }

      const activityIds = new Set([
        ...studentSessions.map(session => String(session.activity_id || '').trim()).filter(Boolean),
        ...filteredCompletions.map(completion => String(completion.activity_id || '').trim()).filter(Boolean),
      ]);
      const completedCount = clampActivityProgress(activityIds.size);
      return {
        id: student.id,
        name: getDisplayName(student, student.id),
        section: getLearnerGroupLabel(student, sectionById, sectionIdByStudentId),
        speeches: studentSessions.length,
        minutes: Number(studentSessions.reduce((sum, session) => sum + getSessionDurationMinutes(session), 0).toFixed(1)),
        averageScore: averageDashboardScore(scores),
        completedActivities: completedCount,
        confidenceLevel: getConfidenceLevel(completedCount),
      };
    });
  }, [activityCompletions, metricBySession, reportStudentRows, sectionById, sectionIdByStudentId, sessions, reportStartDate, reportEndDate]);

  const userManagementRows = useMemo(() => {
    const includeUsers = userAccountTypeFilter === 'users' || userAccountTypeFilter === 'all';
    const includeAdmins = isSuperadmin && (userAccountTypeFilter === 'admins' || userAccountTypeFilter === 'all');
    let rows = profiles
      .filter((profile) => {
        if (profile.role === 'user') {
          return includeUsers && (!visibleSectionStudentIds || visibleSectionStudentIds.has(profile.id));
        }
        return includeAdmins && isAdminProfile(profile);
      })
      .map((profile) => {
        const isAdminAccount = isAdminProfile(profile);
        const assignedSection = !isAdminAccount ? sectionById.get(sectionIdByStudentId.get(profile.id) || profile.section_id) : null;
        const accessRole = isAdminAccount ? findAccessRole(adminAccessRoles, adminAccessAssignments[profile.id]) : null;
        const typeLabel = getAdminRoleLabel(profile);
        const roleOrSection = isAdminAccount
          ? (profile.role === 'superadmin' ? 'Super Admin' : accessRole?.name || 'Admin')
          : assignedSection?.name || profile.section_name || INDEPENDENT_LEARNERS_LABEL;

        return {
          profile,
          isAdminAccount,
          typeLabel,
          roleOrSection,
          name: getDisplayName(profile, profile.id),
          email: getProfileEmail(profile),
          status: isDeletedProfile(profile) ? 'Archived' : 'Active',
          createdAt: getTimestamp(profile.created_at),
          journey: getProgressLevelValue(profile),
          speaking: getSpeakerLevelValue(profile),
        };
      });

    if (userStatusFilter === 'active') rows = rows.filter(row => !isDeletedProfile(row.profile));
    if (userStatusFilter === 'deleted') rows = rows.filter(row => isDeletedProfile(row.profile));
    if (userLevelFilter !== 'all' && userAccountTypeFilter === 'users') {
      rows = rows.filter(row => !row.isAdminAccount && row.journey === Number(userLevelFilter));
    }
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      rows = rows.filter(row => (
        row.name.toLowerCase().includes(q)
        || row.email.toLowerCase().includes(q)
        || row.typeLabel.toLowerCase().includes(q)
        || row.roleOrSection.toLowerCase().includes(q)
        || (row.profile.student_number || '').toLowerCase().includes(q)
      ));
    }

    const statusCompare = (a, b) => Number(isDeletedProfile(a.profile)) - Number(isDeletedProfile(b.profile));
    return [...rows].sort((a, b) => {
      if (userSortKey === 'name_desc') return b.name.localeCompare(a.name);
      if (userSortKey === 'newest') return b.createdAt - a.createdAt || a.name.localeCompare(b.name);
      if (userSortKey === 'oldest') return a.createdAt - b.createdAt || a.name.localeCompare(b.name);
      if (userSortKey === 'status') return statusCompare(a, b) || a.name.localeCompare(b.name);
      if (userSortKey === 'type') return a.typeLabel.localeCompare(b.typeLabel) || a.name.localeCompare(b.name);
      if (userSortKey === 'role_section') return a.roleOrSection.localeCompare(b.roleOrSection) || a.name.localeCompare(b.name);
      if (userSortKey === 'journey_desc') return b.journey - a.journey || a.name.localeCompare(b.name);
      if (userSortKey === 'journey_asc') return a.journey - b.journey || a.name.localeCompare(b.name);
      return statusCompare(a, b) || a.name.localeCompare(b.name);
    });
  }, [
    adminAccessAssignments,
    adminAccessRoles,
    isSuperadmin,
    profiles,
    sectionById,
    sectionIdByStudentId,
    userAccountTypeFilter,
    userLevelFilter,
    userSearchQuery,
    userSortKey,
    userStatusFilter,
    visibleSectionStudentIds,
  ]);

  const paginatedUserManagementRows = useMemo(() => {
    const start = (userPage - 1) * USERS_PER_PAGE;
    return userManagementRows.slice(start, start + USERS_PER_PAGE);
  }, [userManagementRows, userPage]);

  const totalUserPages = Math.max(1, Math.ceil(userManagementRows.length / USERS_PER_PAGE));
  const showUserManagementTypeColumn = userAccountTypeFilter !== 'users';
  const showUserManagementStudentColumns = userAccountTypeFilter !== 'admins';
  const userManagementColumnCount = 5
    + (showUserManagementTypeColumn ? 1 : 0)
    + (showUserManagementStudentColumns ? 3 : 0);

  useEffect(() => {
    setUserPage(page => Math.min(page, totalUserPages));
  }, [totalUserPages]);

  const contentItems = contentTab === 'activities' ? activities : modules;
  const contentLevelOptions = useMemo(() => {
    const activityLevels = activities.map(a => Number(a.target_level) || 0);
    const moduleLevels = modules.map(m => Number(m.level_number) || 0);
    return Array.from({ length: Math.max(5, contentLevelLimit, ...activityLevels, ...moduleLevels) }, (_, i) => i + 1);
  }, [activities, modules, contentLevelLimit]);
  const filteredContentItems = useMemo(() => {
    if (contentLevelFilter === 'all') return contentItems;
    return contentItems.filter(item => {
      const level = contentTab === 'activities' ? item.target_level : item.level_number;
      return Number(level) === Number(contentLevelFilter);
    });
  }, [contentItems, contentLevelFilter, contentTab]);
  const totalContentPages = Math.max(1, Math.ceil(filteredContentItems.length / CONTENT_PER_PAGE));
  const paginatedContentItems = useMemo(() => {
    const start = (contentPage - 1) * CONTENT_PER_PAGE;
    return filteredContentItems.slice(start, start + CONTENT_PER_PAGE);
  }, [filteredContentItems, contentPage]);

  useEffect(() => {
    setContentPage(1);
  }, [contentTab, contentLevelFilter]);

  useEffect(() => {
    setContentPage(page => Math.min(page, totalContentPages));
  }, [totalContentPages]);
  const [creatingUser, setCreatingUser] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [userForm, setUserForm] = useState(USER_FORM_INITIAL);

  const highestActivityLevel = useMemo(() => {
    const levels = activities.map(a => Number(a.target_level) || 0);
    if (editingContent?.target_level) levels.push(Number(editingContent.target_level) || 0);
    return Math.max(5, contentLevelLimit, ...levels);
  }, [activities, contentLevelLimit, editingContent]);

  const targetLevelOptions = useMemo(
    () => Array.from({ length: highestActivityLevel }, (_, i) => i + 1),
    [highestActivityLevel]
  );

  const combinedAuditLogs = useMemo(
    () => [...auditLogs, ...authSecurityEvents.map(normalizeAuthSecurityEvent)]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [auditLogs, authSecurityEvents]
  );

  const reportAuditLogs = useMemo(() => {
    let filtered = combinedAuditLogs;
    if (reportStartDate) {
      const start = new Date(reportStartDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(log => new Date(log.created_at || '') >= start);
    }
    if (reportEndDate) {
      const end = new Date(reportEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => new Date(log.created_at || '') <= end);
    }
    return filtered;
  }, [combinedAuditLogs, reportStartDate, reportEndDate]);

  const filteredAuditLogs = useMemo(() => {
    let res = combinedAuditLogs;
    if (auditSearchQuery.trim()) {
      const q = auditSearchQuery.toLowerCase();
      res = res.filter((l) => {
        const actorName = getDisplayName(profiles.find(p => p.id === l.actor_id), l.actor_id || 'unknown login').toLowerCase();
        const payload = JSON.stringify(l.new_values || {}).toLowerCase();
        return actorName.includes(q) || payload.includes(q);
      });
    }
    if (auditActionFilter !== 'all') res = res.filter(l => l.action.toLowerCase() === auditActionFilter.toLowerCase());
    if (auditEntityFilter !== 'all') res = res.filter(l => l.entity_type.toLowerCase() === auditEntityFilter.toLowerCase());
    return res;
  }, [combinedAuditLogs, auditSearchQuery, auditActionFilter, auditEntityFilter, profiles]);

  const paginatedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * AUDIT_PER_PAGE;
    return filteredAuditLogs.slice(start, start + AUDIT_PER_PAGE);
  }, [filteredAuditLogs, auditPage]);

  const totalAuditPages = Math.ceil(filteredAuditLogs.length / AUDIT_PER_PAGE);

  const onLogout = () => setShowLogoutConfirm(true);

  const performSaveContent = async (data) => {
    setIsContentLoading(true);
    const isEdit = Boolean(editingContent);
    const oldContent = editingContent;
    const { data: savedContent, error } = isEdit
      ? await supabase.from(contentTab).update(data).eq('id', editingContent.id).select('*').single()
      : await supabase.from(contentTab).insert([data]).select('*').single();
    setIsContentLoading(false);
    if (error) showToast(error.message, 'error');
    else {
      await recordAuditLog({
        action: isEdit ? 'update' : 'create',
        entityType: contentTab,
        entityId: savedContent?.id || oldContent?.id || null,
        oldValues: isEdit ? oldContent : null,
        newValues: savedContent || data,
      });
      showToast('Saved successfully');
      setCreatingContent(false);
      setEditingContent(null);
      setPendingContentSave(null);
      const query = supabase.from(contentTab).select('*');
      const { data: ref } = contentTab === 'activities'
        ? await query.order('target_level', { ascending: true }).order('activity_order', { ascending: true })
        : await query.order('level_number', { ascending: true }).order('lesson_number', { ascending: true });
      if (contentTab === 'activities') setActivities(ref || []); else setModules(ref || []);
    }
  };

  const handleSaveContent = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (contentTab === 'activities') {
      data.target_level = Number(data.target_level);
      data.activity_order = Number(data.activity_order);
    } else {
      data.level_number = Number(data.level_number);
    }
    const duplicateActivity = contentTab === 'activities'
      ? activities.find(a =>
          String(a.id) !== String(editingContent?.id) &&
          Number(a.target_level) === Number(data.target_level) &&
          Number(a.activity_order) === Number(data.activity_order)
        )
      : null;
    setPendingContentSave({
      data,
      duplicateActivity,
      mode: editingContent ? 'edit' : 'create',
      type: contentTab,
    });
  };

  const confirmContentSave = async () => {
    if (!pendingContentSave) return;
    await performSaveContent(pendingContentSave.data);
  };

  const requestNextTargetLevel = () => {
    setPendingLevelAdd(highestActivityLevel + 1);
  };

  const confirmNextTargetLevel = () => {
    if (!pendingLevelAdd) return;
    setContentLevelLimit(prev => Math.max(prev, pendingLevelAdd));
    recordAuditLog({
      action: 'update',
      entityType: 'admin_level_options',
      oldValues: { max_target_level: highestActivityLevel },
      newValues: { max_target_level: pendingLevelAdd },
    });
    setPendingLevelAdd(null);
    showToast(`Level ${pendingLevelAdd} added to the dropdown`);
  };

  const requestDeleteContent = (item, type) => {
    const label = type === 'activities' ? 'activity' : 'module';
    setPendingDeleteConfirmation({
      kind: 'content',
      id: item.id,
      type,
      title: `Delete ${label}?`,
      message: `This will permanently delete "${item.title || 'Untitled'}" from ${type === 'activities' ? 'Activities' : 'Modules'}. This action cannot be undone.`,
      confirmLabel: `Delete ${label}`,
    });
  };

  const deleteContent = async (id, type) => {
    const oldContent = type === 'activities'
      ? activities.find(a => a.id === id)
      : modules.find(m => m.id === id);
    const { error } = await supabase.from(type).delete().eq('id', id);
    if (error) showToast(error.message, 'error');
    else {
      await recordAuditLog({
        action: 'delete',
        entityType: type,
        entityId: id,
        oldValues: oldContent || { id },
        newValues: null,
      });
      showToast('Deleted');
      if (type === 'activities') setActivities(prev => prev.filter(a => a.id !== id));
      else setModules(prev => prev.filter(m => m.id !== id));
    }
  };

  const refreshProfiles = async () => {
    try {
      const directory = await fetchAdminDirectory();
      setProfiles(directory.profiles);
      setSectionStudents(prev => mergeSectionStudentRows(prev, directory.sectionStudents));
    } catch (refreshError) {
      showToast(refreshError.message || 'Failed to refresh users', 'error');
      return;
    }
  };

  const refreshRbacData = async () => {
    const [
      accessRolesResult,
      rolePermissionsResult,
      roleAssignmentsResult,
      sectionsResult,
      sectionStudentsResult,
      directoryResult,
    ] = await Promise.all([
      supabase.from('admin_access_roles').select('*').order('created_at', { ascending: true }),
      supabase.from('admin_role_permissions').select('*'),
      supabase.from('admin_role_assignments').select('*'),
      supabase.from('sections').select('*').order('created_at', { ascending: false }),
      supabase.from('section_students').select('*'),
      fetchAdminDirectory(),
    ]);

    if (accessRolesResult.error) throw accessRolesResult.error;
    if (rolePermissionsResult.error) throw rolePermissionsResult.error;
    if (roleAssignmentsResult.error) throw roleAssignmentsResult.error;
    if (sectionsResult.error) throw sectionsResult.error;
    if (sectionStudentsResult.error) throw sectionStudentsResult.error;

    setAdminAccessRoles(buildAccessRoles(accessRolesResult.data || [], rolePermissionsResult.data || []));
    setAdminAccessAssignments(buildAccessAssignments(roleAssignmentsResult.data || []));
    setProfiles(directoryResult.profiles || []);
    setSections(sectionsResult.data || []);
    setSectionStudents(mergeSectionStudentRows(directoryResult.sectionStudents || [], sectionStudentsResult.data || []));
  };

  const assignUserToSection = async (studentId, sectionId) => {
    if (!studentId) return;
    await supabase.from('section_students').delete().eq('student_id', studentId);
    if (!sectionId) {
      setSectionStudents(prev => prev.filter(row => row.student_id !== studentId));
      return;
    }
    const payload = {
      section_id: sectionId,
      student_id: studentId,
      assigned_by: currentAdminId,
    };
    const { data, error } = await supabase
      .from('section_students')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    setSectionStudents(prev => [...prev.filter(row => row.student_id !== studentId), data || payload]);
  };

  const openCreateUser = () => {
    setUserForm({
      ...USER_FORM_INITIAL,
      section_id: visibleSections[0]?.id || '',
    });
    setCreatingUser(true);
  };

  const openEditUser = (user) => {
    const assignedSection = sectionStudents.find(row => getSectionStudentStudentId(row) === user?.id);
    setUserForm({
      ...userToForm(user),
      section_id: getSectionStudentSectionId(assignedSection) || user?.section_id || visibleSections[0]?.id || '',
    });
    setStageProgressForm({
      ...STAGE_PROGRESS_INITIAL,
      journey: clampJourneyLevel(getProgressLevelValue(user)),
    });
    setPendingStageProgress(null);
    setEditingUser(user);
  };

  const openEditAdmin = (admin) => {
    setAdminAccountForm({
      ...ADMIN_FORM_INITIAL,
      first_name: admin?.first_name || '',
      last_name: admin?.last_name || '',
      username: admin?.username || '',
      role: isAdminProfile(admin) ? admin.role : 'admin',
      access_role_id: adminAccessAssignments[admin?.id] || DEFAULT_ADMIN_ACCESS_ROLE_ID,
    });
    setEditingAdmin(admin);
  };

  const updateAccessRolePermission = (areaKey, actionKey) => {
    setAdminAccessRoleForm(prev => {
      const nextPermissions = {
        ...prev.permissions,
        [areaKey]: {
          ...(prev.permissions?.[areaKey] || {}),
        },
      };
      const nextValue = !nextPermissions[areaKey][actionKey];
      nextPermissions[areaKey][actionKey] = nextValue;
      if (actionKey === 'view' && !nextValue) {
        ADMIN_PERMISSION_AREAS.find(area => area.key === areaKey)?.actions.forEach((action) => {
          nextPermissions[areaKey][action] = false;
        });
      }
      if (actionKey !== 'view' && nextValue) nextPermissions[areaKey].view = true;
      return { ...prev, permissions: nextPermissions };
    });
  };

  const loadAccessRoleForEdit = (roleTemplate) => {
    setAdminAccessRoleForm({
      id: roleTemplate.id,
      name: roleTemplate.name,
      description: roleTemplate.description || '',
      permissions: normalizeAccessRole(roleTemplate).permissions,
    });
    setSelectedAccessRoleId(roleTemplate.id);
    setShowAccessRoleModal(true);
  };

  const resetAccessRoleForm = () => {
    setAdminAccessRoleForm(ADMIN_ACCESS_ROLE_FORM_INITIAL);
  };

  const openNewAccessRole = () => {
    resetAccessRoleForm();
    setShowAccessRoleModal(true);
  };

  const openSelectedAccessRole = () => {
    const selectedRole = findAccessRole(adminAccessRoles, selectedAccessRoleId);
    if (selectedRole) loadAccessRoleForEdit(selectedRole);
  };

  const submitAccessRole = async (e) => {
    e.preventDefault();
    const name = adminAccessRoleForm.name.trim();
    if (!name) {
      showToast('Role name is required', 'error');
      return;
    }
    const nextRole = normalizeAccessRole({
      ...adminAccessRoleForm,
      id: adminAccessRoleForm.id || createAccessRoleId(name),
      name,
    });
    try {
      const existingRole = adminAccessRoles.find(roleTemplate => roleTemplate.id === nextRole.id);
      const { error: roleError } = await supabase
        .from('admin_access_roles')
        .upsert({
          id: nextRole.id,
          name: nextRole.name,
          description: nextRole.description || null,
          system_role: Boolean(existingRole?.system),
          created_by: currentAdminId || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      if (roleError) throw roleError;

      const { error: deleteError } = await supabase
        .from('admin_role_permissions')
        .delete()
        .eq('role_id', nextRole.id);
      if (deleteError) throw deleteError;

      const { error: permissionError } = await supabase
        .from('admin_role_permissions')
        .insert(permissionRowsFromRole(nextRole));
      if (permissionError) throw permissionError;

      await recordAuditLog({
        action: existingRole ? 'update' : 'create',
        entityType: 'admin_access_roles',
        entityId: nextRole.id,
        oldValues: existingRole || null,
        newValues: nextRole,
      });
      await refreshRbacData();
      setAdminAccessRoleForm(ADMIN_ACCESS_ROLE_FORM_INITIAL);
      setSelectedAccessRoleId(nextRole.id);
      setShowAccessRoleModal(false);
      showToast('Access role saved');
    } catch (roleError) {
      showToast(roleError.message || 'Failed to save access role', 'error');
    }
  };

  const requestDeleteAccessRole = (roleId) => {
    if (roleId === DEFAULT_ADMIN_ACCESS_ROLE_ID) {
      showToast('Default Admin role cannot be deleted', 'error');
      return;
    }
    const existingRole = adminAccessRoles.find(roleTemplate => roleTemplate.id === roleId);
    setPendingDeleteConfirmation({
      kind: 'accessRole',
      id: roleId,
      title: 'Delete access role?',
      message: `This will delete the "${existingRole?.name || 'selected'}" role. Admins assigned to it will be moved back to the default Admin role.`,
      confirmLabel: 'Delete Role',
    });
  };

  const deleteAccessRole = async (roleId) => {
    if (roleId === DEFAULT_ADMIN_ACCESS_ROLE_ID) {
      showToast('Default Admin role cannot be deleted', 'error');
      return;
    }
    const existingRole = adminAccessRoles.find(roleTemplate => roleTemplate.id === roleId);
    try {
      const { error: assignmentError } = await supabase
        .from('admin_role_assignments')
        .update({ role_id: DEFAULT_ADMIN_ACCESS_ROLE_ID, assigned_by: currentAdminId || null, assigned_at: new Date().toISOString() })
        .eq('role_id', roleId);
      if (assignmentError) throw assignmentError;

      const { error } = await supabase
        .from('admin_access_roles')
        .delete()
        .eq('id', roleId);
      if (error) throw error;
      await recordAuditLog({
        action: 'delete',
        entityType: 'admin_access_roles',
        entityId: roleId,
        oldValues: existingRole || { id: roleId },
        newValues: null,
      });
      await refreshRbacData();
      setSelectedAccessRoleId(DEFAULT_ADMIN_ACCESS_ROLE_ID);
      showToast('Access role deleted');
    } catch (deleteError) {
      showToast(deleteError.message || 'Failed to delete access role', 'error');
    }
  };

  const resetBatchImportState = () => {
    setBatchImportFile(null);
    setBatchImportStatus('idle');
    setBatchImportError('');
    setBatchPreview(null);
    setBatchPreviewPage(1);
  };

  const readBatchImportFile = async (file, accountType = batchAccountType) => {
    setBatchImportFile(file);
    setBatchImportStatus('reading');
    setBatchImportError('');
    setBatchPreview(null);
    setBatchPreviewPage(1);

    try {
      const matrix = await parseBatchSpreadsheetFile(file);
      const preview = buildBatchPreview(matrix, accountType);
      setBatchPreview(preview);
      if (preview.missingColumns.length) {
        setBatchImportStatus('error');
        setBatchImportError(`Missing required columns: ${preview.missingColumns.join(', ')}`);
        return;
      }
      if (!preview.rows.length) {
        setBatchImportStatus('error');
        setBatchImportError('No account rows were found below the header row.');
        return;
      }
      if (preview.invalidRows.length) {
        setBatchImportStatus('error');
        setBatchImportError(`${preview.invalidRows.length} row${preview.invalidRows.length === 1 ? '' : 's'} need complete names and valid email addresses.`);
        return;
      }
      setBatchImportStatus('ready');
      showToast(`${preview.rows.length} ${accountType === 'admin' ? 'admin' : 'user'} row${preview.rows.length === 1 ? '' : 's'} detected`);
    } catch (fileError) {
      setBatchImportStatus('error');
      setBatchImportError(fileError.message || 'Failed to read the selected file.');
    }
  };

  const handleBatchFileChange = async (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      resetBatchImportState();
      return;
    }
    await readBatchImportFile(file);
  };

  const handleBatchAccountTypeChange = async (e) => {
    const nextType = e.target.value;
    setBatchAccountType(nextType);
    if (nextType === 'user' && !batchSectionId && visibleSections[0]?.id) {
      setBatchSectionId(visibleSections[0].id);
    }
    if (batchImportFile) await readBatchImportFile(batchImportFile, nextType);
  };

  const openBatchAccountSetup = () => {
    const nextType = isSuperadmin && userAccountTypeFilter === 'admins' ? 'admin' : 'user';
    setBatchAccountType(nextType);
    if (nextType === 'user' && !batchSectionId && visibleSections[0]?.id) {
      setBatchSectionId(visibleSections[0].id);
    }
    setShowBatchAccountModal(true);
  };

  const submitBatchAccountImport = async (e) => {
    e.preventDefault();
    if (!batchImportFile) {
      showToast('Choose an Excel file first', 'error');
      return;
    }
    if (batchImportStatus !== 'ready' || !batchPreview?.rows?.length) {
      showToast(batchImportError || 'Fix the Excel file before preparing the batch', 'error');
      return;
    }

    setBatchImportStatus('saving');
    let createdCount = 0;

    try {
      for (const row of batchPreview.rows) {
        const email = row.email.trim();
        const firstName = row.first_name.trim();
        const lastName = row.last_name.trim();
        if (batchAccountType === 'admin') {
          const { user, profile, invitation_sent } = await createConfirmedAdminUser({
            email,
            redirect_to: getAccountInviteRedirectUrl(),
            first_name: firstName,
            last_name: lastName,
            username: null,
            role: 'admin',
            current_level: 1,
            speaker_level: 1,
            speaker_points: 0,
          });

          await recordAuditLog({
            action: 'create',
            entityType: 'profiles',
            entityId: user.id,
            oldValues: null,
            newValues: {
              ...(profile || {
                id: user.id,
                email,
                role: 'admin',
                first_name: firstName,
                last_name: lastName,
                username: null,
              }),
              access_role_id: batchAccessRoleId || DEFAULT_ADMIN_ACCESS_ROLE_ID,
              batch_upload: true,
              account_invite_sent: Boolean(invitation_sent),
            },
          });

          const { error: assignmentError } = await supabase
            .from('admin_role_assignments')
            .upsert({
              admin_id: user.id,
              role_id: batchAccessRoleId || DEFAULT_ADMIN_ACCESS_ROLE_ID,
              assigned_by: currentAdminId || null,
              assigned_at: new Date().toISOString(),
            }, { onConflict: 'admin_id' });
          if (assignmentError) throw assignmentError;
        } else {
          const studentNumber = row.student_number.trim();
          const { user, profile, invitation_sent } = await createConfirmedAdminUser({
            email,
            redirect_to: getAccountInviteRedirectUrl(),
            first_name: firstName,
            last_name: lastName,
            username: null,
            student_number: studentNumber,
            role: 'user',
            current_level: 1,
            speaker_level: 1,
            speaker_points: 0,
          });

          await recordAuditLog({
            action: 'create',
            entityType: 'profiles',
            entityId: user.id,
            oldValues: null,
            newValues: {
              ...(profile || {
                id: user.id,
                email,
                role: 'user',
                first_name: firstName,
                last_name: lastName,
                username: null,
                student_number: studentNumber,
              }),
              section_id: batchSectionId || null,
              batch_upload: true,
              account_invite_sent: Boolean(invitation_sent),
            },
          });
          await assignUserToSection(user.id, batchSectionId);
        }

        createdCount += 1;
      }

      await refreshProfiles();
      if (batchAccountType === 'admin') await refreshRbacData();
      showToast(`${createdCount} ${batchAccountType === 'admin' ? 'admin' : 'user'} account${createdCount === 1 ? '' : 's'} created. Welcome invite${createdCount === 1 ? '' : 's'} sent.`);
      setSuccessModal({
        title: 'Batch Account Creation Successful',
        message: `${createdCount} ${batchAccountType === 'admin' ? 'admin' : 'user'} account${createdCount === 1 ? '' : 's'} have been successfully created.`,
        emailMessage: 'Please ask the user(s) to check their email inbox for a verification/invitation link to set up their password.'
      });
      setShowBatchAccountModal(false);
      resetBatchImportState();
    } catch (batchError) {
      setBatchImportStatus('ready');
      showToast(`${createdCount} created before the batch stopped. ${batchError.message || 'Please check the file and try again.'}`, 'error');
      await refreshProfiles();
      if (batchAccountType === 'admin') {
        try {
          await refreshRbacData();
        } catch {
          // The original account creation error is more useful to show.
        }
      }
    }
  };

  const submitSection = async (e) => {
    e.preventDefault();
    const name = sectionForm.name.trim();
    if (!name) {
      showToast('Section name is required', 'error');
      return;
    }
    const payload = {
      name,
      teacher_id: isSuperadmin ? (sectionForm.teacher_id || null) : currentAdminId,
      created_by: currentAdminId || null,
      updated_at: new Date().toISOString(),
    };
    if (!payload.teacher_id) {
      showToast('Choose an admin for this section', 'error');
      return;
    }
    try {
      const query = sectionForm.id
        ? supabase.from('sections').update(payload).eq('id', sectionForm.id).select('*').single()
        : supabase.from('sections').insert(payload).select('*').single();
      const { data, error } = await query;
      if (error) throw error;
      await recordAuditLog({
        action: sectionForm.id ? 'update' : 'create',
        entityType: 'sections',
        entityId: data?.id || sectionForm.id,
        oldValues: sectionForm.id ? sections.find(section => section.id === sectionForm.id) : null,
        newValues: data || payload,
      });
      setSectionForm({ id: '', name: '', teacher_id: '' });
      setShowSectionModal(false);
      await refreshRbacData();
      showToast('Section saved');
    } catch (sectionError) {
      showToast(sectionError.message || 'Failed to save section', 'error');
    }
  };

  const editSection = (section) => {
    setSectionForm({
      id: section.id,
      name: section.name || '',
      teacher_id: section.teacher_id || '',
    });
    setShowSectionModal(true);
  };

  const openNewSection = () => {
    setSectionForm({ id: '', name: '', teacher_id: '' });
    setShowSectionModal(true);
  };

  const requestDeleteSection = (section) => {
    const assignedStudents = sectionStudents.filter(row => row.section_id === section.id);
    const assignedCount = sectionStudentIdsBySectionId.get(section.id)?.size || assignedStudents.length;
    setPendingDeleteConfirmation({
      kind: 'section',
      id: section.id,
      title: 'Delete section?',
      message: assignedCount
        ? `This will delete "${section.name}" and unassign ${assignedCount} user${assignedCount === 1 ? '' : 's'} from it.`
        : `This will delete "${section.name}".`,
      confirmLabel: 'Delete Section',
    });
  };

  const deleteSection = async (sectionId) => {
    const section = sections.find(item => item.id === sectionId);
    if (!section) {
      showToast('Section was not found', 'error');
      return;
    }
    const assignedStudents = sectionStudents.filter(row => row.section_id === section.id);
    try {
      const { error: assignmentDeleteError } = await supabase
        .from('section_students')
        .delete()
        .eq('section_id', section.id);
      if (assignmentDeleteError) throw assignmentDeleteError;

      const { error: sectionDeleteError } = await supabase
        .from('sections')
        .delete()
        .eq('id', section.id);
      if (sectionDeleteError) throw sectionDeleteError;

      await recordAuditLog({
        action: 'delete',
        entityType: 'sections',
        entityId: section.id,
        oldValues: { ...section, assigned_students: assignedStudents },
        newValues: null,
      });

      if (sectionForm.id === section.id) {
        setSectionForm({ id: '', name: '', teacher_id: '' });
        setShowSectionModal(false);
      }
      if (batchSectionId === section.id) setBatchSectionId('');
      if (analyticsSectionFilter === section.id) setAnalyticsSectionFilter('all');

      await refreshRbacData();
      showToast('Section deleted');
    } catch (sectionError) {
      showToast(sectionError.message || 'Failed to delete section', 'error');
    }
  };

  const confirmPendingDelete = async () => {
    if (!pendingDeleteConfirmation) return;
    const pendingDelete = pendingDeleteConfirmation;
    setPendingDeleteConfirmation(null);

    if (pendingDelete.kind === 'content') {
      await deleteContent(pendingDelete.id, pendingDelete.type);
      return;
    }

    if (pendingDelete.kind === 'accessRole') {
      await deleteAccessRole(pendingDelete.id);
      return;
    }

    if (pendingDelete.kind === 'section') {
      await deleteSection(pendingDelete.id);
    }
  };

  const profilePayloadFromUserForm = () => ({
    first_name: userForm.first_name.trim() || null,
    last_name: userForm.last_name.trim() || null,
    username: userForm.username.trim() || null,
    student_number: userForm.student_number.trim() || null,
    role: 'user',
    current_level: Math.min(5, Math.max(1, Number(userForm.current_level) || 1)),
    speaker_level: Math.min(5, Math.max(1, Number(userForm.speaker_level) || 1)),
    speaker_points: Number(userForm.speaker_points) || 0,
    updated_at: new Date().toISOString(),
  });

  const selectedJourneyActivities = useMemo(() => {
    const journey = clampJourneyLevel(stageProgressForm.journey);
    return activities
      .filter((activity) => Number(activity.target_level) === journey)
      .sort((a, b) => (Number(a.activity_order) || 0) - (Number(b.activity_order) || 0));
  }, [activities, stageProgressForm.journey]);

  const selectedJourneyMaxStage = useMemo(() => (
    selectedJourneyActivities.reduce((max, activity) => Math.max(max, Number(activity.activity_order) || 0), 0) || 30
  ), [selectedJourneyActivities]);

  const selectedJourneyCompletedCount = useMemo(() => {
    if (!editingUser?.id) return 0;
    const completedIds = new Set(
      activityCompletions
        .filter((completion) => String(completion.user_id) === String(editingUser.id))
        .map((completion) => String(completion.activity_id))
    );
    return selectedJourneyActivities.filter((activity) => completedIds.has(String(activity.id))).length;
  }, [activityCompletions, editingUser?.id, selectedJourneyActivities]);

  const requestStageProgressApply = () => {
    if (!editingUser?.id) return;
    if (!selectedJourneyActivities.length) {
      showToast(`No stages were found for Journey ${stageProgressForm.journey}`, 'error');
      return;
    }

    const completeThroughStage = clampStageNumber(stageProgressForm.completeThroughStage, selectedJourneyMaxStage);
    const targetActivities = selectedJourneyActivities.filter((activity) => Number(activity.activity_order) <= completeThroughStage);
    if (!targetActivities.length) {
      showToast('Choose at least one stage to complete.', 'error');
      return;
    }

    const journey = clampJourneyLevel(stageProgressForm.journey);
    const shouldAdvance = Boolean(stageProgressForm.advanceJourney && completeThroughStage >= selectedJourneyMaxStage && journey < 5);
    setPendingStageProgress({
      user: editingUser,
      journey,
      completeThroughStage,
      targetActivities,
      shouldAdvance,
      nextJourneyLevel: shouldAdvance ? Math.max(clampJourneyLevel(userForm.current_level), journey + 1) : clampJourneyLevel(userForm.current_level),
    });
  };

  const confirmStageProgressApply = async () => {
    if (!pendingStageProgress?.user?.id) return;
    setApplyingStageProgress(true);
    try {
      const activityIds = pendingStageProgress.targetActivities.map((activity) => activity.id);
      const result = await applyStageProgressWithAdminFunction(pendingStageProgress.user.id, {
        activity_ids: activityIds,
        advance_to_level: pendingStageProgress.shouldAdvance ? pendingStageProgress.nextJourneyLevel : null,
      });
      const completedAt = result.completed_at || new Date().toISOString();
      const rows = activityIds.map((activityId) => ({
        user_id: pendingStageProgress.user.id,
        activity_id: activityId,
        completed_at: completedAt,
      }));

      const updatedProfile = result.profile || null;
      if (updatedProfile) {
        setProfiles(prev => prev.map(u => u.id === pendingStageProgress.user.id ? { ...u, ...updatedProfile } : u));
        setEditingUser(prev => prev?.id === pendingStageProgress.user.id ? { ...prev, ...updatedProfile } : prev);
        setUserForm(prev => ({ ...prev, current_level: updatedProfile.current_level || pendingStageProgress.nextJourneyLevel }));
      }

      setActivityCompletions(prev => {
        const existingKeys = new Set(prev.map((completion) => `${completion.user_id}:${completion.activity_id}`));
        const additions = rows
          .filter((row) => !existingKeys.has(`${row.user_id}:${row.activity_id}`))
          .map((row) => ({ ...row, id: `${row.user_id}:${row.activity_id}` }));
        return [...additions, ...prev];
      });

      await recordAuditLog({
        action: 'update',
        entityType: 'user_activity_completions',
        entityId: pendingStageProgress.user.id,
        oldValues: {
          user_id: pendingStageProgress.user.id,
          journey: pendingStageProgress.journey,
          completed_count_before: selectedJourneyCompletedCount,
          current_level_before: pendingStageProgress.user.current_level,
        },
        newValues: {
          user_id: pendingStageProgress.user.id,
          journey: pendingStageProgress.journey,
          complete_through_stage: pendingStageProgress.completeThroughStage,
          completed_activity_ids: rows.map((row) => row.activity_id),
          advanced_to_journey: pendingStageProgress.shouldAdvance ? pendingStageProgress.nextJourneyLevel : null,
          profile: updatedProfile,
        },
      });

      showToast(`Marked Journey ${pendingStageProgress.journey} through Stage ${pendingStageProgress.completeThroughStage} complete`);
      setPendingStageProgress(null);
    } catch (stageError) {
      showToast(stageError.message || 'Failed to apply stage progress', 'error');
    } finally {
      setApplyingStageProgress(false);
    }
  };

  const profilePayloadFromAdminForm = () => ({
    first_name: adminAccountForm.first_name.trim() || null,
    last_name: adminAccountForm.last_name.trim() || null,
    username: adminAccountForm.username.trim() || null,
    role: adminAccountForm.role === 'superadmin' ? 'superadmin' : 'admin',
    current_level: 1,
    speaker_level: 1,
    speaker_points: 0,
    updated_at: new Date().toISOString(),
  });

  const submitCreateUser = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      const email = userForm.email.trim();
      const { user, profile, invitation_sent } = await createConfirmedAdminUser({
        email,
        redirect_to: getAccountInviteRedirectUrl(),
        ...profilePayloadFromUserForm(),
      });

      await recordAuditLog({
        action: 'create',
        entityType: 'profiles',
        entityId: user.id,
        oldValues: null,
        newValues: {
          ...(profile || { id: user.id, ...profilePayloadFromUserForm(), archived_at: null }),
          section_id: userForm.section_id || null,
          account_invite_sent: Boolean(invitation_sent),
        },
      });
      await assignUserToSection(user.id, userForm.section_id);
      showToast('User created. Welcome invite sent.');
      setSuccessModal({
        title: 'User Created Successfully',
        message: `The student account for ${email} has been successfully created.`,
        emailMessage: 'Please ask the student to check their email inbox for an invitation link to set up their password.'
      });
      setCreatingUser(false);
      setUserForm(USER_FORM_INITIAL);
      await refreshProfiles();
    } catch (e) {
      showToast(e.message || 'Failed to create user', 'error');
    } finally {
      setSavingUser(false);
    }
  };

  const submitUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingUser(true);
    const payload = profilePayloadFromUserForm();
    try {
      const updatedProfile = await updateProfileWithAdminFunction(editingUser.id, payload);
      await assignUserToSection(editingUser.id, userForm.section_id);
      await recordAuditLog({
        action: 'update',
        entityType: 'profiles',
        entityId: editingUser.id,
        oldValues: editingUser,
        newValues: { ...updatedProfile, section_id: userForm.section_id || null },
      });
      showToast('User updated');
      setEditingUser(null);
      setProfiles(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updatedProfile } : u));
      await refreshProfiles();
    } catch (updateError) {
      showToast(updateError.message || 'Failed to update user', 'error');
    } finally {
      setSavingUser(false);
    }
  };

  const setUserArchiveState = async (user, shouldArchive) => {
    const label = shouldArchive ? 'archive' : 'restore';
    let newValues;
    try {
      newValues = await setProfileArchiveStateWithAdminFunction(user.id, shouldArchive);
    } catch (error) {
      showToast(error.message || `Failed to ${label} account`, 'error');
      return;
    }
    await recordAuditLog({
      action: shouldArchive ? 'delete' : 'restore',
      entityType: 'profiles',
      entityId: user.id,
      oldValues: user,
      newValues,
    });
    setProfiles(prev => prev.map(u => u.id === user.id ? { ...u, ...newValues } : u));
    setEditingUser(prev => prev?.id === user.id ? { ...prev, ...newValues } : prev);
    setEditingAdmin(prev => prev?.id === user.id ? { ...prev, ...newValues } : prev);
    showToast(`${isAdminProfile(user) ? 'Admin' : 'User'} ${shouldArchive ? 'archived' : 'restored'}`);
  };

  const submitUpdateAdmin = async (e) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setCreatingAdmin(true);
    try {
      const payload = profilePayloadFromAdminForm();
      const { error: updateError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', editingAdmin.id);
      if (updateError) throw updateError;
      await recordAuditLog({
        action: 'update',
        entityType: 'profiles',
        entityId: editingAdmin.id,
        oldValues: editingAdmin,
        newValues: { ...editingAdmin, ...payload, access_role_id: adminAccountForm.access_role_id },
      });
      if (payload.role === 'superadmin') {
        const { error: assignmentDeleteError } = await supabase
          .from('admin_role_assignments')
          .delete()
          .eq('admin_id', editingAdmin.id);
        if (assignmentDeleteError) throw assignmentDeleteError;
      } else {
        const { error: assignmentError } = await supabase
          .from('admin_role_assignments')
          .upsert({
            admin_id: editingAdmin.id,
            role_id: adminAccountForm.access_role_id || DEFAULT_ADMIN_ACCESS_ROLE_ID,
            assigned_by: currentAdminId || null,
            assigned_at: new Date().toISOString(),
          }, { onConflict: 'admin_id' });
        if (assignmentError) throw assignmentError;
      }
      await refreshRbacData();
      showToast('Admin updated');
      setEditingAdmin(null);
      setProfiles(prev => prev.map(u => u.id === editingAdmin.id ? { ...u, ...payload } : u));
    } catch (adminUpdateError) {
      showToast(adminUpdateError.message || 'Failed to update admin', 'error');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const requestUserArchiveState = (user, shouldArchive) => {
    if (shouldArchive) {
      setPendingArchiveUser(user);
      return;
    }
    setUserArchiveState(user, false);
  };

  const confirmArchiveUser = async () => {
    if (!pendingArchiveUser) return;
    const user = pendingArchiveUser;
    setPendingArchiveUser(null);
    await setUserArchiveState(user, true);
  };

  const submitCreateAdmin = async (e) => {
    e.preventDefault();
    setCreatingAdmin(true);
    try {
      const { email, first_name, last_name, role: newRole, access_role_id } = createAdminForm;
      const normalizedEmail = email.trim();
      const { user, profile, invitation_sent } = await createConfirmedAdminUser({
        email: normalizedEmail,
        redirect_to: getAccountInviteRedirectUrl(),
        first_name,
        last_name,
        username: null,
        role: newRole,
        current_level: 1,
        speaker_level: 1,
        speaker_points: 0,
      });
      await recordAuditLog({
        action: 'create',
        entityType: 'profiles',
        entityId: user.id,
        oldValues: null,
        newValues: {
          ...(profile || { id: user.id, role: newRole, first_name, last_name, username: null }),
          access_role_id,
          account_invite_sent: Boolean(invitation_sent),
        },
      });
      if (newRole !== 'superadmin') {
        const { error: assignmentError } = await supabase
          .from('admin_role_assignments')
          .upsert({
            admin_id: user.id,
            role_id: access_role_id || DEFAULT_ADMIN_ACCESS_ROLE_ID,
            assigned_by: currentAdminId || null,
            assigned_at: new Date().toISOString(),
          }, { onConflict: 'admin_id' });
        if (assignmentError) throw assignmentError;
      }
      await refreshRbacData();
      showToast('Admin created. Welcome invite sent.');
      setSuccessModal({
        title: 'Admin Created Successfully',
        message: `The admin account for ${normalizedEmail} has been successfully created.`,
        emailMessage: 'Please ask the administrator/teacher to check their email inbox for an invitation link to set up their password.'
      });
      setCreateAdminForm(ADMIN_FORM_INITIAL);
      setShowCreateAdminModal(false);
      const { data: ps } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (ps) setProfiles(ps);
    } catch (error) {
      showToast(error.message || 'Failed to create admin', 'error');
    }
    setCreatingAdmin(false);
  };

  const canViewActivities = canUseAdminPermission('activities', 'view');
  const canViewModules = canUseAdminPermission('modules', 'view');
  const currentContentArea = contentTab === 'activities' ? 'activities' : 'modules';
  const canCreateCurrentContent = canUseAdminPermission(currentContentArea, 'create');
  const canUpdateCurrentContent = canUseAdminPermission(currentContentArea, 'update');
  const canDeleteCurrentContent = canUseAdminPermission(currentContentArea, 'delete');
  const selectedBatchAccessRole = findAccessRole(adminAccessRoles, batchAccessRoleId);
  const accessRoleReviewOptions = [...adminAccessRoles, STUDENT_ACCESS_ROLE_REVIEW];
  const selectedManagedAccessRole = findManagedAccessRole(adminAccessRoles, selectedAccessRoleId);
  const selectedManagedRoleIsStudent = selectedManagedAccessRole?.scope === 'student';
  const batchTemplateColumns = getBatchTemplateColumns(batchAccountType);
  const batchReadyRowCount = batchPreview?.rows?.length || 0;
  const batchPreviewTotalPages = Math.max(1, Math.ceil(batchReadyRowCount / BATCH_PREVIEW_ROWS_PER_PAGE));
  const safeBatchPreviewPage = Math.min(batchPreviewPage, batchPreviewTotalPages);
  const batchPreviewStartIndex = (safeBatchPreviewPage - 1) * BATCH_PREVIEW_ROWS_PER_PAGE;
  const batchPreviewRows = batchPreview?.rows?.slice(
    batchPreviewStartIndex,
    batchPreviewStartIndex + BATCH_PREVIEW_ROWS_PER_PAGE
  ) || [];
  const batchPreviewInvalidRowNumbers = useMemo(
    () => new Set((batchPreview?.invalidRows || []).map(row => row.rowNumber)),
    [batchPreview]
  );
  const selectedManagedRolePermissions = selectedManagedRoleIsStudent
    ? selectedManagedAccessRole.visibleAreas
    : ADMIN_PERMISSION_AREAS
      .filter(area => selectedManagedAccessRole?.permissions?.[area.key]?.view)
      .map(area => area.label);

  const handleCreateAdminRoleChange = (event) => {
    const nextRoleValue = event.target.value;
    setCreateAdminForm(prev => (
      nextRoleValue === 'superadmin'
        ? { ...prev, role: 'superadmin', access_role_id: DEFAULT_ADMIN_ACCESS_ROLE_ID }
        : { ...prev, role: 'admin', access_role_id: nextRoleValue || DEFAULT_ADMIN_ACCESS_ROLE_ID }
    ));
  };

  const handleAdminAccountRoleChange = (event) => {
    const nextRoleValue = event.target.value;
    setAdminAccountForm(prev => (
      nextRoleValue === 'superadmin'
        ? { ...prev, role: 'superadmin', access_role_id: DEFAULT_ADMIN_ACCESS_ROLE_ID }
        : { ...prev, role: 'admin', access_role_id: nextRoleValue || DEFAULT_ADMIN_ACCESS_ROLE_ID }
    ));
  };

  const getReportExportData = () => {
    const dateSuffix = reportStartDate || reportEndDate
      ? `-${reportStartDate || 'any'}-to-${reportEndDate || 'any'}`
      : '';
    const dateTitleSuffix = reportStartDate || reportEndDate
      ? ` (${reportStartDate || 'Any'} to ${reportEndDate || 'Any'})`
      : '';

    if (reportType === 'students') {
      return {
        title: `Users Report${dateTitleSuffix}`,
        filename: `bigkas-users-report${dateSuffix}`,
        headers: ['User', 'ID / Student No.', 'Section', 'Journey', 'Status'],
        rows: filteredReportStudentRows.map(student => [
          getDisplayName(student, student.id),
          student.student_number || '-',
          getLearnerGroupLabel(student, sectionById, sectionIdByStudentId),
          `Journey ${getProgressLevelValue(student)}`,
          isDeletedProfile(student) ? 'Archived' : 'Active',
        ]),
      };
    }

    if (reportType === 'performance') {
      return {
        title: `User Performance Report${dateTitleSuffix}`,
        filename: `bigkas-user-performance-report${dateSuffix}`,
        headers: ['User', 'Section', 'Speeches', 'Minutes', 'Average Score', 'Activities', 'Confidence Level'],
        rows: reportStudentPerformanceRows.map(row => [
          row.name,
          row.section,
          row.speeches,
          row.minutes,
          row.averageScore ?? 'N/A',
          `${row.completedActivities}/30`,
          row.confidenceLevel.level ? `Level ${row.confidenceLevel.level} - ${row.confidenceLevel.label}` : row.confidenceLevel.label,
        ]),
      };
    }

    if (reportType === 'audit' && isSuperadmin) {
      return {
        title: `Audit Logs Report${dateTitleSuffix}`,
        filename: `bigkas-audit-logs-report${dateSuffix}`,
        headers: ['Time', 'Actor', 'Action', 'Entity', 'Summary'],
        rows: reportAuditLogs.slice(0, 200).map(log => [
          new Date(log.created_at).toLocaleString(),
          getDisplayName(profiles.find(p => p.id === log.actor_id), log.actor_id || 'Unknown login'),
          formatAuditAction(log.action),
          log.entity_type,
          JSON.stringify(log.new_values || log.old_values || {}).slice(0, 120) || '-',
        ]),
      };
    }

    return {
      title: `Admins Report${dateTitleSuffix}`,
      filename: `bigkas-admins-report${dateSuffix}`,
      headers: ['Admin', 'Email', 'Access Role', 'Sections', 'Status'],
      rows: filteredReportTeacherRows.map(admin => [
        getDisplayName(admin, admin.id),
        getProfileEmail(admin),
        admin.role === 'superadmin' ? 'Super Admin' : findAccessRole(adminAccessRoles, adminAccessAssignments[admin.id])?.name || 'Admin',
        sections.filter(section => section.teacher_id === admin.id).length,
        isDeletedProfile(admin) ? 'Archived' : 'Active',
      ]),
    };
  };

  const saveReportExcel = () => {
    const report = getReportExportData();
    downloadReportWorkbook(report.filename, report.title, report.headers, report.rows);
  };

  const adminRosterTitle = `${adminAccounts.length} admin${adminAccounts.length === 1 ? '' : 's'}`;
  const canCreateUsers = canUseAdminPermission('users', 'create');
  const canDeleteUsers = canUseAdminPermission('users', 'delete');

  const navItems = [
    { key: 'overview', label: 'Overview', icon: HiOutlineHomeModern, show: canUseAdminPermission('overview', 'view') },
    { key: 'analytics', label: 'Analytics', icon: HiOutlineChartBarSquare, show: canUseAdminPermission('analytics', 'view') },
    { key: 'users', label: 'Account Management', icon: HiOutlineUsers, show: canUseAdminPermission('users', 'view') },
    { key: 'content', label: 'Content Hub', icon: HiOutlineChartBarSquare, show: canViewActivities || canViewModules },
    { key: 'reports', label: 'Reports', icon: HiOutlineChartBarSquare, show: canUseAdminPermission('reports', 'view') },
    { key: 'audit', label: 'Audit Logs', icon: HiOutlineCog6Tooth, show: isSuperadmin },
  ].filter(i => i.show);

  return (
    <div className="admin-dashboard-page admin-layout" style={{ '--admin-sidebar-width': `${SIDEBAR_WIDTH}px` }}>
      <aside className="admin-rail">
        <div className="admin-rail-inner">
          <div className="admin-rail-brand"><p>BIGKAS</p><small>Management Center</small></div>
          <nav className="admin-rail-nav">
            {navItems.map(item => (
              <button key={item.key} type="button" className={`admin-rail-btn ${activePage === item.key ? 'is-active' : ''}`} onClick={() => setActivePage(item.key)}>
                <item.icon size={18} /><span>{item.label}</span>
              </button>
            ))}
          </nav>
          <button type="button" className="admin-logout admin-logout--rail" onClick={onLogout}>Log Out</button>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div>
            <p className="admin-kicker">Bigkas Analytics Engine</p>
            <h1>Bigkas Command Center</h1>
            <p className="admin-subtitle">Role: <strong>{role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'unknown'}</strong></p>
          </div>
        </header>

        {error && <div className="admin-error">{error}</div>}

        {activePage === 'overview' && (
          <>
            <section className={`admin-grid ${isSuperadmin ? 'admin-grid-3' : 'admin-grid-2'}`} aria-label="Management overview metrics">
              <article className="admin-card admin-kpi-card">
                <p className="admin-kpi-label">TOTAL USERS</p>
                <p className="admin-kpi-value">{loading ? <Skeleton width={60} /> : kpis.totalUsers}</p>
                <p className="admin-kpi-footer">{kpis.usersDeltaText}</p>
              </article>
              <article
                className="admin-card admin-kpi-card"
                role="button"
                tabIndex={0}
                style={{ cursor: loading ? 'default' : 'pointer' }}
                aria-label="View active and inactive users this week"
                onClick={() => !loading && setShowActiveUsersModal(true)}
                onKeyDown={(event) => {
                  if (!loading && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    setShowActiveUsersModal(true);
                  }
                }}
              >
                <p className="admin-kpi-label">ACTIVE / INACTIVE</p>
                <p className="admin-kpi-value">{loading ? <Skeleton width={60} /> : `${kpis.activeThisWeek} / ${kpis.inactiveThisWeek}`}</p>
                <p className="admin-kpi-footer">{kpis.activeDeltaText}</p>
              </article>
              {isSuperadmin && (
                <article className="admin-card admin-kpi-card">
                  <p className="admin-kpi-label">TEACHER COUNT</p>
                  <p className="admin-kpi-value">{loading ? <Skeleton width={60} /> : kpis.totalAdmins}</p>
                  <p className="admin-kpi-footer">{kpis.adminsDeltaText}</p>
                </article>
              )}
            </section>
            <section className="admin-grid admin-grid-2">
              <article className="admin-card"><h3>User Registration</h3><div className="admin-chart-container">
                {loading ? <Skeleton height={300} /> : <ResponsiveContainer width="100%" height={300}><AreaChart data={joinTrendData}><XAxis dataKey="date" /><YAxis /><Tooltip /><Area type="monotone" dataKey="users" name="Users" stroke="#33D2A4" fill="#33D2A433" /></AreaChart></ResponsiveContainer>}
              </div></article>
              <article className="admin-card"><h3>User Level Distribution</h3><div className="admin-chart-container">
                {loading ? <Skeleton height={300} /> : <ResponsiveContainer width="100%" height={300}><BarChart data={levelBarData}><XAxis dataKey="level" /><YAxis /><Tooltip /><Bar dataKey="users" name="Users" fill="#33D2A4" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer>}
              </div></article>
            </section>
          </>
        )}

        {activePage === 'analytics' && (
          <>
            <section className="admin-analytics-filter-card">
              <div className="admin-analytics-filter-copy">
                <h3>{isSuperadmin ? 'System Analytics' : 'Section Analytics'}</h3>
                <p>
                  {isSuperadmin
                    ? 'Super Admin view: all users, sections, confidence levels, and system monitoring.'
                    : 'Admin view: only users and performance data from your assigned sections.'}
                </p>
              </div>
              <div className="admin-analytics-filters">
                <label>
                  <span>Date Range</span>
                  <select className="admin-filter-select" value={analyticsRange} onChange={e => setAnalyticsRange(e.target.value)}>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                  <small>Controls recent activity, skill scores, and audit previews.</small>
                </label>
                <label>
                  <span>Section</span>
                  <select className="admin-filter-select" value={analyticsSectionFilter} onChange={e => setAnalyticsSectionFilter(e.target.value)}>
                    <option value="all">{isSuperadmin ? 'All users' : 'My sections'}</option>
                    {isSuperadmin && <option value={INDEPENDENT_LEARNERS_FILTER}>{INDEPENDENT_LEARNERS_LABEL}</option>}
                    {visibleSections.map(section => <option key={section.id} value={section.id}>{section.name}</option>)}
                  </select>
                  <small>{isSuperadmin ? 'Filter to one class section or independent users.' : 'Only assigned sections are available.'}</small>
                </label>
              </div>
            </section>

            <section className="admin-grid admin-grid-1" aria-label="Analytics summary">
              <article className="admin-card admin-kpi-card">
                <p className="admin-kpi-label">USERS IN VIEW</p>
                <p className="admin-kpi-value">{loading ? <Skeleton width={60} /> : analyticsKpis.students}</p>
                <p className="admin-kpi-footer">{analyticsSpeakerLevelFilter === 'all' ? 'All speaker levels' : `Speaker Level ${analyticsSpeakerLevelFilter}`}</p>
              </article>
            </section>

            <section className="admin-grid admin-grid-1">
              <article className="admin-card admin-tiered-scoring-card">
                <div className="admin-card-head">
                  <div>
                    <h3>Tiered Scoring</h3>
                    <p className="admin-chart-note">Users are grouped by attempted activities in the 30-activity confidence progression.</p>
                  </div>
                  <label className="admin-inline-filter">
                    <span>Speaker Level</span>
                    <select className="admin-filter-select" value={analyticsSpeakerLevelFilter} onChange={e => setAnalyticsSpeakerLevelFilter(e.target.value)}>
                      <option value="all">All Levels</option>
                      <option value="1">Level 1</option>
                      <option value="2">Level 2</option>
                      <option value="3">Level 3</option>
                      <option value="4">Level 4</option>
                      <option value="5">Level 5</option>
                    </select>
                  </label>
                </div>
                <div className="admin-chart-container">
                  {loading ? <Skeleton height={300} /> : analyticsConfidenceRows.some(row => row.students) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsConfidenceRows}>
                        <XAxis dataKey="range" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="students" fill="#33D2A4" radius={[8, 8, 0, 0]} name="Users" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="admin-empty-chart">No confidence progress yet</div>}
                </div>
              </article>
            </section>

            <section className="admin-grid admin-grid-1">
              <article className="admin-card">
                <div className="admin-card-head">
                  <div>
                    <h3>Level Pass Rate</h3>
                    <p className="admin-chart-note">Shows how many users passed or have not passed each speaker level requirement.</p>
                  </div>
                  <label className="admin-inline-filter">
                    <span>Speaker Level</span>
                    <select className="admin-filter-select" value={analyticsSpeakerLevelFilter} onChange={e => setAnalyticsSpeakerLevelFilter(e.target.value)}>
                      <option value="all">All Levels</option>
                      <option value="1">Level 1</option>
                      <option value="2">Level 2</option>
                      <option value="3">Level 3</option>
                      <option value="4">Level 4</option>
                      <option value="5">Level 5</option>
                    </select>
                  </label>
                </div>
                <div className="admin-chart-container admin-level-pass-chart">
                  {loading ? <Skeleton height={300} /> : analyticsLevelPassRows.length ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsLevelPassRows}>
                        <XAxis dataKey="level" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="passed" stackId="level-pass" fill="#33D2A4" radius={[0, 0, 8, 8]} name="Passed" />
                        <Bar dataKey="notPassed" stackId="level-pass" fill="#F87171" radius={[8, 8, 0, 0]} name="Not Passed" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="admin-empty-chart">No users found for this filter</div>}
                </div>
              </article>
            </section>

            <section className="admin-grid admin-grid-1">
              <article className="admin-card">
                <div className="admin-card-head">
                  <div>
                    <h3>Stage Pass Rate</h3>
                    <p className="admin-chart-note">Shows how many users passed or have not passed each individual stage requirement.</p>
                  </div>
                  <label className="admin-inline-filter">
                    <span>Speaker Level</span>
                    <select className="admin-filter-select" value={analyticsSpeakerLevelFilter} onChange={e => setAnalyticsSpeakerLevelFilter(e.target.value)}>
                      <option value="all">All Levels</option>
                      <option value="1">Level 1</option>
                      <option value="2">Level 2</option>
                      <option value="3">Level 3</option>
                      <option value="4">Level 4</option>
                      <option value="5">Level 5</option>
                    </select>
                  </label>
                </div>
                <div className="admin-chart-container admin-level-pass-chart">
                  {loading ? <Skeleton height={300} /> : analyticsStagePassRows.length ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={paginatedAnalyticsStagePassRows}>
                        <XAxis dataKey="chartLabel" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="passed" stackId="stage-pass" fill="#33D2A4" radius={[0, 0, 8, 8]} name="Passed" />
                        <Bar dataKey="notPassed" stackId="stage-pass" fill="#F87171" radius={[8, 8, 0, 0]} name="Not Passed" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="admin-empty-chart">No stages found for this filter</div>}
                </div>
                <div className="admin-table-wrap admin-confidence-table-wrap admin-level-pass-table-wrap"><table className="admin-table admin-confidence-table admin-stage-pass-table">
                  <thead><tr><th>Level</th><th>Stage</th><th>Stage Title</th><th>Target Focus</th><th>Passed</th><th>Not Passed</th><th>Pass Rate</th></tr></thead>
                  <tbody>{paginatedAnalyticsStagePassRows.map(row => (
                    <tr key={row.id}>
                      <td>{row.level}</td>
                      <td>{row.stageLabel}</td>
                      <td>{row.title}</td>
                      <td>{row.focus}</td>
                      <td>{row.passed}</td>
                      <td>{row.notPassed}</td>
                      <td>{row.passRate}%</td>
                    </tr>
                  ))}</tbody>
                </table></div>
                {analyticsStagePassRows.length > 0 && (
                  <div className="admin-pagination admin-stage-pass-pagination">
                    <span className="admin-pagination-info">
                      Showing {analyticsStageStartIndex + 1}-{Math.min(analyticsStageStartIndex + paginatedAnalyticsStagePassRows.length, analyticsStagePassRows.length)} of {analyticsStagePassRows.length} stages
                    </span>
                    <div className="admin-pagination-controls">
                      <button type="button" onClick={() => setAnalyticsStagePage(page => Math.max(1, page - 1))} disabled={safeAnalyticsStagePage === 1}>Prev</button>
                      <span>{safeAnalyticsStagePage} / {analyticsStageTotalPages}</span>
                      <button type="button" onClick={() => setAnalyticsStagePage(page => Math.min(analyticsStageTotalPages, page + 1))} disabled={safeAnalyticsStagePage === analyticsStageTotalPages}>Next</button>
                    </div>
                  </div>
                )}
              </article>
            </section>

            <section className="admin-grid admin-grid-1">
              <article className="admin-card">
                <h3>Skill Breakdown</h3>
                <p className="admin-chart-note">Separate confidence measurements for Visual, Vocal, and Verbal scoring.</p>
                <div className="admin-table-wrap admin-confidence-table-wrap"><table className="admin-table admin-confidence-table">
                  <thead><tr><th>Skill</th><th>Average</th><th>Measured Users</th><th>Source</th></tr></thead>
                  <tbody>{analyticsSkillBreakdown.map(row => (
                    <tr key={row.skill}>
                      <td><strong>{row.skill}</strong></td>
                      <td>{row.average == null ? 'N/A' : `${row.average}%`}</td>
                      <td>{row.measuredStudents}</td>
                      <td>{row.description}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              </article>
            </section>

            <section className="admin-card">
              <div className="admin-card-head">
                <div>
                  <h3>User Confidence Rankings</h3>
                  <p className="admin-note">Ranked user progress across activities and Visual, Vocal, and Verbal scores.</p>
                </div>
              </div>
              <div className="admin-table-wrap admin-confidence-rank-table-wrap"><table className="admin-table admin-confidence-rank-table">
                <thead><tr><th>Rank</th><th>User</th><th>Section</th><th>Activities</th><th>Level</th><th>Visual</th><th>Vocal</th><th>Verbal</th><th>Last Active</th></tr></thead>
                <tbody>{analyticsRankedStudentRows.length ? analyticsRankedStudentRows.map((student, index) => (
                  <tr key={student.id}>
                    <td>{index + 1}</td>
                    <td><strong>{student.name}</strong></td>
                    <td>{student.section}</td>
                    <td>{student.completedActivities}/30</td>
                    <td>Level {student.speakerLevel}</td>
                    <td>{student.visualScore == null ? 'N/A' : `${student.visualScore}%`}</td>
                    <td>{student.vocalScore == null ? 'N/A' : `${student.vocalScore}%`}</td>
                    <td>{student.verbalScore == null ? 'N/A' : `${student.verbalScore}%`}</td>
                    <td>{student.lastActiveMs ? new Date(student.lastActiveMs).toLocaleString() : '-'}</td>
                  </tr>
                )) : <tr><td colSpan={9}>No users available for this scope.</td></tr>}</tbody>
              </table></div>
            </section>
          </>
        )}

        {activePage === 'users' && (
          <>
          {isSuperadmin && (
            <section className="admin-grid admin-grid-2 admin-user-setup-grid">
              <article className="admin-card admin-management-card">
                <div className="admin-card-head">
                  <div>
                    <h3>Admin Accounts</h3>
                    <p className="admin-note">{adminRosterTitle}</p>
                  </div>
                  <button type="button" className="admin-btn admin-btn--primary" onClick={() => setShowCreateAdminModal(true)}>Create Admin</button>
                </div>
                <select
                  className="admin-filter-select admin-roster-filter"
                  value={adminStatusFilter}
                  onChange={e => setAdminStatusFilter(e.target.value)}
                  aria-label="Filter admin accounts by status"
                >
                  <option value="active">Active Admins</option>
                  <option value="deleted">Archived Admins</option>
                </select>
                <div className="admin-roster-list admin-roster-list--compact">
                  {adminAccounts.length ? (
                    adminAccounts.slice(0, 4).map(a => (
                      <div key={a.id} className={`admin-roster-item ${isDeletedProfile(a) ? 'is-deleted' : 'is-active'}`}>
                        <div className="admin-roster-info">
                          <strong>{getDisplayName(a, a.id)}</strong>
                          <span>{a.role === 'superadmin' ? 'Super Admin' : findAccessRole(adminAccessRoles, adminAccessAssignments[a.id])?.name || 'Admin'} - {isDeletedProfile(a) ? 'Archived' : 'Active'}</span>
                        </div>
                        <button type="button" className="admin-action-btn" onClick={() => openEditAdmin(a)} title="Edit admin"><HiOutlinePencilSquare /></button>
                      </div>
                    ))
                  ) : (
                    <div className="admin-empty-inline">No {adminStatusFilter === 'deleted' ? 'archived' : 'active'} admin accounts</div>
                  )}
                  {adminAccounts.length > 4 && <p className="admin-note">Showing 4 of {adminAccounts.length}. Use search/filter later for a full roster view.</p>}
                </div>
              </article>
              <article className="admin-card admin-access-role-card admin-management-card">
                <div className="admin-card-head">
                  <div>
                    <h3>Access Roles</h3>
                    <p className="admin-note">Choose a role to review or edit permissions.</p>
                  </div>
                  <button type="button" className="admin-btn admin-btn--ghost" onClick={openNewAccessRole}>New Role</button>
                </div>
                <label className="admin-create-field">
                  <span>Role</span>
                  <select className="admin-filter-select" value={selectedAccessRoleId} onChange={e => setSelectedAccessRoleId(e.target.value)}>
                    {accessRoleReviewOptions.map(roleTemplate => <option key={roleTemplate.id} value={roleTemplate.id}>{roleTemplate.name}</option>)}
                  </select>
                </label>
                <div className="admin-role-summary">
                  <strong>{selectedManagedAccessRole?.name || 'Role'}</strong>
                  <span>{selectedManagedAccessRole?.description || 'No description'}</span>
                  <p>{selectedManagedRolePermissions.length ? selectedManagedRolePermissions.join(', ') : 'No visible areas yet'}</p>
                </div>
                <div className="admin-card-actions">
                  {!selectedManagedRoleIsStudent && <button type="button" className="admin-btn admin-btn--primary" onClick={openSelectedAccessRole}>Edit Permissions</button>}
                  {selectedManagedAccessRole && !selectedManagedAccessRole.system && (
                    <button type="button" className="admin-btn admin-btn--danger" onClick={() => requestDeleteAccessRole(selectedManagedAccessRole.id)}>Delete Role</button>
                  )}
                </div>
              </article>
            </section>
          )}
          <section className="admin-card admin-section-card">
            <div className="admin-card-head">
              <div>
                <h3>Sections</h3>
                <p className="admin-note">Admins manage users through assigned sections.</p>
              </div>
              <button type="button" className="admin-btn admin-btn--ghost" onClick={openNewSection}>New Section</button>
            </div>
            <div className="admin-section-list">
              {visibleSections.length ? visibleSections.map(section => {
                const count = sectionStudentIdsBySectionId.get(section.id)?.size || 0;
                const teacher = profiles.find(profile => profile.id === section.teacher_id);
                return (
                  <div key={section.id} className="admin-section-item">
                    <div>
                      <strong>{section.name}</strong>
                      <span>{count} user{count === 1 ? '' : 's'} - {getDisplayName(teacher, 'Unassigned admin')}</span>
                    </div>
                    <div className="admin-section-actions">
                      <button type="button" className="admin-action-btn" onClick={() => editSection(section)} title="Edit section"><HiOutlinePencilSquare /></button>
                      {canDeleteUsers && <button type="button" className="admin-action-btn is-delete" onClick={() => requestDeleteSection(section)} title="Delete section"><HiOutlineTrash /></button>}
                    </div>
                  </div>
                );
              }) : <div className="admin-empty-chart">No sections yet</div>}
            </div>
          </section>
          <section className="admin-card">
            <div className="admin-table-controls">
              <h3>Account Management</h3>
              <div className="admin-table-actions">
                <div className="admin-search-box"><HiMagnifyingGlass /><input type="text" placeholder="Search..." value={userSearchQuery} onChange={e => { setUserSearchQuery(e.target.value); setUserPage(1); }} /></div>
                {isSuperadmin && (
                  <select className="admin-filter-select" value={userAccountTypeFilter} onChange={e => {
                    setUserAccountTypeFilter(e.target.value);
                    setUserPage(1);
                    if (e.target.value !== 'users') setUserLevelFilter('all');
                  }}>
                    <option value="users">Users</option>
                    <option value="admins">Admins</option>
                  </select>
                )}
                <select className="admin-filter-select" value={userLevelFilter} disabled={userAccountTypeFilter !== 'users'} onChange={e => { setUserLevelFilter(e.target.value); setUserPage(1); }}>
                  <option value="all">All Journeys</option>
                  <option value="1">Journey 1</option>
                  <option value="2">Journey 2</option>
                  <option value="3">Journey 3</option>
                  <option value="4">Journey 4</option>
                  <option value="5">Journey 5</option>
                </select>
                <select className="admin-filter-select" value={userStatusFilter} onChange={e => { setUserStatusFilter(e.target.value); setUserPage(1); }}>
                  <option value="all">All Statuses</option>
                  <option value="active">Active Accounts</option>
                  <option value="deleted">Archived Accounts</option>
                </select>
                <select className="admin-filter-select" value={userSortKey} onChange={e => { setUserSortKey(e.target.value); setUserPage(1); }}>
                  <option value="name_asc">Sort: Name A-Z</option>
                  <option value="name_desc">Sort: Name Z-A</option>
                  <option value="newest">Sort: Newest</option>
                  <option value="oldest">Sort: Oldest</option>
                  <option value="status">Sort: Status</option>
                  <option value="type">Sort: Account Type</option>
                  <option value="role_section">Sort: Role / Section</option>
                  <option value="journey_asc">Sort: Journey Low-High</option>
                  <option value="journey_desc">Sort: Journey High-Low</option>
                </select>
                {canUseAdminPermission('users', 'create') && (
                  <button type="button" className="admin-btn admin-btn--primary" onClick={userAccountTypeFilter === 'admins' && isSuperadmin ? () => setShowCreateAdminModal(true) : openCreateUser}>
                    {userAccountTypeFilter === 'admins' && isSuperadmin ? 'Create Admin' : 'Create User'}
                  </button>
                )}
              </div>
            </div>
            {canCreateUsers && (
              <div className="admin-account-batch-panel">
                <div>
                  <h4>Batch Creation</h4>
                  <p className="admin-note">
                    {isSuperadmin
                      ? 'Create user or admin accounts using the Excel/CSV template. Welcome invites are sent by email after saving.'
                      : 'Upload users using: Last Name, First Name, optional ID / Student No., and Email. Users receive welcome invites after saving.'}
                  </p>
                </div>
                <div className="admin-batch-card-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    onClick={openBatchAccountSetup}
                  >
                    Open Batch Setup
                  </button>
                  {batchImportFile && <p className="admin-note">Selected file: {batchImportFile.name}</p>}
                </div>
              </div>
            )}
            <div className="admin-table-wrap"><table className="admin-table admin-account-table">
              <thead><tr><th>Name</th>{showUserManagementTypeColumn && <th>Account Type</th>}<th>Role / Section</th>{showUserManagementStudentColumns && <th>ID / Student No.</th>}<th>Email</th>{showUserManagementStudentColumns && <th>Journey</th>}{showUserManagementStudentColumns && <th>Speaking</th>}<th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {paginatedUserManagementRows.map(({ profile: u, isAdminAccount, typeLabel, roleOrSection, name, email, journey, speaking }) => (
                  <tr key={u.id}>
                    <td>{name}</td>
                    {showUserManagementTypeColumn && <td>{typeLabel}</td>}
                    <td>{roleOrSection}</td>
                    {showUserManagementStudentColumns && <td>{isAdminAccount ? '-' : u.student_number || '-'}</td>}
                    <td>{email}</td>
                    {showUserManagementStudentColumns && <td>{isAdminAccount ? '-' : `J-${journey}`}</td>}
                    {showUserManagementStudentColumns && <td>{isAdminAccount ? '-' : `L-${speaking}`}</td>}
                    <td><span className={`admin-status-badge ${isDeletedProfile(u) ? 'is-archived' : 'is-active'}`}>{isDeletedProfile(u) ? 'Archived' : 'Active'}</span></td>
                    <td className="admin-actions-cell">
                      {isAdminAccount ? (
                        <>
                          {isSuperadmin && <button type="button" onClick={() => openEditAdmin(u)} className="admin-action-btn" title="Edit admin"><HiOutlinePencilSquare /></button>}
                          {isSuperadmin && (
                            <button type="button" onClick={() => requestUserArchiveState(u, !isDeletedProfile(u))} className={`admin-action-btn ${isDeletedProfile(u) ? '' : 'is-delete'}`} title={isDeletedProfile(u) ? 'Restore admin' : 'Archive admin'} disabled={u.id === currentAdminId}>
                              {isDeletedProfile(u) ? <HiCheckCircle /> : <HiOutlineTrash />}
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {canUseAdminPermission('users', 'update') && <button type="button" onClick={() => openEditUser(u)} className="admin-action-btn" title="Edit user"><HiOutlinePencilSquare /></button>}
                          {canUseAdminPermission('users', 'delete') && <button type="button" onClick={() => requestUserArchiveState(u, !isDeletedProfile(u))} className={`admin-action-btn ${isDeletedProfile(u) ? '' : 'is-delete'}`} title={isDeletedProfile(u) ? 'Restore user' : 'Archive user'}>
                            {isDeletedProfile(u) ? <HiCheckCircle /> : <HiOutlineTrash />}
                          </button>}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {!paginatedUserManagementRows.length && (
                  <tr><td colSpan={userManagementColumnCount} className="admin-empty-table">No accounts match the selected filters</td></tr>
                )}
              </tbody>
            </table></div>
            <div className="admin-pagination">
              <span className="admin-pagination-info">Showing {userManagementRows.length ? ((userPage - 1) * USERS_PER_PAGE) + 1 : 0}-{Math.min(userPage * USERS_PER_PAGE, userManagementRows.length)} of {userManagementRows.length}</span>
              <div className="admin-pagination-controls">
                <button type="button" disabled={userPage === 1} onClick={() => setUserPage(p => Math.max(1, p - 1))}>Prev</button>
                <button type="button" disabled>{userPage} / {totalUserPages}</button>
                <button type="button" disabled={userPage === totalUserPages} onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}>Next</button>
              </div>
            </div>
          </section>
          </>
        )}

        {activePage === 'content' && (
          <section className="admin-content-hub">
            <div className="admin-tabs">
              {canViewActivities && <button className={`admin-tab-btn ${contentTab === 'activities' ? 'is-active' : ''}`} onClick={() => setContentTab('activities')}>Activities</button>}
              {canViewModules && <button className={`admin-tab-btn ${contentTab === 'modules' ? 'is-active' : ''}`} onClick={() => setContentTab('modules')}>Modules</button>}
            </div>
            <div className="admin-card">
              <div className="admin-card-head">
                <h3>{contentTab === 'activities' ? 'Activity Management' : 'Module Management'}</h3>
                <div className="admin-content-head-actions">
                  <select className="admin-filter-select" value={contentLevelFilter} onChange={e => setContentLevelFilter(e.target.value)} aria-label="Filter content by journey">
                    <option value="all">All Journeys</option>
                    {contentLevelOptions.map(level => <option key={level} value={level}>Journey {level}</option>)}
                  </select>
                  {canCreateCurrentContent && <button onClick={() => setCreatingContent(true)} className="admin-btn admin-btn--primary">Add New</button>}
                </div>
              </div>
              {canCreateCurrentContent && (
                <div className="admin-content-bulk-panel" aria-label={`${contentTab === 'activities' ? 'Activity' : 'Module'} bulk upload setup`}>
                  <div>
                    <h4>{contentTab === 'activities' ? 'Bulk Activity Upload' : 'Bulk Module Upload'}</h4>
                    <p className="admin-note">
                      {contentTab === 'activities'
                        ? 'Prepare an Excel/CSV upload for activity rows across journeys, stages, titles, objectives, skill focus, and passing scores.'
                        : 'Prepare an Excel/CSV upload for module rows across journeys, lesson order, titles, and lesson content.'}
                    </p>
                  </div>
                  <div className="admin-content-bulk-actions">
                    <button type="button" className="admin-btn admin-btn--ghost" disabled>Choose File</button>
                    <button type="button" className="admin-btn admin-btn--primary" disabled>Preview Upload</button>
                  </div>
                </div>
              )}
              <div className="admin-table-wrap"><table className="admin-table">
                <thead><tr><th>Order/Lvl</th><th>Title</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>{paginatedContentItems.map(item => <tr key={item.id}><td>{contentTab === 'activities' ? item.activity_order : item.level_number}</td><td><strong>{item.title}</strong></td><td>{new Date(item.created_at).toLocaleDateString()}</td><td className="admin-actions-cell">{canUpdateCurrentContent && <button onClick={() => setEditingContent(item)} className="admin-action-btn"><HiOutlinePencilSquare /></button>}{canDeleteCurrentContent && <button onClick={() => requestDeleteContent(item, contentTab)} className="admin-action-btn is-delete"><HiOutlineTrash /></button>}</td></tr>)}</tbody>
              </table></div>
              <div className="admin-pagination">
                <span className="admin-pagination-info">Showing {filteredContentItems.length ? ((contentPage - 1) * CONTENT_PER_PAGE) + 1 : 0}-{Math.min(contentPage * CONTENT_PER_PAGE, filteredContentItems.length)} of {filteredContentItems.length}</span>
                <div className="admin-pagination-controls">
                  <button type="button" disabled={contentPage === 1} onClick={() => setContentPage(p => Math.max(1, p - 1))}>Prev</button>
                  <button type="button" disabled>{contentPage} / {totalContentPages}</button>
                  <button type="button" disabled={contentPage === totalContentPages} onClick={() => setContentPage(p => Math.min(totalContentPages, p + 1))}>Next</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {activePage === 'reports' && (
          <section className="admin-card admin-report-card">
            <div className="admin-card-head">
              <div>
                <h3>Reports Generation</h3>
                <p className="admin-note">
                  {reportStartDate || reportEndDate ? (
                    <>
                      Showing reports {reportStartDate ? `from ${new Date(reportStartDate).toLocaleDateString()}` : ''} {reportEndDate ? `to ${new Date(reportEndDate).toLocaleDateString()}` : ''}
                    </>
                  ) : (
                    'Printable reports for admins, users, and user performance.'
                  )}
                </p>
              </div>
              <div className="admin-report-actions">
                <button type="button" className="admin-btn admin-btn--ghost" onClick={() => window.print()}>Print Report</button>
                <button type="button" className="admin-btn admin-btn--primary" onClick={saveReportExcel}>Save Excel</button>
              </div>
            </div>
            <div className="admin-report-tabs">
              <button type="button" className={`admin-tab-btn ${reportType === 'teachers' ? 'is-active' : ''}`} onClick={() => setReportType('teachers')}>Admins</button>
              <button type="button" className={`admin-tab-btn ${reportType === 'students' ? 'is-active' : ''}`} onClick={() => setReportType('students')}>Users</button>
              <button type="button" className={`admin-tab-btn ${reportType === 'performance' ? 'is-active' : ''}`} onClick={() => setReportType('performance')}>Performance</button>
              {isSuperadmin && <button type="button" className={`admin-tab-btn ${reportType === 'audit' ? 'is-active' : ''}`} onClick={() => setReportType('audit')}>Audit Logs</button>}
            </div>
            <div className="admin-report-filters no-print">
              <div className="admin-custom-date-range">
                <span className="admin-report-filter-label">From:</span>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                />
                <span className="admin-report-filter-label">To:</span>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                />
                {(reportStartDate || reportEndDate) && (
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost"
                    onClick={() => {
                      setReportStartDate('');
                      setReportEndDate('');
                    }}
                    style={{ minHeight: '40px', borderRadius: '10px' }}
                  >
                    Clear Dates
                  </button>
                )}
              </div>
            </div>
            <div className="admin-table-wrap"><table className="admin-table">
              {reportType === 'teachers' && (
                <>
                  <thead><tr><th>Admin</th><th>Email</th><th>Access Role</th><th>Sections</th><th>Status</th></tr></thead>
                  <tbody>{filteredReportTeacherRows.map(admin => <tr key={admin.id}><td>{getDisplayName(admin, admin.id)}</td><td>{getProfileEmail(admin)}</td><td>{admin.role === 'superadmin' ? 'Super Admin' : findAccessRole(adminAccessRoles, adminAccessAssignments[admin.id])?.name || 'Admin'}</td><td>{sections.filter(section => section.teacher_id === admin.id).length}</td><td>{isDeletedProfile(admin) ? 'Archived' : 'Active'}</td></tr>)}</tbody>
                </>
              )}
              {reportType === 'students' && (
                <>
                  <thead><tr><th>User</th><th>ID / Student No.</th><th>Section</th><th>Journey</th><th>Status</th></tr></thead>
                  <tbody>{filteredReportStudentRows.map(student => <tr key={student.id}><td>{getDisplayName(student, student.id)}</td><td>{student.student_number || '-'}</td><td>{getLearnerGroupLabel(student, sectionById, sectionIdByStudentId)}</td><td>Journey {getProgressLevelValue(student)}</td><td>{isDeletedProfile(student) ? 'Archived' : 'Active'}</td></tr>)}</tbody>
                </>
              )}
              {reportType === 'performance' && (
                <>
                  <thead><tr><th>User</th><th>Section</th><th>Speeches</th><th>Minutes</th><th>Avg Score</th><th>Activities</th><th>Confidence Level</th></tr></thead>
                  <tbody>{reportStudentPerformanceRows.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.section}</td><td>{row.speeches}</td><td>{row.minutes}</td><td>{row.averageScore ?? 'N/A'}</td><td>{row.completedActivities}/30</td><td>{row.confidenceLevel.level ? `Level ${row.confidenceLevel.level} - ${row.confidenceLevel.label}` : row.confidenceLevel.label}</td></tr>)}</tbody>
                </>
              )}
              {reportType === 'audit' && isSuperadmin && (
                <>
                  <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Summary</th></tr></thead>
                  <tbody>{reportAuditLogs.slice(0, 200).map(log => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString()}</td><td>{getDisplayName(profiles.find(p => p.id === log.actor_id), log.actor_id || 'Unknown login')}</td><td>{formatAuditAction(log.action)}</td><td>{log.entity_type}</td><td>{JSON.stringify(log.new_values || log.old_values || {}).slice(0, 120) || '-'}</td></tr>)}</tbody>
                </>
              )}
            </table></div>
          </section>
        )}

        {activePage === 'audit' && isSuperadmin && (
          <section className="admin-card">
            <div className="admin-card-head">
              <h3>System Audit Logs</h3>
              <div className="admin-audit-filters">
                <div className="admin-search-box"><HiMagnifyingGlass /><input type="text" placeholder="Search Actor..." value={auditSearchQuery} onChange={e => { setAuditSearchQuery(e.target.value); setAuditPage(1); }} /></div>
                <select className="admin-filter-select" value={auditActionFilter} onChange={e => { setAuditActionFilter(e.target.value); setAuditPage(1); }}>
                  <option value="all">All Actions</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete / Archive</option>
                  <option value="restore">Restore</option>
                  <option value="login_failed">Login Failed</option>
                  <option value="login_locked">Account Locked</option>
                  <option value="login_success">Login Success</option>
                </select>
                <select className="admin-filter-select" value={auditEntityFilter} onChange={e => { setAuditEntityFilter(e.target.value); setAuditPage(1); }}>
                  <option value="all">All Entities</option>
                  <option value="profiles">Profiles</option>
                  <option value="activities">Activities</option>
                  <option value="modules">Modules</option>
                  <option value="system_settings">Settings</option>
                  <option value="auth_security">Auth Security</option>
                </select>
              </div>
            </div>
            <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
              <tbody>{paginatedAuditLogs.map(l => <tr key={l.id}><td>{new Date(l.created_at).toLocaleString()}</td><td>{getDisplayName(profiles.find(p => p.id === l.actor_id), l.actor_id || 'Unknown login')}</td><td><span className={`admin-audit-action-badge ${getAuditActionClass(l.action)}`}>{formatAuditAction(l.action)}</span></td><td>{l.entity_type}</td><td><button onClick={() => setInspectingLog(l)} className="admin-action-btn"><HiMagnifyingGlass /></button></td></tr>)}</tbody>
            </table></div>
            {totalAuditPages > 1 && <div className="admin-pagination"><button disabled={auditPage === 1} onClick={() => setAuditPage(p => p - 1)}>Prev</button><span>{auditPage} / {totalAuditPages}</span><button disabled={auditPage === totalAuditPages} onClick={() => setAuditPage(p => p + 1)}>Next</button></div>}
          </section>
        )}
      </section>

      {showActiveUsersModal && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setShowActiveUsersModal(false)}><div className="admin-modal admin-user-modal admin-active-users-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="admin-card-head"><div><h3>User Activity This Week</h3><p className="admin-modal-subtitle">{activeUsersThisWeek.length} active, {inactiveUsersThisWeek.length} inactive in the last 7 days</p></div><button type="button" onClick={() => setShowActiveUsersModal(false)} className="admin-btn admin-btn--ghost">Close</button></div>
        <div className="admin-active-users-toolbar">
          <label className="admin-inline-filter">
            <span>Status</span>
            <select className="admin-filter-select" value={activityStatusFilter} onChange={e => setActivityStatusFilter(e.target.value)}>
              <option value="all">All Users</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </label>
        </div>
        {filteredWeeklyStudentActivityRows.length ? (
          <>
            <div className="admin-table-wrap admin-active-users-table-wrap"><table className="admin-table admin-active-users-table">
              <thead><tr><th>User</th><th>Status</th><th>Speeches Analyzed</th><th>Minutes Practiced</th><th>Average Score</th><th>Last Active</th></tr></thead>
              <tbody>{paginatedWeeklyStudentActivityRows.map(user => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong></td>
                  <td><span className={`admin-status-badge ${user.isActive ? 'is-active' : 'is-archived'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>{user.speeches}</td>
                  <td>{user.minutes}</td>
                  <td>{user.averageScore == null ? 'N/A' : `${user.averageScore}%`}</td>
                  <td>{user.lastActive}</td>
                </tr>
              ))}</tbody>
            </table></div>
            {totalActiveUserPages > 1 && (
              <div className="admin-pagination">
                <span className="admin-pagination-info">
                  Showing {((activeUsersPage - 1) * ACTIVE_USERS_PER_PAGE) + 1}-{Math.min(activeUsersPage * ACTIVE_USERS_PER_PAGE, filteredWeeklyStudentActivityRows.length)} of {filteredWeeklyStudentActivityRows.length}
                </span>
                <div className="admin-pagination-controls">
                  <button type="button" disabled={activeUsersPage === 1} onClick={() => setActiveUsersPage(page => Math.max(1, page - 1))}>Prev</button>
                  <span>{activeUsersPage} / {totalActiveUserPages}</span>
                  <button type="button" disabled={activeUsersPage === totalActiveUserPages} onClick={() => setActiveUsersPage(page => Math.min(totalActiveUserPages, page + 1))}>Next</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="admin-empty-chart">No users match this status.</div>
        )}
      </div></div>, document.body)}

      {showAccessRoleModal && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setShowAccessRoleModal(false)}><div className="admin-modal admin-user-modal admin-access-role-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="admin-card-head">
          <div>
            <h3>{adminAccessRoleForm.id ? 'Edit Access Role' : 'Create Access Role'}</h3>
            <p className="admin-modal-subtitle">Choose what admins can view or manage.</p>
          </div>
          <button type="button" onClick={() => setShowAccessRoleModal(false)} className="admin-btn admin-btn--ghost">Close</button>
        </div>
        <form className="admin-role-builder" onSubmit={submitAccessRole}>
          <div className="admin-role-builder-fields">
            <label className="admin-create-field">
              <span>Role Name</span>
              <input type="text" placeholder="Content Admin" value={adminAccessRoleForm.name} onChange={e => setAdminAccessRoleForm(p => ({ ...p, name: e.target.value }))} />
            </label>
            <label className="admin-create-field">
              <span>Description</span>
              <input type="text" placeholder="Controls content permissions" value={adminAccessRoleForm.description} onChange={e => setAdminAccessRoleForm(p => ({ ...p, description: e.target.value }))} />
            </label>
          </div>
          <div className="admin-permission-matrix">
            <div className="admin-permission-row admin-permission-row--head">
              <span>Area</span>
              {ADMIN_PERMISSION_ACTIONS.map(action => <span key={action.key}>{action.label}</span>)}
            </div>
            {ADMIN_PERMISSION_AREAS.map(area => (
              <div className="admin-permission-row" key={area.key}>
                <div><strong>{area.label}</strong><small>{area.description}</small></div>
                {ADMIN_PERMISSION_ACTIONS.map(action => (
                  area.actions.includes(action.key) ? (
                    <label key={action.key} className="admin-permission-check" aria-label={`${area.label} ${action.label}`}>
                      <input type="checkbox" checked={Boolean(adminAccessRoleForm.permissions?.[area.key]?.[action.key])} onChange={() => updateAccessRolePermission(area.key, action.key)} />
                    </label>
                  ) : <span key={action.key} className="admin-permission-na">-</span>
                ))}
              </div>
            ))}
          </div>
          <div className="admin-modal-actions admin-modal-actions--end">
            <button type="submit" className="admin-btn admin-btn--primary">{adminAccessRoleForm.id ? 'Save Role' : 'Create Role'}</button>
          </div>
        </form>
      </div></div>, document.body)}

      {showBatchAccountModal && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setShowBatchAccountModal(false)}><div className="admin-modal admin-user-modal admin-batch-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="admin-card-head">
          <div>
            <h3>Batch Account Creation</h3>
            <p className="admin-modal-subtitle">Excel/CSV setup with welcome invites sent by email.</p>
          </div>
          <button type="button" onClick={() => setShowBatchAccountModal(false)} className="admin-btn admin-btn--ghost">Close</button>
        </div>
        <form className="admin-batch-form" onSubmit={submitBatchAccountImport}>
          {isSuperadmin ? (
            <label className="admin-create-field">
              <span>Account Type</span>
              <select className="admin-filter-select" value={batchAccountType} onChange={handleBatchAccountTypeChange}>
                <option value="user">Users</option>
                <option value="admin">Admins</option>
              </select>
            </label>
          ) : (
            <div className="admin-role-summary">
              <strong>User Accounts</strong>
              <span>Users receive welcome invites and create their own passwords.</span>
            </div>
          )}
          {batchAccountType === 'admin' && (
            <label className="admin-create-field">
              <span>Access Role</span>
              <select className="admin-filter-select" value={batchAccessRoleId} onChange={e => setBatchAccessRoleId(e.target.value)}>
                {adminAccessRoles.map(roleTemplate => <option key={roleTemplate.id} value={roleTemplate.id}>{roleTemplate.name}</option>)}
              </select>
              <small>{selectedBatchAccessRole?.description || 'No description'}</small>
            </label>
          )}
          {batchAccountType === 'user' && (
            <label className="admin-create-field">
              <span>Section</span>
              <select className="admin-filter-select" value={batchSectionId} onChange={e => setBatchSectionId(e.target.value)}>
                <option value="">{INDEPENDENT_LEARNERS_LABEL}</option>
                {visibleSections.map(section => <option key={section.id} value={section.id}>{section.name}</option>)}
              </select>
            </label>
          )}
          <label className="admin-batch-dropzone">
            <input type="file" accept=".xlsx,.csv" onChange={handleBatchFileChange} />
            <strong>{batchImportFile ? batchImportFile.name : 'Choose Excel File'}</strong>
            <span>Required columns: {batchTemplateColumns.join(', ')}</span>
          </label>
          <div className={`admin-batch-preview ${batchImportStatus === 'error' ? 'is-error' : ''}`}>
            {batchImportStatus === 'idle' && <p>Select an Excel or CSV file to preview the batch rows.</p>}
            {batchImportStatus === 'reading' && <p>Reading spreadsheet...</p>}
            {batchImportStatus === 'error' && <p>{batchImportError}</p>}
            {batchImportStatus === 'ready' && <p>{batchReadyRowCount} {batchAccountType === 'admin' ? 'admin' : 'user'} account{batchReadyRowCount === 1 ? '' : 's'} ready for review.</p>}
            {batchPreview?.columns?.length > 0 && (
              <div className="admin-batch-columns">
                <span>Detected:</span>
                {batchPreview.columns.map((column, index) => <strong key={`${column}-${index}`}>{column || `Column ${index + 1}`}</strong>)}
              </div>
            )}
            {batchPreview?.rows?.length > 0 && (
              <div className="admin-batch-preview-table-wrap">
                <table className="admin-table admin-batch-preview-table">
                  <thead>
                    <tr>
                      <th>Last Name</th>
                      <th>First Name</th>
                      {batchAccountType !== 'admin' && <th>ID / Student No.</th>}
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchPreviewRows.map(row => (
                      <tr key={row.rowNumber} className={batchPreviewInvalidRowNumbers.has(row.rowNumber) ? 'is-invalid' : ''}>
                        <td>{row.last_name || '-'}</td>
                        <td>{row.first_name || '-'}</td>
                        {batchAccountType !== 'admin' && <td>{row.student_number || '-'}</td>}
                        <td>{row.email || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="admin-batch-preview-pagination">
                  <span>
                    Showing {batchPreviewStartIndex + 1}-{Math.min(batchPreviewStartIndex + batchPreviewRows.length, batchReadyRowCount)} of {batchReadyRowCount}
                  </span>
                  {batchPreviewTotalPages > 1 && (
                    <div className="admin-batch-preview-pagination-controls">
                      <button type="button" onClick={() => setBatchPreviewPage(page => Math.max(1, page - 1))} disabled={safeBatchPreviewPage === 1}>Prev</button>
                      <strong>{safeBatchPreviewPage} / {batchPreviewTotalPages}</strong>
                      <button type="button" onClick={() => setBatchPreviewPage(page => Math.min(batchPreviewTotalPages, page + 1))} disabled={safeBatchPreviewPage === batchPreviewTotalPages}>Next</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="admin-modal-actions admin-modal-actions--end">
            <button type="submit" className="admin-btn admin-btn--primary" disabled={batchImportStatus !== 'ready'}>
              {batchImportStatus === 'saving' ? 'Creating...' : 'Create Accounts & Send Invites'}
            </button>
          </div>
        </form>
      </div></div>, document.body)}

      {showSectionModal && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setShowSectionModal(false)}><div className="admin-modal admin-user-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="admin-card-head">
          <div>
            <h3>{sectionForm.id ? 'Edit Section' : 'Create Section'}</h3>
            <p className="admin-modal-subtitle">Assign an admin to the section they manage.</p>
          </div>
          <button type="button" onClick={() => setShowSectionModal(false)} className="admin-btn admin-btn--ghost">Close</button>
        </div>
        <form className="admin-user-form" onSubmit={submitSection}>
          <AdminUserField label="Section Name">
            <input type="text" placeholder="INF235" value={sectionForm.name} onChange={e => setSectionForm(p => ({ ...p, name: e.target.value }))} />
          </AdminUserField>
          {isSuperadmin && (
            <AdminUserField label="Admin">
              <select value={sectionForm.teacher_id} onChange={e => setSectionForm(p => ({ ...p, teacher_id: e.target.value }))}>
                <option value="">Choose admin</option>
                {adminTeacherOptions.map(admin => <option key={admin.id} value={admin.id}>{getDisplayName(admin, admin.id)}</option>)}
              </select>
            </AdminUserField>
          )}
          <div className="admin-modal-actions admin-modal-actions--end">
            <button type="submit" className="admin-btn admin-btn--primary">{sectionForm.id ? 'Save Section' : 'Create Section'}</button>
          </div>
        </form>
      </div></div>, document.body)}

      {showCreateAdminModal && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setShowCreateAdminModal(false)}><div className="admin-modal admin-user-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="admin-card-head">
          <div>
            <h3>Create Staff Account</h3>
            <p className="admin-modal-subtitle">Create the account and send a welcome invite.</p>
          </div>
          <button type="button" onClick={() => setShowCreateAdminModal(false)} className="admin-btn admin-btn--ghost">Close</button>
        </div>
        <form className="admin-user-form" onSubmit={submitCreateAdmin}>
          <AdminUserField label="Email">
            <input type="email" required placeholder="admin@email.com" value={createAdminForm.email} onChange={e => setCreateAdminForm(p => ({ ...p, email: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="First Name">
            <input type="text" placeholder="First name" value={createAdminForm.first_name} onChange={e => setCreateAdminForm(p => ({ ...p, first_name: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Last Name">
            <input type="text" placeholder="Last name" value={createAdminForm.last_name} onChange={e => setCreateAdminForm(p => ({ ...p, last_name: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Role">
            <select
              value={createAdminForm.role === 'superadmin' ? 'superadmin' : createAdminForm.access_role_id}
              onChange={handleCreateAdminRoleChange}
            >
              {adminAccessRoles.map(roleTemplate => <option key={roleTemplate.id} value={roleTemplate.id}>{roleTemplate.name}</option>)}
              <option value="superadmin">Super Admin</option>
            </select>
          </AdminUserField>
          <div className="admin-modal-actions admin-modal-actions--end">
            <button type="submit" className="admin-btn admin-btn--primary" disabled={creatingAdmin}>{creatingAdmin ? 'Creating...' : 'Create & Send Invite'}</button>
          </div>
        </form>
      </div></div>, document.body)}

      {creatingUser && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setCreatingUser(false)}><div className="admin-modal admin-user-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="admin-card-head">
          <div>
            <h3>Create User</h3>
            <p className="admin-modal-subtitle admin-student-create-note">Email is used for login. Bigkas sends a welcome invite so the user creates their own password.</p>
          </div>
          <button type="button" onClick={() => setCreatingUser(false)} className="admin-btn admin-btn--ghost">Close</button>
        </div>
        <form className="admin-user-form" onSubmit={submitCreateUser}>
          <AdminUserField label="Email">
            <input type="email" required placeholder="user@email.com" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="ID / Student No.">
            <input type="text" placeholder="Optional ID or student number" value={userForm.student_number} onChange={e => setUserForm(p => ({ ...p, student_number: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Section">
            <select value={userForm.section_id} onChange={e => setUserForm(p => ({ ...p, section_id: e.target.value }))}>
              <option value="">{INDEPENDENT_LEARNERS_LABEL}</option>
              {visibleSections.map(section => <option key={section.id} value={section.id}>{section.name}</option>)}
            </select>
          </AdminUserField>
          <AdminUserField label="First Name">
            <input type="text" placeholder="First name" value={userForm.first_name} onChange={e => setUserForm(p => ({ ...p, first_name: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Last Name">
            <input type="text" placeholder="Last name" value={userForm.last_name} onChange={e => setUserForm(p => ({ ...p, last_name: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Journey Level">
            <AdminLevelSelect label="Journey level" value={userForm.current_level} onChange={e => setUserForm(p => ({ ...p, current_level: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Speaker Level">
            <AdminLevelSelect label="Speaker level" value={userForm.speaker_level} onChange={e => setUserForm(p => ({ ...p, speaker_level: e.target.value }))} />
          </AdminUserField>
          <div className="admin-modal-actions admin-modal-actions--end">
            <button type="submit" className="admin-btn admin-btn--primary" disabled={savingUser}>{savingUser ? 'Creating...' : 'Create & Send Invite'}</button>
          </div>
        </form>
      </div></div>, document.body)}

      {editingUser && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setEditingUser(null)}><div className="admin-modal admin-user-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="admin-card-head"><h3>Edit User</h3><button type="button" onClick={() => setEditingUser(null)} className="admin-btn admin-btn--ghost">Close</button></div>
        <form className="admin-user-form" onSubmit={submitUpdateUser}>
          <AdminUserField label="First Name">
            <input type="text" placeholder="First name" value={userForm.first_name} onChange={e => setUserForm(p => ({ ...p, first_name: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Last Name">
            <input type="text" placeholder="Last name" value={userForm.last_name} onChange={e => setUserForm(p => ({ ...p, last_name: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="ID / Student No.">
            <input type="text" placeholder="Optional ID or student number" value={userForm.student_number} onChange={e => setUserForm(p => ({ ...p, student_number: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Section" help="Assigns this user to an admin-handled section.">
            <select value={userForm.section_id} onChange={e => setUserForm(p => ({ ...p, section_id: e.target.value }))}>
              <option value="">{INDEPENDENT_LEARNERS_LABEL}</option>
              {visibleSections.map(section => <option key={section.id} value={section.id}>{section.name}</option>)}
            </select>
          </AdminUserField>
          <AdminUserField label="Journey Level" help="Current learning journey from 1 to 5.">
            <AdminLevelSelect label="Journey level" value={userForm.current_level} onChange={e => setUserForm(p => ({ ...p, current_level: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Speaker Level" help="Speaking proficiency level from 1 to 5.">
            <AdminLevelSelect label="Speaker level" value={userForm.speaker_level} onChange={e => setUserForm(p => ({ ...p, speaker_level: e.target.value }))} />
          </AdminUserField>
          <div className="admin-user-field admin-stage-progress-field">
            <span>Stage Progress</span>
            <small>Admin tool for demos, sync recovery, and support. It marks stages complete using the same journey progress table users use.</small>
            <div className="admin-stage-progress-panel">
              <label className="admin-stage-progress-control">
                <span>Journey</span>
                <select
                  value={stageProgressForm.journey}
                  onChange={(e) => setStageProgressForm((prev) => ({
                    ...prev,
                    journey: clampJourneyLevel(e.target.value),
                    completeThroughStage: clampStageNumber(prev.completeThroughStage, activities.filter((activity) => Number(activity.target_level) === Number(e.target.value)).length || 30),
                  }))}
                  aria-label="Journey to complete"
                >
                  {[1, 2, 3, 4, 5].map(level => <option key={level} value={level}>Journey {level}</option>)}
                </select>
              </label>
              <label className="admin-stage-progress-control">
                <span>Complete Through</span>
                <select
                  value={clampStageNumber(stageProgressForm.completeThroughStage, selectedJourneyMaxStage)}
                  onChange={(e) => setStageProgressForm((prev) => ({ ...prev, completeThroughStage: clampStageNumber(e.target.value, selectedJourneyMaxStage) }))}
                  aria-label="Complete through stage"
                >
                  {Array.from({ length: selectedJourneyMaxStage }, (_, index) => index + 1).map(stage => (
                    <option key={stage} value={stage}>Stage {stage}</option>
                  ))}
                </select>
              </label>
              <label className="admin-stage-progress-check">
                <input
                  type="checkbox"
                  checked={stageProgressForm.advanceJourney}
                  onChange={(e) => setStageProgressForm((prev) => ({ ...prev, advanceJourney: e.target.checked }))}
                />
                <span>Advance to the next journey when all stages are completed.</span>
              </label>
              <div className="admin-stage-progress-summary">
                <span>{selectedJourneyCompletedCount}/{selectedJourneyActivities.length || selectedJourneyMaxStage} stages currently complete</span>
                <button type="button" className="admin-btn admin-btn--ghost" onClick={requestStageProgressApply} disabled={applyingStageProgress}>
                  Apply Stage Progress
                </button>
              </div>
            </div>
          </div>
          <div className="admin-modal-actions">
            <button type="button" onClick={() => requestUserArchiveState(editingUser, !isDeletedProfile(editingUser))} className={`admin-btn ${isDeletedProfile(editingUser) ? 'admin-btn--ghost' : 'admin-btn--danger'}`}>{isDeletedProfile(editingUser) ? 'Restore User' : 'Archive User'}</button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={savingUser}>{savingUser ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div></div>, document.body)}

      {editingAdmin && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setEditingAdmin(null)}><div className="admin-modal admin-user-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="admin-card-head"><h3>Edit Admin</h3><button type="button" onClick={() => setEditingAdmin(null)} className="admin-btn admin-btn--ghost">Close</button></div>
        <form className="admin-user-form" onSubmit={submitUpdateAdmin}>
          <AdminUserField label="First Name">
            <input type="text" placeholder="First name" value={adminAccountForm.first_name} onChange={e => setAdminAccountForm(p => ({ ...p, first_name: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Last Name">
            <input type="text" placeholder="Last name" value={adminAccountForm.last_name} onChange={e => setAdminAccountForm(p => ({ ...p, last_name: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Role">
            <select
              value={adminAccountForm.role === 'superadmin' ? 'superadmin' : adminAccountForm.access_role_id}
              onChange={handleAdminAccountRoleChange}
            >
              {adminAccessRoles.map(roleTemplate => <option key={roleTemplate.id} value={roleTemplate.id}>{roleTemplate.name}</option>)}
              <option value="superadmin">Super Admin</option>
            </select>
          </AdminUserField>
          <div className="admin-modal-actions">
            <button
              type="button"
              onClick={() => requestUserArchiveState(editingAdmin, !isDeletedProfile(editingAdmin))}
              className={`admin-btn ${isDeletedProfile(editingAdmin) ? 'admin-btn--ghost' : 'admin-btn--danger'}`}
              disabled={editingAdmin.id === currentAdminId}
            >
              {isDeletedProfile(editingAdmin) ? 'Restore Admin' : 'Archive Admin'}
            </button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={creatingAdmin}>{creatingAdmin ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div></div>, document.body)}

      {pendingDeleteConfirmation && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setPendingDeleteConfirmation(null)}><div className="admin-modal admin-confirm-modal admin-warning-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <h3>{pendingDeleteConfirmation.title}</h3>
        <p>{pendingDeleteConfirmation.message}</p>
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setPendingDeleteConfirmation(null)}>Cancel</button>
          <button type="button" className="admin-btn admin-btn--danger" onClick={confirmPendingDelete}>{pendingDeleteConfirmation.confirmLabel || 'Delete'}</button>
        </div>
      </div></div>, document.body)}

      {pendingArchiveUser && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setPendingArchiveUser(null)}><div className="admin-modal admin-confirm-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <h3>Archive {isAdminProfile(pendingArchiveUser) ? 'Admin' : 'User'}?</h3>
        <p>This will mark <strong>{getDisplayName(pendingArchiveUser, pendingArchiveUser.id)}</strong> as archived. The profile row stays in the database and can be restored later.</p>
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setPendingArchiveUser(null)}>Cancel</button>
          <button type="button" className="admin-btn admin-btn--danger" onClick={confirmArchiveUser}>Archive {isAdminProfile(pendingArchiveUser) ? 'Admin' : 'User'}</button>
        </div>
      </div></div>, document.body)}

      {pendingStageProgress && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setPendingStageProgress(null)}><div className="admin-modal admin-confirm-modal admin-warning-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <h3>Apply Stage Progress?</h3>
        <p>
          This will mark <strong>{pendingStageProgress.targetActivities.length}</strong> stage{pendingStageProgress.targetActivities.length === 1 ? '' : 's'} complete for
          <strong> {getDisplayName(pendingStageProgress.user, pendingStageProgress.user.id)}</strong> in Journey {pendingStageProgress.journey}, through Stage {pendingStageProgress.completeThroughStage}.
        </p>
        {pendingStageProgress.shouldAdvance && (
          <p>This will also move the user to Journey {pendingStageProgress.nextJourneyLevel}, making the completed journey trophy ready to claim.</p>
        )}
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setPendingStageProgress(null)} disabled={applyingStageProgress}>Cancel</button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={confirmStageProgressApply} disabled={applyingStageProgress}>
            {applyingStageProgress ? 'Applying...' : 'Apply Progress'}
          </button>
        </div>
      </div></div>, document.body)}

      {(creatingContent || editingContent) && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => { setCreatingContent(false); setEditingContent(null); }}><div className="admin-modal admin-user-modal admin-content-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="admin-card-head"><h3>{editingContent ? 'Edit' : 'Create'} {contentTab}</h3><button type="button" onClick={() => { setCreatingContent(false); setEditingContent(null); }} className="admin-btn admin-btn--ghost">Close</button></div>
        <form onSubmit={handleSaveContent} className="admin-content-form">
          <AdminUserField label="Title">
            <input name="title" defaultValue={editingContent?.title} placeholder="Title" required />
          </AdminUserField>
          {contentTab === 'activities' ? (
            <>
              <AdminUserField label="Target Level">
                <div className="admin-level-picker">
                  <select name="target_level" defaultValue={editingContent?.target_level || 1} required>
                    {targetLevelOptions.map(level => <option key={level} value={level}>Level {level}</option>)}
                  </select>
                  <button type="button" className="admin-btn admin-btn--ghost" onClick={requestNextTargetLevel}>Add Level</button>
                </div>
              </AdminUserField>
              <AdminUserField label="Activity Order">
                <input name="activity_order" type="number" min="1" defaultValue={editingContent?.activity_order || 1} placeholder="Order" required />
              </AdminUserField>
            </>
          ) : (
            <>
              <AdminUserField label="Level Number">
                <input name="level_number" type="number" min="0" max="5" defaultValue={editingContent?.level_number || 1} placeholder="Level" required />
              </AdminUserField>
              <AdminUserField label="Lesson Number">
                <input name="lesson_number" defaultValue={editingContent?.lesson_number} placeholder="Lesson" required />
              </AdminUserField>
            </>
          )}
          <AdminUserField label={contentTab === 'activities' ? 'Objective' : 'Content'} help={contentTab === 'activities' ? 'Learning objective shown for this activity.' : 'Lesson content shown inside the learning module.'}>
            <textarea name={contentTab === 'activities' ? 'objective' : 'content'} defaultValue={editingContent?.objective || editingContent?.content} placeholder={contentTab === 'activities' ? 'Activity objective' : 'Module content'} required />
          </AdminUserField>
          <div className="admin-modal-actions">
            <button type="button" onClick={() => { setCreatingContent(false); setEditingContent(null); }} className="admin-btn admin-btn--ghost">Cancel</button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={isContentLoading}>{isContentLoading ? 'Saving...' : editingContent ? 'Save Changes' : 'Create'}</button>
          </div>
        </form>
      </div></div>, document.body)}

      {pendingContentSave && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setPendingContentSave(null)}><div className="admin-modal admin-confirm-modal admin-warning-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <h3>{pendingContentSave.duplicateActivity ? 'Overwrite Activity Slot?' : `Confirm ${pendingContentSave.mode === 'edit' ? 'Changes' : 'New Item'}?`}</h3>
        {pendingContentSave.duplicateActivity ? (
          <p>
            Level {pendingContentSave.data.target_level}, order {pendingContentSave.data.activity_order} already has
            <strong> {pendingContentSave.duplicateActivity.title || 'an activity'}</strong>. Continue only if this replacement is intentional.
          </p>
        ) : (
          <p>
            Review this {pendingContentSave.type === 'activities' ? 'activity' : 'module'} before saving. This change will be written to the database after confirmation.
          </p>
        )}
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setPendingContentSave(null)}>Cancel</button>
          <button type="button" className={`admin-btn ${pendingContentSave.duplicateActivity ? 'admin-btn--danger' : 'admin-btn--primary'}`} onClick={confirmContentSave} disabled={isContentLoading}>
            {isContentLoading ? 'Saving...' : pendingContentSave.duplicateActivity ? 'Overwrite Slot' : 'Confirm Save'}
          </button>
        </div>
      </div></div>, document.body)}

      {pendingLevelAdd && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setPendingLevelAdd(null)}><div className="admin-modal admin-confirm-modal admin-warning-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <h3>Add Level {pendingLevelAdd}?</h3>
        <p>
          This only adds Level {pendingLevelAdd} to the admin dropdown. Confirm that the database rules and user content already support this level before saving activities to it.
        </p>
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setPendingLevelAdd(null)}>Cancel</button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={confirmNextTargetLevel}>Add Level</button>
        </div>
      </div></div>, document.body)}

      {inspectingLog && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setInspectingLog(null)}><div className="admin-modal admin-payload-modal admin-audit-details-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="admin-card-head">
          <div>
            <h3>Audit Details</h3>
            <p className="admin-modal-subtitle">{inspectingLog.action} / {inspectingLog.entity_type}</p>
          </div>
          <button type="button" onClick={() => setInspectingLog(null)} className="admin-btn admin-btn--ghost">Close</button>
        </div>
        <div className="admin-audit-summary">
          <span><strong>Time</strong>{new Date(inspectingLog.created_at).toLocaleString()}</span>
          <span><strong>Actor</strong>{getDisplayName(profiles.find(p => p.id === inspectingLog.actor_id), inspectingLog.actor_id || 'Unknown login')}</span>
          <span><strong>Entity ID</strong>{inspectingLog.entity_id || 'N/A'}</span>
        </div>
        <div className="admin-payload-content">
          <section className="admin-payload-section">
            <h4>Before</h4>
            <pre><code>{JSON.stringify(inspectingLog.old_values || {}, null, 2)}</code></pre>
          </section>
          <section className="admin-payload-section">
            <h4>After</h4>
            <pre><code>{JSON.stringify(inspectingLog.new_values || {}, null, 2)}</code></pre>
          </section>
        </div>
      </div></div>, document.body)}

      {successModal && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setSuccessModal(null)}><div className="admin-modal admin-confirm-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: '#10B981' }}>
          <HiCheckCircle size={48} />
        </div>
        <h3 style={{ textAlign: 'center', marginBottom: '16px' }}>{successModal.title}</h3>
        <p style={{ marginBottom: '16px', textAlign: 'center' }}>{successModal.message}</p>
        <div className="admin-note" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', borderLeft: '4px solid #10B981', padding: '16px', borderRadius: '4px', marginBottom: '24px' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#065F46', fontWeight: 500, lineHeight: 1.5 }}>
            {successModal.emailMessage}
          </p>
        </div>
        <div className="admin-modal-actions" style={{ justifyContent: 'center' }}>
          <button type="button" className="admin-btn admin-btn--primary" style={{ minWidth: '120px' }} onClick={() => setSuccessModal(null)}>OK</button>
        </div>
      </div></div>, document.body)}

      {toastMessage && <div className={`admin-toast ${toastMessage.type}`}>{toastMessage.text}</div>}
      {showLogoutConfirm && createPortal(<div className="admin-logout-modal-backdrop" role="presentation" onClick={() => setShowLogoutConfirm(false)}><div className="admin-logout-modal" role="dialog" aria-modal="true" aria-labelledby="admin-logout-title" onClick={e => e.stopPropagation()}>
        <h3 id="admin-logout-title">Log out?</h3>
        <p>You will be returned to the public home page.</p>
        <div className="admin-logout-modal-actions">
          <button type="button" className="admin-logout-modal-btn admin-logout-modal-btn--cancel" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
          <button type="button" className="admin-logout-modal-btn admin-logout-modal-btn--confirm" onClick={async () => { await logout(); navigate(ROUTES.HOME); }}>Log Out</button>
        </div>
      </div></div>, document.body)}
    </div>
  );
}

export default AdminDashboardPage;

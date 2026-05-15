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
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Funnel,
  FunnelChart,
  LabelList
} from 'recharts';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import './AdminDashboardPage.css';

const RETENTION_DAYS = 14;
const SIDEBAR_WIDTH = 280;
const PIE_COLORS = ['#33d2a4', '#51dfb5', '#7bedcc', '#a8f5e1'];
const USER_FORM_INITIAL = {
  email: '',
  password: '',
  confirm_password: '',
  first_name: '',
  last_name: '',
  username: '',
  role: 'user',
  current_level: 1,
  speaker_level: 1,
  speaker_points: 0,
};

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

function modeOf(session) {
  const origin = String(session?.session_origin || '').toLowerCase();
  const mode = String(session?.session_mode || '').toLowerCase();
  const speaking = String(session?.speaking_mode || '').toLowerCase();
  if (mode.includes('free') || speaking.includes('free') || origin === 'pre-test') return 'Free Speech';
  if (mode.includes('random') || origin === 'practice') return 'Randomizer';
  return 'Activities';
}

function LeaderboardList({ items, suffix = '', emptyMsg = 'No data available' }) {
  if (!items.length) return <div className="admin-empty-chart">{emptyMsg}</div>;
  return (
    <div className="admin-leaderboard">
      {items.map((item, i) => (
        <div key={item.id} className="admin-lb-row">
          <div className="admin-lb-rank">{i + 1}</div>
          <div className="admin-lb-avatar">{item.initial}</div>
          <div className="admin-lb-name">{item.username}</div>
          <div className="admin-lb-value">
            {item.value} {suffix}
          </div>
        </div>
      ))}
    </div>
  );
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

function AdminPasswordInput({ value, onChange, placeholder, required = true }) {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div className="admin-password-control">
      <input
        type={isVisible ? 'text' : 'password'}
        required={required}
        minLength={6}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <button type="button" onClick={() => setIsVisible(prev => !prev)} aria-label={isVisible ? 'Hide password' : 'Show password'}>
        {isVisible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

function userToForm(user) {
  return {
    email: '',
    password: '',
    confirm_password: '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || '',
    role: user?.role || 'user',
    current_level: user?.current_level || 1,
    speaker_level: user?.speaker_level || 1,
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
  const [globalFilter, setGlobalFilter] = useState('30d');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  const [profiles, setProfiles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditEntityFilter, setAuditEntityFilter] = useState('all');
  const [auditPage, setAuditPage] = useState(1);
  const AUDIT_PER_PAGE = 15;
  const [inspectingLog, setInspectingLog] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [pendingArchiveUser, setPendingArchiveUser] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userLevelFilter, setUserLevelFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 10;
  const [archivingUserId, setArchivingUserId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [modules, setModules] = useState([]);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [contentTab, setContentTab] = useState('activities');
  const [creatingContent, setCreatingContent] = useState(false);
  const [editingContent, setEditingContent] = useState(null);
  const [contentLevelLimit, setContentLevelLimit] = useState(5);
  const [pendingContentSave, setPendingContentSave] = useState(null);
  const [pendingLevelAdd, setPendingLevelAdd] = useState(null);

  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [createAdminForm, setCreateAdminForm] = useState({
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    username: '',
    role: 'admin',
  });
  const [systemSettings, setSystemSettings] = useState({
    maintenance_mode: false,
    failover_logging: true,
    defense_data_mode: false,
  });
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isSuperadmin = role === 'superadmin';

  useEffect(() => {
    let active = true;
    async function loadCore() {
      setLoading(true);
      setError('');
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user?.id) throw new Error('Unable to verify admin session.');

        const { data: roleProfile, error: roleError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();

        if (roleError || !roleProfile) throw new Error('Admin profile not found.');
        if (roleProfile.role !== 'admin' && roleProfile.role !== 'superadmin') {
          await supabase.auth.signOut();
          navigate(ROUTES.ADMIN_LOGIN_BASE, { replace: true });
          throw new Error('Access denied: admin privileges required.');
        }

        const [profilesRes, sessionsRes, metricsRes, activitiesRes, modulesRes, settingsRes] = await Promise.all([
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('sessions').select('*').order('created_at', { ascending: true }),
          supabase.from('session_metrics').select('session_id, overall_score, verbal_score, confidence_score, pronunciation_score'),
          supabase.from('activities').select('*').order('target_level', { ascending: true }).order('activity_order', { ascending: true }),
          supabase.from('modules').select('*').order('level_number', { ascending: true }).order('lesson_number', { ascending: true }),
          roleProfile.role === 'superadmin' ? supabase.from('system_settings').select('*') : Promise.resolve({ data: [] })
        ]);

        if (profilesRes.error) throw profilesRes.error;
        if (sessionsRes.error) throw sessionsRes.error;
        if (metricsRes.error) throw metricsRes.error;
        if (activitiesRes.error) throw activitiesRes.error;
        if (modulesRes.error) throw modulesRes.error;

        if (settingsRes.data && settingsRes.data.length > 0) {
          const sMap = {};
          settingsRes.data.forEach(s => sMap[s.key] = s.value === 'true');
          setSystemSettings(prev => ({ ...prev, ...sMap }));
        }

        if (!active) return;
        setCurrentAdminId(authData.user.id);
        setRole(roleProfile.role);
        setProfiles(profilesRes.data || []);
        setSessions(sessionsRes.data || []);
        setMetrics(metricsRes.data || []);
        setActivities(activitiesRes.data || []);
        setModules(modulesRes.data || []);
      } catch (e) {
        if (active) setError(e.message || 'Failed to load admin dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCore();
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    if (!isSuperadmin || (activePage !== 'settings' && activePage !== 'audit')) return;
    let active = true;
    async function loadSettingsData() {
      try {
        const { data, error: auditErr } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000);
        if (auditErr) throw auditErr;
        if (!active) return;
        setAuditLogs(data || []);
      } catch (e) {
        if (active) setError(e.message || 'Failed to load admin settings data.');
      }
    }
    loadSettingsData();
    return () => { active = false; };
  }, [isSuperadmin, activePage]);

  const visibleUsers = useMemo(() => profiles.filter((p) => !p.archived_at), [profiles]);
  const profileById = useMemo(() => {
    const map = new Map();
    visibleUsers.forEach((p) => map.set(p.id, p));
    return map;
  }, [visibleUsers]);

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

  const filteredSessions = useMemo(() => {
    if (globalFilter === 'all') return sessions;
    const now = new Date();
    let days = 30;
    if (globalFilter === '7d') days = 7;
    if (globalFilter === 'ytd') {
      const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
      return sessions.filter(s => new Date(s.created_at).getTime() >= startOfYear);
    }
    const cutoff = shiftRange(now, 'day', -days).getTime();
    return sessions.filter(s => new Date(s.created_at).getTime() >= cutoff);
  }, [sessions, globalFilter]);

  const metricBySession = useMemo(() => {
    const map = new Map();
    metrics.forEach((m) => map.set(m.session_id, {
      overall: Number(m.overall_score),
      verbal: Number(m.verbal_score),
      confidence: Number(m.confidence_score),
      pronunciation: Number(m.pronunciation_score)
    }));
    return map;
  }, [metrics]);

  const levelDistribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    visibleUsers.forEach((p) => {
      const lv = Number(p.speaker_level || p.current_level || 1);
      if (counts[lv] != null) counts[lv] += 1;
    });
    return Object.entries(counts).map(([lv, value]) => ({ label: `Proficiency Lvl ${lv}`, value }));
  }, [visibleUsers]);

  const kpis = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = shiftRange(now, 'day', -7);
    const twoWeeksAgo = shiftRange(now, 'day', -14);
    const totalUsers = visibleUsers.length;
    const activeThisWeekSet = new Set();
    const activeLastWeekSet = new Set();
    sessions.forEach(s => {
      const d = new Date(s.created_at);
      if (d >= oneWeekAgo) activeThisWeekSet.add(s.user_id);
      else if (d >= twoWeeksAgo && d < oneWeekAgo) activeLastWeekSet.add(s.user_id);
    });
    const activeThisWeek = activeThisWeekSet.size;
    const activeLastWeek = activeLastWeekSet.size;
    const activeDelta = activeThisWeek - activeLastWeek;
    return {
      totalUsers,
      usersDeltaText: `+${visibleUsers.filter(p => new Date(p.created_at) >= oneWeekAgo).length} new this week`,
      activeThisWeek,
      activeDeltaText: activeDelta >= 0 ? `+${activeDelta} vs last week` : `${activeDelta} vs last week`,
      totalSpeeches: sessions.length,
      speechDeltaText: `+${sessions.filter(s => new Date(s.created_at) >= oneWeekAgo).length} this week`
    };
  }, [visibleUsers, sessions]);

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

  const timeAllocation = useMemo(() => {
    const totals = { Activities: 0, Randomizer: 0, 'Free Speech': 0 };
    filteredSessions.forEach(s => totals[modeOf(s)] += Number(s.duration || 0));
    return Object.entries(totals).map(([name, value]) => ({ name, value: Math.round(value / 60) })).filter(d => d.value > 0);
  }, [filteredSessions]);

  const mostConsistent = useMemo(() => {
    const activityMap = new Map();
    sessions.forEach(s => {
      const day = new Date(s.created_at).toDateString();
      const set = activityMap.get(s.user_id) || new Set();
      set.add(day);
      activityMap.set(s.user_id, set);
    });
    return Array.from(activityMap.entries()).map(([id, set]) => {
      const p = profileById.get(id);
      return { id, username: getDisplayName(p, id), initial: (p?.username || 'U')[0].toUpperCase(), value: set.size };
    }).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [sessions, profileById]);

  const risers = useMemo(() => {
    const byUser = new Map();
    sessions.forEach(s => {
      const scores = metricBySession.get(s.id);
      if (!scores) return;
      const list = byUser.get(s.user_id) || [];
      list.push({ d: new Date(s.created_at).getTime(), s: scores.overall });
      byUser.set(s.user_id, list);
    });
    return Array.from(byUser.entries()).map(([id, list]) => {
      if (list.length < 2) return null;
      const sorted = list.sort((a, b) => a.d - b.d);
      const diff = Number((sorted[sorted.length - 1].s - sorted[0].s).toFixed(1));
      const p = profileById.get(id);
      return { id, username: getDisplayName(p, id), initial: (p?.username || 'U')[0].toUpperCase(), value: diff };
    }).filter(u => u && u.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [sessions, metricBySession, profileById]);

  const multiDimProgress = useMemo(() => {
    const buckets = new Map();
    filteredSessions.forEach(s => {
      const scores = metricBySession.get(s.id);
      if (!scores || !Number.isFinite(scores.verbal)) return;
      const d = new Date(s.created_at);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      const cur = buckets.get(key) || { v: 0, c: 0, p: 0, n: 0 };
      cur.v += scores.verbal; cur.c += scores.confidence; cur.p += scores.pronunciation; cur.n++;
      buckets.set(key, cur);
    });
    return Array.from(buckets.entries()).map(([label, b]) => ({
      label, verbal_score: Number((b.v/b.n).toFixed(1)), confidence_score: Number((b.c/b.n).toFixed(1)), pronunciation_score: Number((b.p/b.n).toFixed(1))
    })).sort((a,b) => {
      const [m1, d1] = a.label.split('/').map(Number); const [m2, d2] = b.label.split('/').map(Number);
      return m1 !== m2 ? m1 - m2 : d1 - d2;
    });
  }, [filteredSessions, metricBySession]);

  const masteryRadarData = useMemo(() => {
    let vSum = 0, viSum = 0, voSum = 0, count = 0;
    metrics.forEach(m => {
      if (!Number.isFinite(Number(m.verbal_score))) return;
      vSum += Number(m.verbal_score);
      viSum += Number(m.confidence_score);
      voSum += Number(m.pronunciation_score);
      count++;
    });
    if (count === 0) return [];
    return [
      { subject: 'Verbal (Words)', A: Number((vSum / count).toFixed(1)), fullMark: 100 },
      { subject: 'Visual (Body Language)', A: Number((viSum / count).toFixed(1)), fullMark: 100 },
      { subject: 'Vocal (Tone)', A: Number((voSum / count).toFixed(1)), fullMark: 100 },
    ];
  }, [metrics]);

  const courseFunnelData = useMemo(() => {
    return [1, 2, 3, 4, 5].map(lv => ({
      value: profiles.filter(p => Number(p.current_level) >= lv).length,
      name: `Journey ${lv}`,
      fill: PIE_COLORS[lv % PIE_COLORS.length]
    })).filter(d => d.value > 0);
  }, [profiles]);

  const filteredUsers = useMemo(() => {
    let res = profiles;
    if (userStatusFilter === 'active') res = res.filter(p => !p.archived_at);
    if (userStatusFilter === 'deleted') res = res.filter(p => p.archived_at);
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      res = res.filter(p => (p.first_name || '').toLowerCase().includes(q) || (p.username || '').toLowerCase().includes(q));
    }
    if (userLevelFilter !== 'all') res = res.filter(p => Number(p.current_level) === Number(userLevelFilter));
    return res;
  }, [profiles, userSearchQuery, userLevelFilter, userStatusFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, userPage]);

  const totalUserPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
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

  const filteredAuditLogs = useMemo(() => {
    let res = auditLogs;
    if (auditSearchQuery.trim()) {
      const q = auditSearchQuery.toLowerCase();
      res = res.filter(l => getDisplayName(profiles.find(p => p.id === l.actor_id), l.actor_id).toLowerCase().includes(q));
    }
    if (auditActionFilter !== 'all') res = res.filter(l => l.action.toLowerCase() === auditActionFilter.toLowerCase());
    if (auditEntityFilter !== 'all') res = res.filter(l => l.entity_type.toLowerCase() === auditEntityFilter.toLowerCase());
    return res;
  }, [auditLogs, auditSearchQuery, auditActionFilter, auditEntityFilter, profiles]);

  const paginatedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * AUDIT_PER_PAGE;
    return filteredAuditLogs.slice(start, start + AUDIT_PER_PAGE);
  }, [filteredAuditLogs, auditPage]);

  const totalAuditPages = Math.ceil(filteredAuditLogs.length / AUDIT_PER_PAGE);

  const onLogout = () => setShowLogoutConfirm(true);

  const toggleSetting = async (key, currentValue) => {
    const newValue = !currentValue;
    setSystemSettings(prev => ({ ...prev, [key]: newValue }));
    const { error } = await supabase.from('system_settings').upsert({ key, value: String(newValue) }, { onConflict: 'key' });
    if (error) {
      setSystemSettings(prev => ({ ...prev, [key]: currentValue }));
      showToast('Failed to update setting', 'error');
    } else {
      showToast('Setting updated');
      await recordAuditLog({
        action: 'update',
        entityType: 'system_settings',
        oldValues: { key, value: currentValue },
        newValues: { key, value: newValue },
      });
    }
  };

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
        : await query.order('created_at', { ascending: false });
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

  const handleDeleteContent = async (id, type) => {
    if (!window.confirm('Delete this item?')) return;
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
    const { data, error: refreshError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (refreshError) {
      showToast(refreshError.message || 'Failed to refresh users', 'error');
      return;
    }
    setProfiles(data || []);
  };

  const openCreateUser = () => {
    setUserForm(USER_FORM_INITIAL);
    setCreatingUser(true);
  };

  const openEditUser = (user) => {
    setUserForm(userToForm(user));
    setEditingUser(user);
  };

  const profilePayloadFromUserForm = () => ({
    first_name: userForm.first_name.trim() || null,
    last_name: userForm.last_name.trim() || null,
    username: userForm.username.trim() || null,
    role: userForm.role,
    current_level: Number(userForm.current_level) || 1,
    speaker_level: Number(userForm.speaker_level) || 1,
    speaker_points: Number(userForm.speaker_points) || 0,
    updated_at: new Date().toISOString(),
  });

  const submitCreateUser = async (e) => {
    e.preventDefault();
    if (userForm.password !== userForm.confirm_password) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setSavingUser(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: userForm.email.trim(),
        password: userForm.password,
        options: {
          data: {
            first_name: userForm.first_name.trim(),
            last_name: userForm.last_name.trim(),
            username: userForm.username.trim(),
            role: userForm.role,
          },
        },
      });
      if (signUpError) throw signUpError;
      if (!data?.user?.id) throw new Error('User account was not created.');

      const payload = {
        ...profilePayloadFromUserForm(),
        archived_at: null,
      };
      const { error: profileError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', data.user.id);
      if (profileError) throw profileError;

      await recordAuditLog({
        action: 'create',
        entityType: 'profiles',
        entityId: data.user.id,
        oldValues: null,
        newValues: { id: data.user.id, ...payload },
      });
      showToast('User created');
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
    const { error: updateError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', editingUser.id);
    if (updateError) {
      showToast(updateError.message || 'Failed to update user', 'error');
    } else {
      await recordAuditLog({
        action: 'update',
        entityType: 'profiles',
        entityId: editingUser.id,
        oldValues: editingUser,
        newValues: { ...editingUser, ...payload },
      });
      showToast('User updated');
      setEditingUser(null);
      setProfiles(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...payload } : u));
    }
    setSavingUser(false);
  };

  const setUserArchiveState = async (user, shouldArchive) => {
    const archivedAt = shouldArchive ? new Date().toISOString() : null;
    const label = shouldArchive ? 'archive' : 'restore';
    const newValues = { ...user, archived_at: archivedAt };
    const { error: archiveError } = await supabase
      .from('profiles')
      .update({ archived_at: archivedAt, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (archiveError) {
      showToast(archiveError.message || `Failed to ${label} user`, 'error');
      return;
    }
    await recordAuditLog({
      action: shouldArchive ? 'delete' : 'restore',
      entityType: 'profiles',
      entityId: user.id,
      oldValues: user,
      newValues,
    });
    setProfiles(prev => prev.map(u => u.id === user.id ? { ...u, archived_at: archivedAt } : u));
    setEditingUser(prev => prev?.id === user.id ? { ...prev, archived_at: archivedAt } : prev);
    showToast(shouldArchive ? 'User deleted' : 'User restored');
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
    if (createAdminForm.password !== createAdminForm.confirm_password) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setCreatingAdmin(true);
    const { email, password, first_name, last_name, username, role: newRole } = createAdminForm;
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { first_name, last_name, username, role: newRole } } });
    if (error) showToast(error.message, 'error');
    else {
      const profileUpdate = { role: newRole, first_name, last_name, username };
      await supabase.from('profiles').update(profileUpdate).eq('id', data.user.id);
      await recordAuditLog({
        action: 'create',
        entityType: 'profiles',
        entityId: data.user.id,
        oldValues: null,
        newValues: { id: data.user.id, ...profileUpdate },
      });
      showToast('Admin created'); setCreateAdminForm({ email: '', password: '', confirm_password: '', first_name: '', last_name: '', username: '', role: 'admin' });
      const { data: ps } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (ps) setProfiles(ps);
    }
    setCreatingAdmin(false);
  };

  const navItems = [
    { key: 'overview', label: 'Overview', icon: HiOutlineHomeModern, show: true },
    { key: 'analytics', label: 'Analytics', icon: HiOutlineChartBarSquare, show: true },
    { key: 'users', label: 'User Management', icon: HiOutlineUsers, show: true },
    { key: 'content', label: 'Content Hub', icon: HiOutlineChartBarSquare, show: true },
    { key: 'settings', label: 'Admin Settings', icon: HiOutlineCog6Tooth, show: isSuperadmin },
    { key: 'audit', label: 'Audit Logs', icon: HiOutlineCog6Tooth, show: isSuperadmin },
  ].filter(i => i.show);

  return (
    <div className="admin-dashboard-page admin-layout" style={{ '--admin-sidebar-width': `${SIDEBAR_WIDTH}px` }}>
      <aside className="admin-rail">
        <div className="admin-rail-inner">
          <div className="admin-rail-brand"><p>BIGKAS</p><small>Admin Center</small></div>
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
            <h1>Admin Command Center</h1>
            <p className="admin-subtitle">Role: <strong>{role || 'unknown'}</strong></p>
          </div>
        </header>

        {error && <div className="admin-error">{error}</div>}

        {activePage === 'overview' && (
          <>
            <section className="admin-grid admin-grid-4">
              <article className="admin-card admin-kpi-card">
                <p className="admin-kpi-label">TOTAL USERS</p>
                <p className="admin-kpi-value">{loading ? <Skeleton width={60} /> : kpis.totalUsers}</p>
                <p className="admin-kpi-footer">{kpis.usersDeltaText}</p>
              </article>
              <article className="admin-card admin-kpi-card">
                <p className="admin-kpi-label">ACTIVE THIS WEEK</p>
                <p className="admin-kpi-value">{loading ? <Skeleton width={60} /> : kpis.activeThisWeek}</p>
                <p className="admin-kpi-footer">{kpis.activeDeltaText}</p>
              </article>
              <article className="admin-card admin-kpi-card">
                <p className="admin-kpi-label">SPEECHES ANALYZED</p>
                <p className="admin-kpi-value">{loading ? <Skeleton width={60} /> : kpis.totalSpeeches}</p>
                <p className="admin-kpi-footer">{kpis.speechDeltaText}</p>
              </article>
              <article className="admin-card admin-kpi-card">
                <p className="admin-kpi-label">PRIVACY COMPLIANCE</p>
                <div className="admin-privacy-status"><HiCheckCircle size={30} /><p className="admin-kpi-value admin-kpi-value--privacy">ACTIVE</p></div>
                <p className="admin-kpi-footer">{RETENTION_DAYS}-day auto-purge</p>
              </article>
            </section>
            <section className="admin-grid admin-grid-2">
              <article className="admin-card"><h3>User Join Trend</h3><div className="admin-chart-container">
                <ResponsiveContainer width="100%" height={300}><AreaChart data={joinTrendData}><XAxis dataKey="date" /><YAxis /><Tooltip /><Area type="monotone" dataKey="users" stroke="#33D2A4" fill="#33D2A433" /></AreaChart></ResponsiveContainer>
              </div></article>
              <article className="admin-card"><h3>User Level Distribution</h3><div className="admin-chart-container">
                <ResponsiveContainer width="100%" height={300}><BarChart data={levelBarData}><XAxis dataKey="level" /><YAxis /><Tooltip /><Bar dataKey="users" fill="#33D2A4" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer>
              </div></article>
            </section>
          </>
        )}

        {activePage === 'analytics' && (
          <>
            <div className="admin-global-filter">
              <label>Global Filter:</label>
              <select value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} className="admin-filter-select">
                <option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option><option value="ytd">Year to Date</option><option value="all">All Time</option>
              </select>
            </div>
            <section className="admin-grid admin-grid-2">
              <article className="admin-card"><h3>Mehrabian's Rule Over Time</h3><div className="admin-chart-container">
                <ResponsiveContainer width="100%" height={300}><LineChart data={multiDimProgress}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="confidence_score" name="Visual" stroke="#2C3E50" strokeWidth={3} /><Line type="monotone" dataKey="pronunciation_score" name="Vocal" stroke="#BDC3C7" strokeWidth={3} /><Line type="monotone" dataKey="verbal_score" name="Verbal" stroke="#33D2A4" strokeWidth={3} /></LineChart></ResponsiveContainer>
              </div></article>
              <article className="admin-card"><h3>Time Allocation (min)</h3><div className="admin-chart-container">
                <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={timeAllocation} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60}>{timeAllocation.map((e,i) => <Cell key={i} fill={PIE_COLORS[i % 4]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
              </div></article>
            </section>
            <section className="admin-grid admin-grid-2">
              <article className="admin-card admin-leaderboard-card"><h3>Most Consistent Users</h3><LeaderboardList items={mostConsistent} suffix="days" /></article>
              <article className="admin-card admin-leaderboard-card"><h3>Fastest Risers (Lifetime)</h3><LeaderboardList items={risers} suffix="pts" /></article>
            </section>

            <section className="admin-grid admin-grid-2">
              <article className="admin-card">
                <h3>Skill Mastery (Mehrabian's Rule)</h3>
                <div className="admin-chart-container">
                  {masteryRadarData.length === 0 ? (
                    <div className="admin-empty-chart">No mastery data available yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={masteryRadarData}>
                        <PolarGrid stroke="#BDC3C7" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#bdc3c7', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#bdc3c7', fontSize: 10 }} />
                        <Radar
                          name="Global Mastery"
                          dataKey="A"
                          stroke="#33D2A4"
                          fill="#33D2A4"
                          fillOpacity={0.4}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </article>

              <article className="admin-card">
                <h3>Course Progression Funnel</h3>
                <div className="admin-chart-container">
                  {courseFunnelData.length === 0 ? (
                    <div className="admin-empty-chart">No progression data available yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <FunnelChart>
                        <Tooltip />
                        <Funnel
                          dataKey="value"
                          data={courseFunnelData}
                          isAnimationActive
                        >
                          <LabelList position="right" fill="#bdc3c7" content={({ name, value }) => `${name}: ${value}`} />
                        </Funnel>
                      </FunnelChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </article>
            </section>
          </>
        )}

        {activePage === 'users' && (
          <section className="admin-card">
            <div className="admin-table-controls">
              <h3>User Management</h3>
              <div className="admin-table-actions">
                <div className="admin-search-box"><HiMagnifyingGlass /><input type="text" placeholder="Search..." value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} /></div>
                <select className="admin-filter-select" value={userLevelFilter} onChange={e => setUserLevelFilter(e.target.value)}>
                  <option value="all">All Journeys</option>
                  <option value="1">Journey 1</option>
                  <option value="2">Journey 2</option>
                  <option value="3">Journey 3</option>
                  <option value="4">Journey 4</option>
                  <option value="5">Journey 5</option>
                </select>
                <select className="admin-filter-select" value={userStatusFilter} onChange={e => { setUserStatusFilter(e.target.value); setUserPage(1); }}>
                  <option value="all">All Statuses</option>
                  <option value="active">Active Users</option>
                  <option value="deleted">Deleted Users</option>
                </select>
                <button type="button" className="admin-btn admin-btn--primary" onClick={openCreateUser}>Create User</button>
              </div>
            </div>
            <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Journey</th><th>Speaking</th><th>Points</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {paginatedUsers.map(u => (
                  <tr key={u.id}>
                    <td>{getDisplayName(u,u.id)}</td>
                    <td>{u.username || '-'}</td>
                    <td><span className={`admin-role-badge ${u.role === 'admin' || u.role === 'superadmin' ? 'is-admin' : ''}`}>{u.role || 'user'}</span></td>
                    <td>J-{u.current_level || 1}</td>
                    <td>L-{u.speaker_level || 1}</td>
                    <td>{u.speaker_points || 0}</td>
                    <td><span className={`admin-status-badge ${u.archived_at ? 'is-archived' : 'is-active'}`}>{u.archived_at ? 'Deleted' : 'Active'}</span></td>
                    <td className="admin-actions-cell">
                      <button type="button" onClick={() => openEditUser(u)} className="admin-action-btn" title="Edit user"><HiOutlinePencilSquare /></button>
                      <button type="button" onClick={() => requestUserArchiveState(u, !u.archived_at)} className={`admin-action-btn ${u.archived_at ? '' : 'is-delete'}`} title={u.archived_at ? 'Restore user' : 'Delete user'}>
                        {u.archived_at ? <HiCheckCircle /> : <HiOutlineTrash />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            {totalUserPages > 1 && <div className="admin-pagination"><button disabled={userPage === 1} onClick={() => setUserPage(p => p - 1)}>Prev</button><span>{userPage} / {totalUserPages}</span><button disabled={userPage === totalUserPages} onClick={() => setUserPage(p => p + 1)}>Next</button></div>}
          </section>
        )}

        {activePage === 'content' && (
          <section className="admin-content-hub">
            <div className="admin-tabs">
              <button className={`admin-tab-btn ${contentTab === 'activities' ? 'is-active' : ''}`} onClick={() => setContentTab('activities')}>Activities</button>
              <button className={`admin-tab-btn ${contentTab === 'modules' ? 'is-active' : ''}`} onClick={() => setContentTab('modules')}>Modules</button>
            </div>
            <div className="admin-card">
              <div className="admin-card-head"><h3>{contentTab === 'activities' ? 'Activity Management' : 'Module Management'}</h3><button onClick={() => setCreatingContent(true)} className="admin-btn admin-btn--primary">Add New</button></div>
              <div className="admin-table-wrap"><table className="admin-table">
                <thead><tr><th>Order/Lvl</th><th>Title</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>{(contentTab === 'activities' ? activities : modules).map(item => <tr key={item.id}><td>{contentTab === 'activities' ? item.activity_order : item.level_number}</td><td><strong>{item.title}</strong></td><td>{new Date(item.created_at).toLocaleDateString()}</td><td className="admin-actions-cell"><button onClick={() => setEditingContent(item)} className="admin-action-btn"><HiOutlinePencilSquare /></button><button onClick={() => handleDeleteContent(item.id, contentTab)} className="admin-action-btn is-delete"><HiOutlineTrash /></button></td></tr>)}</tbody>
              </table></div>
            </div>
          </section>
        )}

        {activePage === 'settings' && isSuperadmin && (
          <section className="admin-grid admin-grid-2">
            <div className="admin-settings-col">
              <article className="admin-card">
                <h3>Create Administrator</h3>
                <form className="admin-create-form" onSubmit={submitCreateAdmin}>
                  <label className="admin-create-field">
                    <span>Email</span>
                    <input type="email" required placeholder="admin@email.com" value={createAdminForm.email} onChange={e => setCreateAdminForm(p => ({ ...p, email: e.target.value }))} />
                  </label>
                  <label className="admin-create-field">
                    <span>Username</span>
                    <input type="text" placeholder="admin_username" value={createAdminForm.username} onChange={e => setCreateAdminForm(p => ({ ...p, username: e.target.value }))} />
                  </label>
                  <label className="admin-create-field">
                    <span>First Name</span>
                    <input type="text" placeholder="First name" value={createAdminForm.first_name} onChange={e => setCreateAdminForm(p => ({ ...p, first_name: e.target.value }))} />
                  </label>
                  <label className="admin-create-field">
                    <span>Last Name</span>
                    <input type="text" placeholder="Last name" value={createAdminForm.last_name} onChange={e => setCreateAdminForm(p => ({ ...p, last_name: e.target.value }))} />
                  </label>
                  <label className="admin-create-field">
                    <span>Password</span>
                    <AdminPasswordInput placeholder="Password" value={createAdminForm.password} onChange={e => setCreateAdminForm(p => ({ ...p, password: e.target.value }))} />
                  </label>
                  <label className="admin-create-field">
                    <span>Confirm Password</span>
                    <AdminPasswordInput placeholder="Confirm password" value={createAdminForm.confirm_password} onChange={e => setCreateAdminForm(p => ({ ...p, confirm_password: e.target.value }))} />
                  </label>
                  <label className="admin-create-field admin-create-field--full">
                    <span>Administrator Role</span>
                    <select value={createAdminForm.role} onChange={e => setCreateAdminForm(p => ({ ...p, role: e.target.value }))} className="admin-filter-select"><option value="admin">Admin</option><option value="superadmin">Superadmin</option></select>
                  </label>
                  <button type="submit" className="admin-btn admin-btn--primary" disabled={creatingAdmin}>{creatingAdmin ? 'Creating...' : 'Create Admin'}</button>
                </form>
              </article>
              <article className="admin-card">
                <h3>Active Administrators</h3>
                <div className="admin-roster-list">{profiles.filter(p => p.role === 'admin' || p.role === 'superadmin').map(a => <div key={a.id} className="admin-roster-item"><strong>{getDisplayName(a, a.id)}</strong><span>{a.role}</span></div>)}</div>
              </article>
            </div>
            <div className="admin-settings-col">
              <article className="admin-card">
                <h3>Platform Configurations</h3>
                <div className="admin-setting-item"><div><strong>Maintenance Mode</strong><p>Disable non-admin access</p></div><button onClick={() => toggleSetting('maintenance_mode', systemSettings.maintenance_mode)} className={`admin-btn ${systemSettings.maintenance_mode ? 'admin-btn--danger' : 'admin-btn--ghost'}`}>{systemSettings.maintenance_mode ? 'ON' : 'OFF'}</button></div>
                <div className="admin-setting-item"><div><strong>AI Failover Logging</strong><p>Record debug data</p></div><button onClick={() => toggleSetting('failover_logging', systemSettings.failover_logging)} className={`admin-btn ${systemSettings.failover_logging ? 'admin-btn--primary' : 'admin-btn--ghost'}`}>{systemSettings.failover_logging ? 'ON' : 'OFF'}</button></div>
              </article>
            </div>
          </section>
        )}

        {activePage === 'audit' && isSuperadmin && (
          <section className="admin-card">
            <div className="admin-card-head"><h3>System Audit Logs</h3><div className="admin-search-box"><HiMagnifyingGlass /><input type="text" placeholder="Search Actor..." value={auditSearchQuery} onChange={e => setAuditSearchQuery(e.target.value)} /></div></div>
            <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
              <tbody>{paginatedAuditLogs.map(l => <tr key={l.id}><td>{new Date(l.created_at).toLocaleString()}</td><td>{getDisplayName(profiles.find(p => p.id === l.actor_id), l.actor_id)}</td><td>{l.action}</td><td>{l.entity_type}</td><td><button onClick={() => setInspectingLog(l)} className="admin-action-btn"><HiMagnifyingGlass /></button></td></tr>)}</tbody>
            </table></div>
            {totalAuditPages > 1 && <div className="admin-pagination"><button disabled={auditPage === 1} onClick={() => setAuditPage(p => p - 1)}>Prev</button><span>{auditPage} / {totalAuditPages}</span><button disabled={auditPage === totalAuditPages} onClick={() => setAuditPage(p => p + 1)}>Next</button></div>}
          </section>
        )}
      </section>

      {creatingUser && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setCreatingUser(false)}><div className="admin-modal admin-user-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="admin-card-head"><h3>Create User</h3><button type="button" onClick={() => setCreatingUser(false)} className="admin-btn admin-btn--ghost">Close</button></div>
        <form className="admin-user-form" onSubmit={submitCreateUser}>
          <AdminUserField label="Email" help="Login email used for the Supabase auth account.">
            <input type="email" required placeholder="user@email.com" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Username" help="Unique public handle stored in profiles.username.">
            <input type="text" placeholder="username" value={userForm.username} onChange={e => setUserForm(p => ({ ...p, username: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="First Name">
            <input type="text" placeholder="First name" value={userForm.first_name} onChange={e => setUserForm(p => ({ ...p, first_name: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Last Name">
            <input type="text" placeholder="Last name" value={userForm.last_name} onChange={e => setUserForm(p => ({ ...p, last_name: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Password" help="Password for this user account; minimum 6 characters.">
            <AdminPasswordInput placeholder="Password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Confirm Password" help="Must match the password above.">
            <AdminPasswordInput placeholder="Confirm password" value={userForm.confirm_password} onChange={e => setUserForm(p => ({ ...p, confirm_password: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="System Role" help="Controls platform permissions: user, admin, or superadmin.">
            <select value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))}>
              <option value="user">User</option><option value="admin">Admin</option><option value="superadmin">Superadmin</option>
            </select>
          </AdminUserField>
          <AdminUserField label="Journey Level" help="Current learning journey from 1 to 5.">
            <input type="number" min="1" max="5" placeholder="Journey level" value={userForm.current_level} onChange={e => setUserForm(p => ({ ...p, current_level: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Speaker Level" help="Speaking proficiency level from 1 to 5.">
            <input type="number" min="1" max="5" placeholder="Speaker level" value={userForm.speaker_level} onChange={e => setUserForm(p => ({ ...p, speaker_level: e.target.value }))} />
          </AdminUserField>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={savingUser}>{savingUser ? 'Creating...' : 'Create User'}</button>
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
          <AdminUserField label="Username" help="Unique public handle stored in profiles.username.">
            <input type="text" placeholder="username" value={userForm.username} onChange={e => setUserForm(p => ({ ...p, username: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="System Role" help="Controls platform permissions: user, admin, or superadmin.">
            <select value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))}>
              <option value="user">User</option><option value="admin">Admin</option><option value="superadmin">Superadmin</option>
            </select>
          </AdminUserField>
          <AdminUserField label="Journey Level" help="Current learning journey from 1 to 5.">
            <input type="number" min="1" max="5" placeholder="Journey level" value={userForm.current_level} onChange={e => setUserForm(p => ({ ...p, current_level: e.target.value }))} />
          </AdminUserField>
          <AdminUserField label="Speaker Level" help="Speaking proficiency level from 1 to 5.">
            <input type="number" min="1" max="5" placeholder="Speaker level" value={userForm.speaker_level} onChange={e => setUserForm(p => ({ ...p, speaker_level: e.target.value }))} />
          </AdminUserField>
          <div className="admin-modal-actions">
            <button type="button" onClick={() => requestUserArchiveState(editingUser, !editingUser.archived_at)} className={`admin-btn ${editingUser.archived_at ? 'admin-btn--ghost' : 'admin-btn--danger'}`}>{editingUser.archived_at ? 'Restore User' : 'Delete User'}</button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={savingUser}>{savingUser ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div></div>, document.body)}

      {pendingArchiveUser && createPortal(<div className="admin-modal-backdrop admin-main-modal-backdrop" role="presentation" onClick={() => setPendingArchiveUser(null)}><div className="admin-modal admin-confirm-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <h3>Delete User?</h3>
        <p>This will mark <strong>{getDisplayName(pendingArchiveUser, pendingArchiveUser.id)}</strong> as deleted. The profile row stays in the database and can be restored later.</p>
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setPendingArchiveUser(null)}>Cancel</button>
          <button type="button" className="admin-btn admin-btn--danger" onClick={confirmArchiveUser}>Delete User</button>
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
          This only adds Level {pendingLevelAdd} to the admin dropdown. Confirm that the database rules and learner content already support this level before saving activities to it.
        </p>
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setPendingLevelAdd(null)}>Cancel</button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={confirmNextTargetLevel}>Add Level</button>
        </div>
      </div></div>, document.body)}

      {inspectingLog && createPortal(<div className="admin-modal-backdrop"><div className="admin-modal"><h3>Audit Details</h3><pre><code>{JSON.stringify(inspectingLog.new_values, null, 2)}</code></pre><button onClick={() => setInspectingLog(null)} className="admin-btn">Close</button></div></div>, document.body)}

      {toastMessage && <div className={`admin-toast ${toastMessage.type}`}>{toastMessage.text}</div>}
      {showLogoutConfirm && createPortal(<div className="admin-logout-modal-backdrop"><div className="admin-logout-modal"><h3>Log out?</h3><button onClick={async () => { await logout(); navigate(ROUTES.HOME); }}>Confirm</button><button onClick={() => setShowLogoutConfirm(false)}>Cancel</button></div></div>, document.body)}
    </div>
  );
}

export default AdminDashboardPage;

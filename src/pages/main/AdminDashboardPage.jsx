import { useEffect, useMemo, useState } from 'react';
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
  Legend
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

function AdminDashboardPage() {
  const navigate = useNavigate();
  const { logout } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState('');
  const [activePage, setActivePage] = useState('overview');
  const [globalFilter, setGlobalFilter] = useState('30d');

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
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userLevelFilter, setUserLevelFilter] = useState('all');
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 10;
  const [archivingUserId, setArchivingUserId] = useState(null);

  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [createAdminForm, setCreateAdminForm] = useState({
    email: '',
    password: '',
    first_name: '',
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

        const [profilesRes, sessionsRes, metricsRes, settingsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('sessions')
            .select('id, user_id, created_at, duration, session_origin, session_mode, speaking_mode')
            .order('created_at', { ascending: true }),
          supabase
            .from('session_metrics')
            .select('session_id, overall_score, fluency_score, confidence_score, pronunciation_score'),
          roleProfile.role === 'superadmin' ? supabase.from('system_settings').select('*') : Promise.resolve({ data: [] })
        ]);

        if (profilesRes.error) throw profilesRes.error;
        if (sessionsRes.error) throw sessionsRes.error;
        if (metricsRes.error) throw metricsRes.error;

        if (!active) return;
        setRole(roleProfile.role);
        setProfiles(profilesRes.data || []);
        setSessions(sessionsRes.data || []);
        setMetrics(metricsRes.data || []);
        
        if (settingsRes.data && settingsRes.data.length > 0) {
          const sMap = {};
          settingsRes.data.forEach(s => sMap[s.key] = s.value === 'true');
          setSystemSettings(prev => ({ ...prev, ...sMap }));
        }
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
          .select('id, action, entity_type, entity_id, actor_id, created_at, old_values, new_values, ip_address')
          .order('created_at', { ascending: false })
          .limit(1000);
        if (auditErr) throw auditErr;
        if (!active) return;
        const logs = data || [];
        setAuditLogs(logs);
      } catch (e) {
        if (active) setError(e.message || 'Failed to load admin settings data.');
      }
    }
    loadSettingsData();
    return () => { active = false; };
  }, [isSuperadmin, activePage]);

  const visibleUsers = useMemo(
    () => profiles.filter((p) => !p.archived_at),
    [profiles],
  );

  const profileById = useMemo(() => {
    const map = new Map();
    visibleUsers.forEach((p) => map.set(p.id, p));
    return map;
  }, [visibleUsers]);

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
      fluency: Number(m.fluency_score),
      confidence: Number(m.confidence_score),
      pronunciation: Number(m.pronunciation_score)
    }));
    return map;
  }, [metrics]);

  const levelDistribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    visibleUsers.forEach((p) => {
      const lv = Number(p.current_level || 1);
      if (counts[lv] != null) counts[lv] += 1;
    });
    return Object.entries(counts).map(([lv, value]) => ({ label: `Level ${lv}`, value }));
  }, [visibleUsers]);

  const kpis = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = shiftRange(now, 'day', -7);
    const twoWeeksAgo = shiftRange(now, 'day', -14);

    // TOTAL USERS
    const totalUsers = visibleUsers.length;
    const usersLastWeek = visibleUsers.filter(p => new Date(p.created_at) < oneWeekAgo).length;
    const usersNewThisWeek = totalUsers - usersLastWeek;
    const usersDeltaText = usersNewThisWeek > 0 ? `+${usersNewThisWeek} new this week` : 'No new users this week';

    // ACTIVE THIS WEEK
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
    const activeDeltaText = activeDelta >= 0 ? `+${activeDelta} vs last week` : `${activeDelta} vs last week`;

    // SPEECHES ANALYZED
    const totalSpeeches = sessions.length;
    const speechesLastWeekCount = sessions.filter(s => new Date(s.created_at) >= oneWeekAgo).length;
    const speechesPrevWeekCount = sessions.filter(s => {
      const d = new Date(s.created_at);
      return d >= twoWeeksAgo && d < oneWeekAgo;
    }).length;
    const speechDelta = speechesLastWeekCount - speechesPrevWeekCount;
    const speechDeltaText = speechDelta >= 0 ? `+${speechesLastWeekCount} this week` : `${speechDelta} vs last week`;

    return {
      totalUsers, usersDeltaText,
      activeThisWeek, activeDeltaText,
      totalSpeeches, speechDeltaText
    };
  }, [visibleUsers, sessions]);

  const joinTrendData = useMemo(() => {
    const days = 14;
    const now = new Date();
    const counts = Array.from({ length: days }).map((_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (days - 1) + i);
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        timestamp: d.setHours(0, 0, 0, 0),
      };
    });

    counts.forEach(day => {
      const nextDayMs = day.timestamp + 86400000;
      day.users = visibleUsers.filter(p => {
        const createdMs = new Date(p.created_at).getTime();
        return createdMs >= day.timestamp && createdMs < nextDayMs;
      }).length;
    });

    return counts;
  }, [visibleUsers]);

  const levelBarData = useMemo(
    () => levelDistribution.map((item) => ({ level: item.label, users: item.value })),
    [levelDistribution],
  );

  const timeAllocation = useMemo(() => {
    const totals = { Activities: 0, Randomizer: 0, 'Free Speech': 0 };
    filteredSessions.forEach((s) => { totals[modeOf(s)] += Number(s.duration || 0); });
    return Object.entries(totals)
      .map(([label, value]) => ({ name: label, value: Math.round(value / 60) }))
      .filter(d => d.value > 0);
  }, [filteredSessions]);

  const grind = useMemo(() => {
    const totals = new Map();
    filteredSessions.forEach((s) => totals.set(s.user_id, (totals.get(s.user_id) || 0) + Number(s.duration || 0)));
    return Array.from(totals.entries())
      .map(([id, sec]) => {
        const prof = profileById.get(id);
        return {
          id,
          username: prof?.username || getDisplayName(prof, id),
          initial: (prof?.username || prof?.first_name || 'U')[0].toUpperCase(),
          value: Math.round(sec / 60)
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredSessions, profileById]);

  const risers = useMemo(() => {
    const byUser = new Map();
    filteredSessions.forEach((s) => {
      const scores = metricBySession.get(s.id);
      if (!scores || !Number.isFinite(scores.overall)) return;
      const list = byUser.get(s.user_id) || [];
      list.push({ created_at: s.created_at, score: scores.overall });
      byUser.set(s.user_id, list);
    });
    return Array.from(byUser.entries())
      .map(([id, list]) => {
        if (list.length < 2) return null;
        const sorted = [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const prof = profileById.get(id);
        return {
          id,
          username: prof?.username || getDisplayName(prof, id),
          initial: (prof?.username || prof?.first_name || 'U')[0].toUpperCase(),
          value: Number((sorted[sorted.length - 1].score - sorted[0].score).toFixed(1))
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredSessions, metricBySession, profileById]);

  const multiDimProgress = useMemo(() => {
    const buckets = new Map();
    filteredSessions.forEach((s) => {
      const scores = metricBySession.get(s.id);
      if (!scores || !Number.isFinite(scores.fluency)) return;
      const d = new Date(s.created_at);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      const cur = buckets.get(key) || { f: 0, c: 0, p: 0, count: 0 };
      cur.f += scores.fluency;
      cur.c += scores.confidence;
      cur.p += scores.pronunciation;
      cur.count += 1;
      buckets.set(key, cur);
    });
    return Array.from(buckets.entries())
      .map(([label, v]) => ({
        label,
        fluency_score: Number((v.f / v.count).toFixed(1)),
        confidence_score: Number((v.c / v.count).toFixed(1)),
        pronunciation_score: Number((v.p / v.count).toFixed(1)),
      }))
      .sort((a, b) => {
        const [m1, d1] = a.label.split('/').map(Number);
        const [m2, d2] = b.label.split('/').map(Number);
        if (m1 !== m2) return m1 - m2;
        return d1 - d2;
      });
  }, [filteredSessions, metricBySession]);

  const filteredUsers = useMemo(() => {
    let result = profiles; // Including archived for now, but we'll show status

    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      result = result.filter((p) => {
        const nameMatch = (p.first_name || '').toLowerCase().includes(q);
        const userMatch = (p.username || '').toLowerCase().includes(q);
        return nameMatch || userMatch;
      });
    }

    if (userLevelFilter !== 'all') {
      result = result.filter((p) => Number(p.current_level) === Number(userLevelFilter));
    }

    return result;
  }, [profiles, userSearchQuery, userLevelFilter]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (userPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
  }, [filteredUsers, userPage]);

  const totalUserPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);

  const handleNextUserPage = () => {
    if (userPage < totalUserPages) setUserPage((prev) => prev + 1);
  };

  const handlePrevUserPage = () => {
    if (userPage > 1) setUserPage((prev) => prev - 1);
  };

  const filteredAuditLogs = useMemo(() => {
    let result = auditLogs;
    if (auditSearchQuery.trim()) {
      const q = auditSearchQuery.toLowerCase();
      result = result.filter(log => {
        const actorName = getDisplayName(profiles.find(p => p.id === log.actor_id), log.actor_id).toLowerCase();
        return actorName.includes(q) || String(log.actor_id).toLowerCase().includes(q);
      });
    }
    if (auditActionFilter !== 'all') {
      result = result.filter(log => log.action.toLowerCase() === auditActionFilter.toLowerCase());
    }
    if (auditEntityFilter !== 'all') {
      result = result.filter(log => log.entity_type.toLowerCase() === auditEntityFilter.toLowerCase());
    }
    return result;
  }, [auditLogs, auditSearchQuery, auditActionFilter, auditEntityFilter, profiles]);

  const paginatedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * AUDIT_PER_PAGE;
    return filteredAuditLogs.slice(start, start + AUDIT_PER_PAGE);
  }, [filteredAuditLogs, auditPage]);

  const totalAuditPages = Math.ceil(filteredAuditLogs.length / AUDIT_PER_PAGE);

  useEffect(() => {
    setAuditPage(1);
  }, [auditSearchQuery, auditActionFilter, auditEntityFilter]);

  const getActionBadgeClass = (action) => {
    const a = action.toLowerCase();
    if (a.includes('create') || a.includes('insert')) return 'is-active';
    if (a.includes('update')) return 'is-update';
    if (a.includes('delete') || a.includes('archive')) return 'is-archived';
    return '';
  };

  useEffect(() => {
    setUserPage(1); // Reset page when filters change
  }, [userSearchQuery, userLevelFilter]);

  const onLogout = async () => {
    await logout();
    navigate(ROUTES.HOME, { replace: true });
  };

  const openEditUser = (user) => {
    setEditingUser(user);
  };

  const archiveUser = async () => {
    if (!archivingUserId) return;
    const userId = archivingUserId;
    const { error: archiveError } = await supabase
      .from('profiles')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', userId);
    if (archiveError) {
      setError(archiveError.message || 'Failed to archive user.');
      setArchivingUserId(null);
      return;
    }
    setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, archived_at: new Date().toISOString() } : p)));
    setArchivingUserId(null);
  };

  const submitCreateAdmin = async (e) => {
    e.preventDefault();
    if (!isSuperadmin) return;
    setCreatingAdmin(true);
    const email = String(createAdminForm.email || '').trim();
    const password = String(createAdminForm.password || '');
    const firstName = String(createAdminForm.first_name || '').trim();
    const username = String(createAdminForm.username || '').trim();
    const newRole = createAdminForm.role || 'admin';

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, username, role: newRole } },
    });

    if (signUpError || !data?.user?.id) {
      setCreatingAdmin(false);
      showToast(signUpError?.message || 'Failed to create admin auth account.', 'error');
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: newRole, first_name: firstName || null, username: username || null })
      .eq('id', data.user.id);

    setCreatingAdmin(false);
    if (profileError) {
      showToast(`Auth created, but role update failed: ${profileError.message}`, 'error');
      return;
    }

    showToast('Admin account created successfully.', 'success');
    setCreateAdminForm({ email: '', password: '', first_name: '', username: '', role: 'admin' });
    
    // Refresh profiles to show new admin
    const { data: newProfiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (newProfiles) setProfiles(newProfiles);
  };

  const toggleSetting = async (key, currentValue) => {
    const newValue = !currentValue;
    setSystemSettings(prev => ({ ...prev, [key]: newValue }));
    
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key, value: String(newValue) }, { onConflict: 'key' });
      
    if (error) {
      setSystemSettings(prev => ({ ...prev, [key]: currentValue }));
      showToast('Failed to update setting', 'error');
    } else {
      showToast('Setting updated successfully', 'success');
    }
  };

  const navItems = [
    { key: 'overview', label: 'Overview', icon: HiOutlineHomeModern, show: true },
    { key: 'analytics', label: 'Analytics', icon: HiOutlineChartBarSquare, show: true },
    { key: 'users', label: 'User Management', icon: HiOutlineUsers, show: true },
    { key: 'settings', label: 'Admin Settings', icon: HiOutlineCog6Tooth, show: isSuperadmin },
    { key: 'audit', label: 'Audit Logs', icon: HiOutlineCog6Tooth, show: isSuperadmin },
  ].filter((i) => i.show);

  return (
    <div className="admin-dashboard-page admin-layout" style={{ ['--admin-sidebar-width']: `${SIDEBAR_WIDTH}px` }}>
      <aside className="admin-rail">
        <div className="admin-rail-inner">
          <div className="admin-rail-brand">
            <p>BIGKAS</p>
            <small>Admin Center</small>
          </div>
          <nav className="admin-rail-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`admin-rail-btn ${active ? 'is-active' : ''}`}
                  onClick={() => setActivePage(item.key)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
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
                {loading ? <Skeleton width={60} height={40} /> : <p className="admin-kpi-value">{kpis.totalUsers}</p>}
                <p className="admin-kpi-footer">{loading ? <Skeleton width={100} /> : kpis.usersDeltaText}</p>
              </article>
              <article className="admin-card admin-kpi-card">
                <p className="admin-kpi-label">ACTIVE THIS WEEK</p>
                {loading ? <Skeleton width={60} height={40} /> : <p className="admin-kpi-value">{kpis.activeThisWeek}</p>}
                <p className="admin-kpi-footer">{loading ? <Skeleton width={100} /> : kpis.activeDeltaText}</p>
              </article>
              <article className="admin-card admin-kpi-card">
                <p className="admin-kpi-label">SPEECHES ANALYZED</p>
                {loading ? <Skeleton width={60} height={40} /> : <p className="admin-kpi-value">{kpis.totalSpeeches}</p>}
                <p className="admin-kpi-footer">{loading ? <Skeleton width={100} /> : kpis.speechDeltaText}</p>
              </article>
              <article className="admin-card admin-kpi-card">
                <p className="admin-kpi-label">PRIVACY COMPLIANCE</p>
                <div className="admin-privacy-status">
                  <HiCheckCircle size={30} />
                  <p className="admin-kpi-value admin-kpi-value--privacy">ACTIVE</p>
                </div>
                <p className="admin-kpi-footer">{RETENTION_DAYS}-day auto-purge</p>
              </article>
            </section>

            <section className="admin-grid admin-grid-2">
              <article className="admin-card">
                <div className="admin-card-head">
                  <h3>User Join Trend</h3>
                </div>
                <div className="admin-chart-container">
                  {loading ? (
                    <Skeleton height="100%" borderRadius={16} />
                  ) : joinTrendData.every(d => d.users === 0) ? (
                    <div className="admin-empty-chart">No data available yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={joinTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#33D2A4" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#33D2A4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fill: '#bdc3c7', fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: '#bdc3c7', fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: '1px solid #BDC3C7', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          formatter={(value) => [`${value} New Users`, 'Joined']} 
                        />
                        <Area type="monotone" dataKey="users" stroke="#33D2A4" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </article>

              <article className="admin-card">
                <h3>User Level Distribution</h3>
                <div className="admin-chart-container">
                  {loading ? (
                    <Skeleton height="100%" borderRadius={16} />
                  ) : levelBarData.every(d => d.users === 0) ? (
                    <div className="admin-empty-chart">No data available yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={levelBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="level" tick={{ fill: '#bdc3c7', fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: '#bdc3c7', fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{ fill: '#f9fafb' }}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #BDC3C7', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          formatter={(value) => [`${value}`, 'Users']} 
                        />
                        <Bar dataKey="users" fill="#33D2A4" radius={[8, 8, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </article>
            </section>
          </>
        )}

        {activePage === 'analytics' && (
          <>
            <div className="admin-global-filter">
              <label htmlFor="global-date-filter">Global Date Filter:</label>
              <select 
                id="global-date-filter" 
                value={globalFilter} 
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="admin-filter-select"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="ytd">Year to Date</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <section className="admin-grid admin-grid-2">
              <article className="admin-card">
                <h3>Improvement Over Time</h3>
                <div className="admin-chart-container">
                  {loading ? (
                    <Skeleton height="100%" borderRadius={16} />
                  ) : multiDimProgress.length === 0 ? (
                    <div className="admin-empty-chart">No data available yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={multiDimProgress} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#BDC3C7" />
                        <XAxis dataKey="label" tick={{ fill: '#bdc3c7', fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: '#bdc3c7', fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: '1px solid #BDC3C7', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        <Line type="monotone" dataKey="fluency_score" name="Fluency" stroke="#33D2A4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="confidence_score" name="Confidence" stroke="#2C3E50" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="pronunciation_score" name="Pronunciation" stroke="#BDC3C7" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </article>
              <article className="admin-card">
                <h3>Time Allocation (minutes)</h3>
                <div className="admin-chart-container">
                  {loading ? (
                    <Skeleton height="100%" borderRadius={16} />
                  ) : timeAllocation.length === 0 ? (
                    <div className="admin-empty-chart">No data available yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={timeAllocation}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={60}
                          paddingAngle={5}
                        >
                          {timeAllocation.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} min`, 'Duration']} />
                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </article>
            </section>
            <section className="admin-grid admin-grid-2">
              <article className="admin-card">
                <h3>The Grind</h3>
                {loading ? <Skeleton count={5} height={40} style={{ marginBottom: 8 }} /> : (
                  <LeaderboardList items={grind} suffix="hrs" emptyMsg="No active users found for this period" />
                )}
              </article>
              <article className="admin-card">
                <h3>Fastest Risers</h3>
                {loading ? <Skeleton count={5} height={40} style={{ marginBottom: 8 }} /> : (
                  <LeaderboardList items={risers} suffix="pts" emptyMsg="No active users found for this period" />
                )}
              </article>
            </section>
          </>
        )}

        {activePage === 'users' && (
          <section className="admin-card">
            <div className="admin-table-controls">
              <h3>User Management</h3>
              <div className="admin-table-actions">
                <div className="admin-search-box">
                  <HiMagnifyingGlass className="admin-search-icon" />
                  <input 
                    type="text" 
                    placeholder="Search users..." 
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                  />
                </div>
                <select 
                  className="admin-filter-select"
                  value={userLevelFilter}
                  onChange={(e) => setUserLevelFilter(e.target.value)}
                >
                  <option value="all">All Levels</option>
                  <option value="1">Level 1</option>
                  <option value="2">Level 2</option>
                  <option value="3">Level 3</option>
                  <option value="4">Level 4</option>
                  <option value="5">Level 5</option>
                </select>
              </div>
            </div>

            {!filteredUsers.length ? (
              <div className="admin-empty-chart">No users found matching your criteria.</div>
            ) : (
              <>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Level</th>
                        <th>Points</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map((u) => (
                        <tr key={u.id}>
                          <td>{getDisplayName(u, u.id)}</td>
                          <td>{u.username || '-'}</td>
                          <td>
                            <span className={`admin-role-badge ${u.role === 'admin' || u.role === 'superadmin' ? 'is-admin' : ''}`}>
                              {u.role || 'user'}
                            </span>
                          </td>
                          <td>{u.current_level || 1}</td>
                          <td>{u.speaker_points || 0}</td>
                          <td>
                            <span className={`admin-status-badge ${u.archived_at ? 'is-archived' : 'is-active'}`}>
                              {u.archived_at ? 'Archived' : 'Active'}
                            </span>
                          </td>
                          <td className="admin-actions">
                            <button type="button" className="admin-icon-btn admin-icon-btn--edit" onClick={() => openEditUser(u)} title="Edit User">
                              <HiOutlinePencilSquare size={18} />
                            </button>
                            <button type="button" className="admin-icon-btn admin-icon-btn--danger" onClick={() => setArchivingUserId(u.id)} title="Archive User" disabled={!!u.archived_at}>
                              <HiOutlineTrash size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="admin-pagination">
                  <span className="admin-pagination-info">
                    Showing {(userPage - 1) * USERS_PER_PAGE + 1} to {Math.min(userPage * USERS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} entries
                  </span>
                  <div className="admin-pagination-controls">
                    <button type="button" disabled={userPage === 1} onClick={handlePrevUserPage}>Previous</button>
                    <button type="button" disabled={userPage === totalUserPages || totalUserPages === 0} onClick={handleNextUserPage}>Next</button>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {activePage === 'settings' && isSuperadmin && (
          <section className="admin-grid admin-grid-2">
            <div className="admin-settings-col">
              <article className="admin-card">
                <h3>Create Administrator</h3>
                <form className="admin-create-form" onSubmit={submitCreateAdmin}>
                  <input
                    type="email"
                    required
                    placeholder="admin@email.com"
                    value={createAdminForm.email}
                    onChange={(e) => setCreateAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Username"
                    value={createAdminForm.username}
                    onChange={(e) => setCreateAdminForm((prev) => ({ ...prev, username: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="First Name"
                    value={createAdminForm.first_name}
                    onChange={(e) => setCreateAdminForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Temporary Password"
                    value={createAdminForm.password}
                    onChange={(e) => setCreateAdminForm((prev) => ({ ...prev, password: e.target.value }))}
                  />
                  <select
                    value={createAdminForm.role}
                    onChange={(e) => setCreateAdminForm((prev) => ({ ...prev, role: e.target.value }))}
                    style={{ gridColumn: '1 / -1' }}
                  >
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                  <button type="submit" className="admin-btn admin-btn--primary" disabled={creatingAdmin} style={{ gridColumn: '1 / -1' }}>
                    {creatingAdmin ? 'Creating...' : 'Create Admin'}
                  </button>
                </form>
              </article>

              <article className="admin-card">
                <h3>Active Administrators</h3>
                <div className="admin-roster-list">
                  {profiles.filter(p => p.role === 'admin' || p.role === 'superadmin').map(admin => (
                    <div key={admin.id} className="admin-roster-item">
                      <div className="admin-lb-avatar">{(admin.username || admin.first_name || 'A')[0].toUpperCase()}</div>
                      <div className="admin-roster-info">
                        <strong>{getDisplayName(admin, admin.id)}</strong>
                      </div>
                      <span className={`admin-role-badge ${admin.role === 'superadmin' ? 'is-admin' : ''}`}>
                        {admin.role}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="admin-settings-col">
              <article className="admin-card">
                <h3>Platform Configurations</h3>
                
                <div className="admin-setting-item">
                  <div className="admin-setting-info">
                    <strong>Platform Maintenance Mode</strong>
                    <p>Disables login for non-admin users and displays a maintenance screen.</p>
                  </div>
                  <label className="admin-toggle">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.maintenance_mode} 
                      onChange={() => toggleSetting('maintenance_mode', systemSettings.maintenance_mode)} 
                    />
                    <span className="admin-toggle-slider"></span>
                  </label>
                </div>

                <div className="admin-setting-item">
                  <div className="admin-setting-info">
                    <strong>Enable AI Failover Logging</strong>
                    <p>Records all failed AI prompt generations to the database for debugging.</p>
                  </div>
                  <label className="admin-toggle">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.failover_logging} 
                      onChange={() => toggleSetting('failover_logging', systemSettings.failover_logging)} 
                    />
                    <span className="admin-toggle-slider"></span>
                  </label>
                </div>

                <div className="admin-setting-item">
                  <div className="admin-setting-info">
                    <strong>Capstone Defense Data Mode</strong>
                    <p>Injects mock chart data across the dashboard for presentation purposes.</p>
                  </div>
                  <label className="admin-toggle">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.defense_data_mode} 
                      onChange={() => toggleSetting('defense_data_mode', systemSettings.defense_data_mode)} 
                    />
                    <span className="admin-toggle-slider"></span>
                  </label>
                </div>
              </article>
            </div>
          </section>
        )}

        {activePage === 'audit' && isSuperadmin && (
          <section className="admin-card">
            <div className="admin-table-controls">
              <h3>Audit Logs</h3>
              <div className="admin-table-actions">
                <div className="admin-search-box">
                  <HiMagnifyingGlass className="admin-search-icon" />
                  <input 
                    type="text" 
                    placeholder="Search by Actor Name/ID..." 
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                  />
                </div>
                <select 
                  className="admin-filter-select"
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                >
                  <option value="all">All Actions</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete / Archive</option>
                </select>
                <select 
                  className="admin-filter-select"
                  value={auditEntityFilter}
                  onChange={(e) => setAuditEntityFilter(e.target.value)}
                >
                  <option value="all">All Entities</option>
                  <option value="profiles">Profiles</option>
                  <option value="sessions">Sessions</option>
                  <option value="system_settings">System Settings</option>
                </select>
              </div>
            </div>

            {loading ? (
              <Skeleton count={10} height={40} style={{ marginBottom: 8 }} />
            ) : !filteredAuditLogs.length ? (
              <p className="admin-empty-chart">No audit logs found matching your criteria.</p>
            ) : (
              <>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Actor</th>
                        <th>Action</th>
                        <th>Entity</th>
                        <th>IP Address</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAuditLogs.map((log) => (
                        <tr key={log.id}>
                          <td>{new Date(log.created_at).toLocaleString()}</td>
                          <td>
                            <strong>{getDisplayName(profiles.find(p => p.id === log.actor_id), log.actor_id)}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#BDC3C7' }}>{String(log.actor_id || '').slice(0, 8)}</div>
                          </td>
                          <td>
                            <span className={`admin-status-badge ${getActionBadgeClass(log.action)}`}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>{String(log.entity_type).replace('_', ' ')}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#BDC3C7' }}>
                            {log.ip_address || 'N/A'}
                          </td>
                          <td>
                            <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setInspectingLog(log)}>
                              Inspect Payload
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="admin-pagination">
                  <span className="admin-pagination-info">
                    Showing {(auditPage - 1) * AUDIT_PER_PAGE + 1} to {Math.min(auditPage * AUDIT_PER_PAGE, filteredAuditLogs.length)} of {filteredAuditLogs.length} entries
                  </span>
                  <div className="admin-pagination-controls">
                    <button type="button" disabled={auditPage === 1} onClick={() => setAuditPage(prev => prev - 1)}>Previous</button>
                    <button type="button" disabled={auditPage === totalAuditPages || totalAuditPages === 0} onClick={() => setAuditPage(prev => prev + 1)}>Next</button>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </section>

        {editingUser && (
          <div className="admin-modal-backdrop" role="presentation" onClick={() => setEditingUser(null)}>
            <div className="admin-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <h3>View User</h3>
            <label htmlFor="admin-edit-first-name">First Name</label>
            <input
              id="admin-edit-first-name"
              type="text"
              value={editingUser.first_name || ''}
              readOnly
            />
            <label htmlFor="admin-edit-username">Username</label>
            <input
              id="admin-edit-username"
              type="text"
              value={editingUser.username || ''}
              readOnly
            />
            <label htmlFor="admin-edit-last-name">Last Name</label>
            <input
              id="admin-edit-last-name"
              type="text"
              value={editingUser.last_name || ''}
              readOnly
            />
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setEditingUser(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {archivingUserId && (
        <div className="admin-modal-backdrop" role="presentation" onClick={() => setArchivingUserId(null)}>
          <div className="admin-modal admin-confirm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Archive User</h3>
            <p>Are you sure you want to archive <strong>{getDisplayName(profiles.find(p => p.id === archivingUserId))}</strong>? They will lose access to the platform.</p>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setArchivingUserId(null)}>Cancel</button>
              <button type="button" className="admin-btn admin-btn--danger" onClick={archiveUser}>Confirm Archive</button>
            </div>
          </div>
        </div>
      )}

      {inspectingLog && (
        <div className="admin-modal-backdrop" role="presentation" onClick={() => setInspectingLog(null)}>
          <div className="admin-modal admin-payload-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="admin-card-head">
              <h3>Payload Inspector</h3>
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setInspectingLog(null)}>Close</button>
            </div>
            <div className="admin-payload-content">
              <div className="admin-payload-section">
                <strong>Old Values</strong>
                <pre><code>{inspectingLog.old_values ? JSON.stringify(inspectingLog.old_values, null, 2) : 'None'}</code></pre>
              </div>
              <div className="admin-payload-section">
                <strong>New Values</strong>
                <pre><code>{inspectingLog.new_values ? JSON.stringify(inspectingLog.new_values, null, 2) : 'None'}</code></pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className={`admin-toast ${toastMessage.type}`}>
          {toastMessage.text}
        </div>
      )}
    </div>
  );
}

export default AdminDashboardPage;

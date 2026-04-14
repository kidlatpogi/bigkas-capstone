import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineUsers, HiOutlineChartBarSquare, HiOutlineHomeModern, HiOutlineCog6Tooth, HiCheckCircle } from 'react-icons/hi2';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import './AdminDashboardPage.css';

const RETENTION_DAYS = 14;
const SIDEBAR_WIDTH = 280;

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

function SimpleBars({ items, suffix = '' }) {
  if (!items.length) return <p className="admin-empty">No data yet.</p>;
  const max = Math.max(1, ...items.map((i) => Number(i.value || 0)));
  return (
    <div className="admin-bars">
      {items.map((item) => (
        <div key={item.label} className="admin-bar-row">
          <span className="admin-bar-label">{item.label}</span>
          <div className="admin-bar-track">
            <div className="admin-bar-fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <strong className="admin-bar-value">{item.value}{suffix}</strong>
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

  const [profiles, setProfiles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    current_level: 1,
    password: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [createAdminMessage, setCreateAdminMessage] = useState('');
  const [createAdminForm, setCreateAdminForm] = useState({
    email: '',
    password: '',
    first_name: '',
    username: '',
  });

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

        const [profilesRes, sessionsRes, metricsRes] = await Promise.all([
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
            .select('session_id, overall_score'),
        ]);

        if (profilesRes.error) throw profilesRes.error;
        if (sessionsRes.error) throw sessionsRes.error;
        if (metricsRes.error) throw metricsRes.error;

        if (!active) return;
        setRole(roleProfile.role);
        setProfiles(profilesRes.data || []);
        setSessions(sessionsRes.data || []);
        setMetrics(metricsRes.data || []);
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
          .select('id, action, entity_type, entity_id, actor_id, created_at')
          .order('created_at', { ascending: false })
          .limit(200);
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

  const metricBySession = useMemo(() => {
    const map = new Map();
    metrics.forEach((m) => map.set(m.session_id, Number(m.overall_score)));
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
    sessions.forEach((s) => { totals[modeOf(s)] += Number(s.duration || 0); });
    return Object.entries(totals).map(([label, value]) => ({ label, value: Math.round(value / 60) }));
  }, [sessions]);

  const grind = useMemo(() => {
    const totals = new Map();
    sessions.forEach((s) => totals.set(s.user_id, (totals.get(s.user_id) || 0) + Number(s.duration || 0)));
    return Array.from(totals.entries())
      .map(([id, sec]) => ({ label: getDisplayName(profileById.get(id), id), value: Math.round(sec / 60) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [sessions, profileById]);

  const risers = useMemo(() => {
    const byUser = new Map();
    sessions.forEach((s) => {
      const score = metricBySession.get(s.id);
      if (!Number.isFinite(score)) return;
      const list = byUser.get(s.user_id) || [];
      list.push({ created_at: s.created_at, score });
      byUser.set(s.user_id, list);
    });
    return Array.from(byUser.entries())
      .map(([id, list]) => {
        const sorted = [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        return { label: getDisplayName(profileById.get(id), id), value: Number((sorted[sorted.length - 1].score - sorted[0].score).toFixed(1)) };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [sessions, metricBySession, profileById]);

  const avgProgress = useMemo(() => {
    const buckets = new Map();
    sessions.forEach((s) => {
      const score = metricBySession.get(s.id);
      if (!Number.isFinite(score)) return;
      const d = new Date(s.created_at);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const cur = buckets.get(key) || { sum: 0, count: 0 };
      cur.sum += score;
      cur.count += 1;
      buckets.set(key, cur);
    });
    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, v]) => ({ label, value: Number((v.sum / v.count).toFixed(1)) }));
  }, [sessions, metricBySession]);

  const onLogout = async () => {
    await logout();
    navigate(ROUTES.HOME, { replace: true });
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      username: user.username || '',
      current_level: Number(user.current_level || 1),
      password: '',
    });
  };

  const saveUserEdit = async () => {
    if (!editingUser) return;
    setIsSavingEdit(true);
    setError('');
    const payload = {
      first_name: String(editForm.first_name || '').trim(),
      last_name: String(editForm.last_name || '').trim(),
      username: String(editForm.username || '').trim() || null,
      current_level: Math.max(1, Math.min(5, Number(editForm.current_level || 1))),
    };
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', editingUser.id)
      .select('*')
      .single();
    if (!updateError && String(editForm.password || '').trim().length >= 6) {
      // Requires service-role-backed client; fails gracefully if not configured.
      const { error: passwordError } = await supabase.auth.admin.updateUserById(editingUser.id, {
        password: String(editForm.password).trim(),
      });
      if (passwordError) {
        setError(`Profile updated, but password update failed: ${passwordError.message}`);
      }
    }

    setIsSavingEdit(false);
    if (updateError) {
      setError(updateError.message || 'Failed to update user profile.');
      return;
    }
    setProfiles((prev) => prev.map((p) => (p.id === editingUser.id ? { ...p, ...(data || payload) } : p)));
    setEditingUser(null);
  };

  const archiveUser = async (userId) => {
    const { error: archiveError } = await supabase
      .from('profiles')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', userId);
    if (archiveError) {
      setError(archiveError.message || 'Failed to archive user.');
      return;
    }
    setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, archived_at: new Date().toISOString() } : p)));
  };

  const submitCreateAdmin = async (e) => {
    e.preventDefault();
    if (!isSuperadmin) return;
    setCreatingAdmin(true);
    setCreateAdminMessage('');
    const email = String(createAdminForm.email || '').trim();
    const password = String(createAdminForm.password || '');
    const firstName = String(createAdminForm.first_name || '').trim();
    const username = String(createAdminForm.username || '').trim();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, username, role: 'admin' } },
    });

    if (signUpError || !data?.user?.id) {
      setCreatingAdmin(false);
      setCreateAdminMessage(signUpError?.message || 'Failed to create admin auth account.');
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'admin', first_name: firstName || null, username: username || null })
      .eq('id', data.user.id);

    setCreatingAdmin(false);
    if (profileError) {
      setCreateAdminMessage(`Auth created, but role update failed: ${profileError.message}`);
      return;
    }

    setCreateAdminMessage('Admin account created successfully.');
    setCreateAdminForm({ email: '', password: '', first_name: '', username: '' });
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
                            <stop offset="5%" stopColor="#5A755E" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#5A755E" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fill: '#5f6f5f', fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: '#5f6f5f', fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          formatter={(value) => [`${value} New Users`, 'Joined']} 
                        />
                        <Area type="monotone" dataKey="users" stroke="#5A755E" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
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
                        <XAxis dataKey="level" tick={{ fill: '#5f6f5f', fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: '#5f6f5f', fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{ fill: '#f4f7f4' }}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          formatter={(value) => [`${value}`, 'Users']} 
                        />
                        <Bar dataKey="users" fill="#5A755E" radius={[8, 8, 0, 0]} barSize={40} />
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
            <section className="admin-grid admin-grid-2">
              <article className="admin-card">
                <h3>Improvement Bar Graph</h3>
                <SimpleBars items={avgProgress} />
              </article>
              <article className="admin-card">
                <h3>Time Allocation (minutes)</h3>
                <SimpleBars items={timeAllocation} />
              </article>
            </section>
            <section className="admin-grid admin-grid-2">
              <article className="admin-card">
                <h3>The Grind</h3>
                <SimpleBars items={grind} suffix="m" />
              </article>
              <article className="admin-card">
                <h3>Fastest Risers</h3>
                <SimpleBars items={risers} />
              </article>
            </section>
          </>
        )}

        {activePage === 'users' && (
          <section className="admin-card">
            <h3>User Management</h3>
            {!visibleUsers.length ? (
              <p className="admin-empty">No active users found.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Level</th>
                      <th>Points</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map((u) => (
                      <tr key={u.id}>
                        <td>{getDisplayName(u, u.id)}</td>
                        <td>{u.username || '-'}</td>
                        <td>{u.current_level || 1}</td>
                        <td>{u.speaker_points || 0}</td>
                        <td>{u.archived_at ? 'Archived' : 'Active'}</td>
                        <td className="admin-actions">
                          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => openEditUser(u)}>Edit Profile</button>
                          <button type="button" className="admin-btn admin-btn--danger" onClick={() => archiveUser(u.id)}>Archive</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activePage === 'settings' && isSuperadmin && (
          <>
            <section className="admin-card">
              <h3>Create Admin Account</h3>
              <form className="admin-create-form" onSubmit={submitCreateAdmin}>
                <input
                  type="email"
                  required
                  placeholder="admin@email.com"
                  value={createAdminForm.email}
                  onChange={(e) => setCreateAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Temporary Password"
                  value={createAdminForm.password}
                  onChange={(e) => setCreateAdminForm((prev) => ({ ...prev, password: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="First Name"
                  value={createAdminForm.first_name}
                  onChange={(e) => setCreateAdminForm((prev) => ({ ...prev, first_name: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Username"
                  value={createAdminForm.username}
                  onChange={(e) => setCreateAdminForm((prev) => ({ ...prev, username: e.target.value }))}
                />
                <button type="submit" className="admin-btn admin-btn--primary" disabled={creatingAdmin}>
                  {creatingAdmin ? 'Creating...' : 'Create Admin'}
                </button>
              </form>
              {createAdminMessage && <p className="admin-note">{createAdminMessage}</p>}
            </section>

          </>
        )}

        {activePage === 'audit' && isSuperadmin && (
          <section className="admin-card">
            <h3>Audit Logs</h3>
            {!auditLogs.length ? (
              <p className="admin-empty">No audit logs found.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Created</th><th>Actor</th><th>Action</th><th>Entity</th><th>Entity ID</th></tr></thead>
                  <tbody>
                    {auditLogs.slice(0, 80).map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td>{String(log.actor_id || '').slice(0, 8)}</td>
                        <td>{log.action}</td>
                        <td>{log.entity_type}</td>
                        <td>{String(log.entity_id || '').slice(0, 8)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </section>

      {editingUser && (
        <div className="admin-modal-backdrop" role="presentation" onClick={() => setEditingUser(null)}>
          <div className="admin-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Profile</h3>
            <label htmlFor="admin-edit-first-name">First Name</label>
            <input
              id="admin-edit-first-name"
              type="text"
              value={editForm.first_name}
              onChange={(e) => setEditForm((prev) => ({ ...prev, first_name: e.target.value }))}
            />
            <label htmlFor="admin-edit-username">Username</label>
            <input
              id="admin-edit-username"
              type="text"
              value={editForm.username}
              onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
            />
            <label htmlFor="admin-edit-last-name">Last Name</label>
            <input
              id="admin-edit-last-name"
              type="text"
              value={editForm.last_name}
              onChange={(e) => setEditForm((prev) => ({ ...prev, last_name: e.target.value }))}
            />
            <label htmlFor="admin-edit-level">Level</label>
            <select
              id="admin-edit-level"
              value={editForm.current_level}
              onChange={(e) => setEditForm((prev) => ({ ...prev, current_level: Number(e.target.value) }))}
            >
              {[1, 2, 3, 4, 5].map((lv) => <option key={lv} value={lv}>Level {lv}</option>)}
            </select>
            <label htmlFor="admin-edit-password">Password</label>
            <input
              id="admin-edit-password"
              type="password"
              minLength={6}
              placeholder="Leave blank to keep current"
              value={editForm.password}
              onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setEditingUser(null)}>Cancel</button>
              <button type="button" className="admin-btn admin-btn--primary" disabled={isSavingEdit} onClick={saveUserEdit}>
                {isSavingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboardPage;

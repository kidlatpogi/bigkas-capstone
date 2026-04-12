﻿﻿﻿import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoBarChart,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoPeople,
  IoPulse,
  IoSearch,
  IoServer,
  IoStatsChart,
  IoTime,
} from 'react-icons/io5';
import { adminApi } from '@session/api/adminApi';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import { formatDate, formatDuration } from '../../utils/formatters';
import './AdminDashboardPage.css';

const PERIOD_OPTIONS = ['week', 'month', 'year'];
const SORT_OPTIONS = [
  { value: 'created_at', label: 'Newest' },
  { value: 'name', label: 'Name' },
  { value: 'session_count', label: 'Sessions' },
  { value: 'total_duration_sec', label: 'Time' },
  { value: 'average_score', label: 'Average Score' },
  { value: 'improvement_score', label: 'Improvement' },
  { value: 'last_sign_in_at', label: 'Last Sign In' },
];
const ADMIN_VIEWS = [
  { key: 'overview', label: 'Overview' },
  { key: 'insights', label: 'Insights' },
  { key: 'technical', label: 'Technical Health' },
  { key: 'leaderboards', label: 'Leaderboards' },
  { key: 'users', label: 'User Management' },
];

function formatPeriodLabel(period) {
  if (period === 'week') return 'this week';
  if (period === 'year') return 'this year';
  return 'this month';
}

function deltaTone(delta) {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

function deltaText(delta) {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '0';
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0%';
  return `${numeric.toFixed(2)}%`;
}

function formatMb(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0 MB';
  return `${numeric.toFixed(2)} MB`;
}

function serviceStatusLabel(isOnline) {
  return isOnline ? 'Online' : 'Offline';
}

function resolveProviderOnline(primaryValue, fallbackValue = false) {
  if (typeof primaryValue === 'boolean') return primaryValue;
  return Boolean(fallbackValue);
}

function providerHint(provider) {
  const mode = provider?.mode;
  if (mode === 'api_key') return 'API key configured';
  if (mode === 'recent_activity') return 'Recent successful activity detected';
  if (mode === 'missing_key') return 'API key missing';
  return 'Awaiting backend provider data';
}

function DashboardSkeleton({ variant = 'overview' }) {
  return (
    <div className="admin-skeleton-shell" aria-hidden="true">
      <section className="admin-summary-grid admin-summary-grid--skeleton">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={`summary-skeleton-${index}`} className="admin-stat-card admin-skeleton-card">
            <div className="admin-skeleton admin-skeleton--icon" />
            <div className="admin-skeleton admin-skeleton--text admin-skeleton--short" />
            <div className="admin-skeleton admin-skeleton--text admin-skeleton--headline" />
            <div className="admin-skeleton admin-skeleton--text admin-skeleton--medium" />
          </article>
        ))}
      </section>

      <section className={`admin-content-grid ${variant === 'technical' ? 'admin-content-grid--technical' : 'admin-content-grid--charts'}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={`panel-skeleton-${variant}-${index}`} className="admin-panel-card admin-skeleton-card">
            <div className="admin-panel-header">
              <div className="admin-skeleton-stack">
                <div className="admin-skeleton admin-skeleton--text admin-skeleton--short" />
                <div className="admin-skeleton admin-skeleton--text admin-skeleton--medium" />
              </div>
            </div>
            <div className="admin-skeleton admin-skeleton--panel" />
            <div className="admin-skeleton admin-skeleton--text admin-skeleton--medium" />
          </article>
        ))}
      </section>
    </div>
  );
}

function MiniSparkline({ values = [] }) {
  const safeValues = Array.isArray(values) ? values : [];
  if (!safeValues.length) {
    return <div className="admin-sparkline admin-sparkline--empty">No data</div>;
  }

  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const spread = Math.max(1, max - min);
  const points = safeValues.map((value, index) => {
    const x = (index / Math.max(1, safeValues.length - 1)) * 100;
    const y = 32 - (((value - min) / spread) * 24 + 4);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 32" className="admin-sparkline" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

function TrendBarChart({ points = [], metricKey, tone = 'gold', formatter = (value) => Math.round(value) }) {
  if (!points.length) {
    return <div className="admin-chart-empty">No chart data available yet.</div>;
  }

  const values = points.map((point) => Number(point?.[metricKey] || 0));
  const max = Math.max(1, ...values);
  const width = 100;
  const height = 84;
  const chartTop = 8;
  const chartBottom = 66;
  const chartLeft = 8;
  const chartRight = 98;
  const plotWidth = chartRight - chartLeft;
  const barSpace = plotWidth / Math.max(1, points.length);
  const barWidth = Math.max(6, barSpace * 0.56);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = Math.round(max * ratio);
    const y = chartBottom - ((chartBottom - chartTop) * ratio);
    return { value, y };
  });

  const bars = points.map((point, index) => {
    const value = Number(point?.[metricKey] || 0);
    const heightRatio = Math.max(0, Math.min(1, value / max));
    const barHeight = heightRatio * (chartBottom - chartTop);
    const x = chartLeft + barSpace * index + ((barSpace - barWidth) / 2);
    const y = chartBottom - barHeight;
    return { x, y, barHeight, value, label: point?.label || '' };
  });

  return (
    <div className={`admin-trend-chart admin-trend-chart--${tone}`}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="admin-chart-svg" role="img" aria-label="Chart">
        {yTicks.map((tick, index) => (
          <g key={`tick-${index}-${tick.value}`}>
            <line x1={chartLeft} y1={tick.y} x2={chartRight} y2={tick.y} className="admin-chart-grid" />
            <text x="0" y={tick.y + 1.5} className="admin-chart-y-label">{tick.value}</text>
          </g>
        ))}

        {bars.map((bar, index) => (
          <g key={`bar-${index}-${bar.label}`}>
            <rect x={bar.x} y={bar.y} width={barWidth} height={Math.max(2, bar.barHeight)} rx="1.6" className="admin-chart-bar" />
            <text x={bar.x + (barWidth / 2)} y={Math.max(chartTop, bar.y - 1.5)} textAnchor="middle" className="admin-chart-bar-label">
              {formatter(bar.value)}
            </text>
          </g>
        ))}
      </svg>
      <div className="admin-chart-labels">
        {points.map((point, index) => (
          <span key={`${index}-${point.label}`}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ items = [], centerLabel = 'Total' }) {
  const safeItems = items.filter((item) => Number(item?.value || 0) > 0);
  const total = safeItems.reduce((sum, item) => sum + Number(item.value || 0), 0);

  if (!total) {
    return <div className="admin-chart-empty">No composition data available yet.</div>;
  }

  const cumulativeTotals = safeItems.reduce((acc, item) => {
    const last = acc.length ? acc[acc.length - 1] : 0;
    return [...acc, last + Number(item.value || 0)];
  }, []);

  const slices = safeItems.map((item, index) => {
    const startValue = index === 0 ? 0 : cumulativeTotals[index - 1];
    const endValue = cumulativeTotals[index];
    const start = (startValue / total) * 360;
    const end = (endValue / total) * 360;
    return `${item.color || '#010101'} ${start}deg ${end}deg`;
  });

  return (
    <div className="admin-donut-wrap">
      <div className="admin-donut" style={{ background: `conic-gradient(${slices.join(', ')})` }}>
        <div className="admin-donut-center">
          <strong>{total}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>

      <div className="admin-donut-legend">
        {safeItems.map((item) => (
          <div key={item.label} className="admin-donut-legend-item">
            <span className="admin-donut-swatch" style={{ backgroundColor: item.color || '#010101' }} aria-hidden="true" />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardList({ items = [], metricKey, formatter }) {
  if (!items.length) {
    return <div className="admin-empty-state">No leaderboard data yet.</div>;
  }

  return (
    <div className="admin-leaderboard-list">
      {items.map((item, index) => (
        <div key={`${item.id}-${metricKey}`} className="admin-leaderboard-item">
          <span className="admin-leaderboard-rank">{String(index + 1).padStart(2, '0')}</span>
          <div className="admin-leaderboard-copy">
            <strong>{item.name}</strong>
            <span>{item.email}</span>
          </div>
          <strong className="admin-leaderboard-metric">{formatter(item[metricKey])}</strong>
        </div>
      ))}
    </div>
  );
}

function UserEditorModal({
  user,
  formState,
  saving,
  onClose,
  onChange,
  onSubmit,
  onToggleActive,
  onDeleteUser,
}) {
  if (!user) return null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="admin-modal-header">
          <div>
            <p className="admin-section-kicker">User Control</p>
            <h3>Edit {user.name}</h3>
          </div>
          <button type="button" className="admin-icon-btn" onClick={onClose} aria-label="Close editor">
            <IoCloseCircle size={22} />
          </button>
        </div>

        <form className="admin-modal-form" onSubmit={onSubmit}>
          <label className="admin-form-field">
            <span>Name</span>
            <input
              type="text"
              value={formState.fullName}
              onChange={(event) => onChange('fullName', event.target.value)}
              placeholder="Full name"
            />
          </label>

          <label className="admin-form-field">
            <span>Email</span>
            <input type="email" value={user.email} disabled readOnly />
          </label>

          <label className="admin-form-field">
            <span>New Password</span>
            <input
              type="password"
              value={formState.password}
              onChange={(event) => onChange('password', event.target.value)}
              placeholder="Leave blank to keep current password"
            />
          </label>

          <div className="admin-modal-actions">
            <button type="button" className="admin-danger-btn" onClick={onDeleteUser} disabled={saving}>
              Delete Account
            </button>
            <button type="button" className="admin-secondary-btn" onClick={onToggleActive} disabled={saving}>
              {user.is_active ? 'Deactivate User' : 'Re-activate User'}
            </button>
            <button type="submit" className="admin-primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminDashboardPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuthContext();
  const [activeView, setActiveView] = useState('overview');
  const [period, setPeriod] = useState('month');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [dashboard, setDashboard] = useState(null);
  const [technicalHealth, setTechnicalHealth] = useState(null);
  const [isTechnicalLoading, setIsTechnicalLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [formState, setFormState] = useState({ fullName: '', password: '' });

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setIsLoading(true);
      setError('');

      try {
        const nextDashboard = await adminApi.getDashboard({
          period,
          search,
          sortBy,
          sortDir,
          page,
          perPage: 10,
        });

        if (!cancelled) {
          setDashboard(nextDashboard);
          if (nextDashboard?.technical_health) {
            setTechnicalHealth(nextDashboard.technical_health);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Unable to load admin dashboard.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [page, period, refreshIndex, search, sortBy, sortDir]);

  useEffect(() => {
    let cancelled = false;
    async function loadTechnicalHealth() {
      if (activeView !== 'technical') return;
      if (technicalHealth) return;

      setIsTechnicalLoading(true);
      try {
        const payload = await adminApi.getTechnicalHealth();
        if (!cancelled) {
          setTechnicalHealth(payload);
        }
      } catch (technicalError) {
        if (!cancelled) {
          setError(technicalError.message || 'Unable to load technical health metrics.');
        }
      } finally {
        if (!cancelled) {
          setIsTechnicalLoading(false);
        }
      }
    }

    loadTechnicalHealth();
    return () => {
      cancelled = true;
    };
  }, [activeView, technicalHealth]);

  const summary = dashboard?.summary;
  const backend = dashboard?.backend;
  const users = dashboard?.users?.items || [];
  const pagination = dashboard?.users?.pagination;
  const leaderboards = dashboard?.leaderboards;
  const aiProviders = backend?.ai_providers || {};
  const analysisEngines = backend?.analysis_engines || {};
  const growthPoints = dashboard?.user_growth?.points || [];
  const activeUsers = summary?.active_users ?? 0;
  const totalUsers = summary?.user_count ?? 0;
  const inactiveUsers = Math.max(0, totalUsers - activeUsers);
  const userComposition = [
    { label: 'Active', value: activeUsers, color: '#FCBA04' },
    { label: 'Inactive', value: inactiveUsers, color: '#010101' },
  ];

  const selectedUserTrend = useMemo(() => selectedUser?.recent_scores || [], [selectedUser]);
  const effectiveTechnicalHealth = useMemo(
    () => technicalHealth || dashboard?.technical_health || null,
    [dashboard?.technical_health, technicalHealth],
  );

  const technicalCards = useMemo(() => {
    const analysisHealth = effectiveTechnicalHealth?.analysis_health || {};
    const aiFailover = analysisHealth?.ai_provider_failover || {};
    const providerActivity = analysisHealth?.provider_activity || {};
    const security = effectiveTechnicalHealth?.security || {};
    const sync = effectiveTechnicalHealth?.cross_platform_sync || {};
    const storage = effectiveTechnicalHealth?.storage || {};

    return [
      {
        label: 'Low Confidence Rate',
        value: formatPercent(analysisHealth?.low_confidence_rate_pct),
        helper: `${analysisHealth?.low_confidence_count || 0} flagged sessions`,
      },
      {
        label: 'Average SNR',
        value: analysisHealth?.average_snr_db == null ? 'N/A' : `${analysisHealth.average_snr_db.toFixed(2)} dB`,
        helper: 'Signal quality across sessions',
      },
      {
        label: 'AI Failover Rate',
        value: formatPercent(aiFailover?.failover_rate_pct),
        helper: `${aiFailover?.failover_used_count || 0}/${aiFailover?.total_events || 0} fallback events`,
      },
      {
        label: 'Provider 429 Alerts',
        value: String(providerActivity?.total_rate_limited_count_30d || 0),
        helper: 'Last 30 days quota or rate-limit signals',
      },
      {
        label: 'Users in Lockout',
        value: String(security?.users_in_lockout_count || 0),
        helper: 'Exponential backoff active now',
      },
      {
        label: 'Recordings Storage',
        value: formatMb(storage?.total_mb),
        helper: `${formatMb(storage?.wav_mb)} wav | ${formatMb(storage?.webm_mb)} webm`,
      },
      {
        label: 'Web â†’ Mobile Sync',
        value: formatPercent(sync?.web_sync_success_pct),
        helper: `${sync?.web_synced_to_mobile_count || 0} synced web sessions`,
      },
    ];
  }, [effectiveTechnicalHealth]);

  const lockoutUsers = useMemo(
    () => effectiveTechnicalHealth?.security?.users_in_lockout || [],
    [effectiveTechnicalHealth],
  );
  const frequentCooldownUsers = useMemo(
    () => effectiveTechnicalHealth?.security?.frequent_script_cooldown_users || [],
    [effectiveTechnicalHealth],
  );
  const syncBreakdown = useMemo(
    () => effectiveTechnicalHealth?.cross_platform_sync?.source_breakdown || {},
    [effectiveTechnicalHealth],
  );
  const providerQuotaSignals = useMemo(
    () => effectiveTechnicalHealth?.analysis_health?.provider_activity || { providers: [], note: '', window_days: 30 },
    [effectiveTechnicalHealth],
  );
  const hasActiveSearch = Boolean(search.trim());
  const providerStatusRows = [
    {
      key: 'gemini',
      label: aiProviders?.gemini?.label || 'Gemini',
      online: resolveProviderOnline(aiProviders?.gemini?.online, backend?.ai_ready),
      hint: aiProviders?.gemini ? providerHint(aiProviders.gemini) : (backend?.ai_ready ? 'Status inferred from backend routing' : 'API key missing'),
    },
    {
      key: 'groq',
      label: aiProviders?.groq?.label || 'Groq',
      online: resolveProviderOnline(aiProviders?.groq?.online, backend?.ai_ready),
      hint: aiProviders?.groq ? providerHint(aiProviders.groq) : (backend?.ai_ready ? 'Status inferred from backend routing' : 'API key missing'),
    },
    {
      key: 'cohere',
      label: aiProviders?.cohere?.label || 'Cohere',
      online: resolveProviderOnline(aiProviders?.cohere?.online, false),
      hint: aiProviders?.cohere ? providerHint(aiProviders.cohere) : 'Awaiting backend provider data',
    },
  ];

  const analysisStatusRows = [
    {
      key: 'mediapipe',
      label: analysisEngines?.mediapipe?.label || 'MediaPipe',
      online: Boolean(analysisEngines?.mediapipe?.online),
    },
    {
      key: 'librosa',
      label: analysisEngines?.librosa?.label || 'Librosa',
      online: Boolean(analysisEngines?.librosa?.online),
    },
  ];

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleSearchClear = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const handleOpenEditor = (nextUser) => {
    setSelectedUser(nextUser);
    setFormState({ fullName: nextUser.name || '', password: '' });
    setSuccessMessage('');
  };

  const handleCloseEditor = () => {
    setSelectedUser(null);
    setFormState({ fullName: '', password: '' });
  };

  const applyUpdatedUser = (updatedUser) => {
    setDashboard((prev) => {
      if (!prev) return prev;
      const nextItems = prev.users.items.map((item) => (item.id === updatedUser.id ? updatedUser : item));
      return {
        ...prev,
        users: {
          ...prev.users,
          items: nextItems,
        },
        leaderboards: prev.leaderboards
          ? {
            ...prev.leaderboards,
            top_time: prev.leaderboards.top_time.map((item) => (item.id === updatedUser.id ? updatedUser : item)),
            top_sessions: prev.leaderboards.top_sessions.map((item) => (item.id === updatedUser.id ? updatedUser : item)),
            top_improvers: prev.leaderboards.top_improvers.map((item) => (item.id === updatedUser.id ? updatedUser : item)),
          }
          : prev.leaderboards,
      };
    });
    setSelectedUser(updatedUser);
  };

  const handleSaveUser = async (event) => {
    event.preventDefault();
    if (!selectedUser) return;

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload = {
        full_name: formState.fullName.trim(),
      };

      if (formState.password.trim()) {
        payload.password = formState.password.trim();
      }

      const updatedUser = await adminApi.updateUser(selectedUser.id, payload);
      applyUpdatedUser(updatedUser);
      setFormState((prev) => ({ ...prev, password: '' }));
      setSuccessMessage('User updated successfully.');
      setRefreshIndex((prev) => prev + 1);
    } catch (saveError) {
      setError(saveError.message || 'Unable to update user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const updatedUser = await adminApi.updateUser(selectedUser.id, {
        is_active: !selectedUser.is_active,
      });
      applyUpdatedUser(updatedUser);
      setSuccessMessage(updatedUser.is_active ? 'User re-activated.' : 'User deactivated.');
      setRefreshIndex((prev) => prev + 1);
    } catch (saveError) {
      setError(saveError.message || 'Unable to update user status.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    const confirmDelete = window.confirm(
      `Delete account for ${selectedUser.email}? This cannot be undone and will remove this user from auth.`
    );
    if (!confirmDelete) return;

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      await adminApi.deleteUser(selectedUser.id);

      setDashboard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          users: {
            ...prev.users,
            items: prev.users.items.filter((item) => item.id !== selectedUser.id),
          },
          leaderboards: prev.leaderboards
            ? {
              ...prev.leaderboards,
              top_time: prev.leaderboards.top_time.filter((item) => item.id !== selectedUser.id),
              top_sessions: prev.leaderboards.top_sessions.filter((item) => item.id !== selectedUser.id),
              top_improvers: prev.leaderboards.top_improvers.filter((item) => item.id !== selectedUser.id),
            }
            : prev.leaderboards,
        };
      });

      setSelectedUser(null);
      setFormState({ fullName: '', password: '' });
      setSuccessMessage('User account deleted successfully.');
      setRefreshIndex((prev) => prev + 1);
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete user account.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.HOME, { replace: true });
  };

  return (
    <div className="admin-dashboard-page">
      <header className="admin-shell-header">
        <div className="admin-shell-brand">
          <div>
            <p className="admin-section-kicker">Bigkas Admin Console</p>
            <h1>System Oversight Dashboard</h1>
          </div>
        </div>

        <div className="admin-shell-actions">
          <button type="button" className="admin-primary-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>

      <nav className="admin-view-nav" aria-label="Admin sections">
        {ADMIN_VIEWS.map((view) => (
          <button
            key={view.key}
            type="button"
            className={activeView === view.key ? 'is-active' : ''}
            onClick={() => {
              setActiveView(view.key);
              if (view.key !== 'users') {
                setSelectedUser(null);
              }
            }}
          >
            {view.label}
          </button>
        ))}
      </nav>

      <section className="admin-hero-panel">
        <div>
          <p className="admin-section-kicker">Operator</p>
          <h2>{user?.name || user?.email || 'Admin'}</h2>
          <p>
            Monitor user health, growth, activity, and intervention points across the platform.
          </p>
        </div>

        <div className="admin-period-switcher" role="tablist" aria-label="Select summary period">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={option === period ? 'is-active' : ''}
              onClick={() => {
                setPeriod(option);
                setPage(1);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="admin-banner admin-banner--error">{error}</div>}
      {successMessage && <div className="admin-banner admin-banner--success">{successMessage}</div>}

      {isLoading && !dashboard && (
        <DashboardSkeleton variant={activeView === 'technical' ? 'technical' : 'overview'} />
      )}

      {dashboard && activeView === 'overview' && (
        <>
          <div className="admin-section-heading">
            <p className="admin-section-kicker">Section 1</p>
            <h2>Platform Snapshot</h2>
          </div>

          <section className="admin-summary-grid">
        <article className="admin-stat-card">
          <span className="admin-stat-icon"><IoPeople size={18} /></span>
          <p>Total Users</p>
          <strong>{summary?.user_count ?? 0}</strong>
          <em className={`delta-${deltaTone(summary?.user_delta ?? 0)}`}>
            {deltaText(summary?.user_delta ?? 0)} {formatPeriodLabel(period)}
          </em>
        </article>

        <article className="admin-stat-card">
          <span className="admin-stat-icon"><IoStatsChart size={18} /></span>
          <p>Completed Sessions</p>
          <strong>{summary?.completed_sessions ?? 0}</strong>
          <em>Across all recorded practice runs</em>
        </article>

        <article className="admin-stat-card">
          <span className="admin-stat-icon"><IoPulse size={18} /></span>
          <p>Average Score</p>
          <strong>{Math.round(summary?.average_score ?? 0)}</strong>
          <em>Overall speaking confidence baseline</em>
        </article>

        <article className="admin-stat-card">
          <span className="admin-stat-icon"><IoCheckmarkCircle size={18} /></span>
          <p>Active Accounts</p>
          <strong>{summary?.active_users ?? 0}</strong>
          <em>Users currently allowed to log in</em>
        </article>
          </section>
        </>
      )}

      {dashboard && activeView === 'insights' && (
        <>
          <div className="admin-section-heading">
            <p className="admin-section-kicker">Section 2</p>
            <h2>Trends and Service Health</h2>
          </div>

          <section className="admin-content-grid admin-content-grid--charts">
        <article className="admin-panel-card">
          <div className="admin-panel-header">
            <div>
              <p className="admin-section-kicker">Performance Pulse</p>
              <h3>User Composition</h3>
            </div>
            <IoBarChart size={20} />
          </div>
          <DonutChart items={userComposition} centerLabel="Users" />
        </article>

        <article className="admin-panel-card">
          <div className="admin-panel-header">
            <div>
              <p className="admin-section-kicker">Growth Signal</p>
              <h3>User Growth</h3>
            </div>
            <IoPeople size={20} />
          </div>
          <TrendBarChart
            points={growthPoints}
            metricKey="count"
            tone="black"
            formatter={(value) => `${Math.round(value)}`}
          />
          <div className="admin-panel-subnote">Users created per selected period bucket</div>
        </article>

        <article className="admin-panel-card admin-panel-card--backend">
          <div className="admin-panel-header">
            <div>
              <p className="admin-section-kicker">Backend Health</p>
              <h3>Service Readiness</h3>
            </div>
            <IoServer size={20} />
          </div>
          <div className="admin-health-list">
            <div className="admin-health-item">
              <span>Status</span>
              <strong className="admin-health-pill admin-health-pill--ok">{backend?.status || 'unknown'}</strong>
            </div>
            <div className="admin-health-item">
              <span>Auth Backoff</span>
              <strong className={backend?.auth_backoff_ready ? 'admin-health-value is-ok' : 'admin-health-value is-warn'}>
                {backend?.auth_backoff_ready ? 'Ready' : 'Missing config'}
              </strong>
            </div>
            <div className="admin-health-item">
              <span>LLM Routing</span>
              <strong className={backend?.ai_ready ? 'admin-health-value is-ok' : 'admin-health-value is-warn'}>
                {backend?.ai_ready ? 'Provider Online' : 'Template Fallback Mode'}
              </strong>
            </div>
            <div className="admin-health-item">
              <span>Admin Allowlist</span>
              <strong className={backend?.admin_ready ? 'admin-health-value is-ok' : 'admin-health-value is-warn'}>
                {backend?.admin_ready ? 'Enabled' : 'Disabled'}
              </strong>
            </div>
          </div>

          <div className="admin-health-groups">
            <div className="admin-health-group">
              <p className="admin-health-group-title">LLM Providers</p>
              <div className="admin-service-status-list">
                {providerStatusRows.map((item) => (
                  <div key={item.key} className="admin-service-status-item">
                    <div className="admin-service-status-copy">
                      <strong>{item.label}</strong>
                      <span>{item.hint}</span>
                    </div>
                    <span className={item.online ? 'admin-health-pill admin-health-pill--ok' : 'admin-health-pill admin-health-pill--warn'}>
                      {serviceStatusLabel(item.online)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-health-group">
              <p className="admin-health-group-title">Analysis Engines</p>
              <div className="admin-service-status-list">
                {analysisStatusRows.map((item) => (
                  <div key={item.key} className="admin-service-status-item">
                    <div className="admin-service-status-copy">
                      <strong>{item.label}</strong>
                      <span>Runtime package availability</span>
                    </div>
                    <span className={item.online ? 'admin-health-pill admin-health-pill--ok' : 'admin-health-pill admin-health-pill--warn'}>
                      {serviceStatusLabel(item.online)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
          </section>
        </>
      )}

      {dashboard && activeView === 'technical' && (
        <>
          <div className="admin-section-heading">
            <p className="admin-section-kicker">Section 5</p>
            <h2>Technical and System Health</h2>
          </div>

          {isTechnicalLoading ? (
            <DashboardSkeleton variant="technical" />
          ) : (
            <>
              <section className="admin-summary-grid">
                {technicalCards.map((card) => (
                  <article key={card.label} className="admin-stat-card">
                    <p>{card.label}</p>
                    <strong>{card.value}</strong>
                    <em>{card.helper}</em>
                  </article>
                ))}
              </section>

              <section className="admin-content-grid admin-content-grid--technical">
                <article className="admin-panel-card">
                  <div className="admin-panel-header">
                    <div>
                      <p className="admin-section-kicker">Security</p>
                      <h3>Users in Exponential Backoff</h3>
                    </div>
                  </div>
                  {lockoutUsers.length ? (
                    <div className="admin-list-compact">
                      {lockoutUsers.map((item) => (
                        <div key={item.id} className="admin-list-item">
                          <span>{item.email}</span>
                          <strong>{item.failed_login_attempts || 0} attempts</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="admin-empty-state">No users currently in lockout.</div>
                  )}
                </article>

                <article className="admin-panel-card">
                  <div className="admin-panel-header">
                    <div>
                      <p className="admin-section-kicker">Rate Limiting</p>
                      <h3>Frequent Script Cooldown Hits</h3>
                    </div>
                  </div>
                  {frequentCooldownUsers.length ? (
                    <div className="admin-list-compact">
                      {frequentCooldownUsers.map((item) => (
                        <div key={item.id} className="admin-list-item">
                          <span>{item.email}</span>
                          <strong>{item.script_cooldown_hits || 0} hits</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="admin-empty-state">No cooldown-heavy users detected.</div>
                  )}
                </article>

                <article className="admin-panel-card">
                  <div className="admin-panel-header">
                    <div>
                      <p className="admin-section-kicker">Cross-Platform Sync</p>
                      <h3>Session Source Breakdown</h3>
                    </div>
                  </div>
                  <div className="admin-health-list">
                    <div className="admin-health-item">
                      <span>Web Sessions</span>
                      <strong>{syncBreakdown.web || 0}</strong>
                    </div>
                    <div className="admin-health-item">
                      <span>Mobile Sessions</span>
                      <strong>{syncBreakdown.mobile || 0}</strong>
                    </div>
                    <div className="admin-health-item">
                      <span>Unknown Source</span>
                      <strong>{syncBreakdown.unknown || 0}</strong>
                    </div>
                    <div className="admin-health-item">
                      <span>Web Sync Success</span>
                      <strong>{formatPercent(effectiveTechnicalHealth?.cross_platform_sync?.web_sync_success_pct)}</strong>
                    </div>
                  </div>
                </article>

                <article className="admin-panel-card">
                  <div className="admin-panel-header">
                    <div>
                      <p className="admin-section-kicker">Provider Signals</p>
                      <h3>API Usage and Quota Alerts</h3>
                    </div>
                  </div>
                  <div className="admin-service-status-list">
                    {providerQuotaSignals.providers?.map((item) => (
                      <div key={`quota-${item.provider}`} className="admin-service-status-item">
                        <div className="admin-service-status-copy">
                          <strong>{item.label}</strong>
                          <span>
                            {item.request_count_30d || 0} requests in {providerQuotaSignals.window_days || 30}d, {item.rate_limited_count_30d || 0} rate-limited
                            {item.last_rate_limited_at ? `, last 429 ${formatDate(item.last_rate_limited_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}
                          </span>
                        </div>
                        <span className={item.quota_signal === 'rate_limited' ? 'admin-health-pill admin-health-pill--warn' : 'admin-health-pill admin-health-pill--ok'}>
                          {item.quota_signal === 'rate_limited' ? '429 Alert' : item.quota_signal === 'healthy' ? 'Healthy' : 'No Data'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="admin-panel-subnote">{providerQuotaSignals.note}</div>
                </article>
              </section>
            </>
          )}
        </>
      )}

      {dashboard && activeView === 'leaderboards' && (
        <>
          <div className="admin-section-heading">
            <p className="admin-section-kicker">Section 3</p>
            <h2>Top Performers</h2>
          </div>

          <section className="admin-content-grid admin-content-grid--leaderboards">
        <article className="admin-panel-card">
          <div className="admin-panel-header">
            <div>
              <p className="admin-section-kicker">Leaderboard</p>
              <h3>Most Time Recorded</h3>
            </div>
            <IoTime size={20} />
          </div>
          <LeaderboardList items={leaderboards?.top_time} metricKey="total_duration_sec" formatter={(value) => formatDuration(value || 0)} />
        </article>

        <article className="admin-panel-card">
          <div className="admin-panel-header">
            <div>
              <p className="admin-section-kicker">Leaderboard</p>
              <h3>Most Sessions Recorded</h3>
            </div>
            <IoStatsChart size={20} />
          </div>
          <LeaderboardList items={leaderboards?.top_sessions} metricKey="session_count" formatter={(value) => `${value || 0} sessions`} />
        </article>

        <article className="admin-panel-card">
          <div className="admin-panel-header">
            <div>
              <p className="admin-section-kicker">Leaderboard</p>
              <h3>Best Improvement</h3>
            </div>
            <IoPulse size={20} />
          </div>
          <LeaderboardList items={leaderboards?.top_improvers} metricKey="improvement_score" formatter={(value) => `${value > 0 ? '+' : ''}${value || 0}`} />
        </article>
          </section>
        </>
      )}

      {dashboard && activeView === 'users' && (
        <>
          <div className="admin-section-heading">
            <p className="admin-section-kicker">Section 4</p>
            <h2>User Management</h2>
          </div>

          <section className="admin-panel-card admin-panel-card--users">
        <div className="admin-panel-header admin-panel-header--users">
          <div>
            <p className="admin-section-kicker">User Control</p>
            <h3>User Directory</h3>
          </div>

          <div className="admin-toolbar">
            <form className="admin-search-form" onSubmit={handleSearchSubmit}>
              <label className="admin-search-field">
                <IoSearch size={16} />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by name or email"
                />
              </label>
              <button type="submit" className="admin-secondary-btn">
                Search
              </button>
              {hasActiveSearch && (
                <button type="button" className="admin-ghost-btn" onClick={handleSearchClear}>
                  Clear
                </button>
              )}
            </form>

            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <button type="button" className="admin-ghost-btn" onClick={() => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}>
              {sortDir === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="admin-empty-state admin-loading-state">Loading Data...</div>
        ) : users.length ? (
          <>
            <div className="admin-user-table-wrap">
              <table className="admin-user-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Sessions</th>
                    <th>Recorded Time</th>
                    <th>Average</th>
                    <th>Improvement</th>
                    <th>Trend</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="admin-user-copy">
                          <strong>{item.name}</strong>
                          <span>{item.email}</span>
                          <small>Joined {item.created_at ? formatDate(item.created_at, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-status-pill ${item.is_active ? 'is-active' : 'is-inactive'}`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{item.session_count}</td>
                      <td>{formatDuration(item.total_duration_sec || 0)}</td>
                      <td>{Math.round(item.average_score || 0)}</td>
                      <td className={item.improvement_score >= 0 ? 'admin-metric-up' : 'admin-metric-down'}>
                        {item.improvement_score >= 0 ? '+' : ''}{item.improvement_score}
                      </td>
                      <td><MiniSparkline values={item.recent_scores} /></td>
                      <td>
                        <button type="button" className="admin-secondary-btn admin-secondary-btn--small" onClick={() => handleOpenEditor(item)}>
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <span>
                Page {pagination?.page || 1} of {pagination?.total_pages || 1}
              </span>
              <div>
                <button type="button" className="admin-ghost-btn" disabled={(pagination?.page || 1) <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  Previous
                </button>
                <button
                  type="button"
                  className="admin-primary-btn"
                  disabled={(pagination?.page || 1) >= (pagination?.total_pages || 1)}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="admin-empty-state">
            {hasActiveSearch ? 'No users matched your search.' : 'No users available yet.'}
          </div>
        )}
          </section>
        </>
      )}

      {activeView === 'users' && selectedUser && (
        <section className="admin-panel-card admin-panel-card--focus">
          <div className="admin-panel-header">
            <div>
              <p className="admin-section-kicker">Focused View</p>
              <h3>{selectedUser.name} Performance Trend</h3>
            </div>
            <button type="button" className="admin-ghost-btn" onClick={handleCloseEditor}>Clear Selection</button>
          </div>
          <TrendBarChart
            points={selectedUserTrend.map((value, index) => ({ label: `S${index + 1}`, value }))}
            metricKey="value"
            tone="gold"
            formatter={(value) => `${Math.round(value)}`}
          />
          <div className="admin-focus-meta">
            <span>Last sign in: {selectedUser.last_sign_in_at ? formatDate(selectedUser.last_sign_in_at) : 'No recent sign in'}</span>
            <span>Email confirmed: {selectedUser.email_confirmed ? 'Yes' : 'No'}</span>
            <span>Locked attempts: {selectedUser.failed_login_attempts || 0}</span>
          </div>
        </section>
      )}

      <UserEditorModal
        user={selectedUser}
        formState={formState}
        saving={isSaving}
        onClose={handleCloseEditor}
        onChange={(field, value) => setFormState((prev) => ({ ...prev, [field]: value }))}
        onSubmit={handleSaveUser}
        onToggleActive={handleToggleActive}
        onDeleteUser={handleDeleteUser}
      />
    </div>
  );
}

export default AdminDashboardPage;

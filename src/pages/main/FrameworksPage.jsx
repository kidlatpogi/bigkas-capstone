import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoChevronDown } from 'react-icons/io5';
import FrameworksPageMobile from './FrameworksPageMobile';
import { fetchModules, recordModuleView } from '../../services/modulesService';
import { ROUTES } from '../../utils/constants';
import '../../components/common/Button.css';
import './FrameworksPage.css';

/* ── Level palette ── */
const LEVEL_COLORS = {
  0: '#F18F01',
  1: '#059669',
  2: '#2563eb',
  3: '#7c3aed',
  4: '#ea580c',
  5: '#dc2626',
};

function levelColor(n) {
  return LEVEL_COLORS[n] ?? '#059669';
}

/* ── Search icon ── */
function IconSearch() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/* ── Card thumbnail — colored banner showing lesson number ── */
function LessonThumb({ module }) {
  const color = levelColor(module.level_number);
  return (
    <div
      className="fh-card-thumb-wrap"
      style={{
        background: `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        border: `1px solid ${color}33`,
      }}
    >
      <span style={{ fontSize: '2rem', fontWeight: 900, color, lineHeight: 1 }}>
        {module.lesson_number}
      </span>
      <span style={{ fontSize: '0.65rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8 }}>
        {module.level_name}
      </span>
    </div>
  );
}

/* ── Level badge (used as author-avatar slot) ── */
function LevelBadge({ level }) {
  return (
    <span
      className="fh-card-author-avatar"
      style={{ background: levelColor(level), color: '#fff', fontSize: '0.7rem' }}
      aria-hidden="true"
    >
      L{level}
    </span>
  );
}

/* ── Module card ── */
function ModuleCard({ module, onOpen, animationClass = '' }) {
  return (
    <button
      type="button"
      className={`fh-card ${animationClass}`.trim()}
      onClick={() => onOpen(module)}
    >
      <LessonThumb module={module} />
      <div className="fh-card-meta">
        <LevelBadge level={module.level_number} />
        <div className="fh-card-copy">
          <h3 className="fh-card-name">{module.title}</h3>
          <p className="fh-card-author">Lesson {module.lesson_number}</p>
          <p className="fh-card-summary">
            {module.content.length > 110 ? `${module.content.slice(0, 110)}…` : module.content}
          </p>
        </div>
      </div>
    </button>
  );
}

/* ── Module detail modal ── */
function ModuleModal({ module, onClose }) {
  const navigate = useNavigate();
  const color = levelColor(module.level_number);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fh-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fh-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="fh-modal">
        <div className="fh-modal-header">
          <div>
            <span
              className="fh-modal-author"
              style={{ backgroundColor: color, color: '#ffffff' }}
            >
              {module.level_name} · Lesson {module.lesson_number}
            </span>
            <h2 id="fh-modal-title" className="fh-modal-title">{module.title}</h2>
          </div>
          <button
            type="button"
            className="dashboard-overlay-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="fh-modal-summary">{module.content}</p>

        {module.date_started ? (
          <div style={{ padding: '0 40px 20px', marginTop: '-16px', fontSize: '0.9rem', color: '#64748b', display: 'flex', gap: '20px', fontWeight: 600 }}>
            <span>Started: {new Date(module.date_started).toLocaleDateString()}</span>
            {module.date_ended ? <span>Ended: {new Date(module.date_ended).toLocaleDateString()}</span> : null}
          </div>
        ) : null}

        {module.level_number === 0 ? (
          <button
            type="button"
            className="bigkas-btn bigkas-btn--tutorial fh-tutorial-launch-btn"
            onClick={() => {
              onClose();
              navigate(ROUTES.ACTIVITY, {
                state: {
                  skywardEntrance: true,
                  launchFreeSpeechTutorial: true,
                  skipTutorialIntro: true,
                  t: Date.now(),
                },
              });
            }}
          >
            Launch Tutorial Walkthrough
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function FrameworksPage() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [activeModal, setActiveModal] = useState(null);
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('default');

  const loadModules = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchModules();
      setModules(data);
    } catch (err) {
      setError(err?.message ?? 'Failed to load modules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadModules(); }, [loadModules]);

  /* Derive level tabs from loaded data */
  const levels = useMemo(() => {
    const seen = new Map();
    modules.forEach((m) => {
      if (!seen.has(m.level_number)) seen.set(m.level_number, m.level_name);
    });
    return [...seen.entries()].sort((a, b) => a[0] - b[0]);
  }, [modules]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = activeTab === 0
      ? modules
      : modules.filter((m) => m.level_number === activeTab);

    if (q) {
      list = list.filter((m) =>
        m.title.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q) ||
        m.lesson_number.includes(q)
      );
    }

    if (sortOrder === 'az') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOrder === 'za') {
      list = [...list].sort((a, b) => b.title.localeCompare(a.title));
    }

    return list;
  }, [modules, activeTab, query, sortOrder]);

  const openModule = useCallback((module) => {
    setActiveModal(module);
    recordModuleView(module?.id);
  }, []);

  if (windowWidth < 768) {
    return <FrameworksPageMobile />;
  }

  return (
    <div className="fh-page no-scrollbar dashboard-anim-fade">
      <div className="fh-controls dashboard-anim-top">
        <div className="fh-search-wrap">
          <span className="fh-search-icon"><IconSearch /></span>
          <input
            className="fh-search"
            type="search"
            placeholder="Search modules..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="fh-search-clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        <div className="fh-sort-wrap">
          <select
            className="fh-sort"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="default">Default Order</option>
            <option value="az">A – Z</option>
            <option value="za">Z – A</option>
          </select>
          <span className="fh-sort-chevron"><IoChevronDown /></span>
        </div>
      </div>

      <div className="fh-tabs dashboard-anim-top dashboard-anim-delay-1" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 0}
          className={`fh-tab${activeTab === 0 ? ' fh-tab--active' : ''}`}
          onClick={() => { setActiveTab(0); setQuery(''); }}
        >
          All Modules
        </button>
        {levels.map(([num, name]) => (
          <button
            key={num}
            role="tab"
            aria-selected={activeTab === num}
            className={`fh-tab${activeTab === num ? ' fh-tab--active' : ''}`}
            onClick={() => { setActiveTab(num); setQuery(''); }}
          >
            Level {num}: {name}
          </button>
        ))}
      </div>

      {loading && (
        <div className="fh-empty dashboard-anim-bottom dashboard-anim-delay-2">
          Loading modules…
        </div>
      )}

      {!loading && error && (
        <div className="fh-empty dashboard-anim-bottom dashboard-anim-delay-2" style={{ color: '#dc2626' }}>
          {error}
          <br />
          <button
            style={{ marginTop: '12px', fontSize: '0.85rem', color: '#059669', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={loadModules}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="fh-empty dashboard-anim-bottom dashboard-anim-delay-2">
          {query ? `No modules found for "${query}"` : 'No modules available.'}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="fh-grid">
          {filtered.map((module, index) => (
            <ModuleCard
              key={`${module.level_number}-${module.lesson_number}`}
              module={module}
              onOpen={openModule}
              animationClass={`dashboard-anim-bottom dashboard-anim-delay-${Math.min(index + 2, 9)}`}
            />
          ))}
        </div>
      )}

      {activeModal && (
        <ModuleModal
          module={activeModal}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}

import { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { IoSearch, IoClose } from 'react-icons/io5';
import { fetchModules, recordModuleView } from '../../services/modulesService';
import { useNativeBottomSheetDrag } from '../../hooks/useNativeBottomSheetDrag';
import { ROUTES } from '../../utils/constants';
import '../../components/common/Button.css';
import './FrameworksPageMobile.css';
import '../../styles/dashboard-overlay-close-btn.css';

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

/* ── Card thumbnail ── */
function LessonThumb({ module }) {
  const color = levelColor(module.level_number);
  return (
    <div style={{
      height: '100px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      background: `linear-gradient(135deg, ${color}18 0%, ${color}38 100%)`,
      borderBottom: `1px solid ${color}33`,
    }}>
      <span style={{ fontSize: '1.8rem', fontWeight: 900, color, lineHeight: 1 }}>
        {module.lesson_number}
      </span>
      <span style={{ fontSize: '0.6rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8 }}>
        {module.level_name}
      </span>
    </div>
  );
}

/* ── Module card ── */
function ModuleCard({ module, onOpen, index }) {
  return (
    <button
      type="button"
      className={`fh-mobile-card dashboard-anim-bottom dashboard-anim-delay-${Math.min(index + 1, 9)}`}
      onClick={() => onOpen(module)}
    >
      <LessonThumb module={module} />
      <div className="fh-mobile-card-body">
        <div className="fh-mobile-card-info">
          <h3 className="fh-mobile-card-name">{module.title}</h3>
          <p className="fh-mobile-card-author">Lesson {module.lesson_number}</p>
          <p className="fh-mobile-card-summary">
            {module.content.length > 90 ? `${module.content.slice(0, 90)}…` : module.content}
          </p>
        </div>
      </div>
    </button>
  );
}

/* ── Module detail bottom sheet ── */
function ModuleModal({ module, onClose }) {
  const navigate = useNavigate();
  const color = levelColor(module.level_number);
  const sheetDrag = useNativeBottomSheetDrag(true, onClose);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fh-mobile-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 1100 }}
    >
      <div
        className={`fh-mobile-modal-sheet native-bottom-sheet${sheetDrag.isDragging ? ' is-dragging' : ''}`}
        style={{ ...sheetDrag.sheetStyle, display: 'flex', flexDirection: 'column' }}
      >
        <div className="fh-mobile-modal-handle native-bottom-sheet-grabber" {...sheetDrag.dragHandleProps} />

        <div className="fh-mobile-modal-header" style={{ alignItems: 'center' }}>
          <div className="fh-mobile-modal-titles">
            <p className="fh-mobile-modal-kicker" style={{ color }}>
              {module.level_name} · Lesson {module.lesson_number}
            </p>
            <h2 className="fh-mobile-modal-title">{module.title}</h2>
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

        <div className="fh-mobile-modal-body">
          <p className="fh-mobile-modal-summary">{module.content}</p>

          {module.date_started ? (
            <div style={{ padding: '0 4px 16px', marginTop: '-8px', fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '16px', fontWeight: 600 }}>
              <span>Started: {new Date(module.date_started).toLocaleDateString()}</span>
              {module.date_ended ? <span>Ended: {new Date(module.date_ended).toLocaleDateString()}</span> : null}
            </div>
          ) : null}

          {module.level_number === 0 ? (
            <div className="fh-mobile-modal-tutorial-row">
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
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Main mobile page ── */
export default function FrameworksPageMobile() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [activeModal, setActiveModal] = useState(null);
  const [query, setQuery] = useState('');

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
    return list;
  }, [modules, activeTab, query]);

  const openModule = useCallback((module) => {
    setActiveModal(module);
    recordModuleView(module?.id);
  }, []);

  return (
    <div className="fh-mobile-root activity-page--skyward-entrance no-scrollbar">
      <div className="fh-mobile-header dashboard-anim-top">
        <div className="fh-mobile-search-bar">
          <IoSearch className="fh-mobile-search-icon" />
          <input
            className="fh-mobile-search-input"
            type="search"
            placeholder="Search modules..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="fh-mobile-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
              <IoClose />
            </button>
          )}
        </div>

        <div className="fh-mobile-categories">
          <button
            className={`fh-mobile-chip${activeTab === 0 ? ' active' : ''}`}
            onClick={() => setActiveTab(0)}
          >
            All
          </button>
          {levels.map(([num, name]) => (
            <button
              key={num}
              className={`fh-mobile-chip${activeTab === num ? ' active' : ''}`}
              onClick={() => setActiveTab(num)}
            >
              Lv.{num} {name}
            </button>
          ))}
        </div>
      </div>

      <div className="fh-mobile-content">
        {loading && (
          <div className="fh-mobile-empty dashboard-anim-bottom">Loading modules…</div>
        )}

        {!loading && error && (
          <div className="fh-mobile-empty dashboard-anim-bottom" style={{ color: '#dc2626' }}>
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
          <div className="fh-mobile-empty dashboard-anim-bottom">
            {query ? `No modules found for "${query}"` : 'No modules available.'}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="fh-mobile-grid">
            {filtered.map((module, index) => (
              <ModuleCard
                key={`${module.level_number}-${module.lesson_number}`}
                module={module}
                onOpen={openModule}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {activeModal && (
        <ModuleModal module={activeModal} onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}

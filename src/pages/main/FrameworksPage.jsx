import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoChevronDown } from 'react-icons/io5';
import { BookOpen, ClipboardCheck, Compass, Target } from 'lucide-react';
import FrameworksPageMobile from './FrameworksPageMobile';
import { fetchModules, recordModuleView } from '../../services/modulesService';
import { fetchActivities, buildJourneyTasksFromActivities } from '../../services/activitiesService';
import { fetchUserJourneyProgress } from '../../services/journeyProgressService';
import { useAuthContext } from '../../context/useAuthContext';
import { getModuleAssignmentRange, getModuleAssignmentStatus } from '../../utils/moduleAssignments';
import { ROUTES } from '../../utils/constants';
import '../../components/common/Button.css';
import './FrameworksPage.css';

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

function moduleSummary(module) {
  return module.project_focus || module.objectives || module.content || module.theory || '';
}

function moduleSearchText(module) {
  return [
    module.title,
    module.lesson_number,
    module.level_name,
    module.content,
    module.project_focus,
    module.objectives,
    module.theory,
    module.assignment,
  ].filter(Boolean).join(' ').toLowerCase();
}

function IconSearch() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

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

function LevelBadge({ level }) {
  return (
    <span
      className="fh-card-author-avatar"
      style={{ background: levelColor(level), color: '#fff', fontSize: '0.7rem' }}
      aria-hidden="true"
    >
      J{level}
    </span>
  );
}

function ModuleCard({ module, onOpen, animationClass = '' }) {
  const summary = moduleSummary(module);

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
            {summary.length > 110 ? `${summary.slice(0, 110)}...` : summary}
          </p>
        </div>
      </div>
    </button>
  );
}

function AssignmentCta({ module, status, loading, error, onStart }) {
  if (Number(module.level_number) === 0) return null;

  const total = status?.totalCount || 0;
  const completed = status?.completedCount || 0;
  const done = status?.isCompleted === true;
  const locked = status?.isLocked === true;
  const range = getModuleAssignmentRange(module);
  const nextActivity = status?.nextActivity;
  const prerequisite = status?.firstIncompletePrerequisite;
  const rangeText = range
    ? `Journey ${module.level_number}, stages ${range.start}-${range.end}`
    : 'the assigned stages';

  return (
    <div className={`fh-assignment-cta ${done ? 'fh-assignment-cta--complete' : ''}`}>
      <div>
        <span>{done ? 'Module Completed' : locked ? 'Previous Stages Required' : 'Assignment Progress'}</span>
        <strong>{loading ? 'Checking your progress...' : `${completed}/${total || 6} stages completed`}</strong>
        {error ? (
          <p>{error}</p>
        ) : locked ? (
          <p>
            Finish Journey {module.level_number}, stages 1-{range.start - 1} before starting this module. Your next required stage is Stage {prerequisite?.activity_order || 1}.
          </p>
        ) : (
          <>
            <p>
              This module is completed by passing {rangeText}. Each stage is a short speaking task that practices this lesson.
            </p>
            {!done && nextActivity ? (
              <p className="fh-assignment-next">
                Next: Stage {nextActivity.activity_order} - {nextActivity.title || nextActivity.objective}
              </p>
            ) : null}
          </>
        )}
      </div>
      <button
        type="button"
        className="fh-assignment-btn"
        onClick={onStart}
        disabled={loading || done || locked || !status?.nextActivity}
      >
        {done ? 'Completed' : locked ? 'Locked' : 'Do Assignment'}
      </button>
    </div>
  );
}

function ModuleSections({ module }) {
  const sections = [
    ['Project Focus', module.project_focus, Compass],
    ['The Objectives', module.objectives, Target],
    ['The Theory', module.theory || module.content, BookOpen],
    ['Assignment', module.assignment, ClipboardCheck],
  ].filter(([, value]) => value);

  return (
    <div className="fh-module-sections">
      {sections.map(([label, value, Icon]) => (
        <section className={`fh-module-section ${label === 'Assignment' ? 'fh-module-section--assignment' : ''}`} key={label}>
          <div className="fh-module-section-heading">
            <span className="fh-module-section-icon"><Icon size={17} strokeWidth={2.3} /></span>
            <p className="fh-module-section-title">{label}</p>
          </div>
          <p className="fh-module-section-text">{value}</p>
        </section>
      ))}
    </div>
  );
}

function ModuleModal({ module, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const color = levelColor(module.level_number);
  const [assignmentState, setAssignmentState] = useState({
    loading: Number(module.level_number) > 0,
    error: '',
    status: null,
  });

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    async function loadAssignmentState() {
      if (Number(module.level_number) === 0) {
        setAssignmentState({ loading: false, error: '', status: null });
        return;
      }

      if (!user?.id) {
        setAssignmentState({
          loading: false,
          error: 'Sign in to track assignment completion.',
          status: null,
        });
        return;
      }

      setAssignmentState((current) => ({ ...current, loading: true, error: '' }));

      try {
        const [activities, progress] = await Promise.all([
          fetchActivities(module.level_number),
          fetchUserJourneyProgress(user.id),
        ]);
        if (cancelled) return;

        setAssignmentState({
          loading: false,
          error: '',
          status: getModuleAssignmentStatus(module, activities, progress.completedActivityIds),
        });
      } catch (err) {
        if (cancelled) return;
        setAssignmentState({
          loading: false,
          error: err?.message || 'Could not load assignment progress.',
          status: null,
        });
      }
    }

    loadAssignmentState();
    return () => {
      cancelled = true;
    };
  }, [module, user?.id]);

  const startAssignment = useCallback(() => {
    const nextActivity = assignmentState.status?.nextActivity;
    if (!nextActivity) return;

    const [task] = buildJourneyTasksFromActivities([nextActivity]);
    const activityPromptTopic = String(task?.detail || task?.objective || task?.title || '').trim();

    navigate(`${ROUTES.TRAINING}?autostart=1`, {
      state: {
        freeTopic: activityPromptTopic,
        objective: task?.objective || task?.detail,
        focus: 'free',
        sessionType: 'training',
        entryPoint: 'activity',
        autoStartCountdown: true,
        fromActivityTaskId: task?.id || nextActivity.id,
        sourceModuleLesson: module.lesson_number,
        step: task || nextActivity,
      },
    });
  }, [assignmentState.status?.nextActivity, module.lesson_number, navigate]);

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
              {module.level_name} - Lesson {module.lesson_number}
            </span>
            <h2 id="fh-modal-title" className="fh-modal-title">{module.title}</h2>
          </div>
          <button
            type="button"
            className="dashboard-overlay-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="fh-modal-body">
          <aside className="fh-module-lesson-map" style={{ borderColor: `${color}30` }}>
            <span className="fh-modal-focus-label">Lesson Map</span>
            <strong>{module.project_focus || moduleSummary(module)}</strong>
            <ol>
              <li>Focus on the skill</li>
              <li>Read the objective</li>
              <li>Understand the idea</li>
              <li>Apply it in practice</li>
            </ol>
          </aside>

          <div className="fh-module-lesson-main">
            <div className="fh-modal-focus" style={{ borderColor: `${color}33`, background: `${color}10` }}>
              <span className="fh-modal-focus-label">You are learning</span>
              <strong>{module.title}</strong>
              <p>{module.objectives || moduleSummary(module)}</p>
            </div>

          <ModuleSections module={module} />

          <AssignmentCta
            module={module}
            status={assignmentState.status}
            loading={assignmentState.loading}
            error={assignmentState.error}
            onStart={startAssignment}
          />
        </div>
        </div>

        {module.date_started ? (
          <div className="fh-modal-dates">
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
      list = list.filter((m) => moduleSearchText(m).includes(q));
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
            <button className="fh-search-clear" onClick={() => setQuery('')}>x</button>
          )}
        </div>

        <div className="fh-sort-wrap">
          <select
            className="fh-sort"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="default">Default Order</option>
            <option value="az">A - Z</option>
            <option value="za">Z - A</option>
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
            Journey {num}: {name}
          </button>
        ))}
      </div>

      {loading && (
        <div className="fh-empty dashboard-anim-bottom dashboard-anim-delay-2">
          Loading modules...
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

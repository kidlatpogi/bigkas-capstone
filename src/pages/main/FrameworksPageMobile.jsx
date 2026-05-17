import { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { IoSearch, IoClose } from 'react-icons/io5';
import { BookOpen, ClipboardCheck, Compass, Target } from 'lucide-react';
import { fetchModules, recordModuleView } from '../../services/modulesService';
import { fetchActivities, buildJourneyTasksFromActivities } from '../../services/activitiesService';
import { fetchUserJourneyProgress } from '../../services/journeyProgressService';
import { useNativeBottomSheetDrag } from '../../hooks/useNativeBottomSheetDrag';
import { useAuthContext } from '../../context/useAuthContext';
import { getModuleAssignmentRange, getModuleAssignmentStatus } from '../../utils/moduleAssignments';
import { ROUTES } from '../../utils/constants';
import '../../components/common/Button.css';
import './FrameworksPageMobile.css';
import '../../styles/dashboard-overlay-close-btn.css';

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

function ModuleCard({ module, onOpen, index }) {
  const summary = moduleSummary(module);

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
            {summary.length > 90 ? `${summary.slice(0, 90)}...` : summary}
          </p>
        </div>
      </div>
    </button>
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
    <div className="fh-mobile-module-sections">
      {sections.map(([label, value, Icon]) => (
        <section className={`fh-mobile-module-section ${label === 'Assignment' ? 'fh-mobile-module-section--assignment' : ''}`} key={label}>
          <div className="fh-mobile-module-section-heading">
            <span className="fh-mobile-module-section-icon"><Icon size={16} strokeWidth={2.3} /></span>
            <p className="fh-mobile-module-section-title">{label}</p>
          </div>
          <p className="fh-mobile-module-section-text">{value}</p>
        </section>
      ))}
    </div>
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
    <div className={`fh-mobile-assignment-cta ${done ? 'fh-mobile-assignment-cta--complete' : ''}`}>
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
            <p className="fh-mobile-assignment-next">
              Next: Stage {nextActivity.activity_order} - {nextActivity.title || nextActivity.objective}
            </p>
          ) : null}
        </>
      )}
      <button
        type="button"
        className="fh-mobile-assignment-btn"
        onClick={onStart}
        disabled={loading || done || locked || !status?.nextActivity}
      >
        {done ? 'Completed' : locked ? 'Locked' : 'Do Assignment'}
      </button>
    </div>
  );
}

function ModuleModal({ module, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const color = levelColor(module.level_number);
  const sheetDrag = useNativeBottomSheetDrag(true, onClose);
  const [assignmentState, setAssignmentState] = useState({
    loading: Number(module.level_number) > 0,
    error: '',
    status: null,
  });

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
              {module.level_name} - Lesson {module.lesson_number}
            </p>
            <h2 className="fh-mobile-modal-title">{module.title}</h2>
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

        <div className="fh-mobile-modal-body">
          <div className="fh-mobile-modal-focus" style={{ borderColor: `${color}33`, background: `${color}10` }}>
            <span>You are learning</span>
            <strong>{module.title}</strong>
            <p>{module.objectives || moduleSummary(module)}</p>
          </div>

          <div className="fh-mobile-lesson-map">
            <span>Lesson Map</span>
            <ol>
              <li>Focus</li>
              <li>Objective</li>
              <li>Theory</li>
              <li>Practice</li>
            </ol>
          </div>

          <ModuleSections module={module} />

          <AssignmentCta
            module={module}
            status={assignmentState.status}
            loading={assignmentState.loading}
            error={assignmentState.error}
            onStart={startAssignment}
          />

          {module.date_started ? (
            <div className="fh-mobile-modal-dates">
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
              J{num} {name}
            </button>
          ))}
        </div>
      </div>

      <div className="fh-mobile-content">
        {loading && (
          <div className="fh-mobile-empty dashboard-anim-bottom">Loading modules...</div>
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

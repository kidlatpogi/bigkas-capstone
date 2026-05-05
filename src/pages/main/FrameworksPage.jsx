import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  IoChevronDown, 
  IoVideocam, 
  IoEye, 
  IoVolumeHigh, 
  IoHandLeft, 
  IoBook, 
  IoRibbon 
} from 'react-icons/io5';
import FrameworksPageMobile from './FrameworksPageMobile';
import { getSpriteUrl } from '../../utils/assetUtils';
import './FrameworksPage.css';

const b01ChatHead = getSpriteUrl('Robot/0015.webp');

const CATEGORIES = [
  { id: 'all', label: 'All Modules' },
  { id: 'setup', label: 'Technical Setup' },
  { id: 'visual', label: 'Visual Delivery' },
];

const MODULES = [
  {
    id: 'mod-0',
    categoryId: 'setup',
    level: 1,
    title: 'Module 0: Technical Setup',
    description: 'Ensure your camera and microphone are positioned correctly for optimal recording quality.',
    b01Script: [
      { speaker: 'b01', text: "Hello! I am B-01. Before we begin speaking, let's make sure you are seen and heard clearly." },
      { speaker: 'b01', text: "First, position your camera at eye level. This creates a natural connection with your audience." },
      { speaker: 'b01', text: "Second, ensure you are in a quiet room and your microphone is not blocked." },
      { speaker: 'b01', text: "Ready? Let's move on to the next module!" }
    ]
  },
  {
    id: 'mod-1',
    categoryId: 'visual',
    level: 1,
    title: 'Module 1: The Visual Anchor',
    description: 'Master the art of eye contact and open posture to project confidence.',
    b01Script: [
      { speaker: 'b01', text: "Welcome to Module 1! Let's talk about your physical presence." },
      { speaker: 'b01', text: "When speaking, maintain eye contact with the camera lens, not the screen. This simulates looking directly at your audience." },
      { speaker: 'b01', text: "Keep your posture open. Avoid crossing your arms, and sit or stand up straight. This signals confidence and readiness." },
      { speaker: 'b01', text: "Practice this in your next free speech session!" }
    ]
  },
  {
    id: 'mod-2',
    categoryId: 'visual',
    level: 2,
    title: 'Module 2: Vocal Dynamics',
    description: 'Learn to control your pitch, pace, and volume to keep your audience engaged.',
    b01Script: [
      { speaker: 'b01', text: "Ready to sound like a pro? Let's dive into vocal dynamics!" },
      { speaker: 'b01', text: "Varying your pitch helps emphasize key points and prevents a monotone delivery." },
      { speaker: 'b01', text: "Don't rush! A steady pace allows your audience to digest your message." },
      { speaker: 'b01', text: "You're doing great! Keep practicing those vocal exercises." }
    ]
  },
  {
    id: 'mod-3',
    categoryId: 'visual',
    level: 3,
    title: 'Module 3: Gestures and Expression',
    description: 'Use your hands and facial expressions to reinforce your verbal message.',
    b01Script: [
      { speaker: 'b01', text: "In Module 3, we focus on using your whole body to communicate." },
      { speaker: 'b01', text: "Natural hand gestures can make you seem more relaxed and authoritative." },
      { speaker: 'b01', text: "Your face is a powerful tool. Match your expressions to the emotion of your speech." },
      { speaker: 'b01', text: "Let's see some expressive energy in your next recording!" }
    ]
  },
  {
    id: 'mod-4',
    categoryId: 'visual',
    level: 4,
    title: 'Module 4: Advanced Storytelling',
    description: 'Craft compelling narratives that resonate emotionally with your audience.',
    b01Script: [
      { speaker: 'b01', text: "Now we're getting into the heart of public speaking: storytelling." },
      { speaker: 'b01', text: "Start with a hook that immediately grabs attention." },
      { speaker: 'b01', text: "Use sensory details to bring your story to life for your listeners." },
      { speaker: 'b01', text: "Every great speech is a journey. Lead your audience well!" }
    ]
  },
  {
    id: 'mod-5',
    categoryId: 'visual',
    level: 5,
    title: 'Module 5: Rhetorical Mastery',
    description: 'Master the use of rhetorical devices to make your message unforgettable.',
    b01Script: [
      { speaker: 'b01', text: "Final module! Let's sharpen your rhetorical skills." },
      { speaker: 'b01', text: "Try using the 'Rule of Three' to make your points more memorable." },
      { speaker: 'b01', text: "Anaphora—repeating a word or phrase—can add powerful rhythm to your speech." },
      { speaker: 'b01', text: "You've come a long way. Use these tools to inspire and persuade!" }
    ]
  }
];

function IconSearch() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function getModuleIcon(id) {
  const size = 48;
  const color = '#059669';
  switch (id) {
    case 'mod-0': return <IoVideocam size={size} color={color} />;
    case 'mod-1': return <IoEye size={size} color={color} />;
    case 'mod-2': return <IoVolumeHigh size={size} color={color} />;
    case 'mod-3': return <IoHandLeft size={size} color={color} />;
    case 'mod-4': return <IoBook size={size} color={color} />;
    case 'mod-5': return <IoRibbon size={size} color={color} />;
    default: return <IoBook size={size} color={color} />;
  }
}

function ModuleCard({ module, isCompleted, onOpen, animationClass = '' }) {
  const [imgError, setImgError] = useState(false);

  return (
    <button type="button" className={`fh-card ${animationClass}`.trim()} onClick={() => onOpen(module)}>
      <div className="fh-card-thumb-wrap" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(5, 150, 105, 0.1)', position: 'relative' }}>
        {!imgError ? (
          <img 
            src={b01ChatHead} 
            alt="" 
            onError={() => setImgError(true)}
            style={{ width: '80px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))' }} 
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', opacity: 0.8 }}>
            {getModuleIcon(module.id)}
          </div>
        )}
        
        <div style={{ position: 'absolute', top: '8px', right: '8px', background: '#059669', color: 'white', fontSize: '0.65rem', fontWeight: '800', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isCompleted && <span style={{ fontSize: '10px' }}>✓</span>}
          Level {module.level}
        </div>
        {isCompleted && (
          <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: '#f97316', color: 'white', fontSize: '0.6rem', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
            Completed
          </div>
        )}
      </div>
      <div className="fh-card-meta">
        <div className="fh-card-copy">
          <h3 className="fh-card-name" style={{ color: isCompleted ? '#64748b' : '#059669', marginTop: '10px' }}>
            {module.title}
          </h3>
          <p className="fh-card-summary">{module.description}</p>
        </div>
      </div>
    </button>
  );
}

function ModuleModal({ module, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleNext = () => {
    if (currentStep < module.b01Script.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      if (onComplete) onComplete(module.id);
      onClose();
    }
  };

  return (
    <div
      className="fh-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ zIndex: 12000 }}
    >
      <div className="ask-b01-modal-card dashboard-anim-bottom" style={{ maxWidth: '600px', margin: 'auto', pointerEvents: 'auto' }}>
        <div className="ask-b01-modal-header">
          <h2 className="ask-b01-modal-title">
            <img src={b01ChatHead} alt="" className="ask-b01-modal-title-logo" />
            Learn: <span>{module.title}</span>
          </h2>
          <button className="ask-b01-modal-close" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>

        <div className="ask-b01-chat-container">
          {module.b01Script.slice(0, currentStep + 1).map((msg, idx) => (
            <div key={idx} className="ask-b01-chat-row b01-row dashboard-anim-bottom">
              <div className="ask-b01-chat-head b01-chat-head-square">
                <img src={b01ChatHead} alt="B-01" />
              </div>
              <div className="ask-b01-message ask-b01-message--b01">
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="ask-b01-input-area" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
          <button 
            className="bigkas-btn dashboard-anim-fade"
            style={{ padding: '10px 24px', background: '#059669', color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '#047857 0 4px 0 0' }}
            onClick={handleNext}
          >
            {currentStep < module.b01Script.length - 1 ? 'Next' : 'Finish Module'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FrameworksPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeTab, setActiveTab] = useState('all');
  const [activeModal, setActiveModal] = useState(null);
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('level-1');
  const [statusSort, setStatusSort] = useState('all');

  const [completedModules, setCompletedModules] = useState(() => {
    try {
      const saved = localStorage.getItem('bigkas_framework_completion');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const handleComplete = (moduleId) => {
    setCompletedModules(prev => {
      if (prev.includes(moduleId)) return prev;
      const next = [...prev, moduleId];
      localStorage.setItem('bigkas_framework_completion', JSON.stringify(next));
      return next;
    });
  };

  const handleOpenModule = (module) => {
    const tutorialSteps = module.b01Script.map((msg, i) => ({
      id: `${module.id}-step-${i}`,
      title: 'B-01:',
      text: msg.text,
      button: i < module.b01Script.length - 1 ? 'Next' : 'Finish',
      targetElementId: null,
    }));

    if (module.id === 'mod-0') {
      navigate('/settings/test', {
        state: {
          launchTutorial: true,
          tutorialSteps,
          onCompleteCallback: () => handleComplete('mod-0')
        }
      });
    } else {
      setActiveModal(module);
    }
  };

  if (windowWidth < 768) {
    return <FrameworksPageMobile />;
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = activeTab === 'all' ? MODULES : MODULES.filter(m => m.categoryId === activeTab);
    
    if (q) {
      list = list.filter(it => 
        it.title.toLowerCase().includes(q) || 
        it.description.toLowerCase().includes(q)
      );
    }

    // Sort/Filter Logic
    list = [...list].sort((a, b) => {
      // Primary Sort: Level prioritization
      if (sortOrder.startsWith('level-')) {
        const target = parseInt(sortOrder.split('-')[1], 10);
        if (a.level === target && b.level !== target) return -1;
        if (b.level === target && a.level !== target) return 1;
        // Within same priority or non-target, sort by level asc
        return a.level - b.level;
      }

      // Secondary Sort: Completion (Status)
      if (statusSort !== 'all') {
        const doneA = completedModules.includes(a.id);
        const doneB = completedModules.includes(b.id);
        if (statusSort === 'completed') {
          if (doneA && !doneB) return -1;
          if (!doneA && doneB) return 1;
        } else if (statusSort === 'not-completed') {
          if (!doneA && doneB) return -1;
          if (doneA && !doneB) return 1;
        }
      }

      return 0;
    });

    return list;
  }, [activeTab, query, sortOrder, statusSort, completedModules]);

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
            <option value="level-1">Level 1</option>
            <option value="level-2">Level 2</option>
            <option value="level-3">Level 3</option>
            <option value="level-4">Level 4</option>
            <option value="level-5">Level 5</option>
          </select>
          <span className="fh-sort-chevron"><IoChevronDown /></span>
        </div>

        <div className="fh-sort-wrap">
          <select 
            className="fh-sort"
            value={statusSort}
            onChange={(e) => setStatusSort(e.target.value)}
          >
            <option value="all">Status: All</option>
            <option value="completed">Completed</option>
            <option value="not-completed">Not Completed</option>
          </select>
          <span className="fh-sort-chevron"><IoChevronDown /></span>
        </div>
      </div>

      <div className="fh-tabs dashboard-anim-top dashboard-anim-delay-1" role="tablist">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            role="tab"
            aria-selected={activeTab === cat.id}
            className={`fh-tab${activeTab === cat.id ? ' fh-tab--active' : ''}`}
            onClick={() => { setActiveTab(cat.id); setQuery(''); }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="fh-empty dashboard-anim-bottom dashboard-anim-delay-2">
          {query ? `No modules found for "${query}"` : 'No modules available.'}
        </div>
      ) : (
        <div className="fh-grid">
          {filtered.map((module, index) => (
            <ModuleCard
              key={module.id}
              module={module}
              isCompleted={completedModules.includes(module.id)}
              onOpen={handleOpenModule}
              animationClass={`dashboard-anim-bottom dashboard-anim-delay-${Math.min(index + 2, 9)}`}
            />
          ))}
        </div>
      )}

      {activeModal && (
        <ModuleModal 
          module={activeModal} 
          onClose={() => setActiveModal(null)} 
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}



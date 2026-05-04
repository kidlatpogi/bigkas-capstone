import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { IoChevronDown } from 'react-icons/io5';
import FrameworksPageMobile from './FrameworksPageMobile';
import { getSpriteUrl } from '../../utils/assetUtils';
import './FrameworksPage.css';

const b01ChatHead = getSpriteUrl('Robot/0015.png');

const CATEGORIES = [
  { id: 'all', label: 'All Modules' },
  { id: 'setup', label: 'Technical Setup' },
  { id: 'visual', label: 'Visual Delivery' },
];

const MODULES = [
  {
    id: 'mod-0',
    categoryId: 'setup',
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
    title: 'Module 1: The Visual Anchor',
    description: 'Master the art of eye contact and open posture to project confidence.',
    b01Script: [
      { speaker: 'b01', text: "Welcome to Module 1! Let's talk about your physical presence." },
      { speaker: 'b01', text: "When speaking, maintain eye contact with the camera lens, not the screen. This simulates looking directly at your audience." },
      { speaker: 'b01', text: "Keep your posture open. Avoid crossing your arms, and sit or stand up straight. This signals confidence and readiness." },
      { speaker: 'b01', text: "Practice this in your next free speech session!" }
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

function ModuleCard({ module, onOpen, animationClass = '' }) {
  return (
    <button type="button" className={`fh-card ${animationClass}`.trim()} onClick={() => onOpen(module)}>
      <div className="fh-card-thumb-wrap" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(5, 150, 105, 0.1)' }}>
        <img src={b01ChatHead} alt="B-01" style={{ width: '80px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))' }} />
      </div>
      <div className="fh-card-meta">
        <div className="fh-card-copy">
          <h3 className="fh-card-name" style={{ color: '#059669', marginTop: '10px' }}>{module.title}</h3>
          <p className="fh-card-summary">{module.description}</p>
        </div>
      </div>
    </button>
  );
}

function ModuleModal({ module, onClose }) {
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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeTab, setActiveTab] = useState('all');
  const [activeModal, setActiveModal] = useState(null);
  const [query, setQuery] = useState('');

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
    return list;
  }, [activeTab, query]);

  return (
    <div className="fh-page no-scrollbar dashboard-anim-fade">
      <div className="fh-controls dashboard-anim-top">
        <div className="fh-search-wrap" style={{ gridColumn: '1 / -1', maxWidth: '400px' }}>
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
              onOpen={handleOpenModule}
              animationClass={`dashboard-anim-bottom dashboard-anim-delay-${Math.min(index + 2, 9)}`}
            />
          ))}
        </div>
      )}

      {activeModal && <ModuleModal module={activeModal} onClose={() => setActiveModal(null)} />}
    </div>
  );
}

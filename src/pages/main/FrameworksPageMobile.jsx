import { useState, useMemo, useEffect } from 'react';
import { IoSearch, IoClose } from 'react-icons/io5';
import { getSpriteUrl } from '../../utils/assetUtils';
import './FrameworksPageMobile.css';

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

function ModuleCard({ module, onOpen, index }) {
  return (
    <button 
      type="button" 
      className={`fh-mobile-card dashboard-anim-bottom dashboard-anim-delay-${Math.min(index + 1, 9)}`}
      onClick={() => onOpen(module)}
    >
      <div style={{ background: '#f8fafc', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(5,150,105,0.1)' }}>
        <img src={b01ChatHead} alt="B-01" style={{ height: '70px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))' }} />
      </div>
      <div className="fh-mobile-card-body">
        <div className="fh-mobile-card-info">
          <h3 className="fh-mobile-card-name" style={{ color: '#059669' }}>{module.title}</h3>
          <p className="fh-mobile-card-summary">{module.description}</p>
        </div>
      </div>
    </button>
  );
}

function ModuleModal({ module, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleNext = () => {
    if (currentStep < module.b01Script.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fh-mobile-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 12000 }}>
      <div className="fh-mobile-modal-sheet" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="fh-mobile-modal-handle" />
        <div className="fh-mobile-modal-header" style={{ borderBottom: '1px solid rgba(11,57,84,0.05)', paddingBottom: '16px' }}>
          <div className="fh-mobile-modal-titles" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <img src={b01ChatHead} alt="" style={{ width: '28px' }} />
             <h2 className="fh-mobile-modal-title" style={{ margin: 0, fontSize: '1.2rem' }}>{module.title}</h2>
          </div>
          <button className="fh-mobile-modal-close" onClick={onClose}>
            <IoClose size={24} />
          </button>
        </div>

        <div className="fh-mobile-modal-body" style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {module.b01Script.slice(0, currentStep + 1).map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }} className="dashboard-anim-bottom">
              <div style={{ width: '38px', height: '38px', flexShrink: 0, background: '#fff', borderRadius: '12px', padding: '4px', border: '1px solid rgba(5,150,105,0.1)' }}>
                <img src={b01ChatHead} alt="B-01" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '18px', borderTopLeftRadius: '4px', fontSize: '0.95rem', color: '#334155', border: '1px solid rgba(11,57,84,0.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px', background: '#fff', borderTop: '1px solid rgba(11,57,84,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            style={{ width: '100%', padding: '14px', background: '#059669', color: 'white', border: 'none', borderRadius: '999px', fontSize: '1rem', fontWeight: 'bold', boxShadow: '#047857 0 4px 0 0' }}
            onClick={handleNext}
          >
            {currentStep < module.b01Script.length - 1 ? 'Next' : 'Finish Module'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FrameworksPageMobile() {
  const [activeTab, setActiveTab] = useState('all');
  const [activeModal, setActiveModal] = useState(null);
  const [query, setQuery] = useState('');

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
            <button className="fh-mobile-search-clear" onClick={() => setQuery('')}>
              <IoClose />
            </button>
          )}
        </div>

        <div className="fh-mobile-categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`fh-mobile-chip ${activeTab === cat.id ? 'active' : ''}`}
              onClick={() => setActiveTab(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fh-mobile-content">
        {filtered.length === 0 ? (
          <div className="fh-mobile-empty dashboard-anim-bottom">
            {query ? `No modules found for "${query}"` : 'No modules available.'}
          </div>
        ) : (
          <div className="fh-mobile-grid">
            {filtered.map((module, index) => (
              <ModuleCard
                key={module.id}
                module={module}
                onOpen={setActiveModal}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {activeModal && <ModuleModal module={activeModal} onClose={() => setActiveModal(null)} />}
    </div>
  );
}

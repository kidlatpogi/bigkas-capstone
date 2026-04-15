import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import BackButton from '../../components/common/BackButton';
import './InnerPages.css';
import './TrainingSetupPage.css';
import './PracticePage.css';

function TrainingSetupPage() {
  const navigate = useNavigate();

  const [freeTopic, setFreeTopic] = useState('');
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [freeTopicError, setFreeTopicError] = useState('');

  const handleStart = () => {
    setFreeTopicError('');
    setShowTopicModal(true);
  };

  const handleFreeStart = () => {
    const topic = freeTopic.trim();
    if (!topic) {
      setFreeTopicError('Topic is required for Free Speech mode.');
      return;
    }

    navigate(`${ROUTES.TRAINING}?autostart=1`, {
      state: {
        focus: 'free',
        freeTopic: topic,
        sessionType: 'training',
        entryPoint: 'training',
        autoStartCountdown: true,
      },
    });
  };

  return (
    <div className="practice-page">
      <div className="practice-wrap">
        <div className="practice-header">
          <BackButton className="inner-page-back" onClick={() => navigate(-1)} aria-label="Go back" />
          <h1 className="practice-title">Training Setup</h1>
        </div>
        <p className="practice-sub">
          Set up your training parameters and begin!
        </p>

        <div className="practice-rand-wrap">
          <div className="practice-rand-card">
            <h3 className="practice-rand-title">Free Speech Mode</h3>
            <p className="practice-rand-body">
              Impromptu speaking style. Focus on flow, tone, and pacing. The AI will evaluate your delivery in real time.
            </p>
            <div className="practice-rand-actions">
              <button className="practice-btn-primary" onClick={handleStart}>
                Start Training
              </button>
            </div>
          </div>
          <p className="practice-coming-soon">
            New modes coming soon...
          </p>
        </div>

      {showTopicModal && (
        <div className="modal-overlay" onClick={() => setShowTopicModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">What will you speak about?</h2>
            <p className="modal-desc">Enter a topic or write out what you plan to say. You can speak freely — this helps the AI follow along.</p>
            <div className="form-group">
              <textarea
                className="form-textarea"
                placeholder="e.g., I want to talk about my weekend trip to the mountains and what I learned from it..."
                rows={5}
                value={freeTopic}
                onChange={(e) => {
                  setFreeTopic(e.target.value);
                  if (freeTopicError) setFreeTopicError('');
                }}
              />
              {freeTopicError && (
                <p className="form-hint form-hint-error" role="alert">{freeTopicError}</p>
              )}
            </div>
            <div className="btn-row">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowTopicModal(false);
                  setFreeTopicError('');
                }}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleFreeStart} disabled={!freeTopic.trim()}>Start</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default TrainingSetupPage;

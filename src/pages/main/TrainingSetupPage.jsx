import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../../components/common/BackButton';
import { ROUTES } from '../../utils/constants';
import './InnerPages.css';
import './TrainingSetupPage.css';

function TrainingSetupPage() {
  const navigate = useNavigate();

  const handleSafeBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(ROUTES.PRACTICE);
  }, [navigate]);

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
    <div className="inner-page training-setup-page">
      <div className="inner-page-header training-setup-header">
        <BackButton onClick={handleSafeBack} />
        <h1 className="inner-page-title">Training Setup</h1>
      </div>

      <p className="section-label ts-focus-label">Free Speech Mode</p>
      <p className="focus-desc" style={{ marginBottom: '1.5rem' }}>
        Impromptu speaking style. Focus on flow, tone, and pacing. The AI will evaluate your delivery in real time.
      </p>

      <div className="btn-row ts-action-row">
        <button className="btn-secondary" onClick={handleSafeBack}>Cancel</button>
        <button className="btn-primary" onClick={handleStart}>
          Start Training
        </button>
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
  );
}

export default TrainingSetupPage;

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import { RANDOM_TOPICS } from '../../utils/practiceData';
import './PracticePage.css';

function IconShuffle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 3 21 3 21 8"/>
      <line x1="4" y1="20" x2="21" y2="3"/>
      <polyline points="21 16 21 21 16 21"/>
      <line x1="15" y1="15" x2="21" y2="21"/>
    </svg>
  );
}

export default function PracticePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const didAutoLaunchRandomizerRef = useRef(false);

  const [randomTopic, setRandomTopic] = useState(() => RANDOM_TOPICS[0]);
  const activityTaskId = location.state?.activityTaskId || null;
  const shouldAutoStartRandomizer = location.state?.autoStartRandomizer === true;

  const shuffleRandomTopic = useCallback(() => {
    const idx = Math.floor(Math.random() * RANDOM_TOPICS.length);
    setRandomTopic(RANDOM_TOPICS[idx]);
  }, []);

  const handleStartRandomTopic = useCallback(() => {
    if (!randomTopic) return;
    navigate(`${ROUTES.TRAINING}?autostart=1`, {
      state: {
        freeTopic: randomTopic.title,
        freeSpeechContext: randomTopic.body,
        focus: 'free',
        sessionType: 'practice',
        entryPoint: 'practice',
        autoStartCountdown: true,
        activityTaskId,
      },
    });
  }, [activityTaskId, navigate, randomTopic]);

  useEffect(() => {
    if (!shouldAutoStartRandomizer) return;
    if (didAutoLaunchRandomizerRef.current) return;

    didAutoLaunchRandomizerRef.current = true;
    const timer = window.setTimeout(() => {
      handleStartRandomTopic();
    }, 200);

    return () => window.clearTimeout(timer);
  }, [handleStartRandomTopic, shouldAutoStartRandomizer]);

  return (
    <div className="practice-page">
      <div className="practice-wrap">
        <div className="practice-header">
          <h1 className="practice-title">Practice Setup</h1>
        </div>
        <p className="practice-sub">
          Get a random topic and practice speaking about it!
        </p>

        <div className="practice-rand-wrap">
          <div className="practice-rand-card">
            <h3 className="practice-rand-title">{randomTopic?.title || 'Surprise Topic'}</h3>
            <p className="practice-rand-body">
              {randomTopic?.body || 'Press shuffle to get a random topic!'}
            </p>
            <div className="practice-rand-actions">
              <button className="practice-btn-outline" onClick={shuffleRandomTopic}>
                <IconShuffle /> Shuffle
              </button>
              <button className="practice-btn-primary" onClick={handleStartRandomTopic}>
                Start
              </button>
            </div>
          </div>
          <p className="practice-rand-hint">
            Get a surprise topic and practice speaking about it!
          </p>

          <div className="practice-coming-soon">
            <p>New modes coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

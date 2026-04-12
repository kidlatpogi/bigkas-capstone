import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import { useAuthContext } from '../../context/useAuthContext';
import './UserPretestPage.css';

function UserPretestPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const handleStartFree = () => {
    navigate(`${ROUTES.TRAINING}?autostart=1`, {
      state: {
        freeTopic: 'Tell me about yourself',
        focus: 'free',
        sessionType: 'pre-test',
        autoStartCountdown: true,
      },
    });
  };

  return (
    <div className="user-pretest-page">
      <section className="pretest-single-card">
        <p className="pretest-kicker">Final step</p>
        <h1>Free Speech Pre-Test</h1>
        <p className="pretest-subtitle">
          Speak naturally so we can calibrate your baseline speaking performance.
        </p>

        <div className="pretest-topic-box">
          <strong>Topic</strong>
          <p>Tell me about yourself</p>
        </div>

        <div className="pretest-note-box">
          <strong>Instructions</strong>
          <p>
            Speak for at least 30 seconds. The session starts automatically and your result
            will be used to personalize your training level.
          </p>
        </div>

        <button type="button" className="pretest-start" onClick={handleStartFree}>
          Start Pre-Test
        </button>
      </section>
    </div>
  );
}

export default UserPretestPage;

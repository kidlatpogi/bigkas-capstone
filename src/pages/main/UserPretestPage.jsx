import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import './UserPretestPage.css';

function UserPretestPage() {
  const navigate = useNavigate();

  const startPretest = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('bigkas_current_training_session');
    }

    navigate(ROUTES.TRAINING, {
      state: {
        freeTopic: 'Tell me about yourself',
        focus: 'free',
        objective: 'Speak for 30 Seconds about yourself.',
        sessionType: 'pre-test',
      },
    });
  };

  return (
    <div className="user-pretest-page">
      <section className="pretest-single-card" aria-labelledby="pretest-title">
        <p className="pretest-kicker">Free Speech Pre-test</p>
        <h1 id="pretest-title">Tell me about yourself</h1>
        <p className="pretest-subtitle">
          Record a short free speech so B-01 can analyze your starting public speaking level.
        </p>

        <div className="pretest-topic-box">
          <strong>Topic</strong>
          <p>Tell me about yourself.</p>
        </div>

        <div className="pretest-note-box">
          <strong>Goal</strong>
          <p>Speak for at least 30 seconds. You can stop after the minimum, or keep going up to one minute.</p>
        </div>

        <button type="button" className="pretest-start" onClick={startPretest}>
          Start Pre-test
        </button>
      </section>
    </div>
  );
}

export default UserPretestPage;

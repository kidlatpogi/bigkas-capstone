import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';

const PRETEST_TRAINING_STATE = {
  freeTopic: 'Tell me about yourself',
  focus: 'free',
  objective: 'Speak for 30 Seconds about yourself.',
  sessionType: 'pre-test',
};

function UserPretestPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('bigkas_current_training_session');
    }

    navigate(ROUTES.TRAINING, {
      replace: true,
      state: PRETEST_TRAINING_STATE,
    });
  }, [navigate]);

  return null;
}

export default UserPretestPage;

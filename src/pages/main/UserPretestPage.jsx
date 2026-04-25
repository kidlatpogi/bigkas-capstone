import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import './UserPretestPage.css';

function UserPretestPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`${ROUTES.TRAINING}?autostart=1`, {
      state: {
        freeTopic: 'Tell me about yourself',
        focus: 'free',
        sessionType: 'pre-test',
        autoStartCountdown: true,
      },
    });
  }, [navigate]);

  return null;
}

export default UserPretestPage;

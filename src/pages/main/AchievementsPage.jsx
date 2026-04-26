import { IoMedalOutline } from 'react-icons/io5';
import './AchievementsPage.css';

export default function AchievementsPage() {
  return (
    <div className="achievements-page">
      <div className="achievements-placeholder-card">
        <div className="achievements-placeholder-icon" aria-hidden="true">
          <IoMedalOutline />
        </div>
        <h1 className="achievements-placeholder-title">Achievements</h1>
        <p className="achievements-placeholder-copy">
          Your achievements and claimable rewards will appear here.
        </p>
      </div>
    </div>
  );
}

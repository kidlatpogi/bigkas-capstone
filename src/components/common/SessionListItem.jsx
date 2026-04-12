import { getScoreTier } from '../../utils/constants';
import { formatDate, formatDuration } from '../../utils/formatters';
import { getSessionSpeechType } from '../../utils/sessionFormatting';
import SpeechTypeBadge from './SpeechTypeBadge';

function SessionListItem({
  session,
  title,
  mode,
  toneClass,
  onClick,
}) {
  const score = session?.confidence_score ?? 0;
  const tier = getScoreTier(score);
  const durationSec = session?.duration_sec ?? session?.duration ?? 0;
  const speechType = getSessionSpeechType(session);

  return (
    <div
      className={`session-row progress-recent-row ${toneClass}`}
      onClick={onClick}
    >
      <div className="session-row-info">
        <p className="session-row-text">{title}</p>
        <p className="session-row-date">
          {formatDate(session?.created_at)}
          {durationSec ? ` • ${formatDuration(durationSec)}` : ''}
        </p>
      </div>
      <div className="session-row-tags">
        <SpeechTypeBadge type={speechType} />
        <span className={`progress-session-tag ${String(mode || '').toLowerCase().replace(/\s+/g, '-')}`}>
          {mode}
        </span>
      </div>
      <span
        className="score-badge"
        style={{ background: `${tier.color}22`, color: tier.color }}
      >
        {score}
      </span>
    </div>
  );
}

export default SessionListItem;

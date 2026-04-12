function SpeechTypeBadge({ type = 'Training Session' }) {
  const className = type === 'Free Speech' 
    ? 'progress-session-tag free-speech' 
    : 'progress-session-tag scripted';

  return (
    <span className={className}>
      {type}
    </span>
  );
}

export default SpeechTypeBadge;

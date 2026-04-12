import { useState } from 'react';
import { useAuthContext } from '../../context/useAuthContext';
import './NicknamePage.css';

/**
 * NicknamePage — shown on first login when the user has no nickname yet.
 * Mirrors the mobile NicknameScreen from Bigkas-mobile repository.
 *
 * Layout (top → bottom):
 *  1. Brand logo
 *  2. "Add your nickname" heading
 *  3. Helper subtitle
 *  4. Nickname text input
 *  5. "Continue" primary button
 *
 * On success the AuthContext optimistically updates user.nickname,
 * causing the NicknameRoute → ProtectedRoute re-evaluation and
 * automatic navigation to /dashboard without manual navigate().
 */
function NicknamePage() {
  const { updateNickname, isLoading } = useAuthContext();

  const [nickname, setNickname]       = useState('');
  const [error, setError]             = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    setError('');
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }

    setIsSubmitting(true);
    const result = await updateNickname(nickname);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Failed to set nickname. Please try again.');
    }
    // On success → AppRouter sees user.nickname set → auto-navigates to Dashboard
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleContinue();
  };

  const loading = isSubmitting || isLoading;

  return (
    <div className="nickname-page">
      <div className="nickname-container">

        <div className="nickname-brand-wrap">
          <span className="nickname-brand-text">Bigkas</span>
        </div>

        {/* Heading */}
        <h1 className="nickname-title">Add your nickname</h1>

        {/* Subtitle */}
        <p className="nickname-subtitle">
          This will be shown on your dashboard. You can change it later in settings.
        </p>

        {/* Input */}
        <div className="nickname-field-wrap">
          <label htmlFor="nickname" className="nickname-label">NICKNAME</label>
          <input
            id="nickname"
            type="text"
            className={`nickname-input ${error ? 'nickname-input-error' : ''}`}
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Maria"
            autoCapitalize="words"
            autoFocus
            disabled={loading}
          />
          {error && <span className="nickname-error">{error}</span>}
        </div>

        {/* Continue button */}
        <button
          className="nickname-btn"
          onClick={handleContinue}
          disabled={loading}
        >
          {loading ? 'Setting up...' : 'Continue'}
        </button>

      </div>
    </div>
  );
}

export default NicknamePage;

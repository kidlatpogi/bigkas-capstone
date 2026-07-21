import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ROUTES } from '../../utils/constants';
import { validatePassword } from '../../utils/validators';
import './CreatePasswordPage.css';

const robotImgUrl = 'https://assets.bigkas.site/Sprites/Robot/0001.webp';
const bigkasLogoUrl = 'https://assets.bigkas.site/Images/Bigkas-Logo.webp';
const LEGACY_LOGIN_LOCKOUT_UNTIL_KEY = 'bigkas_login_lockout_until';
const LOGIN_LOCKED_ACCOUNTS_KEY = 'bigkas_login_locked_accounts';
const LOGIN_FAILED_ATTEMPTS_KEY = 'bigkas_login_failed_attempts';
const LOGIN_GUARD_PREFIX = 'bigkas_login_guard_v1';

function normalizeLoginEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function readLoginStorageMap(key) {
  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return {};
    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : {};
  } catch {
    return {};
  }
}

function writeLoginStorageMap(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function clearStoredLoginLock(email) {
  const normalizedEmail = normalizeLoginEmail(email);
  if (!normalizedEmail || typeof window === 'undefined') return;

  const lockedAccounts = readLoginStorageMap(LOGIN_LOCKED_ACCOUNTS_KEY);
  const failedAttempts = readLoginStorageMap(LOGIN_FAILED_ATTEMPTS_KEY);
  delete lockedAccounts[normalizedEmail];
  delete failedAttempts[normalizedEmail];
  writeLoginStorageMap(LOGIN_LOCKED_ACCOUNTS_KEY, lockedAccounts);
  writeLoginStorageMap(LOGIN_FAILED_ATTEMPTS_KEY, failedAttempts);
  window.localStorage.removeItem(`${LOGIN_GUARD_PREFIX}:user:${normalizedEmail}`);
  window.localStorage.removeItem(LEGACY_LOGIN_LOCKOUT_UNTIL_KEY);
}

function getPasswordScore(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

function CreatePasswordPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('create-password-page-active');
    document.body.classList.add('create-password-page-active');
    return () => {
      document.documentElement.classList.remove('create-password-page-active');
      document.body.classList.remove('create-password-page-active');
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const applySession = (nextSession) => {
      if (!isMounted) return;
      setSession(nextSession || null);
      setEmail(nextSession?.user?.email || '');
      setStatus(nextSession?.user ? 'ready' : 'no-session');
    };

    const loadSession = async () => {
      setStatus('checking');
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (sessionError) {
        setError(sessionError.message || 'We could not read the invite session.');
        setStatus('no-session');
        return;
      }
      applySession(data?.session || null);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession || null);
    });

    loadSession();

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const passwordScore = useMemo(() => getPasswordScore(password), [password]);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordScore];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#2563eb', '#059669'][passwordScore];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!session?.user) {
      setError('This invite link has expired or was already used. Ask an admin to resend the invite.');
      return;
    }

    const validation = validatePassword(password);
    if (!validation.isValid) {
      setError(validation.errors[0]);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message || 'Password was not created. Please try again.');
      setIsSaving(false);
      return;
    }

    clearStoredLoginLock(session.user.email || email);
    await supabase.auth.signOut();
    setIsSaving(false);
    navigate(ROUTES.LOGIN, {
      replace: true,
      state: {
        passwordResetEmail: session.user.email || email,
        message: 'Your password is ready. Please log in to continue.',
      },
    });
  };

  const isChecking = status === 'checking';
  const hasInviteSession = status === 'ready' && session?.user;

  return (
    <main className="create-password-page">
      <section className="create-password-shell" aria-label="Create TalkTics password">
        <div className="create-password-visual">
          <div className="create-password-brand">
            <img src={bigkasLogoUrl} alt="TalkTics" />
            <span>TalkTics</span>
          </div>
          <img className="create-password-robot" src={robotImgUrl} alt="TalkTics AI companion" />
          <div className="create-password-copy">
            <h1>Welcome to TalkTics</h1>
            <p>Create your password to start your public speaking journey.</p>
          </div>
        </div>

        <div className="create-password-panel">
          <div className="create-password-panel-inner">
            <p className="create-password-eyebrow">Account Invite</p>
            <h2>Create Password</h2>
            <p className="create-password-subtitle">
              {email ? `Set the login password for ${email}.` : 'Set your login password from your invite link.'}
            </p>

            {error && <div className="create-password-alert is-error">{error}</div>}

            {isChecking && (
              <div className="create-password-alert">Checking your invite link...</div>
            )}

            {!isChecking && !hasInviteSession && (
              <div className="create-password-empty">
                <strong>Invite link unavailable</strong>
                <p>The link may be expired or already used. You can still use Forgot Password after the account exists.</p>
                <div className="create-password-empty-actions">
                  <Link to={ROUTES.LOGIN}>Return to Login</Link>
                  <Link to={ROUTES.FORGOT_PASSWORD}>Forgot Password</Link>
                </div>
              </div>
            )}

            {hasInviteSession && (
              <form className="create-password-form" onSubmit={handleSubmit}>
                <label>
                  <span>New Password</span>
                  <div className="create-password-input-row">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Password"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword((value) => !value)}>
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>

                {password && (
                  <div className="create-password-strength">
                    <div>
                      <span style={{ width: `${(passwordScore / 4) * 100}%`, background: strengthColor }} />
                    </div>
                    <strong style={{ color: strengthColor }}>{strengthLabel}</strong>
                  </div>
                )}

                <label>
                  <span>Confirm Password</span>
                  <div className="create-password-input-row">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm password"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                    <button type="button" onClick={() => setShowConfirm((value) => !value)}>
                      {showConfirm ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>

                <ul className="create-password-rules" aria-label="Password requirements">
                  <li>At least 8 characters</li>
                  <li>Uppercase and lowercase letters</li>
                  <li>At least 1 number</li>
                </ul>

                <button className="create-password-submit" type="submit" disabled={isSaving}>
                  {isSaving ? 'Creating Password...' : 'Create Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default CreatePasswordPage;

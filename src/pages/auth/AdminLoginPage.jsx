import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import { isValidEmail } from '../../utils/validators';
import { getAssetUrl } from '../../utils/assetUtils';
import PushButton from '../../components/common/PushButton';
import PasswordToggle from '../../components/common/PasswordToggle';
import BackButton from '../../components/common/BackButton';
import './AdminLoginPage.css';

const bigkasLogo = getAssetUrl('Images/Bigkas-Logo.webp');

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { adminLogin, isLoading } = useAuthContext();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Handle page-specific body classes for theming
  useEffect(() => {
    document.body.classList.add('admin-skyward-theme');
    return () => document.body.classList.remove('admin-skyward-theme');
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name] || errors.submit) {
      setErrors(prev => ({ ...prev, [name]: null, submit: null }));
    }
  };

  const validate = () => {
    const next = {};
    if (!formData.email) next.email = 'Email required';
    else if (!isValidEmail(formData.email)) next.email = 'Invalid format';
    if (!formData.password) next.password = 'Password required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading || !validate()) return;

    const result = await adminLogin(formData.email, formData.password);
    if (result.success) {
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    } else {
      setErrors({ submit: result.error || 'Access Denied' });
    }
  };

  return (
    <div className="admin-skyward-container">
      {/* Cinematic Background Elements */}
      <div className="aurora-bg"></div>
      <div className="grid-overlay"></div>

      <BackButton className="admin-back-top" onClick={() => navigate(ROUTES.HOME)} />

      <main className="admin-content">
        <motion.div 
          className="admin-glass-card"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Brand Header */}
          <header className="admin-header">
            <motion.img 
              src={bigkasLogo} 
              alt="Bigkas Logo" 
              className="admin-logo"
              initial={{ rotate: -10, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            />
            <h1 className="admin-title">BIGKAS <span className="admin-subtitle">ADMIN</span></h1>
            <div className="admin-badge">RESTRICTED ACCESS</div>
          </header>

          <form className="admin-form" onSubmit={handleSubmit}>
            <AnimatePresence>
              {errors.submit && (
                <motion.div 
                  className="admin-error-banner"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  {errors.submit}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="input-field">
              <label>IDENTIFIER</label>
              <div className="input-wrapper">
                <input 
                  type="email"
                  name="email"
                  placeholder="admin@bigkas.site"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
                {errors.email && <span className="field-err">{errors.email}</span>}
              </div>
            </div>

            <div className="input-field">
              <label>SECURITY KEY</label>
              <div className="input-wrapper">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <PasswordToggle 
                  isVisible={showPassword} 
                  onToggle={() => setShowPassword(!showPassword)}
                />
                {errors.password && <span className="field-err">{errors.password}</span>}
              </div>
            </div>

            <div className="admin-actions">
              <PushButton
                type="submit"
                disabled={isLoading}
                bgColor="var(--emerald-600)"
                shadowColor="var(--emerald-800)"
                textColor="white"
                className="admin-submit-btn"
              >
                {isLoading ? "AUTHORIZING..." : "ACCESS SYSTEM"}
              </PushButton>
            </div>
          </form>

          <footer className="admin-footer">
            <p>System v4.0.0 | Secured by Supabase RBAC</p>
          </footer>
        </motion.div>
      </main>
    </div>
  );
}
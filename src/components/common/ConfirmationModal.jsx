import { useEffect } from 'react';
import './ConfirmationModal.css';

/**
 * ConfirmationModal — reusable high-fidelity confirmation / alert dialog.
 *
 * Props:
 *   isOpen       {boolean}  — whether the modal is visible
 *   title        {string}   — bold heading
 *   message      {string}   — descriptive body text
 *   onConfirm    {function} — called when the primary action button is pressed
 *   onCancel     {function} — called when Cancel / X / Escape / backdrop are pressed
 *   confirmLabel {string}   — label for the action button (default: 'Confirm')
 *   cancelLabel  {string}   — label for the cancel button (default: 'Cancel')
 *   type         {string}   — 'danger' | 'warning' | 'info' | 'default'
 *                             controls the action button colour
 */
export default function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  type         = 'danger',
}) {
  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="cm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cm-title"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="cm-box">
        {/* Close button */}
        <button className="cm-close" onClick={onCancel} aria-label="Close dialog">
          &#x2715;
        </button>

        <p id="cm-title" className="cm-title">{title}</p>
        <p className="cm-message">{message}</p>

        <div className="cm-actions">
          <button className="cm-btn-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`cm-btn-confirm ${type}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

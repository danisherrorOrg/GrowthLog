import React, { useState, useEffect } from 'react';

export default function PromptModal({ config, onClose }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (config) {
      setInput('');
      setError(false);
    }
  }, [config]);

  if (!config) return null;

  const { title, message, placeholder, expectedValue, confirmLabel, onConfirm, danger } = config;

  const handleConfirm = () => {
    if (expectedValue && input !== expectedValue) {
      setError(true);
      return;
    }
    onConfirm();
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440, animation: 'scaleIn 0.2s ease' }}>
        <div className="modal-header">
          <h3 style={{ color: danger ? 'var(--rust)' : 'var(--ink)' }}>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="page-body">
          <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.6)', lineHeight: 1.6, marginBottom: 20 }}>
            {message}
          </p>

          <div className="form-group">
            <input
              autoFocus
              className="form-input"
              value={input}
              onChange={e => { setInput(e.target.value); setError(false); }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || `Type "${expectedValue}" to confirm`}
              style={{ 
                borderColor: error ? 'var(--rust)' : (input === expectedValue ? 'var(--sage)' : undefined),
                fontWeight: 600,
                textAlign: 'center'
              }}
            />
            {error && (
              <div style={{ fontSize: 11, color: 'var(--rust)', marginTop: 6, textAlign: 'center' }}>
                Incorrect. Please type "{expectedValue}" exactly.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button 
            className={`btn ${danger ? 'btn-rust' : 'btn-primary'}`} 
            onClick={handleConfirm}
            style={{ 
              flex: 1, 
              opacity: input === expectedValue ? 1 : 0.5,
              background: danger && input === expectedValue ? 'var(--rust)' : undefined,
              color: danger && input === expectedValue ? 'white' : undefined
            }}
          >
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ConfirmModal — a styled replacement for window.confirm() for destructive actions.
 *
 * Usage:
 *   const [confirm, setConfirm] = useState(null);
 *   // trigger:
 *   setConfirm({ title: 'Delete Goal?', message: '...', onConfirm: () => doDelete() });
 *   // render:
 *   <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
 */
export default function ConfirmModal({ config, onClose }) {
  if (!config) return null;

  const { title, message, confirmLabel = 'Confirm', danger = true, onConfirm } = config;

  const handleConfirm = () => {
    onConfirm && onConfirm();
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 2000 }}
    >
      <div className="modal" style={{ maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: danger ? 'rgba(196,98,58,0.1)' : 'rgba(107,140,107,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, margin: '0 auto 16px',
          }}>
            {danger ? '⚠️' : '🤔'}
          </div>
          <h3 style={{ fontSize: 20, marginBottom: 8 }}>{title}</h3>
          <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.55)', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-outline"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            className="btn"
            onClick={handleConfirm}
            style={{
              flex: 1,
              background: danger ? 'var(--rust)' : 'var(--sage)',
              color: 'white',
              border: 'none',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

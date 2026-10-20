import { Link, useLocation } from 'react-router-dom';

export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: 16 }}>
      <div className="card modal-sm" style={{ width: '100%', textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }} aria-hidden="true">🍂</div>
        <h2 style={{ marginBottom: 12 }}>Page not found</h2>
        <p style={{ color: 'rgba(13,13,13,0.5)', fontSize: 14, marginBottom: 24, overflowWrap: 'anywhere' }}>
          There's nothing at <code>{pathname}</code>. The link may be old or mistyped.
        </p>
        <Link to="/dashboard" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

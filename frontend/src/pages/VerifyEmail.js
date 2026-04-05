import { useEffect, useState, useRef } from 'react';

import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying, success, error

  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    
    API.get(`/auth/verify/${token}`)
      .then(async () => {
        setStatus('success');
        await refreshUser();
      })
      .catch(() => {
        setStatus('error');
      });
  }, [token, refreshUser]);


  return (
    <div className="auth-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: '40px 32px' }}>
        {status === 'verifying' && (
          <>
            <div className="skeleton" style={{ width: 60, height: 60, borderRadius: '50%', margin: '0 auto 24px' }} />
            <h2 style={{ marginBottom: 12 }}>Verifying your email...</h2>
            <p style={{ color: 'rgba(13,13,13,0.5)', fontSize: 14 }}>One moment while we confirm your address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
            <h2 style={{ marginBottom: 12 }}>Email Verified!</h2>
            <p style={{ color: 'rgba(13,13,13,0.5)', fontSize: 14, marginBottom: 24 }}>
              Your account is now secure. You can now receive reminders and stay consistent.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ width: '100%', justifyContent: 'center' }}>
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 20 }}>❌</div>
            <h2 style={{ marginBottom: 12 }}>Verification Failed</h2>
            <p style={{ color: 'rgba(13,13,13,0.5)', fontSize: 14, marginBottom: 24 }}>
              The link may be expired or invalid. Please try sending a new one from your profile.
            </p>
            <Link to="/profile" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
              Return to Profile
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

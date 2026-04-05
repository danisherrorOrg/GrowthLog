import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import API from '../utils/api';
import { format, parseISO } from 'date-fns';

export default function PublicProfile() {
  const { userId } = useParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    API.get(`/public/u/${userId}`)
      .then(r => setStats(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Profile not found'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(13,13,13,0.5)' }}>Loading Profile...</div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--rust)' }}>{error}</div>;

  const b = [];
  if (stats.longest_streak >= 3) b.push({ icon: '🔥', label: '3-Day Streak' });
  if (stats.longest_streak >= 7) b.push({ icon: '☄️', label: '7-Day Streak' });
  if (stats.longest_streak >= 30) b.push({ icon: '☀️', label: '30-Day Streak' });
  if (stats.total_logs >= 10) b.push({ icon: '📝', label: '10 Logs' });
  if (stats.total_logs >= 50) b.push({ icon: '📚', label: '50 Logs' });
  if (stats.completed_goals >= 1) b.push({ icon: '🎯', label: 'First Goal' });
  if (stats.completed_goals >= 5) b.push({ icon: '🏆', label: '5 Goals' });
  if (stats.total_manifestations >= 1) b.push({ icon: '✨', label: 'Visionary' });
  if (stats.total_snapshots >= 2) b.push({ icon: '📷', label: 'Reflective' });

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', fontFamily: '"Inter", sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontFamily: 'Fraunces', fontSize: 32, marginBottom: 8, color: 'var(--ink)' }}>GrowthLog</h1>
        <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 2 }}>Public Profile</p>
      </div>

      <div className="card" style={{ padding: 40, background: 'white', borderRadius: 24, boxShadow: '0 20px 40px rgba(13,13,13,0.05)' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 32, paddingBottom: 32, borderBottom: '1px solid rgba(13,13,13,0.05)' }}>
          <div style={{ fontSize: 80, lineHeight: 1 }}>{stats.avatar_emoji}</div>
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 4 }}>{stats.name}</h2>
            <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.4)', marginBottom: 12 }}>Member since {format(parseISO(stats.created_at), 'MMM d, yyyy')}</p>
            {stats.bio && <p style={{ fontSize: 15, color: 'rgba(13,13,13,0.7)', fontStyle: 'italic' }}>"{stats.bio}"</p>}
          </div>
        </div>

        <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)', marginBottom: 16 }}>Core Stats</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div style={{ padding: 20, background: 'var(--mist)', borderRadius: 16, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Fraunces', fontSize: 32, color: 'var(--gold)', marginBottom: 8 }}>{stats.streak}</div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(13,13,13,0.5)' }}>Day Streak</div>
          </div>
          <div style={{ padding: 20, background: 'var(--mist)', borderRadius: 16, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Fraunces', fontSize: 32, color: 'var(--sage)', marginBottom: 8 }}>{stats.longest_streak}</div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(13,13,13,0.5)' }}>Best Streak</div>
          </div>
          <div style={{ padding: 20, background: 'var(--mist)', borderRadius: 16, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Fraunces', fontSize: 32, color: 'var(--ink)', marginBottom: 8 }}>{stats.total_logs}</div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(13,13,13,0.5)' }}>Total Logs</div>
          </div>
          <div style={{ padding: 20, background: 'var(--mist)', borderRadius: 16, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Fraunces', fontSize: 32, color: 'var(--ink)', marginBottom: 8 }}>{stats.completed_goals}</div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(13,13,13,0.5)' }}>Goals Met</div>
          </div>
        </div>

        <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)', marginBottom: 16 }}>Earned Badges ({b.length})</h3>
        {b.length === 0 ? (
          <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.4)', fontStyle: 'italic' }}>Journey just beginning...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
            {b.map((badge, i) => (
              <div key={i} style={{ padding: '16px 8px', background: 'white', border: '1px solid rgba(13,13,13,0.08)', borderRadius: 12, textAlign: 'center', boxShadow: '0 2px 8px rgba(13,13,13,0.02)' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{badge.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)' }}>{badge.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <a href="/" style={{ fontSize: 13, color: 'var(--sage)', textDecoration: 'none', fontWeight: 500 }}>Create your own GrowthLog ↗</a>
      </div>
    </div>
  );
}

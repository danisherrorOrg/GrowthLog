import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, subDays, eachDayOfInterval } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    setError(false);
    API.get(`/dashboard?days=${days}`)
      .then((res) => setData(res.data))
      .catch(() => {
        setError(true);
        toast.error('Failed to load dashboard');
      })
      .finally(() => setLoading(false));
  }, [days]);

  const today = new Date();
  const dateRange = eachDayOfInterval({ start: subDays(today, days - 1), end: today });

  if (loading) return (
    <div>
      <div className="page-header">
        <div className="skeleton" style={{ height: 36, width: 200, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 18, width: 300 }} />
      </div>
      <div className="page-body">
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="page-body">
      <div className="empty-state">
        <div className="empty-icon">⚠</div>
        <h3>Failed to load dashboard</h3>
        <p>Something went wrong. Please try again.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  );

  const completionRate = data?.goals?.total > 0
    ? Math.round((data.goals.completed / data.goals.total) * 100)
    : 0;

  return (
    <div>
      <div className="page-header">
        <h2>Good {getGreeting()}, {user?.name?.split(' ')[0]} ✦</h2>
        <p>Here's your growth at a glance</p>
      </div>

      <div className="page-body">
        {/* Time filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[7, 30, 60, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-outline'}`}
            >
              {d}d
            </button>
          ))}
        </div>

        {/* Stat cards */}
        <div className="grid-4" style={{ marginBottom: 28 }}>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--gold)' }}>{data?.streak || 0}</div>
            <div className="stat-label">🔥 Current Streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data?.total_logs || 0}</div>
            <div className="stat-label">✦ Days Logged</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--sage)' }}>{completionRate}%</div>
            <div className="stat-label">◇ Goal Completion</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data?.longest_streak || 0}</div>
            <div className="stat-label">◎ Best Streak</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 28 }}>
          {/* Heatmap */}
          <div className="card">
            <div className="section-title">
              <span>Activity Heatmap</span>
              <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', fontFamily: 'DM Sans' }}>Last {days} days</span>
            </div>
            <div className="heatmap">
              {dateRange.map((d) => {
                const key = format(d, 'yyyy-MM-dd');
                const rating = data?.heatmap?.[key];
                const level = rating ? Math.ceil(rating / 2) : 0;
                return (
                  <div
                    key={key}
                    className={`heatmap-cell ${rating ? `logged-${Math.min(level, 5)}` : ''}`}
                    title={`${format(d, 'MMM d')}: ${rating ? `rated ${rating}/10` : 'no log'}`}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, color: 'rgba(13,13,13,0.4)' }}>
              <span>Less</span>
              {[0,1,2,3,4,5].map(l => (
                <div key={l} style={{ width: 12, height: 12, borderRadius: 2, background: l === 0 ? 'var(--mist)' : `rgba(107,140,107,${l * 0.18})` }} />
              ))}
              <span>More</span>
            </div>
          </div>

          {/* Category consistency */}
          <div className="card">
            <div className="section-title">Category Consistency</div>
            {data?.category_consistency?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(13,13,13,0.4)', fontSize: 14 }}>
                No categories yet. <button className="btn btn-ghost btn-sm" onClick={() => navigate('/categories')}>Add one →</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(data?.category_consistency || []).map((cat) => (
                  <div key={cat.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span>{cat.icon} {cat.name}</span>
                      <span style={{ color: 'rgba(13,13,13,0.45)' }}>{cat.count} / {data.total_logs} days</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${cat.percentage}%`, background: cat.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Goals summary + Manifestations */}
        <div className="grid-2">
          <div className="card">
            <div className="section-title">
              <span>Goals Overview</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/goals')}>View all →</button>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontFamily: 'Fraunces', fontSize: 32, color: 'var(--sage)' }}>{data?.goals?.active || 0}</div>
                <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Active</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontFamily: 'Fraunces', fontSize: 32, color: 'var(--gold)' }}>{data?.goals?.completed || 0}</div>
                <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Completed</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontFamily: 'Fraunces', fontSize: 32 }}>{data?.goals?.total || 0}</div>
                <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Total</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
            <div className="section-title" style={{ color: 'var(--paper)' }}>
              <span>Manifestations</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/manifestations')} style={{ color: 'rgba(245,240,232,0.5)' }}>View →</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontFamily: 'Fraunces', fontSize: 48, color: 'var(--gold)' }}>
                {data?.active_manifestations || 0}
              </div>
              <div>
                <div style={{ fontSize: 15, color: 'rgba(245,240,232,0.8)', marginBottom: 4 }}>Active visions</div>
                <div style={{ fontSize: 13, color: 'rgba(245,240,232,0.4)' }}>Manifesting your future self</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick log CTA */}
        {!data?.heatmap?.[format(today, 'yyyy-MM-dd')] && (
          <div className="card" style={{ marginTop: 24, background: 'linear-gradient(135deg, var(--sage) 0%, #4a6b4a 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ color: 'white', marginBottom: 4 }}>Today's log is waiting ✦</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>You haven't logged today yet. Keep your streak alive.</p>
            </div>
            <button className="btn" style={{ background: 'white', color: 'var(--sage)', fontWeight: 600 }} onClick={() => navigate('/log')}>
              Log Now →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting(hour = new Date().getHours()) {
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

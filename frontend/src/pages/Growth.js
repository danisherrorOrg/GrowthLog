import { useEffect, useState } from 'react';
import API from '../utils/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, BarChart, Bar
} from 'recharts';
import { format, parseISO } from 'date-fns';

export default function Growth() {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      API.get(`/dashboard?days=${days}`),
      API.get(`/logs?days=${days}`)
    ]).then(([dash, logsRes]) => {
      setData(dash.data);
      setLogs(logsRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [days]);

  const moodTrend = (data?.mood_trend || []).map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    mood: d.mood,
  }));

  const radarData = (data?.category_consistency || []).map(cat => ({
    category: cat.name,
    consistency: cat.percentage,
    fullMark: 100,
  }));

  const emotionMap = {};
  logs.forEach(log => {
    log.entries?.forEach(entry => {
      entry.emotions?.forEach(em => {
        emotionMap[em] = (emotionMap[em] || 0) + 1;
      });
    });
  });
  const emotionData = Object.entries(emotionMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const avgMood = moodTrend.length > 0
    ? (moodTrend.reduce((s, d) => s + d.mood, 0) / moodTrend.length).toFixed(1)
    : '—';

  if (loading) return (
    <div className="page-body">
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 200, marginBottom: 20, borderRadius: 16 }} />)}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h2>Growth ◎</h2>
        <p>Your patterns, trends, and progress visualized</p>
      </div>

      <div className="page-body">
        {/* Time filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[7, 14, 30, 60, 90].map(d => (
            <button key={d} className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDays(d)}>
              {d}d
            </button>
          ))}
        </div>

        {/* Summary stats */}
        <div className="grid-4" style={{ marginBottom: 28 }}>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--sage)' }}>{avgMood}</div>
            <div className="stat-label">Avg Mood</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data?.total_logs || 0}</div>
            <div className="stat-label">Days Logged</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--gold)' }}>{data?.streak || 0}</div>
            <div className="stat-label">🔥 Streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data?.goals?.completed || 0}</div>
            <div className="stat-label">Goals Done</div>
          </div>
        </div>

        {/* Mood trend */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title">
            <span>Mood Trend</span>
            <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', fontFamily: 'DM Sans' }}>Last {days} days</span>
          </div>
          {moodTrend.length < 2 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(13,13,13,0.4)', fontSize: 14 }}>
              Log at least 2 days to see your mood trend
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={moodTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,13,13,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(13,13,13,0.4)' }} />
                <YAxis domain={[1, 10]} tick={{ fontSize: 11, fill: 'rgba(13,13,13,0.4)' }} />
                <Tooltip
                  contentStyle={{ fontFamily: 'DM Sans', fontSize: 13, border: '1px solid rgba(13,13,13,0.1)', borderRadius: 8 }}
                  formatter={(v) => [`${v}/10`, 'Mood']}
                />
                <Line type="monotone" dataKey="mood" stroke="#6b8c6b" strokeWidth={2.5}
                  dot={{ fill: '#6b8c6b', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid-2" style={{ marginBottom: 24 }}>
          {/* Category radar */}
          <div className="card">
            <div className="section-title">Life Balance Radar</div>
            {radarData.length < 3 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(13,13,13,0.4)', fontSize: 14 }}>
                Add 3+ categories to see your life balance
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(13,13,13,0.08)" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: 'rgba(13,13,13,0.5)' }} />
                  <Radar name="Consistency" dataKey="consistency" stroke="#6b8c6b" fill="#6b8c6b" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top emotions */}
          <div className="card">
            <div className="section-title">Top Emotions</div>
            {emotionData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(13,13,13,0.4)', fontSize: 14 }}>
                Tag emotions in your daily logs to see patterns
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={emotionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,13,13,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'rgba(13,13,13,0.4)' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'rgba(13,13,13,0.5)' }} width={80} />
                  <Tooltip
                    contentStyle={{ fontFamily: 'DM Sans', fontSize: 13, border: '1px solid rgba(13,13,13,0.1)', borderRadius: 8 }}
                    formatter={(v) => [v, 'Times']}
                  />
                  <Bar dataKey="count" fill="#c9a84c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="card">
          <div className="section-title">Category Deep Dive</div>
          {(data?.category_consistency || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(13,13,13,0.4)', fontSize: 14 }}>
              No category data yet. Start logging your days.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {(data?.category_consistency || [])
                .sort((a, b) => b.percentage - a.percentage)
                .map((cat) => (
                  <div key={cat.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{cat.icon}</span>
                        <span style={{ fontWeight: 500 }}>{cat.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, color: 'rgba(13,13,13,0.4)' }}>{cat.count} logs</span>
                        <span style={{
                          fontFamily: 'Fraunces', fontSize: 18,
                          color: cat.percentage >= 80 ? 'var(--sage)' : cat.percentage >= 50 ? 'var(--gold)' : 'var(--rust)'
                        }}>{cat.percentage}%</span>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{
                        width: `${cat.percentage}%`,
                        background: cat.percentage >= 80 ? 'var(--sage)' : cat.percentage >= 50 ? 'var(--gold)' : 'var(--rust)'
                      }} />
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>
                      {cat.percentage >= 80 ? '🌱 Excellent consistency' : cat.percentage >= 50 ? '⚡ Room to grow' : '⚠️ Needs attention'}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import API from '../utils/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, BarChart, Bar, AreaChart, Area, ComposedChart
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

  // Mood + energy combined
  const moodEnergyTrend = (data?.mood_trend || []).map((d, i) => ({
    date: format(parseISO(d.date), 'MMM d'),
    mood: d.mood,
    energy: data?.energy_trend?.[i]?.energy ?? null,
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
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Category mood avg data
  const catMoodData = (data?.category_consistency || []).map(cat => ({
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    avgMood: cat.avg_mood || 5,
    consistency: cat.percentage,
  })).sort((a, b) => b.avgMood - a.avgMood);

  // Weekly summary
  const weeklyData = (data?.weekly_summary || []).map(w => ({
    week: w.week,
    logs: w.logs,
    avgMood: w.avg_mood,
    avgEnergy: w.avg_energy,
  }));

  const avgMood = moodEnergyTrend.length > 0
    ? (moodEnergyTrend.reduce((s, d) => s + d.mood, 0) / moodEnergyTrend.length).toFixed(1)
    : '—';
  const avgEnergy = moodEnergyTrend.length > 0 && data?.energy_trend?.length > 0
    ? (data.energy_trend.reduce((s, d) => s + d.energy, 0) / data.energy_trend.length).toFixed(1)
    : '—';

  const tooltipStyle = { fontFamily: 'DM Sans', fontSize: 13, border: '1px solid rgba(13,13,13,0.1)', borderRadius: 8 };

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
            <div className="stat-value" style={{ color: 'var(--gold)' }}>{avgEnergy}</div>
            <div className="stat-label">Avg Energy</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data?.total_logs || 0}</div>
            <div className="stat-label">Days Logged</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--gold)' }}>{data?.streak || 0}</div>
            <div className="stat-label">🔥 Streak</div>
          </div>
        </div>

        {/* Mood + Energy combined chart */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title">
            <span>Mood & Energy Trend</span>
            <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', fontFamily: 'DM Sans' }}>Last {days} days</span>
          </div>
          {moodEnergyTrend.length < 2 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(13,13,13,0.4)', fontSize: 14 }}>
              Log at least 2 days to see your trend
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={moodEnergyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,13,13,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(13,13,13,0.4)' }} />
                <YAxis domain={[1, 10]} tick={{ fontSize: 11, fill: 'rgba(13,13,13,0.4)' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v}/10`, n === 'mood' ? 'Mood' : 'Energy']} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="mood" fill="rgba(107,140,107,0.1)" stroke="#6b8c6b" strokeWidth={2.5} name="mood" dot={{ fill: '#6b8c6b', r: 3 }} />
                <Line type="monotone" dataKey="energy" stroke="#c9a84c" strokeWidth={2} name="energy" dot={{ fill: '#c9a84c', r: 3 }} strokeDasharray="4 2" />
              </ComposedChart>
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
                  <Radar name="Consistency %" dataKey="consistency" stroke="#6b8c6b" fill="#6b8c6b" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Consistency']} />
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
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Times']} />
                  <Bar dataKey="count" fill="#c9a84c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Weekly summary chart */}
        {weeklyData.length >= 2 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="section-title">
              <span>Weekly Summary</span>
              <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', fontFamily: 'DM Sans' }}>Avg mood & energy by week</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,13,13,0.05)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'rgba(13,13,13,0.4)' }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: 'rgba(13,13,13,0.4)' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v}/10`, n === 'avgMood' ? 'Avg Mood' : n === 'avgEnergy' ? 'Avg Energy' : n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="avgMood" name="Avg Mood" fill="#6b8c6b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgEnergy" name="Avg Energy" fill="#c9a84c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category mood comparison */}
        {catMoodData.length >= 2 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="section-title">Category Avg Mood</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={catMoodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,13,13,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(13,13,13,0.4)' }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: 'rgba(13,13,13,0.4)' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}/10`, 'Avg Mood']} />
                <Bar dataKey="avgMood" radius={[4, 4, 0, 0]}>
                  {catMoodData.map((entry, index) => (
                    <rect key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category breakdown */}
        <div className="card">
          <div className="section-title">Category Consistency Deep Dive</div>
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
                        <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)' }}>avg mood {cat.avg_mood}/10</span>
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
                        background: cat.color || (cat.percentage >= 80 ? 'var(--sage)' : cat.percentage >= 50 ? 'var(--gold)' : 'var(--rust)')
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

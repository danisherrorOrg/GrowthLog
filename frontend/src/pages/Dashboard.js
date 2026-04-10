import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar
} from 'recharts';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [days, setDays] = useState(30);
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    API.get('/quotes/random').then(r => {
      if (r.data) {
        setQuote({ text: r.data.content, author: r.data.author });
      } else {
        API.get('/prompts/quote').then(res => setQuote(res.data)).catch(() => {});
      }
    }).catch(() => {
      API.get('/prompts/quote').then(res => setQuote(res.data)).catch(() => {});
    });
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await API.get(`/dashboard?days=${days}`);
        setData(res.data);
      } catch (err) {
        setError(true);
        toast.error(getErrorMessage(err, 'Failed to load dashboard'));
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [days]);

  const [hoveredData, setHoveredData] = useState(null);

  // Group days into weeks for the heatmap
  const today = new Date();
  const startDate = subDays(today, days - 1);
  const dateRange = eachDayOfInterval({ start: startDate, end: today });
  
  // Create a map of weeks for a vertical column layout
  const weeks = [];
  let currentWeek = [];
  
  // Fill initial week if it's partial
  const firstDay = startOfWeek(startDate);
  let d = firstDay;
  while (d < startDate) {
    currentWeek.push({ date: d, padding: true });
    d = new Date(d.getTime() + 86400000);
  }

  dateRange.forEach((date) => {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push({ date, padding: false });
  });
  
  // Fill last week if partial
  while (currentWeek.length < 7) {
    currentWeek.push({ date: null, padding: true });
  }
  weeks.push(currentWeek);

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
        {/* Insights Section */}
        {data?.insights?.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div className="section-title" style={{ marginBottom: 14 }}>
              <span>Behavioral Insights ✦</span>
              <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', fontFamily: 'DM Sans' }}>AI-generated patterns from your logs</span>
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {data.insights.map((insight, i) => (
                <div key={i} className="card" style={{ 
                  minWidth: 300, flex: 1, padding: '16px 20px', 
                  background: `linear-gradient(135deg, white 0%, ${insight.color}05 100%)`,
                  borderLeft: `4px solid ${insight.color}`,
                  display: 'flex', alignItems: 'center', gap: 14,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ fontSize: 24 }}>
                    {insight.type === 'top_performer' ? '📈' : insight.type === 'mood_booster' ? '✨' : '⚖️'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, fontWeight: 500 }}>
                    {insight.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Onboarding Nudge for New Users */}
        {user?.total_logs === 0 && (
          <div className="card" style={{ 
            marginBottom: 28, 
            background: 'var(--mist)', 
            border: '2px dashed var(--sage)', 
            padding: '32px 40px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🌱</div>
            <h3 style={{ fontFamily: 'Fraunces', fontSize: 24, marginBottom: 12 }}>Welcome to your growth story</h3>
            <p style={{ maxWidth: 500, margin: '0 auto 24px', color: 'rgba(13,13,13,0.6)', lineHeight: 1.6 }}>
              GrowthLog is built on the compound effect of small, daily reflections. 
              The best way to start is by capturing who you are today.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate('/snapshots')}>Take a Snapshot ○</button>
              <button className="btn btn-outline" onClick={() => navigate('/log')}>Log your first day ✦</button>
            </div>
          </div>
        )}

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

        {/* Quote of the Day */}
        {quote && (
          <div className="card" style={{ 
            marginBottom: 28, 
            padding: '24px 32px', 
            background: 'rgba(201,168,76,0.04)', 
            border: '1px solid rgba(201,168,76,0.15)',
            textAlign: 'center',
            borderRadius: 20
          }}>
            <div style={{ fontSize: 24, color: 'var(--gold)', marginBottom: 12 }}>“</div>
            <div className="markdown-body" style={{ 
              fontFamily: 'Fraunces', 
              fontSize: 20, 
              color: 'var(--ink)', 
              lineHeight: 1.6, 
              margin: '0 auto 8px',
              fontStyle: 'italic',
              maxWidth: 600
            }}>
              <MarkdownRenderer content={quote.text} />
            </div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(13,13,13,0.4)' }}>
              — {quote.author}
            </div>
          </div>
        )}

        <div className="grid-4" style={{ marginBottom: 20 }}>
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
            <div className="stat-value">{data?.total_time_spent || 0}</div>
            <div className="stat-label">⏱ Total Min Spent</div>
          </div>
        </div>

        {/* Quick log CTA — shown prominently before charts */}
        {!data?.heatmap?.[format(today, 'yyyy-MM-dd')] && (
          <div className="card" style={{ marginBottom: 28, background: 'linear-gradient(135deg, var(--sage) 0%, #4a6b4a 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px' }}>
            <div>
              <h3 style={{ color: 'white', marginBottom: 4 }}>Today's log is waiting ✦</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>You haven't logged today yet. Keep your streak alive.</p>
            </div>
            <button className="btn" style={{ background: 'white', color: 'var(--sage)', fontWeight: 600, flexShrink: 0 }} onClick={() => navigate('/log')}>
              Log Now →
            </button>
          </div>
        )}


        <div className="grid-2" style={{ marginBottom: 28 }}>
          {/* Heatmap */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="section-title" style={{ marginBottom: 20 }}>
              <span>Activity Heatmap</span>
              <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', fontFamily: 'DM Sans' }}>Last {days} days</span>
            </div>
            
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 16 }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {week.map((day, di) => {
                    if (day.padding || !day.date) return <div key={di} className="heatmap-cell" style={{ opacity: 0 }} />;
                    
                    const key = format(day.date, 'yyyy-MM-dd');
                    const entry = data?.heatmap?.[key];
                    const rating = entry?.rating || 0;
                    const level = rating ? Math.ceil(rating / 2) : 0;
                    
                    return (
                      <div
                        key={key}
                        onMouseEnter={() => setHoveredData({ date: day.date, ...entry })}
                        onMouseLeave={() => setHoveredData(null)}
                        onClick={() => navigate(`/log?date=${key}`)}
                        className={`heatmap-cell ${rating ? `logged-${Math.min(level, 5)}` : ''}`}
                        title={`${format(day.date, 'MMM d')}${rating ? ` · Rating ${rating}/10` : ' · No entry — click to log'}`}
                        style={{ cursor: 'pointer', transition: 'all 0.2s ease', transform: hoveredData?.date === day.date ? 'scale(1.2)' : 'scale(1)' }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Tooltip / Insight Area */}
            <div style={{ 
              marginTop: 'auto', 
              padding: '12px 16px', 
              background: 'var(--mist)', 
              borderRadius: 12, 
              minHeight: 80,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              border: '1.5px solid rgba(13,13,13,0.05)',
              transition: 'all 0.3s ease'
            }}>
              {hoveredData ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{format(hoveredData.date, 'EEEE, MMMM do')}</span>
                    {hoveredData.rating ? (
                      <span className="tag tag-green" style={{ fontSize: 10 }}>Rating: {hoveredData.rating}/10</span>
                    ) : (
                      <span className="tag tag-mist" style={{ fontSize: 10 }}>No entry</span>
                    )}
                  </div>
                  <div className="markdown-body" style={{ fontSize: 12, color: 'rgba(13,13,13,0.6)', fontStyle: hoveredData.highlight ? 'normal' : 'italic', margin: 0, lineHeight: 1.4 }}>
                    {hoveredData.highlight ? (
                      <MarkdownRenderer content={hoveredData.highlight} />
                    ) : (
                      <p style={{ margin: 0, fontSize: 12, fontStyle: 'italic' }}>
                        {hoveredData.rating ? "Detailed log captured for this day." : "Take a moment to reflect and log today's growth."}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', opacity: 0.5 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink)' }}>Hover over a day for insights ✦</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 11, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <span>Low</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {[0,1,2,3,4,5].map(l => (
                  <div key={l} style={{ width: 10, height: 10, borderRadius: 2, background: l === 0 ? 'var(--mist)' : `rgba(107,140,107,${0.2 + (l * 0.16)})` }} />
                ))}
              </div>
              <span>High</span>
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
                  <div key={cat.id}>
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

        {/* Growth Trends & Life Balance */}
        <div className="grid-2" style={{ marginBottom: 28 }}>
          <div className="card" style={{ height: 400, display: 'flex', flexDirection: 'column' }}>
            <div className="section-title" style={{ marginBottom: 20 }}>
              <span>Growth Trends</span>
              <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', fontFamily: 'DM Sans' }}>Mood vs Energy</span>
            </div>
            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.mood_trend?.map((m, i) => ({ ...m, energy: data?.energy_trend?.[i]?.energy || 5 }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(13,13,13,0.05)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'rgba(13,13,13,0.4)' }}
                    minTickGap={30}
                    tickFormatter={(str) => {
                      try { return format(parseISO(str), 'MMM d'); } catch(e) { return str; }
                    }}
                  />
                  <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(13,13,13,0.4)' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontFamily: 'DM Sans', fontSize: 12 }}
                    labelFormatter={(label) => {
                      try { return format(parseISO(label), 'EEEE, MMMM do'); } catch(e) { return label; }
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line type="monotone" dataKey="mood" stroke="var(--sage)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Mood" />
                  <Line type="monotone" dataKey="energy" stroke="var(--gold)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Energy" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ height: 400, display: 'flex', flexDirection: 'column' }}>
            <div className="section-title" style={{ marginBottom: 20 }}>
              <span>Life Balance</span>
              <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', fontFamily: 'DM Sans' }}>Time & Mood Distribution</span>
            </div>
            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data?.radar_data || []}>
                  <PolarGrid stroke="rgba(13,13,13,0.05)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'rgba(13,13,13,0.4)' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} axisLine={false} tick={false} />
                  <Radar
                    name="Mood"
                    dataKey="mood"
                    stroke="var(--sage)"
                    fill="var(--sage)"
                    fillOpacity={0.5}
                  />
                  <Radar
                    name="Activity"
                    dataKey="activity"
                    stroke="var(--gold)"
                    fill="var(--gold)"
                    fillOpacity={0.3}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  <RechartsTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Emotion Trends Section */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div className="section-title" style={{ marginBottom: 24 }}>
            <span>Emotional Palette</span>
            <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', fontFamily: 'DM Sans' }}>Frequency of feelings recently</span>
          </div>
          <div style={{ height: 280 }}>
            {data?.emotion_trends?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={data.emotion_trends} margin={{ left: 40, right: 40 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--ink)' }} width={100} />
                  <RechartsTooltip cursor={{ fill: 'rgba(13,13,13,0.02)' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 12 }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {data.emotion_trends.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsla(${140 + (index * 15)}, 20%, 50%, ${1 - (index * 0.08)})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(13,13,13,0.3)', fontSize: 14 }}>
                Log your daily check-ins to see emotional trends ✦
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
            {/* Donut chart + legend */}
            {(data?.goals?.total || 0) > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 140, height: 140, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Active', value: data?.goals?.active || 0 },
                          { name: 'Completed', value: data?.goals?.completed || 0 },
                          { name: 'Remaining', value: Math.max(0, (data?.goals?.total || 0) - (data?.goals?.active || 0) - (data?.goals?.completed || 0)) }
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%"
                        innerRadius={42} outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill="var(--sage)" />
                        <Cell fill="#c9a84c" />
                        <Cell fill="rgba(13,13,13,0.08)" />
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--sage)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, flex: 1, color: 'rgba(13,13,13,0.7)' }}>Active</span>
                    <span style={{ fontFamily: 'Fraunces', fontSize: 22, color: 'var(--sage)' }}>{data?.goals?.active || 0}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#c9a84c', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, flex: 1, color: 'rgba(13,13,13,0.7)' }}>Completed</span>
                    <span style={{ fontFamily: 'Fraunces', fontSize: 22, color: '#c9a84c' }}>{data?.goals?.completed || 0}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(13,13,13,0.15)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, flex: 1, color: 'rgba(13,13,13,0.7)' }}>Total</span>
                    <span style={{ fontFamily: 'Fraunces', fontSize: 22 }}>{data?.goals?.total || 0}</span>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Completion rate</div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${completionRate}%`, background: 'var(--sage)' }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(13,13,13,0.4)', fontSize: 14 }}>
                No goals yet. <button className="btn btn-ghost btn-sm" onClick={() => navigate('/goals')}>Add one →</button>
              </div>
            )}
          </div>

          <div className="card" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
            <div className="section-title" style={{ color: 'var(--paper)' }}>
              <span>Manifestations</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/manifestations')} style={{ color: 'rgba(245,240,232,0.5)' }}>View →</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontFamily: 'Fraunces', fontSize: 48, color: 'var(--sage)' }}>
                {data?.active_manifestations || 0}
              </div>
              <div>
                <div style={{ fontSize: 15, color: 'rgba(245,240,232,0.8)', marginBottom: 4 }}>Active visions</div>
                <div style={{ fontSize: 13, color: 'rgba(245,240,232,0.4)' }}>Manifesting your future self</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
            <div className="section-title" style={{ color: 'var(--paper)' }}>
              <span>Action Board</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/todos')} style={{ color: 'rgba(245,240,232,0.5)' }}>View →</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontFamily: 'Fraunces', fontSize: 48, color: 'var(--gold)' }}>
                {data?.todos_pending || 0}
              </div>
              <div>
                <div style={{ fontSize: 15, color: 'rgba(245,240,232,0.8)', marginBottom: 4 }}>Pending actions</div>
                <div style={{ fontSize: 13, color: 'rgba(245,240,232,0.4)' }}>What's your next step?</div>
              </div>
            </div>
          </div>
        </div>


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

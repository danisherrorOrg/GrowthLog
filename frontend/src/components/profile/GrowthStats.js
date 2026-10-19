import {
  BarChart, Bar, ResponsiveContainer, Tooltip as RechartsTooltip, Cell
} from 'recharts';
import { BADGES } from './badges';

export default function GrowthStats({ stats, sparklineData }) {
  const completionRate = stats.total_goals > 0
    ? Math.round((stats.completed_goals / stats.total_goals) * 100)
    : 0;

  const maxBarCount = Math.max(...sparklineData.map(d => d.count), 1);

  return (
    <div>
      <h3 style={{ fontFamily: 'Fraunces', fontSize: 20, marginBottom: 16 }}>Your Growth in Numbers</h3>

      {/* Sparkline activity chart */}
      {sparklineData.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
          <div className="profile-sparkline-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'Fraunces', fontSize: 17, color: 'var(--ink)' }}>Log Consistency</div>
              <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', marginTop: 2 }}>Days logged per week · last 12 weeks</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Fraunces', fontSize: 28, color: 'var(--sage)', lineHeight: 1 }}>{stats.total_logs}</div>
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Total days logged</div>
            </div>
          </div>
          <div style={{ height: 72 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sparklineData} barSize={14} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <RechartsTooltip
                  cursor={{ fill: 'rgba(13,13,13,0.03)' }}
                  contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 }}
                  formatter={(val) => [`${val} day${val !== 1 ? 's' : ''}`, 'Logged']}
                  labelFormatter={(label) => `Week of ${label}`}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {sparklineData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.count === 0
                        ? 'var(--mist)'
                        : entry.count >= 5
                          ? 'var(--sage)'
                          : `rgba(107,140,107,${0.3 + (entry.count / maxBarCount) * 0.7})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <span>{sparklineData[0]?.week}</span>
            <span style={{ flex: 1, textAlign: 'center' }}>↔</span>
            <span>{sparklineData[sparklineData.length - 1]?.week}</span>
          </div>
        </div>
      )}

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Days Logged', value: stats.total_logs, icon: '✦', color: 'var(--sage)' },
          { label: 'Goals Created', value: stats.total_goals, icon: '◇', color: 'var(--ink)' },
          { label: 'Goals Completed', value: stats.completed_goals, icon: '✅', color: '#c9a84c' },
          { label: 'Days Journaling', value: stats.days_since_join, icon: '📅', color: 'var(--ink)' },
          { label: 'Manifestations', value: stats.total_manifestations, icon: '✧', color: 'var(--ink)' },
          { label: 'Visions Achieved', value: stats.completed_manifestations, icon: '⭐', color: '#c9a84c' },
          { label: 'Snapshots Taken', value: stats.total_snapshots, icon: '○', color: 'var(--ink)' },
          { label: 'Categories Active', value: stats.total_categories, icon: '▦', color: 'var(--sage)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.icon} {s.label}</div>
          </div>
        ))}
      </div>

      {/* Goal rate banner */}
      <div className="card" style={{ background: 'var(--ink)', color: 'var(--paper)', marginBottom: 32 }}>
        <div className="profile-goal-banner-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontFamily: 'Fraunces', fontSize: 22, color: 'var(--gold)', marginBottom: 4 }}>
              {completionRate}% Goal Completion Rate
            </h3>
            <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.5)' }}>
              {stats.completed_goals} of {stats.total_goals} goals achieved
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Fraunces', fontSize: 36, color: 'var(--sage)' }}>{stats.longest_streak}</div>
            <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Best Streak</div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
          <div style={{ width: `${completionRate}%`, height: '100%', background: 'var(--gold)', borderRadius: 4, transition: 'width 0.6s ease' }} />
        </div>
      </div>

      {/* Badges */}
      <h3 style={{ fontFamily: 'Fraunces', fontSize: 20, marginBottom: 16 }}>Your Milestones & Badges</h3>
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {BADGES.map(b => {
          const unlocked = b.check(stats);
          const prog = b.progress(stats);
          const pct = Math.round((prog.current / prog.total) * 100);
          const remaining = prog.total - prog.current;
          return (
            <div key={b.label} className="card" style={{
              textAlign: 'center',
              position: 'relative',
              background: unlocked ? 'var(--mist)' : 'white',
              border: unlocked ? '1px solid rgba(107,140,107,0.2)' : '1px dashed rgba(13,13,13,0.15)',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}>
              {unlocked && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'var(--sage)', color: 'white',
                  borderRadius: '50%', width: 20, height: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700
                }}>✓</div>
              )}
              <div style={{
                fontSize: 32, marginBottom: 8,
                filter: unlocked ? 'none' : 'grayscale(80%)',
                opacity: unlocked ? 1 : 0.6,
                transition: 'all 0.2s',
              }}>{b.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: unlocked ? 'var(--ink)' : 'rgba(13,13,13,0.5)', marginBottom: 4 }}>{b.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginBottom: unlocked ? 0 : 10 }}>{b.desc}</div>

              {/* Progress bar for locked badges */}
              {!unlocked && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ background: 'rgba(13,13,13,0.07)', borderRadius: 3, height: 4, overflow: 'hidden', marginBottom: 5 }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: pct > 60 ? 'var(--gold)' : pct > 30 ? 'var(--sage-light)' : 'rgba(107,140,107,0.4)',
                      borderRadius: 3,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(13,13,13,0.4)', fontStyle: 'italic' }}>
                    {remaining > 0
                      ? `${remaining} more ${prog.unit} to go`
                      : 'Almost there!'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

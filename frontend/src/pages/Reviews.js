import { useEffect, useState, useCallback } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errors';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, subWeeks, subMonths, subYears,
  parseISO, addWeeks, addMonths, addYears
} from 'date-fns';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, PolarRadiusAxis, BarChart, Bar, XAxis, Tooltip, Cell } from 'recharts';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import ConfirmModal from '../components/ui/ConfirmModal';

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d) { return format(d, 'yyyy-MM-dd'); }

function getPeriodRange(type, offset = 0) {
  const now = new Date();
  if (type === 'weekly') {
    const base = offset === 0 ? now : offset < 0 ? subWeeks(now, -offset) : addWeeks(now, offset);
    const start = startOfWeek(base, { weekStartsOn: 1 });
    const end = endOfWeek(base, { weekStartsOn: 1 });
    return { start: fmt(start), end: fmt(end), label: `Week of ${format(start, 'MMM d, yyyy')}` };
  }
  if (type === 'monthly') {
    const base = offset === 0 ? now : offset < 0 ? subMonths(now, -offset) : addMonths(now, offset);
    const start = startOfMonth(base);
    const end = endOfMonth(base);
    return { start: fmt(start), end: fmt(end), label: format(start, 'MMMM yyyy') };
  }
  // yearly
  const base = offset === 0 ? now : offset < 0 ? subYears(now, -offset) : addYears(now, offset);
  const start = startOfYear(base);
  const end = endOfYear(base);
  return { start: fmt(start), end: fmt(end), label: format(start, 'yyyy') };
}

const PERIOD_TYPES = [
  { key: 'weekly',  label: 'Weekly',  icon: '📅' },
  { key: 'monthly', label: 'Monthly', icon: '🗓️' },
  { key: 'yearly',  label: 'Yearly',  icon: '🌅' },
];

const REFLECTION_FIELDS = [
  { key: 'wins',        label: '🏆 Wins',       placeholder: 'What went well? What are you proud of?', color: 'var(--sage)' },
  { key: 'challenges',  label: '⚡ Challenges',  placeholder: 'What was difficult? What drained you?', color: 'var(--rust)' },
  { key: 'learnings',   label: '💡 Learnings',   placeholder: 'What did you learn about yourself or the world?', color: '#8b6bc4' },
  { key: 'intentions',  label: '🎯 Intentions',  placeholder: `What do you intend for the next period?`, color: 'var(--gold)' },
];

// ── Stat Badge ────────────────────────────────────────────────────────────────
function StatBadge({ icon, value, label, color = 'var(--ink)', sub }) {
  return (
    <div style={{
      background: 'white', border: '1px solid rgba(13,13,13,0.06)',
      borderRadius: 16, padding: '18px 20px', display: 'flex',
      flexDirection: 'column', gap: 4, flex: '1 1 140px', minWidth: 130,
      boxShadow: '0 2px 10px rgba(13,13,13,0.04)',
    }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)', fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.35)' }}>{sub}</div>}
    </div>
  );
}

// ── Past Review Card ──────────────────────────────────────────────────────────
function PastReviewCard({ review, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  const fields = REFLECTION_FIELDS.filter(f => review[f.key]?.trim());
  return (
    <div style={{
      border: '1px solid rgba(13,13,13,0.07)', borderRadius: 16,
      overflow: 'hidden', transition: 'box-shadow 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(13,13,13,0.07)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', background: 'white', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 16, color: 'rgba(13,13,13,0.35)' }}>{open ? '▼' : '▶'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{review.period_label}</div>
            <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 2 }}>
              {review.start_date} → {review.end_date}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {review.rating && (
            <span style={{
              background: 'var(--mist)', borderRadius: 20, padding: '3px 12px',
              fontSize: 12, fontWeight: 700, color: 'var(--ink)'
            }}>
              {review.rating}/10
            </span>
          )}
          <button className="btn btn-ghost btn-sm"
            onClick={e => { e.stopPropagation(); onEdit(review); }}
            style={{ color: 'rgba(13,13,13,0.4)', padding: '4px 8px' }}>✎</button>
          <button className="btn btn-ghost btn-sm"
            onClick={e => { e.stopPropagation(); onDelete(review.id); }}
            style={{ color: 'var(--rust)', padding: '4px 8px' }}>🗑</button>
        </div>
      </div>

      {open && (
        <div style={{ background: 'var(--mist)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {fields.map(f => (
            <div key={f.key}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: f.color, fontWeight: 700, marginBottom: 6 }}>
                {f.label}
              </div>
              <div className="markdown-body" style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink)' }}>
                <MarkdownRenderer content={review[f.key]} />
              </div>
            </div>
          ))}
          {review.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {review.tags.map(t => (
                <span key={t} className="tag tag-mist" style={{ fontSize: 10 }}>#{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Reviews() {
  const [activeType, setActiveType] = useState('weekly');
  const [offset, setOffset] = useState(0);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [pastReviews, setPastReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [form, setForm] = useState({ wins: '', challenges: '', learnings: '', intentions: '', rating: 7, tags: '' });
  const [saving, setSaving] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const period = getPeriodRange(activeType, offset);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStats(null);
    try {
      const res = await API.get(`/reviews/stats?start_date=${period.start}&end_date=${period.end}`);
      setStats(res.data);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to load stats'));
    } finally {
      setStatsLoading(false);
    }
  }, [period.start, period.end]);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const res = await API.get(`/reviews?period_type=${activeType}`);
      setPastReviews(res.data);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to load reviews'));
    } finally {
      setReviewsLoading(false);
    }
  }, [activeType]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Reset offset when changing period type
  useEffect(() => { setOffset(0); }, [activeType]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        period_type: activeType,
        period_label: period.label,
        start_date: period.start,
        end_date: period.end,
        rating: form.rating,
        wins: form.wins,
        challenges: form.challenges,
        learnings: form.learnings,
        intentions: form.intentions,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      if (editingReview) {
        await API.put(`/reviews/${editingReview.id}`, payload);
        toast.success('Review updated!');
      } else {
        await API.post('/reviews', payload);
        toast.success('✦ Review saved!');
      }
      setForm({ wins: '', challenges: '', learnings: '', intentions: '', rating: 7, tags: '' });
      setEditingReview(null);
      setShowForm(false);
      loadReviews();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to save review'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (review) => {
    setEditingReview(review);
    setForm({
      wins: review.wins || '',
      challenges: review.challenges || '',
      learnings: review.learnings || '',
      intentions: review.intentions || '',
      rating: review.rating || 7,
      tags: (review.tags || []).join(', '),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    setConfirm({
      title: 'Delete Review?',
      message: 'This will permanently delete this review. This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/reviews/${id}`);
          toast.success('Review deleted');
          loadReviews();
        } catch (e) {
          toast.error(getErrorMessage(e, 'Failed to delete'));
        }
      }
    });
  };

  const periodTypeLabel = PERIOD_TYPES.find(p => p.key === activeType);

  return (
    <div>
      <div className="page-header">
        <h2>Periodic Reviews 📋</h2>
        <p>Reflect on your progress across time — weekly, monthly, and yearly.</p>
      </div>

      <div className="page-body">

        {/* ── Period Type Tabs ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {PERIOD_TYPES.map(p => (
            <button
              key={p.key}
              onClick={() => setActiveType(p.key)}
              className={`btn ${activeType === p.key ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: 30, padding: '10px 24px', fontSize: 14, gap: 8 }}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        {/* ── Period Navigator ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32,
          padding: '16px 24px', background: 'white', borderRadius: 20,
          border: '1px solid rgba(13,13,13,0.06)', boxShadow: '0 2px 12px rgba(13,13,13,0.04)',
        }}>
          <button onClick={() => setOffset(o => o - 1)}
            className="btn btn-ghost"
            style={{ width: 38, height: 38, borderRadius: '50%', padding: 0, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ←
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Fraunces', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
              {period.label}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', marginTop: 3 }}>
              {period.start} → {period.end}
            </div>
          </div>
          <button onClick={() => setOffset(o => o + 1)}
            className="btn btn-ghost"
            disabled={offset >= 0}
            style={{ width: 38, height: 38, borderRadius: '50%', padding: 0, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: offset >= 0 ? 0.3 : 1 }}>
            →
          </button>
          {offset !== 0 && (
            <button onClick={() => setOffset(0)}
              className="btn btn-sm btn-outline"
              style={{ borderRadius: 20, fontSize: 11 }}>
              Current
            </button>
          )}
        </div>

        {/* ── Stats Dashboard ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(13,13,13,0.35)', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            {periodTypeLabel?.icon} {period.label} at a Glance
            <div style={{ flex: 1, height: 1, background: 'rgba(13,13,13,0.06)' }} />
          </div>

          {statsLoading ? (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton" style={{ height: 100, flex: '1 1 140px', borderRadius: 16 }} />
              ))}
            </div>
          ) : stats ? (
            <>
              {/* Stat badges row */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                <StatBadge icon="📔" value={stats.log_count} label="Days Logged"
                  sub={`${stats.consistency}% consistency`} color="var(--ink)" />
                <StatBadge icon="😊" value={stats.avg_mood || '—'} label="Avg Mood"
                  sub="out of 10" color="var(--sage)" />
                <StatBadge icon="⚡" value={stats.avg_energy || '—'} label="Avg Energy"
                  sub="out of 10" color="var(--gold)" />
                <StatBadge icon="⏱" value={stats.total_time}
                  label="Minutes Invested" color="#8b6bc4"
                  sub={stats.total_time > 60 ? `${Math.round(stats.total_time / 60)}h total` : ''} />
                {stats.top_category && (
                  <StatBadge
                    icon={stats.top_category.icon}
                    value={stats.top_category.name}
                    label="Top Category"
                    sub={`${stats.top_category.time_spent} min`}
                    color={stats.top_category.color}
                  />
                )}
              </div>

              {/* Consistency bar */}
              <div style={{ marginBottom: 24, background: 'white', borderRadius: 16, padding: '16px 20px', border: '1px solid rgba(13,13,13,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Logging Consistency</span>
                  <span style={{ color: 'rgba(13,13,13,0.5)' }}>{stats.log_count} / {stats.total_days} days</span>
                </div>
                <div className="progress-bar" style={{ height: 8, borderRadius: 8 }}>
                  <div className="progress-fill" style={{
                    width: `${stats.consistency}%`,
                    background: stats.consistency >= 80 ? 'var(--sage)' : stats.consistency >= 50 ? 'var(--gold)' : 'var(--rust)',
                    borderRadius: 8, transition: 'width 0.8s ease'
                  }} />
                </div>
              </div>

              {/* Charts row */}
              {(stats.category_breakdown.length > 0 || stats.top_emotions.length > 0) && (
                <div className="grid-2" style={{ marginBottom: 24 }}>
                  {stats.category_breakdown.length > 0 && (
                    <div style={{ background: 'white', borderRadius: 16, padding: '20px', border: '1px solid rgba(13,13,13,0.06)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--ink)' }}>Time by Category</div>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={stats.category_breakdown.slice(0, 6)} layout="vertical" margin={{ left: 10, right: 20 }}>
                          <XAxis type="number" hide />
                          <XAxis type="category" dataKey="name" hide />
                          <Tooltip
                            contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }}
                            formatter={(v) => [`${v} min`, 'Time']}
                          />
                          <Bar dataKey="time_spent" radius={[0, 4, 4, 0]}>
                            {stats.category_breakdown.slice(0, 6).map((c, i) => (
                              <Cell key={i} fill={c.color || 'var(--sage)'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                        {stats.category_breakdown.slice(0, 6).map((c, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                              {c.icon} {c.name}
                            </span>
                            <span style={{ color: 'rgba(13,13,13,0.5)' }}>{c.time_spent} min · {c.count} days</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stats.top_emotions.length > 0 && (
                    <div style={{ background: 'white', borderRadius: 16, padding: '20px', border: '1px solid rgba(13,13,13,0.06)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--ink)' }}>Top Emotions</div>
                      <ResponsiveContainer width="100%" height={180}>
                        <RadarChart cx="50%" cy="50%" outerRadius="65%"
                          data={stats.top_emotions.map(e => ({ subject: e.label, value: e.count, fullMark: Math.max(...stats.top_emotions.map(x => x.count)) }))}>
                          <PolarGrid stroke="rgba(13,13,13,0.06)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'rgba(13,13,13,0.5)' }} />
                          <PolarRadiusAxis axisLine={false} tick={false} />
                          <Radar dataKey="value" stroke="var(--sage)" fill="var(--sage)" fillOpacity={0.4} />
                        </RadarChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {stats.top_emotions.map((e, i) => (
                          <span key={i} className="tag tag-mist" style={{ fontSize: 10 }}>
                            {e.label} · {e.count}×
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Highlights & Gratitude */}
              {(stats.highlights.length > 0 || stats.gratitude_items.length > 0) && (
                <div className="grid-2" style={{ marginBottom: 8 }}>
                  {stats.highlights.length > 0 && (
                    <div style={{ background: 'rgba(107,140,107,0.04)', border: '1px solid rgba(107,140,107,0.15)', borderRadius: 16, padding: '16px 20px' }}>
                      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--sage)', fontWeight: 700, marginBottom: 12 }}>
                        ✦ Key Highlights
                      </div>
                      {stats.highlights.map((h, i) => (
                        <div key={i} style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 8, lineHeight: 1.5, paddingLeft: 12, borderLeft: '2px solid var(--sage)' }}>
                          {h}
                        </div>
                      ))}
                    </div>
                  )}
                  {stats.gratitude_items.length > 0 && (
                    <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 16, padding: '16px 20px' }}>
                      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gold)', fontWeight: 700, marginBottom: 12 }}>
                        🌿 Gratitude Gems
                      </div>
                      {stats.gratitude_items.map((g, i) => (
                        <div key={i} style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 8, lineHeight: 1.5, paddingLeft: 12, borderLeft: '2px solid var(--gold)' }}>
                          {g}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-icon">📭</div>
              <h3>No data yet</h3>
              <p>Start logging your days to see stats here for this period.</p>
            </div>
          )}
        </div>

        {/* ── Write Review Section ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(13,13,13,0.35)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              ✍️ Write Your Review
              <div style={{ flex: 1, height: 1, background: 'rgba(13,13,13,0.06)', minWidth: 40 }} />
            </div>
            <button
              onClick={() => {
                if (showForm && !editingReview) {
                  setShowForm(false);
                } else {
                  setEditingReview(null);
                  setForm({ wins: '', challenges: '', learnings: '', intentions: '', rating: 7, tags: '' });
                  setShowForm(true);
                }
              }}
              className={`btn ${showForm && !editingReview ? 'btn-outline' : 'btn-primary'}`}
              style={{ borderRadius: 30, padding: '10px 24px' }}
            >
              {showForm && !editingReview ? '× Cancel' : '+ Write Review'}
            </button>
          </div>

          {showForm && (
            <div style={{
              background: 'white', borderRadius: 20, padding: '28px 32px',
              border: '1px solid rgba(13,13,13,0.07)',
              boxShadow: '0 8px 32px rgba(13,13,13,0.05)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
                paddingBottom: 16, borderBottom: '1px solid rgba(13,13,13,0.06)'
              }}>
                <div style={{ background: 'var(--mist)', borderRadius: 12, padding: '8px 16px', fontSize: 14, fontWeight: 600 }}>
                  {editingReview ? 'Editing: ' : ''}{period.label}
                </div>
                {editingReview && (
                  <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)' }}>
                    (Editing saved review)
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {REFLECTION_FIELDS.map(field => (
                  <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: field.color }}>{field.label.split(' ')[0]}</span>
                      <span>{field.label.split(' ').slice(1).join(' ')}</span>
                    </label>
                    <textarea
                      className="form-textarea"
                      value={form[field.key]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      style={{ minHeight: 100, borderLeft: `3px solid ${field.color}`, borderRadius: '0 10px 10px 0', paddingLeft: 16 }}
                    />
                    <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.35)', marginTop: 4 }}>Markdown supported</div>
                  </div>
                ))}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Overall Period Rating — {form.rating}/10</label>
                  <input
                    type="range" className="rating-slider" min={1} max={10} value={form.rating}
                    onChange={e => setForm(f => ({ ...f, rating: +e.target.value }))}
                    style={{ '--val': `${(form.rating - 1) / 9 * 100}%`, width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(13,13,13,0.35)', marginTop: 4 }}>
                    <span>Not great</span>
                    <span>Incredible</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tags (optional, comma-separated)</label>
                  <input
                    maxLength={200} className="form-input"
                    value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="growth, focus, health..."
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  <button className="btn btn-outline" onClick={() => { setShowForm(false); setEditingReview(null); }} style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
                    {saving ? 'Saving...' : editingReview ? 'Update Review' : '✦ Save Review'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Past Reviews ── */}
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(13,13,13,0.35)', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            📚 Past {PERIOD_TYPES.find(p => p.key === activeType)?.label} Reviews
            <div style={{ flex: 1, height: 1, background: 'rgba(13,13,13,0.06)' }} />
            <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', textTransform: 'none', letterSpacing: 0 }}>
              {pastReviews.length} saved
            </span>
          </div>

          {reviewsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 16 }} />)}
            </div>
          ) : pastReviews.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <div className="empty-icon">📋</div>
              <h3>No {activeType} reviews yet</h3>
              <p>Write your first review above to start building your reflection archive.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pastReviews.map(r => (
                <PastReviewCard
                  key={r.id}
                  review={r}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

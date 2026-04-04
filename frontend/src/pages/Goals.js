import { useEffect, useState } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [reflectGoal, setReflectGoal] = useState(null);
  const [form, setForm] = useState({ category_id: '', title: '', description: '', deadline: '' });
  const [reflectForm, setReflectForm] = useState({ status: 'completed', reflection: '', new_deadline: '' });
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(false);

  const load = () => Promise.all([API.get('/goals'), API.get('/categories')])
    .then(([g, c]) => { setGoals(g.data); setCategories(c.data); });

  useEffect(() => { load(); }, []);

  const getCat = (id) => categories.find(c => c.id === id);

  const handleCreate = async () => {
    if (!form.title || !form.category_id || !form.deadline) return toast.error('Fill all required fields');
    setLoading(true);
    try {
      await API.post('/goals', form);
      toast.success('◇ Goal created!');
      setShowModal(false);
      setForm({ category_id: '', title: '', description: '', deadline: '' });
      load();
    } catch { toast.error('Failed to create goal'); }
    finally { setLoading(false); }
  };

  const handleReflect = async () => {
    if (!reflectForm.reflection.trim()) return toast.error('Write your reflection');
    if (reflectForm.status === 'extended' && !reflectForm.new_deadline) return toast.error('Set a new deadline');
    setLoading(true);
    try {
      await API.put(`/goals/${reflectGoal.id}/reflect`, reflectForm);
      toast.success(reflectForm.status === 'completed' ? '✅ Goal completed!' : reflectForm.status === 'extended' ? '🔄 Deadline extended' : '📝 Reflection saved');
      setReflectGoal(null);
      load();
    } catch { toast.error('Failed to save reflection'); }
    finally { setLoading(false); }
  };

  const filtered = goals.filter(g => {
    if (filter === 'active') return g.status === 'active';
    if (filter === 'completed') return g.status === 'completed';
    if (filter === 'extended') return g.status === 'extended';
    return true;
  });

  const overdue = goals.filter(g => g.status === 'active' && isPast(parseISO(g.current_deadline)));

  return (
    <div>
      <div className="page-header">
        <h2>Goals</h2>
        <p>Set meaningful targets. Reflect honestly. Grow deliberately.</p>
      </div>

      <div className="page-body">
        {overdue.length > 0 && (
          <div className="card" style={{ background: 'rgba(196,98,58,0.08)', border: '1px solid rgba(196,98,58,0.2)', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, color: 'var(--rust)', marginBottom: 8 }}>⚠️ {overdue.length} goal{overdue.length > 1 ? 's' : ''} past deadline</h3>
            <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.6)' }}>These goals need your reflection — complete, extend, or acknowledge them.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {overdue.map(g => (
                <button key={g.id} className="btn btn-sm" style={{ background: 'var(--rust)', color: 'white' }} onClick={() => { setReflectGoal(g); setReflectForm({ status: 'completed', reflection: '', new_deadline: '' }); }}>
                  {g.title} →
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['active', 'completed', 'extended', 'all'].map(f => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Goal</button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◇</div>
            <h3>No goals here</h3>
            <p>Set a meaningful goal. Give it a deadline. Show up.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Create Goal</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map((goal) => {
              const cat = getCat(goal.category_id);
              const deadline = parseISO(goal.current_deadline);
              const daysLeft = differenceInDays(deadline, new Date());
              const isOverdue = goal.status === 'active' && isPast(deadline);
              const extended = goal.extension_history?.length > 0;

              return (
                <div key={goal.id} className="card" style={{ borderLeft: `4px solid ${cat?.color || '#ccc'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        {cat && <span>{cat.icon}</span>}
                        <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.45)', textTransform: 'uppercase', letterSpacing: 1 }}>{cat?.name}</span>
                        {extended && <span className="tag tag-gold" style={{ fontSize: 11 }}>Extended ×{goal.extension_history.length}</span>}
                      </div>
                      <h3 style={{ fontSize: 18, marginBottom: 4 }}>{goal.title}</h3>
                      {goal.description && <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.55)', marginBottom: 8 }}>{goal.description}</p>}
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
                        <span style={{ color: isOverdue ? 'var(--rust)' : daysLeft <= 7 ? '#c9a84c' : 'rgba(13,13,13,0.45)' }}>
                          {isOverdue ? `⚠️ ${Math.abs(daysLeft)}d overdue` : goal.status === 'active' ? `◇ ${daysLeft}d left` : `Deadline: ${format(deadline, 'MMM d, yyyy')}`}
                        </span>
                        <span className={`tag ${goal.status === 'completed' ? 'tag-green' : goal.status === 'extended' ? 'tag-gold' : goal.status === 'abandoned' ? 'tag-rust' : 'tag-mist'}`}>
                          {goal.status}
                        </span>
                      </div>
                      {goal.reflection && (
                        <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--mist)', borderRadius: 8, fontSize: 13, color: 'rgba(13,13,13,0.6)', fontStyle: 'italic' }}>
                          "{goal.reflection}"
                        </div>
                      )}
                    </div>
                    {goal.status === 'active' && (
                      <button className="btn btn-sm btn-outline" onClick={() => { setReflectGoal(goal); setReflectForm({ status: 'completed', reflection: '', new_deadline: '' }); }}>
                        Reflect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>New Goal</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Select a category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Goal Title</label>
              <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What do you want to achieve?" />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does success look like?" style={{ minHeight: 80 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Target Deadline</label>
              <input type="date" className="form-input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} min={format(new Date(), 'yyyy-MM-dd')} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Creating...' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reflect Modal */}
      {reflectGoal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setReflectGoal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Reflect on Goal</h3>
              <button className="modal-close" onClick={() => setReflectGoal(null)}>✕</button>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--mist)', borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
              <strong>{reflectGoal.title}</strong>
              <div style={{ color: 'rgba(13,13,13,0.5)', fontSize: 12, marginTop: 2 }}>Deadline: {format(parseISO(reflectGoal.current_deadline), 'MMM d, yyyy')}</div>
            </div>

            <div className="form-group">
              <label className="form-label">What happened?</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[['completed', '✅ Achieved'], ['extended', '🔄 Need more time'], ['abandoned', '❌ Moving on']].map(([s, l]) => (
                  <button key={s} className={`btn btn-sm ${reflectForm.status === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setReflectForm({ ...reflectForm, status: s })}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                {reflectForm.status === 'completed' ? 'What did you achieve or learn?' : reflectForm.status === 'extended' ? 'Why do you need more time?' : 'Why are you moving on?'}
              </label>
              <textarea className="form-textarea" value={reflectForm.reflection} onChange={(e) => setReflectForm({ ...reflectForm, reflection: e.target.value })} placeholder="Be honest with yourself..." />
            </div>

            {reflectForm.status === 'extended' && (
              <div className="form-group">
                <label className="form-label">New Deadline</label>
                <input type="date" className="form-input" value={reflectForm.new_deadline} onChange={(e) => setReflectForm({ ...reflectForm, new_deadline: e.target.value })} min={format(new Date(), 'yyyy-MM-dd')} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setReflectGoal(null)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReflect} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Saving...' : 'Save Reflection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';


const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date Created' },
  { value: 'current_deadline', label: 'Deadline' },
  { value: 'title', label: 'Name A–Z' },
  { value: 'status', label: 'Status' },
];

export default function Goals() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [reflectGoal, setReflectGoal] = useState(null);
  const [addNoteGoal, setAddNoteGoal] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [showCreateCat, setShowCreateCat] = useState(false);
  const [newCatForm, setNewCatForm] = useState({ name: '', icon: '🎯', color: '#6b8c6b', description: '' });
  const [form, setForm] = useState({ category_id: '', title: '', description: '', deadline: '' });
  const [reflectForm, setReflectForm] = useState({ status: 'completed', reflection: '', new_deadline: '' });
  const [filter, setFilter] = useState('active');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterCategory, setFilterCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const params = new URLSearchParams({ sort_by: sortBy, sort_order: sortOrder });
      if (filterCategory) params.append('category_id', filterCategory);
      const [g, c] = await Promise.all([API.get(`/goals?${params}`), API.get('/categories')]);
      setGoals(g.data);
      setCategories(c.data);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to load goals'));
    }


  };

  useEffect(() => { load(); }, [sortBy, sortOrder, filterCategory]);

  const getCat = (id) => categories.find(c => c.id === id);

  const openCreate = () => {
    setEditGoal(null);
    setShowCreateCat(false);
    setForm({ category_id: categories.length > 0 ? categories[0].id : '', title: '', description: '', deadline: '' });
    setShowModal(true);
  };

  const openEdit = (goal) => {
    setEditGoal(goal);
    setShowCreateCat(false);
    setForm({ category_id: goal.category_id, title: goal.title, description: goal.description || '', deadline: goal.current_deadline });
    setShowModal(true);
  };

  const handleCreateCategoryInline = async () => {
    if (!newCatForm.name.trim()) return toast.error('Category name required');
    try {
      const r = await API.post('/categories', newCatForm);
      const updated = await API.get('/categories');
      setCategories(updated.data);
      setForm(prev => ({ ...prev, category_id: r.data.id }));
      setShowCreateCat(false);
      setNewCatForm({ name: '', icon: '🎯', color: '#6b8c6b', description: '' });
      toast.success(`${r.data.icon} ${r.data.name} created!`);
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to create category')); }


  };

  const handleSave = async () => {
    if (!form.title || !form.category_id || !form.deadline) return toast.error('Fill all required fields');
    setLoading(true);
    try {
      if (editGoal) {
        await API.put(`/goals/${editGoal.id}`, form);
        toast.success('Goal updated!');
      } else {
        await API.post('/goals', form);
        toast.success('◇ Goal created!');
      }
      setShowModal(false);
      setEditGoal(null);
      setForm({ category_id: '', title: '', description: '', deadline: '' });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save goal'));
    } finally { setLoading(false); }

  };

  const handleDelete = async (goal) => {
    if (!window.confirm(`Delete "${goal.title}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/goals/${goal.id}`);
      toast.success('Goal deleted');
      load();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to delete goal'));
    }


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
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to save reflection')); }

    finally { setLoading(false); }

  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return toast.error('Write your note');
    setLoading(true);
    try {
      await API.post(`/goals/${addNoteGoal.id}/notes`, { text: newNoteText });
      toast.success('Note added!');
      setAddNoteGoal(null);
      setNewNoteText('');
      load();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to add note')); }

    finally { setLoading(false); }

  };

  const handleDeleteNote = async (goal, noteId) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await API.delete(`/goals/${goal.id}/notes/${noteId}`);
      toast.success('Note deleted');
      load();
    } catch {
      toast.error('Failed to delete note');
    }
  };

  const filtered = goals.filter(g => {
    if (filter === 'active') return g.status === 'active';
    if (filter === 'completed') return g.status === 'completed';
    if (filter === 'extended') return g.status === 'extended';
    if (filter === 'abandoned') return g.status === 'abandoned';
    return true;
  });

  const overdue = goals.filter(g => ['active', 'extended'].includes(g.status) && isPast(parseISO(g.current_deadline)));

  const CAT_ICONS = ['🎯', '🧠', '💼', '❤️', '💪', '📚', '🌿', '💰', '🎨'];
  const CAT_COLORS = ['#6b8c6b', '#c9a84c', '#c4623a', '#5b8ba8', '#8b6bc4', '#c46b8b'];

  return (
    <div>
      <div className="page-header">
        <h2>Goals ◇</h2>
        <p>Set meaningful targets. Reflect honestly. Grow deliberately.</p>
      </div>

      <div className="page-body">
        {overdue.length > 0 && (
          <div className="card" style={{ background: 'rgba(196,98,58,0.08)', border: '1px solid rgba(196,98,58,0.2)', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, color: 'var(--rust)', marginBottom: 8 }}>⚠️ {overdue.length} goal{overdue.length > 1 ? 's' : ''} past deadline</h3>
            <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.6)' }}>These goals need your reflection — complete, extend, or acknowledge them.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {overdue.map(g => (
                <button key={g.id} className="btn btn-sm" style={{ background: 'var(--rust)', color: 'white' }}
                  onClick={() => { setReflectGoal(g); setReflectForm({ status: 'completed', reflection: '', new_deadline: '' }); }}>
                  {g.title} →
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['active', 'completed', 'extended', 'abandoned', 'all'].map(f => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={openCreate}>+ New Goal</button>
        </div>

        {/* Sort + Filter Row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.45)', textTransform: 'uppercase', letterSpacing: 1 }}>Sort</span>
            <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '6px 10px', fontSize: 13, height: 'auto' }}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button className="btn btn-sm btn-outline" onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}>
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.45)', textTransform: 'uppercase', letterSpacing: 1 }}>Category</span>
            <select className="form-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '6px 10px', fontSize: 13, height: 'auto' }}>
              <option value="">All</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◇</div>
            <h3>No goals here</h3>
            <p>Set a meaningful goal. Give it a deadline. Show up.</p>
            <button className="btn btn-primary" onClick={openCreate}>+ Create Goal</button>
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
                      {goal.description && <div className="markdown-body" style={{ fontSize: 14, color: 'rgba(13,13,13,0.55)', marginBottom: 8 }}><MarkdownRenderer content={goal.description} /></div>}
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
                        <span style={{ color: isOverdue ? 'var(--rust)' : daysLeft <= 7 ? '#c9a84c' : 'rgba(13,13,13,0.45)' }}>
                          {isOverdue ? `⚠️ ${Math.abs(daysLeft)}d overdue` : goal.status === 'active' ? `◇ ${daysLeft}d left` : `Deadline: ${format(deadline, 'MMM d, yyyy')}`}
                        </span>
                        <span className={`tag ${goal.status === 'completed' ? 'tag-green' : goal.status === 'extended' ? 'tag-gold' : goal.status === 'abandoned' ? 'tag-rust' : 'tag-mist'}`}>
                          {goal.status}
                        </span>
                      </div>

                      {goal.reflection && (
                        <div className="markdown-body" style={{ marginTop: 10, padding: '10px 14px', background: 'var(--mist)', borderRadius: 8, fontSize: 13, color: 'rgba(13,13,13,0.6)', fontStyle: 'italic' }}>
                          <MarkdownRenderer content={`"${goal.reflection}"`} />
                        </div>
                      )}

                      {goal.notes?.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: 'rgba(13,13,13,0.35)', marginBottom: 6 }}>
                            Notes ({goal.notes.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {goal.notes.slice(-3).map((r, i) => (
                              <div key={r.id || i} style={{ padding: '8px 12px', background: 'var(--mist)', borderRadius: 8, fontSize: 12, color: 'rgba(13,13,13,0.6)', fontStyle: 'italic', borderLeft: '2px solid rgba(13,13,13,0.1)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                <div>
                                  <div style={{ fontSize: 10, color: 'rgba(13,13,13,0.35)', marginBottom: 3 }}>
                                    {format(new Date(r.date), 'MMM d, yyyy')}
                                  </div>
                                  <div className="markdown-body"><MarkdownRenderer content={`"${r.text}"`} /></div>
                                </div>
                                {r.id && (
                                  <button onClick={() => handleDeleteNote(goal, r.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(13,13,13,0.2)', flexShrink: 0 }}>✕</button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginLeft: 12, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-outline" onClick={() => navigate(`/goals/${goal.id}`)} title="View Detail">◈ Detail</button>
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(goal)} title="Edit">✎</button>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['active', 'extended'].includes(goal.status) && (
                          <>
                            <button className="btn btn-sm btn-outline" onClick={() => { setAddNoteGoal(goal); setNewNoteText(''); }} title="Add note">+ Note</button>
                            <button className="btn btn-sm btn-outline" onClick={() => { setReflectGoal(goal); setReflectForm({ status: 'completed', reflection: '', new_deadline: '' }); }}>
                              Reflect
                            </button>
                          </>
                        )}
                        <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(goal)} title="Delete" style={{ color: 'rgba(13,13,13,0.3)' }}>🗑</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editGoal ? 'Edit Goal' : 'New Goal'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label className="form-label" style={{ margin: 0 }}>Category</label>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateCat(!showCreateCat)} style={{ fontSize: 12, color: 'var(--sage)' }}>
                  {showCreateCat ? '← Pick existing' : '+ New Category'}
                </button>
              </div>
              {showCreateCat ? (
                <div style={{ padding: '12px', background: 'var(--mist)', borderRadius: 10, marginTop: 4 }}>
                  <input className="form-input" value={newCatForm.name} onChange={e => setNewCatForm({ ...newCatForm, name: e.target.value })}
                    placeholder="Category name" style={{ marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {CAT_ICONS.map(ic => (
                      <button key={ic} onClick={() => setNewCatForm({ ...newCatForm, icon: ic })}
                        style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${newCatForm.icon === ic ? 'var(--sage)' : 'rgba(13,13,13,0.1)'}`, background: 'white', cursor: 'pointer', fontSize: 18 }}>
                        {ic}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {CAT_COLORS.map(c => (
                      <button key={c} onClick={() => setNewCatForm({ ...newCatForm, color: c })}
                        style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `3px solid ${newCatForm.color === c ? 'var(--ink)' : 'transparent'}`, cursor: 'pointer' }} />
                    ))}
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handleCreateCategoryInline}>Create Category</button>
                </div>
              ) : (
                <select className="form-select" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">Select a category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              )}
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
              <input type="date" className="form-input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Saving...' : editGoal ? 'Save Changes' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Quick Note Modal */}
      {addNoteGoal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAddNoteGoal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Add Note</h3>
              <button className="modal-close" onClick={() => setAddNoteGoal(null)}>✕</button>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--mist)', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
              <strong>{addNoteGoal.title}</strong>
            </div>
            <div className="form-group">
              <label className="form-label">What's on your mind about this goal?</label>
              <textarea className="form-textarea" value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Progress made, obstacles, insights, next steps..." style={{ minHeight: 120 }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setAddNoteGoal(null)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddNote} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Saving...' : 'Add Note'}
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
                <input type="date" className="form-input" value={reflectForm.new_deadline} onChange={(e) => setReflectForm({ ...reflectForm, new_deadline: e.target.value })} />
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

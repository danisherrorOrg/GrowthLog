import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useAuth } from '../context/AuthContext';


const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date Created' },
  { value: 'current_deadline', label: 'Deadline' },
  { value: 'title', label: 'Name A–Z' },
  { value: 'status', label: 'Status' },
];

export default function Goals() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeColors = user?.category_colors || ['#6b8c6b', '#c9a84c', '#c4623a', '#5b8ba8', '#8b6bc4', '#c46b8b', '#6bc4b8', '#a8895b'];
  const activeIcons = user?.category_icons || ['🧠', '💼', '❤️', '🤝', '💪', '🎯', '📚', '🌿', '💰', '🎨', '🙏', '⚡'];
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
  const [confirm, setConfirm] = useState(null);

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
    setNewCatForm({ name: '', icon: activeIcons[0] || '🎯', color: activeColors[0] || '#6b8c6b', description: '' });
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
      setNewCatForm({ name: '', icon: activeIcons[0] || '🎯', color: activeColors[0] || '#6b8c6b', description: '' });
      toast.success(`${r.data.icon} ${r.data.name} created!`);
      window.location.reload();
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

  const handleDelete = (goal) => {
    setConfirm({
      title: 'Delete Goal?',
      message: `Are you sure you want to delete "${goal.title}"? This will permanently remove the goal and all its associated notes.`,
      confirmLabel: 'Delete Forever',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/goals/${goal.id}`);
          toast.success('Goal deleted');
          load();
        } catch (e) {
          toast.error(getErrorMessage(e, 'Failed to delete goal'));
        }
      }
    });
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

  const handleDeleteNote = (goal, noteId) => {
    setConfirm({
      title: 'Delete Note?',
      message: 'Are you sure you want to remove this note from your goal?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/goals/${goal.id}/notes/${noteId}`);
          toast.success('Note deleted');
          load();
        } catch {
          toast.error('Failed to delete note');
        }
      }
    });
  };

  const filtered = goals.filter(g => {
    if (filter === 'active') return g.status === 'active';
    if (filter === 'completed') return g.status === 'completed';
    if (filter === 'extended') return g.status === 'extended';
    if (filter === 'abandoned') return g.status === 'abandoned';
    return true;
  });

  const overdue = goals.filter(g => ['active', 'extended'].includes(g.status) && isPast(parseISO(g.current_deadline)));

  const CAT_ICONS = activeIcons;
  const CAT_COLORS = activeColors;

  return (
    <div>
      <div className="page-header">
        <h2>Goals ◇</h2>
        <p>Set meaningful targets. Reflect honestly. Grow deliberately.</p>
      </div>

      <div className="page-body">
        {overdue.length > 0 && (
          <div className="card" style={{ background: 'rgba(196,98,58,0.04)', border: '1px solid rgba(196,98,58,0.1)', marginBottom: 24, padding: '16px 20px' }}>
            <div className="alert-banner-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 15, color: 'var(--rust)', marginBottom: 2 }}>⚠️ {overdue.length} Action Required</h3>
                <p style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)' }}>Goals past their target deadline need reflection.</p>
              </div>
              <div className="overdue-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {overdue.map(g => (
                  <button key={g.id} className="btn btn-sm btn-danger" style={{ borderRadius: 20, fontSize: 11, padding: '4px 12px' }}
                    onClick={() => { setReflectGoal(g); setReflectForm({ status: 'completed', reflection: '', new_deadline: '' }); }}>
                    {g.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Unified Toolbar */}
        <div className="card toolbar-card" style={{ marginBottom: 32, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div className="toolbar-left" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="filter-pills" style={{ display: 'flex', background: 'var(--mist)', padding: 3, borderRadius: 10, flexWrap: 'wrap', gap: 2 }}>
              {['active', 'extended', 'completed', 'abandoned', 'all'].map(f => (
                <button 
                  key={f} 
                  className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} 
                  onClick={() => setFilter(f)}
                  style={{ borderRadius: 8, padding: '6px 14px', fontSize: 12 }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="divider-v" style={{ width: 1, height: 24, background: 'rgba(13,13,13,0.1)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '6px 12px', fontSize: 12, height: 'auto', border: 'none', background: 'transparent', fontWeight: 500 }}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
                style={{ padding: 4, width: 28, height: 28 }}
              >
                {sortOrder === 'desc' ? '↓' : '↑'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', textTransform: 'uppercase', fontWeight: 600 }}>In</span>
              <select className="form-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '6px 12px', fontSize: 12, height: 'auto', border: 'none', background: 'transparent', fontWeight: 500 }}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </div>

          <button className="btn btn-primary toolbar-primary-btn" onClick={openCreate} style={{ borderRadius: 30, padding: '10px 24px', boxShadow: '0 4px 12px rgba(13,13,13,0.1)' }}>
            + New Goal
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◇</div>
            <h3>Your Path is Clear</h3>
            <p>Define what growth looks like for you. Set your first major target.</p>
            <button className="btn btn-primary" onClick={openCreate} style={{ borderRadius: 30 }}>+ Create Goal</button>
          </div>
        ) : (
          <div className="auto-grid">
            {filtered.map((goal) => {
              const cat = getCat(goal.category_id);
              const deadline = parseISO(goal.current_deadline);
              const daysLeft = differenceInDays(deadline, new Date());
              const totalDays = differenceInDays(deadline, parseISO(goal.created_at)) || 1;
              const progress = Math.max(0, Math.min(100, 100 - (daysLeft / totalDays * 100)));
              const isOverdue = goal.status === 'active' && isPast(deadline);
              const extended = goal.extension_history?.length > 0;

              const statusTagClass =
                goal.status === 'completed' ? 'tag-green' :
                goal.status === 'abandoned' ? 'tag-rust' :
                goal.status === 'extended' ? 'tag-gold' :
                isOverdue ? 'tag-rust' : 'tag-mist';

              return (
                <div
                  key={goal.id}
                  className="card"
                  style={{ display: 'flex', flexDirection: 'column', gap: 16, cursor: 'pointer', transition: 'box-shadow 0.18s, transform 0.18s' }}
                  onClick={() => navigate(`/goals/${goal.id}`)}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(13,13,13,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{cat?.icon || '🎯'}</span>
                      <div>
                        <div style={{ fontSize: 10, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>{cat?.name || 'Category'}</div>
                        <h3 style={{ fontSize: 16, marginTop: 1 }}>{goal.title}</h3>
                      </div>
                    </div>
                    <span className={`tag ${statusTagClass}`} style={{ fontSize: 10 }}>
                      {isOverdue && goal.status === 'active' ? 'Overdue' : goal.status}
                    </span>
                  </div>

                  <div style={{ flex: 1 }}>
                    {goal.description && (
                      <div className="markdown-body" style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', minHeight: 60 }}>
                        <MarkdownRenderer content={goal.description} />
                      </div>
                    )}
                  </div>

                  {/* Progress Indicator */}
                  {goal.status === 'active' && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6, fontWeight: 500 }}>
                        <span style={{ color: isOverdue ? 'var(--rust)' : 'rgba(13,13,13,0.4)' }}>
                          {isOverdue ? `${Math.abs(daysLeft)}d Overdue` : `${daysLeft} days left`}
                        </span>
                        <span style={{ color: 'rgba(13,13,13,0.3)' }}>Target: {format(deadline, 'MMM d')}</span>
                      </div>
                      <div className="progress-bar" style={{ height: 4 }}>
                        <div 
                          className="progress-fill" 
                          style={{ 
                            width: `${progress}%`, 
                            background: isOverdue ? 'var(--rust)' : progress > 80 ? 'var(--gold)' : 'var(--sage)'
                          }} 
                        />
                      </div>
                    </div>
                  )}

                  <div className="divider" style={{ margin: '8px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(goal.notes || []).length > 0 && <span title="Notes" style={{ fontSize: 12, color: 'rgba(13,13,13,0.3)' }}>📝 {goal.notes.length}</span>}
                      {extended && <span title="Extensions" style={{ fontSize: 12, color: 'var(--gold)' }}>🔄 {goal.extension_history.length}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-sm btn-outline" onClick={() => navigate(`/goals/${goal.id}`)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20 }}>Explore →</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => openEdit(goal)} style={{ padding: 4 }}>✎</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(goal)} style={{ padding: 4, color: 'rgba(13,13,13,0.2)' }}>🗑</button>
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
                  <input maxLength={200} className="form-input" value={newCatForm.name} onChange={e => setNewCatForm({ ...newCatForm, name: e.target.value })}
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
              <input maxLength={200} className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What do you want to achieve?" />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea maxLength={2000} className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does success look like?" style={{ minHeight: 80 }} />
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
            </div>
            <div className="form-group">
              <label className="form-label">Target Deadline</label>
              <input maxLength={200} type="date" className="form-input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
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
              <textarea maxLength={2000} className="form-textarea" value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Progress made, obstacles, insights, next steps..." style={{ minHeight: 120 }} />
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
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
              <div className="reflect-status-btns" style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
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
              <textarea maxLength={2000} className="form-textarea" value={reflectForm.reflection} onChange={(e) => setReflectForm({ ...reflectForm, reflection: e.target.value })} placeholder="Be honest with yourself..." />
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
            </div>
            {reflectForm.status === 'extended' && (
              <div className="form-group">
                <label className="form-label">New Deadline</label>
                <input maxLength={200} type="date" className="form-input" value={reflectForm.new_deadline} onChange={(e) => setReflectForm({ ...reflectForm, new_deadline: e.target.value })} />
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

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date Created' },
  { value: 'current_deadline', label: 'Deadline' },
  { value: 'title', label: 'Name A–Z' },
  { value: 'status', label: 'Status' },
];

export default function GoalDetail() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Micro-goals
  const [mgText, setMgText] = useState('');
  const [showMgInput, setShowMgInput] = useState(false);

  // Note input
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  // Reflection input
  const [reflectionText, setReflectionText] = useState('');
  const [showReflectionInput, setShowReflectionInput] = useState(false);

  // Reflect/complete modal
  const [showReflectModal, setShowReflectModal] = useState(false);
  const [reflectForm, setReflectForm] = useState({ status: 'completed', reflection: '', new_deadline: '' });

  const load = async () => {
    try {
      const [g, c] = await Promise.all([API.get(`/goals/${goalId}`), API.get('/categories')]);
      setGoal(g.data);
      setCategories(c.data);
    } catch { toast.error('Failed to load goal'); navigate('/goals'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [goalId]);

  const cat = categories.find(c => c.id === goal?.category_id);

  const handleAddNote = async () => {
    if (!noteText.trim()) return toast.error('Write a note');
    setSaving(true);
    try {
      await API.post(`/goals/${goalId}/notes`, { text: noteText });
      toast.success('Note added!');
      setNoteText('');
      setShowNoteInput(false);
      load();
    } catch { toast.error('Failed to add note'); }
    finally { setSaving(false); }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    await API.delete(`/goals/${goalId}/notes/${noteId}`);
    toast.success('Note deleted');
    load();
  };

  const handleAddMg = async () => {
    if (!mgText.trim()) return toast.error('Enter micro-goal');
    setSaving(true);
    try {
      await API.post(`/goals/${goalId}/micro-goals`, { text: mgText });
      toast.success('Added!');
      setMgText('');
      setShowMgInput(false);
      load();
    } catch { toast.error('Failed to add'); }
    finally { setSaving(false); }
  };

  const handleToggleMg = async (mgId) => {
    try {
      await API.put(`/goals/${goalId}/micro-goals/${mgId}/toggle`);
      load();
    } catch { toast.error('Failed to update'); }
  };

  const handleDeleteMg = async (mgId) => {
    if (!window.confirm('Delete this?')) return;
    await API.delete(`/goals/${goalId}/micro-goals/${mgId}`);
    load();
  };

  const handleAddReflection = async () => {
    if (!reflectionText.trim()) return toast.error('Write a reflection');
    setSaving(true);
    try {
      await API.post(`/goals/${goalId}/reflections`, { text: reflectionText });
      toast.success('Reflection added!');
      setReflectionText('');
      setShowReflectionInput(false);
      load();
    } catch { toast.error('Failed to add reflection'); }
    finally { setSaving(false); }
  };

  const handleDeleteReflection = async (reflectionId) => {
    if (!window.confirm('Delete this reflection?')) return;
    await API.delete(`/goals/${goalId}/reflections/${reflectionId}`);
    toast.success('Reflection deleted');
    load();
  };

  const handleReflect = async () => {
    if (!reflectForm.reflection.trim()) return toast.error('Write your reflection');
    if (reflectForm.status === 'extended' && !reflectForm.new_deadline) return toast.error('Set a new deadline');
    setSaving(true);
    try {
      await API.put(`/goals/${goalId}/reflect`, reflectForm);
      toast.success(reflectForm.status === 'completed' ? '✅ Goal completed!' : reflectForm.status === 'extended' ? '🔄 Deadline extended' : '📝 Reflection saved');
      setShowReflectModal(false);
      load();
    } catch { toast.error('Failed to save reflection'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${goal.title}"? This cannot be undone.`)) return;
    await API.delete(`/goals/${goalId}`);
    toast.success('Goal deleted');
    navigate('/goals');
  };

  if (loading) return (
    <div className="page-body">
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, marginBottom: 16 }} />)}
    </div>
  );

  if (!goal) return null;

  const deadline = parseISO(goal.current_deadline);
  const daysLeft = differenceInDays(deadline, new Date());
  const isOverdue = ['active', 'extended'].includes(goal.status) && isPast(deadline);
  const isActive = ['active', 'extended'].includes(goal.status);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/goals')} style={{ color: 'rgba(13,13,13,0.4)', padding: '4px 8px' }}>
            ← Goals
          </button>
          {cat && <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>{cat.icon} {cat.name}</span>}
        </div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {goal.title}
          <span className={`tag ${goal.status === 'completed' ? 'tag-green' : goal.status === 'extended' ? 'tag-gold' : goal.status === 'abandoned' ? 'tag-rust' : 'tag-mist'}`} style={{ fontSize: 13 }}>
            {goal.status}
          </span>
        </h2>
        <p style={{ color: isOverdue ? 'var(--rust)' : 'rgba(13,13,13,0.5)' }}>
          {isOverdue ? `⚠️ ${Math.abs(daysLeft)} days overdue` : isActive ? `◇ ${daysLeft} days remaining · Due ${format(deadline, 'MMM d, yyyy')}` : `Deadline: ${format(deadline, 'MMM d, yyyy')}`}
        </p>
      </div>

      <div className="page-body">
        {/* Goal overview */}
        <div className="card" style={{ borderLeft: `4px solid ${cat?.color || '#ccc'}`, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              {goal.description && (
                <p style={{ fontSize: 15, color: 'rgba(13,13,13,0.65)', lineHeight: 1.7, marginBottom: 16 }}>{goal.description}</p>
              )}
              <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'rgba(13,13,13,0.45)' }}>
                <span>Created {format(new Date(goal.created_at), 'MMM d, yyyy')}</span>
                <span>Original deadline: {format(parseISO(goal.original_deadline), 'MMM d, yyyy')}</span>
                {goal.extension_history?.length > 0 && <span className="tag tag-gold">Extended ×{goal.extension_history.length}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
              {isActive && (
                <button className="btn btn-primary btn-sm" onClick={() => { setShowReflectModal(true); setReflectForm({ status: 'completed', reflection: '', new_deadline: '' }); }}>
                  Reflect
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={handleDelete} style={{ color: 'var(--rust)' }}>🗑 Delete</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          {/* Micro-Goals Section */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17 }}>🎯 Micro-goals</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setShowMgInput(!showMgInput)}>+ Add</button>
            </div>

            {showMgInput && (
              <div style={{ marginBottom: 16, padding: '12px', background: 'var(--mist)', borderRadius: 10 }}>
                <input className="form-input" value={mgText} onChange={e => setMgText(e.target.value)}
                  placeholder="Small, actionable step..." style={{ marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => { setShowMgInput(false); setMgText(''); }}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={handleAddMg} disabled={saving}>Add Step</button>
                </div>
              </div>
            )}

            {(goal.micro_goals || []).length === 0 && !showMgInput ? (
              <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.35)', fontStyle: 'italic' }}>Break this goal down into smaller steps.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(goal.micro_goals || []).map(mg => (
                  <div key={mg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: mg.completed ? 'rgba(107,140,107,0.08)' : 'var(--mist)', borderRadius: 8, position: 'relative', border: mg.completed ? '1px solid rgba(107,140,107,0.2)' : 'none' }}>
                    <input type="checkbox" checked={!!mg.completed} onChange={() => handleToggleMg(mg.id)} style={{ marginTop: 3, cursor: 'pointer', accentColor: 'var(--sage)' }} />
                    <p style={{ fontSize: 13, color: mg.completed ? 'rgba(13,13,13,0.4)' : 'rgba(13,13,13,0.7)', margin: 0, lineHeight: 1.4, flex: 1, textDecoration: mg.completed ? 'line-through' : 'none' }}>{mg.text}</p>
                    <button onClick={() => handleDeleteMg(mg.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(13,13,13,0.25)' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17 }}>📝 Notes</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setShowNoteInput(!showNoteInput)}>+ Add Note</button>
            </div>

            {showNoteInput && (
              <div style={{ marginBottom: 16, padding: '12px', background: 'var(--mist)', borderRadius: 10 }}>
                <textarea className="form-textarea" value={noteText} onChange={e => setNoteText(e.target.value)}
                  placeholder="Quick note, idea, or reminder about this goal..." style={{ minHeight: 80, marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => { setShowNoteInput(false); setNoteText(''); }}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={saving}>Save Note</button>
                </div>
              </div>
            )}

            {(goal.notes || []).length === 0 && !showNoteInput ? (
              <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.35)', fontStyle: 'italic' }}>No notes yet. Add thoughts, ideas, or reminders.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(goal.notes || []).slice().reverse().map(note => (
                  <div key={note.id} style={{ padding: '10px 12px', background: 'var(--mist)', borderRadius: 8, position: 'relative' }}>
                    <div style={{ fontSize: 10, color: 'rgba(13,13,13,0.35)', marginBottom: 4 }}>
                      {format(new Date(note.date), 'MMM d, yyyy')}
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.7)', margin: 0, lineHeight: 1.5 }}>{note.text}</p>
                    <button onClick={() => handleDeleteNote(note.id)}
                      style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(13,13,13,0.25)', padding: 2 }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reflections Section */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17 }}>💭 Reflections</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setShowReflectionInput(!showReflectionInput)}>+ Add</button>
            </div>

            {showReflectionInput && (
              <div style={{ marginBottom: 16, padding: '12px', background: 'var(--mist)', borderRadius: 10 }}>
                <textarea className="form-textarea" value={reflectionText} onChange={e => setReflectionText(e.target.value)}
                  placeholder="What progress did you make? What did you learn?" style={{ minHeight: 80, marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => { setShowReflectionInput(false); setReflectionText(''); }}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={handleAddReflection} disabled={saving}>Save</button>
                </div>
              </div>
            )}

            {goal.reflection && (
              <div style={{ padding: '10px 14px', background: 'rgba(107,140,107,0.1)', borderRadius: 8, marginBottom: 10, borderLeft: '3px solid var(--sage)' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--sage)', marginBottom: 4 }}>Final Reflection</div>
                <p style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(13,13,13,0.65)', margin: 0 }}>{goal.reflection}</p>
              </div>
            )}

            {(goal.reflections || []).length === 0 && !goal.reflection && !showReflectionInput ? (
              <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.35)', fontStyle: 'italic' }}>No reflections yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(goal.reflections || []).slice().reverse().map((r, i) => (
                  <div key={r.id || i} style={{ padding: '10px 12px', background: 'var(--mist)', borderRadius: 8, borderLeft: '2px solid rgba(13,13,13,0.1)', position: 'relative' }}>
                    <div style={{ fontSize: 10, color: 'rgba(13,13,13,0.35)', marginBottom: 3 }}>
                      {format(new Date(r.date), 'MMM d, yyyy')}
                      {r.status_change && <span style={{ marginLeft: 6, color: 'var(--sage)' }}>· {r.status_change}</span>}
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.7)', fontStyle: 'italic', margin: 0 }}>{r.text}</p>
                    {r.id && (
                      <button onClick={() => handleDeleteReflection(r.id)}
                        style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(13,13,13,0.25)', padding: 2 }}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Extension history */}
        {goal.extension_history?.length > 0 && (
          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 17, marginBottom: 12 }}>🔄 Extension History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {goal.extension_history.map((h, i) => (
                <div key={i} style={{ padding: '10px 14px', background: 'var(--mist)', borderRadius: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', gap: 12, color: 'rgba(13,13,13,0.45)', marginBottom: 4 }}>
                    <span>From: {format(parseISO(h.old_deadline), 'MMM d, yyyy')}</span>
                    <span>→</span>
                    <span>To: {format(parseISO(h.new_deadline), 'MMM d, yyyy')}</span>
                  </div>
                  {h.reason && <p style={{ margin: 0, fontStyle: 'italic', color: 'rgba(13,13,13,0.6)' }}>{h.reason}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reflect Modal */}
      {showReflectModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowReflectModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Reflect on Goal</h3>
              <button className="modal-close" onClick={() => setShowReflectModal(false)}>✕</button>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--mist)', borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
              <strong>{goal.title}</strong>
              <div style={{ color: 'rgba(13,13,13,0.5)', fontSize: 12, marginTop: 2 }}>Deadline: {format(deadline, 'MMM d, yyyy')}</div>
            </div>
            <div className="form-group">
              <label className="form-label">What happened?</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[['completed', '✅ Achieved'], ['extended', '🔄 Need more time'], ['abandoned', '❌ Moving on']].map(([s, l]) => (
                  <button key={s} className={`btn btn-sm ${reflectForm.status === s ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setReflectForm({ ...reflectForm, status: s })}>{l}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Your reflection</label>
              <textarea className="form-textarea" value={reflectForm.reflection}
                onChange={e => setReflectForm({ ...reflectForm, reflection: e.target.value })}
                placeholder="Be honest with yourself..." />
            </div>
            {reflectForm.status === 'extended' && (
              <div className="form-group">
                <label className="form-label">New Deadline</label>
                <input type="date" className="form-input" value={reflectForm.new_deadline}
                  onChange={e => setReflectForm({ ...reflectForm, new_deadline: e.target.value })} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setShowReflectModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReflect} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving...' : 'Save Reflection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

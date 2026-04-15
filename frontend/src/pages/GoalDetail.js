import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import ConfirmModal from '../components/ui/ConfirmModal';


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
  const [confirm, setConfirm] = useState(null);

  // Micro-goals
  const [mgText, setMgText] = useState('');
  const [mgTime, setMgTime] = useState(0);
  const [showMgInput, setShowMgInput] = useState(false);
  const [editMg, setEditMg] = useState(null); // id
  const [editMgText, setEditMgText] = useState('');
  const [editMgTime, setEditMgTime] = useState(0);
  const [editNoteId, setEditNoteId] = useState(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [editReflectionId, setEditReflectionId] = useState(null);
  const [editReflectionText, setEditReflectionText] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState('steps');

  // View modals (preview-and-expand)
  const [viewingReflectionId, setViewingReflectionId] = useState(null);
  const [viewingNoteId, setViewingNoteId] = useState(null);
  const [viewingDescription, setViewingDescription] = useState(false);


  // Note input
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  // Reflection input
  const [reflectionText, setReflectionText] = useState('');
  const [showReflectionInput, setShowReflectionInput] = useState(false);

  // Reflect/complete modal
  const [showReflectModal, setShowReflectModal] = useState(false);
  const [reflectForm, setReflectForm] = useState({ status: 'completed', reflection: '', new_deadline: '' });

  // Edit Goal modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ category_id: '', title: '', description: '', deadline: '' });

  const load = async () => {
    try {
      const [g, c] = await Promise.all([API.get(`/goals/${goalId}`), API.get('/categories')]);
      setGoal(g.data);
      setCategories(c.data);
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to load goal')); navigate('/goals'); }

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
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to add note')); }

    finally { setSaving(false); }

  };

  const handleDeleteNote = (noteId) => {
    setConfirm({
      title: 'Delete Note?',
      message: 'Are you sure you want to remove this note from your goal records?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/goals/${goalId}/notes/${noteId}`);
          toast.success('Note deleted');
          load();
        } catch { toast.error('Failed to delete note'); }
      }
    });
  };

  const handleUpdateNote = async (noteId) => {
    if (!editNoteText.trim()) return toast.error('Note cannot be empty');
    setSaving(true);
    try {
      await API.put(`/goals/${goalId}/notes/${noteId}`, { text: editNoteText });
      toast.success('Note updated!');
      setEditNoteId(null);
      load();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to update note')); }
    finally { setSaving(false); }
  };

  const handleAddMg = async () => {
    if (!mgText.trim()) return toast.error('Enter micro-goal');
    setSaving(true);
    try {
      await API.post(`/goals/${goalId}/micro-goals`, { text: mgText, time_spent: parseInt(mgTime) || 0 });
      toast.success('Added!');
      setMgText('');
      setMgTime(0);
      setShowMgInput(false);
      load();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to add micro-goal')); }

    finally { setSaving(false); }

  };

  const handleUpdateMg = async (mgId) => {
    if (!editMgText.trim()) return toast.error('Enter micro-goal text');
    setSaving(true);
    try {
      await API.put(`/goals/${goalId}/micro-goals/${mgId}`, { text: editMgText, time_spent: parseInt(editMgTime) || 0 });
      toast.success('Updated!');
      setEditMg(null);
      load();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to update micro-goal')); }

    finally { setSaving(false); }

  };


  const handleToggleMg = async (mgId) => {
    try {
      await API.put(`/goals/${goalId}/micro-goals/${mgId}/toggle`);
      load();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to update')); }

  };

  const handleDeleteMg = (mgId) => {
    setConfirm({
      title: 'Remove Step?',
      message: 'Are you sure you want to delete this implementation step?',
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/goals/${goalId}/micro-goals/${mgId}`);
          load();
        } catch { toast.error('Failed to delete step'); }
      }
    });
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
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to add reflection')); }

    finally { setSaving(false); }
  };

  const handleDeleteReflection = (reflectionId) => {
    setConfirm({
      title: 'Delete Reflection?',
      message: 'Are you sure you want to remove this insight from your evolution track?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/goals/${goalId}/reflections/${reflectionId}`);
          toast.success('Reflection deleted');
          load();
        } catch { toast.error('Failed to delete reflection'); }
      }
    });
  };

  const handleUpdateReflection = async (reflectionId) => {
    if (!editReflectionText.trim()) return toast.error('Reflection cannot be empty');
    setSaving(true);
    try {
      await API.put(`/goals/${goalId}/reflections/${reflectionId}`, { text: editReflectionText });
      toast.success('Reflection updated!');
      setEditReflectionId(null);
      load();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to update reflection')); }
    finally { setSaving(false); }
  };

  const handleUpdateGoal = async () => {
    if (!editForm.title || !editForm.category_id || !editForm.deadline) return toast.error('Fill all required fields');
    setSaving(true);
    try {
      await API.put(`/goals/${goalId}`, editForm);
      toast.success('Goal updated!');
      setShowEditModal(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save goal'));
    } finally { setSaving(false); }
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
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to save reflection')); }

    finally { setSaving(false); }
  };

  const handleDelete = () => {
    setConfirm({
      title: 'Delete Goal Forever?',
      message: `Are you sure you want to delete "${goal.title}"? This will permanently remove all associated notes, steps, and history.`,
      confirmLabel: 'Delete Permanently',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/goals/${goalId}`);
          toast.success('Goal deleted');
          navigate('/goals');
        } catch (e) { toast.error(getErrorMessage(e, 'Failed to delete goal')); }
      }
    });
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
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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

        {/* Goal Overview Card */}
        <div className="card" style={{ padding: '32px', position: 'relative', overflow: 'hidden', marginBottom: 32 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: cat?.color || 'var(--sage)' }} />

          <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: 24, marginBottom: 8 }}>{goal.title}</h3>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span className={`tag ${goal.status === 'completed' ? 'tag-green' : isOverdue ? 'tag-rust' : 'tag-gold'}`} style={{ padding: '4px 12px' }}>
                  {goal.status}
                </span>
                <span style={{ fontSize: 13, color: 'rgba(13,13,13,0.4)' }}>
                  Started {format(new Date(goal.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
            <div className="wrap-on-mobile" style={{ display: 'flex', gap: 8 }}>
              {isActive && (
                <button className="btn btn-primary" onClick={() => { setShowReflectModal(true); setReflectForm({ status: 'completed', reflection: '', new_deadline: '' }); }} style={{ borderRadius: 30 }}>
                  Complete Goal ✦
                </button>
              )}
              <button className="btn btn-outline" onClick={() => { setEditForm({ category_id: goal.category_id, title: goal.title, description: goal.description || '', deadline: goal.current_deadline }); setShowEditModal(true); }} style={{ borderRadius: 30 }}>✎ Edit</button>
              <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--rust)', opacity: 0.5 }}>🗑</button>
            </div>
          </div>

          {goal.description && (
            <div
              style={{ position: 'relative', maxHeight: 120, overflow: 'hidden', cursor: 'pointer', marginBottom: 24, transition: 'opacity 0.2s' }}
              onClick={() => setViewingDescription(true)}
              onMouseOver={e => e.currentTarget.style.opacity = 0.8}
              onMouseOut={e => e.currentTarget.style.opacity = 1}
            >
              <div className="markdown-body" style={{ fontSize: 16, color: 'var(--ink)', opacity: 0.8, lineHeight: 1.8 }}>
                <MarkdownRenderer content={goal.description} />
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: 'linear-gradient(transparent, var(--paper, #fff))', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', fontSize: 13, color: 'var(--sage)', fontWeight: 600, paddingBottom: 4, pointerEvents: 'none' }}>Click to read full description</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, padding: '20px', background: 'var(--mist)', borderRadius: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Target Deadline</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: isOverdue ? 'var(--rust)' : 'var(--ink)' }}>
                {format(deadline, 'MMMM d, yyyy')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Status Window</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>
                {isOverdue ? `${Math.abs(daysLeft)} days overdue` : isActive ? `${daysLeft} days remaining` : 'Goal finalized'}
              </div>
            </div>
            {goal.micro_goals?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Steps Done</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--sage)' }}>
                  {goal.micro_goals.filter(m => m.completed).length}/{goal.micro_goals.length}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Bar */}
        <div className="tabs-container" style={{ marginBottom: 24 }}>
          <div className="goal-tabs-bar" style={{ display: 'flex', gap: 24, borderBottom: '1px solid rgba(13,13,13,0.1)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {[
              { key: 'steps', label: '🎯 Implementation Steps', count: (goal.micro_goals || []).length },
              { key: 'evolution', label: '💭 Evolution Track', count: (goal.reflections || []).length },
              { key: 'notes', label: '📝 Field Notes', count: (goal.notes || []).length },
            ].map(tab => (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: 'none', border: 'none', padding: '12px 0', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
                  color: activeTab === tab.key ? 'var(--ink)' : 'rgba(13,13,13,0.4)',
                  borderBottom: activeTab === tab.key ? '2px solid var(--ink)' : '2px solid transparent',
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Tab: Implementation Steps */}
        {activeTab === 'steps' && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-sm btn-outline" onClick={() => setShowMgInput(!showMgInput)} style={{ borderRadius: 20 }}>
                {showMgInput ? 'Cancel' : '+ Add Step'}
              </button>
            </div>

            <div className="card" style={{ padding: '8px' }}>
              {showMgInput && (
                <div style={{ margin: '12px', padding: '16px', background: 'var(--cloud)', borderRadius: 12, border: '1px solid rgba(13,13,13,0.05)' }}>
                  <input maxLength={200} 
                    className="form-input" 
                    value={mgText} 
                    onChange={e => setMgText(e.target.value)}
                    placeholder="What is the next tiny step?" 
                    style={{ marginBottom: 12, fontSize: 15, border: 'none', background: 'transparent', padding: 0 }} 
                    autoFocus
                  />
                  <div className="mg-add-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)' }}>⏱ Estimate:</span>
                      <input maxLength={200} type="number" className="form-input input-xs" value={mgTime} onChange={e => setMgTime(e.target.value)}
                        style={{ padding: '4px 8px', fontSize: 13 }} min="0" />
                      <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)' }}>min</span>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleAddMg} disabled={saving} style={{ borderRadius: 20 }}>Add to Path</button>
                  </div>
                </div>
              )}

              {(goal.micro_goals || []).length === 0 && !showMgInput ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(13,13,13,0.3)' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>⚒️</div>
                  <p style={{ fontSize: 14 }}>Deconstruct this goal into manageable chunks.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {(goal.micro_goals || []).map((mg, idx) => (
                    <div key={mg.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 16, 
                      padding: '16px 20px', 
                      borderBottom: idx === goal.micro_goals.length - 1 ? 'none' : '1px solid rgba(13,13,13,0.04)',
                      background: mg.completed ? 'rgba(107,140,107,0.02)' : 'transparent'
                    }}>
                      <input type="checkbox" checked={!!mg.completed} onChange={() => handleToggleMg(mg.id)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--sage)' }} />
                      <div style={{ flex: 1 }}>
                        {editMg === mg.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input maxLength={200} className="form-input" value={editMgText} onChange={e => setEditMgText(e.target.value)} style={{ padding: '4px 8px', fontSize: 14 }} />
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <input maxLength={200} type="number" className="form-input input-xs" value={editMgTime} onChange={e => setEditMgTime(e.target.value)} style={{ padding: '2px 6px', fontSize: 12 }} />
                              <span style={{ fontSize: 11, opacity: 0.5 }}>min</span>
                              <div style={{ flex: 1 }} />
                              <button className="btn btn-ghost btn-sm" onClick={() => setEditMg(null)}>Cancel</button>
                              <button className="btn btn-primary btn-sm" onClick={() => handleUpdateMg(mg.id)}>Save</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="markdown-body" style={{ 
                              fontSize: 15, 
                              color: mg.completed ? 'rgba(13,13,13,0.3)' : 'var(--ink)', 
                              textDecoration: mg.completed ? 'line-through' : 'none' 
                            }}>
                              <MarkdownRenderer content={mg.text} />
                            </div>
                            {mg.time_spent > 0 && <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', marginTop: 4, display: 'block' }}>Estimated {mg.time_spent} min</span>}
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, opacity: 0.3 }}>
                        <button onClick={() => { setEditMg(mg.id); setEditMgText(mg.text); setEditMgTime(mg.time_spent || 0); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>✎</button>
                        <button onClick={() => handleDeleteMg(mg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tab: Evolution Track */}
        {activeTab === 'evolution' && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowReflectionInput(!showReflectionInput)}>Record Insights</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {showReflectionInput && (
                <div className="card" style={{ padding: '16px', background: 'var(--cloud)', border: '1px solid var(--sage-light)' }}>
                  <textarea maxLength={2000} className="form-textarea" value={reflectionText} onChange={e => setReflectionText(e.target.value)}
                    placeholder="What are you learning about this journey?" style={{ minHeight: 100, marginBottom: 12, border: 'none', background: 'transparent', padding: 0 }} autoFocus />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowReflectionInput(false)}>Cancel</button>
                    <button className="btn btn-primary btn-sm" onClick={handleAddReflection} disabled={saving}>Save Insight</button>
                  </div>
                </div>
              )}

              {goal.reflection && (
                <div className="card" style={{ padding: '20px', background: 'var(--mist)', borderLeft: '4px solid var(--sage)' }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--sage)', fontWeight: 700, marginBottom: 8 }}>Final Outcome</div>
                  <div className="markdown-body" style={{ fontSize: 14, fontStyle: 'italic', lineHeight: 1.6 }}><MarkdownRenderer content={goal.reflection} /></div>
                </div>
              )}

              {(goal.reflections || []).length === 0 && !showReflectionInput && (
                <div className="card" style={{ textAlign: 'center', padding: '40px 0', opacity: 0.4 }}>
                  <p>Record your insights and observations about this journey.</p>
                </div>
              )}

              {(goal.reflections || []).slice().reverse().map((r, i) => (
                <div key={r.id || i} className="card" style={{ padding: '16px 20px', cursor: editReflectionId === r.id ? 'default' : 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }}
                  onClick={() => editReflectionId !== r.id && setViewingReflectionId(r.id)}
                  onMouseOver={e => { if (editReflectionId !== r.id) e.currentTarget.style.borderColor = 'var(--sage)'; }}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{format(new Date(r.date), 'MMM d, yyyy')}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {r.status_change && <span style={{ color: 'var(--sage)', fontWeight: 600 }}>{r.status_change}</span>}
                      <button onClick={(e) => { e.stopPropagation(); setEditReflectionId(r.id); setEditReflectionText(r.text); }} className="btn btn-ghost" style={{ padding: 0, opacity: 0.3, fontSize: 12 }}>✎</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteReflection(r.id); }} className="btn btn-ghost" style={{ padding: 0, opacity: 0.3, fontSize: 12, color: 'var(--rust)' }}>✕</button>
                    </div>
                  </div>
                  {editReflectionId === r.id ? (
                    <div style={{ marginTop: 8 }}>
                      <textarea maxLength={2000} className="form-textarea" value={editReflectionText} onChange={e => setEditReflectionText(e.target.value)} style={{ minHeight: 80, fontSize: 13, marginBottom: 8 }} />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setEditReflectionId(null); }}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handleUpdateReflection(r.id); }}>Update</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ position: 'relative', maxHeight: 80, overflow: 'hidden' }}>
                      <div className="markdown-body" style={{ fontSize: 14, color: 'rgba(13,13,13,0.6)', fontStyle: 'italic' }}>
                        <MarkdownRenderer content={r.text} />
                      </div>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, var(--paper, #fff))', pointerEvents: 'none' }} />
                    </div>
                  )}
                  {editReflectionId !== r.id && <div style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600, marginTop: 8 }}>Read more →</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab: Field Notes */}
        {activeTab === 'notes' && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowNoteInput(!showNoteInput)}>Add Note</button>
            </div>

            {showNoteInput && (
              <div className="card" style={{ padding: '16px', marginBottom: 16, background: 'var(--cloud)' }}>
                <textarea maxLength={2000} className="form-textarea" value={noteText} onChange={e => setNoteText(e.target.value)}
                  placeholder="Quick thought or reminder..." style={{ minHeight: 80, marginBottom: 12, border: 'none', background: 'transparent', padding: 0 }} autoFocus />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowNoteInput(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={saving}>Save</button>
                </div>
              </div>
            )}

            {(goal.notes || []).length === 0 && !showNoteInput && (
              <div className="card" style={{ textAlign: 'center', padding: '40px 0', opacity: 0.4 }}>
                <p>Capture quick thoughts and reminders about this goal.</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(goal.notes || []).slice().reverse().map(note => (
                <div key={note.id} style={{ padding: '12px 16px', background: 'white', borderRadius: 12, border: '1px solid rgba(13,13,13,0.04)', boxShadow: '0 2px 4px rgba(13,13,13,0.02)', cursor: editNoteId === note.id ? 'default' : 'pointer', transition: 'all 0.2s' }}
                  onClick={() => editNoteId !== note.id && setViewingNoteId(note.id)}
                  onMouseOver={e => { if (editNoteId !== note.id) e.currentTarget.style.borderColor = 'var(--sage)'; }}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(13,13,13,0.04)'}
                >
                  <div style={{ fontSize: 10, color: 'rgba(13,13,13,0.3)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{format(new Date(note.date), 'MMM d, yyyy · p')}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={(e) => { e.stopPropagation(); setEditNoteId(note.id); setEditNoteText(note.text); }} className="btn btn-ghost" style={{ padding: 0, opacity: 0.3, fontSize: 11 }}>✎ Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }} className="btn btn-ghost" style={{ padding: 0, opacity: 0.3, fontSize: 11, color: 'var(--rust)' }}>✕</button>
                    </div>
                  </div>
                  {editNoteId === note.id ? (
                    <div style={{ marginTop: 8 }}>
                      <textarea maxLength={2000} className="form-textarea" value={editNoteText} onChange={e => setEditNoteText(e.target.value)} style={{ minHeight: 60, fontSize: 12, marginBottom: 8 }} />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setEditNoteId(null); }}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handleUpdateNote(note.id); }}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ position: 'relative', maxHeight: 70, overflow: 'hidden' }}>
                      <div className="markdown-body" style={{ fontSize: 13, color: 'rgba(13,13,13,0.7)' }}><MarkdownRenderer content={note.text} /></div>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 35, background: 'linear-gradient(transparent, white)', pointerEvents: 'none' }} />
                    </div>
                  )}
                  {editNoteId !== note.id && <div style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600, marginTop: 6 }}>Read more →</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Extensions history */}
        {goal.extension_history?.length > 0 && (
          <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(13,13,13,0.05)' }}>
            <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: 'rgba(13,13,13,0.3)', letterSpacing: 1, marginBottom: 16 }}>Deadline History</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {goal.extension_history.map((h, i) => (
                <div key={i} className="tag tag-mist" style={{ padding: '6px 12px', fontSize: 12 }}>
                  {format(parseISO(h.old_deadline), 'MMM d')} → {format(parseISO(h.new_deadline), 'MMM d, yyyy')}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Goal</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={editForm.category_id} onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Goal Title</label>
              <input maxLength={200} className="form-input" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="What do you want to achieve?" />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea maxLength={2000} className="form-textarea" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="What does success look like?" style={{ minHeight: 120 }} />
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
            </div>
            <div className="form-group">
              <label className="form-label">Target Deadline</label>
              <input maxLength={200} type="date" className="form-input" value={editForm.deadline} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} />
            </div>
            <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setShowEditModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateGoal} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="reflect-status-btns" style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {[['completed', '✅ Achieved'], ['extended', '🔄 Need more time'], ['abandoned', '❌ Moving on']].map(([s, l]) => (
                  <button key={s} className={`btn btn-sm ${reflectForm.status === s ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setReflectForm({ ...reflectForm, status: s })}>{l}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Your reflection</label>
              <textarea maxLength={2000} className="form-textarea" value={reflectForm.reflection}
                onChange={e => setReflectForm({ ...reflectForm, reflection: e.target.value })}
                placeholder="Be honest with yourself..." />
            </div>
            {reflectForm.status === 'extended' && (
              <div className="form-group">
                <label className="form-label">New Deadline</label>
                <input maxLength={200} type="date" className="form-input" value={reflectForm.new_deadline}
                  onChange={e => setReflectForm({ ...reflectForm, new_deadline: e.target.value })} />
              </div>
            )}
            <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setShowReflectModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReflect} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving...' : 'Save Reflection'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* View Description Modal */}
      {viewingDescription && goal.description && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewingDescription(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, margin: 0 }}>Goal Description</h3>
              <button className="modal-close" onClick={() => setViewingDescription(false)}>✕</button>
            </div>
            <div className="page-body">
              <div className="markdown-body" style={{ fontSize: 16 }}>
                <MarkdownRenderer content={goal.description} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-outline" onClick={() => setViewingDescription(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* View Reflection Modal */}
      {viewingReflectionId !== null && (() => {
        const r = (goal.reflections || []).find(x => x.id === viewingReflectionId);
        return r ? (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewingReflectionId(null)}>
            <div className="modal" style={{ maxWidth: 700 }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, background: 'var(--sage)', color: 'white', padding: '4px 12px', borderRadius: 8 }}>{format(new Date(r.date), 'MMM d, yyyy')}</span>
                  <span style={{ fontSize: 18, color: 'rgba(13,13,13,0.4)' }}>Evolution Track</span>
                </h3>
                <button className="modal-close" onClick={() => setViewingReflectionId(null)}>✕</button>
              </div>
              <div className="page-body" style={{ minHeight: 80 }}>
                {r.status_change && <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700, marginBottom: 12 }}>{r.status_change}</div>}
                <div className="markdown-body" style={{ fontSize: 16, fontStyle: 'italic' }}>
                  <MarkdownRenderer content={r.text} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                <button className="btn btn-outline" onClick={() => setViewingReflectionId(null)}>Close</button>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* View Note Modal */}
      {viewingNoteId !== null && (() => {
        const note = (goal.notes || []).find(x => x.id === viewingNoteId);
        return note ? (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewingNoteId(null)}>
            <div className="modal" style={{ maxWidth: 700 }}>
              <div className="modal-header" style={{ alignItems: 'center' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, background: 'var(--sage)', color: 'white', padding: '4px 12px', borderRadius: 8 }}>{format(new Date(note.date), 'MMM d, yyyy')}</span>
                  <span style={{ fontSize: 18, color: 'rgba(13,13,13,0.4)' }}>Field Note</span>
                </h3>
                <button className="modal-close" onClick={() => setViewingNoteId(null)}>✕</button>
              </div>
              <div className="page-body" style={{ minHeight: 80 }}>
                <div className="markdown-body" style={{ fontSize: 16 }}>
                  <MarkdownRenderer content={note.text} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                <button className="btn btn-outline" onClick={() => setViewingNoteId(null)}>Close</button>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

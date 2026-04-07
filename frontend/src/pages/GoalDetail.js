import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

export default function GoalDetail() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    await API.delete(`/goals/${goalId}/notes/${noteId}`);
    toast.success('Note deleted');
    load();
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
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to add reflection')); }

    finally { setSaving(false); }
  };

  const handleDeleteReflection = async (reflectionId) => {
    if (!window.confirm('Delete this reflection?')) return;
    await API.delete(`/goals/${goalId}/reflections/${reflectionId}`);
    toast.success('Reflection deleted');
    load();
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 32, alignItems: 'flex-start' }}>
          
          {/* Main Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {/* Goal Overview Card */}
            <div className="card" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: cat?.color || 'var(--sage)' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
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
                <div style={{ display: 'flex', gap: 8 }}>
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
                <div className="markdown-body" style={{ fontSize: 16, color: 'var(--ink)', opacity: 0.8, lineHeight: 1.8, marginBottom: 24 }}>
                  <MarkdownRenderer content={goal.description} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '20px', background: 'var(--mist)', borderRadius: 12 }}>
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
              </div>
            </div>

            {/* Micro-goals Section */}
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18 }}>🎯 Implementation Steps</h3>
                <button className="btn btn-sm btn-outline" onClick={() => setShowMgInput(!showMgInput)} style={{ borderRadius: 20 }}>
                  {showMgInput ? 'Cancel' : '+ Add Step'}
                </button>
              </div>

              <div className="card" style={{ padding: '8px' }}>
                {showMgInput && (
                  <div style={{ margin: '12px', padding: '16px', background: 'var(--cloud)', borderRadius: 12, border: '1px solid rgba(13,13,13,0.05)' }}>
                    <input 
                      className="form-input" 
                      value={mgText} 
                      onChange={e => setMgText(e.target.value)}
                      placeholder="What is the next tiny step?" 
                      style={{ marginBottom: 12, fontSize: 15, border: 'none', background: 'transparent', padding: 0 }} 
                      autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)' }}>⏱ Estimate:</span>
                        <input type="number" className="form-input" value={mgTime} onChange={e => setMgTime(e.target.value)}
                          style={{ width: 60, padding: '4px 8px', fontSize: 13 }} min="0" />
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
                              <input className="form-input" value={editMgText} onChange={e => setEditMgText(e.target.value)} style={{ padding: '4px 8px', fontSize: 14 }} />
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input type="number" className="form-input" value={editMgTime} onChange={e => setEditMgTime(e.target.value)} style={{ width: 60, padding: '2px 6px', fontSize: 12 }} />
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
          </div>

          {/* Sidebar Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {/* Reflections Section */}
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18 }}>💭 Evolution Track</h3>
                <button className="btn btn-sm btn-ghost" onClick={() => setShowReflectionInput(!showReflectionInput)}>Record Insights</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {showReflectionInput && (
                  <div className="card" style={{ padding: '16px', background: 'var(--cloud)', border: '1px solid var(--sage-light)' }}>
                    <textarea className="form-textarea" value={reflectionText} onChange={e => setReflectionText(e.target.value)}
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

                {(goal.reflections || []).slice().reverse().map((r, i) => (
                  <div key={r.id || i} className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{format(new Date(r.date), 'MMM d, yyyy')}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {r.status_change && <span style={{ color: 'var(--sage)', fontWeight: 600 }}>{r.status_change}</span>}
                        <button onClick={() => { setEditReflectionId(r.id); setEditReflectionText(r.text); }} className="btn btn-ghost" style={{ padding: 0, opacity: 0.3, fontSize: 12 }}>✎</button>
                        <button onClick={() => handleDeleteReflection(r.id)} className="btn btn-ghost" style={{ padding: 0, opacity: 0.3, fontSize: 12, color: 'var(--rust)' }}>✕</button>
                      </div>
                    </div>
                    {editReflectionId === r.id ? (
                      <div style={{ marginTop: 8 }}>
                        <textarea className="form-textarea" value={editReflectionText} onChange={e => setEditReflectionText(e.target.value)} style={{ minHeight: 80, fontSize: 13, marginBottom: 8 }} />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditReflectionId(null)}>Cancel</button>
                          <button className="btn btn-primary btn-sm" onClick={() => handleUpdateReflection(r.id)}>Update</button>
                        </div>
                      </div>
                    ) : (
                      <div className="markdown-body" style={{ fontSize: 14, color: 'rgba(13,13,13,0.6)', fontStyle: 'italic' }}>
                        <MarkdownRenderer content={r.text} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Notes Section */}
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18 }}>📝 Field Notes</h3>
                <button className="btn btn-sm btn-ghost" onClick={() => setShowNoteInput(!showNoteInput)}>Add Note</button>
              </div>

              {showNoteInput && (
                <div className="card" style={{ padding: '16px', marginBottom: 12, background: 'var(--cloud)' }}>
                  <textarea className="form-textarea" value={noteText} onChange={e => setNoteText(e.target.value)}
                    placeholder="Quick thought or reminder..." style={{ minHeight: 80, marginBottom: 12, border: 'none', background: 'transparent', padding: 0 }} autoFocus />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowNoteInput(false)}>Cancel</button>
                    <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={saving}>Save</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(goal.notes || []).slice().reverse().map(note => (
                  <div key={note.id} style={{ padding: '12px 16px', background: 'white', borderRadius: 12, border: '1px solid rgba(13,13,13,0.04)', boxShadow: '0 2px 4px rgba(13,13,13,0.02)' }}>
                    <div style={{ fontSize: 10, color: 'rgba(13,13,13,0.3)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{format(new Date(note.date), 'MMM d, yyyy · p')}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setEditNoteId(note.id); setEditNoteText(note.text); }} className="btn btn-ghost" style={{ padding: 0, opacity: 0.3, fontSize: 11 }}>✎ Edit</button>
                        <button onClick={() => handleDeleteNote(note.id)} className="btn btn-ghost" style={{ padding: 0, opacity: 0.3, fontSize: 11, color: 'var(--rust)' }}>✕</button>
                      </div>
                    </div>
                    {editNoteId === note.id ? (
                      <div style={{ marginTop: 8 }}>
                        <textarea className="form-textarea" value={editNoteText} onChange={e => setEditNoteText(e.target.value)} style={{ minHeight: 60, fontSize: 12, marginBottom: 8 }} />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditNoteId(null)}>Cancel</button>
                          <button className="btn btn-primary btn-sm" onClick={() => handleUpdateNote(note.id)}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="markdown-body" style={{ fontSize: 13, color: 'rgba(13,13,13,0.7)' }}><MarkdownRenderer content={note.text} /></div>
                    )}
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>

        {/* Extensions history - simplified */}
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
              <input className="form-input" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="What do you want to achieve?" />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea className="form-textarea" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="What does success look like?" style={{ minHeight: 120 }} />
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
            </div>
            <div className="form-group">
              <label className="form-label">Target Deadline</label>
              <input type="date" className="form-input" value={editForm.deadline} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
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

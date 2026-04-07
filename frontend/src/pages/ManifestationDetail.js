import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';

const PROGRESS_TYPES = [
  { value: 'improvement', label: '📈 Improvement', color: 'var(--sage)' },
  { value: 'learning', label: '💡 Learning', color: '#c9a84c' },
  { value: 'milestone', label: '🏆 Milestone', color: '#8b6bc4' },
  { value: 'challenge', label: '⚡ Challenge', color: '#c4623a' },
];

const CUSTOM_TYPE_PLACEHOLDER = 'custom';

export default function ManifestationDetail() {
  const { manifestationId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Progress
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [progressForm, setProgressForm] = useState({ text: '', type: 'improvement', customType: '' });
  const [editProgress, setEditProgress] = useState(null);
  const [editProgressForm, setEditProgressForm] = useState({ text: '', type: 'improvement', customType: '' });

  // Notes
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [editNoteId, setEditNoteId] = useState(null);
  const [editNoteText, setEditNoteText] = useState('');

  // Complete modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [reflection, setReflection] = useState('');

  // Edit Vision modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editVisionForm, setEditVisionForm] = useState({ vision: '', notes: '', target_days: 30 });

  const load = async () => {
    try {
      const r = await API.get(`/manifestations/${manifestationId}`);
      setItem(r.data);
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to load')); navigate('/manifestations'); }

    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [manifestationId]);

  const resolveType = (form) => form.type === CUSTOM_TYPE_PLACEHOLDER ? (form.customType.trim() || 'custom') : form.type;

  const handleAddProgress = async () => {
    if (!progressForm.text.trim()) return toast.error('Write your progress entry');
    setSaving(true);
    try {
      await API.post(`/manifestations/${manifestationId}/progress`, { text: progressForm.text, type: resolveType(progressForm) });
      toast.success('Progress added!');
      setProgressForm({ text: '', type: 'improvement', customType: '' });
      setShowProgressForm(false);
      load();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed')); }


    finally { setSaving(false); }
  };

  const handleUpdateProgress = async (entryId) => {
    if (!editProgressForm.text.trim()) return toast.error('Write your progress entry');
    setSaving(true);
    try {
      await API.put(`/manifestations/${manifestationId}/progress/${entryId}`, { text: editProgressForm.text, type: resolveType(editProgressForm) });
      toast.success('Progress updated!');
      setEditProgress(null);
      load();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed')); }


    finally { setSaving(false); }
  };

  const handleDeleteProgress = async (entryId) => {
    if (!window.confirm('Delete this progress entry?')) return;
    await API.delete(`/manifestations/${manifestationId}/progress/${entryId}`);
    toast.success('Deleted');
    load();
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return toast.error('Write a note');
    setSaving(true);
    try {
      await API.post(`/manifestations/${manifestationId}/notes`, { text: noteText });
      toast.success('Note added!');
      setNoteText('');
      setShowNoteInput(false);
      load();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed')); }


    finally { setSaving(false); }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    await API.delete(`/manifestations/${manifestationId}/notes/${noteId}`);
    toast.success('Note deleted');
    load();
  };

  const handleUpdateNote = async (noteId) => {
    if (!editNoteText.trim()) return toast.error('Note cannot be empty');
    setSaving(true);
    try {
      await API.put(`/manifestations/${manifestationId}/notes/${noteId}`, { text: editNoteText });
      toast.success('Note updated!');
      setEditNoteId(null);
      load();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to update note')); }
    finally { setSaving(false); }
  };

  const handleComplete = async () => {
    if (!reflection.trim()) return toast.error('Write your reflection');
    setSaving(true);
    try {
      await API.put(`/manifestations/${manifestationId}/complete`, { text: reflection });
      toast.success('✧ Manifestation cycle complete!');
      setShowCompleteModal(false);
      load();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed')); }
    finally { setSaving(false); }
  };

  const handleUpdateVision = async () => {
    if (!editVisionForm.vision.trim()) return toast.error('Vision cannot be empty');
    setSaving(true);
    try {
      await API.put(`/manifestations/${manifestationId}`, editVisionForm);
      toast.success('Vision updated!');
      setShowEditModal(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update vision'));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this vision permanently?')) return;
    await API.delete(`/manifestations/${manifestationId}`);
    toast.success('Vision deleted');
    navigate('/manifestations');
  };

  const getProgressTypeInfo = (typeVal) => {
    const found = PROGRESS_TYPES.find(t => t.value === typeVal);
    return found || { label: typeVal, color: '#888' };
  };

  if (loading) return (
    <div className="page-body">
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, marginBottom: 16 }} />)}
    </div>
  );

  if (!item) return null;

  const target = parseISO(item.target_date);
  const daysLeft = differenceInDays(target, new Date());
  const totalDays = item.target_days;
  const daysElapsed = totalDays - Math.max(daysLeft, 0);
  const progress = Math.min(Math.round((daysElapsed / totalDays) * 100), 100);
  const isReady = isPast(target) && item.status === 'active';
  const isActive = item.status === 'active';
  const progressEntries = item.progress_entries || [];
  const notes = item.manifestation_notes || [];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/manifestations')} style={{ color: 'rgba(13,13,13,0.4)', padding: '4px 8px' }}>
            ← Manifestations
          </button>
          <span style={{ fontSize: 12, color: isReady ? 'var(--gold)' : 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {isReady ? '✧ Vision Day!' : item.status === 'completed' ? '✓ Completed' : item.status === 'archived' ? '📦 Archived' : `${item.target_days}-Day Vision`}
          </span>
        </div>
        <h2>Vision Detail ✧</h2>
        <p style={{ color: 'rgba(13,13,13,0.5)' }}>
          Started {format(parseISO(item.start_date), 'MMM d')} · Target {format(target, 'MMM d, yyyy')}
          {isActive && !isReady && ` · ${Math.max(daysLeft, 0)} days left`}
        </p>
      </div>

      <div className="page-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 32, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Vision Context Card */}
          <div className="card" style={{ background: isReady ? 'var(--ink)' : 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, color: isReady ? 'var(--gold)' : 'rgba(13,13,13,0.4)', margin: 0 }}>
                {isReady ? '✧ Ready for Reflection' : 'The Vision'}
              </h3>
              {isActive && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm btn-outline" style={{ color: isReady ? 'var(--paper)' : 'inherit', borderColor: isReady ? 'rgba(255,255,255,0.2)' : 'rgba(13,13,13,0.1)' }} 
                    onClick={() => setShowProgressForm(true)}>+ Add Progress</button>
                  <button className="btn btn-sm btn-ghost" style={{ color: isReady ? 'var(--paper)' : 'inherit', opacity: 0.6 }}
                    onClick={() => { setEditVisionForm({ vision: item.vision, notes: item.notes || '', target_days: item.target_days }); setShowEditModal(true); }}>✎ Edit</button>
                  <button className="btn btn-sm btn-ghost" style={{ color: 'var(--rust)', opacity: 0.6 }} onClick={handleDelete}>✕ Delete</button>
                  {isReady && <button className="btn btn-gold btn-sm" onClick={() => { setShowCompleteModal(true); setReflection(''); }}>Reflect & Complete</button>}
                </div>
              )}
            </div>

            <blockquote className="markdown-body" style={{
              fontFamily: 'Fraunces', fontSize: 24, fontStyle: 'italic',
              color: isReady ? 'rgba(245,240,232,0.95)' : 'var(--ink)', lineHeight: 1.6, margin: '0 0 24px',
              padding: '0 0 0 24px', borderLeft: `3px solid ${isReady ? 'var(--gold)' : 'var(--sage)'}`
            }}>
              <MarkdownRenderer content={item.vision} />
            </blockquote>

            {item.notes && (
              <div style={{ padding: '16px 20px', background: isReady ? 'rgba(255,255,255,0.05)' : 'var(--mist)', borderRadius: 14, marginBottom: 24 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: isReady ? 'var(--gold)' : 'var(--sage)', fontWeight: 700, marginBottom: 8 }}>Original Notes</div>
                <div className="markdown-body" style={{ fontSize: 14, color: isReady ? 'rgba(245,240,232,0.7)' : 'rgba(13,13,13,0.6)', fontStyle: 'italic' }}>
                  <MarkdownRenderer content={item.notes} />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 24, paddingTop: 24, borderTop: isReady ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(13,13,13,0.05)' }}>
               <div>
                 <label className="form-label" style={{ fontSize: 10, color: isReady ? 'rgba(245,240,232,0.4)' : 'rgba(13,13,13,0.4)' }}>Status</label>
                 <div className={`tag ${isReady ? 'tag-gold' : item.status === 'completed' ? 'tag-mist' : 'tag-green'}`} style={{ width: 'fit-content' }}>
                   {item.status}
                 </div>
               </div>
               <div>
                 <label className="form-label" style={{ fontSize: 10, color: isReady ? 'rgba(245,240,232,0.4)' : 'rgba(13,13,13,0.4)' }}>Target Date</label>
                 <div style={{ fontSize: 15, fontFamily: 'Fraunces', color: isReady ? 'var(--paper)' : 'var(--ink)' }}>{format(target, 'MMM d, yyyy')}</div>
               </div>
               {isActive && (
                 <div>
                   <label className="form-label" style={{ fontSize: 10, color: isReady ? 'rgba(245,240,232,0.4)' : 'rgba(13,13,13,0.4)' }}>Progress</label>
                   <div style={{ fontSize: 18, fontFamily: 'Fraunces', color: isReady ? 'var(--gold)' : 'var(--sage)' }}>{progress}%</div>
                 </div>
               )}
            </div>
          </div>

          {item.reflection && (
            <div className="card">
              <h3 style={{ fontSize: 18, marginBottom: 20 }}>Final Reflection ✧</h3>
              <div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink)', fontStyle: 'italic' }}>
                <MarkdownRenderer content={item.reflection} />
              </div>
            </div>
          )}

          {showProgressForm && (
            <div className="card" style={{ border: '2px solid var(--sage)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, margin: 0 }}>Log Progress</h3>
                <button className="btn btn-ghost" onClick={() => setShowProgressForm(false)}>✕</button>
              </div>
              
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {PROGRESS_TYPES.map(t => (
                  <button key={t.value} className={`btn btn-sm ${progressForm.type === t.value ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setProgressForm({ ...progressForm, type: t.value })}>{t.label}</button>
                ))}
                <button className={`btn btn-sm ${progressForm.type === CUSTOM_TYPE_PLACEHOLDER ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setProgressForm({ ...progressForm, type: CUSTOM_TYPE_PLACEHOLDER })}>✏️ Custom</button>
              </div>

              {progressForm.type === CUSTOM_TYPE_PLACEHOLDER && (
                <input className="form-input" value={progressForm.customType}
                  onChange={e => setProgressForm({ ...progressForm, customType: e.target.value })}
                  placeholder="Enter custom type..." style={{ marginBottom: 16 }} />
              )}

              <textarea className="form-textarea" value={progressForm.text} autofill="off"
                onChange={e => setProgressForm({ ...progressForm, text: e.target.value })}
                placeholder="What did you manifest or learn today?" style={{ minHeight: 120, marginBottom: 20 }} />

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-empty" onClick={() => setShowProgressForm(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddProgress} disabled={saving} style={{ flex: 1 }}>Save Entry</button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Activity & Notes */}
        <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)', marginBottom: 20 }}>Progress Feed</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {progressEntries.length === 0 ? (
                <p style={{ fontSize: 12, opacity: 0.4, fontStyle: 'italic' }}>No progress logged yet.</p>
              ) : (
                progressEntries.slice().reverse().map((e) => {
                  const pt = getProgressTypeInfo(e.type);
                  const isEditing = editProgress === e.id;
                  return (
                    <div key={e.id} style={{ borderLeft: `2px solid ${pt.color}`, paddingLeft: 16, pb: 2, position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontSize: 9, textTransform: 'uppercase', fontWeight: 700, color: pt.color }}>{isEditing ? 'Editing Progress...' : pt.label}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                           {!isEditing && <button className="btn btn-ghost" style={{ padding: 0, fontSize: 10, opacity: 0.3 }} onClick={() => { setEditProgress(e.id); const isPredefined = PROGRESS_TYPES.find(t => t.value === e.type); setEditProgressForm({ text: e.text, type: isPredefined ? e.type : CUSTOM_TYPE_PLACEHOLDER, customType: isPredefined ? '' : e.type }); }}>✎</button>}
                           <button className="btn btn-ghost" style={{ padding: 0, fontSize: 10, opacity: 0.3, color: 'var(--rust)' }} onClick={() => handleDeleteProgress(e.id)}>✕</button>
                        </div>
                      </div>
                      {isEditing ? (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                            {PROGRESS_TYPES.map(t => (
                              <button key={t.value} 
                                className={`btn btn-sm ${editProgressForm.type === t.value ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setEditProgressForm({ ...editProgressForm, type: t.value })}
                                style={{ fontSize: 9, padding: '4px 8px' }}>
                                {t.label}
                              </button>
                            ))}
                            <button 
                              className={`btn btn-sm ${editProgressForm.type === CUSTOM_TYPE_PLACEHOLDER ? 'btn-primary' : 'btn-outline'}`}
                              onClick={() => setEditProgressForm({ ...editProgressForm, type: CUSTOM_TYPE_PLACEHOLDER })}
                              style={{ fontSize: 9, padding: '4px 8px' }}>
                              ✏️ Custom
                            </button>
                          </div>
                          {editProgressForm.type === CUSTOM_TYPE_PLACEHOLDER && (
                            <input className="form-input" value={editProgressForm.customType}
                              onChange={e => setEditProgressForm({ ...editProgressForm, customType: e.target.value })}
                              placeholder="Type..." style={{ marginBottom: 8, fontSize: 12 }} />
                          )}
                          <textarea className="form-textarea" value={editProgressForm.text}
                            onChange={e => setEditProgressForm({ ...editProgressForm, text: e.target.value })}
                            style={{ minHeight: 80, fontSize: 12, marginBottom: 8 }} />
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                             <button className="btn btn-ghost btn-sm" onClick={() => setEditProgress(null)}>Cancel</button>
                             <button className="btn btn-primary btn-sm" onClick={() => handleUpdateProgress(e.id)}>Update</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="markdown-body" style={{ fontSize: 13, color: 'var(--ink)' }}>
                            <MarkdownRenderer content={e.text} />
                          </div>
                          <div style={{ fontSize: 10, opacity: 0.3, marginTop: 4 }}>{format(new Date(e.date), 'MMM d')}</div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)', margin: 0 }}>Sync Notes</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowNoteInput(!showNoteInput)}>+</button>
            </div>

            {showNoteInput && (
              <div style={{ marginBottom: 16 }}>
                <textarea className="form-textarea" value={noteText} onChange={e => setNoteText(e.target.value)}
                  placeholder="Capture a thought..." style={{ minHeight: 60, fontSize: 13, marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setShowNoteInput(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleAddNote} disabled={saving}>Save</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {notes.length === 0 ? <p style={{ fontSize: 12, opacity: 0.4, fontStyle: 'italic' }}>No notes yet.</p> : (
                notes.slice().reverse().map(note => (
                  <div key={note.id} style={{ padding: '12px', background: 'var(--mist)', borderRadius: 10, position: 'relative' }}>
                    {editNoteId === note.id ? (
                      <div>
                        <textarea className="form-textarea" value={editNoteText} onChange={e => setEditNoteText(e.target.value)} style={{ minHeight: 60, fontSize: 13, marginBottom: 8 }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setEditNoteId(null)}>Cancel</button>
                          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleUpdateNote(note.id)}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="markdown-body" style={{ fontSize: 12, color: 'rgba(13,13,13,0.7)' }}>
                          <MarkdownRenderer content={note.text} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', mt: 4, alignItems: 'center' }}>
                          <span style={{ fontSize: 8, opacity: 0.3 }}>{format(new Date(note.date), 'MMM d, yyyy')}</span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost" style={{ padding: 0, fontSize: 10, opacity: 0.3 }} onClick={() => { setEditNoteId(note.id); setEditNoteText(note.text); }}>✎</button>
                            <button className="btn btn-ghost" style={{ padding: 2, fontSize: 9, opacity: 0.2 }} onClick={() => handleDeleteNote(note.id)}>✕</button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Vision Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Refine Your Vision ✧</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">The Central Vision (Present Tense)</label>
              <textarea className="form-textarea" value={editVisionForm.vision}
                onChange={e => setEditVisionForm({ ...editVisionForm, vision: e.target.value })}
                placeholder="I am so happy and grateful now that..." style={{ minHeight: 120 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Supporting Details / Sensory Notes</label>
              <textarea className="form-textarea" value={editVisionForm.notes}
                onChange={e => setEditVisionForm({ ...editVisionForm, notes: e.target.value })}
                placeholder="What does it feel, look, and sound like?" style={{ minHeight: 100 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Target Duration (Days)</label>
              <input type="number" className="form-input" value={editVisionForm.target_days}
                onChange={e => setEditVisionForm({ ...editVisionForm, target_days: parseInt(e.target.value) || 30 })} />
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Note: Changing duration will recalculate the target date from start.</div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setShowEditModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateVision} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving...' : 'Update Vision ✧'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCompleteModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Complete This Cycle ✧</h3>
              <button className="modal-close" onClick={() => setShowCompleteModal(false)}>✕</button>
            </div>
            <blockquote className="markdown-body" style={{ fontFamily: 'Fraunces', fontSize: 16, fontStyle: 'italic', color: 'var(--ink)', padding: '12px 16px', background: 'var(--mist)', borderRadius: 10, borderLeft: '3px solid var(--gold)', marginBottom: 20 }}>
              <MarkdownRenderer content={item.vision} />
            </blockquote>
            <div className="form-group">
              <label className="form-label">How close did you get? What changed?</label>
              <textarea className="form-textarea" value={reflection} onChange={e => setReflection(e.target.value)}
                placeholder="Looking back at who I said I'd become vs who I actually became..." style={{ minHeight: 140 }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setShowCompleteModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-gold" onClick={handleComplete} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving...' : 'Complete Cycle ✧'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

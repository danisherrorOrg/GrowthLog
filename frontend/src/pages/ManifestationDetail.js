import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';

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

  // Complete modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [reflection, setReflection] = useState('');

  const load = async () => {
    try {
      const r = await API.get(`/manifestations/${manifestationId}`);
      setItem(r.data);
    } catch { toast.error('Failed to load'); navigate('/manifestations'); }
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
    } catch { toast.error('Failed'); }
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
    } catch { toast.error('Failed'); }
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
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    await API.delete(`/manifestations/${manifestationId}/notes/${noteId}`);
    toast.success('Note deleted');
    load();
  };

  const handleComplete = async () => {
    if (!reflection.trim()) return toast.error('Write your reflection');
    setSaving(true);
    try {
      await API.put(`/manifestations/${manifestationId}/complete`, { text: reflection });
      toast.success('✧ Manifestation cycle complete!');
      setShowCompleteModal(false);
      load();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
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

      <div className="page-body">
        {/* Vision card */}
        <div className="card" style={{ background: isReady ? 'var(--ink)' : 'white', marginBottom: 20 }}>
          <blockquote style={{ fontFamily: 'Fraunces', fontSize: 20, fontStyle: 'italic',
            color: isReady ? 'rgba(245,240,232,0.9)' : 'var(--ink)', lineHeight: 1.7, margin: '0 0 16px',
            padding: '0 0 0 16px', borderLeft: `4px solid ${isReady ? 'var(--gold)' : 'var(--sage)'}` }}>
            "{item.vision}"
          </blockquote>

          {item.notes && (
            <p style={{ fontSize: 14, color: isReady ? 'rgba(245,240,232,0.5)' : 'rgba(13,13,13,0.5)', fontStyle: 'italic', marginBottom: 16 }}>
              Notes: {item.notes}
            </p>
          )}

          {isActive && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: isReady ? 'rgba(245,240,232,0.5)' : 'rgba(13,13,13,0.4)', marginBottom: 6 }}>
                <span>Time Progress</span><span>{progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%`, background: isReady ? 'var(--gold)' : 'var(--sage)' }} />
              </div>
            </div>
          )}

          {item.reflection && (
            <div style={{ padding: '12px 16px', background: isReady ? 'rgba(255,255,255,0.1)' : 'var(--mist)', borderRadius: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: isReady ? 'var(--gold)' : 'var(--sage)', marginBottom: 6 }}>Final Reflection</div>
              <p style={{ fontSize: 14, fontStyle: 'italic', color: isReady ? 'rgba(245,240,232,0.8)' : 'rgba(13,13,13,0.65)', margin: 0 }}>{item.reflection}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isActive && (
              <button className="btn btn-sm" style={{ background: isReady ? 'rgba(255,255,255,0.12)' : 'var(--mist)', color: isReady ? 'var(--paper)' : 'var(--ink)', border: 'none' }}
                onClick={() => setShowProgressForm(true)}>
                + Add Progress
              </button>
            )}
            {isReady && (
              <button className="btn btn-gold btn-sm" onClick={() => { setShowCompleteModal(true); setReflection(''); }}>
                Reflect & Complete ✧
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={handleDelete} style={{ color: 'var(--rust)', marginLeft: 'auto' }}>
              🗑 Delete
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Progress Entries */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17 }}>📈 Progress ({progressEntries.length})</h3>
              {isActive && <button className="btn btn-sm btn-outline" onClick={() => setShowProgressForm(!showProgressForm)}>+ Add</button>}
            </div>

            {showProgressForm && (
              <div style={{ marginBottom: 16, padding: '12px', background: 'var(--mist)', borderRadius: 10 }}>
                <div style={{ marginBottom: 10 }}>
                  <label className="form-label">Type</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
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
                      placeholder="Enter custom type..." style={{ marginTop: 6 }} />
                  )}
                </div>
                <textarea className="form-textarea" value={progressForm.text}
                  onChange={e => setProgressForm({ ...progressForm, text: e.target.value })}
                  placeholder="What happened?" style={{ minHeight: 80, marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => { setShowProgressForm(false); setProgressForm({ text: '', type: 'improvement', customType: '' }); }}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={handleAddProgress} disabled={saving}>Add</button>
                </div>
              </div>
            )}

            {progressEntries.length === 0 && !showProgressForm ? (
              <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.35)', fontStyle: 'italic' }}>No progress logged yet. Track your wins and challenges.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                {progressEntries.slice().reverse().map((e) => {
                  const pt = getProgressTypeInfo(e.type);
                  const isEditing = editProgress === e.id;
                  return (
                    <div key={e.id} style={{ padding: '10px 12px', background: 'var(--mist)', borderRadius: 8, borderLeft: `2px solid ${pt.color}` }}>
                      {isEditing ? (
                        <div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                            {PROGRESS_TYPES.map(t => (
                              <button key={t.value} className={`btn btn-sm ${editProgressForm.type === t.value ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setEditProgressForm({ ...editProgressForm, type: t.value })}>{t.label}</button>
                            ))}
                            <button className={`btn btn-sm ${editProgressForm.type === CUSTOM_TYPE_PLACEHOLDER ? 'btn-primary' : 'btn-outline'}`}
                              onClick={() => setEditProgressForm({ ...editProgressForm, type: CUSTOM_TYPE_PLACEHOLDER })}>✏️ Custom</button>
                          </div>
                          {editProgressForm.type === CUSTOM_TYPE_PLACEHOLDER && (
                            <input className="form-input" value={editProgressForm.customType}
                              onChange={ev => setEditProgressForm({ ...editProgressForm, customType: ev.target.value })}
                              placeholder="Custom type..." style={{ marginBottom: 6 }} />
                          )}
                          <textarea className="form-textarea" value={editProgressForm.text}
                            onChange={ev => setEditProgressForm({ ...editProgressForm, text: ev.target.value })}
                            style={{ minHeight: 60, marginBottom: 6 }} />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => setEditProgress(null)}>Cancel</button>
                            <button className="btn btn-primary btn-sm" onClick={() => handleUpdateProgress(e.id)} disabled={saving}>Save</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <div style={{ fontSize: 10, color: 'rgba(13,13,13,0.35)' }}>
                              {pt.label} · {format(new Date(e.date), 'MMM d, yyyy')}
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => { setEditProgress(e.id); const isPredefined = PROGRESS_TYPES.find(t => t.value === e.type); setEditProgressForm({ text: e.text, type: isPredefined ? e.type : CUSTOM_TYPE_PLACEHOLDER, customType: isPredefined ? '' : e.type }); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(13,13,13,0.3)', padding: 2 }}>✎</button>
                              <button onClick={() => handleDeleteProgress(e.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(13,13,13,0.25)', padding: 2 }}>✕</button>
                            </div>
                          </div>
                          <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.7)', margin: 0, lineHeight: 1.5 }}>{e.text}</p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17 }}>📝 Notes ({notes.length})</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setShowNoteInput(!showNoteInput)}>+ Add</button>
            </div>

            {showNoteInput && (
              <div style={{ marginBottom: 16, padding: '12px', background: 'var(--mist)', borderRadius: 10 }}>
                <textarea className="form-textarea" value={noteText} onChange={e => setNoteText(e.target.value)}
                  placeholder="A note, idea, or affirmation about this vision..." style={{ minHeight: 80, marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => { setShowNoteInput(false); setNoteText(''); }}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={saving}>Save Note</button>
                </div>
              </div>
            )}

            {notes.length === 0 && !showNoteInput ? (
              <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.35)', fontStyle: 'italic' }}>No notes yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                {notes.slice().reverse().map(note => (
                  <div key={note.id} style={{ padding: '10px 12px', background: 'var(--mist)', borderRadius: 8, position: 'relative' }}>
                    <div style={{ fontSize: 10, color: 'rgba(13,13,13,0.35)', marginBottom: 4 }}>{format(new Date(note.date), 'MMM d, yyyy')}</div>
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
        </div>
      </div>

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCompleteModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Complete This Cycle ✧</h3>
              <button className="modal-close" onClick={() => setShowCompleteModal(false)}>✕</button>
            </div>
            <blockquote style={{ fontFamily: 'Fraunces', fontSize: 16, fontStyle: 'italic', color: 'var(--ink)', padding: '12px 16px', background: 'var(--mist)', borderRadius: 10, borderLeft: '3px solid var(--gold)', marginBottom: 20 }}>
              "{item.vision}"
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

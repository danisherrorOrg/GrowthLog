import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';

const PROGRESS_TYPES = [
  { value: 'improvement', label: '📈 Improvement', color: 'var(--sage)' },
  { value: 'learning', label: '💡 Learning', color: '#c9a84c' },
  { value: 'milestone', label: '🏆 Milestone', color: '#8b6bc4' },
  { value: 'challenge', label: '⚡ Challenge', color: '#c4623a' },
];

export default function Manifestations() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [completeItem, setCompleteItem] = useState(null);
  const [progressItem, setProgressItem] = useState(null);
  const [viewFilter, setViewFilter] = useState('active');
  const [form, setForm] = useState({ vision: '', target_days: 30, target_date: '', use_custom_date: false, notes: '' });
  const [progressForm, setProgressForm] = useState({ text: '', type: 'improvement', customType: '' });
  const [editForm, setEditForm] = useState({ vision: '', target_date: '', notes: '' });
  const [reflection, setReflection] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedProgress, setExpandedProgress] = useState({});

  const load = () => API.get('/manifestations?status_filter=all').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.vision.trim()) return toast.error('Write your vision');
    setLoading(true);
    try {
      const payload = { vision: form.vision, notes: form.notes };
      if (form.use_custom_date && form.target_date) {
        payload.target_date = form.target_date;
      } else {
        payload.target_days = form.target_days;
      }
      await API.post('/manifestations', payload);
      toast.success('✧ Manifestation set!');
      setShowModal(false);
      setForm({ vision: '', target_days: 30, target_date: '', use_custom_date: false, notes: '' });
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleEdit = async () => {
    if (!editForm.vision.trim()) return toast.error('Write your vision');
    setLoading(true);
    try {
      await API.put(`/manifestations/${editItem.id}`, editForm);
      toast.success('Vision updated!');
      setEditItem(null);
      load();
    } catch { toast.error('Failed to update'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this vision permanently?')) return;
    await API.delete(`/manifestations/${item.id}`);
    toast.success('Vision deleted');
    load();
  };

  const handleArchive = async (item) => {
    if (!window.confirm('Archive this vision?')) return;
    await API.put(`/manifestations/${item.id}/archive`);
    toast.success('Vision archived');
    load();
  };

  const handleComplete = async () => {
    if (!reflection.trim()) return toast.error('Write your reflection');
    setLoading(true);
    try {
      await API.put(`/manifestations/${completeItem.id}/complete`, { text: reflection });
      toast.success('✧ Manifestation cycle complete!');
      setCompleteItem(null);
      setReflection('');
      load();
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const resolveType = (f) => f.type === 'custom' ? (f.customType.trim() || 'custom') : f.type;

  const handleAddProgress = async () => {
    if (!progressForm.text.trim()) return toast.error('Write your progress entry');
    setLoading(true);
    try {
      await API.post(`/manifestations/${progressItem.id}/progress`, { text: progressForm.text, type: resolveType(progressForm) });
      toast.success('Progress added!');
      setProgressItem(null);
      setProgressForm({ text: '', type: 'improvement', customType: '' });
      load();
    } catch { toast.error('Failed to add progress'); }
    finally { setLoading(false); }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({ vision: item.vision, target_date: item.target_date, notes: item.notes || '' });
  };

  const filteredItems = items.filter(i => {
    if (viewFilter === 'active') return i.status === 'active';
    if (viewFilter === 'completed') return i.status === 'completed';
    if (viewFilter === 'archived') return i.status === 'archived';
    return true;
  });

  const active = items.filter(i => i.status === 'active');
  const completed = items.filter(i => i.status === 'completed');
  const archived = items.filter(i => i.status === 'archived');

  const getProgressTypeInfo = (typeVal) => PROGRESS_TYPES.find(t => t.value === typeVal) || { label: typeVal, color: '#888' };

  return (
    <div>
      <div className="page-header">
        <h2>Manifestations ✧</h2>
        <p>Write your future. Watch it become real.</p>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: 'active', label: `Active (${active.length})` },
              { key: 'completed', label: `Completed (${completed.length})` },
              { key: 'archived', label: `Archived (${archived.length})` },
              { key: 'all', label: 'All' },
            ].map(({ key, label }) => (
              <button key={key} className={`btn btn-sm ${viewFilter === key ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewFilter(key)}>
                {label}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Vision</button>
        </div>

        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✧</div>
            <h3>No visions {viewFilter !== 'all' ? `(${viewFilter})` : ''}</h3>
            <p>Write who you want to become. On the target date, reflect on how far you've come.</p>
            {viewFilter === 'active' && <button className="btn btn-primary" onClick={() => setShowModal(true)}>Begin Your Vision →</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredItems.map((item) => {
              const target = parseISO(item.target_date);
              const daysLeft = differenceInDays(target, new Date());
              const totalDays = item.target_days;
              const daysElapsed = totalDays - Math.max(daysLeft, 0);
              const progress = Math.min(Math.round((daysElapsed / totalDays) * 100), 100);
              const isReady = isPast(target) && item.status === 'active';
              const isActive = item.status === 'active';
              const progressEntries = item.progress_entries || [];
              const showProg = expandedProgress[item.id];

              return (
                <div key={item.id} className="card"
                  style={{ background: isReady ? 'var(--ink)' : 'white', color: isReady ? 'var(--paper)' : 'var(--ink)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: isReady ? 'var(--gold)' : item.status === 'completed' ? 'var(--sage)' : item.status === 'archived' ? 'rgba(13,13,13,0.4)' : 'rgba(13,13,13,0.4)', marginBottom: 6 }}>
                        {isReady ? '✧ Vision Day Reached!' : item.status === 'completed' ? '✓ Completed' : item.status === 'archived' ? '📦 Archived' : `${item.target_days}-Day Vision`}
                      </div>
                      <div style={{ fontSize: 12, color: isReady ? 'rgba(245,240,232,0.5)' : 'rgba(13,13,13,0.4)' }}>
                        Started {format(parseISO(item.start_date), 'MMM d')} · Target {format(target, 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      {isActive && (
                        <>
                          <div style={{ textAlign: 'right', marginRight: 8 }}>
                            <div style={{ fontFamily: 'Fraunces', fontSize: 28, color: isReady ? 'var(--gold)' : 'var(--sage)' }}>
                              {isReady ? '✓' : `${Math.max(daysLeft, 0)}d`}
                            </div>
                            <div style={{ fontSize: 12, color: isReady ? 'rgba(245,240,232,0.5)' : 'rgba(13,13,13,0.4)' }}>
                              {isReady ? 'Complete' : 'remaining'}
                            </div>
                          </div>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)} title="Edit" style={{ color: isReady ? 'rgba(245,240,232,0.5)' : 'rgba(13,13,13,0.4)' }}>✎</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleArchive(item)} title="Archive" style={{ color: isReady ? 'rgba(245,240,232,0.4)' : 'rgba(13,13,13,0.3)' }}>📦</button>
                        </>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/manifestations/${item.id}`)} title="View Detail"
                        style={{ color: isReady ? 'rgba(245,240,232,0.6)' : 'rgba(13,13,13,0.4)', fontSize: 11, border: `1px solid ${isReady ? 'rgba(245,240,232,0.2)' : 'rgba(13,13,13,0.1)'}`, borderRadius: 6, padding: '3px 8px' }}>
                        ◈ Detail
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(item)} title="Delete" style={{ color: isReady ? 'rgba(245,240,232,0.4)' : 'rgba(13,13,13,0.3)' }}>🗑</button>
                    </div>
                  </div>

                  <blockquote style={{ fontFamily: 'Fraunces', fontSize: 17, fontStyle: 'italic', color: isReady ? 'rgba(245,240,232,0.9)' : 'var(--ink)', lineHeight: 1.6, margin: '0 0 16px', padding: '0 0 0 12px', borderLeft: `3px solid ${isReady ? 'var(--gold)' : 'var(--sage)'}` }}>
                    "{item.vision}"
                  </blockquote>

                  {item.notes && (
                    <p style={{ fontSize: 13, color: isReady ? 'rgba(245,240,232,0.6)' : 'rgba(13,13,13,0.5)', marginBottom: 12, fontStyle: 'italic' }}>
                      Notes: {item.notes}
                    </p>
                  )}

                  {isActive && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: isReady ? 'rgba(245,240,232,0.5)' : 'rgba(13,13,13,0.4)', marginBottom: 6 }}>
                        <span>Progress</span><span>{progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%`, background: isReady ? 'var(--gold)' : 'var(--sage)' }} />
                      </div>
                    </div>
                  )}

                  {/* Progress entries preview */}
                  {progressEntries.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setExpandedProgress(p => ({ ...p, [item.id]: !p[item.id] }))}
                        style={{ color: isReady ? 'rgba(245,240,232,0.6)' : 'rgba(13,13,13,0.5)', fontSize: 12 }}>
                        {showProg ? '▼' : '▶'} {progressEntries.length} progress note{progressEntries.length > 1 ? 's' : ''}
                      </button>
                      {showProg && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {progressEntries.slice(-3).map((e) => {
                            const pt = getProgressTypeInfo(e.type);
                            return (
                              <div key={e.id || e.date} style={{ padding: '8px 12px', background: isReady ? 'rgba(255,255,255,0.08)' : 'var(--mist)', borderRadius: 8, fontSize: 13, borderLeft: `2px solid ${pt?.color || 'var(--sage)'}` }}>
                                <div style={{ fontSize: 10, color: isReady ? 'rgba(245,240,232,0.4)' : 'rgba(13,13,13,0.35)', marginBottom: 3 }}>
                                  {pt?.label} · {format(new Date(e.date), 'MMM d, yyyy')}
                                </div>
                                <span style={{ color: isReady ? 'rgba(245,240,232,0.8)' : 'rgba(13,13,13,0.7)' }}>{e.text}</span>
                              </div>
                            );
                          })}
                          {progressEntries.length > 3 && (
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/manifestations/${item.id}`)}
                              style={{ fontSize: 12, color: isReady ? 'rgba(245,240,232,0.5)' : 'var(--sage)' }}>
                              View all {progressEntries.length} entries →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {item.reflection && (
                    <div style={{ padding: '10px 14px', background: isReady ? 'rgba(255,255,255,0.08)' : 'var(--mist)', borderRadius: 8, fontSize: 13, fontStyle: 'italic', color: isReady ? 'rgba(245,240,232,0.7)' : 'rgba(13,13,13,0.6)', marginBottom: 12 }}>
                      Reflection: {item.reflection}
                    </div>
                  )}

                  {isActive && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm" style={{ background: isReady ? 'rgba(255,255,255,0.1)' : 'var(--mist)', color: isReady ? 'var(--paper)' : 'var(--ink)', border: 'none' }}
                        onClick={() => { setProgressItem(item); setProgressForm({ text: '', type: 'improvement', customType: '' }); }}>
                        + Add Progress
                      </button>
                      {isReady && (
                        <button className="btn btn-gold" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setCompleteItem(item); setReflection(''); }}>
                          Reflect & Complete This Cycle ✧
                        </button>
                      )}
                    </div>
                  )}
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
              <h3>New Vision</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--mist)', borderRadius: 10, marginBottom: 20, fontSize: 14, color: 'rgba(13,13,13,0.6)', fontStyle: 'italic' }}>
              Write in present tense as if it's already true. "I am someone who..." not "I want to be..."
            </div>
            <div className="form-group">
              <label className="form-label">Your Vision</label>
              <textarea className="form-textarea" value={form.vision} onChange={(e) => setForm({ ...form, vision: e.target.value })}
                placeholder="In 30 days, I am someone who shows up consistently, feels emotionally grounded..."
                style={{ minHeight: 140 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <input className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Why this vision matters to you..." />
            </div>
            <div className="form-group">
              <label className="form-label">Target Date</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <button className={`btn btn-sm ${!form.use_custom_date ? 'btn-primary' : 'btn-outline'}`} onClick={() => setForm({ ...form, use_custom_date: false })}>
                  Choose days
                </button>
                <button className={`btn btn-sm ${form.use_custom_date ? 'btn-primary' : 'btn-outline'}`} onClick={() => setForm({ ...form, use_custom_date: true })}>
                  Custom date
                </button>
              </div>
              {form.use_custom_date ? (
                <input type="date" className="form-input" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]} />
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  {[7, 14, 21, 30, 60, 90].map(d => (
                    <button key={d} className={`btn btn-sm ${form.target_days === d ? 'btn-primary' : 'btn-outline'}`} onClick={() => setForm({ ...form, target_days: d })}>
                      {d}d
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Setting...' : 'Set My Vision ✧'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditItem(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Vision</h3>
              <button className="modal-close" onClick={() => setEditItem(null)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Your Vision</label>
              <textarea className="form-textarea" value={editForm.vision} onChange={(e) => setEditForm({ ...editForm, vision: e.target.value })} style={{ minHeight: 140 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Target Date</label>
              <input type="date" className="form-input" value={editForm.target_date} onChange={(e) => setEditForm({ ...editForm, target_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Why this vision matters..." />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setEditItem(null)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEdit} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Progress Modal */}
      {progressItem && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setProgressItem(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Add Progress Entry ✧</h3>
              <button className="modal-close" onClick={() => setProgressItem(null)}>✕</button>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--mist)', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
              <strong style={{ fontFamily: 'Fraunces' }}>"{progressItem.vision.slice(0, 80)}{progressItem.vision.length > 80 ? '...' : ''}"</strong>
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {PROGRESS_TYPES.map(t => (
                  <button key={t.value} className={`btn btn-sm ${progressForm.type === t.value ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setProgressForm({ ...progressForm, type: t.value })}>
                    {t.label}
                  </button>
                ))}
                <button className={`btn btn-sm ${progressForm.type === 'custom' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setProgressForm({ ...progressForm, type: 'custom' })}>
                  ✏️ Custom
                </button>
              </div>
              {progressForm.type === 'custom' && (
                <input className="form-input" value={progressForm.customType}
                  onChange={e => setProgressForm({ ...progressForm, customType: e.target.value })}
                  placeholder="Name your custom type..." />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">What happened?</label>
              <textarea className="form-textarea" value={progressForm.text} onChange={(e) => setProgressForm({ ...progressForm, text: e.target.value })}
                placeholder={progressForm.type === 'improvement' ? 'What got better or what did you improve...' : progressForm.type === 'learning' ? 'What insight or lesson did you discover...' : progressForm.type === 'milestone' ? 'What milestone did you hit...' : progressForm.type === 'challenge' ? 'What challenge are you facing...' : 'Describe what happened...'}
                style={{ minHeight: 120 }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setProgressItem(null)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddProgress} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Saving...' : 'Add Progress'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {completeItem && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCompleteItem(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Complete This Cycle ✧</h3>
              <button className="modal-close" onClick={() => setCompleteItem(null)}>✕</button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', marginBottom: 8 }}>Your vision was:</div>
              <blockquote style={{ fontFamily: 'Fraunces', fontSize: 16, fontStyle: 'italic', color: 'var(--ink)', padding: '12px 16px', background: 'var(--mist)', borderRadius: 10, borderLeft: '3px solid var(--gold)' }}>
                "{completeItem.vision}"
              </blockquote>
            </div>
            <div className="form-group">
              <label className="form-label">How close did you get? What changed?</label>
              <textarea className="form-textarea" value={reflection} onChange={(e) => setReflection(e.target.value)}
                placeholder="Looking back at who I said I'd become vs who I actually became..." style={{ minHeight: 140 }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setCompleteItem(null)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-gold" onClick={handleComplete} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Saving...' : 'Complete Cycle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

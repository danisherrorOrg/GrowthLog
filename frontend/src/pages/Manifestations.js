import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import ConfirmModal from '../components/ui/ConfirmModal';


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
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
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
    } catch (e) { toast.error(getErrorMessage(e, 'Failed')); }

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
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to update')); }

    finally { setLoading(false); }

  };

  const handleDelete = (item) => {
    setConfirm({
      title: 'Delete Vision?',
      message: 'Are you sure you want to permanently delete this manifestation vision and all its progress history? This cannot be undone.',
      confirmLabel: 'Delete Forever',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/manifestations/${item.id}`);
          toast.success('Vision deleted');
          load();
        } catch (e) { toast.error(getErrorMessage(e, 'Failed to delete')); }
      }
    });
  };

  const handleArchive = (item) => {
    setConfirm({
      title: 'Archive Vision?',
      message: 'Archive this vision? It will move to the archived tab and stop its progression tracking.',
      confirmLabel: 'Archive',
      onConfirm: async () => {
        try {
          await API.put(`/manifestations/${item.id}/archive`);
          toast.success('Vision archived');
          load();
        } catch (e) { toast.error(getErrorMessage(e, 'Failed to archive')); }
      }
    });
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
    } catch (e) { toast.error(getErrorMessage(e, 'Failed')); }

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
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to add progress')); }

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
        {/* Unified Toolbar */}
        <div className="card" style={{ marginBottom: 32, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'var(--mist)', padding: 3, borderRadius: 10 }}>
              {[
                { key: 'active', label: 'Active' },
                { key: 'completed', label: 'Completed' },
                { key: 'archived', label: 'Archived' },
                { key: 'all', label: 'All' },
              ].map(f => (
                <button 
                  key={f.key} 
                  className={`btn btn-sm ${viewFilter === f.key ? 'btn-primary' : 'btn-ghost'}`} 
                  onClick={() => setViewFilter(f.key)}
                  style={{ borderRadius: 8, padding: '6px 16px', fontSize: 12 }}
                >
                  {f.label} ({items.filter(i => f.key === 'all' ? true : i.status === f.key).length})
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ borderRadius: 30, padding: '10px 24px', boxShadow: '0 4px 12px rgba(13,13,13,0.1)' }}>
            + Create New Vision
          </button>
        </div>

        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✧</div>
            <h3>No visions found in this category</h3>
            <p>Write who you want to become. On the target date, reflect on how far you've come.</p>
            {viewFilter === 'active' && <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ borderRadius: 30 }}>Begin Your Vision →</button>}
          </div>
        ) : (
          <div className="auto-grid">
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
                <div key={item.id} className="card" onClick={() => navigate(`/manifestations/${item.id}`)} style={{ 
                  display: 'flex', flexDirection: 'column', gap: 16,
                  background: isReady ? 'var(--ink)' : 'white', 
                  color: isReady ? 'var(--paper)' : 'var(--ink)',
                  border: isReady ? '1px solid var(--gold)' : 'none',
                  cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: isReady ? 'var(--gold)' : 'rgba(13,13,13,0.4)', marginBottom: 4 }}>
                        {isReady ? 'Vision Day Reached' : item.status === 'completed' ? '✓ Completed' : item.status === 'archived' ? '📦 Archived' : `${item.target_days}-Day Vision`}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.5 }}>
                        Since {format(parseISO(item.start_date), 'MMM d')} · Target {format(target, 'MMM d')}
                      </div>
                    </div>
                    {isActive && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Fraunces', fontSize: 24, color: isReady ? 'var(--gold)' : 'var(--sage)', lineHeight: 1 }}>
                          {isReady ? '✦' : `${Math.max(daysLeft, 0)}d`}
                        </div>
                        <div style={{ fontSize: 9, opacity: 0.5 }}>{isReady ? 'Ready' : 'remaining'}</div>
                      </div>
                    )}
                  </div>

                  <blockquote className="markdown-body" style={{ 
                    fontFamily: 'Fraunces', fontSize: 17, fontStyle: 'italic', 
                    color: isReady ? 'rgba(245,240,232,0.95)' : 'var(--ink)', 
                    lineHeight: 1.6, margin: '8px 0', padding: '0 0 0 16px', 
                    borderLeft: `2px solid ${isReady ? 'var(--gold)' : 'var(--sage)'}`
                  }}>
                    <MarkdownRenderer content={`"${item.vision.slice(0, 200)}${item.vision.length > 200 ? '...' : ''}"`} />
                  </blockquote>

                  {isActive && (
                    <div style={{ marginTop: 'auto' }}>
                      <div className="progress-bar" style={{ height: 4, background: isReady ? 'rgba(255,255,255,0.08)' : 'var(--mist)' }}>
                        <div className="progress-fill" style={{ width: `${progress}%`, background: isReady ? 'var(--gold)' : 'var(--sage)' }} />
                      </div>
                    </div>
                  )}

                  <div className="divider" style={{ opacity: isReady ? 0.1 : 0.05, margin: '4px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-sm btn-ghost" style={{ color: 'inherit', opacity: 0.8, padding: '4px 8px', fontWeight: 600, background: 'rgba(13,13,13,0.03)', borderRadius: 6 }} onClick={() => navigate(`/manifestations/${item.id}`)} title="Explore Vision">
                        ◈ Explore Detail
                      </button>
                      {progressEntries.length > 0 && (
                        <div className="tag tag-mist" style={{ fontSize: 10, alignSelf: 'center', fontWeight: 'bold' }}>
                           {progressEntries.length} {progressEntries.length === 1 ? 'entry' : 'entries'}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      {isActive && (
                        <>
                          <button className="btn btn-sm btn-ghost" onClick={() => openEdit(item)} title="Edit" style={{ color: 'inherit', opacity: 0.4 }}>✎</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => handleArchive(item)} title="Archive" style={{ color: 'inherit', opacity: 0.4 }}>📦</button>
                        </>
                      )}
                      <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(item)} title="Delete" style={{ color: 'inherit', opacity: 0.3 }}>🗑</button>
                    </div>
                  </div>

                  {isReady && isActive && (
                    <button className="btn btn-gold btn-sm" style={{ width: '100%', borderRadius: 8, fontWeight: 700 }} onClick={(e) => { e.stopPropagation(); setCompleteItem(item); setReflection(''); }}>
                       Reflect & Complete Cycle ✧
                    </button>
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
              <textarea maxLength={2000} className="form-textarea" value={form.vision} onChange={(e) => setForm({ ...form, vision: e.target.value })}
                placeholder="In 30 days, I am someone who shows up consistently, feels emotionally grounded..."
                style={{ minHeight: 140 }} />
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <input maxLength={200} className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Why this vision matters to you..." />
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
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
                <input maxLength={200} type="date" className="form-input" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })}
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
              <textarea maxLength={2000} className="form-textarea" value={editForm.vision} onChange={(e) => setEditForm({ ...editForm, vision: e.target.value })} style={{ minHeight: 140 }} />
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
            </div>
            <div className="form-group">
              <label className="form-label">Target Date</label>
              <input maxLength={200} type="date" className="form-input" value={editForm.target_date} onChange={(e) => setEditForm({ ...editForm, target_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input maxLength={200} className="form-input" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Why this vision matters..." />
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
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
                <input maxLength={200} className="form-input" value={progressForm.customType}
                  onChange={e => setProgressForm({ ...progressForm, customType: e.target.value })}
                  placeholder="Name your custom type..." />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">What happened?</label>
              <textarea maxLength={2000} className="form-textarea" value={progressForm.text} onChange={(e) => setProgressForm({ ...progressForm, text: e.target.value })}
                placeholder={progressForm.type === 'improvement' ? 'What got better or what did you improve...' : progressForm.type === 'learning' ? 'What insight or lesson did you discover...' : progressForm.type === 'milestone' ? 'What milestone did you hit...' : progressForm.type === 'challenge' ? 'What challenge are you facing...' : 'Describe what happened...'}
                style={{ minHeight: 120 }} />
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
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
              <textarea maxLength={2000} className="form-textarea" value={reflection} onChange={(e) => setReflection(e.target.value)}
                placeholder="Looking back at who I said I'd become vs who I actually became..." style={{ minHeight: 140 }} />
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
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

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

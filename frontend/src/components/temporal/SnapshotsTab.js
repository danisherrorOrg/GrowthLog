import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { getErrorMessage } from '../../utils/errors';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import ConfirmModal from '../ui/ConfirmModal';

export default function Snapshots() {
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editSnap, setEditSnap] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [form, setForm] = useState({ description: '', values: '', mood: 5, date: '' });
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = () => API.get('/snapshots').then(r => setSnapshots(r.data));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditSnap(null);
    const today = new Date().toISOString().split('T')[0];
    setForm({ description: '', values: '', mood: 5, date: today });
    setShowModal(true);
  };

  const openEdit = (snap) => {
    setEditSnap(snap);
    setForm({
      description: snap.description,
      values: snap.values?.join(', ') || '',
      mood: snap.mood,
      date: snap.date,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.description.trim()) return toast.error('Describe who you are today');
    setLoading(true);
    try {
      const payload = {
        description: form.description,
        values: form.values.split(',').map(v => v.trim()).filter(Boolean),
        mood: form.mood,
        date: form.date || undefined,
      };
      if (editSnap) {
        await API.put(`/snapshots/${editSnap.id}`, { description: payload.description, values: payload.values, mood: payload.mood });
        toast.success('Snapshot updated!');
      } else {
        await API.post('/snapshots', payload);
        toast.success('○ Snapshot saved!');
      }
      setShowModal(false);
      setEditSnap(null);
      setForm({ description: '', values: '', mood: 5, date: '' });
      load();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to save snapshot')); }
    finally { setLoading(false); }
  };

  const handleDelete = (snap) => {
    setConfirm({
      title: 'Delete Snapshot?',
      message: `Are you sure you want to permanently delete the snapshot from ${format(parseISO(snap.date), 'MMMM d, yyyy')}? This cannot be undone.`,
      confirmLabel: 'Delete Forever',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/snapshots/${snap.id}`);
          toast.success('Snapshot deleted');
          load();
        } catch (e) { toast.error(getErrorMessage(e, 'Failed to delete snapshot')); }
      }
    });
  };

  const toggleCompareSelect = (snap) => {
    if (!compareA) {
      setCompareA(snap);
      setCompareResult(null);
      return;
    }
    if (compareA.id === snap.id) {
      setCompareA(null);
      setCompareB(null);
      setCompareResult(null);
      return;
    }
    if (compareB && compareB.id === snap.id) {
      setCompareB(null);
      setCompareResult(null);
      return;
    }
    setCompareB(snap);
    setCompareResult(null);
  };

  const runCompare = async () => {
    if (!compareA || !compareB) return;
    setComparing(true);
    try {
      const r = await API.get(`/snapshots/compare?snap1_id=${compareA.id}&snap2_id=${compareB.id}`);
      setCompareResult(r.data);
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to compare snapshots')); }
    finally { setComparing(false); }
  };

  const clearCompare = () => {
    setCompareA(null);
    setCompareB(null);
    setCompareResult(null);
    setCompareMode(false);
  };

  return (
    <div>


      <div className="page-body" style={{ minHeight: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 24 }}>
          {snapshots.length > 0 && (
            <button className={`btn btn-sm ${compareMode ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setCompareMode(!compareMode); if (compareMode) clearCompare(); }}>
              {compareMode ? '✕ Exit Compare' : '⇄ Compare Snapshots'}
            </button>
          )}
          <button className="btn btn-primary" onClick={openCreate} style={{ borderRadius: 30, padding: '10px 24px' }}>+ Take Snapshot</button>
        </div>

        {/* Unified Comparison UI */}
        {compareMode && (
          <div className="card" style={{ marginBottom: 32, border: '1px solid var(--sage)', background: 'rgba(107,140,107,0.02)' }}>
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--sage)', marginBottom: 20, fontWeight: 700 }}>
              {!compareA ? '① Select "Then" Snapshot' : !compareB ? '② Select "Now" Snapshot' : '✓ Analysis Ready'}
            </h3>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ padding: '10px 20px', background: compareA ? 'white' : 'var(--mist)', border: `1px solid ${compareA ? 'var(--sage)' : 'transparent'}`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, minWidth: 180 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: compareA ? 'var(--sage)' : 'rgba(13,13,13,0.1)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, textTransform: 'uppercase', opacity: 0.5 }}>Then</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{compareA ? format(parseISO(compareA.date), 'MMM d, yyyy') : '—'}</div>
                </div>
              </div>

              <div style={{ fontSize: 20, opacity: 0.2 }}>⇄</div>

              <div style={{ padding: '10px 20px', background: compareB ? 'white' : 'var(--mist)', border: `1px solid ${compareB ? 'var(--gold)' : 'transparent'}`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, minWidth: 180 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: compareB ? 'var(--gold)' : 'rgba(13,13,13,0.1)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, textTransform: 'uppercase', opacity: 0.5 }}>Now</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{compareB ? format(parseISO(compareB.date), 'MMM d, yyyy') : '—'}</div>
                </div>
              </div>

              {compareA && compareB && !compareResult && (
                <button className="btn btn-primary" onClick={runCompare} disabled={comparing} style={{ borderRadius: 30, padding: '10px 24px' }}>
                  {comparing ? 'Analyzing...' : 'Run Comparison Analysis ⇄'}
                </button>
              )}

              {(compareA || compareB) && (
                <button className="btn btn-ghost" style={{ color: 'rgba(13,13,13,0.4)', fontSize: 13 }} onClick={() => { setConfirm({ title: 'Clear Selection?', message: 'Reset your snapshot selection for comparison?', confirmLabel: 'Reset', danger: false, onConfirm: () => { setCompareA(null); setCompareB(null); setCompareResult(null); } }); }}>Clear Selection</button>
              )}
            </div>
          </div>
        )}

        {/* Analysis View */}
        {compareResult && (
          <div className="card" style={{ marginBottom: 32, padding: 32, border: '1px solid var(--gold)', background: 'rgba(201,168,76,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, margin: 0, fontFamily: 'Fraunces' }}>⇄ Contrast Analysis</h3>
              <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>
                Mood Change:
                <span style={{ color: compareResult.snapshot2.mood > compareResult.snapshot1.mood ? 'var(--sage)' : compareResult.snapshot2.mood < compareResult.snapshot1.mood ? 'var(--rust)' : 'inherit', marginLeft: 8 }}>
                  {compareResult.snapshot2.mood > compareResult.snapshot1.mood ? '▲' : compareResult.snapshot2.mood < compareResult.snapshot1.mood ? '▼' : '—'} {Math.abs(compareResult.snapshot2.mood - compareResult.snapshot1.mood)} points
                </span>
              </div>
            </div>

            <div className="grid-2" style={{ gap: 24 }}>
              {[
                { label: 'Past State', s: compareResult.snapshot1, accent: 'rgba(13,13,13,0.3)' },
                { label: 'Present State', s: compareResult.snapshot2, accent: 'var(--sage)' }
              ].map(({ label, s, accent }) => (
                <div key={label} style={{ padding: 24, background: 'white', borderRadius: 16, border: '1px solid rgba(13,13,13,0.05)' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: accent, marginBottom: 12, fontWeight: 700 }}>{label}</div>
                  <div className="markdown-body" style={{ fontFamily: 'Fraunces', fontSize: 16, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1.6, marginBottom: 16 }}>
                    <MarkdownRenderer content={`"${s.description.slice(0, 180)}..."`} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 24, fontFamily: 'Fraunces', color: accent }}>{s.mood}/10</div>
                    <div style={{ fontSize: 10, opacity: 0.4 }}>mood score</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {snapshots.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">○</div>
            <h3>Your Growth Journal is Empty</h3>
            <p>A snapshot captures who you are right now — your mindset, values, and emotional state. Take one today and compare it in 30 days.</p>
            <button className="btn btn-primary" onClick={openCreate} style={{ borderRadius: 30 }}>Take First Snapshot ○</button>
          </div>
        ) : (
          <div className="auto-grid">
            {snapshots.map((snap, idx) => {
              const isSelectedA = compareA?.id === snap.id;
              const isSelectedB = compareB?.id === snap.id;

              return (
                <div key={snap.id} className="card" style={{
                  display: 'flex', flexDirection: 'column', gap: 16,
                  cursor: 'pointer',
                  border: isSelectedA ? '2px solid var(--sage)' : isSelectedB ? '2px solid var(--gold)' : 'none',
                  transform: (isSelectedA || isSelectedB) ? 'translateY(-4px)' : 'none',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  background: (isSelectedA || isSelectedB) ? 'rgba(107,140,107,0.02)' : 'white'
                }} onClick={() => compareMode ? toggleCompareSelect(snap) : navigate(`/snapshots/${snap.id}`)}
                onMouseEnter={e => { if(!compareMode && !isSelectedA && !isSelectedB) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; } }}
                onMouseLeave={e => { if(!compareMode && !isSelectedA && !isSelectedB) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: idx === 0 ? 'var(--sage)' : 'rgba(13,13,13,0.4)', marginBottom: 4, fontWeight: 700 }}>
                        {idx === 0 ? 'Latest Snapshot' : `Snapshot Archive`}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{format(parseISO(snap.date), 'MMMM d, yyyy')}</div>
                    </div>
                    <div style={{ fontFamily: 'Fraunces', fontSize: 24, color: 'var(--sage)' }}>{snap.mood}<span style={{ fontSize: 12, opacity: 0.3 }}>/10</span></div>
                  </div>

                  <blockquote className="markdown-body" style={{
                    fontSize: 14, fontStyle: 'italic', color: 'rgba(13,13,13,0.7)',
                    lineHeight: 1.6, margin: '8px 0', borderLeft: '2px solid rgba(13,13,13,0.05)', paddingLeft: 12
                  }}>
                    <MarkdownRenderer content={`"${snap.description.slice(0, 160)}${snap.description.length > 160 ? '...' : ''}"`} />
                  </blockquote>

                  {snap.values?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {snap.values.slice(0, 3).map(v => <span key={v} className="tag tag-mist" style={{ fontSize: 10 }}>{v}</span>)}
                      {snap.values.length > 3 && <span style={{ fontSize: 10, opacity: 0.4 }}>+{snap.values.length - 3} more</span>}
                    </div>
                  )}

                  <div className="divider" style={{ margin: '4px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); navigate(`/snapshots/${snap.id}`); }} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20 }}>
                      Enter Detail ◈
                    </button>
                    {!compareMode && (
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); openEdit(snap); }} style={{ padding: 4, color: 'rgba(13,13,13,0.4)' }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); handleDelete(snap); }} style={{ padding: 4, color: 'rgba(13,13,13,0.2)' }}>🗑</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editSnap ? 'Edit Snapshot' : 'Take a Snapshot'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {!editSnap && (
              <div style={{ padding: '12px 16px', background: 'var(--mist)', borderRadius: 10, marginBottom: 20, fontSize: 13, color: 'rgba(13,13,13,0.6)', fontStyle: 'italic' }}>
                Describe who you are right now, honestly. Future you will read this.
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Date</label>
              <input maxLength={200} type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Who are you today?</label>
              <textarea maxLength={2000} className="form-textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Right now I am someone who... I struggle with... I believe... I am working on..."
                style={{ minHeight: 160 }}
              />
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
            </div>
            <div className="form-group">
              <label className="form-label">Current Values / Beliefs (comma separated)</label>
              <input maxLength={200} className="form-input" value={form.values}
                onChange={(e) => setForm({ ...form, values: e.target.value })}
                placeholder="honesty, growth, patience, hard work..." />
            </div>
            <div className="form-group">
              <label className="form-label">Overall mood right now — {form.mood}/10</label>
              <input maxLength={200} type="range" className="rating-slider" min={1} max={10} value={form.mood}
                onChange={(e) => setForm({ ...form, mood: +e.target.value })}
                style={{ '--val': `${(form.mood - 1) / 9 * 100}%`, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Saving...' : editSnap ? 'Save Changes' : 'Save Snapshot ○'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

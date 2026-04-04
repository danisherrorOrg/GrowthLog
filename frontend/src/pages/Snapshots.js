import { useEffect, useState } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

export default function Snapshots() {
  const [snapshots, setSnapshots] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editSnap, setEditSnap] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [form, setForm] = useState({ description: '', values: '', mood: 5, date: '' });
  const [loading, setLoading] = useState(false);

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
    } catch { toast.error('Failed to save snapshot'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (snap) => {
    if (!window.confirm('Delete this snapshot permanently?')) return;
    await API.delete(`/snapshots/${snap.id}`);
    toast.success('Snapshot deleted');
    load();
  };

  const toggleCompare = (snap) => {
    if (!compareA) { setCompareA(snap); return; }
    if (compareA.id === snap.id) { setCompareA(null); return; }
    setCompareB(snap);
  };

  const clearCompare = () => { setCompareA(null); setCompareB(null); setCompareMode(false); };

  const snapA = compareA ? snapshots.find(s => s.id === compareA.id) : null;
  const snapB = compareB ? snapshots.find(s => s.id === compareB.id) : snapshots[0];

  return (
    <div>
      <div className="page-header">
        <h2>Snapshots ○</h2>
        <p>Who are you right now? Capture it. Compare later.</p>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 24 }}>
          {snapshots.length >= 2 && (
            <button className={`btn ${compareMode ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setCompareMode(!compareMode); clearCompare(); }}>
              {compareMode ? '✕ Exit Compare' : '⇄ Compare Snapshots'}
            </button>
          )}
          <button className="btn btn-primary" onClick={openCreate}>+ Take Snapshot</button>
        </div>

        {compareMode && (
          <div className="card" style={{ background: 'var(--mist)', border: '1px dashed rgba(13,13,13,0.2)', marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>
              {!compareA ? '① Select the FIRST snapshot to compare' : !compareB ? '② Select the SECOND snapshot to compare' : '✓ Comparing two snapshots below'}
            </h3>
            {compareA && compareB && (
              <div className="grid-2" style={{ marginTop: 12 }}>
                {[snapA, snapB].map((s, i) => s && (
                  <div key={i} style={{ padding: '16px', background: 'white', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: i === 0 ? 'rgba(13,13,13,0.4)' : 'var(--sage)', marginBottom: 8 }}>
                      {i === 0 ? 'Then' : 'Now'} · {format(parseISO(s.date), 'MMM d, yyyy')}
                    </div>
                    <p style={{ fontSize: 14, fontStyle: 'italic', lineHeight: 1.6, color: 'var(--ink)', marginBottom: 10 }}>
                      "{s.description.slice(0, 200)}{s.description.length > 200 ? '...' : ''}"
                    </p>
                    <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', marginBottom: 8 }}>Mood: {s.mood}/10</div>
                    {s.values?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {s.values.map(v => <span key={v} className="tag tag-mist" style={{ fontSize: 11 }}>{v}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {compareA && compareB && (
              <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={clearCompare}>Clear Selection</button>
            )}
          </div>
        )}

        {snapshots.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">○</div>
            <h3>No snapshots yet</h3>
            <p>A snapshot captures who you are right now — your mindset, values, and emotional state. Take one today and compare it in 30 days.</p>
            <button className="btn btn-primary" onClick={openCreate}>Take First Snapshot</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {snapshots.map((snap, idx) => {
              const isSelectedA = compareA?.id === snap.id;
              const isSelectedB = compareB?.id === snap.id;
              const isSelected = isSelectedA || isSelectedB;
              return (
                <div key={snap.id} className="card"
                  style={{ outline: isSelectedA ? '2px solid var(--sage)' : isSelectedB ? '2px solid var(--gold)' : 'none', cursor: compareMode ? 'pointer' : 'default' }}
                  onClick={() => compareMode && toggleCompare(snap)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(13,13,13,0.4)', marginBottom: 4 }}>
                        {idx === 0 ? '● Latest · ' : '○ '}{format(parseISO(snap.date), 'EEEE, MMMM d, yyyy')}
                        {isSelectedA && <span style={{ marginLeft: 8, color: 'var(--sage)', fontWeight: 700 }}>Then</span>}
                        {isSelectedB && <span style={{ marginLeft: 8, color: 'var(--gold)', fontWeight: 700 }}>Now</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'Fraunces', fontSize: 20, color: 'var(--sage)' }}>{snap.mood}/10</span>
                      {!compareMode && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(snap); }} title="Edit" style={{ color: 'rgba(13,13,13,0.4)' }}>✎</button>
                          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(snap); }} title="Delete" style={{ color: 'rgba(13,13,13,0.3)' }}>🗑</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink)', marginBottom: 16, fontStyle: 'italic' }}>
                    "{snap.description}"
                  </p>

                  {snap.values?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)', marginBottom: 8 }}>
                        Values / Beliefs at this time
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {snap.values.map(v => (
                          <span key={v} className="tag tag-mist">{v}</span>
                        ))}
                      </div>
                    </div>
                  )}
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
              <input type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Who are you today?</label>
              <textarea className="form-textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Right now I am someone who... I struggle with... I believe... I am working on..."
                style={{ minHeight: 160 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Current Values / Beliefs (comma separated)</label>
              <input className="form-input" value={form.values}
                onChange={(e) => setForm({ ...form, values: e.target.value })}
                placeholder="honesty, growth, patience, hard work..." />
            </div>
            <div className="form-group">
              <label className="form-label">Overall mood right now — {form.mood}/10</label>
              <input type="range" className="rating-slider" min={1} max={10} value={form.mood}
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
    </div>
  );
}
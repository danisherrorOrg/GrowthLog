import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

export default function SnapshotDetail() {
  const { snapshotId } = useParams();
  const navigate = useNavigate();
  const [snap, setSnap] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [compareId, setCompareId] = useState('');
  const [compareSnap, setCompareSnap] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ description: '', values: '', mood: 5 });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [s, all] = await Promise.all([API.get(`/snapshots/${snapshotId}`), API.get('/snapshots')]);
      setSnap(s.data);
      setSnapshots(all.data);
      setForm({ description: s.data.description, values: s.data.values?.join(', ') || '', mood: s.data.mood });
    } catch { toast.error('Failed to load snapshot'); navigate('/snapshots'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [snapshotId]);

  const handleCompare = async () => {
    if (!compareId) return;
    setComparing(true);
    try {
      const r = await API.get(`/snapshots/compare?snap1_id=${snapshotId}&snap2_id=${compareId}`);
      setCompareSnap(r.data.snapshot2);
    } catch { toast.error('Failed to compare'); }
    finally { setComparing(false); }
  };

  const handleSave = async () => {
    if (!form.description.trim()) return toast.error('Describe who you are today');
    setSaving(true);
    try {
      await API.put(`/snapshots/${snapshotId}`, {
        description: form.description,
        values: form.values.split(',').map(v => v.trim()).filter(Boolean),
        mood: form.mood,
      });
      toast.success('Snapshot updated!');
      setEditMode(false);
      load();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this snapshot permanently?')) return;
    await API.delete(`/snapshots/${snapshotId}`);
    toast.success('Snapshot deleted');
    navigate('/snapshots');
  };

  if (loading) return (
    <div className="page-body">
      {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 200, marginBottom: 16 }} />)}
    </div>
  );

  if (!snap) return null;

  const others = snapshots.filter(s => s.id !== snapshotId);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/snapshots')} style={{ color: 'rgba(13,13,13,0.4)', padding: '4px 8px' }}>
            ← Snapshots
          </button>
        </div>
        <h2>Snapshot Detail ○</h2>
        <p style={{ color: 'rgba(13,13,13,0.45)' }}>{format(parseISO(snap.date), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="page-body">
        {/* Snapshot Card */}
        <div className="card" style={{ marginBottom: 24 }}>
          {editMode ? (
            <div>
              <div className="form-group">
                <label className="form-label">Who are you today?</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ minHeight: 160 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Current Values / Beliefs (comma separated)</label>
                <input className="form-input" value={form.values} onChange={e => setForm({ ...form, values: e.target.value })}
                  placeholder="honesty, growth, patience..." />
              </div>
              <div className="form-group">
                <label className="form-label">Mood — {form.mood}/10</label>
                <input type="range" className="rating-slider" min={1} max={10} value={form.mood}
                  onChange={e => setForm({ ...form, mood: +e.target.value })}
                  style={{ '--val': `${(form.mood - 1) / 9 * 100}%`, width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline" onClick={() => setEditMode(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'Fraunces', fontSize: 28, color: 'var(--sage)' }}>{snap.mood}/10</span>
                    <span style={{ fontSize: 13, color: 'rgba(13,13,13,0.4)' }}>mood</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditMode(true)}>✎ Edit</button>
                  <button className="btn btn-ghost btn-sm" onClick={handleDelete} style={{ color: 'var(--rust)' }}>🗑</button>
                </div>
              </div>

              <p style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--ink)', fontStyle: 'italic', marginBottom: 20 }}>
                "{snap.description}"
              </p>

              {snap.values?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)', marginBottom: 8 }}>
                    Values & Beliefs at this time
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {snap.values.map(v => <span key={v} className="tag tag-mist">{v}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Compare Section */}
        {others.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: 17, marginBottom: 16 }}>⇄ Compare with Another Snapshot</h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <select className="form-select" value={compareId} onChange={e => { setCompareId(e.target.value); setCompareSnap(null); }}
                style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}>
                <option value="">Select a snapshot to compare...</option>
                {others.map(s => (
                  <option key={s.id} value={s.id}>
                    {format(parseISO(s.date), 'MMM d, yyyy')} — Mood {s.mood}/10
                  </option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={handleCompare} disabled={!compareId || comparing}>
                {comparing ? 'Comparing...' : 'Compare'}
              </button>
              {compareSnap && <button className="btn btn-outline" onClick={() => { setCompareSnap(null); setCompareId(''); }}>Clear</button>}
            </div>

            {compareSnap && (
              <div className="grid-2" style={{ gap: 16 }}>
                {[{ label: 'This Snapshot', s: snap, accent: 'rgba(13,13,13,0.4)' }, { label: 'Compared Snapshot', s: compareSnap, accent: 'var(--sage)' }].map(({ label, s, accent }) => (
                  <div key={label} style={{ padding: 16, background: 'var(--mist)', borderRadius: 12, borderTop: `3px solid ${accent}` }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: accent, marginBottom: 6 }}>
                      {label} · {format(parseISO(s.date), 'MMM d, yyyy')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontFamily: 'Fraunces', fontSize: 22, color: 'var(--sage)' }}>{s.mood}/10</span>
                      <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)' }}>mood</span>
                    </div>
                    <p style={{ fontSize: 13, fontStyle: 'italic', lineHeight: 1.7, color: 'var(--ink)', marginBottom: 12 }}>
                      "{s.description.slice(0, 280)}{s.description.length > 280 ? '...' : ''}"
                    </p>
                    {s.values?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {s.values.map(v => <span key={v} className="tag tag-mist" style={{ fontSize: 11 }}>{v}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

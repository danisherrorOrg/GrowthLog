import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';


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
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to load snapshot')); navigate('/snapshots'); }

    finally { setLoading(false); }

  };

  useEffect(() => { load(); }, [snapshotId]);

  const handleCompare = async () => {
    if (!compareId) return;
    setComparing(true);
    try {
      const r = await API.get(`/snapshots/compare?snap1_id=${snapshotId}&snap2_id=${compareId}`);
      setCompareSnap(r.data.snapshot2);
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to compare')); }

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
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to save')); }

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

      <div className="page-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 32, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Main Record Card */}
          <div className="card" style={{ padding: 40 }}>
            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 20, margin: 0 }}>Edit Record</h3>
                  <button className="btn btn-ghost" onClick={() => setEditMode(false)}>✕</button>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Journal Entry</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    style={{ minHeight: 240, fontSize: 16, lineHeight: 1.6 }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                   <div className="form-group">
                     <label className="form-label">Values (comma separated)</label>
                     <input className="form-input" value={form.values} onChange={e => setForm({ ...form, values: e.target.value })} />
                   </div>
                   <div className="form-group">
                     <label className="form-label">Mood Score ({form.mood}/10)</label>
                     <input type="range" className="rating-slider" min={1} max={10} value={form.mood}
                       onChange={e => setForm({ ...form, mood: +e.target.value })}
                       style={{ '--val': `${(form.mood - 1) / 9 * 100}%`, width: '100%' }} />
                   </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-empty" onClick={() => setEditMode(false)} style={{ flex: 1 }}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
                    {saving ? 'Saving...' : 'Update Snapshot'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontSize: 36, fontFamily: 'Fraunces', color: 'var(--sage)' }}>{snap.mood}<span style={{ fontSize: 16, opacity: 0.3 }}>/10</span></div>
                    <div>
                       <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(13,13,13,0.4)', fontWeight: 700 }}>Mood Score</div>
                       <div style={{ fontSize: 13, fontWeight: 500 }}>Captured {format(parseISO(snap.date), 'MMMM d')}</div>
                    </div>
                  </div>
                  <div className="tag tag-mist" style={{ fontSize: 10, letterSpacing: 1 }}>HISTORICAL RECORD</div>
                </div>

                <blockquote className="markdown-body" style={{ 
                  fontSize: 20, lineHeight: 1.8, color: 'var(--ink)', fontStyle: 'italic', 
                  fontFamily: 'Fraunces', marginBottom: 40, borderLeft: '4px solid var(--sage)', paddingLeft: 32
                }}>
                  <MarkdownRenderer content={snap.description} />
                </blockquote>

                {snap.values?.length > 0 && (
                  <div style={{ paddingTop: 32, borderTop: '1px solid rgba(13,13,13,0.05)' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)', marginBottom: 16, fontWeight: 700 }}>
                      Anchored Values & Beliefs
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {snap.values.map(v => <span key={v} className="tag tag-mist" style={{ padding: '6px 16px', fontSize: 12 }}>{v}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Utils & Comparison */}
        <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)', marginBottom: 20 }}>Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
               <button className="btn btn-outline" onClick={() => setEditMode(!editMode)} style={{ justifyContent: 'center' }}>
                 {editMode ? 'Cancel Edit' : '✎ Edit Snapshot'}
               </button>
               <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--rust)', justifyContent: 'center' }}>
                 🗑 Delete Permanently
               </button>
            </div>
          </div>

          {others.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)', marginBottom: 20 }}>Contrast Analysis</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <select className="form-select" value={compareId} onChange={e => { setCompareId(e.target.value); setCompareSnap(null); }}
                  style={{ width: '100%', padding: '10px 14px', fontSize: 13 }}>
                  <option value="">Compare with...</option>
                  {others.map(s => (
                    <option key={s.id} value={s.id}>
                      {format(parseISO(s.date), 'MMM d, yyyy')} (Mood {s.mood})
                    </option>
                  ))}
                </select>
                
                <button className="btn btn-primary" onClick={handleCompare} disabled={!compareId || comparing} style={{ width: '100%' }}>
                  {comparing ? 'Analyzing...' : 'Run Comparison Analysis ⇄'}
                </button>

                {compareSnap && (
                  <div style={{ marginTop: 8, padding: 16, background: 'var(--mist)', borderRadius: 12, borderTop: '2px solid var(--sage)' }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700, marginBottom: 8 }}>Contrast Target</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                       <span style={{ fontSize: 20, fontFamily: 'Fraunces', color: 'var(--ink)' }}>{compareSnap.mood}/10</span>
                       <span style={{ fontSize: 10, opacity: 0.4 }}>{format(parseISO(compareSnap.date), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="markdown-body" style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(13,13,13,0.6)', maxHeight: 120, overflow: 'hidden' }}>
                       <MarkdownRenderer content={compareSnap.description} />
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setCompareSnap(null); setCompareId(''); }} style={{ marginTop: 12, fontSize: 10, padding: 0 }}>✕ Clear analysis</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

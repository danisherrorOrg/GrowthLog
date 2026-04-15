import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function SnapshotDetail() {
  const { snapshotId } = useParams();
  const navigate = useNavigate();
  const [snap, setSnap] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reflections'); // reflections, contrast, settings
  const [compareId, setCompareId] = useState('');
  const [compareSnap, setCompareSnap] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [form, setForm] = useState({ description: '', values: '', mood: 5 });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

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
      load();
      setActiveTab('reflections');
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to save')); }
    finally { setSaving(false); }
  };

  const handleDelete = () => {
    setConfirm({
      title: 'Delete Snapshot?',
      message: 'This will permanently remove this historical record. This action cannot be undone.',
      confirmLabel: 'Delete Permanently',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/snapshots/${snapshotId}`);
          toast.success('Snapshot deleted');
          navigate('/snapshots');
        } catch (e) { toast.error(getErrorMessage(e, 'Failed to delete')); }
      }
    });
  };

  if (loading) return (
    <div className="page-body">
      <div className="skeleton" style={{ height: 60, width: '30%', marginBottom: 32 }} />
      <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
    </div>
  );

  if (!snap) return null;

  const others = snapshots.filter(s => s.id !== snapshotId);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/snapshots')} style={{ color: 'rgba(13,13,13,0.4)', padding: '4px 8px' }}>
            ← Snapshots
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontFamily: 'Fraunces', fontSize: 32 }}>Snapshot Detail ○</h2>
            <p style={{ color: 'rgba(13,13,13,0.45)', marginTop: 4 }}>Recorded on {format(parseISO(snap.date), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 36, fontFamily: 'Fraunces', color: 'var(--sage)', lineHeight: 1 }}>{snap.mood}<span style={{ fontSize: 16, opacity: 0.3 }}>/10</span></div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)', fontWeight: 700, marginTop: 4 }}>Mood Score</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Tab Navigation */}
        <div className="tabs" style={{ marginBottom: 24, borderBottom: '1px solid rgba(13,13,13,0.06)', display: 'flex', gap: 32 }}>
          {[
            { id: 'reflections', label: 'Reflections', icon: '📝' },
            { id: 'contrast', label: 'Contrast Analysis', icon: '⇄' },
            { id: 'settings', label: 'Settings', icon: '⚙️' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '12px 4px', fontSize: 15, fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? 'var(--ink)' : 'rgba(13,13,13,0.4)',
                position: 'relative', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <span>{tab.icon}</span> {tab.label}
              {activeTab === tab.id && (
                <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: 'var(--sage)', borderRadius: 2 }} />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ minHeight: 400 }}>
          {activeTab === 'reflections' && (
            <div className="card" style={{ padding: 40, animation: 'fadeIn 0.4s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(13,13,13,0.3)', fontWeight: 700 }}>Historical Narrative</div>
                <div className="tag tag-mist" style={{ fontSize: 10 }}>ID: {snap.id.slice(0, 8)}</div>
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
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {snap.values.map(v => <span key={v} className="tag tag-mist" style={{ padding: '8px 20px', fontSize: 13, borderRadius: 30 }}>{v}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'contrast' && (
            <div className="card" style={{ padding: 40, animation: 'fadeIn 0.4s ease' }}>
              <div style={{ maxWidth: 600, marginBottom: 32 }}>
                <h3 style={{ fontSize: 22, fontFamily: 'Fraunces', marginBottom: 8 }}>Analyze Evolution</h3>
                <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.5)', lineHeight: 1.6 }}>
                  Select another snapshot to run a contrast analysis. We'll show you how your mood and narrative have shifted between these two points in time.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 16, maxWidth: 500, marginBottom: 40 }}>
                <select className="form-select" value={compareId} onChange={e => { setCompareId(e.target.value); setCompareSnap(null); }}
                  style={{ flex: 1, padding: '12px 16px' }}>
                  <option value="">Select a snapshot to compare...</option>
                  {others.map(s => (
                    <option key={s.id} value={s.id}>
                      {format(parseISO(s.date), 'MMMM d, yyyy')} (Mood {s.mood})
                    </option>
                  ))}
                </select>
                <button className="btn btn-primary" onClick={handleCompare} disabled={!compareId || comparing} style={{ padding: '0 24px' }}>
                  {comparing ? 'Analyzing...' : 'Run Analysis ⇄'}
                </button>
              </div>

              {compareSnap && (
                <div style={{ padding: 32, background: 'rgba(107,140,107,0.03)', borderRadius: 20, border: '1px solid var(--sage)', animation: 'slideUp 0.3s ease' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--sage)', fontWeight: 700 }}>Contrast Target</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCompareSnap(null)} style={{ color: 'rgba(13,13,13,0.3)' }}>✕ Clear Result</button>
                  </div>

                  <div className="grid-2" style={{ gap: 32 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{format(parseISO(snap.date), 'MMM d, yyyy')} (This One)</div>
                      <div className="markdown-body" style={{ fontSize: 14, color: 'rgba(13,13,13,0.6)', fontStyle: 'italic', marginBottom: 12 }}>
                        "{snap.description.slice(0, 150)}..."
                      </div>
                      <div style={{ fontSize: 18, fontFamily: 'Fraunces', color: 'var(--ink)' }}>Mood: {snap.mood}/10</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{format(parseISO(compareSnap.date), 'MMM d, yyyy')}</div>
                      <div className="markdown-body" style={{ fontSize: 14, color: 'rgba(13,13,13,0.6)', fontStyle: 'italic', marginBottom: 12 }}>
                        "{compareSnap.description.slice(0, 150)}..."
                      </div>
                      <div style={{ fontSize: 18, fontFamily: 'Fraunces', color: 'var(--ink)' }}>Mood: {compareSnap.mood}/10</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(13,13,13,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Mood Delta:</span>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                      background: compareSnap.mood > snap.mood ? 'rgba(107,140,107,0.1)' : 'rgba(196,98,58,0.1)',
                      color: compareSnap.mood > snap.mood ? 'var(--sage)' : 'var(--rust)'
                    }}>
                      {compareSnap.mood > snap.mood ? '+' : ''}{compareSnap.mood - snap.mood} points
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="card" style={{ padding: 40, animation: 'fadeIn 0.4s ease' }}>
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 22, fontFamily: 'Fraunces', marginBottom: 8 }}>Edit Snapshot Records</h3>
                <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.5)' }}>Update your historical narrative or values for this date.</p>
              </div>

              <div className="form-group">
                <label className="form-label">Narrative Detail</label>
                <textarea maxLength={2000} className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ minHeight: 240, fontSize: 16, lineHeight: 1.6 }} />
                <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported. Use this to expand on your thoughts from this day.</div>
              </div>

              <div className="stack-grid-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 24 }}>
                 <div className="form-group">
                   <label className="form-label">Values (comma separated)</label>
                   <input maxLength={200} className="form-input" value={form.values} onChange={e => setForm({ ...form, values: e.target.value })} placeholder="honesty, growth, grit..." />
                 </div>
                 <div className="form-group">
                   <label className="form-label">Mood Score ({form.mood}/10)</label>
                   <input maxLength={200} type="range" className="rating-slider" min={1} max={10} value={form.mood}
                     onChange={e => setForm({ ...form, mood: +e.target.value })}
                     style={{ '--val': `${(form.mood - 1) / 9 * 100}%`, width: '100%' }} />
                 </div>
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 40, paddingTop: 32, borderTop: '1px solid rgba(13,13,13,0.06)' }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '0 32px' }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="btn btn-outline" onClick={() => setForm({ description: snap.description, values: snap.values?.join(', ') || '', mood: snap.mood })}>
                  Reset Changes
                </button>
                <div style={{ flex: 1 }} />
                <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--rust)' }}>
                  🗑 Delete Record Permanently
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

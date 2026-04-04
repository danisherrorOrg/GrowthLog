import { useEffect, useState } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

export default function Snapshots() {
  const [snapshots, setSnapshots] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ description: '', values: '', mood: 5 });
  const [loading, setLoading] = useState(false);

  const load = () => API.get('/snapshots').then(r => setSnapshots(r.data));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.description.trim()) return toast.error('Describe who you are today');
    setLoading(true);
    try {
      await API.post('/snapshots', {
        description: form.description,
        values: form.values.split(',').map(v => v.trim()).filter(Boolean),
        mood: form.mood,
      });
      toast.success('○ Snapshot saved!');
      setShowModal(false);
      setForm({ description: '', values: '', mood: 5 });
      load();
    } catch { toast.error('Failed to save snapshot'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Snapshots ○</h2>
        <p>Who are you right now? Capture it. Compare later.</p>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Take Snapshot</button>
        </div>

        {snapshots.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">○</div>
            <h3>No snapshots yet</h3>
            <p>A snapshot captures who you are right now — your mindset, values, and emotional state. Take one today and compare it in 30 days.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Take First Snapshot</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {snapshots.length > 1 && (
              <div className="card" style={{ background: 'var(--mist)', border: 'none' }}>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>📊 Before & After</h3>
                <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)' }}>
                  You have {snapshots.length} snapshots. Compare the earliest and latest to see how far you've come.
                </p>
                <div className="grid-2" style={{ marginTop: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)', marginBottom: 8 }}>
                      Then · {format(parseISO(snapshots[snapshots.length - 1].date), 'MMM d, yyyy')}
                    </div>
                    <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.6)', fontStyle: 'italic', lineHeight: 1.6 }}>
                      "{snapshots[snapshots.length - 1].description.slice(0, 150)}{snapshots[snapshots.length - 1].description.length > 150 ? '...' : ''}"
                    </p>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--sage)', marginBottom: 8 }}>
                      Now · {format(parseISO(snapshots[0].date), 'MMM d, yyyy')}
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--ink)', fontStyle: 'italic', lineHeight: 1.6 }}>
                      "{snapshots[0].description.slice(0, 150)}{snapshots[0].description.length > 150 ? '...' : ''}"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {snapshots.map((snap, idx) => (
              <div key={snap.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(13,13,13,0.4)', marginBottom: 4 }}>
                      {idx === 0 ? '● Latest · ' : '○ '}{format(parseISO(snap.date), 'EEEE, MMMM d, yyyy')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)' }}>Mood</span>
                    <span style={{ fontFamily: 'Fraunces', fontSize: 20, color: 'var(--sage)' }}>{snap.mood}/10</span>
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
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Take a Snapshot</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--mist)', borderRadius: 10, marginBottom: 20, fontSize: 13, color: 'rgba(13,13,13,0.6)', fontStyle: 'italic' }}>
              Describe who you are right now, honestly. Your mindset, your struggles, your strengths, what you believe. Future you will read this.
            </div>
            <div className="form-group">
              <label className="form-label">Who are you today?</label>
              <textarea className="form-textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Right now I am someone who... I struggle with... I believe... I am working on... My biggest strength is..."
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
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Saving...' : 'Save Snapshot ○'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

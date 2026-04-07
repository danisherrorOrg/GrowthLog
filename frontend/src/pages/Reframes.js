import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';

const DISTORTIONS = [
  "All-or-Nothing Thinking", "Overgeneralization", "Mental Filter",
  "Disqualifying the Positive", "Jumping to Conclusions", "Magnification (Catastrophizing)",
  "Emotional Reasoning", "Should Statements", "Labeling", "Personalization", "unspecified"
];

export default function Reframes() {
  const [reframes, setReframes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newReframe, setNewReframe] = useState({
    trigger: '', original_thought: '', distortion: 'unspecified',
    reframe: '', feeling_before: 5, feeling_after: 5
  });
  const [editingReframe, setEditingReframe] = useState(null);
  const [editForm, setEditForm] = useState({
    trigger: '', original_thought: '', original_thought_bk: '', distortion: 'unspecified',
    reframe: '', feeling_before: 5, feeling_after: 5
  });

  const [filter, setFilter] = useState('All');

  const fetchReframes = async () => {
    try {
      const res = await API.get('/reframes');
      setReframes(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load reframes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReframes();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newReframe.original_thought.trim() || !newReframe.reframe.trim()) return;
    
    try {
      const res = await API.post('/reframes', newReframe);
      setReframes([res.data, ...reframes]);
      setNewReframe({ trigger: '', original_thought: '', distortion: 'unspecified', reframe: '', feeling_before: 5, feeling_after: 5 });
      setShowAdd(false);
      toast.success('Cognitive reframe saved!');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save reframe'));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editForm.original_thought.trim() || !editForm.reframe.trim()) return;
    try {
      const res = await API.put(`/reframes/${editingReframe.id}`, editForm);
      setReframes(reframes.map(r => r.id === editingReframe.id ? res.data : r));
      setEditingReframe(null);
      toast.success('Reframe updated!');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update reframe'));
    }
  };

  const deleteReframe = async (id) => {
    if (!window.confirm('Delete this reframe?')) return;
    try {
      await API.delete(`/reframes/${id}`);
      setReframes(reframes.filter(r => r.id !== id));
      toast.success('Reframe deleted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'));
    }
  };

  const RatingSlider = ({ label, value, onChange }) => (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 13, display: 'block', marginBottom: 8, color: 'var(--ink)', fontWeight: 500 }}>
        {label} (1-10): <span style={{ color: 'var(--sage)' }}>{value}</span>
      </label>
      <input 
        type="range" min="1" max="10" 
        value={value} 
        onChange={onChange}
        style={{ width: '100%', accentColor: 'var(--sage)' }} 
      />
    </div>
  );

  if (loading) return <div className="page-body">Loading...</div>;

  const filteredReframes = reframes.filter(r => {
    if (filter === 'All') return true;
    if (filter === 'Catastrophizing') return r.distortion === 'Magnification (Catastrophizing)';
    return r.distortion === filter;
  });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Cognitive Reframing Studio 🧠</h2>
          <p>Challenge distortions and rewire your perspective.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>+ New Reframe</button>
      </div>
      <div className="page-body">
        {/* Unified Toolbar & Trigger */}
        <div className="card" style={{ marginBottom: 40, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'var(--mist)', padding: 3, borderRadius: 10 }}>
              <button 
                className={`btn btn-sm ${filter === 'All' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => setFilter('All')}
                style={{ borderRadius: 8, padding: '6px 16px', fontSize: 11, ... (filter !== 'All' && { opacity: 0.6 }) }}
              >
                All Reframes
              </button>
              <button 
                className={`btn btn-sm ${filter === 'Catastrophizing' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => setFilter('Catastrophizing')}
                style={{ borderRadius: 8, padding: '6px 16px', fontSize: 11, ... (filter !== 'Catastrophizing' && { opacity: 0.6 }) }}
              >
                Catastrophizing
              </button>
              <button 
                className={`btn btn-sm ${filter === 'Labeling' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => setFilter('Labeling')}
                style={{ borderRadius: 8, padding: '6px 16px', fontSize: 11, ... (filter !== 'Labeling' && { opacity: 0.6 }) }}
              >
                Labeling
              </button>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} style={{ borderRadius: 30, padding: '10px 24px' }}>
            {showAdd ? '✕ Close Studio' : '+ Initialize Reframe'}
          </button>
        </div>

        {showAdd && (
          <div className="card" style={{ marginBottom: 40, border: '1px solid var(--sage)', background: 'rgba(107,140,107,0.02)' }}>
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--sage)', marginBottom: 24, fontWeight: 700 }}>Cognitive Reconstruction Mode</h3>
            
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11 }}>The external trigger</label>
                <input 
                  type="text" className="form-input" 
                  value={newReframe.trigger}
                  onChange={e => setNewReframe({...newReframe, trigger: e.target.value})}
                  placeholder="What happened in reality? (e.g. 'Received a brief email')"
                  style={{ border: 'none', borderBottom: '1px solid rgba(13,13,13,0.1)', background: 'transparent', borderRadius: 0, paddingLeft: 0 }}
                />
              </div>

              <div className="grid-2" style={{ gap: 32 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11, color: 'var(--rust)' }}>Automatic Insight (The Lie)</label>
                  <textarea 
                    className="form-textarea" 
                    value={newReframe.original_thought}
                    onChange={e => setNewReframe({...newReframe, original_thought: e.target.value})}
                    placeholder="What did your brain tell you?"
                    style={{ minHeight: 120, background: 'rgba(235,160,147,0.03)', border: '1px solid rgba(235,160,147,0.1)' }}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11, color: 'var(--sage)' }}>Rational Perspective (The Truth)</label>
                  <textarea 
                    className="form-textarea" 
                    value={newReframe.reframe}
                    onChange={e => setNewReframe({...newReframe, reframe: e.target.value})}
                    placeholder="How can you view this objectively?"
                    style={{ minHeight: 120, background: 'rgba(107,140,107,0.03)', border: '1px solid rgba(107,140,107,0.1)', fontFamily: 'Fraunces', fontStyle: 'italic' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Identify the distortion</label>
                  <select className="form-select" value={newReframe.distortion} onChange={e => setNewReframe({...newReframe, distortion: e.target.value})} style={{ background: 'white' }}>
                    {DISTORTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                   <RatingSlider label="Pre-Intensity" value={newReframe.feeling_before} onChange={e => setNewReframe({...newReframe, feeling_before: Number(e.target.value)})} />
                   <RatingSlider label="Post-Intensity" value={newReframe.feeling_after} onChange={e => setNewReframe({...newReframe, feeling_after: Number(e.target.value)})} />
                </div>
              </div>

              <div style={{ paddingTop: 24, borderTop: '1px solid rgba(13,13,13,0.05)', textAlign: 'right' }}>
                 <button type="submit" className="btn btn-primary" style={{ borderRadius: 30, padding: '12px 32px' }}>Solidify Reframe ✦</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {filteredReframes.map(r => (
            <div key={r.id} className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="tag tag-mist" style={{ fontSize: 9, letterSpacing: 1 }}>TRIGGER EVENT</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{r.trigger || 'Spontaneous Thought'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setEditingReframe(r); setEditForm({ ...r }); }} className="btn btn-ghost btn-sm" style={{ opacity: 0.3 }}>✎</button>
                    <button onClick={() => deleteReframe(r.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--rust)', opacity: 0.3 }}>✕</button>
                  </div>
               </div>

               <div className="grid-2" style={{ gap: 24 }}>
                 <div style={{ padding: 24, background: 'rgba(235,160,147,0.02)', borderRadius: 16, border: '1px solid rgba(235,160,147,0.05)' }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--rust)', letterSpacing: 1, marginBottom: 12, fontWeight: 700 }}>Automatic Thought</div>
                    <div style={{ fontSize: 16, color: 'rgba(13,13,13,0.7)', lineHeight: 1.6 }}><MarkdownRenderer content={r.original_thought} /></div>
                 </div>
                 
                 <div style={{ padding: 24, background: 'rgba(107,140,107,0.03)', borderRadius: 16, border: '1px solid rgba(107,140,107,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--sage)', letterSpacing: 1, fontWeight: 700 }}>Rational Reframe</div>
                      <span className="tag tag-gold" style={{ fontSize: 8 }}>{r.distortion}</span>
                    </div>
                    <div style={{ fontSize: 18, color: 'var(--ink)', lineHeight: 1.6, fontFamily: 'Fraunces', fontStyle: 'italic' }}>
                      <MarkdownRenderer content={r.reframe} />
                    </div>
                 </div>
               </div>

               <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '12px 24px', background: 'var(--mist)', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase' }}>Negative Intensity Shift</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <strong style={{ color: 'var(--rust)', fontSize: 16 }}>{r.feeling_before}</strong>
                    <div style={{ color: 'rgba(13,13,13,0.1)', fontSize: 20 }}>→</div>
                    <strong style={{ color: 'var(--sage)', fontSize: 20 }}>{r.feeling_after}</strong>
                    <div style={{ fontSize: 10, opacity: 0.4, marginLeft: 4 }}>Reduction of {r.feeling_before - r.feeling_after} pts</div>
                  </div>
               </div>
            </div>
          ))}
        </div>
        
        {reframes.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🧠</div>
            <h3>Your Reframing Studio is Clear</h3>
            <p>Challenge your automatic negative thoughts to build emotional resilience.</p>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ borderRadius: 30 }}>Add Your First Reframe</button>
          </div>
        )}
      </div>

      {editingReframe && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingReframe(null)}>
          <div className="modal" style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h3>Tend to Perspective 🧠</h3>
              <button className="modal-close" onClick={() => setEditingReframe(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="form-group">
                <label className="form-label">The Trigger</label>
                <input type="text" className="form-input" value={editForm.trigger} onChange={e => setEditForm({ ...editForm, trigger: e.target.value })} />
              </div>
              <div className="grid-2" style={{ gap: 24 }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--rust)' }}>Automatic Thought</label>
                  <textarea className="form-textarea" value={editForm.original_thought} onChange={e => setEditForm({ ...editForm, original_thought: e.target.value })} style={{ minHeight: 120 }} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--sage)' }}>Rational Reframe</label>
                  <textarea className="form-textarea" value={editForm.reframe} onChange={e => setEditForm({ ...editForm, reframe: e.target.value })} style={{ minHeight: 120, fontFamily: 'Fraunces', fontStyle: 'italic' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Update Distortion</label>
                  <select className="form-select" value={editForm.distortion} onChange={e => setEditForm({ ...editForm, distortion: e.target.value })}>
                    {DISTORTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                   <RatingSlider label="Pre-Intensity" value={editForm.feeling_before} onChange={e => setEditForm({ ...editForm, feeling_before: Number(e.target.value) })} />
                   <RatingSlider label="Post-Intensity" value={editForm.feeling_after} onChange={e => setEditForm({ ...editForm, feeling_after: Number(e.target.value) })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingReframe(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Perspective</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

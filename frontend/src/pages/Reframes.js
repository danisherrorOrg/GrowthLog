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
        {showAdd && (
          <div className="card" style={{ marginBottom: 32, border: '2px solid var(--gold)', background: 'rgba(201,168,76,0.02)' }}>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 8, display: 'block' }}>Trigger (What happened?)</label>
                <input 
                  type="text" className="form-input" 
                  value={newReframe.trigger}
                  onChange={e => setNewReframe({...newReframe, trigger: e.target.value})}
                  placeholder="e.g. Received a brief email from my boss."
                />
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 8, display: 'block' }}>Negative Automatic Thought</label>
                  <textarea 
                    className="form-textarea" 
                    value={newReframe.original_thought}
                    onChange={e => setNewReframe({...newReframe, original_thought: e.target.value})}
                    placeholder="e.g. They think I'm doing a terrible job and I'm going to get fired."
                    style={{ minHeight: 100 }}
                    required
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 8, display: 'block' }}>Rational Reframe</label>
                  <textarea 
                    className="form-textarea" 
                    value={newReframe.reframe}
                    onChange={e => setNewReframe({...newReframe, reframe: e.target.value})}
                    placeholder="e.g. They are probably just busy. One short email doesn't mean I'm failing."
                    style={{ minHeight: 100, borderLeft: '4px solid var(--sage)' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 8, display: 'block' }}>Cognitive Distortion</label>
                <select className="form-select" value={newReframe.distortion} onChange={e => setNewReframe({...newReframe, distortion: e.target.value})}>
                  {DISTORTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 24, padding: '16px', background: 'var(--paper)', borderRadius: 8 }}>
                <RatingSlider 
                  label="Intensity of Negative Emotion BEFORE" 
                  value={newReframe.feeling_before} 
                  onChange={e => setNewReframe({...newReframe, feeling_before: Number(e.target.value)})} 
                />
                <RatingSlider 
                  label="Intensity of Negative Emotion AFTER" 
                  value={newReframe.feeling_after} 
                  onChange={e => setNewReframe({...newReframe, feeling_after: Number(e.target.value)})} 
                />
              </div>
              
              <div style={{ textAlign: 'right' }}>
                 <button type="submit" className="btn btn-primary">Save Reframe</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {reframes.map(r => (
            <div key={r.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div>
                   <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(13,13,13,0.4)', marginBottom: 4 }}>Trigger</div>
                   <div style={{ fontSize: 15, fontWeight: 500 }}>{r.trigger || 'Unspecified event'}</div>
                 </div>
                 <button onClick={() => deleteReframe(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rust)', opacity: 0.5 }}>✕</button>
               </div>

               <div className="grid-2" style={{ gap: 16 }}>
                 <div style={{ padding: 16, background: 'rgba(235,160,147,0.08)', borderRadius: 12, borderLeft: '3px solid var(--rust)' }}>
                   <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 8, fontWeight: 600 }}>Automatic Thought</div>
                   <div style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.5 }}><MarkdownRenderer content={r.original_thought} className="md-fixed-size" /></div>
                 </div>
                 
                 <div style={{ padding: 16, background: 'rgba(107,140,107,0.08)', borderRadius: 12, borderLeft: '3px solid var(--sage)' }}>
                   <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--sage)', marginBottom: 8, fontWeight: 600 }}>Rational Reframe</div>
                   <div style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.5 }}><MarkdownRenderer content={r.reframe} className="md-fixed-size" /></div>
                 </div>
               </div>

               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '12px 16px', background: 'var(--mist)', borderRadius: 8 }}>
                 <div>
                   <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)', marginRight: 8 }}>Distortion:</span>
                   <span className="tag tag-gold" style={{ fontSize: 11 }}>{r.distortion}</span>
                 </div>
                 <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                   <div style={{ fontSize: 13 }}><span style={{ color: 'rgba(13,13,13,0.5)' }}>Before:</span> <strong style={{ color: 'var(--rust)' }}>{r.feeling_before}/10</strong></div>
                   <div style={{ color: 'rgba(13,13,13,0.2)' }}>→</div>
                   <div style={{ fontSize: 13 }}><span style={{ color: 'rgba(13,13,13,0.5)' }}>After:</span> <strong style={{ color: 'var(--sage)' }}>{r.feeling_after}/10</strong></div>
                 </div>
               </div>
               
            </div>
          ))}
        </div>
        
        {reframes.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🧠</div>
            <h3>Your studio is empty</h3>
            <p>Start rewiring your thoughts by challenging cognitive distortions.</p>
          </div>
        )}
      </div>
    </div>
  );
}

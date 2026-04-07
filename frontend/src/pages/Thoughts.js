import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import { formatDistanceToNow, parseISO } from 'date-fns';

export default function Thoughts() {
  const [thoughts, setThoughts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newThought, setNewThought] = useState('');

  const fetchThoughts = async () => {
    try {
      const res = await API.get('/thoughts');
      setThoughts(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load thoughts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThoughts();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newThought.trim()) return;
    
    try {
      const res = await API.post('/thoughts', { content: newThought });
      setThoughts([res.data, ...thoughts]);
      setNewThought('');
      toast.success('Thought captured');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save thought'));
    }
  };

  const deleteThought = async (id) => {
    if (!window.confirm('Delete this thought?')) return;
    try {
      await API.delete(`/thoughts/${id}`);
      setThoughts(thoughts.filter(t => t.id !== id));
      toast.success('Deleted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'));
    }
  };

  if (loading) return <div className="page-body">Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>Mind Garden 🪴</h2>
        <p>A stream of consciousness for your passing thoughts.</p>
      </div>

      <div className="page-body" style={{ maxWidth: 800 }}>
        
        <div className="card" style={{ marginBottom: 32, border: '1px solid rgba(13,13,13,0.1)' }}>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <textarea 
              className="form-textarea" 
              placeholder="What's on your mind? Capture it before it leaves." 
              value={newThought}
              onChange={e => setNewThought(e.target.value)}
              style={{ minHeight: 100, border: 'none', background: 'transparent', padding: 0 }}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)' }}>
                Markdown supported. Your sentiment will be analyzed automatically.
              </div>
              <button type="submit" className="btn btn-primary" style={{ borderRadius: 30 }}>Plant Thought ✦</button>
            </div>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {thoughts.map(t =>(
            <div key={t.id} style={{ display: 'flex', gap: 16 }}>
               <div style={{ width: 2, background: t.sentiment === 'Positive' ? 'var(--sage)' : t.sentiment === 'Negative' ? 'var(--rust)' : 'var(--mist)', borderRadius: 2 }} />
               <div className="card" style={{ flex: 1, padding: '20px 24px' }}>
                 
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                   <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)' }}>
                     {t.created_at ? formatDistanceToNow(parseISO(t.created_at), { addSuffix: true }) : 'Just now'}
                   </div>
                   <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                     <span className={`tag ${t.sentiment === 'Positive' ? 'tag-green' : t.sentiment === 'Negative' ? 'tag-red' : 'tag-mist'}`} style={{ fontSize: 10 }}>
                       {t.sentiment}
                     </span>
                     <button onClick={() => deleteThought(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rust)', opacity: 0.5 }}>✕</button>
                   </div>
                 </div>

                 <div style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.6 }}>
                   <MarkdownRenderer content={t.content} className="md-fixed-size" />
                 </div>

               </div>
            </div>
          ))}
        </div>
        
        {thoughts.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🪴</div>
            <h3>Your garden is clear</h3>
            <p>Start planting your passing thoughts.</p>
          </div>
        )}

      </div>
    </div>
  );
}

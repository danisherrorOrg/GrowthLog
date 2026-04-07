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
  const [newSentiment, setNewSentiment] = useState('Neutral');
  const [editingThought, setEditingThought] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editSentiment, setEditSentiment] = useState('Neutral');
  const [filter, setFilter] = useState('All');

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
      const res = await API.post('/thoughts', { content: newThought, sentiment: newSentiment });
      setThoughts([res.data, ...thoughts]);
      setNewThought('');
      setNewSentiment('Neutral');
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

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editContent.trim()) return;

    try {
      const res = await API.put(`/thoughts/${editingThought.id}`, { content: editContent, sentiment: editSentiment });
      setThoughts(thoughts.map(t => t.id === editingThought.id ? res.data : t));
      setEditingThought(null);
      setEditContent('');
      toast.success('Thought updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update thought'));
    }
  };

  if (loading) return <div className="page-body">Loading...</div>;

  const filteredThoughts = thoughts.filter(t => {
    if (filter === 'All') return true;
    return t.sentiment === filter;
  });

  return (
    <div>
      <div className="page-header">
        <h2>Mind Garden 🪴</h2>
        <p>A stream of consciousness for your passing thoughts.</p>
      </div>

      <div className="page-body">
        {/* Unified Toolbar & Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, marginBottom: 48 }}>
          <div className="card" style={{ padding: '24px 32px', background: 'white', border: '1px solid rgba(13,13,13,0.06)', boxShadow: '0 8px 32px rgba(13,13,13,0.02)' }}>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <textarea 
                className="form-textarea" 
                placeholder="Capture a passing thought... the garden waits." 
                value={newThought}
                onChange={e => setNewThought(e.target.value)}
                style={{ 
                   minHeight: 120, border: 'none', background: 'transparent', padding: 0, 
                   fontSize: 18, fontFamily: 'Fraunces', fontStyle: 'italic', color: 'var(--ink)'
                }}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid rgba(13,13,13,0.04)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
                     Energy:
                  </div>
                  <div style={{ display: 'flex', background: 'var(--mist)', padding: 2, borderRadius: 8 }}>
                    {['Positive', 'Neutral', 'Negative'].map(s => (
                      <button 
                        key={s} 
                        type="button"
                        className={`btn btn-sm ${newSentiment === s ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setNewSentiment(s)}
                        style={{ fontSize: 10, padding: '4px 12px', borderRadius: 6 }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ borderRadius: 30, padding: '10px 28px', boxShadow: '0 4px 12px rgba(13,13,13,0.1)' }}>
                  Plant Thought ✦
                </button>
              </div>
            </form>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', background: 'var(--mist)', padding: 3, borderRadius: 10 }}>
              {['All', 'Positive', 'Neutral', 'Negative'].map(s => (
                <button 
                  key={s} 
                  className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`} 
                  onClick={() => setFilter(s)}
                  style={{ borderRadius: 8, padding: '6px 16px', fontSize: 11, ... (filter !== s && { opacity: 0.6 }) }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, opacity: 0.4 }}>{filteredThoughts.length} Thoughts Visible</div>
          </div>
        </div>

        <div className="auto-grid">
          {filteredThoughts.map(t => (
            <div key={t.id} className="card" style={{ 
              display: 'flex', flexDirection: 'column', gap: 16, 
              borderLeft: `3px solid ${t.sentiment === 'Positive' ? 'var(--sage)' : t.sentiment === 'Negative' ? 'var(--rust)' : 'rgba(13,13,13,0.2)'}`,
              padding: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.4 }}>
                  {t.created_at ? formatDistanceToNow(parseISO(t.created_at), { addSuffix: true }) : 'Recently'}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                   <span className={`tag ${t.sentiment === 'Positive' ? 'tag-green' : t.sentiment === 'Negative' ? 'tag-rust' : 'tag-mist'}`} style={{ fontSize: 8 }}>
                     {t.sentiment}
                   </span>
                   <button className="btn btn-ghost btn-sm" style={{ padding: 4, opacity: 0.2 }} onClick={() => { setEditingThought(t); setEditContent(t.content); setEditSentiment(t.sentiment || 'Neutral'); }}>✎</button>
                   <button className="btn btn-ghost btn-sm" style={{ padding: 4, opacity: 0.2 }} onClick={() => deleteThought(t.id)}>✕</button>
                </div>
              </div>

              <div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink)' }}>
                <MarkdownRenderer content={t.content} />
              </div>
            </div>
          ))}
        </div>

        {filteredThoughts.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🪴</div>
            <h3>No thoughts found</h3>
            <p>{filter === 'All' ? 'Your mind garden is empty. Plant your first thought.' : `No ${filter.toLowerCase()} thoughts in your garden.`}</p>
          </div>
        )}
      </div>

      {editingThought && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>Tend to Thought 🌿</h3>
              <button className="modal-close" onClick={() => setEditingThought(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label className="form-label">Garden Correction</label>
                <textarea 
                  className="form-textarea" 
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  style={{ minHeight: 150 }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Update Energy</label>
                <div style={{ display: 'flex', background: 'var(--mist)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
                  {['Positive', 'Neutral', 'Negative'].map(s => (
                    <button 
                      key={s} 
                      type="button"
                      className={`btn btn-sm ${editSentiment === s ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setEditSentiment(s)}
                      style={{ fontSize: 11, padding: '6px 20px', borderRadius: 8 }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingThought(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Thought</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

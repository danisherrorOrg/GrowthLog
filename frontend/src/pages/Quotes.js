import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newQuote, setNewQuote] = useState({ content: '', author: '', source: '', tags: '' });
  const [activeTag, setActiveTag] = useState(null);

  const fetchQuotes = async () => {
    try {
      const res = await API.get('/quotes');
      setQuotes(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load quotes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newQuote.content.trim()) return;
    
    const tagsArray = newQuote.tags.split(',').map(t => t.trim()).filter(t => t);
    const payload = { ...newQuote, tags: tagsArray };

    try {
      const res = await API.post('/quotes', payload);
      setQuotes([res.data, ...quotes]);
      setNewQuote({ content: '', author: '', source: '', tags: '' });
      setShowAdd(false);
      toast.success('Quote vaulted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save quote'));
    }
  };

  const deleteQuote = async (id) => {
    if (!window.confirm('Remove from vault?')) return;
    try {
      await API.delete(`/quotes/${id}`);
      setQuotes(quotes.filter(q => q.id !== id));
      toast.success('Quote deleted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'));
    }
  };

  const toggleFavorite = async (id, isFavorite) => {
    try {
      const res = await API.patch(`/quotes/${id}/favorite?is_favorite=${!isFavorite}`);
      setQuotes(quotes.map(q => q.id === id ? res.data : q));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update'));
    }
  };

  if (loading) return <div className="page-body">Loading...</div>;

  // Gather unique tags
  const allTags = [...new Set(quotes.flatMap(q => q.tags))];
  const filteredQuotes = activeTag 
    ? quotes.filter(q => q.tags.includes(activeTag)) 
    : quotes;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Motivation Vault 🗝️</h2>
          <p>Words of wisdom to keep you grounded.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>+ Add Quote</button>
      </div>

      <div className="page-body">
        {showAdd && (
          <div className="card" style={{ marginBottom: 24, border: '2px solid var(--gold)' }}>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <textarea 
                  className="form-textarea" 
                  placeholder="The quote..." 
                  value={newQuote.content}
                  onChange={e => setNewQuote({...newQuote, content: e.target.value})}
                  required
                  style={{ minHeight: 80 }}
                />
              </div>
              <div className="grid-3" style={{ gap: 12 }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Author (e.g. Marcus Aurelius)" 
                  value={newQuote.author}
                  onChange={e => setNewQuote({...newQuote, author: e.target.value})}
                />
                 <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Source (e.g. Meditations)" 
                  value={newQuote.source}
                  onChange={e => setNewQuote({...newQuote, source: e.target.value})}
                />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Tags (comma separated)" 
                  value={newQuote.tags}
                  onChange={e => setNewQuote({...newQuote, tags: e.target.value})}
                />
              </div>
              <div style={{ textAlign: 'right' }}>
                 <button type="submit" className="btn btn-gold">Save to Vault</button>
              </div>
            </form>
          </div>
        )}

        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            <button 
              className={`tag ${activeTag === null ? 'tag-gold' : 'tag-mist'}`} 
              onClick={() => setActiveTag(null)}
              style={{ padding: '6px 14px', cursor: 'pointer', border: 'none' }}
            >
              All
            </button>
            {allTags.map(tag => (
              <button 
                key={tag} 
                className={`tag ${activeTag === tag ? 'tag-gold' : 'tag-mist'}`} 
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                style={{ padding: '6px 14px', cursor: 'pointer', border: 'none' }}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        <div style={{ columnCount: 3, columnGap: 24 }}>
          {filteredQuotes.map(q => (
            <div key={q.id} className="card" style={{ breakInside: 'avoid', marginBottom: 24, position: 'relative' }}>
               <div style={{ fontSize: 24, color: 'var(--gold)', marginBottom: 8, lineHeight: 1 }}>“</div>
               <div style={{ fontFamily: 'Fraunces', fontSize: 18, color: 'var(--ink)', marginBottom: 12, fontStyle: 'italic' }}>
                 <MarkdownRenderer content={q.content} />
               </div>
               <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(13,13,13,0.5)', marginBottom: 12 }}>
                 — {q.author || 'Unknown'} {q.source && `(${q.source})`}
               </div>
               
               <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                 {q.tags.map(t => <span key={t} className="tag tag-mist" style={{ fontSize: 10 }}>{t}</span>)}
               </div>

               <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
                 <button 
                   onClick={() => toggleFavorite(q.id, q.is_favorite)} 
                   style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, opacity: q.is_favorite ? 1 : 0.3 }}
                 >
                   {q.is_favorite ? '★' : '☆'}
                 </button>
                 <button onClick={() => deleteQuote(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rust)', opacity: 0.5 }}>✕</button>
               </div>
            </div>
          ))}
        </div>
        
        {filteredQuotes.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🗝️</div>
            <h3>Your vault is empty</h3>
            <p>Save words that resonate with your journey.</p>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [editingQuote, setEditingQuote] = useState(null);

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
      setActiveTag(null);
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

  const handleEditClick = (quote) => {
    setEditingQuote({
      ...quote,
      tags: quote.tags.join(', ')
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingQuote.content.trim()) return;

    const tagsArray = editingQuote.tags.split(',').map(t => t.trim()).filter(t => t);
    const payload = { ...editingQuote, tags: tagsArray };

    try {
      const res = await API.put(`/quotes/${editingQuote.id}`, payload);
      setQuotes(quotes.map(q => q.id === editingQuote.id ? res.data : q));
      setEditingQuote(null);
      toast.success('Quote updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update quote'));
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
        {!showAdd && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Add Quote
          </button>
        )}
      </div>

      <div className="page-body">
        {/* Unified Toolbar */}
        <div className="card" style={{ marginBottom: 32, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'var(--mist)', padding: 3, borderRadius: 10 }}>
              <button className={`btn btn-sm ${activeTag === null ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTag(null)} style={{ borderRadius: 8, padding: '6px 16px', fontSize: 12 }}>
                All Wisdom
              </button>
              {allTags.slice(0, 3).map(tag => (
                <button key={tag} className={`btn btn-sm ${activeTag === tag ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTag(tag === activeTag ? null : tag)} style={{ borderRadius: 8, padding: '6px 16px', fontSize: 12 }}>
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-gold" onClick={() => setShowAdd(true)} style={{ borderRadius: 30, padding: '10px 24px', boxShadow: '0 4px 12px rgba(201,168,76,0.15)' }}>
            + Capture Wisdom
          </button>
        </div>

        {showAdd && (
          <div className="card" style={{ marginBottom: 32, border: '1px solid var(--gold)', background: 'rgba(201,168,76,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, margin: 0, color: 'var(--gold)' }}>New Vault Entry 🗝️</h3>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <textarea
                className="form-textarea"
                placeholder="What words of wisdom will guide you?"
                value={newQuote.content}
                onChange={e => setNewQuote({ ...newQuote, content: e.target.value })}
                required
                style={{ 
                  minHeight: 100, border: 'none', background: 'transparent', padding: 0,
                  fontSize: 18, fontFamily: 'Fraunces', fontStyle: 'italic', color: 'var(--ink)'
                }}
              />
              <div style={{ padding: '20px 0', borderTop: '1px solid rgba(13,13,13,0.05)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 10 }}>Author</label>
                  <input type="text" className="form-input" placeholder="e.g. Marcus Aurelius" value={newQuote.author} onChange={e => setNewQuote({ ...newQuote, author: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 10 }}>Source</label>
                  <input type="text" className="form-input" placeholder="e.g. Meditations" value={newQuote.source} onChange={e => setNewQuote({ ...newQuote, source: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 10 }}>Tags</label>
                  <input type="text" className="form-input" placeholder="patience, growth..." value={newQuote.tags} onChange={e => setNewQuote({ ...newQuote, tags: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-gold" style={{ flex: 1 }}>Save to Vault</button>
              </div>
            </form>
          </div>
        )}

        <div className="auto-grid">
          {filteredQuotes.map(q => (
            <div key={q.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--gold)', fontSize: 32, fontFamily: 'Fraunces', lineHeight: 0.5, marginTop: 12 }}>“</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleFavorite(q.id, q.is_favorite)} style={{ fontSize: 18, color: q.is_favorite ? 'var(--gold)' : 'rgba(13,13,13,0.1)' }}>
                    {q.is_favorite ? '★' : '☆'}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ padding: 4, opacity: 0.2 }} onClick={() => handleEditClick(q)}>✎</button>
                  <button className="btn btn-ghost btn-sm" style={{ padding: 4, opacity: 0.2 }} onClick={() => deleteQuote(q.id)}>✕</button>
                </div>
              </div>

              <div style={{ fontFamily: 'Fraunces', fontSize: 18, color: 'var(--ink)', fontStyle: 'italic', lineHeight: 1.6 }}>
                <MarkdownRenderer content={q.content} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'auto' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.4 }}>
                  — {q.author || 'Unknown'} {q.source && `· ${q.source}`}
                </div>
                {q.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {q.tags.map(t => <span key={t} className="tag tag-mist" style={{ fontSize: 9 }}>#{t}</span>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredQuotes.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🗝️</div>
            <h3>Your Motivation Vault is Empty</h3>
            <p>Save the words that resonate with your journey and soul.</p>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ borderRadius: 30 }}>Add Your First Quote</button>
          </div>
        )}
      </div>

      {editingQuote && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>Refine Wisdom 🗝️</h3>
              <button className="modal-close" onClick={() => setEditingQuote(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">The Words</label>
                <textarea
                  className="form-textarea"
                  value={editingQuote.content}
                  onChange={e => setEditingQuote({ ...editingQuote, content: e.target.value })}
                  required
                  style={{ minHeight: 120 }}
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Author</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingQuote.author}
                    onChange={e => setEditingQuote({ ...editingQuote, author: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Source</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingQuote.source}
                    onChange={e => setEditingQuote({ ...editingQuote, source: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingQuote.tags}
                  onChange={e => setEditingQuote({ ...editingQuote, tags: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingQuote(null)}>Cancel</button>
                <button type="submit" className="btn btn-gold">Update Vault</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

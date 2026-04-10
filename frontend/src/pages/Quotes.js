import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';

// ── Helpers ───────────────────────────────────────────────────────────────────
function highlightText(text, query) {
  if (!query?.trim() || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ background: 'rgba(201,168,76,0.4)', borderRadius: 2, padding: '0 1px' }}>{part}</mark>
      : part
  );
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 180 }}>
      <div className="skeleton" style={{ height: 14, width: 32, borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 14, width: '90%', borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 14, width: '75%', borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 6 }} />
      <div style={{ marginTop: 'auto' }}>
        <div className="skeleton" style={{ height: 10, width: 100, borderRadius: 6 }} />
      </div>
    </div>
  );
}

// ── Confirm modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <h3 style={{ color: 'var(--rust)' }}>Remove Quote?</h3>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.6)', lineHeight: 1.6, marginBottom: 24 }}>
          This quote will be permanently removed from your vault.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
          <button className="btn" onClick={onConfirm}
            style={{ flex: 1, background: 'var(--rust)', color: 'white', border: 'none' }}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Spotlight (random) modal ──────────────────────────────────────────────────
function SpotlightModal({ quote, onClose, onNext, onFavorite }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 1100, background: 'rgba(13,13,13,0.85)' }}>
      <div style={{
        maxWidth: 600, width: '90%',
        background: 'var(--paper)', borderRadius: 24,
        padding: '40px 40px 32px', position: 'relative',
        boxShadow: '0 40px 80px rgba(13,13,13,0.4)',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 20, right: 20,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 18, opacity: 0.4,
        }}>✕</button>

        {/* Ornamental quote mark */}
        <div style={{ color: 'var(--gold)', fontSize: 64, fontFamily: 'Fraunces',
          lineHeight: 0.6, marginBottom: 20, opacity: 0.6 }}>
          "
        </div>

        <div style={{
          fontFamily: 'Fraunces', fontSize: 22, fontStyle: 'italic',
          lineHeight: 1.7, color: 'var(--ink)', marginBottom: 24,
        }}>
          <MarkdownRenderer content={quote.content} />
        </div>

        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5,
          color: 'rgba(13,13,13,0.4)', marginBottom: 16 }}>
          — {quote.author || 'Unknown'}
          {quote.source && ` · ${quote.source}`}
        </div>

        {quote.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
            {quote.tags.map(t => (
              <span key={t} className="tag tag-mist" style={{ fontSize: 9 }}>#{t}</span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" onClick={onFavorite}
            style={{ flex: 1, color: quote.is_favorite ? 'var(--gold)' : undefined,
              borderColor: quote.is_favorite ? 'rgba(201,168,76,0.4)' : undefined }}>
            {quote.is_favorite ? '★ Unfavorite' : '☆ Favorite'}
          </button>
          <button className="btn btn-primary" onClick={onNext} style={{ flex: 1 }}>
            🔀 Next Quote
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Quotes() {
  const [quotes, setQuotes]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [newQuote, setNewQuote]       = useState({ content: '', author: '', source: '', tags: '' });
  const [activeTag, setActiveTag]     = useState(null);
  const [onlyFavs, setOnlyFavs]       = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch]           = useState('');
  const [spotlight, setSpotlight]     = useState(null); // random quote modal

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

  useEffect(() => { fetchQuotes(); }, []);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newQuote.content.trim()) return;
    const tagsArray = newQuote.tags.split(',').map(t => t.trim()).filter(t => t);
    try {
      const res = await API.post('/quotes', { ...newQuote, tags: tagsArray });
      setQuotes([res.data, ...quotes]);
      setNewQuote({ content: '', author: '', source: '', tags: '' });
      setShowAdd(false);
      toast.success('Quote vaulted 🗝️');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save quote'));
    }
  };

  const doDelete = async () => {
    try {
      await API.delete(`/quotes/${deleteTarget}`);
      setQuotes(quotes.filter(q => q.id !== deleteTarget));
      toast.success('Quote removed');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'));
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleFavorite = async (id, isFavorite) => {
    try {
      const res = await API.patch(`/quotes/${id}/favorite?is_favorite=${!isFavorite}`);
      setQuotes(quotes.map(q => q.id === id ? res.data : q));
      if (spotlight?.id === id) setSpotlight(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update'));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingQuote.content.trim()) return;
    const tagsArray = editingQuote.tags.split(',').map(t => t.trim()).filter(t => t);
    try {
      const res = await API.put(`/quotes/${editingQuote.id}`, { ...editingQuote, tags: tagsArray });
      setQuotes(quotes.map(q => q.id === editingQuote.id ? res.data : q));
      setEditingQuote(null);
      toast.success('Quote updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update quote'));
    }
  };

  // ── Shuffle ───────────────────────────────────────────────────────────────
  const openSpotlight = useCallback(() => {
    if (quotes.length === 0) return;
    const pool = quotes.filter(q => q.id !== spotlight?.id);
    setSpotlight(pool.length > 0 ? pickRandom(pool) : pickRandom(quotes));
  }, [quotes, spotlight]);

  // ── Filter ────────────────────────────────────────────────────────────────
  const allTags = [...new Set(quotes.flatMap(q => q.tags || []))].sort();

  const filteredQuotes = quotes.filter(q => {
    const tagMatch  = !activeTag || q.tags?.includes(activeTag);
    const favMatch  = !onlyFavs  || q.is_favorite;
    const q_lower   = search.toLowerCase();
    const searchMatch = !search.trim() ||
      q.content?.toLowerCase().includes(q_lower) ||
      q.author?.toLowerCase().includes(q_lower)  ||
      q.source?.toLowerCase().includes(q_lower)  ||
      q.tags?.some(t => t.toLowerCase().includes(q_lower));
    return tagMatch && favMatch && searchMatch;
  });

  const favCount = quotes.filter(q => q.is_favorite).length;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Motivation Vault 🗝️</h2>
          <p>Words of wisdom to keep you grounded.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {quotes.length > 0 && (
            <button className="btn btn-outline" onClick={openSpotlight}
              style={{ borderRadius: 30 }}>
              🔀 Shuffle
            </button>
          )}
          {!showAdd && (
            <button className="btn btn-gold" onClick={() => setShowAdd(true)}
              style={{ borderRadius: 30, boxShadow: '0 4px 12px rgba(201,168,76,0.2)' }}>
              + Capture Wisdom
            </button>
          )}
        </div>
      </div>

      <div className="page-body">

        {/* ── Toolbar ── */}
        <div className="card" style={{ marginBottom: 32, padding: '14px 20px',
          display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Tag filter — ALL tags */}
          {allTags.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5,
                color: 'rgba(13,13,13,0.35)', fontWeight: 700, flexShrink: 0 }}>Tags:</span>
              <button
                className={`btn btn-sm ${!activeTag ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTag(null)}
                style={{ fontSize: 11, borderRadius: 20 }}>
                All ({quotes.length})
              </button>
              {allTags.map(tag => {
                const count = quotes.filter(q => q.tags?.includes(tag)).length;
                return (
                  <button key={tag}
                    className={`btn btn-sm ${activeTag === tag ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                    style={{ fontSize: 10, borderRadius: 20 }}>
                    #{tag} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Search + favorites row */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <input className="form-input" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by quote, author, or source…"
                style={{ padding: '8px 12px 8px 32px', fontSize: 13, height: 'auto' }} />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                fontSize: 13, opacity: 0.35 }}>🔍</span>
              {search && (
                <button onClick={() => setSearch('')} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.4 }}>✕</button>
              )}
            </div>

            <button
              className={`btn btn-sm ${onlyFavs ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setOnlyFavs(f => !f)}
              style={{ fontSize: 11, borderRadius: 20, whiteSpace: 'nowrap' }}>
              ★ Favorites{onlyFavs ? '' : ` (${favCount})`}
            </button>

            <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.35)', whiteSpace: 'nowrap' }}>
              {filteredQuotes.length} quote{filteredQuotes.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* ── Add form ── */}
        {showAdd && (
          <div className="card" style={{ marginBottom: 32, border: '1px solid var(--gold)', background: 'rgba(201,168,76,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, margin: 0, color: 'var(--gold)' }}>New Vault Entry 🗝️</h3>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <textarea className="form-textarea"
                placeholder="What words of wisdom will guide you?"
                value={newQuote.content}
                onChange={e => setNewQuote({ ...newQuote, content: e.target.value })}
                required
                style={{ minHeight: 110, border: 'none', background: 'transparent', padding: 0,
                  fontSize: 18, fontFamily: 'Fraunces', fontStyle: 'italic', color: 'var(--ink)' }} />
              <div style={{ paddingTop: 16, borderTop: '1px solid rgba(13,13,13,0.05)',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 10 }}>Author</label>
                  <input type="text" className="form-input" placeholder="e.g. Marcus Aurelius"
                    value={newQuote.author} onChange={e => setNewQuote({ ...newQuote, author: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 10 }}>Source</label>
                  <input type="text" className="form-input" placeholder="e.g. Meditations"
                    value={newQuote.source} onChange={e => setNewQuote({ ...newQuote, source: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 10 }}>Tags (comma separated)</label>
                  <input type="text" className="form-input" placeholder="patience, growth…"
                    value={newQuote.tags} onChange={e => setNewQuote({ ...newQuote, tags: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-gold">Save to Vault</button>
              </div>
            </form>
          </div>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="auto-grid">
            {[0, 1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            {filteredQuotes.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 20, alignItems: 'start',
              }}>
                {filteredQuotes.map(q => (
                  <QuoteCard key={q.id}
                    quote={q}
                    search={search}
                    onFavorite={() => toggleFavorite(q.id, q.is_favorite)}
                    onEdit={() => setEditingQuote({ ...q, tags: q.tags?.join(', ') || '' })}
                    onDelete={() => setDeleteTarget(q.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🗝️</div>
                <h3>
                  {quotes.length === 0
                    ? 'Your Motivation Vault is Empty'
                    : 'No quotes match your filter'}
                </h3>
                <p>
                  {quotes.length === 0
                    ? 'Capture the words that resonate with your journey and soul.'
                    : search
                      ? `No quotes match "${search}".`
                      : 'Try a different tag or clear the filter.'}
                </p>
                {(search || activeTag || onlyFavs) ? (
                  <button className="btn btn-outline btn-sm"
                    onClick={() => { setSearch(''); setActiveTag(null); setOnlyFavs(false); }}>
                    Clear filters
                  </button>
                ) : (
                  <button className="btn btn-gold" onClick={() => setShowAdd(true)}
                    style={{ borderRadius: 30 }}>
                    Add Your First Quote
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Spotlight modal ── */}
      {spotlight && (
        <SpotlightModal
          quote={spotlight}
          onClose={() => setSpotlight(null)}
          onNext={openSpotlight}
          onFavorite={() => toggleFavorite(spotlight.id, spotlight.is_favorite)}
        />
      )}

      {/* ── Edit modal ── */}
      {editingQuote && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingQuote(null)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>Refine Wisdom 🗝️</h3>
              <button className="modal-close" onClick={() => setEditingQuote(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">The Words</label>
                <textarea className="form-textarea"
                  value={editingQuote.content}
                  onChange={e => setEditingQuote({ ...editingQuote, content: e.target.value })}
                  required
                  style={{ minHeight: 120, fontFamily: 'Fraunces', fontStyle: 'italic', fontSize: 16 }} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Author</label>
                  <input type="text" className="form-input" value={editingQuote.author}
                    onChange={e => setEditingQuote({ ...editingQuote, author: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Source</label>
                  <input type="text" className="form-input" value={editingQuote.source}
                    onChange={e => setEditingQuote({ ...editingQuote, source: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma separated)</label>
                <input type="text" className="form-input" value={editingQuote.tags}
                  onChange={e => setEditingQuote({ ...editingQuote, tags: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingQuote(null)}>Cancel</button>
                <button type="submit" className="btn btn-gold">Update Vault</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm delete ── */}
      {deleteTarget && (
        <ConfirmModal onConfirm={doDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}

// ── QuoteCard ─────────────────────────────────────────────────────────────────
function QuoteCard({ quote: q, search, onFavorite, onEdit, onDelete }) {
  const PREVIEW_LENGTH = 200;
  const isLong = q.content?.length > PREVIEW_LENGTH;
  const [expanded, setExpanded] = useState(false);

  const displayContent = (expanded || !isLong) ? q.content : q.content.slice(0, PREVIEW_LENGTH) + '…';

  const renderContent = () => {
    if (search?.trim()) return highlightText(displayContent, search);
    return <MarkdownRenderer content={displayContent} />;
  };

  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', gap: 16,
      transition: 'box-shadow 0.2s, transform 0.15s',
      ...(q.is_favorite && { borderTop: '2px solid rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.01)' }),
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(13,13,13,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
    >
      {/* Top row: quote mark + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ color: 'var(--gold)', fontSize: 36, fontFamily: 'Fraunces',
          lineHeight: 0.5, marginTop: 10, opacity: 0.7 }}>"</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={onFavorite}
            style={{ fontSize: 17, color: q.is_favorite ? 'var(--gold)' : 'rgba(13,13,13,0.12)',
              transition: 'color 0.2s' }}>
            {q.is_favorite ? '★' : '☆'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}
            style={{ padding: 4, opacity: 0.2, fontSize: 13 }}>✎</button>
          <button className="btn btn-ghost btn-sm" onClick={onDelete}
            style={{ padding: 4, opacity: 0.2, fontSize: 13, color: 'var(--rust)' }}>✕</button>
        </div>
      </div>

      {/* Quote content */}
      <div style={{
        fontFamily: 'Fraunces', fontSize: 17, color: 'var(--ink)',
        fontStyle: 'italic', lineHeight: 1.7, flex: 1,
      }}>
        {renderContent()}
        {isLong && (
          <button className="btn btn-ghost btn-sm"
            onClick={() => setExpanded(s => !s)}
            style={{ display: 'block', marginTop: 6, fontSize: 11,
              color: 'var(--sage)', fontStyle: 'normal', padding: 0 }}>
            {expanded ? 'Show less ↑' : 'Read more →'}
          </button>
        )}
      </div>

      {/* Attribution + tags */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.4 }}>
          — {q.author
              ? (search?.trim() ? highlightText(q.author, search) : q.author)
              : 'Unknown'}
          {q.source && (
            <span> · {search?.trim() ? highlightText(q.source, search) : q.source}</span>
          )}
        </div>
        {q.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {q.tags.map(t => (
              <span key={t} className="tag tag-mist" style={{ fontSize: 9 }}>#{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

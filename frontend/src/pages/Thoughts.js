import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import { formatDistanceToNow, parseISO } from 'date-fns';

// ── Constants ───────────────────────────────────────────────────────────────
const MAX_CHARS = 1000;
const PREVIEW_CHARS = 220; // characters shown before "Read more"

const SENTIMENT_STYLE = {
  Positive: { border: 'var(--sage)',               tag: 'tag-green', dot: 'var(--sage)' },
  Neutral:  { border: 'rgba(13,13,13,0.15)',        tag: 'tag-mist',  dot: 'rgba(13,13,13,0.3)' },
  Negative: { border: 'var(--rust)',                tag: 'tag-rust',  dot: 'var(--rust)' },
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function wordCount(str) {
  return str.trim() ? str.trim().split(/\s+/).length : 0;
}

function highlightText(text, query) {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ background: 'rgba(201,168,76,0.35)', borderRadius: 2, padding: '0 1px' }}>{part}</mark>
      : part
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="skeleton" style={{ height: 10, width: 80, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 10, width: 40, borderRadius: 6 }} />
      </div>
      <div className="skeleton" style={{ height: 14, width: '90%', borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 14, width: '50%', borderRadius: 6 }} />
    </div>
  );
}

// ── Full-view modal ───────────────────────────────────────────────────────────
function ThoughtModal({ thought, onClose, onPin, onDelete, onEdit }) {
  const s = SENTIMENT_STYLE[thought.sentiment] || SENTIMENT_STYLE.Neutral;
  const isPinned = thought.is_bookmarked;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          borderBottom: `3px solid ${s.border}`,
          padding: '18px 24px 14px',
          background: thought.sentiment === 'Positive'
            ? 'rgba(107,140,107,0.05)'
            : thought.sentiment === 'Negative'
            ? 'rgba(196,98,58,0.04)'
            : 'var(--mist)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`tag ${s.tag}`} style={{ fontSize: 9, letterSpacing: 1 }}>
                {thought.sentiment}
              </span>
              {isPinned && (
                <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>📌 Pinned</span>
              )}
              <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.35)' }}>
                {thought.created_at
                  ? formatDistanceToNow(parseISO(thought.created_at), { addSuffix: true })
                  : 'Recently'}
              </span>
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <div className="markdown-body" style={{
            fontSize: 16, lineHeight: 1.8, color: 'var(--ink)',
            fontFamily: 'Fraunces', fontStyle: 'italic',
          }}>
            <MarkdownRenderer content={thought.content} />
          </div>
          {thought.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
              {thought.tags.map(t => (
                <span key={t} className="tag tag-mist" style={{ fontSize: 10 }}>#{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', gap: 10, padding: '0 24px 20px',
          borderTop: '1px solid rgba(13,13,13,0.06)', paddingTop: 16,
        }}>
          <button className="btn btn-outline" onClick={onEdit} style={{ flex: 1 }}>✎ Edit</button>
          <button className="btn btn-outline" onClick={onPin}
            style={{ flex: 1, color: isPinned ? 'var(--gold)' : 'rgba(13,13,13,0.5)',
              borderColor: isPinned ? 'rgba(201,168,76,0.4)' : undefined }}>
            {isPinned ? '📌 Unpin' : '📌 Pin'}
          </button>
          <button className="btn" onClick={() => { onDelete(); onClose(); }}
            style={{ flex: 1, background: 'rgba(196,98,58,0.07)', color: 'var(--rust)',
              border: '1px solid rgba(196,98,58,0.18)' }}>
            ✕ Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Thoughts() {
  const [thoughts, setThoughts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [newThought, setNewThought]     = useState('');
  const [newSentiment, setNewSentiment] = useState('Neutral');
  const [editingThought, setEditingThought] = useState(null);
  const [editContent, setEditContent]   = useState('');
  const [editSentiment, setEditSentiment] = useState('Neutral');
  const [filter, setFilter]             = useState('All');
  const [search, setSearch]             = useState('');
  const [viewingThought, setViewingThought] = useState(null);
  const [showOnlyPinned, setShowOnlyPinned] = useState(false);
  const textareaRef = useRef(null);

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

  useEffect(() => { fetchThoughts(); }, []);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newThought.trim()) return;
    if (newThought.length > MAX_CHARS) return toast.error(`Thoughts are capped at ${MAX_CHARS} characters.`);
    try {
      const res = await API.post('/thoughts', { content: newThought, sentiment: newSentiment });
      setThoughts([res.data, ...thoughts]);
      setNewThought('');
      setNewSentiment('Neutral');
      toast.success('Thought planted 🌱');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save thought'));
    }
  };

  const deleteThought = async (id) => {
    try {
      await API.delete(`/thoughts/${id}`);
      setThoughts(thoughts.filter(t => t.id !== id));
      toast.success('Thought removed');
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

  const togglePin = async (id) => {
    try {
      const res = await API.patch(`/thoughts/${id}/pin`);
      setThoughts(thoughts.map(t => t.id === id ? res.data : t));
      // Also update viewingThought if open
      if (viewingThought?.id === id) setViewingThought(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to pin thought'));
    }
  };

  // ── Filter + search ───────────────────────────────────────────────────────
  const filtered = thoughts.filter(t => {
    const sentimentMatch = filter === 'All' || t.sentiment === filter;
    const pinnedMatch    = !showOnlyPinned || t.is_bookmarked;
    const searchMatch    = !search.trim() ||
      t.content.toLowerCase().includes(search.toLowerCase());
    return sentimentMatch && pinnedMatch && searchMatch;
  });

  const pinned   = filtered.filter(t => t.is_bookmarked);
  const unpinned = filtered.filter(t => !t.is_bookmarked);

  const charsLeft = MAX_CHARS - newThought.length;
  const words     = wordCount(newThought);

  return (
    <div>
      <div className="page-header">
        <h2>Mind Garden 🪴</h2>
        <p>A stream of consciousness for your passing thoughts.</p>
      </div>

      <div className="page-body">

        {/* ── Capture card ── */}
        <div className="card" style={{
          marginBottom: 32, padding: '24px 28px',
          background: 'white', border: '1px solid rgba(13,13,13,0.06)',
          boxShadow: '0 8px 32px rgba(13,13,13,0.03)',
        }}>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <textarea
              ref={textareaRef}
              className="form-textarea"
              placeholder="Capture a passing thought… the garden waits."
              value={newThought}
              onChange={e => setNewThought(e.target.value)}
              maxLength={MAX_CHARS}
              style={{
                minHeight: 100, border: 'none', background: 'transparent', padding: 0,
                fontSize: 18, fontFamily: 'Fraunces', fontStyle: 'italic', color: 'var(--ink)',
                resize: 'vertical',
              }}
              required
            />

            {/* Live char + word counter */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
              <span style={{
                fontSize: 11, color: charsLeft < 100 ? (charsLeft < 20 ? 'var(--rust)' : 'var(--gold)') : 'rgba(13,13,13,0.3)',
                fontWeight: charsLeft < 100 ? 600 : 400,
              }}>
                {newThought.length > 0 && `${words} word${words !== 1 ? 's' : ''} · `}
                {charsLeft} char{charsLeft !== 1 ? 's' : ''} left
              </span>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingTop: 14, borderTop: '1px solid rgba(13,13,13,0.05)',
            }}>
              {/* Sentiment selector */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Energy:
                </div>
                <div style={{ display: 'flex', background: 'var(--mist)', padding: 2, borderRadius: 8 }}>
                  {['Positive', 'Neutral', 'Negative'].map(s => (
                    <button key={s} type="button"
                      className={`btn btn-sm ${newSentiment === s ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setNewSentiment(s)}
                      style={{ fontSize: 10, padding: '4px 12px', borderRadius: 6 }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn btn-primary"
                style={{ borderRadius: 30, padding: '10px 28px', boxShadow: '0 4px 12px rgba(13,13,13,0.1)' }}
                disabled={!newThought.trim() || newThought.length > MAX_CHARS}>
                Plant Thought ✦
              </button>
            </div>
          </form>
        </div>

        {/* ── Toolbar ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Sentiment filter */}
            <div style={{ display: 'flex', background: 'var(--mist)', padding: 3, borderRadius: 10 }}>
              {['All', 'Positive', 'Neutral', 'Negative'].map(s => (
                <button key={s}
                  className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setFilter(s)}
                  style={{ borderRadius: 8, padding: '6px 14px', fontSize: 11,
                    ...(filter !== s && { opacity: 0.6 }) }}>
                  {s}
                </button>
              ))}
            </div>

            {/* Pinned toggle */}
            <button
              className={`btn btn-sm ${showOnlyPinned ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setShowOnlyPinned(p => !p)}
              style={{ fontSize: 11, borderRadius: 8, padding: '6px 14px' }}>
              📌 Pinned{showOnlyPinned ? '' : ` (${thoughts.filter(t => t.is_bookmarked).length})`}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <input className="form-input" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search thoughts…"
                style={{ padding: '7px 12px 7px 30px', fontSize: 12, height: 'auto', minWidth: 190 }} />
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
                fontSize: 12, opacity: 0.35 }}>🔍</span>
              {search && (
                <button onClick={() => setSearch('')} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.4,
                }}>✕</button>
              )}
            </div>
            <span style={{ fontSize: 12, opacity: 0.4, whiteSpace: 'nowrap' }}>
              {filtered.length} thought{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* ── Thought grid ── */}
        {loading ? (
          <div className="auto-grid">
            {[0, 1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            {/* Pinned section */}
            {pinned.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2,
                  color: 'var(--gold)', fontWeight: 700, marginBottom: 14,
                  display: 'flex', alignItems: 'center', gap: 8 }}>
                  📌 Pinned Thoughts
                  <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.2)' }} />
                </div>
                <div className="auto-grid">
                  {pinned.map(t => (
                    <ThoughtCard key={t.id}
                      thought={t}
                      search={search}
                      onView={() => setViewingThought(t)}
                      onPin={() => togglePin(t.id)}
                      onDelete={() => deleteThought(t.id)}
                      onEdit={() => { setEditingThought(t); setEditContent(t.content); setEditSentiment(t.sentiment || 'Neutral'); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All / unpinned */}
            {unpinned.length > 0 && (
              <>
                {pinned.length > 0 && (
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2,
                    color: 'rgba(13,13,13,0.35)', fontWeight: 700, marginBottom: 14,
                    display: 'flex', alignItems: 'center', gap: 8 }}>
                    All Thoughts
                    <div style={{ flex: 1, height: 1, background: 'rgba(13,13,13,0.06)' }} />
                  </div>
                )}
                <div className="auto-grid">
                  {unpinned.map(t => (
                    <ThoughtCard key={t.id}
                      thought={t}
                      search={search}
                      onView={() => setViewingThought(t)}
                      onPin={() => togglePin(t.id)}
                      onDelete={() => deleteThought(t.id)}
                      onEdit={() => { setEditingThought(t); setEditContent(t.content); setEditSentiment(t.sentiment || 'Neutral'); }}
                    />
                  ))}
                </div>
              </>
            )}

            {filtered.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🪴</div>
                <h3>No thoughts found</h3>
                <p>
                  {search
                    ? `No thoughts match "${search}".`
                    : showOnlyPinned
                    ? 'You have no pinned thoughts yet.'
                    : filter === 'All'
                    ? 'Your mind garden is empty. Plant your first thought.'
                    : `No ${filter.toLowerCase()} thoughts in your garden.`}
                </p>
                {search && (
                  <button className="btn btn-outline btn-sm" onClick={() => setSearch('')}>
                    Clear search
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Preview modal ── */}
      {viewingThought && (
        <ThoughtModal
          thought={viewingThought}
          onClose={() => setViewingThought(null)}
          onPin={() => togglePin(viewingThought.id)}
          onDelete={() => { deleteThought(viewingThought.id); setViewingThought(null); }}
          onEdit={() => {
            setViewingThought(null);
            setEditingThought(viewingThought);
            setEditContent(viewingThought.content);
            setEditSentiment(viewingThought.sentiment || 'Neutral');
          }}
        />
      )}

      {/* ── Edit modal ── */}
      {editingThought && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingThought(null)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>Tend to Thought 🌿</h3>
              <button className="modal-close" onClick={() => setEditingThought(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label className="form-label">Thought</label>
                <textarea className="form-textarea" value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  maxLength={MAX_CHARS}
                  style={{ minHeight: 140, fontFamily: 'Fraunces', fontStyle: 'italic', fontSize: 16 }}
                  required />
                <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(13,13,13,0.35)', marginTop: 4 }}>
                  {MAX_CHARS - editContent.length} chars left · {wordCount(editContent)} words
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Energy</label>
                <div style={{ display: 'flex', background: 'var(--mist)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
                  {['Positive', 'Neutral', 'Negative'].map(s => (
                    <button key={s} type="button"
                      className={`btn btn-sm ${editSentiment === s ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setEditSentiment(s)}
                      style={{ fontSize: 11, padding: '6px 20px', borderRadius: 8 }}>
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

// ── ThoughtCard ───────────────────────────────────────────────────────────────
function ThoughtCard({ thought, search, onView, onPin, onDelete, onEdit }) {
  const s = SENTIMENT_STYLE[thought.sentiment] || SENTIMENT_STYLE.Neutral;
  const isPinned = thought.is_bookmarked;
  const isLong   = thought.content.length > PREVIEW_CHARS;
  const preview  = isLong ? thought.content.slice(0, PREVIEW_CHARS) + '…' : thought.content;

  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', gap: 14,
      borderLeft: `3px solid ${s.border}`,
      padding: '20px 22px',
      cursor: 'pointer',
      transition: 'box-shadow 0.2s, transform 0.15s',
      ...(isPinned && { background: 'rgba(201,168,76,0.02)', borderTop: '1px solid rgba(201,168,76,0.1)' }),
    }}
      onClick={onView}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(13,13,13,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isPinned && <span style={{ fontSize: 12 }}>📌</span>}
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.4 }}>
            {thought.created_at ? formatDistanceToNow(parseISO(thought.created_at), { addSuffix: true }) : 'Recently'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className={`tag ${s.tag}`} style={{ fontSize: 8 }}>{thought.sentiment}</span>
          {/* Action buttons — stop propagation so they don't open the modal */}
          <button className="btn btn-ghost btn-sm"
            onClick={e => { e.stopPropagation(); onPin(); }}
            title={isPinned ? 'Unpin' : 'Pin'}
            style={{ padding: '2px 5px', fontSize: 13, opacity: isPinned ? 1 : 0.25,
              color: isPinned ? 'var(--gold)' : undefined }}>
            📌
          </button>
          <button className="btn btn-ghost btn-sm"
            onClick={e => { e.stopPropagation(); onEdit(); }}
            style={{ padding: '2px 5px', opacity: 0.25, fontSize: 13 }}>✎</button>
          <button className="btn btn-ghost btn-sm"
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ padding: '2px 5px', opacity: 0.25, fontSize: 13, color: 'var(--rust)' }}>✕</button>
        </div>
      </div>

      {/* Content preview */}
      <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink)',
        fontFamily: 'Fraunces', fontStyle: 'italic' }}>
        {search.trim()
          ? highlightText(preview, search)
          : preview}
        {isLong && (
          <span style={{ fontSize: 12, color: 'var(--sage)', fontStyle: 'normal',
            fontFamily: 'inherit', marginLeft: 4 }}>
            · Read more ↗
          </span>
        )}
      </div>

      {/* Tags */}
      {thought.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {thought.tags.map(t => (
            <span key={t} className="tag tag-mist" style={{ fontSize: 9 }}>#{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

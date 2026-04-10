import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function BookDetail() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, wisdom, bookmarks
  const [editMode, setEditMode] = useState(false);
  const [confirm, setConfirm] = useState(null);
  
  // Forms
  const [basicForm, setBasicForm] = useState({ 
    title: '', author: '', status: 'reading', rating: 0, 
    cover_emoji: '📖', description: '', location: '', progress_percentage: 0 
  });
  const [showWisdomModal, setShowWisdomModal] = useState(false);
  const [wisdomForm, setWisdomForm] = useState({ chapter: '', content: '', thoughts: '' });
  const [editingWisdomIdx, setEditingWisdomIdx] = useState(null);

  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkForm, setBookmarkForm] = useState({ page: '', note: '' });
  const [editingBookmarkIdx, setEditingBookmarkIdx] = useState(null);

  const [viewingWisdomIdx, setViewingWisdomIdx] = useState(null);
  const [viewingBookmarkIdx, setViewingBookmarkIdx] = useState(null);
  const [viewingSummary, setViewingSummary] = useState(false);

  const loadBook = async () => {
    try {
      const res = await API.get(`/books`);
      const b = res.data.find(x => x.id === bookId);
      if (!b) {
        toast.error("Book not found");
        navigate('/books');
        return;
      }
      setBook(b);
      setBasicForm({
        title: b.title,
        author: b.author,
        status: b.status,
        rating: b.rating || 0,
        cover_emoji: b.cover_emoji || '📖',
        description: b.description || '',
        location: b.location || '',
        progress_percentage: b.progress_percentage || 0
      });
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to load book'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBook();
  }, [bookId]);

  const handleSaveBasic = async () => {
    try {
      const res = await API.put(`/books/${bookId}`, basicForm);
      setBook(res.data);
      setEditMode(false);
      toast.success("Book updated!");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to update book"));
    }
  };

  const handleUpdateWisdom = async (idx, data) => {
    const newWisdom = [...(book.wisdom || [])];
    if (idx !== null) newWisdom[idx] = data;
    else newWisdom.push(data);

    try {
      const res = await API.put(`/books/${bookId}`, { wisdom: newWisdom });
      setBook(res.data);
      setShowWisdomModal(false);
      setEditingWisdomIdx(null);
      setWisdomForm({ chapter: '', content: '', thoughts: '' });
      toast.success(idx !== null ? "Wisdom updated" : "Wisdom added");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to update wisdom"));
    }
  };

  const deleteWisdom = (idx) => {
    setConfirm({
      title: 'Remove Wisdom Entry?',
      message: 'Are you sure you want to delete this specific lesson and its internal reflection?',
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: async () => {
        const newWisdom = book.wisdom.filter((_, i) => i !== idx);
        try {
          const res = await API.put(`/books/${bookId}`, { wisdom: newWisdom });
          setBook(res.data);
          toast.success("Wisdom removed");
        } catch (e) {
          toast.error(getErrorMessage(e, "Failed to remove wisdom"));
        }
      }
    });
  };

  const handleUpdateBookmark = async (idx, data) => {
    const newBookmarks = [...(book.bookmarks || [])];
    if (idx !== null) newBookmarks[idx] = data;
    else newBookmarks.push(data);

    try {
      const res = await API.put(`/books/${bookId}`, { bookmarks: newBookmarks });
      setBook(res.data);
      setShowBookmarkModal(false);
      setEditingBookmarkIdx(null);
      setBookmarkForm({ page: '', note: '' });
      toast.success(idx !== null ? "Bookmark updated" : "Bookmark added");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to update bookmark"));
    }
  };

  const deleteBookmark = (idx) => {
    setConfirm({
      title: 'Remove Bookmark?',
      message: 'Are you sure you want to delete this bookmark?',
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: async () => {
        const newBookmarks = book.bookmarks.filter((_, i) => i !== idx);
        try {
          const res = await API.put(`/books/${bookId}`, { bookmarks: newBookmarks });
          setBook(res.data);
          toast.success("Bookmark removed");
        } catch (e) {
          toast.error(getErrorMessage(e, "Failed to remove bookmark"));
        }
      }
    });
  };

  if (loading) return <div className="page-body">Loading...</div>;
  if (!book) return null;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 20, flex: 1, minWidth: 300 }}>
          <div style={{ fontSize: 48, background: 'var(--cloud)', width: 80, height: 80, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {book.cover_emoji}
          </div>
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 4 }}>{book.title}</h2>
            <p style={{ color: 'rgba(13,13,13,0.5)', margin: 0, fontSize: 16 }}>by {book.author}</p>
            {!editMode && (
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-sm btn-primary" onClick={() => { setWisdomForm({ chapter: '', content: '', thoughts: '' }); setEditingWisdomIdx(null); setShowWisdomModal(true); }}>+ Add Lesson</button>
                <button className="btn btn-sm btn-outline" onClick={() => { setBookmarkForm({ page: '', note: '' }); setEditingBookmarkIdx(null); setShowBookmarkModal(true); }}>+ Add Bookmark</button>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => navigate('/books')}>← Library</button>
          {!editMode && <button className="btn btn-primary" onClick={() => setEditMode(true)}>Edit Details</button>}
        </div>
      </div>

      <div className="page-body">
        {editMode ? (
          <div className="card" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ opacity: 0.5 }}>✎</span> Edit Details
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" value={basicForm.title} onChange={e => setBasicForm({...basicForm, title: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Author</label>
                  <input className="form-input" value={basicForm.author} onChange={e => setBasicForm({...basicForm, author: e.target.value})} />
                </div>
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={basicForm.status} onChange={e => setBasicForm({...basicForm, status: e.target.value})}>
                    <option value="reading">Reading</option>
                    <option value="finished">Finished</option>
                    <option value="wish-list">Wishlist</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Rating (1-10)</label>
                  <input type="number" className="form-input" min={0} max={10} value={basicForm.rating} onChange={e => setBasicForm({...basicForm, rating: +e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Progress ({basicForm.progress_percentage}%)</label>
                  <input type="range" className="rating-slider" min={0} max={100} value={basicForm.progress_percentage} 
                    onChange={e => setBasicForm({...basicForm, progress_percentage: +e.target.value})}
                    style={{ '--val': `${basicForm.progress_percentage}%`, width: '100%' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Location / Link</label>
                <input className="form-input" placeholder="Physical shelf or URL..." value={basicForm.location} onChange={e => setBasicForm({...basicForm, location: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={basicForm.description} onChange={e => setBasicForm({...basicForm, description: e.target.value})} placeholder="What is this book about?" style={{ minHeight: 120 }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-outline" onClick={() => setEditMode(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveBasic} style={{ flex: 1 }}>Save Changes</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 32 }}>
            <div 
              style={{ position: 'relative', maxHeight: book.description ? 150 : 'auto', overflow: 'hidden', cursor: book.description ? 'pointer' : 'default', transition: 'opacity 0.2s' }} 
              onClick={() => book.description && setViewingSummary(true)}
              onMouseOver={e => { if (book.description) e.currentTarget.style.opacity = 0.8 }} 
              onMouseOut={e => { if (book.description) e.currentTarget.style.opacity = 1 }}
            >
              <div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink)' }}>
                {book.description ? (
                  <MarkdownRenderer content={book.description} />
                ) : (
                  <p style={{ fontStyle: 'italic', opacity: 0.4 }}>No description provided. Refine your understanding by adding a summary.</p>
                )}
              </div>
              {book.description && (
                <>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(transparent, var(--paper, #fff))', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', fontSize: 13, color: 'var(--sage)', fontWeight: 600, paddingBottom: 4, pointerEvents: 'none' }}>
                    Click to read full summary
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(13,13,13,0.05)', display: 'flex', flexWrap: 'wrap', gap: 32 }}>
               <div>
                 <label className="form-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Current Status</label>
                 <div className={`tag ${book.status === 'reading' ? 'tag-green' : book.status === 'finished' ? 'tag-gold' : 'tag-mist'}`} style={{ fontSize: 12, padding: '6px 12px' }}>
                   {book.status}
                 </div>
               </div>
               {book.progress_percentage > 0 && (
                 <div>
                   <label className="form-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Progress</label>
                   <div style={{ fontSize: 18, fontFamily: 'Fraunces', color: 'var(--sage)' }}>{book.progress_percentage}%</div>
                 </div>
               )}
               {book.rating > 0 && (
                 <div>
                   <label className="form-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Rating</label>
                   <div style={{ fontSize: 18, fontFamily: 'Fraunces', color: 'var(--gold)' }}>★ {book.rating}/10</div>
                 </div>
               )}
               {book.location && (
                 <div>
                   <label className="form-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Location / Archive</label>
                   <div style={{ fontSize: 14, color: 'var(--ink)', display: 'flex', alignItems: 'center', height: 26 }}>
                     {book.location.startsWith('http') ? (
                       <a href={book.location} target="_blank" rel="noreferrer" style={{ color: 'var(--rust)', textDecoration: 'none', fontWeight: 600 }}>Digital Resource ↗</a>
                     ) : (
                       <span>{book.location}</span>
                     )}
                   </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {!editMode && (
          <div className="tabs-container" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid rgba(13,13,13,0.1)' }}>
              <button 
                className={`tab-button ${activeTab === 'lessons' || activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('lessons')}
                style={{
                  background: 'none', border: 'none', padding: '12px 0', fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
                  color: activeTab === 'lessons' || activeTab === 'overview' ? 'var(--ink)' : 'rgba(13,13,13,0.4)',
                  borderBottom: activeTab === 'lessons' || activeTab === 'overview' ? '2px solid var(--ink)' : '2px solid transparent',
                  fontWeight: activeTab === 'lessons' || activeTab === 'overview' ? 600 : 400,
                  transition: 'all 0.2s ease'
                }}
              >
                Lessons & Learnings ({(book.wisdom || []).length})
              </button>
              <button 
                className={`tab-button ${activeTab === 'bookmarks' ? 'active' : ''}`}
                onClick={() => setActiveTab('bookmarks')}
                style={{
                  background: 'none', border: 'none', padding: '12px 0', fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
                  color: activeTab === 'bookmarks' ? 'var(--ink)' : 'rgba(13,13,13,0.4)',
                  borderBottom: activeTab === 'bookmarks' ? '2px solid var(--ink)' : '2px solid transparent',
                  fontWeight: activeTab === 'bookmarks' ? 600 : 400,
                  transition: 'all 0.2s ease'
                }}
              >
                Bookmarks ({(book.bookmarks || []).length})
              </button>
            </div>
          </div>
        )}
        
        {!editMode && (activeTab === 'lessons' || activeTab === 'overview') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {(book.wisdom || []).length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px 0', opacity: 0.4 }}>
                <p>Capture key insights as you read.</p>
              </div>
            ) : (
              (book.wisdom || []).map((w, i) => (
                <div key={i} className="card" onClick={() => setViewingWisdomIdx(i)} style={{ cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--sage)'} onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div className="tag tag-mist" style={{ fontSize: 11, letterSpacing: 1 }}>{w.chapter || `Entry #${i+1}`}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost" style={{ padding: 4 }} onClick={(e) => { e.stopPropagation(); setWisdomForm(w); setEditingWisdomIdx(i); setShowWisdomModal(true); }}>✎</button>
                      <button className="btn btn-ghost" style={{ padding: 4, color: 'var(--rust)' }} onClick={(e) => { e.stopPropagation(); deleteWisdom(i); }}>✕</button>
                    </div>
                  </div>
                  <div style={{ maxHeight: 150, overflow: 'hidden', position: 'relative' }}>
                    <div className="markdown-body" style={{ fontSize: 15, marginBottom: 12 }}>
                      <MarkdownRenderer content={w.content} />
                    </div>
                    {w.thoughts && (
                      <div style={{ padding: '12px 16px', background: 'var(--cloud)', borderRadius: 12, borderLeft: '3px solid var(--sage)' }}>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700, marginBottom: 4 }}>Your Reflection</div>
                        <div className="markdown-body" style={{ fontSize: 13, color: 'rgba(13,13,13,0.7)', fontStyle: 'italic' }}>
                          <MarkdownRenderer content={w.thoughts} />
                        </div>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(transparent, var(--paper, #fff))', pointerEvents: 'none' }} />
                  </div>
                  <div style={{ marginTop: 12, fontSize: 13, color: 'var(--sage)', fontWeight: 600, textAlign: 'center' }}>Click to read more</div>
                </div>
              ))
            )}
          </div>
        )}

        {!editMode && activeTab === 'bookmarks' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {(book.bookmarks || []).length === 0 && (
              <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', opacity: 0.4 }}>
                <p style={{ fontSize: 15, fontStyle: 'italic', margin: 0 }}>No bookmarks yet.</p>
              </div>
            )}
            {(book.bookmarks || []).map((b, i) => (
              <div key={i} className="card" onClick={() => setViewingBookmarkIdx(i)} style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--sage)'} onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, background: 'var(--sage)', color: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14, flexShrink: 0 }}>
                    {b.page}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); setBookmarkForm(b); setEditingBookmarkIdx(i); setShowBookmarkModal(true); }}>✎</button>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: 'var(--rust)' }} onClick={(e) => { e.stopPropagation(); deleteBookmark(i); }}>✕</button>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0, position: 'relative', maxHeight: 150, overflow: 'hidden' }}>
                  <div className="markdown-body" style={{ fontSize: 15, wordBreak: 'break-word', paddingBottom: 20 }}>
                    <MarkdownRenderer content={b.note} />
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: 'linear-gradient(transparent, var(--paper, #fff))', pointerEvents: 'none' }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600, marginTop: 'auto', paddingTop: 8 }}>Read more →</div>
              </div>
            ))}
          </div>
        )}

      </div>


      {/* Wisdom Modal */}
      {showWisdomModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowWisdomModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>{editingWisdomIdx !== null ? 'Edit Wisdom' : 'Add wisdom'} Entry</h3>
              <button className="modal-close" onClick={() => setShowWisdomModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Chapter / Section</label>
              <input className="form-input" value={wisdomForm.chapter} onChange={e => setWisdomForm({...wisdomForm, chapter: e.target.value})} placeholder="e.g. Chapter 1: The Beginning" />
            </div>
            <div className="form-group">
              <label className="form-label">What did you learn?</label>
              <textarea className="form-textarea" value={wisdomForm.content} onChange={e => setWisdomForm({...wisdomForm, content: e.target.value})} placeholder="Core insights from this section..." />
            </div>
            <div className="form-group">
              <label className="form-label">Personal Thoughts (Optional)</label>
              <textarea className="form-textarea" value={wisdomForm.thoughts} onChange={e => setWisdomForm({...wisdomForm, thoughts: e.target.value})} placeholder="How does this apply to you?" style={{ minHeight: 80 }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setShowWisdomModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleUpdateWisdom(editingWisdomIdx, wisdomForm)}>Save Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* Bookmark Modal */}
      {showBookmarkModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowBookmarkModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingBookmarkIdx !== null ? 'Edit Bookmark' : 'Add Bookmark'}</h3>
              <button className="modal-close" onClick={() => setShowBookmarkModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Page Number / Reference</label>
              <input className="form-input" value={bookmarkForm.page} onChange={e => setBookmarkForm({...bookmarkForm, page: e.target.value})} placeholder="e.g. 142" />
            </div>
            <div className="form-group">
              <label className="form-label">Quick Note</label>
              <textarea className="form-textarea" value={bookmarkForm.note} onChange={e => setBookmarkForm({...bookmarkForm, note: e.target.value})} placeholder="What's on this page?" style={{ minHeight: 80 }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setShowBookmarkModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleUpdateBookmark(editingBookmarkIdx, bookmarkForm)}>Save Bookmark</button>
            </div>
          </div>
        </div>
      )}

      {/* View Wisdom Modal */}
      {viewingWisdomIdx !== null && book.wisdom[viewingWisdomIdx] && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewingWisdomIdx(null)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, margin: 0 }}>{book.wisdom[viewingWisdomIdx].chapter || 'Lesson & Learning'}</h3>
              <button className="modal-close" onClick={() => setViewingWisdomIdx(null)}>✕</button>
            </div>
            <div className="page-body">
              <div className="markdown-body" style={{ fontSize: 16 }}>
                <MarkdownRenderer content={book.wisdom[viewingWisdomIdx].content} />
              </div>
              {book.wisdom[viewingWisdomIdx].thoughts && (
                <div style={{ marginTop: 32, padding: '20px 24px', background: 'var(--cloud)', borderRadius: 12, borderLeft: '4px solid var(--sage)' }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700, marginBottom: 12 }}>Personal Reflection</div>
                  <div className="markdown-body" style={{ fontSize: 15, color: 'rgba(13,13,13,0.8)', fontStyle: 'italic' }}>
                    <MarkdownRenderer content={book.wisdom[viewingWisdomIdx].thoughts} />
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-outline" onClick={() => setViewingWisdomIdx(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* View Bookmark Modal */}
      {viewingBookmarkIdx !== null && book.bookmarks[viewingBookmarkIdx] && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewingBookmarkIdx(null)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header" style={{ alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, background: 'var(--sage)', color: 'white', padding: '4px 12px', borderRadius: 8 }}>Page {book.bookmarks[viewingBookmarkIdx].page}</span>
                <span style={{ fontSize: 18, color: 'rgba(13,13,13,0.4)' }}>Bookmark Note</span>
              </h3>
              <button className="modal-close" onClick={() => setViewingBookmarkIdx(null)}>✕</button>
            </div>
            <div className="page-body" style={{ minHeight: 100 }}>
              <div className="markdown-body" style={{ fontSize: 16 }}>
                <MarkdownRenderer content={book.bookmarks[viewingBookmarkIdx].note} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-outline" onClick={() => setViewingBookmarkIdx(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* View Summary Modal */}
      {viewingSummary && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewingSummary(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, margin: 0 }}>Book Summary</h3>
              <button className="modal-close" onClick={() => setViewingSummary(false)}>✕</button>
            </div>
            <div className="page-body">
              <div className="markdown-body" style={{ fontSize: 16 }}>
                <MarkdownRenderer content={book.description} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-outline" onClick={() => setViewingSummary(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

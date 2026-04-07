import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';

export default function BookDetail() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, wisdom, bookmarks
  const [editMode, setEditMode] = useState(false);
  
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

  const deleteWisdom = async (idx) => {
    if (!window.confirm("Remove this entry?")) return;
    const newWisdom = book.wisdom.filter((_, i) => i !== idx);
    try {
      const res = await API.put(`/books/${bookId}`, { wisdom: newWisdom });
      setBook(res.data);
      toast.success("Wisdom removed");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to remove wisdom"));
    }
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

  const deleteBookmark = async (idx) => {
    if (!window.confirm("Remove this bookmark?")) return;
    const newBookmarks = book.bookmarks.filter((_, i) => i !== idx);
    try {
      const res = await API.put(`/books/${bookId}`, { bookmarks: newBookmarks });
      setBook(res.data);
      toast.success("Bookmark removed");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to remove bookmark"));
    }
  };

  if (loading) return <div className="page-body">Loading...</div>;
  if (!book) return null;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ fontSize: 48, background: 'var(--cloud)', width: 80, height: 80, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {book.cover_emoji}
          </div>
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 4 }}>{book.title}</h2>
            <p style={{ color: 'rgba(13,13,13,0.5)', margin: 0 }}>by {book.author}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => navigate('/books')}>← Library</button>
          {!editMode && <button className="btn btn-primary" onClick={() => setEditMode(true)}>Edit Details</button>}
        </div>
      </div>

      <div className="page-body">
        {editMode ? (
          <div className="card" style={{ marginBottom: 32, border: '1px solid var(--sage)' }}>
            <h3 style={{ marginBottom: 20 }}>Edit Book Info</h3>
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
              <label className="form-label">Description (Markdown Supported)</label>
              <textarea className="form-textarea" value={basicForm.description} onChange={e => setBasicForm({...basicForm, description: e.target.value})} placeholder="What is this book about?" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setEditMode(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveBasic} style={{ flex: 1 }}>Save Changes</button>
            </div>
          </div>
        ) : (
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 2fr', alignItems: 'start', marginBottom: 32 }}>
            <div className="card" style={{ position: 'sticky', top: 20 }}>
              <div style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontSize: 10 }}>Current Status</label>
                <div className={`tag ${book.status === 'reading' ? 'tag-green' : book.status === 'finished' ? 'tag-gold' : 'tag-mist'}`} style={{ fontSize: 14, width: '100%', justifyContent: 'center', padding: '10px' }}>
                  {book.status === 'reading' ? '📖 Currently Reading' : book.status === 'finished' ? '🌟 Finished' : '💭 Wishlist'}
                </div>
              </div>
              {book.status !== 'wish-list' && (
                <div style={{ marginBottom: 20 }}>
                  <label className="form-label" style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                    Reading Progress <span>{book.progress_percentage}%</span>
                  </label>
                  <div className="progress-bar" style={{ height: 10 }}>
                    <div className="progress-fill" style={{ width: `${book.progress_percentage}%`, background: 'var(--sage)' }} />
                  </div>
                </div>
              )}
              {book.location && (
                <div style={{ marginBottom: 20 }}>
                  <label className="form-label" style={{ fontSize: 10 }}>Location</label>
                  <div style={{ fontSize: 13, wordBreak: 'break-all' }}>
                    {book.location.startsWith('http') ? <a href={book.location} target="_blank" rel="noreferrer" style={{ color: 'var(--sage)' }}>{book.location}</a> : book.location}
                  </div>
                </div>
              )}
              {book.rating && (
                <div>
                  <label className="form-label" style={{ fontSize: 10 }}>Your Rating</label>
                  <div style={{ fontSize: 24, fontFamily: 'Fraunces', color: 'var(--gold)' }}>{book.rating}/10</div>
                </div>
              )}
            </div>

            <div className="card">
              <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid rgba(13,13,13,0.05)', marginBottom: 24 }}>
                {['overview', 'wisdom', 'bookmarks'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{ 
                    padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: activeTab === t ? 600 : 400, color: activeTab === t ? 'var(--ink)' : 'rgba(13,13,13,0.4)',
                    borderBottom: activeTab === t ? '2px solid var(--sage)' : '2px solid transparent',
                    textTransform: 'capitalize'
                  }}>{t}</button>
                ))}
              </div>

              {activeTab === 'overview' && (
                <div className="markdown-body">
                  {book.description ? <MarkdownRenderer content={book.description} /> : <p style={{ fontStyle: 'italic', opacity: 0.5 }}>No description provided. Click Edit to add one.</p>}
                </div>
              )}

              {activeTab === 'wisdom' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 18 }}>Lessons & Learnings</h3>
                    <button className="btn btn-sm btn-outline" onClick={() => { setWisdomForm({ chapter: '', content: '', thoughts: '' }); setEditingWisdomIdx(null); setShowWisdomModal(true); }}>+ Add Entry</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {(book.wisdom || []).length === 0 && <p style={{ fontStyle: 'italic', opacity: 0.5, textAlign: 'center' }}>Capture what you learn as you read.</p>}
                    {(book.wisdom || []).map((w, i) => (
                      <div key={i} className="card-sm" style={{ background: 'var(--cloud)', borderRadius: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => { setWisdomForm(w); setEditingWisdomIdx(i); setShowWisdomModal(true); }}>✎</button>
                            <button className="btn btn-ghost" style={{ padding: 4, color: 'var(--rust)' }} onClick={() => deleteWisdom(i)}>✕</button>
                          </div>
                        </div>
                        {w.chapter && (
                          <div style={{ padding: 12, background: 'rgba(13,13,13,0.02)', borderRadius: 8, borderLeft: '3px solid rgba(13,13,13,0.05)', marginBottom: 12 }}>
                            <label style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(13,13,13,0.4)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Chapter / Section</label>
                            <div style={{ fontSize: 16, fontFamily: 'Fraunces', color: 'var(--ink)' }}>
                              <MarkdownRenderer content={w.chapter} />
                            </div>
                          </div>
                        )}
                        {w.content && (
                          <div style={{ padding: 12, background: 'rgba(107,140,107,0.02)', borderRadius: 8, borderLeft: '3px solid rgba(13,13,13,0.1)', marginBottom: 12 }}>
                            <label style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(13,13,13,0.4)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Core Insights</label>
                            <div className="markdown-body" style={{ fontSize: 14, color: 'var(--ink)' }}>
                              <MarkdownRenderer content={w.content} />
                            </div>
                          </div>
                        )}
                        {w.thoughts && (
                          <div style={{ padding: 12, background: 'rgba(107,140,107,0.05)', borderRadius: 8, borderLeft: '3px solid var(--sage)' }}>
                            <label style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Your Thoughts</label>
                            <div className="markdown-body" style={{ fontSize: 13, fontStyle: 'italic' }}><MarkdownRenderer content={w.thoughts} /></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'bookmarks' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 18 }}>Bookmarks</h3>
                    <button className="btn btn-sm btn-outline" onClick={() => { setBookmarkForm({ page: '', note: '' }); setEditingBookmarkIdx(null); setShowBookmarkModal(true); }}>+ New Bookmark</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {(book.bookmarks || []).length === 0 && <p style={{ fontStyle: 'italic', opacity: 0.5, textAlign: 'center' }}>Mark key pages and insights.</p>}
                    {(book.bookmarks || []).map((b, i) => (
                      <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 16px', background: 'var(--cloud)', borderRadius: 12, alignItems: 'center' }}>
                         <div style={{ width: 40, height: 40, background: 'var(--gold)', color: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 }}>P.{b.page}</div>
                         <div style={{ flex: 1 }}>
                           <div className="markdown-body" style={{ fontSize: 14 }}>
                             <MarkdownRenderer content={b.note} />
                           </div>
                         </div>
                         <div style={{ display: 'flex', gap: 4 }}>
                           <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => { setBookmarkForm(b); setEditingBookmarkIdx(i); setShowBookmarkModal(true); }}>✎</button>
                           <button className="btn btn-ghost" style={{ padding: 4, color: 'var(--rust)' }} onClick={() => deleteBookmark(i)}>✕</button>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
    </div>
  );
}

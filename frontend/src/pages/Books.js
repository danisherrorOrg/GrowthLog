import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export default function Books() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', author: '', status: 'reading', rating: 0, notes: '', cover_emoji: '📖' });
  const [activeStatus, setActiveStatus] = useState('all');

  const fetchBooks = async () => {
    try {
      const res = await API.get('/books');
      setBooks(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load books'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newBook.title.trim()) return;
    
    try {
      const res = await API.post('/books', newBook);
      setBooks([res.data, ...books]);
      setNewBook({ title: '', author: '', status: 'reading', rating: 0, notes: '', cover_emoji: '📖' });
      setShowAdd(false);
      toast.success('Book added');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save book'));
    }
  };

  const deleteBook = async (id) => {
    if (!window.confirm('Delete this book?')) return;
    try {
      await API.delete(`/books/${id}`);
      setBooks(books.filter(b => b.id !== id));
      toast.success('Book deleted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'));
    }
  };

  const updateBookStatus = async (id, status) => {
    try {
      const res = await API.put(`/books/${id}`, { status });
      setBooks(books.map(b => b.id === id ? res.data : b));
      toast.success('Status updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'));
    }
  };

  if (loading) return <div className="page-body">Loading...</div>;

  const filteredBooks = activeStatus === 'all' 
    ? books 
    : books.filter(b => b.status === activeStatus);

  const StatusIcon = ({ status }) => {
    if (status === 'reading') return <span style={{ color: 'var(--sage)' }}>Currently Reading 📖</span>;
    if (status === 'finished') return <span style={{ color: 'var(--gold)' }}>Finished 🌟</span>;
    return <span style={{ color: 'rgba(13,13,13,0.5)' }}>Wishlist 💭</span>;
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Library & Wisdom 📚</h2>
          <p>Track books and absorb their knowledge.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>+ Add Book</button>
      </div>

      <div className="page-body">
        {/* Unified Toolbar */}
        <div className="card" style={{ marginBottom: 32, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'var(--mist)', padding: 3, borderRadius: 10 }}>
              {['all', 'reading', 'finished', 'wish-list'].map(f => (
                <button 
                  key={f} 
                  className={`btn btn-sm ${activeStatus === f ? 'btn-primary' : 'btn-ghost'}`} 
                  onClick={() => setActiveStatus(f)}
                  style={{ borderRadius: 8, padding: '6px 16px', fontSize: 12 }}
                >
                  {f === 'all' ? 'All Books' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} style={{ borderRadius: 30, padding: '10px 24px', boxShadow: '0 4px 12px rgba(13,13,13,0.1)' }}>
            + Add New Book
          </button>
        </div>

        {showAdd && (
          <div className="card" style={{ marginBottom: 32, border: '2px solid var(--sage)', padding: 24 }}>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Book Title</label>
                  <input type="text" className="form-input" placeholder="e.g. Meditations" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Author</label>
                  <input type="text" className="form-input" placeholder="e.g. Marcus Aurelius" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} required />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Reading Status</label>
                  <select className="form-select" value={newBook.status} onChange={e => setNewBook({...newBook, status: e.target.value})}>
                    <option value="reading">Currently Reading</option>
                    <option value="finished">Finished</option>
                    <option value="wish-list">Wishlist</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cover Emoji</label>
                  <input type="text" className="form-input" placeholder="e.g. 🏛️" value={newBook.cover_emoji} onChange={e => setNewBook({...newBook, cover_emoji: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add to Library</button>
              </div>
            </form>
          </div>
        )}

        {filteredBooks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h3>Your Wisdom Archive is Empty</h3>
            <p>What are you absorbing? Track your library and the lessons from each author.</p>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ borderRadius: 30 }}>+ Create Your First Book</button>
          </div>
        ) : (
          <div className="auto-grid">
            {filteredBooks.map(b => (
              <div key={b.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 32, background: 'var(--mist)', width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {b.cover_emoji || '📖'}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, margin: 0 }}>{b.title}</h3>
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(13,13,13,0.45)' }}>by {b.author}</p>
                    </div>
                  </div>
                  <span className={`tag ${b.status === 'reading' ? 'tag-green' : b.status === 'finished' ? 'tag-gold' : 'tag-mist'}`} style={{ fontSize: 10 }}>
                    {b.status}
                  </span>
                </div>

                {b.status !== 'wish-list' && (
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(13,13,13,0.4)', marginBottom: 6, fontWeight: 500 }}>
                      <span>Progress</span>
                      <span>{b.progress_percentage || 0}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: 4 }}>
                      <div className="progress-fill" style={{ width: `${b.progress_percentage || 0}%`, background: 'var(--sage)' }} />
                    </div>
                  </div>
                )}

                <div className="divider" style={{ margin: '4px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {b.status === 'finished' && b.rating && <span style={{ color: 'var(--gold)' }}>★ {b.rating}/10</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link to={`/books/${b.id}`} className="btn btn-sm btn-outline" style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, textDecoration: 'none' }}>
                      Absorb ◈
                    </Link>
                    <button onClick={(e) => { e.preventDefault(); deleteBook(b.id); }} className="btn btn-sm btn-ghost" style={{ padding: 4, color: 'rgba(13,13,13,0.2)' }}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

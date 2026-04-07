import { useState, useEffect } from 'react';
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
        {showAdd && (
          <div className="card" style={{ marginBottom: 24, border: '2px solid var(--sage)' }}>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="grid-2">
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Book Title" 
                  value={newBook.title}
                  onChange={e => setNewBook({...newBook, title: e.target.value})}
                  required
                />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Author" 
                  value={newBook.author}
                  onChange={e => setNewBook({...newBook, author: e.target.value})}
                  required
                />
              </div>
              <div className="grid-3">
                <select className="form-select" value={newBook.status} onChange={e => setNewBook({...newBook, status: e.target.value})}>
                  <option value="reading">Currently Reading</option>
                  <option value="finished">Finished</option>
                  <option value="wish-list">Wishlist</option>
                </select>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Emoji Cover (e.g. 🌋)" 
                  value={newBook.cover_emoji}
                  onChange={e => setNewBook({...newBook, cover_emoji: e.target.value})}
                />
              </div>
              <div style={{ textAlign: 'right' }}>
                 <button type="submit" className="btn btn-primary">Add Book</button>
              </div>
            </form>
          </div>
        )}

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid rgba(13,13,13,0.1)', marginBottom: 24, paddingBottom: 8 }}>
           {['all', 'reading', 'finished', 'wish-list'].map(status => (
             <button
               key={status}
               className={`btn btn-ghost ${activeStatus === status ? 'active' : ''}`}
               onClick={() => setActiveStatus(status)}
               style={{ 
                 textTransform: 'capitalize', 
                 fontWeight: activeStatus === status ? 600 : 400,
                 color: activeStatus === status ? 'var(--ink)' : 'rgba(13,13,13,0.5)',
                 borderBottom: activeStatus === status ? '2px solid var(--sage)' : 'none',
                 borderRadius: 0,
                 paddingBottom: 8
               }}
             >
               {status === 'all' ? 'All Books' : status} ({books.filter(b => status==='all' ? true : b.status === status).length})
             </button>
           ))}
        </div>

        <div className="grid-3" style={{ gap: 24 }}>
          {filteredBooks.map(b => (
            <div key={b.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div style={{ fontSize: 40 }}>{b.cover_emoji || '📖'}</div>
                 <select 
                   className="form-select" 
                   style={{ width: 'auto', padding: '4px 24px 4px 8px', fontSize: 12, height: 'auto' }}
                   value={b.status}
                   onChange={(e) => updateBookStatus(b.id, e.target.value)}
                 >
                   <option value="reading">Reading</option>
                   <option value="finished">Finished</option>
                   <option value="wish-list">Wishlist</option>
                 </select>
               </div>
               
               <div>
                 <h3 style={{ margin: '0 0 4px 0', fontSize: 18, color: 'var(--ink)' }}>{b.title}</h3>
                 <p style={{ margin: 0, fontSize: 14, color: 'rgba(13,13,13,0.6)' }}>by {b.author}</p>
               </div>

               <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ fontSize: 12, fontWeight: 500 }}>
                   <StatusIcon status={b.status} />
                 </div>
                 <button onClick={() => deleteBook(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rust)', opacity: 0.5 }}>✕</button>
               </div>
            </div>
          ))}
        </div>
        
        {filteredBooks.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h3>Your library is empty</h3>
            <p>Start tracking the books shaping your journey.</p>
          </div>
        )}
      </div>
    </div>
  );
}

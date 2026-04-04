import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

const ICONS = ['🧠', '💼', '❤️', '🤝', '💪', '🎯', '📚', '🌿', '💰', '🎨', '🙏', '⚡'];
const COLORS = ['#6b8c6b', '#c9a84c', '#c4623a', '#5b8ba8', '#8b6bc4', '#c46b8b', '#6bc4b8', '#a8895b'];
const DEFAULTS = [
  { name: 'Personality', icon: '🧠', color: '#6b8c6b', description: 'Who am I becoming as a person?' },
  { name: 'Career', icon: '💼', color: '#c9a84c', description: 'Professional growth and skills' },
  { name: 'Emotional', icon: '❤️', color: '#c4623a', description: 'Emotional health and awareness' },
  { name: 'Relationships', icon: '🤝', color: '#5b8ba8', description: 'Connections that matter to me' },
  { name: 'Physical', icon: '💪', color: '#8b6bc4', description: 'Body, health, and fitness' },
];

export default function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [archived, setArchived] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [viewCat, setViewCat] = useState(null);
  const [catLogs, setCatLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '🧠', color: '#6b8c6b', description: '' });
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }

  const load = async () => {
    const [active, arch] = await Promise.all([
      API.get('/categories'),
      API.get('/categories?include_archived=true'),
    ]);
    setCategories(active.data);
    setArchived(arch.data.filter(c => c.archived));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditCat(null);
    setForm({ name: '', icon: '🧠', color: '#6b8c6b', description: '' });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditCat(cat);
    setForm({ name: cat.name, icon: cat.icon, color: cat.color, description: cat.description || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setLoading(true);
    try {
      if (editCat) {
        await API.put(`/categories/${editCat.id}`, form);
        toast.success(`${form.icon} ${form.name} updated!`);
      } else {
        await API.post('/categories', form);
        toast.success(`${form.icon} ${form.name} created!`);
      }
      setShowModal(false);
      setForm({ name: '', icon: '🧠', color: '#6b8c6b', description: '' });
      setEditCat(null);
      load();
    } catch { toast.error('Failed to save category'); }
    finally { setLoading(false); }
  };

  // Archive (soft delete)
  const handleArchive = async (id, name) => {
    if (!window.confirm(`Archive "${name}"? You can restore it later.`)) return;
    await API.delete(`/categories/${id}`);
    toast.success('Category archived');
    load();
  };

  // Permanent delete with confirmation modal
  const handlePermanentDelete = async () => {
    if (!confirmDelete) return;
    try {
      await API.delete(`/categories/${confirmDelete.id}?permanent=true`);
      toast.success(`"${confirmDelete.name}" permanently deleted with all its data`);
      setConfirmDelete(null);
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const handleRestore = async (id, name) => {
    await API.put(`/categories/${id}/restore`);
    toast.success(`${name} restored!`);
    load();
  };

  const handleViewLogs = async (cat) => {
    setViewCat(cat);
    setLoadingLogs(true);
    try {
      const r = await API.get(`/categories/${cat.id}/logs?days=90`);
      setCatLogs(r.data);
    } catch { toast.error('Failed to load logs'); }
    finally { setLoadingLogs(false); }
  };

  const addDefault = async (def) => {
    try {
      await API.post('/categories', def);
      toast.success(`${def.icon} ${def.name} added!`);
      load();
    } catch { toast.error('Already exists or failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Categories</h2>
        <p>The arenas of your life you want to grow in</p>
      </div>

      <div className="page-body">
        {categories.length === 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 8, fontSize: 18 }}>Start with defaults</h3>
            <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.5)', marginBottom: 20 }}>
              Quick-add the most common life categories, or create your own below.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {DEFAULTS.map((d) => (
                <button key={d.name} className="btn btn-outline" onClick={() => addDefault(d)}>
                  {d.icon} {d.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Fraunces', fontSize: 20 }}>Your Categories ({categories.length})</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {archived.length > 0 && (
              <button className={`btn btn-sm ${showArchived ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setShowArchived(!showArchived)}>
                {showArchived ? 'Hide' : 'Show'} Archived ({archived.length})
              </button>
            )}
            <button className="btn btn-primary" onClick={openCreate}>+ Add Category</button>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">▦</div>
            <h3>No categories yet</h3>
            <p>Create your first category to start tracking growth across different areas of your life.</p>
          </div>
        ) : (
          <div className="grid-3">
            {categories.map((cat) => (
              <div key={cat.id} className="card" style={{ borderTop: `3px solid ${cat.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: 32 }}>{cat.icon}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(cat)} title="Edit" style={{ color: 'rgba(13,13,13,0.4)' }}>✎</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleArchive(cat.id, cat.name)} title="Archive" style={{ color: 'rgba(13,13,13,0.3)' }}>📦</button>
                  </div>
                </div>
                <h3 style={{ fontSize: 18, marginBottom: 4 }}>{cat.name}</h3>
                {cat.description && <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', marginBottom: 12 }}>{cat.description}</p>}
                <button className="btn btn-outline btn-sm" onClick={() => handleViewLogs(cat)} style={{ marginTop: 'auto', width: '100%' }}>
                  View All Logs →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Archived */}
        {showArchived && archived.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, marginBottom: 4, color: 'rgba(13,13,13,0.5)' }}>
              Archived Categories
            </h3>
            <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.4)', marginBottom: 16 }}>
              Archived categories can be restored or permanently deleted along with all their data.
            </p>
            <div className="grid-3">
              {archived.map((cat) => (
                <div key={cat.id} className="card" style={{ borderTop: `3px solid ${cat.color}`, opacity: 0.75 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <span style={{ fontSize: 32 }}>{cat.icon}</span>
                    <div style={{ display: 'flex', gap: 4, flexDirection: 'column', alignItems: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleRestore(cat.id, cat.name)}
                        style={{ fontSize: 11, color: 'var(--sage)', border: '1px solid var(--sage)', borderRadius: 6, padding: '3px 8px' }}>
                        Restore
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete({ id: cat.id, name: cat.name })}
                        style={{ fontSize: 11, color: 'var(--rust)', border: '1px solid var(--rust)', borderRadius: 6, padding: '3px 8px' }}>
                        Delete Forever
                      </button>
                    </div>
                  </div>
                  <h3 style={{ fontSize: 18, marginBottom: 4 }}>{cat.name}</h3>
                  {cat.description && <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.4)' }}>{cat.description}</p>}
                  <span className="tag tag-mist" style={{ fontSize: 11, marginTop: 8, display: 'inline-block' }}>Archived</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editCat ? 'Edit Category' : 'New Category'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Spiritual Growth" />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this area mean to you?" />
            </div>
            <div className="form-group">
              <label className="form-label">Icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ICONS.map((ic) => (
                  <button key={ic} onClick={() => setForm({ ...form, icon: ic })}
                    style={{ width: 40, height: 40, borderRadius: 8, border: `2px solid ${form.icon === ic ? 'var(--sage)' : 'rgba(13,13,13,0.1)'}`, background: form.icon === ic ? 'rgba(107,140,107,0.1)' : 'white', cursor: 'pointer', fontSize: 20 }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: `3px solid ${form.color === c ? 'var(--ink)' : 'transparent'}`, cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Saving...' : editCat ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ color: 'var(--rust)' }}>⚠️ Permanent Deletion</h3>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <div style={{ padding: '16px', background: 'rgba(196,98,58,0.08)', borderRadius: 10, marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: 'var(--rust)', margin: 0, lineHeight: 1.6 }}>
                You are about to permanently delete <strong>"{confirmDelete.name}"</strong> and all its associated data including daily log entries and goals.
                <br /><br />
                <strong>This action cannot be undone.</strong>
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn" onClick={handlePermanentDelete}
                style={{ flex: 1, background: 'var(--rust)', color: 'white', border: 'none' }}>
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Category Logs Modal */}
      {viewCat && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setViewCat(null)}>
          <div className="modal" style={{ maxWidth: 680, maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>{viewCat.icon}</span>
                <div>
                  <h3>{viewCat.name} — All Logs</h3>
                  <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>{catLogs.length} entries in the last 90 days</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setViewCat(null)}>✕</button>
            </div>

            {loadingLogs ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(13,13,13,0.4)' }}>Loading logs...</div>
            ) : catLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ color: 'rgba(13,13,13,0.4)' }}>No logs for this category in the past 90 days.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {catLogs.sort((a, b) => b.date.localeCompare(a.date)).map((log) => (
                  <div key={log.id} style={{ padding: '14px 16px', background: 'var(--mist)', borderRadius: 10, borderLeft: `3px solid ${viewCat.color}` }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)', marginBottom: 8 }}>
                      {format(parseISO(log.date), 'EEEE, MMMM d, yyyy')}
                    </div>
                    {log.entries.map((entry, i) => (
                      <div key={i}>
                        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)', margin: 0 }}>{entry.text}</p>
                        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: 'rgba(13,13,13,0.45)' }}>
                          <span>Mood {entry.mood}/10</span>
                          <span>Energy {entry.energy}/10</span>
                          {entry.emotions?.length > 0 && <span>{entry.emotions.join(', ')}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

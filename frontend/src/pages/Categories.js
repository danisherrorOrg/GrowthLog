import { useEffect, useState } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';

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
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '🧠', color: '#6b8c6b', description: '' });
  const [loading, setLoading] = useState(false);

  const load = () => API.get('/categories').then((r) => setCategories(r.data));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setLoading(true);
    try {
      await API.post('/categories', form);
      toast.success(`${form.icon} ${form.name} created!`);
      setShowModal(false);
      setForm({ name: '', icon: '🧠', color: '#6b8c6b', description: '' });
      load();
    } catch { toast.error('Failed to create category'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Archive "${name}"? You can always recreate it.`)) return;
    await API.delete(`/categories/${id}`);
    toast.success('Category archived');
    load();
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
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Category</button>
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
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(cat.id, cat.name)} style={{ color: 'rgba(13,13,13,0.3)' }}>✕</button>
                </div>
                <h3 style={{ fontSize: 18, marginBottom: 4 }}>{cat.name}</h3>
                {cat.description && <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)' }}>{cat.description}</p>}
                <div style={{ marginTop: 12 }}>
                  <span className="tag tag-mist" style={{ fontSize: 11 }}>Active</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>New Category</h3>
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
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

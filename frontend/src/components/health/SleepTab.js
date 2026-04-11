import { useEffect, useState } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errors';
import ConfirmModal from '../ui/ConfirmModal';

const TODAY = new Date().toISOString().slice(0, 10);

export default function SleepTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    date: TODAY,
    bedtime: '23:00',
    wake_time: '07:00',
    quality: 7,
    notes: ''
  });

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await API.get('/health/sleep');
      setLogs(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load sleep data'));
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ date: TODAY, bedtime: '23:00', wake_time: '07:00', quality: 7, notes: '' });
    setShowModal(true);
  };

  const openEdit = (l) => {
    setEditingId(l.id);
    setForm({
      date: l.date,
      bedtime: l.bedtime,
      wake_time: l.wake_time,
      quality: l.quality,
      notes: l.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.date || !form.bedtime || !form.wake_time) return toast.error('Required fields missing');
    
    setSaving(true);
    try {
      if (editingId) {
        await API.put(`/health/sleep/${editingId}`, form);
        toast.success('Log updated');
      } else {
        await API.post('/health/sleep', form);
        toast.success('Sleep logged');
      }
      setShowModal(false);
      loadLogs();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save log'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    setConfirm({
      title: 'Delete Sleep Log?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/health/sleep/${id}`);
          toast.success('Log deleted');
          loadLogs();
        } catch (err) {
          toast.error('Failed to delete');
        }
      }
    });
  };

  // Helper to calculate duration string
  const calculateDuration = (bed, wake) => {
    try {
      let b = new Date(`2000-01-01T${bed}:00`);
      let w = new Date(`2000-01-01T${wake}:00`);
      if (w < b) {
        w = new Date(`2000-01-02T${wake}:00`);
      }
      const diffMs = w - b;
      const hrs = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      return `${hrs}h ${mins > 0 ? mins + 'm' : ''}`;
    } catch {
      return '--';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 20, marginBottom: 4 }}>💤 Sleep & Recovery</h3>
          <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Recovery is when the growth happens.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ borderRadius: 30 }}>+ Log Sleep</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💤</div>
          <h3>No sleep data</h3>
          <p>Start tracking your bedtime and wake time to analyze recovery.</p>
          <button className="btn btn-primary" onClick={openAdd} style={{ borderRadius: 30 }}>+ Create Sleep Log</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {logs.map(l => (
            <div key={l.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 80, flexShrink: 0, textAlign: 'center', background: 'rgba(13,13,13,0.03)', padding: '12px 8px', borderRadius: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>{l.date}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{calculateDuration(l.bedtime, l.wake_time)}</div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>🛏️ {l.bedtime}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>☀️ {l.wake_time}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: l.quality >= 8 ? 'var(--sage)' : l.quality <= 4 ? 'var(--rust)' : '#c9a84c' }}>
                    Quality: {l.quality}/10
                  </div>
                </div>
                {l.notes && <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', fontStyle: 'italic' }}>"{l.notes}"</div>}
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm btn-ghost" onClick={() => openEdit(l)} style={{ padding: 6 }}>✎</button>
                <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(l.id)} style={{ padding: 6, color: 'rgba(13,13,13,0.3)' }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Sleep' : 'Log Sleep'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="form-group"><label className="form-label">Date (Morning of)</label>
              <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            </div>

            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group"><label className="form-label">Bedtime</label>
                <input type="time" className="form-input" value={form.bedtime} onChange={e => setForm({...form, bedtime: e.target.value})} />
              </div>
              <div className="form-group"><label className="form-label">Wake Time</label>
                <input type="time" className="form-input" value={form.wake_time} onChange={e => setForm({...form, wake_time: e.target.value})} />
              </div>
            </div>

            <div className="form-group"><label className="form-label">Quality (1-10)</label>
              <input type="number" min="1" max="10" className="form-input" value={form.quality} onChange={e => setForm({...form, quality: Number(e.target.value)})} />
            </div>

            <div className="form-group"><label className="form-label">Notes</label>
              <textarea className="form-textarea" placeholder="Dreams? Interruptions?" rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>

            <div style={{ display: 'flex', gap: 12, borderTop: '1px solid rgba(13,13,13,0.1)', paddingTop: 16, marginTop: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Log'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

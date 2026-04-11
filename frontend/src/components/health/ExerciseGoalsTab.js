import { useEffect, useState } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errors';
import ConfirmModal from '../ui/ConfirmModal';

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Arms', 'Shoulders', 'Core', 'Cardio'];

export default function ExerciseGoalsTab() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [viewingGoal, setViewingGoal] = useState(null);

  const [form, setForm] = useState({
    exercise_name: '',
    muscle_group: 'Chest',
    target_sets: 3,
    target_reps: 10,
    target_weight: 135,
    deadline: '',
    status: 'pending'
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const res = await API.get('/health/exercise-goals');
      setGoals(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load goals'));
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ exercise_name: '', muscle_group: 'Chest', target_sets: 3, target_reps: 10, target_weight: 135, deadline: '', status: 'pending' });
    setShowModal(true);
  };

  const openEdit = (g, e) => {
    e?.stopPropagation();
    setEditingId(g.id);
    setForm({
      exercise_name: g.exercise_name,
      muscle_group: g.muscle_group,
      target_sets: g.target_sets,
      target_reps: g.target_reps,
      target_weight: g.target_weight,
      deadline: g.deadline,
      status: g.status
    });
    setViewingGoal(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.exercise_name || !form.deadline) return toast.error('Name and deadline required');

    setSaving(true);
    try {
      if (editingId) {
        await API.put(`/health/exercise-goals/${editingId}`, form);
        toast.success('Goal updated');
      } else {
        await API.post('/health/exercise-goals', form);
        toast.success('Goal added');
      }
      setShowModal(false);
      loadGoals();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save goal'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, e) => {
    e?.stopPropagation();
    setConfirm({
      title: 'Delete Goal?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/health/exercise-goals/${id}`);
          toast.success('Goal deleted');
          setViewingGoal(null);
          loadGoals();
        } catch (err) {
          toast.error('Failed to delete goal');
        }
      }
    });
  };

  const updateStatus = async (id, currentForm, newStatus, e) => {
    e?.stopPropagation();
    try {
      const payload = { ...currentForm, status: newStatus };
      await API.put(`/health/exercise-goals/${id}`, payload);
      toast.success(`Target ${newStatus}!`);
      loadGoals();
    } catch (err) {
      toast.error('Could not update status');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 20, marginBottom: 4 }}>🎯 Exercise Goals</h3>
          <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Set target weights and rep ranges for specific exercises.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ borderRadius: 30 }}>+ Set Goal</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <h3>No goals set</h3>
          <p>Define a target weight or rep count you want to hit.</p>
          <button className="btn btn-primary" onClick={openAdd} style={{ borderRadius: 30 }}>+ Create Goal</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {goals.map(g => (
            <div key={g.id} className="card" onClick={() => setViewingGoal(g)} style={{
              padding: '20px',
              cursor: 'pointer',
              borderLeft: `5px solid ${g.status === 'achieved' ? 'var(--sage)' : g.status === 'failed' ? 'var(--rust)' : '#c9a84c'}`
            }}>
              <div style={{ fontSize: 10, background: 'rgba(13,13,13,0.06)', padding: '3px 8px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, display: 'inline-block' }}>
                {g.muscle_group}
              </div>
              <h4 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>{g.exercise_name}</h4>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{g.target_weight} <span style={{ fontWeight: 400, opacity: 0.5 }}>lbs</span></div>
                <div style={{ fontSize: 10, fontWeight: 800, color: g.status === 'achieved' ? 'var(--sage)' : g.status === 'failed' ? 'var(--rust)' : 'var(--gold)' }}>
                  {g.status.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Goal Detail Modal (Content View) */}
      {viewingGoal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewingGoal(null)}>
          <div className="modal" style={{ maxWidth: 450, padding: 32 }}>
            <div className="modal-header" style={{ marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                  PERFORMANCE GOAL
                </div>
                <h2 style={{ margin: 0, fontFamily: 'Fraunces', fontSize: 32 }}>{viewingGoal.exercise_name}</h2>
              </div>
              <button className="modal-close" onClick={() => setViewingGoal(null)}>✕</button>
            </div>

            <div style={{ padding: 24, background: 'rgba(13,13,13,0.02)', borderRadius: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.4, marginBottom: 16 }}>TARGET TARGET SPECIFICATIONS</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 700 }}>Weight</span>
                <span style={{ fontSize: 18, fontWeight: 800 }}>{viewingGoal.target_weight} lbs</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 700 }}>Rep Range</span>
                <span style={{ fontSize: 18, fontWeight: 800 }}>{viewingGoal.target_sets} × {viewingGoal.target_reps}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>Deadline</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--rust)' }}>{viewingGoal.deadline}</span>
              </div>
            </div>

            {viewingGoal.status === 'pending' && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
                <button className="btn btn-sm" style={{ flex: 1, height: 40, background: 'rgba(107,140,107,0.1)', color: 'var(--sage)', border: 'none', fontWeight: 800 }} onClick={(e) => updateStatus(viewingGoal.id, viewingGoal, 'achieved', e)}>✓ ACHIEVED</button>
                <button className="btn btn-sm" style={{ flex: 1, height: 40, background: 'rgba(196,98,58,0.1)', color: 'var(--rust)', border: 'none', fontWeight: 800 }} onClick={(e) => updateStatus(viewingGoal.id, viewingGoal, 'failed', e)}>✕ FAILED</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={(e) => openEdit(viewingGoal, e)}>✎ Edit Goal</button>
              <button className="btn btn-outline" style={{ flex: 1, color: 'var(--rust)', borderColor: 'rgba(196,98,58,0.2)' }} onClick={(e) => handleDelete(viewingGoal.id, e)}>🗑 Delete</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Goal' : 'Set Definition Goal'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="form-group"><label className="form-label">Exercise Name</label>
              <input type="text" className="form-input" value={form.exercise_name} onChange={e => setForm({ ...form, exercise_name: e.target.value })} placeholder="e.g. Squat" />
            </div>

            <div className="form-group"><label className="form-label">Muscle Group</label>
              <select className="form-input" value={form.muscle_group} onChange={e => setForm({ ...form, muscle_group: e.target.value })}>
                {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
              </select>
            </div>

            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group"><label className="form-label">Target Sets</label>
                <input type="number" className="form-input" value={form.target_sets} onChange={e => setForm({ ...form, target_sets: Number(e.target.value) })} />
              </div>
              <div className="form-group"><label className="form-label">Target Reps</label>
                <input type="number" className="form-input" value={form.target_reps} onChange={e => setForm({ ...form, target_reps: Number(e.target.value) })} />
              </div>
            </div>

            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group"><label className="form-label">Target Weight (lbs)</label>
                <input type="number" className="form-input" value={form.target_weight} onChange={e => setForm({ ...form, target_weight: Number(e.target.value) })} />
              </div>
              <div className="form-group"><label className="form-label">Deadline</label>
                <input type="date" className="form-input" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
              </div>
            </div>

            {editingId && (
              <div className="form-group"><label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="achieved">Achieved</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, borderTop: '1px solid rgba(13,13,13,0.1)', paddingTop: 16, marginTop: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

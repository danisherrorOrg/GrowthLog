import { useEffect, useState, useCallback } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { getErrorMessage } from '../../utils/errors';
import ConfirmModal from '../ui/ConfirmModal';

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Arms', 'Shoulders', 'Core', 'Cardio'];

const EXERCISES_BY_GROUP = {
  Chest: ['Bench Press', 'Incline Bench Press', 'Decline Bench Press', 'Dumbbell Flyes', 'Cable Crossover', 'Push-Ups', 'Chest Dips', 'Pec Deck Machine'],
  Back: ['Deadlift', 'Pull-Ups', 'Barbell Row', 'Seated Cable Row', 'Lat Pulldown', 'T-Bar Row', 'Single-Arm Dumbbell Row', 'Face Pulls'],
  Legs: ['Squat', 'Leg Press', 'Romanian Deadlift', 'Lunges', 'Leg Curl', 'Leg Extension', 'Bulgarian Split Squat', 'Hip Thrust', 'Calf Raises', 'Hack Squat'],
  Arms: ['Barbell Curl', 'Hammer Curl', 'Preacher Curl', 'Tricep Pushdown', 'Skull Crushers', 'Overhead Tricep Extension', 'Close-Grip Bench', 'Dips'],
  Shoulders: ['Overhead Press (Barbell)', 'Dumbbell Shoulder Press', 'Lateral Raises', 'Front Raises', 'Arnold Press', 'Rear Delt Flyes', 'Upright Row'],
  Core: ['Plank', 'Crunches', 'Cable Crunch', 'Leg Raises', 'Russian Twists', 'Ab Wheel Rollout', 'Hanging Knee Raises', 'Dragon Flag'],
  Cardio: ['Running', 'Cycling', 'Rowing Machine', 'Jump Rope', 'Stair Climber', 'Elliptical', 'Swimming', 'HIIT Sprint'],
};

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
    target_weight: 60,
    deadline: '',
    status: 'pending',
  });

  // FIX: useCallback so loadGoals is a stable reference for all closures
  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/health/exercise-goals');
      // FIX: guard against non-array API response (mirrors WorkoutLogTab)
      setGoals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load goals'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm({
      exercise_name: '',
      muscle_group: 'Chest',
      target_sets: 3,
      target_reps: 10,
      target_weight: 60,
      deadline: '',
      status: 'pending',
    });
    setShowModal(true);
  }, []);

  const openEdit = useCallback((g, e) => {
    e?.stopPropagation();
    setEditingId(g.id);
    setForm({
      // FIX: null-guard all fields with ?? fallbacks (mirrors WorkoutLogTab FIX #6)
      exercise_name: g.exercise_name ?? '',
      muscle_group: g.muscle_group ?? 'Chest',
      target_sets: g.target_sets ?? 3,
      target_reps: g.target_reps ?? 10,
      target_weight: g.target_weight ?? 0,
      deadline: g.deadline ?? '',
      status: g.status ?? 'pending',
    });
    setViewingGoal(null);
    setShowModal(true);
  }, []);

  const handleSave = async () => {
    if (!form.exercise_name?.trim()) return toast.error('Exercise name is required');
    if (!form.deadline) return toast.error('Deadline is required');

    // FIX: validate numeric fields before save (mirrors WorkoutLogTab FIX #4)
    if (Number(form.target_sets) <= 0) return toast.error('Target sets must be at least 1');
    if (Number(form.target_reps) <= 0) return toast.error('Target reps must be at least 1');
    if (Number(form.target_weight) < 0) return toast.error('Target weight cannot be negative');

    setSaving(true);
    try {
      // FIX: coerce all numeric fields to numbers at save time (mirrors WorkoutLogTab FIX #5)
      const payload = {
        ...form,
        target_sets: Number(form.target_sets) || 1,
        target_reps: Number(form.target_reps) || 1,
        target_weight: Number(form.target_weight) || 0,
      };

      if (editingId) {
        await API.put(`/health/exercise-goals/${editingId}`, payload);
        toast.success('Goal updated');
      } else {
        await API.post('/health/exercise-goals', payload);
        toast.success('Goal added');
      }
      setShowModal(false);
      setEditingId(null);
      setViewingGoal(null);
      loadGoals();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save goal'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback((id, e) => {
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
        } catch {
          toast.error('Failed to delete goal');
        }
      },
    });
  }, [loadGoals]);

  // FIX: send ONLY the status field — never spread stale viewing-goal data
  // into a PUT that could silently overwrite fields changed since page load
  const updateStatus = useCallback(async (id, newStatus, e) => {
    e?.stopPropagation();
    try {
      await API.patch(`/health/exercise-goals/${id}`, { status: newStatus });
      toast.success(`Goal marked as ${newStatus}!`);
      setViewingGoal(prev => prev ? { ...prev, status: newStatus } : null);
      loadGoals();
    } catch {
      toast.error('Could not update status');
    }
  }, [loadGoals]);

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 20, marginBottom: 4 }}>🎯 Exercise Goals</h3>
          <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>
            Set target weights and rep ranges for specific exercises.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ borderRadius: 30 }}>+ Set Goal</button>
      </div>

      {/* ── List ── */}
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
            <div
              key={g.id}
              className="card"
              onClick={() => setViewingGoal(g)}
              style={{
                padding: '20px',
                cursor: 'pointer',
                borderLeft: `5px solid ${g.status === 'achieved' ? 'var(--sage)' :
                  g.status === 'failed' ? 'var(--rust)' : '#c9a84c'
                  }`,
              }}
            >
              <div style={{
                fontSize: 10, background: 'rgba(13,13,13,0.06)', padding: '3px 8px',
                borderRadius: 4, fontWeight: 700, textTransform: 'uppercase',
                marginBottom: 6, display: 'inline-block',
              }}>
                {g.muscle_group}
              </div>
              <h4 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>{g.exercise_name}</h4>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>
                  {g.muscle_group === 'Cardio' ? (
                    <>
                      {g.target_weight > 0 && <>{g.target_weight} <span style={{ fontWeight: 400, opacity: 0.5 }}>km</span></>}
                      {g.target_weight > 0 && g.target_reps > 0 && ' · '}
                      {g.target_reps > 0 && <>{g.target_reps} <span style={{ fontWeight: 400, opacity: 0.5 }}>min</span></>}
                    </>
                  ) : (
                    <>{g.target_weight} <span style={{ fontWeight: 400, opacity: 0.5 }}>kg</span></>
                  )}
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 800,
                  color: g.status === 'achieved' ? 'var(--sage)' : g.status === 'failed' ? 'var(--rust)' : 'var(--gold)',
                }}>
                  {g.status.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Goal Detail Modal ── */}
      {viewingGoal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewingGoal(null)}>
          <div className="modal" style={{ maxWidth: 450, padding: 32 }}>
            <div className="modal-header" style={{ marginBottom: 24 }}>
              <div>
                <div style={{
                  fontSize: 12, fontWeight: 800, color: 'var(--gold)',
                  textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4,
                }}>
                  PERFORMANCE GOAL
                </div>
                <h2 style={{ margin: 0, fontFamily: 'Fraunces', fontSize: 32 }}>{viewingGoal.exercise_name}</h2>
              </div>
              <button className="modal-close" onClick={() => setViewingGoal(null)}>✕</button>
            </div>

            <div style={{ padding: 24, background: 'rgba(13,13,13,0.02)', borderRadius: 20, marginBottom: 24 }}>
              {/* FIX: removed duplicate word — was "TARGET TARGET SPECIFICATIONS" */}
              <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.4, marginBottom: 16 }}>
                TARGET SPECIFICATIONS
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 700 }}>Target</span>
                {viewingGoal.muscle_group === 'Cardio' ? (
                  <span style={{ fontSize: 18, fontWeight: 800 }}>
                    {viewingGoal.target_weight > 0 && <>{viewingGoal.target_weight} km</>}
                    {viewingGoal.target_weight > 0 && viewingGoal.target_reps > 0 && ' · '}
                    {viewingGoal.target_reps > 0 && <>{viewingGoal.target_reps} min</>}
                  </span>
                ) : (
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{viewingGoal.target_weight} kg</span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 700 }}>
                  {viewingGoal.muscle_group === 'Cardio' ? 'Rounds / Sets' : 'Rep Range'}
                </span>
                <span style={{ fontSize: 18, fontWeight: 800 }}>
                  {viewingGoal.target_sets} × {viewingGoal.target_reps}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>Deadline</span>
                {/* FIX: format date with date-fns instead of raw ISO string */}
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--rust)' }}>
                  {viewingGoal.deadline
                    ? format(parseISO(viewingGoal.deadline), 'MMMM dd, yyyy')
                    : '—'}
                </span>
              </div>
            </div>

            {viewingGoal.status === 'pending' && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
                <button
                  className="btn btn-sm"
                  style={{ flex: 1, height: 40, background: 'rgba(107,140,107,0.1)', color: 'var(--sage)', border: 'none', fontWeight: 800 }}
                  // FIX: removed stale currentForm spread — pass only newStatus
                  onClick={e => updateStatus(viewingGoal.id, 'achieved', e)}
                >
                  ✓ ACHIEVED
                </button>
                <button
                  className="btn btn-sm"
                  style={{ flex: 1, height: 40, background: 'rgba(196,98,58,0.1)', color: 'var(--rust)', border: 'none', fontWeight: 800 }}
                  onClick={e => updateStatus(viewingGoal.id, 'failed', e)}
                >
                  ✕ FAILED
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={e => openEdit(viewingGoal, e)}>
                ✎ Edit Goal
              </button>
              <button
                className="btn btn-outline"
                style={{ flex: 1, color: 'var(--rust)', borderColor: 'rgba(196,98,58,0.2)' }}
                onClick={e => handleDelete(viewingGoal.id, e)}
              >
                🗑 Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Goal' : 'Set Exercise Goal'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Exercise Name</label>
              <datalist id="goal-exercise-list">
                {(EXERCISES_BY_GROUP[form.muscle_group] || []).map(ex => <option key={ex} value={ex} />)}
              </datalist>
              <input
                type="text" className="form-input" list="goal-exercise-list"
                value={form.exercise_name}
                onChange={e => setForm({ ...form, exercise_name: e.target.value })}
                placeholder={form.muscle_group === 'Cardio' ? 'e.g. Running' : 'e.g. Squat'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Muscle Group</label>
              <select
                className="form-input"
                value={form.muscle_group}
                onChange={e => setForm({ ...form, muscle_group: e.target.value })}
              >
                {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
              </select>
            </div>

            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">
                  {form.muscle_group === 'Cardio' ? 'Target Rounds' : 'Target Sets'}
                </label>
                {/* FIX: keep raw string while typing; min attr prevents negatives */}
                <input
                  type="number" min="1" className="form-input"
                  value={form.target_sets}
                  onChange={e => setForm({ ...form, target_sets: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {form.muscle_group === 'Cardio' ? 'Duration per Round (min)' : 'Target Reps'}
                </label>
                <input
                  type="number" min="1" className="form-input"
                  value={form.target_reps}
                  onChange={e => setForm({ ...form, target_reps: e.target.value })}
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">
                  {form.muscle_group === 'Cardio' ? 'Target Distance (km)' : 'Target Weight (kg)'}
                </label>
                <input
                  type="number" min="0" step={form.muscle_group === 'Cardio' ? '0.5' : '1'}
                  className="form-input"
                  value={form.target_weight}
                  onChange={e => setForm({ ...form, target_weight: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Deadline</label>
                <input
                  type="date" className="form-input"
                  value={form.deadline}
                  onChange={e => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
            </div>

            {editingId && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="achieved">Achieved</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            )}

            <div style={{
              display: 'flex', gap: 12,
              borderTop: '1px solid rgba(13,13,13,0.1)', paddingTop: 16, marginTop: 10,
            }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                Cancel
              </button>
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
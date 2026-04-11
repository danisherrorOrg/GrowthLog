import { useEffect, useState } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { getErrorMessage } from '../../utils/errors';
import ConfirmModal from '../ui/ConfirmModal';

const TODAY = new Date().toISOString().slice(0, 10);
const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Arms', 'Shoulders', 'Core', 'Cardio'];

export default function WorkoutLogTab() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  // Form State
  const [form, setForm] = useState({
    date: TODAY,
    type: 'Gym',
    duration_minutes: 60,
    intensity: 7,
    notes: ''
  });
  const [exercises, setExercises] = useState([]);

  const [viewingWorkout, setViewingWorkout] = useState(null);

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    setLoading(true);
    try {
      const res = await API.get('/health/workouts');
      setWorkouts(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load workouts'));
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm({ date: TODAY, type: 'Gym', duration_minutes: 60, intensity: 7, notes: '' });
    setExercises([{ exercise_name: '', muscle_group: 'Chest', sets: [{ reps: 10, weight: 0 }], notes: '' }]);
    setShowModal(true);
  };

  const handleAddExercise = () => {
    setExercises([...exercises, { exercise_name: '', muscle_group: 'Chest', sets: [{ reps: 10, weight: 0 }], notes: '' }]);
  };

  const handleRemoveExercise = (idx) => {
    const updated = [...exercises];
    updated.splice(idx, 1);
    setExercises(updated);
  };

  const handleAddSet = (exIdx) => {
    const updated = [...exercises];
    updated[exIdx].sets.push({ reps: 10, weight: updated[exIdx].sets[updated[exIdx].sets.length - 1]?.weight || 0 });
    setExercises(updated);
  };

  const handleRemoveSet = (exIdx, setIdx) => {
    const updated = [...exercises];
    updated[exIdx].sets.splice(setIdx, 1);
    setExercises(updated);
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    const updated = [...exercises];
    updated[exIdx].sets[setIdx][field] = Number(value) || 0;
    setExercises(updated);
  };

  const updateExercise = (exIdx, field, value) => {
    const updated = [...exercises];
    updated[exIdx][field] = value;
    setExercises(updated);
  };

  const handleSave = async () => {
    if (!form.date) return toast.error('Date required');
    if (exercises.some(e => !e.exercise_name)) return toast.error('Exercise names are required');

    setSaving(true);
    try {
      const payload = { ...form, exercises };
      await API.post('/health/workouts', payload);
      toast.success('Workout logged!');
      setShowModal(false);
      loadWorkouts();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save logic'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, e) => {
    e?.stopPropagation();
    setConfirm({
      title: 'Delete Workout?',
      message: 'This removes all sets and progression data for this session.',
      confirmLabel: 'Delete Logs',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/health/workouts/${id}`);
          toast.success('Workout deleted');
          setViewingWorkout(null);
          loadWorkouts();
        } catch (err) {
          toast.error('Failed to delete workout');
        }
      }
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 20, marginBottom: 4 }}>💪 Workout Log</h3>
          <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Track sessions, muscle groups trained, and progressive overload.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ borderRadius: 30 }}>+ Log Workout</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />)}
        </div>
      ) : workouts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💪</div>
          <h3>No workouts logged</h3>
          <p>Consistency is key. Log your first session to build momentum.</p>
          <button className="btn btn-primary" onClick={openAdd} style={{ borderRadius: 30 }}>+ Log First Workout</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {workouts.map(w => (
            <div key={w.id} className="card" onClick={() => setViewingWorkout(w)} style={{
              padding: '16px 20px',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              borderLeft: '4px solid var(--sage)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(13,13,13,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                    {format(parseISO(w.date), 'MMMM dd, yyyy')}
                  </div>
                  <h4 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>{w.type}</h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{w.duration_minutes}m</div>
                  <div style={{ fontSize: 10, opacity: 0.4, fontWeight: 700 }}>DURATION</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center', borderTop: '1px solid rgba(13,13,13,0.05)', paddingTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'rgba(13,13,13,0.4)', fontWeight: 700 }}>EXERCISES</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{(w.exercises || []).length} Movements</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'rgba(13,13,13,0.4)', fontWeight: 700 }}>INTENSITY</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{w.intensity}/10</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Workout Detail Modal (Content View) */}
      {viewingWorkout && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewingWorkout(null)}>
          <div className="modal" style={{ maxWidth: 650, maxHeight: '90vh', overflowY: 'auto', padding: 32 }}>
            <div className="modal-header" style={{ marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                  {format(parseISO(viewingWorkout.date), 'EEEE · MMMM dd')}
                </div>
                <h2 style={{ margin: 0, fontFamily: 'Fraunces', fontSize: 32 }}>{viewingWorkout.type}</h2>
              </div>
              <button className="modal-close" onClick={() => setViewingWorkout(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
              <div style={{ flex: 1, padding: 16, background: 'rgba(13,13,13,0.02)', borderRadius: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.4, marginBottom: 4 }}>TOTAL TIME</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{viewingWorkout.duration_minutes} <span style={{ fontSize: 14, fontWeight: 400 }}>min</span></div>
              </div>
              <div style={{ flex: 1, padding: 16, background: 'rgba(13,13,13,0.02)', borderRadius: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.4, marginBottom: 4 }}>SESSION INTENSITY</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{viewingWorkout.intensity} <span style={{ fontSize: 14, fontWeight: 400 }}>/ 10</span></div>
              </div>
            </div>

            {viewingWorkout.notes && (
              <div style={{ marginBottom: 32, padding: '16px 20px', background: 'var(--parchment)', borderRadius: 12, borderLeft: '4px solid var(--gold)', fontStyle: 'italic', color: 'rgba(13,13,13,0.7)' }}>
                "{viewingWorkout.notes}"
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(viewingWorkout.exercises || []).map((e, idx) => (
                <div key={idx} style={{
                  padding: '20px',
                  background: 'white',
                  borderRadius: 20,
                  boxShadow: '0 4px 12px rgba(13,13,13,0.03)',
                  border: '1px solid rgba(13,13,13,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>{e.exercise_name}</div>
                    <span style={{ fontSize: 10, background: 'var(--mist)', padding: '4px 10px', borderRadius: 8, fontWeight: 800, textTransform: 'uppercase', color: 'rgba(13,13,13,0.5)' }}>
                      {e.muscle_group}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {e.sets.map((s, sIdx) => (
                      <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(13,13,13,0.02)', borderRadius: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'rgba(13,13,13,0.4)' }}>SET {sIdx + 1}</span>
                        <div style={{ fontWeight: 800 }}>{s.reps} <span style={{ fontWeight: 400, opacity: 0.5 }}>reps</span> · {s.weight > 0 ? `${s.weight} lbs` : 'Bodyweight'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 40, display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowModal(true); setViewingWorkout(null); /* populate with edit */ }}>✎ Edit Session</button>
              <button className="btn btn-outline" style={{ flex: 1, color: 'var(--rust)', borderColor: 'rgba(196,98,58,0.2)' }} onClick={(e) => handleDelete(viewingWorkout.id, e)}>🗑 Delete Log</button>
            </div>
          </div>
        </div>
      )}
      {/* Workout Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>Log Workout</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group"><label className="form-label">Date</label>
                <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="form-group"><label className="form-label">Type</label>
                <input type="text" className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="Gym, Run, Yoga..." />
              </div>
              <div className="form-group"><label className="form-label">Duration (min)</label>
                <input type="number" className="form-input" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
              </div>
              <div className="form-group"><label className="form-label">Intensity (1-10)</label>
                <input type="number" min="1" max="10" className="form-input" value={form.intensity} onChange={e => setForm({ ...form, intensity: Number(e.target.value) })} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Session Notes</label>
              <textarea className="form-textarea" placeholder="How did you feel? Energy levels?" rows="2" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div style={{ marginTop: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(13,13,13,0.1)', paddingBottom: 10, marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: 16 }}>Exercises</h4>
                <button className="btn btn-sm btn-outline" onClick={handleAddExercise}>+ Add Exercise</button>
              </div>

              {exercises.map((e, exIdx) => (
                <div key={exIdx} style={{ background: 'rgba(13,13,13,0.02)', border: '1px solid rgba(13,13,13,0.06)', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                      <input className="form-input" placeholder="Exercise Name (e.g. Bench Press)" value={e.exercise_name} onChange={ev => updateExercise(exIdx, 'exercise_name', ev.target.value)} style={{ flex: 2 }} />
                      <select className="form-input" value={e.muscle_group} onChange={ev => updateExercise(exIdx, 'muscle_group', ev.target.value)} style={{ flex: 1 }}>
                        {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                      </select>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveExercise(exIdx)} style={{ marginLeft: 10, padding: 8, color: 'rgba(13,13,13,0.3)' }}>✕</button>
                  </div>

                  <div style={{ paddingLeft: 10 }}>
                    {e.sets.map((s, setIdx) => (
                      <div key={setIdx} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(13,13,13,0.4)', width: 40 }}>SET {setIdx + 1}</span>
                        <input type="number" className="form-input" placeholder="Reps" value={s.reps} onChange={ev => updateSet(exIdx, setIdx, 'reps', ev.target.value)} style={{ width: 80, padding: '4px 8px', height: 32 }} />
                        <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)' }}>reps at</span>
                        <input type="number" className="form-input" placeholder="Weight" value={s.weight} onChange={ev => updateSet(exIdx, setIdx, 'weight', ev.target.value)} style={{ width: 80, padding: '4px 8px', height: 32 }} />
                        <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)' }}>lbs</span>
                        {e.sets.length > 1 && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveSet(exIdx, setIdx)} style={{ padding: 4, opacity: 0.5 }}>-</button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => handleAddSet(exIdx)} style={{ background: 'none', border: 'none', color: 'var(--sage)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '4px 0', marginTop: 4 }}>+ Add Set</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, borderTop: '1px solid rgba(13,13,13,0.1)', paddingTop: 16 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Workout'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

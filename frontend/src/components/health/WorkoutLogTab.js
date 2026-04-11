import { useEffect, useState, useCallback, memo } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { getErrorMessage } from '../../utils/errors';
import ConfirmModal from '../ui/ConfirmModal';

const TODAY = new Date().toISOString().slice(0, 10);
const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Arms', 'Shoulders', 'Core', 'Cardio'];

const EXERCISES_BY_GROUP = {
  Chest: ['Bench Press', 'Incline Bench Press', 'Decline Bench Press', 'Dumbbell Flyes', 'Cable Crossover', 'Push-Ups', 'Chest Dips', 'Pec Deck Machine'],
  Back: ['Deadlift', 'Pull-Ups', 'Barbell Row', 'Seated Cable Row', 'Lat Pulldown', 'T-Bar Row', 'Single-Arm Dumbbell Row', 'Face Pulls', 'Straight-Arm Pulldown'],
  Legs: ['Squat', 'Leg Press', 'Romanian Deadlift', 'Lunges', 'Leg Curl', 'Leg Extension', 'Bulgarian Split Squat', 'Hip Thrust', 'Calf Raises', 'Hack Squat'],
  Arms: ['Barbell Curl', 'Hammer Curl', 'Preacher Curl', 'Incline Dumbbell Curl', 'Tricep Pushdown', 'Skull Crushers', 'Overhead Tricep Extension', 'Close-Grip Bench', 'Dips', 'Concentration Curl'],
  Shoulders: ['Overhead Press (Barbell)', 'Dumbbell Shoulder Press', 'Lateral Raises', 'Front Raises', 'Arnold Press', 'Rear Delt Flyes', 'Upright Row', 'Face Pulls', 'Cable Lateral Raises'],
  Core: ['Plank', 'Crunches', 'Cable Crunch', 'Leg Raises', 'Russian Twists', 'Ab Wheel Rollout', 'Hanging Knee Raises', 'Decline Sit-Ups', 'Side Plank', 'Dragon Flag'],
  Cardio: ['Running', 'Cycling', 'Rowing Machine', 'Jump Rope', 'Stair Climber', 'Elliptical', 'Swimming', 'HIIT Sprint', 'Battle Ropes', 'Treadmill Walk'],
};

const ALL_EXERCISES = Object.values(EXERCISES_BY_GROUP).flat();

/* ── Colour palette ── */
const GROUP_COLORS = {
  Chest: { fill: '#f43f5e', glow: 'rgba(244,63,94,0.45)', light: '#fff1f2' },
  Back: { fill: '#7c3aed', glow: 'rgba(124,58,237,0.45)', light: '#f5f3ff' },
  Legs: { fill: '#0891b2', glow: 'rgba(8,145,178,0.45)', light: '#ecfeff' },
  Arms: { fill: '#ea580c', glow: 'rgba(234,88,12,0.45)', light: '#fff7ed' },
  Shoulders: { fill: '#059669', glow: 'rgba(5,150,105,0.45)', light: '#ecfdf5' },
  Core: { fill: '#ca8a04', glow: 'rgba(202,138,4,0.45)', light: '#fefce8' },
  Cardio: { fill: '#db2777', glow: 'rgba(219,39,119,0.45)', light: '#fdf2f8' },
};

/* ── Muscle path data ── */
const FRONT_MUSCLES_DETAIL = [
  { id: 'hd', s: true, f: '#f0d9c0', sk: '#c9a87a', sw: 1.5, path: 'M100 18 C80 18 68 30 68 45 C68 62 80 72 100 72 C120 72 132 62 132 45 C132 30 120 18 100 18Z' },
  { id: 'nd', s: true, f: '#dbbfa0', sk: '#c9a87a', sw: 1.5, path: 'M91 70 L109 70 L112 88 L88 88Z' },
  { id: 'fdl', group: 'Shoulders', path: 'M52 90 C40 90 30 100 30 115 C30 125 36 132 45 134 L60 128 L65 105 L60 92Z' },
  { id: 'fdr', group: 'Shoulders', path: 'M148 90 C160 90 170 100 170 115 C170 125 164 132 155 134 L140 128 L135 105 L140 92Z' },
  { id: 'upl', group: 'Chest', path: 'M65 92 L100 88 L100 115 L62 118 L60 100Z' },
  { id: 'upr', group: 'Chest', path: 'M135 92 L100 88 L100 115 L138 118 L140 100Z' },
  { id: 'lpl', group: 'Chest', path: 'M62 118 L100 115 L98 132 C85 138 70 132 63 126Z' },
  { id: 'lpr', group: 'Chest', path: 'M138 118 L100 115 L102 132 C115 138 130 132 137 126Z' },
  { id: 'sl', group: 'Core', path: 'M62 118 L66 155 L75 162 L68 125Z' },
  { id: 'sr', group: 'Core', path: 'M138 118 L134 155 L125 162 L132 125Z' },
  { id: 'a1l', group: 'Core', path: 'M81 132 L99 130 L99 148 L80 150Z' },
  { id: 'a1r', group: 'Core', path: 'M101 130 L119 132 L120 150 L101 148Z' },
  { id: 'a2l', group: 'Core', path: 'M80 152 L99 150 L99 168 L79 170Z' },
  { id: 'a2r', group: 'Core', path: 'M101 150 L120 152 L121 170 L101 168Z' },
  { id: 'a3l', group: 'Core', path: 'M79 172 L99 170 L99 186 L80 188Z' },
  { id: 'a3r', group: 'Core', path: 'M101 170 L121 172 L120 188 L101 186Z' },
  { id: 'ol', group: 'Core', path: 'M67 155 L80 150 L80 190 L72 198 C66 182 65 168 67 155Z' },
  { id: 'or', group: 'Core', path: 'M133 155 L120 150 L120 190 L128 198 C134 182 135 168 133 155Z' },
  { id: 'bil', group: 'Arms', path: 'M30 136 C24 145 22 160 24 172 C26 182 34 188 42 186 L48 170 L48 140 L40 134Z' },
  { id: 'bir', group: 'Arms', path: 'M170 136 C176 145 178 160 176 172 C174 182 166 188 158 186 L152 170 L152 140 L160 134Z' },
  { id: 'fl', group: 'Arms', path: 'M24 174 C20 190 20 208 24 222 C28 232 36 237 44 234 L48 218 L46 188 L40 178Z' },
  { id: 'frr', group: 'Arms', path: 'M176 174 C180 190 180 208 176 222 C172 232 164 237 156 234 L152 218 L154 188 L160 178Z' },
  { id: 'hip', s: true, f: '#dbbfa0', sk: '#c9a87a', sw: 1.5, path: 'M72 198 L100 200 L128 198 L132 215 L100 218 L68 215Z' },
  { id: 'ql', group: 'Legs', path: 'M68 217 L96 218 L93 290 L72 295 C65 272 63 248 68 217Z' },
  { id: 'qr', group: 'Legs', path: 'M104 218 L132 217 C137 248 135 272 128 295 L107 290Z' },
  { id: 'knl', s: true, f: '#dbbfa0', sk: '#c9a87a', sw: 1, path: 'M72 295 L93 290 L90 312 L73 314Z' },
  { id: 'knr', s: true, f: '#dbbfa0', sk: '#c9a87a', sw: 1, path: 'M107 290 L128 295 L127 314 L110 312Z' },
  { id: 'cal', group: 'Legs', path: 'M73 315 L90 313 L88 375 L74 378 C68 357 67 335 73 315Z' },
  { id: 'car', group: 'Legs', path: 'M110 313 L127 315 C133 335 132 357 126 378 L112 375Z' },
  { id: 'ftl', s: true, f: '#dbbfa0', sk: '#c9a87a', sw: 1, path: 'M72 378 L90 375 L92 392 L68 392Z' },
  { id: 'ftr', s: true, f: '#dbbfa0', sk: '#c9a87a', sw: 1, path: 'M110 375 L128 378 L132 392 L108 392Z' },
];

const BACK_MUSCLES_DETAIL = [
  { id: 'hb', s: true, f: '#f0d9c0', sk: '#c9a87a', sw: 1.5, path: 'M100 18 C80 18 68 30 68 45 C68 62 80 72 100 72 C120 72 132 62 132 45 C132 30 120 18 100 18Z' },
  { id: 'nb', s: true, f: '#dbbfa0', sk: '#c9a87a', sw: 1.5, path: 'M91 70 L109 70 L112 88 L88 88Z' },
  { id: 'trl', group: 'Back', path: 'M88 86 L100 90 L65 105 L52 95 L65 88Z' },
  { id: 'trr', group: 'Back', path: 'M112 86 L100 90 L135 105 L148 95 L135 88Z' },
  { id: 'trm', group: 'Back', path: 'M65 105 L100 110 L135 105 L130 126 L100 130 L70 126Z' },
  { id: 'rho', group: 'Back', path: 'M70 126 L100 130 L130 126 L130 156 L100 162 L70 156Z' },
  { id: 'lal', group: 'Back', path: 'M66 122 L100 128 L96 192 L72 200 C60 175 58 148 66 122Z' },
  { id: 'lar', group: 'Back', path: 'M134 122 L100 128 L104 192 L128 200 C140 175 142 148 134 122Z' },
  { id: 'lb', group: 'Back', path: 'M72 196 L100 192 L128 196 L128 220 L100 222 L72 220Z' },
  { id: 'rdl', group: 'Shoulders', path: 'M52 95 L40 105 C32 115 30 128 36 138 L52 135 L65 120Z' },
  { id: 'rdr', group: 'Shoulders', path: 'M148 95 L160 105 C168 115 170 128 164 138 L148 135 L135 120Z' },
  { id: 'tril', group: 'Arms', path: 'M36 138 L52 135 L50 180 L36 184 C28 168 28 152 36 138Z' },
  { id: 'trir', group: 'Arms', path: 'M164 138 L148 135 L150 180 L164 184 C172 168 172 152 164 138Z' },
  { id: 'fbl', group: 'Arms', path: 'M34 186 L50 182 L46 228 L34 230 C26 214 26 200 34 186Z' },
  { id: 'fbr', group: 'Arms', path: 'M150 182 L166 186 C174 200 174 214 166 230 L154 228Z' },
  { id: 'gll', group: 'Legs', path: 'M72 222 L100 222 L98 258 C87 266 74 260 68 250 C64 242 65 232 72 222Z' },
  { id: 'glr', group: 'Legs', path: 'M100 222 L128 222 C135 232 136 242 132 250 C126 260 113 266 102 258Z' },
  { id: 'hml', group: 'Legs', path: 'M68 252 L97 260 L94 310 L72 314 C64 292 62 272 68 252Z' },
  { id: 'hmr', group: 'Legs', path: 'M103 260 L132 252 C138 272 136 292 128 314 L106 310Z' },
  { id: 'cbl', group: 'Legs', path: 'M72 316 L94 312 L90 375 L74 378 C66 355 66 335 72 316Z' },
  { id: 'cbr', group: 'Legs', path: 'M106 312 L128 316 C134 335 134 355 126 378 L110 375Z' },
  { id: 'fbl2', s: true, f: '#dbbfa0', sk: '#c9a87a', sw: 1, path: 'M72 378 L90 375 L92 392 L68 392Z' },
  { id: 'fbr2', s: true, f: '#dbbfa0', sk: '#c9a87a', sw: 1, path: 'M110 375 L128 378 L132 392 L108 392Z' },
];

/* ─────────────────────────────────────────────
   MiniBodySelector
   FIX #2:  instanceId scopes all SVG filter IDs so multiple cards in the
            same DOM never share an id="mgf-Chest" across different SVGs.
   FIX #12: Wrapped in React.memo so SVG re-paints only when selected or
            instanceId actually changes, not on every set-field keystroke.
   FIX #1:  Glow filter applied only on the selected (active) group path,
            removed on mouse-leave so it's never "always-on" for all paths.
───────────────────────────────────────────── */
const MiniBodySelector = memo(function MiniBodySelector({ selected, onChange, instanceId }) {
  const meta = GROUP_COLORS[selected] || GROUP_COLORS.Chest;
  const color = meta.fill;
  const light = meta.light;

  const renderFigure = (muscles, label) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 9, fontWeight: 900, letterSpacing: 2.5,
        color: 'rgba(13,13,13,0.28)', marginBottom: 8,
      }}>
        {label}
      </div>
      <svg
        width="130" height="267" viewBox="0 0 200 410"
        style={{ overflow: 'visible', filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.12))' }}
      >
        <defs>
          {/* FIX #2: prefix every filter id with instanceId to avoid
              duplicate IDs when multiple exercise cards are open */}
          {Object.entries(GROUP_COLORS).map(([grp, m]) => (
            <filter key={grp} id={`mgf-${instanceId}-${grp}`}
              x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
              <feFlood floodColor={m.fill} floodOpacity="0.75" result="col" />
              <feComposite in="col" in2="blur" operator="in" result="sh" />
              <feMerge>
                <feMergeNode in="sh" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {muscles.map(m => {
          if (m.s) {
            return (
              <path key={m.id} d={m.path}
                fill={m.f} stroke={m.sk} strokeWidth={m.sw} />
            );
          }
          const mc = GROUP_COLORS[m.group]?.fill || '#94a3b8';
          const on = m.group === selected;
          return (
            <path
              key={m.id} d={m.path}
              fill={mc}
              fillOpacity={on ? 0.82 : 0.15}
              stroke={mc}
              strokeWidth={on ? 2.2 : 1.2}
              strokeOpacity={on ? 1 : 0.3}
              // FIX #1: glow only on the active group; removed on mouseleave
              style={{ cursor: 'pointer', transition: 'fill-opacity 0.16s' }}
              onClick={() => onChange(m.group)}
              onMouseEnter={e => {
                if (!on) {
                  e.currentTarget.style.fillOpacity = '0.45';
                  e.currentTarget.style.strokeOpacity = '0.8';
                } else {
                  // Apply glow only on hover for the selected group
                  e.currentTarget.style.filter = `url(#mgf-${instanceId}-${m.group})`;
                }
              }}
              onMouseLeave={e => {
                if (!on) {
                  e.currentTarget.style.fillOpacity = '0.15';
                  e.currentTarget.style.strokeOpacity = '0.3';
                } else {
                  e.currentTarget.style.filter = '';
                }
              }}
            />
          );
        })}
      </svg>
    </div>
  );

  return (
    <div style={{
      background: light,
      border: `1.5px solid ${color}35`,
      borderRadius: 14,
      padding: '12px 14px 10px',
    }}>
      {/* Selected group badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: color, boxShadow: `0 0 8px ${color}`,
          }} />
          <span style={{ fontWeight: 900, fontSize: 13, color }}>{selected}</span>
        </div>
        <span style={{ fontSize: 10, color: 'rgba(13,13,13,0.35)', fontWeight: 600 }}>
          tap muscle to change
        </span>
      </div>

      {/* Front + Back figures */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 10 }}>
        {renderFigure(FRONT_MUSCLES_DETAIL, 'FRONT')}
        {renderFigure(BACK_MUSCLES_DETAIL, 'BACK')}
      </div>

      {/* Cardio — not represented on the body figure */}
      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => onChange('Cardio')}
          style={{
            padding: '4px 18px', borderRadius: 20, fontSize: 12, fontWeight: 800, cursor: 'pointer',
            border: `1.5px solid ${selected === 'Cardio' ? GROUP_COLORS.Cardio.fill : 'rgba(13,13,13,0.1)'}`,
            background: selected === 'Cardio' ? GROUP_COLORS.Cardio.fill + '18' : 'transparent',
            color: selected === 'Cardio' ? GROUP_COLORS.Cardio.fill : 'rgba(13,13,13,0.4)',
            transition: 'all 0.15s',
          }}
        >
          🏃 Cardio
        </button>
      </div>
    </div>
  );
});

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const makeEmptySet = () => ({ reps: 10, weight: 0, distance_km: 0, duration_min: 30 });
const makeEmptyExercise = () => ({ exercise_name: '', muscle_group: 'Chest', sets: [makeEmptySet()], notes: '' });

/* FIX #10: Normalise to lowercase+trimmed for robust duplicate detection */
const normaliseExName = (name) => name.trim().toLowerCase();

export default function WorkoutLogTab() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [customExercises, setCustomExercises] = useState({});
  const [viewingWorkout, setViewingWorkout] = useState(null);

  const [form, setForm] = useState({
    date: TODAY,
    type: 'Gym',
    duration_minutes: 60,
    intensity: 7,
    notes: '',
  });
  const [exercises, setExercises] = useState([makeEmptyExercise()]);

  useEffect(() => {
    loadWorkouts();
    loadCustomExercises();
  }, []);

  /* FIX #3: wrap loaders in useCallback so they are stable references and
     can safely be added to dependency arrays in the future. */
  const loadWorkouts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/health/workouts');
      setWorkouts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load workouts'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomExercises = useCallback(async () => {
    try {
      const res = await API.get('/health/custom-exercises');
      const grouped = {};
      (Array.isArray(res.data) ? res.data : []).forEach(ex => {
        if (!grouped[ex.muscle_group]) grouped[ex.muscle_group] = [];
        grouped[ex.muscle_group].push(ex);
      });
      setCustomExercises(grouped);
    } catch {
      // Non-critical feature — fail silently
    }
  }, []);

  const saveCustomExercise = useCallback(async (muscleGroup, exerciseName) => {
    try {
      await API.post('/health/custom-exercises', { muscle_group: muscleGroup, exercise_name: exerciseName });
      toast.success(`"${exerciseName}" saved to your ${muscleGroup} list ⭐`);
      loadCustomExercises();
    } catch {
      toast.error('Could not save exercise');
    }
  }, [loadCustomExercises]);

  /* FIX #10: normalise both sides to catch "bench press" vs "Bench Press" */
  const isAlreadySaved = useCallback((muscleGroup, exerciseName) => {
    const needle = normaliseExName(exerciseName);
    const defaults = (EXERCISES_BY_GROUP[muscleGroup] || []).map(normaliseExName);
    const customs = (customExercises[muscleGroup] || []).map(c => normaliseExName(c.exercise_name));
    return defaults.includes(needle) || customs.includes(needle);
  }, [customExercises]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm({ date: TODAY, type: 'Gym', duration_minutes: 60, intensity: 7, notes: '' });
    setExercises([makeEmptyExercise()]);
    setShowModal(true);
  }, []);

  const openEdit = useCallback((w) => {
    setEditingId(w.id);
    setForm({
      date: w.date,
      type: w.type,
      duration_minutes: w.duration_minutes,
      intensity: w.intensity,
      /* FIX #6: guard against notes: null from the API */
      notes: w.notes ?? '',
    });
    const normalised = (w.exercises || []).map(e => ({
      ...e,
      /* FIX #6: guard exercise-level notes too */
      notes: e.notes ?? '',
      sets: (e.sets || []).map(s => ({
        reps: s.reps ?? 10,
        weight: s.weight ?? 0,
        distance_km: s.distance_km ?? 0,
        duration_min: s.duration_min ?? 30,
      })),
    }));
    setExercises(normalised.length > 0 ? normalised : [makeEmptyExercise()]);
    setViewingWorkout(null);
    setShowModal(true);
  }, []);

  const handleAddExercise = useCallback(() => {
    setExercises(prev => [...prev, makeEmptyExercise()]);
  }, []);

  const handleRemoveExercise = useCallback((idx) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleAddSet = useCallback((exIdx) => {
    setExercises(prev => {
      const updated = [...prev];
      const lastSet = updated[exIdx].sets[updated[exIdx].sets.length - 1] || {};
      updated[exIdx] = {
        ...updated[exIdx],
        sets: [...updated[exIdx].sets, {
          reps: lastSet.reps || 10,
          weight: lastSet.weight || 0,
          distance_km: lastSet.distance_km || 0,
          duration_min: lastSet.duration_min || 30,
        }],
      };
      return updated;
    });
  }, []);

  const handleRemoveSet = useCallback((exIdx, setIdx) => {
    setExercises(prev => {
      const updated = [...prev];
      const newSets = updated[exIdx].sets.filter((_, i) => i !== setIdx);
      updated[exIdx] = { ...updated[exIdx], sets: newSets };
      return updated;
    });
  }, []);

  /* FIX #5: Keep the raw string while the user is typing so they can clear
     a field without it snapping back to 0. Coerce to number only on save. */
  const updateSet = useCallback((exIdx, setIdx, field, value) => {
    setExercises(prev => {
      const updated = prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, j) => {
            if (j !== setIdx) return s;
            return { ...s, [field]: value === '' ? '' : value };
          }),
        };
      });
      return updated;
    });
  }, []);

  const updateExercise = useCallback((exIdx, field, value) => {
    setExercises(prev => prev.map((ex, i) =>
      i === exIdx ? { ...ex, [field]: value } : ex
    ));
  }, []);

  const handleSave = async () => {
    if (!form.date) return toast.error('Date is required');

    /* FIX #9: Require at least one exercise */
    if (exercises.length === 0) return toast.error('Add at least one exercise');

    if (exercises.some(e => !e.exercise_name?.trim()))
      return toast.error('All exercises must have a name');

    /* FIX #4: Validate individual sets */
    if (exercises.some(e => e.sets.length === 0))
      return toast.error('Each exercise needs at least one set');

    const hasInvalidSet = exercises.some(e =>
      e.sets.some(s => Number(s.reps) < 0 || Number(s.weight) < 0 ||
        Number(s.distance_km) < 0 || Number(s.duration_min) < 0)
    );
    if (hasInvalidSet) return toast.error('Set values cannot be negative');

    /* FIX #5: Coerce all set fields to numbers before sending to API */
    const coercedExercises = exercises.map(e => ({
      ...e,
      sets: e.sets.map(s => ({
        reps: Number(s.reps) || 0,
        weight: Number(s.weight) || 0,
        distance_km: Number(s.distance_km) || 0,
        duration_min: Number(s.duration_min) || 0,
      })),
    }));

    setSaving(true);
    try {
      const payload = { ...form, exercises: coercedExercises };
      if (editingId) {
        await API.put(`/health/workouts/${editingId}`, payload);
        toast.success('Workout updated!');
      } else {
        await API.post('/health/workouts', payload);
        toast.success('Workout logged!');
      }
      setShowModal(false);
      setEditingId(null);
      /* FIX #7: Clear viewing state so stale workout detail is never shown */
      setViewingWorkout(null);
      loadWorkouts();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save workout'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback((id, e) => {
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
        } catch {
          toast.error('Failed to delete workout');
        }
      },
    });
  }, [loadWorkouts]);

  /* ─────────────────────────────────────────────
     Render
  ───────────────────────────────────────────── */
  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 20, marginBottom: 4 }}>💪 Workout Log</h3>
          <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>
            Track sessions, muscle groups trained, and progressive overload.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ borderRadius: 30 }}>
          + Log Workout
        </button>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💪</div>
          <h3>No workouts logged</h3>
          <p>Consistency is key. Log your first session to build momentum.</p>
          <button className="btn btn-primary" onClick={openAdd} style={{ borderRadius: 30 }}>
            + Log First Workout
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {workouts.map(w => (
            <div
              key={w.id}
              className="card"
              onClick={() => setViewingWorkout(w)}
              style={{
                padding: '16px 20px', cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                borderLeft: '4px solid var(--sage)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 800, color: 'rgba(13,13,13,0.3)',
                    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4,
                  }}>
                    {format(parseISO(w.date), 'MMMM dd, yyyy')}
                  </div>
                  <h4 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>{w.type}</h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{w.duration_minutes}m</div>
                  <div style={{ fontSize: 10, opacity: 0.4, fontWeight: 700 }}>DURATION</div>
                </div>
              </div>

              <div style={{
                display: 'flex', gap: 12, marginTop: 12, alignItems: 'center',
                borderTop: '1px solid rgba(13,13,13,0.05)', paddingTop: 12,
              }}>
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

      {/* ── Workout Detail Modal ── */}
      {viewingWorkout && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewingWorkout(null)}>
          <div className="modal" style={{ maxWidth: 650, maxHeight: '90vh', overflowY: 'auto', padding: 32 }}>
            <div className="modal-header" style={{ marginBottom: 24 }}>
              <div>
                <div style={{
                  fontSize: 12, fontWeight: 800, color: 'var(--sage)',
                  textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4,
                }}>
                  {format(parseISO(viewingWorkout.date), 'EEEE · MMMM dd')}
                </div>
                <h2 style={{ margin: 0, fontFamily: 'Fraunces', fontSize: 32 }}>{viewingWorkout.type}</h2>
              </div>
              <button className="modal-close" onClick={() => setViewingWorkout(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
              <div style={{ flex: 1, padding: 16, background: 'rgba(13,13,13,0.02)', borderRadius: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.4, marginBottom: 4 }}>TOTAL TIME</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>
                  {viewingWorkout.duration_minutes} <span style={{ fontSize: 14, fontWeight: 400 }}>min</span>
                </div>
              </div>
              <div style={{ flex: 1, padding: 16, background: 'rgba(13,13,13,0.02)', borderRadius: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.4, marginBottom: 4 }}>SESSION INTENSITY</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>
                  {viewingWorkout.intensity} <span style={{ fontSize: 14, fontWeight: 400 }}>/ 10</span>
                </div>
              </div>
            </div>

            {viewingWorkout.notes && (
              <div style={{
                marginBottom: 32, padding: '16px 20px',
                background: 'var(--parchment)', borderRadius: 12,
                borderLeft: '4px solid var(--gold)',
                fontStyle: 'italic', color: 'rgba(13,13,13,0.7)',
              }}>
                "{viewingWorkout.notes}"
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(viewingWorkout.exercises || []).map((e, idx) => (
                <div key={idx} style={{
                  padding: 20, background: 'white', borderRadius: 20,
                  boxShadow: '0 4px 12px rgba(13,13,13,0.03)',
                  border: '1px solid rgba(13,13,13,0.05)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>{e.exercise_name}</div>
                    <span style={{
                      fontSize: 10, background: 'var(--mist)',
                      padding: '4px 10px', borderRadius: 8,
                      fontWeight: 800, textTransform: 'uppercase', color: 'rgba(13,13,13,0.5)',
                    }}>
                      {e.muscle_group}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {e.sets.map((s, sIdx) => (
                      <div key={sIdx} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '10px 14px', background: 'rgba(13,13,13,0.02)', borderRadius: 10,
                      }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'rgba(13,13,13,0.4)' }}>
                          {e.muscle_group === 'Cardio' ? `ROUND ${sIdx + 1}` : `SET ${sIdx + 1}`}
                        </span>
                        {e.muscle_group === 'Cardio' ? (
                          <div style={{ fontWeight: 800 }}>
                            {s.distance_km > 0
                              ? <>{s.distance_km} <span style={{ fontWeight: 400, opacity: 0.5 }}>km</span> · </>
                              : ''}
                            {s.duration_min} <span style={{ fontWeight: 400, opacity: 0.5 }}>min</span>
                          </div>
                        ) : (
                          <div style={{ fontWeight: 800 }}>
                            {s.reps} <span style={{ fontWeight: 400, opacity: 0.5 }}>reps</span>
                            {' · '}
                            {s.weight > 0
                              ? <>{s.weight} <span style={{ fontWeight: 400, opacity: 0.5 }}>kg</span></>
                              : 'Bodyweight'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 40, display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => openEdit(viewingWorkout)}>
                ✎ Edit Session
              </button>
              <button
                className="btn btn-outline"
                style={{ flex: 1, color: 'var(--rust)', borderColor: 'rgba(196,98,58,0.2)' }}
                onClick={(e) => handleDelete(viewingWorkout.id, e)}
              >
                🗑 Delete Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log / Edit Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 780, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>{editingId ? '✎ Edit Workout' : 'Log Workout'}</h3>
              <button
                className="modal-close"
                onClick={() => { setShowModal(false); setEditingId(null); }}
              >✕</button>
            </div>

            {/* Session meta */}
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date" className="form-input" value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <input
                  type="text" className="form-input" value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  placeholder="Gym, Run, Yoga..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (min)</label>
                <input
                  type="number" className="form-input" value={form.duration_minutes}
                  onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Intensity (1–10)</label>
                {/* FIX #13: Clamp typed values so user cannot enter 0 or 99 */}
                <input
                  type="number" min="1" max="10" className="form-input"
                  value={form.intensity}
                  onChange={e =>
                    setForm({
                      ...form,
                      intensity: Math.min(10, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Session Notes</label>
              <textarea
                className="form-textarea"
                placeholder="How did you feel? Energy levels?"
                rows="2"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {/* Exercises */}
            <div style={{ marginTop: 20, marginBottom: 20 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid rgba(13,13,13,0.1)', paddingBottom: 10, marginBottom: 16,
              }}>
                <h4 style={{ margin: 0, fontSize: 16 }}>Exercises</h4>
                <button className="btn btn-sm btn-outline" onClick={handleAddExercise}>
                  + Add Exercise
                </button>
              </div>

              {exercises.map((e, exIdx) => {
                const isCardio = e.muscle_group === 'Cardio';
                const listId = `ex-list-${exIdx}`;
                const grpColor = GROUP_COLORS[e.muscle_group]?.fill || '#94a3b8';
                /* FIX #11: Removed misleading "star prefix" comment — options
                   are listed without prefix; the ⭐ save button handles custom. */
                const suggestions = [
                  ...(customExercises[e.muscle_group] || []).map(c => c.exercise_name),
                  ...(EXERCISES_BY_GROUP[e.muscle_group] || ALL_EXERCISES),
                ];

                return (
                  <div
                    key={exIdx}
                    style={{
                      border: `1.5px solid ${grpColor}28`,
                      borderLeft: `4px solid ${grpColor}`,
                      borderRadius: 14, marginBottom: 16,
                      overflow: 'hidden', background: 'white',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                    }}
                  >
                    {/* Exercise name row */}
                    <div style={{
                      display: 'flex', gap: 10, alignItems: 'center',
                      padding: '12px 14px 10px',
                      borderBottom: `1px solid ${grpColor}15`,
                    }}>
                      <div style={{ flex: 1 }}>
                        <datalist id={listId}>
                          {suggestions.map(ex => <option key={ex} value={ex} />)}
                        </datalist>
                        <input
                          className="form-input"
                          list={listId}
                          placeholder={isCardio ? 'e.g. Running' : 'e.g. Bench Press'}
                          value={e.exercise_name}
                          onChange={ev => updateExercise(exIdx, 'exercise_name', ev.target.value)}
                          style={{ width: '100%', fontWeight: 700, fontSize: 14 }}
                        />
                      </div>

                      {/* FIX #10: normalised comparison so "bench press" === "Bench Press" */}
                      {e.exercise_name && !isAlreadySaved(e.muscle_group, e.exercise_name) && (
                        <button
                          type="button"
                          title="Save to my exercise list"
                          onClick={() => saveCustomExercise(e.muscle_group, e.exercise_name)}
                          style={{
                            background: 'none', border: `1.5px solid ${grpColor}50`,
                            borderRadius: 8, padding: '4px 8px', cursor: 'pointer',
                            color: grpColor, fontSize: 13, fontWeight: 900, flexShrink: 0,
                          }}
                        >⭐</button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleRemoveExercise(exIdx)}
                        style={{ padding: '6px 8px', color: 'rgba(13,13,13,0.3)', flexShrink: 0 }}
                      >✕</button>
                    </div>

                    {/* Body selector + sets */}
                    <div style={{ display: 'flex', gap: 0 }}>
                      {/* Body map panel — FIX #2 & #12 via instanceId + React.memo */}
                      <div style={{ padding: '12px 14px', borderRight: `1px solid ${grpColor}15`, flexShrink: 0 }}>
                        <MiniBodySelector
                          selected={e.muscle_group}
                          onChange={val => updateExercise(exIdx, 'muscle_group', val)}
                          instanceId={exIdx}
                        />
                      </div>

                      {/* Sets panel */}
                      <div style={{ flex: 1, padding: '14px 14px 12px' }}>
                        <div style={{
                          fontSize: 10, fontWeight: 900,
                          color: 'rgba(13,13,13,0.35)', letterSpacing: 1.5, marginBottom: 10,
                        }}>
                          {isCardio ? 'ROUNDS' : 'SETS'}
                        </div>

                        {e.sets.map((s, setIdx) => (
                          <div
                            key={setIdx}
                            style={{
                              display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8,
                              background: 'rgba(13,13,13,0.025)', borderRadius: 8, padding: '6px 10px',
                            }}
                          >
                            <span style={{
                              fontSize: 10, fontWeight: 800, color: grpColor,
                              width: 42, flexShrink: 0,
                            }}>
                              {isCardio ? `RND ${setIdx + 1}` : `SET ${setIdx + 1}`}
                            </span>

                            {isCardio ? (
                              <>
                                <input
                                  type="number" step="0.1" className="form-input"
                                  placeholder="km" value={s.distance_km}
                                  // FIX #5: pass raw value string; coerce only on save
                                  onChange={ev => updateSet(exIdx, setIdx, 'distance_km', ev.target.value)}
                                  style={{ width: 64, padding: '4px 8px', height: 30, fontSize: 13 }}
                                />
                                <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', flexShrink: 0 }}>km</span>
                                <input
                                  type="number" className="form-input"
                                  placeholder="min" value={s.duration_min}
                                  onChange={ev => updateSet(exIdx, setIdx, 'duration_min', ev.target.value)}
                                  style={{ width: 64, padding: '4px 8px', height: 30, fontSize: 13 }}
                                />
                                <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', flexShrink: 0 }}>min</span>
                              </>
                            ) : (
                              <>
                                <input
                                  type="number" className="form-input"
                                  placeholder="Reps" value={s.reps}
                                  onChange={ev => updateSet(exIdx, setIdx, 'reps', ev.target.value)}
                                  style={{ width: 60, padding: '4px 8px', height: 30, fontSize: 13 }}
                                />
                                <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', flexShrink: 0 }}>×</span>
                                <input
                                  type="number" step="0.5" className="form-input"
                                  placeholder="kg" value={s.weight}
                                  onChange={ev => updateSet(exIdx, setIdx, 'weight', ev.target.value)}
                                  style={{ width: 64, padding: '4px 8px', height: 30, fontSize: 13 }}
                                />
                                <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', flexShrink: 0 }}>kg</span>
                              </>
                            )}

                            {e.sets.length > 1 && (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleRemoveSet(exIdx, setIdx)}
                                style={{ padding: '2px 6px', opacity: 0.4, marginLeft: 'auto' }}
                              >−</button>
                            )}
                          </div>
                        ))}

                        <button
                          onClick={() => handleAddSet(exIdx)}
                          style={{
                            background: 'none', border: 'none', color: grpColor,
                            fontSize: 12, fontWeight: 800, cursor: 'pointer',
                            padding: '4px 2px', marginTop: 2,
                          }}
                        >
                          + Add {isCardio ? 'Round' : 'Set'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer actions */}
            <div style={{
              display: 'flex', gap: 12,
              borderTop: '1px solid rgba(13,13,13,0.1)', paddingTop: 16,
            }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleSave}
                disabled={saving}
              >
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
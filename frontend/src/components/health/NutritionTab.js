import { useEffect, useState } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errors';
import ConfirmModal from '../ui/ConfirmModal';

const TODAY = new Date().toISOString().slice(0, 10);
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function NutritionTab() {
  const [metrics, setMetrics] = useState([]);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showMealModal, setShowMealModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [editingMealId, setEditingMealId] = useState(null);
  const [viewingDay, setViewingDay] = useState(null);

  // Forms
  const [mealForm, setMealForm] = useState({ date: TODAY, meal_type: 'Breakfast', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, notes: '' });
  const [metricsForm, setMetricsForm] = useState({ date: TODAY, water_ml: 2000, nutrition_quality: 7, notes: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [metRes, mealRes] = await Promise.all([
        API.get('/health/metrics'),
        API.get('/health/meals')
      ]);
      setMetrics(metRes.data);
      setMeals(mealRes.data);
    } catch (err) {
      toast.error('Failed to load nutrition data');
    } finally {
      setLoading(false);
    }
  };

  // --- Meal Log Handlers ---
  const openAddMeal = (e) => {
    e?.stopPropagation();
    setEditingMealId(null);
    setMealForm({ date: TODAY, meal_type: 'Breakfast', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, notes: '' });
    setShowMealModal(true);
  };

  const openEditMeal = (meal, e) => {
    e?.stopPropagation();
    setEditingMealId(meal.id);
    setMealForm({
      date: meal.date,
      meal_type: meal.meal_type,
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
      notes: meal.notes || '',
    });
    setShowMealModal(true);
  };

  const saveMeal = async () => {
    setSaving(true);
    try {
      if (editingMealId) {
        await API.put(`/health/meals/${editingMealId}`, mealForm);
        toast.success('Meal updated');
      } else {
        await API.post('/health/meals', mealForm);
        toast.success('Meal logged');
      }
      setShowMealModal(false);
      setViewingDay(null);   // close detail so list re-renders with fresh data
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save meal'));
    } finally {
      setSaving(false);
    }
  };

  const deleteMeal = (id, e) => {
    e?.stopPropagation();
    setConfirm({
      title: 'Delete Meal?',
      message: 'This removes the calories and macros from your history.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/health/meals/${id}`);
          toast.success('Deleted');
          loadData();
        } catch (err) { toast.error('Failed to delete'); }
      }
    });
  };

  // --- Metrics Handlers ---
  const openMetrics = (e, targetDate, existingMetric) => {
    e?.stopPropagation();
    const date = targetDate || TODAY;
    const m    = existingMetric;
    if (m) {
      setMetricsForm({ date, water_ml: m.water_ml, nutrition_quality: m.nutrition_quality, notes: m.notes || '' });
    } else {
      setMetricsForm({ date, water_ml: 2000, nutrition_quality: 7, notes: '' });
    }
    setShowMetricsModal(true);
  };

  const saveMetrics = async () => {
    setSaving(true);
    try {
      await API.post('/health/metrics', metricsForm);
      toast.success('Hydration saved');
      setShowMetricsModal(false);
      setViewingDay(null);   // close detail so list re-renders with fresh data
      loadData();
    } catch (err) {
      toast.error('Failed to save metrics');
    } finally {
      setSaving(false);
    }
  };

  // Group meals by date
  const groupedMeals = meals.reduce((acc, m) => {
    if (!acc[m.date]) acc[m.date] = [];
    acc[m.date].push(m);
    return acc;
  }, {});

  const dates = [...new Set([...metrics.map(m => m.date), ...Object.keys(groupedMeals)])].sort().reverse();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 20, marginBottom: 4 }}>🥗 Nutrition & Fuel</h3>
          <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Fuel the machine. Track intake and calories.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={openMetrics} style={{ borderRadius: 30 }}>Add Daily Water</button>
          <button className="btn btn-primary" onClick={openAddMeal} style={{ borderRadius: 30 }}>+ Log Meal</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />)}
        </div>
      ) : dates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🥗</div>
          <h3>No nutrition data</h3>
          <p>Start logging your meals and hydration to see totals.</p>
          <button className="btn btn-primary" onClick={openAddMeal} style={{ borderRadius: 30 }}>+ Log First Meal</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {dates.map(date => {
            const dayMetrics = metrics.find(m => m.date === date);
            const dayMeals = groupedMeals[date] || [];
            const tCals = dayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
            const tPro = dayMeals.reduce((acc, m) => acc + (m.protein_g || 0), 0);

            return (
              <div key={date} className="card" onClick={() => setViewingDay({ date, dayMetrics, dayMeals })} style={{
                padding: '20px',
                cursor: 'pointer',
                borderTop: '5px solid var(--gold)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(13,13,13,0.3)', textTransform: 'uppercase', letterSpacing: 1.5 }}>{date}</div>
                  {dayMetrics && <span style={{ fontSize: 12 }}>💧 {dayMetrics.water_ml}ml</span>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{tCals}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.4 }}>TOTAL CALORIES</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{tPro}g</div>
                    <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.4 }}>PROTEIN</div>
                  </div>
                </div>

                {/* Meal name chips preview */}
                {dayMeals.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(13,13,13,0.05)', paddingTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {dayMeals.slice(0, 4).map(m => (
                      <span key={m.id} style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 8px',
                        background: 'rgba(13,13,13,0.05)', borderRadius: 20,
                        color: 'rgba(13,13,13,0.6)', maxWidth: 110,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {m.meal_type[0]}· {m.notes || m.meal_type}
                      </span>
                    ))}
                    {dayMeals.length > 4 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(13,13,13,0.4)', padding: '3px 6px' }}>+{dayMeals.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Nutrition Detail Modal (Content View) */}
      {viewingDay && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewingDay(null)}>
          <div className="modal" style={{ maxWidth: 550, padding: 32 }}>
            <div className="modal-header" style={{ marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                  NUTRITION BREAKDOWN
                </div>
                <h2 style={{ margin: 0, fontFamily: 'Fraunces', fontSize: 32 }}>{viewingDay.date}</h2>
              </div>
              <button className="modal-close" onClick={() => setViewingDay(null)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
              {[
                { label: 'CALORIES', val: viewingDay.dayMeals.reduce((acc, m) => acc + (m.calories || 0), 0), unit: 'kcal' },
                { label: 'PROTEIN', val: viewingDay.dayMeals.reduce((acc, m) => acc + (m.protein_g || 0), 0), unit: 'g' },
                { label: 'CARBS', val: viewingDay.dayMeals.reduce((acc, m) => acc + (m.carbs_g || 0), 0), unit: 'g' },
                { label: 'FAT', val: viewingDay.dayMeals.reduce((acc, m) => acc + (m.fat_g || 0), 0), unit: 'g' }
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(13,13,13,0.02)', borderRadius: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.4, marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{stat.val}</div>
                </div>
              ))}
            </div>

            {viewingDay.dayMetrics ? (
              <div style={{ display: 'flex', gap: 16, padding: '16px 20px', background: 'rgba(91,139,168,0.06)', borderRadius: 16, marginBottom: 32, alignItems: 'center' }}>
                <div style={{ fontSize: 24 }}>💧</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#5b8ba8', letterSpacing: 1 }}>HYDRATION</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{viewingDay.dayMetrics.water_ml} <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.6 }}>ml</span></div>
                  {viewingDay.dayMetrics.nutrition_quality && (
                    <div style={{ fontSize: 11, color: '#5b8ba8', fontWeight: 700, marginTop: 2 }}>Quality: {viewingDay.dayMetrics.nutrition_quality}/10</div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); openMetrics(e, viewingDay.date, viewingDay.dayMetrics); }}
                  title="Edit hydration"
                  style={{ background: 'none', border: '1.5px solid rgba(91,139,168,0.3)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 14, color: '#5b8ba8' }}
                >✎</button>
              </div>
            ) : (
              <button
                className="btn btn-outline"
                onClick={(e) => openMetrics(e, viewingDay.date, null)}
                style={{ width: '100%', borderRadius: 12, marginBottom: 32, color: '#5b8ba8', borderColor: 'rgba(91,139,168,0.3)' }}
              >💧 Add Hydration for this day</button>
            )}

            <h4 style={{ fontSize: 12, fontWeight: 800, opacity: 0.4, textTransform: 'uppercase', marginBottom: 16 }}>Meal History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {viewingDay.dayMeals.map(m => {
                const MEAL_COLORS = { Breakfast: '#f97316', Lunch: '#059669', Dinner: '#7c3aed', Snack: '#db2777' };
                const mc = MEAL_COLORS[m.meal_type] || '#6b7280';
                return (
                  <div key={m.id} style={{
                    borderLeft: `4px solid ${mc}`,
                    borderRadius: 14,
                    background: 'white',
                    border: `1px solid ${mc}20`,
                    borderLeftWidth: 4,
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: mc, textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>{m.meal_type}</span>
                        <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.notes || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'rgba(13,13,13,0.5)', fontWeight: 700 }}>
                        <span>{m.protein_g}g P</span>
                        <span>{m.carbs_g}g C</span>
                        <span>{m.fat_g}g F</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 900 }}>{m.calories}<span style={{ fontSize: 10, fontWeight: 400, marginLeft: 2, opacity: 0.5 }}>kcal</span></div>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditMeal(m, e); }}
                        title="Edit meal"
                        style={{ background: 'none', border: '1.5px solid rgba(13,13,13,0.12)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 13, color: 'rgba(13,13,13,0.4)' }}
                      >✎</button>
                      <button
                        onClick={(e) => deleteMeal(m.id, e)}
                        title="Delete meal"
                        style={{ background: 'none', border: 'none', color: 'rgba(13,13,13,0.2)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                      >×</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="btn btn-outline" style={{ marginTop: 32, width: '100%', borderRadius: 30 }} onClick={openAddMeal}>+ Log Another Meal</button>
          </div>
        </div>
      )}

      {/* Daily Metrics Modal */}
      {showMetricsModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowMetricsModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header"><h3>Daily Overview</h3><button className="modal-close" onClick={() => setShowMetricsModal(false)}>✕</button></div>
            <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={metricsForm.date} onChange={e => setMetricsForm({ ...metricsForm, date: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Water Intake (ml)</label><input type="number" step="100" className="form-input" value={metricsForm.water_ml} onChange={e => setMetricsForm({ ...metricsForm, water_ml: Number(e.target.value) })} /></div>
            <div className="form-group"><label className="form-label">Nutrition Quality (1-10)</label><input type="number" min="1" max="10" className="form-input" value={metricsForm.nutrition_quality} onChange={e => setMetricsForm({ ...metricsForm, nutrition_quality: Number(e.target.value) })} /></div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}><button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowMetricsModal(false)}>Cancel</button><button className="btn btn-primary" style={{ flex: 1 }} onClick={saveMetrics}>Save</button></div>
          </div>
        </div>
      )}

      {/* Meal Modal */}
      {showMealModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowMealModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header"><h3>{editingMealId ? '✎ Edit Meal' : 'Log Meal'}</h3><button className="modal-close" onClick={() => setShowMealModal(false)}>✕</button></div>

            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={mealForm.date} onChange={e => setMealForm({ ...mealForm, date: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Meal Type</label>
                <select className="form-input" value={mealForm.meal_type} onChange={e => setMealForm({ ...mealForm, meal_type: e.target.value })}>
                  {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group"><label className="form-label">Total Calories</label><input type="number" className="form-input" value={mealForm.calories} onChange={e => setMealForm({ ...mealForm, calories: Number(e.target.value) })} /></div>

            <div className="grid-3" style={{ gap: 12 }}>
              <div className="form-group"><label className="form-label">Protein (g)</label><input type="number" className="form-input" value={mealForm.protein_g} onChange={e => setMealForm({ ...mealForm, protein_g: Number(e.target.value) })} /></div>
              <div className="form-group"><label className="form-label">Carbs (g)</label><input type="number" className="form-input" value={mealForm.carbs_g} onChange={e => setMealForm({ ...mealForm, carbs_g: Number(e.target.value) })} /></div>
              <div className="form-group"><label className="form-label">Fat (g)</label><input type="number" className="form-input" value={mealForm.fat_g} onChange={e => setMealForm({ ...mealForm, fat_g: Number(e.target.value) })} /></div>
            </div>

            <div className="form-group"><label className="form-label">What did you eat?</label><input type="text" className="form-input" value={mealForm.notes} onChange={e => setMealForm({ ...mealForm, notes: e.target.value })} placeholder="Chicken, Rice..." /></div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}><button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowMealModal(false)}>Cancel</button><button className="btn btn-primary" style={{ flex: 1 }} onClick={saveMeal} disabled={saving}>{saving ? 'Saving...' : 'Save Meal'}</button></div>
          </div>
        </div>
      )}

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

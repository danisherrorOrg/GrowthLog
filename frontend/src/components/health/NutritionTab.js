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
  const openAddMeal = () => {
    setEditingMealId(null);
    setMealForm({ date: TODAY, meal_type: 'Breakfast', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, notes: '' });
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
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save meal'));
    } finally {
      setSaving(false);
    }
  };

  const deleteMeal = (id) => {
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
  const openMetrics = () => {
    const todayMetric = metrics.find(m => m.date === TODAY);
    if (todayMetric) {
      setMetricsForm({ date: TODAY, water_ml: todayMetric.water_ml, nutrition_quality: todayMetric.nutrition_quality, notes: todayMetric.notes || '' });
    } else {
      setMetricsForm({ date: TODAY, water_ml: 2000, nutrition_quality: 7, notes: '' });
    }
    setShowMetricsModal(true);
  };

  const saveMetrics = async () => {
    setSaving(true);
    try {
      await API.post('/health/metrics', metricsForm);
      toast.success('Daily metrics saved');
      setShowMetricsModal(false);
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
          <h3 style={{ fontSize: 20, marginBottom: 4 }}>💧 Nutrition & Water</h3>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {dates.map(date => {
            const dayMetrics = metrics.find(m => m.date === date);
            const dayMeals = groupedMeals[date] || [];
            
            // Calc totals
            const tCals = dayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
            const tPro = dayMeals.reduce((acc, m) => acc + (m.protein_g || 0), 0);
            const tCarbs = dayMeals.reduce((acc, m) => acc + (m.carbs_g || 0), 0);
            const tFat = dayMeals.reduce((acc, m) => acc + (m.fat_g || 0), 0);

            return (
              <div key={date} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: 1.5 }}>{date}</div>
                  {dayMetrics && (
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 700 }}>
                      <span style={{ color: '#5b8ba8' }}>💧 {dayMetrics.water_ml} ml</span>
                      <span style={{ color: dayMetrics.nutrition_quality >= 8 ? 'var(--sage)' : 'var(--rust)' }}>Quality: {dayMetrics.nutrition_quality}/10</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 16, padding: '16px', background: 'rgba(13,13,13,0.02)', borderRadius: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.5, fontWeight: 700 }}>Calories</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{tCals}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.5, fontWeight: 700 }}>Protein</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{tPro}g</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.5, fontWeight: 700 }}>Carbs</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{tCarbs}g</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.5, fontWeight: 700 }}>Fat</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{tFat}g</div>
                  </div>
                </div>

                {dayMeals.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dayMeals.map(m => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid rgba(13,13,13,0.05)', borderRadius: 8, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 11, background: 'rgba(13,13,13,0.04)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{m.meal_type}</span>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{m.notes || 'Unnamed Meal'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{m.calories} kcal</span>
                          <span style={{ fontSize: 11, opacity: 0.5 }}>{m.protein_g}p / {m.carbs_g}c / {m.fat_g}f</span>
                          <button onClick={() => deleteMeal(m.id)} style={{ background: 'none', border: 'none', color: 'rgba(13,13,13,0.3)', cursor: 'pointer' }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Daily Metrics Modal */}
      {showMetricsModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowMetricsModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header"><h3>Daily Overview</h3><button className="modal-close" onClick={() => setShowMetricsModal(false)}>✕</button></div>
            <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={metricsForm.date} onChange={e => setMetricsForm({...metricsForm, date: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Water Intake (ml)</label><input type="number" step="100" className="form-input" value={metricsForm.water_ml} onChange={e => setMetricsForm({...metricsForm, water_ml: Number(e.target.value)})} /></div>
            <div className="form-group"><label className="form-label">Nutrition Quality (1-10)</label><input type="number" min="1" max="10" className="form-input" value={metricsForm.nutrition_quality} onChange={e => setMetricsForm({...metricsForm, nutrition_quality: Number(e.target.value)})} /></div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}><button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowMetricsModal(false)}>Cancel</button><button className="btn btn-primary" style={{ flex: 1 }} onClick={saveMetrics}>Save</button></div>
          </div>
        </div>
      )}

      {/* Meal Modal */}
      {showMealModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowMealModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header"><h3>Log Meal</h3><button className="modal-close" onClick={() => setShowMealModal(false)}>✕</button></div>
            
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={mealForm.date} onChange={e => setMealForm({...mealForm, date: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Meal Type</label>
                <select className="form-input" value={mealForm.meal_type} onChange={e => setMealForm({...mealForm, meal_type: e.target.value})}>
                  {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group"><label className="form-label">Total Calories</label><input type="number" className="form-input" value={mealForm.calories} onChange={e => setMealForm({...mealForm, calories: Number(e.target.value)})} /></div>
            
            <div className="grid-3" style={{ gap: 12 }}>
              <div className="form-group"><label className="form-label">Protein (g)</label><input type="number" className="form-input" value={mealForm.protein_g} onChange={e => setMealForm({...mealForm, protein_g: Number(e.target.value)})} /></div>
              <div className="form-group"><label className="form-label">Carbs (g)</label><input type="number" className="form-input" value={mealForm.carbs_g} onChange={e => setMealForm({...mealForm, carbs_g: Number(e.target.value)})} /></div>
              <div className="form-group"><label className="form-label">Fat (g)</label><input type="number" className="form-input" value={mealForm.fat_g} onChange={e => setMealForm({...mealForm, fat_g: Number(e.target.value)})} /></div>
            </div>

            <div className="form-group"><label className="form-label">What did you eat?</label><input type="text" className="form-input" value={mealForm.notes} onChange={e => setMealForm({...mealForm, notes: e.target.value})} placeholder="Chicken, Rice..." /></div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}><button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowMealModal(false)}>Cancel</button><button className="btn btn-primary" style={{ flex: 1 }} onClick={saveMeal} disabled={saving}>{saving ? 'Saving...' : 'Save Meal'}</button></div>
          </div>
        </div>
      )}
      
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

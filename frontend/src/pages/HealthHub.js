import { useState } from 'react';
import SleepTab from '../components/health/SleepTab';
import WorkoutLogTab from '../components/health/WorkoutLogTab';
import NutritionTab from '../components/health/NutritionTab';
import ExerciseGoalsTab from '../components/health/ExerciseGoalsTab';
import BodyMapVisualizer from '../components/health/BodyMapVisualizer';

const TABS = [
  { id: 'sleep', label: 'Sleep & Recovery', icon: '💤' },
  { id: 'workouts', label: 'Workout Log', icon: '💪' },
  { id: 'goals', label: 'Exercise Goals', icon: '🎯' },
  { id: 'nutrition', label: 'Nutrition & Water', icon: '💧' },
  { id: 'bodymap', label: 'Body Map', icon: '🧍' },
];

export default function HealthHub() {
  const [activeTab, setActiveTab] = useState('workouts');

  return (
    <div>
      <div className="page-header">
        <h2>Health & Body 🧬</h2>
        <p>Monitor your physical vessel: sleep, nutrition, workouts, and track muscle progression.</p>
      </div>

      <div className="page-body">
        {/* Navigation Tabs */}
        <div className="wrap-on-mobile" style={{ display: 'flex', gap: 5, background: 'var(--mist)', padding: 4, borderRadius: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? 'var(--ink)' : 'rgba(13,13,13,0.45)',
              boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'sleep' && <SleepTab />}
        {activeTab === 'workouts' && <WorkoutLogTab />}
        {activeTab === 'goals' && <ExerciseGoalsTab />}
        {activeTab === 'nutrition' && <NutritionTab />}
        {activeTab === 'bodymap' && <BodyMapVisualizer />}
      </div>
    </div>
  );
}

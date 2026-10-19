import { useState } from 'react';
import AntiGoalsTab from '../components/insights/AntiGoalsTab';
import HabitGraveyardTab from '../components/insights/HabitGraveyardTab';
import HoursLogTab, { TIME_TRACKING, SCREEN_TIME } from '../components/insights/HoursLogTab';
import ProcrastinationTab from '../components/insights/ProcrastinationTab';
import NotToDoTab from '../components/insights/NotToDoTab';
import TriggerJournalTab from '../components/insights/TriggerJournalTab';
import BadDecisionsTab from '../components/insights/BadDecisionsTab';
import WeaknessMapTab from '../components/insights/WeaknessMapTab';

const TABS = [
  { id: 'anti-goals', label: 'Anti-Goals', icon: '🚫', color: 'var(--rust)' },
  { id: 'graveyard', label: 'Habit Graveyard', icon: '🪦', color: '#8b6bc4' },
  { id: 'time', label: 'Time Tracking', icon: '⏱', color: 'var(--sage)' },
  { id: 'screen', label: 'Screen Time', icon: '📱', color: '#5b8ba8' },
  { id: 'procrastination', label: 'Procrastination', icon: '😬', color: '#c9a84c' },
  { id: 'nottodo', label: 'Not-to-do', icon: '🚷', color: '#c4623a' },
  { id: 'triggers', label: 'Trigger Journal', icon: '🎯', color: '#e05a77' },
  { id: 'decisions', label: 'Bad Decisions', icon: '💀', color: '#7a5c8a' },
  { id: 'weaknesses', label: 'Weakness Map', icon: '🧩', color: '#b87333' },
];

export default function Insights() {
  const [activeTab, setActiveTab] = useState('anti-goals');

  return (
    <div>
      <div className="page-header">
        <h2>Insight Lab 🔬</h2>
        <p>Clarity through contrast — define what you reject, track your time, and learn from patterns.</p>
      </div>

      <div className="page-body">
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 32, background: 'var(--mist)', padding: 4, borderRadius: 14, flexWrap: 'wrap' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="insights-tab-btn" style={{
              padding: '9px 15px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? tab.color : 'rgba(13,13,13,0.45)',
              boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span className="tab-icon" style={{ fontSize: 14 }}>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'anti-goals' && <AntiGoalsTab />}
        {activeTab === 'graveyard' && <HabitGraveyardTab />}
        {activeTab === 'time' && <HoursLogTab key="time" config={TIME_TRACKING} />}
        {activeTab === 'screen' && <HoursLogTab key="screen" config={SCREEN_TIME} />}
        {activeTab === 'procrastination' && <ProcrastinationTab />}
        {activeTab === 'nottodo' && <NotToDoTab />}
        {activeTab === 'triggers' && <TriggerJournalTab />}
        {activeTab === 'decisions' && <BadDecisionsTab />}
        {activeTab === 'weaknesses' && <WeaknessMapTab />}
      </div>
    </div>
  );
}

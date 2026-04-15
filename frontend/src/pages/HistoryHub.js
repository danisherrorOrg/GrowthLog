import { useState } from 'react';
import LogHistoryTab from '../components/history/LogHistoryTab';
import ActivityLogTab from '../components/history/ActivityLogTab';
import CalendarTimelineTab from '../components/history/CalendarTimelineTab';

const TABS = [
  { id: 'timeline', label: 'Timeline', icon: '📅' },
  { id: 'logs', label: 'Daily Logs', icon: '📂' },
  { id: 'activity', label: 'Audit Trail', icon: '⚡' },
];

export default function HistoryHub() {
  const [activeTab, setActiveTab] = useState('timeline');

  return (
    <div>
      <div className="page-header">
        <h2>History & Timeline 🕰️</h2>
        <p>A chronological archive of your growth, reflections, and system activity.</p>
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
        {activeTab === 'timeline' && <CalendarTimelineTab />}
        {activeTab === 'logs' && <LogHistoryTab />}
        {activeTab === 'activity' && <ActivityLogTab />}
      </div>
    </div>
  );
}

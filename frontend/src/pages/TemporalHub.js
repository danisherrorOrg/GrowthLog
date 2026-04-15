import { useState } from 'react';
import SnapshotsTab from '../components/temporal/SnapshotsTab';
import TimeCapsuleTab from '../components/temporal/TimeCapsuleTab';

const TABS = [
  { id: 'snapshots', label: 'Current Snapshots', icon: '○' },
  { id: 'timecapsule', label: 'Time Capsule', icon: '⏳' },
];

export default function TemporalHub() {
  const [activeTab, setActiveTab] = useState('snapshots');

  return (
    <div>
      <div className="page-header">
        <h2>Temporal Space 🕰️</h2>
        <p>Capture who you are today, compare it to your past, and send messages to your future.</p>
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
        {activeTab === 'snapshots' && <SnapshotsTab />}
        {activeTab === 'timecapsule' && <TimeCapsuleTab />}
      </div>
    </div>
  );
}

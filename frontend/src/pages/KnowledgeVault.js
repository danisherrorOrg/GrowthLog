import { useState } from 'react';
import LibraryTab from '../components/knowledge/LibraryTab';
import CoursesTab from '../components/knowledge/CoursesTab';
import QuoteVaultTab from '../components/knowledge/QuoteVaultTab';

const TABS = [
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'courses', label: 'Courses', icon: '🎓' },
  { id: 'quotes', label: 'Motivation Vault', icon: '🗝️' },
];

export default function KnowledgeVault() {
  const [activeTab, setActiveTab] = useState('library');

  return (
    <div>
      <div className="page-header">
        <h2>Knowledge Vault 🧠</h2>
        <p>A central repository for books, quotes, insights, and continuous learning.</p>
      </div>

      <div className="page-body">
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 5, background: 'var(--mist)', padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 24 }}>
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
        {activeTab === 'library' && <LibraryTab />}
        {activeTab === 'courses' && <CoursesTab />}
        {activeTab === 'quotes' && <QuoteVaultTab />}
      </div>
    </div>
  );
}

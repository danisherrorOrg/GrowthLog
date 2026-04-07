import { useState } from 'react';
import { format } from 'date-fns';
import API from '../utils/api';
import toast from 'react-hot-toast';

export default function DayDetailSidePanel({ date, events, onClose, quickAdd }) {
  const [reflectionText, setReflectionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!date) return null;

  const handleQuickAdd = async () => {
    if (!reflectionText.trim()) return;
    setIsSubmitting(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      // Find existing log entries if any
      const existingLog = events.find(e => e.type === 'daily_log');
      const existingEntries = existingLog?.data?.entries || [];
      const newEntry = { 
        category_id: quickAdd.category_id || (events.find(e => e.category)?.category?.id), 
        text: reflectionText 
      };

      // Note: We need the actual category ID. If not in quickAdd, we try to find it from the event.
      // For this implementation, we'll assume the backend enriched 'id' is available or use a fallback.
      
      const payload = {
        date: dateStr,
        entries: [...existingEntries.map(e => ({ category_id: e.category_id, text: e.text })), newEntry],
        highlight: existingLog?.description || '',
        overall_rating: existingLog?.data?.mood || 5
      };

      await API.post('/logs', payload);
      toast.success('Reflection added to your journey!');
      setReflectionText('');
      onClose(); // Close and triggers refresh in parent
    } catch (err) {
      toast.error('Failed to save reflection');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)', zIndex: 999 }} 
        onClick={onClose} 
      />
      <div 
        style={{ 
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px', maxWidth: '100vw', 
          background: '#fdfcf9', zIndex: 1000, boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
          padding: '32px 24px', overflowY: 'auto',
          animation: 'slideIn 0.3s ease-out'
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
        `}} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, letterSpacing: '1px' }}>SELECTED DATE</div>
            <h2 style={{ margin: 0, fontFamily: 'serif', fontSize: '24px' }}>{format(date, 'MMMM do, yyyy')}</h2>
        </div>
            <button 
                onClick={onClose} 
                style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#888', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
                onMouseOver={el => el.currentTarget.style.background = '#eee'}
                onMouseOut={el => el.currentTarget.style.background = 'none'}
            >
                &times;
            </button>
        </div>

        {quickAdd && (
            <div style={{ 
                background: '#fff', padding: '20px', borderRadius: '16px', border: `1px solid ${quickAdd.category?.color || '#eee'}`,
                marginBottom: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '18px' }}>{quickAdd.category?.icon || '📝'}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: quickAdd.category?.color || '#333' }}>
                        QUICK REFLECTION: {quickAdd.category?.name.toUpperCase() || 'GENERAL'}
                    </span>
                </div>
                <textarea 
                    placeholder="What happened today? Capture a quick reflection..."
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    style={{ 
                        width: '100%', minHeight: '100px', padding: '12px', borderRadius: '12px', 
                        border: '1px solid #eee', outline: 'none', fontSize: '14px', fontFamily: 'inherit',
                        resize: 'none', marginBottom: '12px'
                    }}
                />
                <button 
                    onClick={handleQuickAdd}
                    disabled={isSubmitting || !reflectionText.trim()}
                    style={{ 
                        width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                        background: quickAdd.category?.color || '#333', color: 'white',
                        fontWeight: 600, cursor: 'pointer', opacity: (isSubmitting || !reflectionText.trim()) ? 0.5 : 1
                    }}
                >
                    {isSubmitting ? 'Saving...' : 'Save Growth Entry'}
                </button>
            </div>
        )}

        {(!events || events.length === 0) ? (
            <div style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🍃</div>
                <p>No other activity logged on this day.</p>
            </div>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '-8px' }}>
                    Daily Summary
                </div>
                {events.map(e => {
                    const typeConfig = {
                        daily_log: { color: '#6b8c6b', icon: '🔥' },
                        goal_created: { color: '#4a90e2', icon: '✨' },
                        goal_completed: { color: '#2a9d8f', icon: '✅' },
                        goal_deadline: { color: '#f4a261', icon: '🎯' },
                        snapshot: { color: '#9b5de5', icon: '📸' },
                        milestone: { color: '#ffb703', icon: '★' },
                        manifestation_started: { color: '#e76f51', icon: '💫' },
                        manifestation_target: { color: '#e76f51', icon: '🎯' },
                    };
                    const config = typeConfig[e.type] || { color: '#888', icon: '•' };

                    return (
                        <div key={e.id} style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{config.icon}</span>
                                    <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px' }}>
                                        {e.type.replace('_', ' ')}
                                    </div>
                                </div>
                                {e.data && e.data.mood && (
                                    <div style={{ fontSize: '12px', background: '#f5f5f5', padding: '2px 8px', borderRadius: 12, color: '#666' }}>
                                        Mood: {e.data.mood}/10
                                    </div>
                                )}
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#111', fontFamily: 'serif' }}>{e.title}</div>
                            {e.description && <div style={{ fontSize: '15px', color: '#555', lineHeight: 1.5, marginBottom: e.data?.entries ? 16 : 0 }}>{e.description}</div>}
                            
                            {e.type === 'daily_log' && e.data?.entries && e.data.entries.length > 0 && (
                                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
                                    {Object.entries(
                                        e.data.entries.reduce((acc, entry) => {
                                            const catName = entry.category?.name || 'General';
                                            if (!acc[catName]) acc[catName] = { 
                                                entries: [], 
                                                icon: entry.category?.icon || '📁', 
                                                color: entry.category?.color || '#888' 
                                            };
                                            acc[catName].entries.push(entry);
                                            return acc;
                                        }, {})
                                    ).map(([catName, group]) => (
                                        <div key={catName} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '14px' }}>{group.icon}</span>
                                                <span style={{ fontSize: '11px', color: group.color, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                                    {catName}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
                                                {group.entries.map((entry, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '10px' }}>
                                                        <div style={{ minWidth: '3px', background: group.color, borderRadius: 2, opacity: 0.4 }} />
                                                        <div style={{ fontSize: '14px', color: '#444', lineHeight: 1.4 }}>{entry.text}</div>
                                                    </div>
                                                ))}
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
      </div>
    </>
  );
}

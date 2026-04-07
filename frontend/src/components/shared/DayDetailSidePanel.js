import { format } from 'date-fns';

export default function DayDetailSidePanel({ date, events, onClose }) {
  if (!date) return null;

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
                onMouseOver={e => e.currentTarget.style.background = '#eee'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
                &times;
            </button>
        </div>

        {(!events || events.length === 0) ? (
            <div style={{ textAlign: 'center', color: '#888', marginTop: 100 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🍃</div>
                <p>No activity logged on this day.</p>
            </div>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '-8px' }}>
                    Daily Summary
                </div>
                {events.map(e => (
                    <div key={e.id} style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px' }}>
                                {e.type.replace('_', ' ')}
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
                ))}
            </div>
        )}
      </div>
    </>
  );
}

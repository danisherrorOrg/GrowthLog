import { format } from 'date-fns';

export default function JourneyFeed({ events }) {
  if (!events || events.length === 0) {
    return <div style={{ textAlign: 'center', padding: '60px 40px', color: '#888', background: '#fdfcf9', borderRadius: 16 }}>No events recorded for this period. Keep growing!</div>;
  }

  // Group by date
  const groupedEvents = events.reduce((acc, event) => {
    const date = event.date ? event.date.substring(0, 10) : 'Unknown Date';
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

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

  return (
    <div className="journey-feed" style={{ maxWidth: '640px', margin: '0 auto', position: 'relative', paddingTop: 20 }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '26px', width: '2px', background: 'rgba(0,0,0,0.05)', zIndex: 0 }} />
        
        {Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <div key={date} style={{ position: 'relative', zIndex: 1, marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ width: '54px', textAlign: 'center', position: 'relative' }}>
                        <div style={{ width: '14px', height: '14px', background: '#c9a84c', borderRadius: '50%', border: '3px solid #fdfcf9', margin: '0 auto' }} />
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#333', fontFamily: 'serif' }}>
                        {date !== 'Unknown Date' ? format(new Date(date), 'MMMM do, yyyy') : date}
                    </div>
                </div>
                
                <div style={{ paddingLeft: '54px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {dayEvents.map(e => {
                        const config = typeConfig[e.type] || { color: '#888', icon: '•' };
                        
                        return (
                            <div key={e.id} style={{ 
                                background: 'white', 
                                padding: '20px', 
                                borderRadius: '16px', 
                                boxShadow: '0 2px 12px rgba(0,0,0,0.03)', 
                                border: '1px solid rgba(0,0,0,0.03)',
                                borderLeft: `4px solid ${config.color}`
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '16px' }}>{config.icon}</span>
                                    <span style={{ fontSize: '12px', color: config.color, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                                        {e.type.replace('_', ' ')}
                                    </span>
                                </div>
                                <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '6px', color: '#111' }}>{e.title}</div>
                                {e.description && <div style={{ fontSize: '15px', color: '#555', lineHeight: 1.5 }}>{e.description}</div>}
                                
                                {e.data && e.data.mood && (
                                    <div style={{ marginTop: '12px', fontSize: '13px', color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: 6 }}>Mood: {e.data.mood}/10</div>
                                        {e.data.entries_count && <div style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: 6 }}>{e.data.entries_count} Entries</div>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        ))}
    </div>
  );
}

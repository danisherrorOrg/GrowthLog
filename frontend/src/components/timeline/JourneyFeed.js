import { format } from 'date-fns';

export default function JourneyFeed({ events, onEventClick }) {
  if (!events || events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 40px', color: '#888', background: '#fdfcf9', borderRadius: 24, border: '2px dashed #eee' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
        <h3 style={{ fontFamily: 'serif', color: '#333' }}>No growth events found</h3>
        <p>Try adjusting your search or filters to see more of your journey.</p>
      </div>
    );
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
        <style dangerouslySetInnerHTML={{__html: `
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .event-card {
                animation: fadeInUp 0.5s ease-out forwards;
            }
        `}} />
        
        <h3 style={{ 
            fontFamily: 'serif', 
            fontSize: '24px', 
            color: '#111', 
            marginBottom: '32px', 
            paddingLeft: '54px'
        }}>
            Journey Timeline
        </h3>
        <div style={{ position: 'absolute', top: '70px', bottom: 0, left: '26px', width: '2px', background: 'rgba(0,0,0,0.05)', zIndex: 0 }} />
        
        {Object.entries(groupedEvents).map(([date, dayEvents], dayIdx) => {
            const moodSum = dayEvents.reduce((acc, e) => acc + (e.data?.mood || 0), 0);
            const moodAvg = dayEvents.some(e => e.data?.mood) ? (moodSum / dayEvents.filter(e => e.data?.mood).length).toFixed(1) : null;
            const uniqueCats = [...new Set(dayEvents.filter(e => e.category).map(e => e.category.name))];

            return (
                <div key={date} style={{ position: 'relative', zIndex: 1, marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ width: '54px', textAlign: 'center', position: 'relative' }}>
                            <div style={{ width: '14px', height: '14px', background: '#c9a84c', borderRadius: '50%', border: '3px solid #fdfcf9', margin: '0 auto' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ fontSize: '10px', color: '#999', fontWeight: 600, letterSpacing: '1px' }}>DATE</div>
                                <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#333', fontFamily: 'serif' }}>
                                    {date !== 'Unknown Date' ? format(new Date(date), 'MMMM do, yyyy') : date}
                                </div>
                            </div>
                            
                            {/* Daily Highlights / Insights */}
                            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#888', fontWeight: 500 }}>
                                {moodAvg && <span style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: '6px' }}>Avg Mood: {moodAvg}</span>}
                                {uniqueCats.length > 0 && <span style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: '6px' }}>{uniqueCats.join(', ')}</span>}
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ paddingLeft: '54px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {dayEvents.map((e, eventIdx) => {
                            const config = typeConfig[e.type] || { color: '#888', icon: '•' };
                            
                            return (
                                <div 
                                    key={e.id} 
                                    className="event-card"
                                    onClick={() => onEventClick && onEventClick(e)}
                                    style={{ 
                                        background: 'white', 
                                        padding: '20px', 
                                        borderRadius: '16px', 
                                        boxShadow: '0 2px 12px rgba(0,0,0,0.03)', 
                                        border: '1px solid rgba(0,0,0,0.03)',
                                        borderLeft: `4px solid ${config.color}`,
                                        cursor: onEventClick ? 'pointer' : 'default',
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                        animationDelay: `${(dayIdx * 2 + eventIdx) * 0.1}s`,
                                        position: 'relative'
                                    }}
                                    onMouseOver={el => {
                                        el.currentTarget.style.transform = 'translateY(-2px)';
                                        el.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)';
                                    }}
                                    onMouseOut={el => {
                                        el.currentTarget.style.transform = 'translateY(0)';
                                        el.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.03)';
                                    }}
                                >
                                    {/* Quick Action Button */}
                                    <button 
                                        onClick={(ev) => {
                                            ev.stopPropagation();
                                            onEventClick({ ...e, action: 'quick_add' });
                                        }}
                                        title="Quick Reflection"
                                        style={{ 
                                            position: 'absolute', top: '16px', right: '16px', 
                                            width: '28px', height: '28px', borderRadius: '50%', 
                                            border: '1px solid #eee', background: 'white', 
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', 
                                            justifyContent: 'center', fontSize: '18px', color: '#999'
                                        }}
                                        onMouseOver={el => { el.currentTarget.style.background = '#f9f9f9'; el.currentTarget.style.color = config.color; }}
                                        onMouseOut={el => { el.currentTarget.style.background = 'white'; el.currentTarget.style.color = '#999'; }}
                                    >
                                        +
                                    </button>

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
            );
        })}
    </div>
  );
}

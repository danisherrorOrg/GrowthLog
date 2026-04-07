import { eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, isSameMonth, isToday } from 'date-fns';

export default function CalendarView({ events, period, onDayClick }) {
  const monthStart = startOfMonth(period);
  const monthEnd = endOfMonth(period);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getIndicators = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayEvents = events.filter(e => {
        const ed = e.date ? e.date.substring(0, 10) : null;
        return ed === dayStr;
    });
    
    let hasLog = false;
    let hasGoalCompletion = false;
    let hasSnapshot = false;
    let hasDeadline = false;
    let hasMilestone = false;
    
    dayEvents.forEach(e => {
      if (e.type === 'daily_log') hasLog = true;
      if (e.type === 'goal_completed' || e.type === 'manifestation_target') hasGoalCompletion = true;
      if (e.type === 'snapshot') hasSnapshot = true;
      if (e.type === 'goal_deadline') hasDeadline = true;
      if (e.type === 'milestone') hasMilestone = true;
    });

    return { hasLog, hasGoalCompletion, hasSnapshot, hasDeadline, hasMilestone };
  };

  return (
    <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
         <div key={day} style={{ textAlign: 'center', fontWeight: '600', padding: '10px 0', color: '#888', fontSize: '13px', textTransform: 'uppercase' }}>
             {day}
         </div>
      ))}
      {days.map(day => {
        const { hasLog, hasGoalCompletion, hasSnapshot, hasDeadline, hasMilestone } = getIndicators(day);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isCurrentDay = isToday(day);
        
        return (
          <div 
            key={day.toString()} 
            onClick={() => onDayClick(day)}
            style={{
              padding: '12px',
              minHeight: '110px',
              border: isCurrentDay ? '2px solid #c9a84c' : '1px solid rgba(0,0,0,0.05)',
              borderRadius: '12px',
              cursor: 'pointer',
              background: isCurrentMonth ? (isCurrentDay ? '#fdfcf9' : '#fff') : '#fafafa',
              color: isCurrentMonth ? 'inherit' : '#ccc',
              position: 'relative',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: isCurrentMonth ? '0 1px 3px rgba(0,0,0,0.02)' : 'none'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isCurrentMonth ? '0 1px 3px rgba(0,0,0,0.02)' : 'none'; }}
          >
            <div style={{ fontWeight: isCurrentDay ? 'bold' : 'normal', marginBottom: '8px', color: isCurrentDay ? '#c9a84c' : 'inherit' }}>
              {format(day, 'd')}
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
               {hasLog && <span style={{ fontSize: '14px' }} title="Daily Log">🔥</span>}
               {hasGoalCompletion && <span style={{ fontSize: '14px' }} title="Goal Completed">✅</span>}
               {hasSnapshot && <span style={{ fontSize: '14px' }} title="Snapshot Captured">📸</span>}
               {hasDeadline && <span style={{ fontSize: '14px' }} title="Goal Deadline">🎯</span>}
               {hasMilestone && <span style={{ fontSize: '14px' }} title="Milestone">★</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

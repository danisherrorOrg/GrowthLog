import { useState, useEffect, useMemo } from 'react';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import toast from 'react-hot-toast';
import { formatDistanceToNow, parseISO, format } from 'date-fns';

export default function ActivityLog() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    API.get('/activity')
      .then(res => {
        setActivities(res.data);
        if (res.data.length > 0) {
          const firstDate = format(parseISO(res.data[0].created_at), 'yyyy-MM-dd');
          setSelectedDate(firstDate);
        }
      })
      .catch(err => toast.error(getErrorMessage(err, 'Failed to fetch activity history')))
      .finally(() => setLoading(false));
  }, []);

  const { groupedDates, filteredActivities } = useMemo(() => {
    const datesMap = {};
    const sortedActivities = [...activities].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    sortedActivities.forEach(act => {
      const actDate = act.created_at ? format(parseISO(act.created_at), 'yyyy-MM-dd') : null;
      if (actDate) {
        if (!datesMap[actDate]) datesMap[actDate] = 0;
        datesMap[actDate]++;
      }
    });

    const datesList = Object.keys(datesMap).sort((a, b) => b.localeCompare(a));
    const filtered = sortedActivities.filter(act => act.created_at && format(parseISO(act.created_at), 'yyyy-MM-dd') === selectedDate);

    return { groupedDates: datesList.map(d => ({ date: d, count: datesMap[d] })), filteredActivities: filtered };
  }, [activities, selectedDate]);

  if (loading) return <div className="page-body">Loading audit trail...</div>;

  const getActivityIcon = (type) => {
    switch (type) {
      case 'goal': return '◇';
      case 'todo': return '☑';
      case 'reframe': return '🧠';
      case 'book': return '📚';
      case 'quote': return '🗝️';
      case 'daily_log': return '✦';
      case 'snapshot': return '○';
      default: return '◈';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'create': return 'var(--sage)';
      case 'update': return 'var(--gold)';
      case 'delete': return 'var(--rust)';
      case 'complete': return 'var(--sage)';
      default: return 'var(--mist)';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Growth Timeline ⏳</h2>
        <p>A complete audit trail of your changes.</p>
      </div>
      <div className="page-body" style={{ maxWidth: 800 }}>
        {activities.length === 0 ? (
          <div className="empty-state">No activity recorded yet in v3! Try adding a Quote or a Todo to test.</div>
        ) : (
          <div>
            {/* Date Navigator */}
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, marginBottom: 24, WebkitOverflowScrolling: 'touch' }}>
              {groupedDates.map(({ date, count }) => {
                const isSelected = selectedDate === date;
                const d = parseISO(date);
                return (
                  <div 
                    key={date} 
                    onClick={() => setSelectedDate(date)}
                    style={{ 
                      minWidth: 100, 
                      padding: '12px 16px', 
                      borderRadius: 12, 
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--sage)' : '1px solid rgba(13,13,13,0.1)',
                      background: isSelected ? 'rgba(107,140,107,0.08)' : 'white',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                  >
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: isSelected ? 'var(--sage)' : 'rgba(13,13,13,0.4)', fontWeight: isSelected ? 700 : 500 }}>
                      {format(d, 'EEE')}
                    </div>
                    <div style={{ fontSize: 18, fontFamily: 'Fraunces', color: 'var(--ink)', margin: '2px 0 6px' }}>
                      {format(d, 'MMM d')}
                    </div>
                    <div className="tag tag-mist" style={{ fontSize: 10, padding: '2px 8px' }}>
                      {count} items
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Activity List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               {filteredActivities.length === 0 ? (
                 <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(13,13,13,0.5)' }}>No activities found for this date.</div>
               ) : (
                 filteredActivities.map(act => (
                   <div key={act.id} className="card card-sm" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                     <div style={{ 
                       width: 40, height: 40, borderRadius: '50%', background: 'var(--mist)', 
                       display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 
                     }}>
                       {getActivityIcon(act.entity_type)}
                     </div>
                     <div style={{ flex: 1 }}>
                       <div style={{ fontSize: 14 }}>
                         <span className="tag" style={{ background: getActionColor(act.action), color: act.action === 'delete' ? 'white' : 'var(--ink)', padding: '2px 6px', marginRight: 8 }}>
                           {act.action}
                         </span>
                         <strong>{act.entity_type.replace('_', ' ')}</strong>
                       </div>
                       <div style={{ fontSize: 15, color: 'var(--ink)', marginTop: 4 }}>{act.description}</div>
                       <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>
                         {act.created_at ? format(parseISO(act.created_at), 'h:mm a') : 'Recently'}
                       </div>
                     </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

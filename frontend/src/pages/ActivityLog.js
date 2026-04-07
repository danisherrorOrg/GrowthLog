import { useState, useEffect } from 'react';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import toast from 'react-hot-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';

export default function ActivityLog() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/activity')
      .then(res => setActivities(res.data))
      .catch(err => toast.error(getErrorMessage(err, 'Failed to fetch activity history')))
      .finally(() => setLoading(false));
  }, []);

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
             {activities.map(act => (
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
                     <strong>{act.entity_type}</strong>
                   </div>
                   <div style={{ fontSize: 15, color: 'var(--ink)', marginTop: 4 }}>{act.description}</div>
                   <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>
                     {act.created_at ? formatDistanceToNow(parseISO(act.created_at), { addSuffix: true }) : 'Recently'}
                   </div>
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}

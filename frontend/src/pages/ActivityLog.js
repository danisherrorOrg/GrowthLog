import { useState, useEffect, useMemo } from 'react';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import toast from 'react-hot-toast';
import { parseISO, format } from 'date-fns';

const LIMIT = 50;

export default function ActivityLog() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [expandedDate, setExpandedDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchActivities = async (skip = 0) => {
    if (skip === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await API.get(`/activity?limit=${LIMIT}&skip=${skip}`);
      if (skip === 0) {
        setActivities(res.data);
      } else {
        setActivities(prev => [...prev, ...res.data]);
      }
      setHasMore(res.data.length === LIMIT);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to fetch activity history'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleLoadMore = () => {
    fetchActivities(activities.length);
  };

  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const query = searchQuery.toLowerCase();
    return activities.filter(act => 
      act.description.toLowerCase().includes(query) || 
      act.entity_type.toLowerCase().includes(query) ||
      act.action.toLowerCase().includes(query)
    );
  }, [activities, searchQuery]);

  const groupedData = useMemo(() => {
    const groups = {};
    
    filteredActivities.forEach(act => {
      const dateObj = act.created_at ? parseISO(act.created_at) : null;
      if (!dateObj) return;

      const monthKey = format(dateObj, 'MMMM yyyy');
      const dateKey = format(dateObj, 'yyyy-MM-dd');

      if (!groups[monthKey]) groups[monthKey] = { dates: {} };
      if (!groups[monthKey].dates[dateKey]) groups[monthKey].dates[dateKey] = [];
      
      groups[monthKey].dates[dateKey].push(act);
    });

    return groups;
  }, [filteredActivities]);

  const sortedMonths = useMemo(() => {
    return Object.keys(groupedData).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB - dateA;
    });
  }, [groupedData]);

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

  if (loading) return <div className="page-body">Loading audit trail...</div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2>Growth Timeline ⏳</h2>
            <p>Chronological history of your evolution.</p>
          </div>
          <div style={{ position: 'relative', minWidth: 250 }}>
             <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
             <input 
               type="text" 
               className="form-input" 
               placeholder="Search activities..." 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               style={{ paddingLeft: 36, borderRadius: 20, height: 40 }}
             />
          </div>
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 800 }}>
        {activities.length === 0 ? (
          <div className="empty-state">No activity recorded yet! Your story begins here.</div>
        ) : filteredActivities.length === 0 ? (
          <div className="empty-state">No activities match your search.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sortedMonths.map(month => {
              const isMonthExpanded = expandedMonth === month;
              const monthData = groupedData[month];
              const monthDates = Object.keys(monthData.dates).sort((a, b) => b.localeCompare(a));
              const totalMonthActions = Object.values(monthData.dates).flat().length;

              return (
                <div key={month} style={{ 
                  background: 'white', 
                  borderRadius: 20, 
                  border: '1px solid rgba(13,13,13,0.06)', 
                  overflow: 'hidden',
                  boxShadow: isMonthExpanded ? '0 4px 20px rgba(0,0,0,0.03)' : 'none'
                }}>
                  {/* Month Header */}
                  <div 
                    onClick={() => setExpandedMonth(isMonthExpanded ? null : month)}
                    style={{ 
                      padding: '16px 24px', 
                      background: isMonthExpanded ? 'var(--ink)' : 'white', 
                      color: isMonthExpanded ? 'white' : 'var(--ink)',
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: 'Fraunces', fontSize: 18 }}>{month}</span>
                      <span className="tag" style={{ 
                        background: isMonthExpanded ? 'rgba(255,255,255,0.1)' : 'var(--mist)', 
                        color: isMonthExpanded ? 'white' : 'rgba(13,13,13,0.5)', 
                        fontSize: 10 
                      }}>
                        {totalMonthActions} actions
                      </span>
                    </div>
                    <span>{isMonthExpanded ? '▴' : '▾'}</span>
                  </div>

                  {/* Month Content (Dates) */}
                  {isMonthExpanded && (
                    <div style={{ padding: '8px 0' }}>
                      {monthDates.map(date => {
                        const isDateExpanded = expandedDate === date;
                        const items = monthData.dates[date];
                        const d = parseISO(date);

                        return (
                          <div key={date} style={{ borderBottom: '1px solid rgba(0,0,0,0.02)' }}>
                            <div 
                              onClick={() => setExpandedDate(isDateExpanded ? null : date)}
                              style={{ 
                                padding: '12px 24px', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                cursor: 'pointer',
                                background: isDateExpanded ? 'rgba(107,140,107,0.05)' : 'transparent',
                                transition: 'all 0.2s ease'
                              }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                   <div style={{ width: 4, height: 4, background: 'var(--sage)', borderRadius: '50%' }} />
                                   <span style={{ fontSize: 14, fontWeight: isDateExpanded ? 600 : 400, color: 'var(--ink)' }}>
                                     {format(d, 'EEEE, MMM do')}
                                   </span>
                                </div>
                                <span style={{ fontSize: 12, opacity: 0.4 }}>{items.length} items</span>
                            </div>

                            {/* Date Items */}
                            {isDateExpanded && (
                              <div style={{ padding: '0 24px 16px 40px' }}>
                                 {items.map(act => (
                                   <div key={act.id} style={{ 
                                     display: 'flex', 
                                     gap: 12, 
                                     padding: '12px 0', 
                                     borderBottom: '1px solid rgba(13,13,13,0.02)'
                                   }}>
                                      <div style={{ 
                                        width: 32, height: 32, borderRadius: '50%', background: 'var(--mist)', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0
                                      }}>
                                        {getActivityIcon(act.entity_type)}
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13 }}>
                                          <span className="tag" style={{ 
                                            background: getActionColor(act.action), 
                                            color: act.action === 'delete' ? 'white' : 'var(--ink)', 
                                            padding: '1px 6px', 
                                            fontSize: 9, 
                                            marginRight: 8,
                                            textTransform: 'uppercase'
                                          }}>
                                            {act.action}
                                          </span>
                                          <strong>{act.entity_type.replace('_', ' ')}</strong>
                                        </div>
                                        <div style={{ fontSize: 14, marginTop: 4, color: 'var(--ink)' }}>{act.description}</div>
                                        <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 2 }}>
                                          {format(parseISO(act.created_at), 'h:mm a')}
                                        </div>
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
              );
            })}

            {hasMore && (
              <button 
                className="btn btn-outline" 
                onClick={handleLoadMore} 
                disabled={loadingMore}
                style={{ alignSelf: 'center', marginTop: 16, padding: '12px 40px', borderRadius: 30 }}
              >
                {loadingMore ? 'Loading more history...' : 'Load Older History ↓'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

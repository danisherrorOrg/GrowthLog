import { useState, useEffect, useMemo } from 'react';
import API from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';
import toast from 'react-hot-toast';
import { parseISO, format } from 'date-fns';

const LIMIT = 50;

const MODULE_OPTIONS = [
  { value: '', label: 'All Modules' },
  { value: 'goal', label: 'Goals ◇' },
  { value: 'todo', label: 'To-Dos ☑' },
  { value: 'reframe', label: 'Reframes 🧠' },
  { value: 'book', label: 'Library 📚' },
  { value: 'quote', label: 'Quotes 🗝️' },
  { value: 'daily_log', label: 'Daily Logs ✦' },
  { value: 'snapshot', label: 'Snapshots ○' },
  { value: 'category', label: 'Categories ▦' },
  { value: 'manifestation', label: 'Manifestations ✧' },
];

export default function ActivityLog() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [expandedDate, setExpandedDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

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
    let result = activities;
    
    // Module filter
    if (moduleFilter) {
      result = result.filter(act => act.entity_type === moduleFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(act =>
        act.description.toLowerCase().includes(query) ||
        act.entity_type.toLowerCase().includes(query) ||
        act.action.toLowerCase().includes(query)
      );
    }

    return result;
  }, [activities, searchQuery, moduleFilter]);

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
      case 'manifestation': return '✧';
      case 'category': return '▦';
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

  if (loading) return (
    <div className="page-body">
      <div className="skeleton" style={{ height: 60, width: '40%', marginBottom: 32 }} />
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, marginBottom: 16, borderRadius: 16 }} />)}
    </div>
  );

  return (
    <div>
      <div style={{ paddingBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', minWidth: 200 }}>
              <select
                className="form-select"
                value={moduleFilter}
                onChange={e => setModuleFilter(e.target.value)}
                style={{ height: 44, borderRadius: 22, padding: '0 16px 0 36px', fontSize: 13, background: 'var(--paper)' }}
              >
                {MODULE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: 14 }}>📍</span>
            </div>

            <div style={{ position: 'relative', minWidth: 240 }}>
               <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
               <input
                 type="text"
                 className="form-input"
                 placeholder="Search descriptions..."
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 style={{ paddingLeft: 40, borderRadius: 22, height: 44, border: 'none', background: 'var(--paper)' }}
               />
            </div>
          </div>
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 840 }}>
        {activities.length === 0 ? (
          <div className="empty-state">No activity recorded yet! Your story begins here.</div>
        ) : filteredActivities.length === 0 ? (
          <div className="empty-state">No activities match your filters.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {sortedMonths.map(month => {
              const isMonthExpanded = expandedMonth === month || sortedMonths.length === 1; // expand first/only month by default
              const monthData = groupedData[month];
              const monthDates = Object.keys(monthData.dates).sort((a, b) => b.localeCompare(a));
              const totalMonthActions = Object.values(monthData.dates).flat().length;

              return (
                <div key={month} style={{
                  background: 'white',
                  borderRadius: 24,
                  border: '1px solid rgba(13,13,13,0.06)',
                  overflow: 'hidden',
                  boxShadow: isMonthExpanded ? '0 12px 32px rgba(0,0,0,0.04)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {/* Month Header */}
                  <div
                    onClick={() => setExpandedMonth(isMonthExpanded && expandedMonth === month ? null : month)}
                    style={{
                      padding: '24px 32px',
                      background: isMonthExpanded ? 'var(--ink)' : 'white',
                      color: isMonthExpanded ? 'white' : 'var(--ink)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontFamily: 'Fraunces', fontSize: 22 }}>{month}</span>
                      <span className="tag" style={{
                        background: isMonthExpanded ? 'rgba(255,255,255,0.15)' : 'rgba(13,13,13,0.04)',
                        color: isMonthExpanded ? 'white' : 'rgba(13,13,13,0.4)',
                        fontSize: 11,
                        fontWeight: 600
                      }}>
                        {totalMonthActions} entries
                      </span>
                    </div>
                    <span style={{ fontSize: 20 }}>{isMonthExpanded ? '▴' : '▾'}</span>
                  </div>

                  {/* Month Content (Dates) */}
                  {isMonthExpanded && (
                    <div style={{ padding: '8px 0' }}>
                      {monthDates.map((date, idx) => {
                        const isDateExpanded = expandedDate === date || (idx === 0 && !expandedDate);
                        const items = monthData.dates[date];
                        const d = parseISO(date);

                        return (
                          <div key={date} style={{ borderBottom: idx === monthDates.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.03)' }}>
                            <div
                              onClick={() => setExpandedDate(isDateExpanded ? 'NONE' : date)}
                              style={{
                                padding: '16px 32px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                background: isDateExpanded ? 'rgba(107,140,107,0.04)' : 'transparent',
                                transition: 'all 0.2s ease'
                              }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                   <div style={{ width: 6, height: 6, background: 'var(--sage)', borderRadius: '50%' }} />
                                   <span style={{ fontSize: 15, fontWeight: isDateExpanded ? 700 : 500, color: 'var(--ink)' }}>
                                     {format(d, 'EEEE, MMM do')}
                                   </span>
                                </div>
                                <span style={{ fontSize: 13, color: 'rgba(13,13,13,0.4)', fontWeight: 500 }}>{items.length} items ▾</span>
                            </div>

                            {/* Date Items */}
                            {isDateExpanded && (
                              <div style={{ padding: '8px 32px 24px 44px' }}>
                                 {items.map(act => (
                                   <div key={act.id} style={{
                                     display: 'flex',
                                     gap: 16,
                                     padding: '16px 0',
                                     borderBottom: '1px solid rgba(13,13,13,0.03)',
                                     animation: 'fadeIn 0.3s ease'
                                   }}>
                                      <div style={{
                                        width: 36, height: 36, borderRadius: '12px', background: 'var(--mist)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0
                                      }}>
                                        {getActivityIcon(act.entity_type)}
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                                          <span className="tag" style={{
                                            background: getActionColor(act.action),
                                            color: 'white',
                                            padding: '2px 8px',
                                            fontSize: 10,
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5
                                          }}>
                                            {act.action}
                                          </span>
                                          <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                                            {act.entity_type.replace('_', ' ')}
                                          </span>
                                          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(13,13,13,0.3)', fontWeight: 500 }}>
                                            {format(parseISO(act.created_at), 'h:mm a')}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.5 }}>{act.description}</div>
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
                style={{ alignSelf: 'center', marginTop: 32, padding: '14px 48px', borderRadius: 30, fontSize: 14, fontWeight: 600 }}
              >
                {loadingMore ? 'Retrieving history...' : 'Show Older Activity ↓'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

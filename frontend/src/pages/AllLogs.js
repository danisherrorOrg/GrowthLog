import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import ConfirmModal from '../components/ui/ConfirmModal';

const LIMIT = 15;

export default function AllLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expandedLog, setExpandedLog] = useState(null); // date string
  const [confirm, setConfirm] = useState(null);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [logsRes, catsRes] = await Promise.all([
        API.get(`/logs?days=0&limit=${LIMIT}&skip=0`),
        API.get('/categories')
      ]);
      setLogs(logsRes.data);
      setCategories(catsRes.data);
      setHasMore(logsRes.data.length === LIMIT);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to load history'));
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await API.get(`/logs?days=0&limit=${LIMIT}&skip=${logs.length}`);
      setLogs(prev => [...prev, ...res.data]);
      setHasMore(res.data.length === LIMIT);
    } catch (e) {
      toast.error('Failed to load more logs');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const getCategory = (id) => categories.find(c => c.id === id);

  const handleDelete = (date) => {
    setConfirm({
      title: 'Delete Daily Log?',
      message: `Are you sure you want to delete the entire log for ${format(parseISO(date), 'MMMM d, yyyy')}? This includes all dimension entries and the day's peak highlight.`,
      confirmLabel: 'Delete Forever',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/logs/${date}`);
          toast.success('Log deleted');
          setLogs((prev) => prev.filter(l => l.date !== date));
        } catch (e) {
          toast.error(getErrorMessage(e, 'Failed to delete log'));
        }
      }
    });
  };

  const toggleExpand = (date) => {
    setExpandedLog(expandedLog === date ? null : date);
  };

  if (loading) return (
    <div className="page-body">
      <div className="skeleton" style={{ height: 60, width: '40%', marginBottom: 32, borderRadius: 12 }} />
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{ height: 140, marginBottom: 16, borderRadius: 16 }} />
      ))}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h2 style={{ fontFamily: 'Fraunces', fontSize: 32 }}>Log History 📂</h2>
        <p>A chronological archive of your growth, reflections, and metrics.</p>
      </div>

      <div className="page-body">
        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>No growth records yet</h3>
            <p>Your history will appear here once you start logging your daily progress.</p>
            <button className="btn btn-primary" onClick={() => navigate('/log')}>Log Your First Day →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {logs.map(log => {
              const isExpanded = expandedLog === log.date;
              return (
                <div key={log.id} className="card" style={{
                  padding: 0,
                  overflow: 'hidden',
                  border: isExpanded ? '1px solid var(--sage)' : '1px solid transparent',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isExpanded ? '0 12px 32px rgba(0,0,0,0.06)' : 'none'
                }}>
                  {/* Summary Header */}
                  <div
                    onClick={() => toggleExpand(log.date)}
                    className="log-header-row"
                    style={{
                      padding: '24px 30px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: isExpanded ? 'rgba(107,140,107,0.08)' : 'white'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
                        <h3 style={{ fontSize: 20, fontFamily: 'Fraunces', color: 'var(--ink)', margin: 0 }}>
                          {format(parseISO(log.date), 'EEEE, MMM d')}
                        </h3>
                        {log.overall_rating && (
                          <div className="tag tag-gold" style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px' }}>
                            {log.overall_rating}/10 Rating
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'rgba(13,13,13,0.5)', fontWeight: 500 }}>
                        <span>Logged in {format(parseISO(log.date), 'yyyy')}</span>
                        <span>•</span>
                        <span style={{ color: 'var(--sage)' }}>{log.entries?.length || 0} Dimensions Recorded</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {log.entries?.slice(0, 5).map(e => {
                          const cat = getCategory(e.category_id);
                          return cat ? <span key={cat.id} title={cat.name} style={{ fontSize: 20 }}>{cat.icon}</span> : null;
                        })}
                        {(log.entries?.length > 5) && <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', alignSelf: 'center', marginLeft: 4, fontWeight: 600 }}>+{log.entries.length - 5}</span>}
                      </div>
                      <span style={{ fontSize: 20, color: 'var(--sage)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s ease' }}>▾</span>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div style={{ padding: '0 30px 30px', borderTop: '1px solid rgba(13,13,13,0.05)', animation: 'slideUp 0.3s ease' }}>
                      <div style={{ marginTop: 24 }}>
                        {log.highlight && (
                          <div style={{ marginBottom: 24, padding: '20px', background: 'var(--paper)', borderRadius: 16, borderLeft: '5px solid var(--sage)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--sage)', fontWeight: 800, display: 'block', marginBottom: 8 }}>The Day's Peak</label>
                            <div className="markdown-body" style={{ margin: 0, fontStyle: 'italic', color: 'var(--ink)', fontSize: 17, lineHeight: 1.7, fontWeight: 400 }}>
                              <MarkdownRenderer content={log.highlight} />
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                          {log.entries?.map(entry => {
                            const cat = getCategory(entry.category_id);
                            if (!cat) return null;
                            return (
                              <div key={cat.id} className="log-entry-item" style={{ padding: '18px', background: 'rgba(13,13,13,0.02)', borderRadius: 14, border: '1px solid rgba(13,13,13,0.04)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                  <span style={{ fontSize: 24 }}>{cat.icon}</span>
                                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{cat.name}</span>
                                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                    <span className="tag tag-mist" style={{ fontSize: 10 }}>Mood {entry.mood}</span>
                                    <span className="tag tag-mist" style={{ fontSize: 10 }}>Energy {entry.energy}</span>
                                  </div>
                                </div>
                                <div className="markdown-body" style={{ fontSize: 14, margin: 0, color: 'rgba(13,13,13,0.65)', lineHeight: 1.6 }}>
                                  {entry.text ? <MarkdownRenderer content={entry.text} /> : <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No detailed notes...</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(13,13,13,0.05)' }}>
                          <button className="btn btn-outline" onClick={() => navigate(`/log?date=${log.date}`)} style={{ padding: '8px 20px' }}>
                            ✎ Finalize / Edit
                          </button>
                          <button className="btn btn-ghost" onClick={() => handleDelete(log.date)} style={{ color: 'var(--rust)', padding: '8px 20px' }}>
                            🗑 Discard Summary
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <button
                className="btn btn-outline"
                onClick={loadMore}
                disabled={loadingMore}
                style={{ alignSelf: 'center', marginTop: 16, padding: '12px 48px', borderRadius: 30, fontSize: 14, fontWeight: 600 }}
              >
                {loadingMore ? 'Retrieving records...' : 'Load Older History ↓'}
              </button>
            )}
          </div>
        )}
      </div>

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

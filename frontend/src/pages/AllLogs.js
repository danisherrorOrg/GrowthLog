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
  const [expandedLogs, setExpandedLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [focusMode, setFocusMode] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [previewEntry, setPreviewEntry] = useState(null);
  const [previewPeak, setPreviewPeak] = useState(null);
  const [previewGratitude, setPreviewGratitude] = useState(null); // { gratitude: [], date }
  const [previewRegret, setPreviewRegret] = useState(null);       // { regret: '', date }

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
    setExpandedLogs(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
  };

  const filteredLogs = logs.filter(log => {
    if (minRating > 0 && (log.overall_rating || 0) < minRating) return false;
    if (filterCategory) {
      const hasCat = log.entries?.some(e => e.category_id === filterCategory && e.text?.trim());
      if (!hasCat) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchHighlight = log.highlight?.toLowerCase().includes(q);
      const matchEntries = log.entries?.some(e => e.text?.toLowerCase().includes(q));
      const matchGratitude = log.gratitude?.some(g => g?.toLowerCase().includes(q));
      const matchRegret = log.regret?.toLowerCase().includes(q);
      if (!matchHighlight && !matchEntries && !matchGratitude && !matchRegret) return false;
    }
    return true;
  });

  const groupedLogs = filteredLogs.reduce((acc, log) => {
    const monthYear = format(parseISO(log.date), 'MMMM yyyy');
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(log);
    return acc;
  }, {});

  const expandAll = () => setExpandedLogs(filteredLogs.map(l => l.date));
  const collapseAll = () => setExpandedLogs([]);

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
        {/* Toolbar */}
        <div className="card" style={{ marginBottom: 32, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <input type="text" className="form-input" placeholder="Search entries, highlights..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
                style={{ paddingLeft: 32 }} />
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, fontSize: 13 }}>🔍</span>
              {searchQuery && (
                 <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 4 }}>✕</button>
              )}
            </div>
            
            <select className="form-select" style={{ width: 'auto' }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>

            <select className="form-select" style={{ width: 'auto' }} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
              <option value={0}>Any Rating</option>
              <option value={6}>Rating 6+</option>
              <option value={8}>Rating 8+</option>
              <option value={10}>Perfect 10s</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTop: '1px solid rgba(13,13,13,0.05)', paddingTop: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {filteredLogs.length > 0 && (
                <>
                  <button className="btn btn-sm btn-outline" onClick={expandAll}>Expand All</button>
                  <button className="btn btn-sm btn-outline" onClick={collapseAll}>Collapse All</button>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--ink)' }}>Focus Mode (Hide empty)</span>
              <button 
                onClick={() => setFocusMode(!focusMode)}
                style={{
                  width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: focusMode ? 'var(--sage)' : 'var(--mist)',
                  position: 'relative', transition: 'background 0.3s'
                }}
              >
                <div style={{
                  width: 16, height: 16, background: 'white', borderRadius: '50%',
                  position: 'absolute', top: 2, left: focusMode ? 18 : 2, transition: 'left 0.3s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }}/>
              </button>
            </div>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>No growth records yet</h3>
            <p>Your history will appear here once you start logging your daily progress.</p>
            <button className="btn btn-primary" onClick={() => navigate('/log')}>Log Your First Day →</button>
          </div>
        ) : Object.keys(groupedLogs).length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div className="empty-icon" style={{ opacity: 0.5 }}>🔍</div>
            <h3>No logs match your filters</h3>
            <p>Try adjusting your search criteria or clear the filters to see your history.</p>
            <button className="btn btn-outline" onClick={() => { setSearchQuery(''); setFilterCategory(''); setMinRating(0); }} style={{ margin: '0 auto' }}>Clear Filters</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(groupedLogs).map(([monthYear, monthLogs]) => (
              <div key={monthYear} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ 
                  position: 'relative', background: 'transparent', 
                  padding: '12px 0 8px', borderBottom: '1px solid rgba(13,13,13,0.05)',
                  fontFamily: 'Fraunces', fontSize: 20, color: 'var(--sage)', fontWeight: 600
                }}>
                  {monthYear} <span style={{ fontSize: 13, color: 'rgba(13,13,13,0.4)', fontFamily: 'DM Sans', fontWeight: 500 }}>— {monthLogs.length} day{monthLogs.length !== 1 ? 's' : ''}</span>
                </div>
                
                {monthLogs.map(log => {
                  const isExpanded = expandedLogs.includes(log.date);
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
                          <div onClick={() => setPreviewPeak(log)} style={{ 
                            marginBottom: 24, padding: '20px', background: 'var(--paper)', borderRadius: 16, borderLeft: '5px solid var(--sage)', 
                            boxShadow: '0 4px 16px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' 
                          }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.05)'; }}
                             onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.02)'; }}>
                            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--sage)', fontWeight: 800, display: 'block', marginBottom: 8, cursor: 'inherit' }}>The Day's Peak</label>
                            <div className="markdown-body" style={{ margin: 0, fontStyle: 'italic', color: 'var(--ink)', fontSize: 17, lineHeight: 1.7, fontWeight: 400, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              <MarkdownRenderer content={log.highlight} />
                            </div>
                          </div>
                        )}

                        {/* Gratitude + Regret row */}
                        {((log.gratitude?.some(g => g?.trim())) || log.regret?.trim()) && (
                          <div style={{ display: 'grid', gridTemplateColumns: log.gratitude?.some(g => g?.trim()) && log.regret?.trim() ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 24 }}>
                            {log.gratitude?.some(g => g?.trim()) && (
                              <div
                                onClick={() => setPreviewGratitude({ gratitude: log.gratitude, date: log.date })}
                                style={{ padding: '18px 20px', background: 'var(--paper)', borderRadius: 16, borderLeft: '4px solid var(--gold)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(201,146,10,0.12)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; }}
                              >
                                <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#c9920a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, cursor: 'inherit' }}>
                                  🌿 Gratitude
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {log.gratitude.filter(g => g?.trim()).map((g, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                      <span style={{
                                        minWidth: 22, height: 22, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--gold), #f4a22d)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, fontWeight: 700, color: '#1a1a1a', flexShrink: 0, marginTop: 1
                                      }}>{i + 1}</span>
                                      <span style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{g}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {log.regret?.trim() && (
                              <div
                                onClick={() => setPreviewRegret({ regret: log.regret, date: log.date })}
                                style={{ padding: '18px 20px', background: 'var(--paper)', borderRadius: 16, borderLeft: '4px solid #8b6bc4', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(139,107,196,0.12)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; }}
                              >
                                <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8b6bc4', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, cursor: 'inherit' }}>
                                  🔍 Regret & Insight
                                </label>
                                <div className="markdown-body" style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, margin: 0, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  <MarkdownRenderer content={log.regret} />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                          {log.entries?.map(entry => {
                            const cat = getCategory(entry.category_id);
                            if (!cat) return null;
                            if (focusMode && (!entry.text || !entry.text.trim().replace(/---/g, '').trim())) return null;

                            return (
                              <div key={cat.id} className="log-entry-item" 
                                onClick={() => setPreviewEntry({ entry, category: cat, date: log.date })}
                                style={{ 
                                  padding: '18px', background: 'rgba(13,13,13,0.02)', 
                                  borderRadius: 14, border: '1px solid rgba(13,13,13,0.04)',
                                  cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.04)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                  <span style={{ fontSize: 24 }}>{cat.icon}</span>
                                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{cat.name}</span>
                                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                    <span className="tag tag-mist" style={{ fontSize: 10 }}>Mood {entry.mood}</span>
                                    <span className="tag tag-mist" style={{ fontSize: 10 }}>Energy {entry.energy}</span>
                                  </div>
                                </div>
                                <div className="markdown-body" style={{ 
                                  fontSize: 14, margin: 0, color: 'rgba(13,13,13,0.65)', lineHeight: 1.6,
                                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                                }}>
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
            </div>
            ))}

            {(hasMore && !searchQuery && !filterCategory && minRating === 0) && (
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

      {previewEntry && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPreviewEntry(null)} style={{ background: 'rgba(13,13,13,0.85)', zIndex: 1100 }}>
          <div className="modal" style={{ maxWidth: 600, padding: '32px 40px' }}>
            <div className="modal-header" style={{ marginBottom: 24, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 32, background: 'var(--mist)', width: 64, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {previewEntry.category.icon}
                </span>
                <div>
                  <h3 style={{ margin: 0, fontFamily: 'Fraunces', fontSize: 24 }}>{previewEntry.category.name}</h3>
                  <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>
                    {format(parseISO(previewEntry.date), 'EEEE, MMMM d')}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setPreviewEntry(null)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: previewEntry.entry.emotions?.length > 0 ? 12 : 24 }}>
              <span className="tag tag-mist" style={{ fontSize: 11 }}>Mood: {previewEntry.entry.mood}/10</span>
              <span className="tag tag-mist" style={{ fontSize: 11 }}>Energy: {previewEntry.entry.energy}/10</span>
              {previewEntry.entry.time_spent > 0 && <span className="tag tag-mist" style={{ fontSize: 11 }}>⏱ {previewEntry.entry.time_spent} mins</span>}
            </div>

            {previewEntry.entry.emotions?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(13,13,13,0.4)', fontWeight: 700, marginRight: 4 }}>Emotions:</span>
                {previewEntry.entry.emotions.map(em => (
                  <span key={em} className="tag tag-mist" style={{ fontSize: 10 }}>{em}</span>
                ))}
              </div>
            )}

            <div className="markdown-body" style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ink)' }}>
              {previewEntry.entry.text ? <MarkdownRenderer content={previewEntry.entry.text} /> : <p style={{ fontStyle: 'italic', opacity: 0.5 }}>No detailed notes were recorded for this dimension.</p>}
            </div>
          </div>
        </div>
      )}

      {previewPeak && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPreviewPeak(null)} style={{ background: 'rgba(13,13,13,0.85)', zIndex: 1100 }}>
          <div className="modal" style={{ maxWidth: 600, padding: '32px 40px' }}>
            <div className="modal-header" style={{ marginBottom: 24, alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'Fraunces', fontSize: 24, color: 'var(--sage)' }}>The Day's Peak</h3>
                <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>
                  {format(parseISO(previewPeak.date), 'EEEE, MMMM d, yyyy')}
                </div>
              </div>
              <button className="modal-close" onClick={() => setPreviewPeak(null)}>✕</button>
            </div>
            
            <div className="markdown-body" style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--ink)', fontStyle: 'italic' }}>
              <MarkdownRenderer content={previewPeak.highlight} />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />

      {/* Gratitude Preview Modal */}
      {previewGratitude && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPreviewGratitude(null)} style={{ background: 'rgba(13,13,13,0.85)', zIndex: 1100 }}>
          <div className="modal" style={{ maxWidth: 560, padding: '32px 40px' }}>
            <div className="modal-header" style={{ marginBottom: 24, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 32, background: 'linear-gradient(135deg, #fff8e7, #fdefc2)', width: 60, height: 60, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--gold)' }}>🌿</span>
                <div>
                  <h3 style={{ margin: 0, fontFamily: 'Fraunces', fontSize: 24, color: '#c9920a' }}>Gratitude Log</h3>
                  <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>
                    {format(parseISO(previewGratitude.date), 'EEEE, MMMM d, yyyy')}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setPreviewGratitude(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {previewGratitude.gratitude.filter(g => g?.trim()).map((g, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px', background: 'linear-gradient(135deg, #fff8e7, #fdf6dd)', borderRadius: 14, border: '1px solid rgba(201,146,10,0.15)' }}>
                  <span style={{
                    minWidth: 30, height: 30, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--gold), #f4a22d)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#1a1a1a', flexShrink: 0
                  }}>{i + 1}</span>
                  <div className="markdown-body" style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ink)', margin: 0 }}>
                    <MarkdownRenderer content={g} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Regret Preview Modal */}
      {previewRegret && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPreviewRegret(null)} style={{ background: 'rgba(13,13,13,0.85)', zIndex: 1100 }}>
          <div className="modal" style={{ maxWidth: 560, padding: '32px 40px' }}>
            <div className="modal-header" style={{ marginBottom: 24, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 32, background: 'linear-gradient(135deg, #f3eeff, #e8dcff)', width: 60, height: 60, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #8b6bc4' }}>🔍</span>
                <div>
                  <h3 style={{ margin: 0, fontFamily: 'Fraunces', fontSize: 24, color: '#8b6bc4' }}>Regret & Insight</h3>
                  <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>
                    {format(parseISO(previewRegret.date), 'EEEE, MMMM d, yyyy')}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setPreviewRegret(null)}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #f3eeff, #ede4ff)', borderRadius: 16, border: '1px solid rgba(139,107,196,0.2)' }}>
              <div className="markdown-body" style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--ink)', fontStyle: 'italic', margin: 0 }}>
                <MarkdownRenderer content={previewRegret.regret} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

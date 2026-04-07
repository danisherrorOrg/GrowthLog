import { useState, useEffect, useRef, useCallback } from 'react';
import API from '../utils/api';
import CalendarView from '../components/calendar/CalendarView';
import JourneyFeed from '../components/timeline/JourneyFeed';
import DayDetailSidePanel from '../components/shared/DayDetailSidePanel';
import { startOfMonth, endOfMonth, format, subDays, startOfYear } from 'date-fns';
import toast from 'react-hot-toast';

export default function CalendarTimeline() {
  const [view, setView] = useState('calendar'); // 'calendar' | 'timeline'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [period, setPeriod] = useState(new Date());
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const [selectedDate, setSelectedDate] = useState(null);
  const [quickAddContext, setQuickAddContext] = useState(null);
  
  const observer = useRef();
  const lastElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && view === 'timeline') {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, view]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    // Reset when filters change
    setPage(0);
    setEvents([]);
    setHasMore(true);
    fetchEvents(0, true);
  }, [period, searchQuery, selectedCategories]);

  useEffect(() => {
    if (page > 0) {
      fetchEvents(page, false);
    }
  }, [page]);

  const fetchCategories = async () => {
    try {
      const res = await API.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories');
    }
  };

  const fetchEvents = async (pageNumber, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const start = format(startOfMonth(period), 'yyyy-MM-dd');
      const end = format(endOfMonth(period), 'yyyy-MM-dd');
      const catIds = selectedCategories.join(',');
      const limit = 20;
      const skip = pageNumber * limit;

      const res = await API.get(`/timeline?start_date=${start}&end_date=${end}&q=${searchQuery}&category_ids=${catIds}&limit=${limit}&skip=${skip}`);
      
      const newEvents = res.data.events;
      setEvents(prev => reset ? newEvents : [...prev, ...newEvents]);
      setHasMore(res.data.has_more);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load timeline events');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handlePrevMonth = () => {
    const prev = new Date(period);
    prev.setMonth(prev.getMonth() - 1);
    setPeriod(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(period);
    next.setMonth(next.getMonth() + 1);
    setPeriod(next);
  };

  const setShortcut = (type) => {
    const now = new Date();
    if (type === '7d') setPeriod(subDays(now, 7));
    if (type === '30d') setPeriod(subDays(now, 30));
    if (type === 'ytd') setPeriod(startOfYear(now));
    if (type === 'today') setPeriod(now);
  };

  return (
    <div className="page timeline-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: 'none', paddingBottom: 0 }}>
        <div>
          <h2 style={{ fontSize: '36px', marginBottom: '4px' }}>Growth Journey</h2>
          <p style={{ color: 'rgba(0,0,0,0.4)', fontSize: '15px' }}>{total} events found • {format(period, 'MMMM yyyy')}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.03)', padding: 4, borderRadius: 12 }}>
            <button 
              className="btn btn-ghost"
              style={{
                fontSize: '13px',
                padding: '6px 16px',
                background: view === 'calendar' ? 'white' : 'transparent',
                boxShadow: view === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                color: view === 'calendar' ? 'black' : '#888'
              }}
              onClick={() => setView('calendar')}
            >
              Calendar
            </button>
            <button 
              className="btn btn-ghost"
              style={{
                fontSize: '13px',
                padding: '6px 16px',
                background: view === 'timeline' ? 'white' : 'transparent',
                boxShadow: view === 'timeline' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                color: view === 'timeline' ? 'black' : '#888'
              }}
              onClick={() => setView('timeline')}
            >
              Timeline
            </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '40px', marginTop: '20px', alignItems: 'flex-start' }}>
        {/* Left Sidebar: Fixed Top / Scroll Middle / Fixed Bottom */}
        <aside style={{ 
            width: '220px', 
            height: 'calc(100vh - 180px)', 
            flexShrink: 0, 
            position: 'sticky', 
            top: '24px', 
            display: 'flex', 
            flexDirection: 'column',
            background: 'rgba(255,255,255,0.4)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid rgba(0,0,0,0.03)'
        }}>
            <style dangerouslySetInnerHTML={{__html: `
                .category-scroll::-webkit-scrollbar { width: 3px; }
                .category-scroll::-webkit-scrollbar-track { background: transparent; }
                .category-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                .category-scroll::-webkit-scrollbar-thumb:hover { background: rgba(201,168,76,0.3); }
                
                .sidebar-fade-top {
                    position: absolute; top: 0; left: 0; right: 0; height: 12px;
                    background: linear-gradient(to bottom, rgba(253,252,249,1), transparent);
                    z-index: 2; pointer-events: none;
                    opacity: 0.8;
                }
                .sidebar-fade-bottom {
                    position: absolute; bottom: 0; left: 0; right: 0; height: 12px;
                    background: linear-gradient(to top, rgba(253,252,249,1), transparent);
                    z-index: 2; pointer-events: none;
                    opacity: 0.8;
                }
            `}} />

            {/* Fixed Top: Filter Title & Search */}
            <div style={{ flexShrink: 0, marginBottom: '16px' }}>
                <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#aaa', marginBottom: '12px' }}>Filter by Growth</h4>
                <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', opacity: 0.4 }}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ 
                            width: '100%', padding: '9px 10px 9px 32px', borderRadius: '10px', 
                            border: '1.5px solid rgba(0,0,0,0.05)', outline: 'none', fontSize: '13px', 
                            background: 'white', transition: 'all 0.2s'
                        }}
                    />
                </div>
            </div>

            {/* Scrollable Middle: Category List */}
            <div style={{ position: 'relative', flex: 1, minHeight: 0, margin: '8px -8px' }}>
                <div className="sidebar-fade-top" />
                <div 
                    className="category-scroll"
                    style={{ 
                        height: '100%', 
                        overflowY: 'auto', 
                        padding: '8px',
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '2px' 
                    }}
                >
                    <button 
                        onClick={() => setSelectedCategories([])}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                            borderRadius: '10px', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                            background: selectedCategories.length === 0 ? 'rgba(201,168,76,0.1)' : 'transparent',
                            color: selectedCategories.length === 0 ? '#111' : '#777',
                            fontWeight: selectedCategories.length === 0 ? 600 : 400,
                            textAlign: 'left', fontSize: '14px'
                        }}
                    >
                        <span style={{ width: '20px', textAlign: 'center' }}>✺</span>
                        All Categories
                    </button>
                    {categories.map(cat => {
                        const isSelected = selectedCategories.includes(cat.id);
                        return (
                            <button 
                                key={cat.id}
                                onClick={() => {
                                    setSelectedCategories(prev => 
                                        prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                                    )
                                }}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                                    borderRadius: '10px', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                    background: isSelected ? `${cat.color}15` : 'transparent',
                                    color: isSelected ? '#111' : '#777',
                                    fontWeight: isSelected ? 600 : 400,
                                    textAlign: 'left', fontSize: '14px',
                                    position: 'relative'
                                }}
                            >
                                {isSelected && (
                                    <div style={{ 
                                        position: 'absolute', left: 0, top: '25%', bottom: '25%', 
                                        width: '3px', background: cat.color, borderRadius: '0 4px 4px 0' 
                                    }} />
                                )}
                                <span style={{ width: '20px', textAlign: 'center', fontSize: '16px' }}>{cat.icon}</span>
                                {cat.name}
                            </button>
                        );
                    })}
                </div>
                <div className="sidebar-fade-bottom" />
            </div>

            {/* Anchored Bottom: Quick Travel & Reset */}
            <div style={{ flexShrink: 0, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '16px', marginTop: '8px' }}>
                <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#aaa', marginBottom: '12px' }}>Quick Travel</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                    <button className="btn btn-ghost" style={{ fontSize: '11px', background: 'white', border: '1px solid #eee', padding: '6px' }} onClick={() => setShortcut('7d')}>7 Days</button>
                    <button className="btn btn-ghost" style={{ fontSize: '11px', background: 'white', border: '1px solid #eee', padding: '6px' }} onClick={() => setShortcut('ytd')}>YTD</button>
                </div>
                
                {(searchQuery || selectedCategories.length > 0 || period.toDateString() !== new Date().toDateString()) && (
                    <button 
                        className="btn btn-ghost" 
                        style={{ fontSize: '12px', color: '#e76f51', background: '#fff1f0', width: '100%', justifyContent: 'center' }}
                        onClick={() => {
                            setSearchQuery('');
                            setSelectedCategories([]);
                            setPeriod(new Date());
                        }}
                    >
                        Reset All Filters
                    </button>
                )}
            </div>
        </aside>

        {/* Main Content Area */}
        <main style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px', alignItems: 'center', gap: '24px' }}>
                <button className="btn btn-ghost" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, justifyContent: 'center' }} onClick={handlePrevMonth}>&larr;</button>
                <div style={{ textAlign: 'center', minWidth: '200px' }}>
                    <h3 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: '2rem' }}>{format(period, 'MMMM')}</h3>
                    <span style={{ fontSize: '14px', color: '#888', letterSpacing: '2px', fontWeight: 300 }}>{format(period, 'yyyy')}</span>
                </div>
                <button className="btn btn-ghost" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, justifyContent: 'center' }} onClick={handleNextMonth}>&rarr;</button>
            </div>

            {loading && page === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 40px', color: '#888', background: 'rgba(0,0,0,0.01)', borderRadius: '24px' }}>
                    <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%', margin: '0 auto 20px' }} />
                    <h3 style={{ fontSize: '18px', color: '#444' }}>Gathering your memories...</h3>
                    <p style={{ fontSize: '14px' }}>Checking {format(period, 'MMMM yyyy')}</p>
                </div>
            ) : (
                view === 'calendar' ? (
                <CalendarView events={events} period={period} onDayClick={setSelectedDate} />
                ) : (
                <>
                    <JourneyFeed 
                        events={events} 
                        onEventClick={(e) => {
                            if (e.action === 'quick_add') {
                                setQuickAddContext(e);
                                setSelectedDate(new Date(e.date));
                            } else if (e.date) {
                                setQuickAddContext(null);
                                setSelectedDate(new Date(e.date));
                            }
                        }} 
                    />
                    <div ref={lastElementRef} style={{ height: '40px', margin: '40px 0', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                        {loadingMore ? (
                            <div className="skeleton" style={{ width: '120px', height: '14px', margin: '0 auto' }} />
                        ) : (!hasMore && events.length > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                                <div style={{ height: '1px', background: '#eee', flex: 1, maxWidth: '100px' }} />
                                <span>You've reached the beginning of your journey ✨</span>
                                <div style={{ height: '1px', background: '#eee', flex: 1, maxWidth: '100px' }} />
                            </div>
                        ) : "")}
                    </div>
                </>
                )
            )}
        </main>
      </div>
      
      {selectedDate && (
        <DayDetailSidePanel 
          date={selectedDate} 
          quickAdd={quickAddContext}
          events={events.filter(e => {
            const ed = e.date ? e.date.substring(0, 10) : null;
            const sd = format(selectedDate, 'yyyy-MM-dd');
            return ed === sd;
          })} 
          onClose={() => {
              setSelectedDate(null);
              setQuickAddContext(null);
              fetchEvents(0, true); // Refresh to show new log
          }} 
        />
      )}
    </div>
  );
}

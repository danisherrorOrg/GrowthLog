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
    <div className="page timeline-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2>Growth Timeline & Calendar</h2>
          <p style={{ color: 'rgba(0,0,0,0.5)' }}>Your journey over time ({total} events found)</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.03)', padding: 4, borderRadius: 12 }}>
            <button 
              className="btn btn-ghost"
              style={{
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

      {/* Advanced Filter Bar */}
      <div style={{ 
        background: 'white', padding: '16px 20px', borderRadius: '16px', 
        border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
            <input 
                type="text" 
                placeholder="Search your growth..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', border: '1px solid #eee', outline: 'none', fontSize: '14px' }}
            />
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#888' }}>Categories:</span>
            {categories.map(cat => (
                <button 
                    key={cat.id}
                    onClick={() => {
                        setSelectedCategories(prev => 
                            prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                        )
                    }}
                    style={{ 
                        padding: '6px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                        background: selectedCategories.includes(cat.id) ? cat.color : '#f5f5f5',
                        color: selectedCategories.includes(cat.id) ? 'white' : '#666',
                        border: 'none', transition: 'all 0.2s'
                    }}
                >
                    {cat.icon} {cat.name}
                </button>
            ))}
            {(searchQuery || selectedCategories.length > 0) && (
                <button 
                    className="btn btn-ghost" 
                    style={{ fontSize: '12px', color: '#e76f51', padding: '4px 8px' }}
                    onClick={() => {
                        setSearchQuery('');
                        setSelectedCategories([]);
                    }}
                >
                    Clear All
                </button>
            )}
        </div>

        <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid #eee', paddingLeft: '16px' }}>
            <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => setShortcut('7d')}>7 Days</button>
            <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => setShortcut('30d')}>30 Days</button>
            <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => setShortcut('ytd')}>YTD</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
        <button className="btn btn-ghost" onClick={handlePrevMonth}>&larr; Prev</button>
        <h3 style={{ margin: 0, fontFamily: 'serif', fontSize: '1.5rem' }}>{format(period, 'MMMM yyyy')}</h3>
        <button className="btn btn-ghost" onClick={handleNextMonth}>Next &rarr;</button>
      </div>

      {loading && page === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading your journey...</div>
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
            <div ref={lastElementRef} style={{ height: '20px', margin: '20px 0', textAlign: 'center', color: '#888', fontSize: '14px' }}>
                {loadingMore ? 'Loading more...' : (!hasMore && events.length > 0 ? "You've reached the beginning of your journey ✨" : "")}
            </div>
          </>
        )
      )}
      
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

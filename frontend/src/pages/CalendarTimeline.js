import { useState, useEffect } from 'react';
import API from '../utils/api';
import CalendarView from '../components/calendar/CalendarView';
import JourneyFeed from '../components/timeline/JourneyFeed';
import DayDetailSidePanel from '../components/shared/DayDetailSidePanel';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import toast from 'react-hot-toast';

export default function CalendarTimeline() {
  const [view, setView] = useState('calendar'); // 'calendar' | 'timeline'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(new Date());
  
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [period]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const start = format(startOfMonth(period), 'yyyy-MM-dd');
      const end = format(endOfMonth(period), 'yyyy-MM-dd');
      const res = await API.get(`/timeline?start_date=${start}&end_date=${end}`);
      setEvents(res.data);
    } catch (err) {
      toast.error('Failed to load timeline events');
    } finally {
      setLoading(false);
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

  return (
    <div className="page timeline-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2>Growth Timeline & Calendar</h2>
          <p style={{ color: 'rgba(0,0,0,0.5)' }}>Your journey over time</p>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
        <button className="btn btn-ghost" onClick={handlePrevMonth}>&larr; Prev</button>
        <h3 style={{ margin: 0, fontFamily: 'serif', fontSize: '1.5rem' }}>{format(period, 'MMMM yyyy')}</h3>
        <button className="btn btn-ghost" onClick={handleNextMonth}>Next &rarr;</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading your journey...</div>
      ) : (
        view === 'calendar' ? (
          <CalendarView events={events} period={period} onDayClick={setSelectedDate} />
        ) : (
          <JourneyFeed events={events} />
        )
      )}
      
      {selectedDate && (
        <DayDetailSidePanel 
          date={selectedDate} 
          events={events.filter(e => {
            const ed = e.date ? e.date.substring(0, 10) : null;
            const sd = format(selectedDate, 'yyyy-MM-dd');
            return ed === sd;
          })} 
          onClose={() => setSelectedDate(null)} 
        />
      )}
    </div>
  );
}

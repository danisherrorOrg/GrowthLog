import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { getErrorMessage } from '../utils/errors';


export default function AllLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      // Fetch up to a year of logs, descending by default
      const res = await API.get('/logs?days=365');
      // Sort in descending order by date
      const sortedLogs = res.data.sort((a, b) => b.date.localeCompare(a.date));
      setLogs(sortedLogs);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to load logs'));
    } finally {


      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleDelete = async (date) => {
    if (!window.confirm(`Delete the entire daily log for ${format(parseISO(date), 'MMMM d, yyyy')}?`)) return;
    try {
      await API.delete(`/logs/${date}`);
      toast.success('Log deleted');
      setLogs((prev) => prev.filter(l => l.date !== date));
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to delete log'));
    }


  };

  if (loading) return (
    <div className="page-body">
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, marginBottom: 16, borderRadius: 16 }} />)}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h2>Log History</h2>
        <p>Review your past days, highlights, and overall ratings.</p>
      </div>

      <div className="page-body">
        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>No logs found</h3>
            <p>You haven't recorded any daily logs in the past year.</p>
            <button className="btn btn-primary" onClick={() => navigate('/log')}>Write Today's Log →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {logs.map(log => (
              <div key={log.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '4px solid var(--sage)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: 18, marginBottom: 4, fontFamily: 'Fraunces', color: 'var(--ink)' }}>
                      {format(parseISO(log.date), 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'rgba(13,13,13,0.5)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        Overall Rating: <strong style={{ color: 'var(--ink)' }}>{log.overall_rating || '-'}/10</strong>
                      </span>
                      <span>Categories logged: <strong>{log.entries?.length || 0}</strong></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-sm btn-outline" onClick={() => navigate(`/log?date=${log.date}`)}>✎ Edit</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(log.date)} style={{ color: 'var(--rust)' }}>🗑 Delete</button>
                  </div>
                </div>

                {log.highlight && (
                  <div style={{ padding: '12px', background: 'var(--mist)', borderRadius: 8, fontStyle: 'italic', fontSize: 14, color: 'rgba(13,13,13,0.7)', borderLeft: '2px solid rgba(13,13,13,0.1)' }}>
                    "{log.highlight}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

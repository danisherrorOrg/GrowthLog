import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import ConfirmModal from '../components/ui/ConfirmModal';


export default function CategoryDetail() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [logs, setLogs] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [catRes, logsRes, goalsRes] = await Promise.all([
          API.get('/categories?include_archived=true'),
          API.get(`/categories/${categoryId}/logs?days=90`),
          API.get(`/goals?category_id=${categoryId}`)
        ]);
        
        const cat = catRes.data.find(c => c.id === categoryId);
        if (!cat) {
          toast.error("Category not found");
          navigate('/categories');
          return;
        }
        
        setCategory(cat);
        setLogs(logsRes.data || []);
        setGoals(goalsRes.data || []);
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load category details"));
      } finally {


        setLoading(false);
      }
    };
    loadData();
  }, [categoryId, navigate]);

  const [confirm, setConfirm] = useState(null);

  const handleDeleteLog = (date) => {
    setConfirm({
      title: 'Delete Full Log?',
      message: `Are you sure you want to delete the entire daily log for ${format(parseISO(date), 'MMMM d')}? This removes all entries across ALL categories for this day.`,
      confirmLabel: 'Delete Forever',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/logs/${date}`);
          toast.success('Daily log deleted');
          setLogs(logs.filter(l => l.date !== date));
        } catch (e) {
          toast.error(getErrorMessage(e, 'Failed to delete log'));
        }
      }
    });
  };

  if (loading) return (
    <div className="page-body">
      <div className="skeleton" style={{ height: 180, marginBottom: 16, borderRadius: 16 }} />
      <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
    </div>
  );

  if (!category) return null;

  const activeGoals = goals.filter(g => ['active', 'extended'].includes(g.status));
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <div>
      <div className="page-header" style={{ borderBottom: `4px solid ${category.color}`, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/categories')} style={{ color: 'rgba(13,13,13,0.4)', padding: '4px 8px' }}>
            ← All Categories
          </button>
          {category.archived && <span className="tag tag-rust">Archived</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 48, lineHeight: 1 }}>{category.icon}</span>
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 4 }}>{category.name}</h2>
            <div className="markdown-body" style={{ color: 'rgba(13,13,13,0.6)', margin: 0 }}>
              {category.description ? <MarkdownRenderer content={category.description} /> : 'No description provided.'}
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="stack-grid-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
          {/* Goals Column */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontFamily: 'Fraunces' }}>Goals ({goals.length})</h3>
              <button className="btn btn-sm btn-outline" onClick={() => navigate('/goals')}>Manage</button>
            </div>
            
            {goals.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '30px 20px', background: 'var(--mist)', boxShadow: 'none' }}>
                <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }}>◇</div>
                <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>No goals set for this category yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeGoals.map(goal => {
                   const deadline = parseISO(goal.current_deadline);
                   const daysLeft = differenceInDays(deadline, new Date());
                   const isOverdue = isPast(deadline);
                   return (
                     <div key={goal.id} className="card" onClick={() => navigate(`/goals/${goal.id}`)} style={{ padding: '16px', cursor: 'pointer', borderLeft: `3px solid ${category.color}` }}>
                       <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'rgba(13,13,13,0.4)', marginBottom: 4 }}>
                         Active Target
                       </div>
                       <h4 style={{ fontSize: 15, margin: '0 0 6px 0' }}>{goal.title}</h4>
                       <div style={{ fontSize: 12, color: isOverdue ? 'var(--rust)' : 'rgba(13,13,13,0.5)' }}>
                         {isOverdue ? `⚠️ ${Math.abs(daysLeft)}d overdue` : `◇ ${daysLeft}d left`}
                       </div>
                     </div>
                   );
                })}
                {completedGoals.map(goal => (
                  <div key={goal.id} className="card" onClick={() => navigate(`/goals/${goal.id}`)} style={{ padding: '16px', cursor: 'pointer', background: 'var(--mist)', opacity: 0.8 }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'rgba(13,13,13,0.4)', marginBottom: 4 }}>
                      Completed
                    </div>
                    <h4 style={{ fontSize: 15, margin: '0 0 6px 0', textDecoration: 'line-through', opacity: 0.7 }}>{goal.title}</h4>
                    <div style={{ fontSize: 12, color: 'var(--sage)' }}>✅ Achieved</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Logs Column */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontFamily: 'Fraunces' }}>Recent Logs ({logs.length})</h3>
            </div>

            {logs.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px', background: 'var(--mist)', boxShadow: 'none' }}>
                <p style={{ color: 'rgba(13,13,13,0.4)' }}>No logs recorded for this category in the past 90 days.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {logs.sort((a, b) => b.date.localeCompare(a.date)).map((log) => (
                  <div key={log.id} className="card" style={{ borderLeft: `3px solid ${category.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)' }}>
                        {format(parseISO(log.date), 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/log?date=${log.date}`)} style={{ fontSize: 11, padding: '2px 6px', color: 'rgba(13,13,13,0.5)' }}>✎ Edit Full Day</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteLog(log.date)} style={{ fontSize: 11, padding: '2px 6px', color: 'var(--rust)' }}>🗑 Delete</button>
                      </div>
                    </div>
                    {log.entries.map((entry, i) => (
                      <div key={i}>
                        <div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink)', margin: 0 }}>
                          <MarkdownRenderer content={entry.text} />
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'rgba(13,13,13,0.5)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>Mood</span>
                            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{entry.mood}/10</span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>Energy</span>
                            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{entry.energy}/10</span>
                          </span>
                          {entry.emotions?.length > 0 && <span>• {entry.emotions.join(', ')}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

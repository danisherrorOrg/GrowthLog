import { useEffect, useState } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';

export default function Manifestations() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [completeItem, setCompleteItem] = useState(null);
  const [form, setForm] = useState({ vision: '', target_days: 30 });
  const [reflection, setReflection] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => API.get('/manifestations').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.vision.trim()) return toast.error('Write your vision');
    setLoading(true);
    try {
      await API.post('/manifestations', form);
      toast.success('✧ Manifestation set!');
      setShowModal(false);
      setForm({ vision: '', target_days: 30 });
      load();
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const handleComplete = async () => {
    if (!reflection.trim()) return toast.error('Write your reflection');
    setLoading(true);
    try {
      await API.put(`/manifestations/${completeItem.id}/complete`, { text: reflection });
      toast.success('✧ Manifestation cycle complete!');
      setCompleteItem(null);
      setReflection('');
      load();
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const active = items.filter(i => i.status === 'active');
  const completed = items.filter(i => i.status === 'completed');

  return (
    <div>
      <div className="page-header">
        <h2>Manifestations ✧</h2>
        <p>Write your future. Watch it become real.</p>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Manifestation</button>
        </div>

        {active.length === 0 && completed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✧</div>
            <h3>No manifestations yet</h3>
            <p>Write who you want to become in the next N days. On day N, you'll reflect on how far you've come.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Begin Your Vision →</button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontFamily: 'Fraunces', fontSize: 20, marginBottom: 16 }}>Active Visions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {active.map((item) => {
                    const target = parseISO(item.target_date);
                    const daysLeft = differenceInDays(target, new Date());
                    const totalDays = item.target_days;
                    const daysElapsed = totalDays - Math.max(daysLeft, 0);
                    const progress = Math.min(Math.round((daysElapsed / totalDays) * 100), 100);
                    const isReady = isPast(target);

                    return (
                      <div key={item.id} className="card" style={{ background: isReady ? 'var(--ink)' : 'white', color: isReady ? 'var(--paper)' : 'var(--ink)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                          <div>
                            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: isReady ? 'var(--gold)' : 'rgba(13,13,13,0.4)', marginBottom: 6 }}>
                              {isReady ? '✧ Vision Day Reached!' : `${item.target_days}-Day Vision`}
                            </div>
                            <div style={{ fontSize: 12, color: isReady ? 'rgba(245,240,232,0.5)' : 'rgba(13,13,13,0.4)' }}>
                              Started {format(parseISO(item.start_date), 'MMM d')} · Target {format(target, 'MMM d, yyyy')}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'Fraunces', fontSize: 28, color: isReady ? 'var(--gold)' : 'var(--sage)' }}>
                              {isReady ? '✓' : `${Math.max(daysLeft, 0)}d`}
                            </div>
                            <div style={{ fontSize: 12, color: isReady ? 'rgba(245,240,232,0.5)' : 'rgba(13,13,13,0.4)' }}>
                              {isReady ? 'Complete' : 'remaining'}
                            </div>
                          </div>
                        </div>

                        <blockquote style={{ fontFamily: 'Fraunces', fontSize: 17, fontStyle: 'italic', color: isReady ? 'rgba(245,240,232,0.9)' : 'var(--ink)', lineHeight: 1.6, margin: '0 0 16px', padding: '0 0 0 12px', borderLeft: `3px solid ${isReady ? 'var(--gold)' : 'var(--sage)'}` }}>
                          "{item.vision}"
                        </blockquote>

                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: isReady ? 'rgba(245,240,232,0.5)' : 'rgba(13,13,13,0.4)', marginBottom: 6 }}>
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${progress}%`, background: isReady ? 'var(--gold)' : 'var(--sage)' }} />
                          </div>
                        </div>

                        {isReady && (
                          <button className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setCompleteItem(item); setReflection(''); }}>
                            Reflect & Complete This Cycle ✧
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <h3 style={{ fontFamily: 'Fraunces', fontSize: 20, marginBottom: 16 }}>Completed Cycles</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {completed.map((item) => (
                    <div key={item.id} className="card" style={{ opacity: 0.8 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 24 }}>✧</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', marginBottom: 4 }}>
                            {item.target_days}-day cycle · Completed {item.completed_at ? format(parseISO(item.completed_at), 'MMM d, yyyy') : ''}
                          </div>
                          <p style={{ fontStyle: 'italic', color: 'rgba(13,13,13,0.7)', fontSize: 15, marginBottom: 8 }}>"{item.vision}"</p>
                          {item.reflection && (
                            <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.55)', padding: '8px 12px', background: 'var(--mist)', borderRadius: 8 }}>
                              Reflection: {item.reflection}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>New Manifestation</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--mist)', borderRadius: 10, marginBottom: 20, fontSize: 14, color: 'rgba(13,13,13,0.6)', fontStyle: 'italic' }}>
              Write in present tense as if it's already true. "I am someone who..." not "I want to be..."
            </div>
            <div className="form-group">
              <label className="form-label">Your Vision</label>
              <textarea className="form-textarea" value={form.vision} onChange={(e) => setForm({ ...form, vision: e.target.value })}
                placeholder="In 30 days, I am someone who shows up consistently, feels emotionally grounded, and makes progress on my career every single day..."
                style={{ minHeight: 140 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Timeframe: {form.target_days} days</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[7, 14, 21, 30, 60, 90].map(d => (
                  <button key={d} className={`btn btn-sm ${form.target_days === d ? 'btn-primary' : 'btn-outline'}`} onClick={() => setForm({ ...form, target_days: d })}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Setting...' : 'Set My Vision ✧'}
              </button>
            </div>
          </div>
        </div>
      )}

      {completeItem && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCompleteItem(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Complete This Cycle ✧</h3>
              <button className="modal-close" onClick={() => setCompleteItem(null)}>✕</button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', marginBottom: 8 }}>Your vision was:</div>
              <blockquote style={{ fontFamily: 'Fraunces', fontSize: 16, fontStyle: 'italic', color: 'var(--ink)', padding: '12px 16px', background: 'var(--mist)', borderRadius: 10, borderLeft: '3px solid var(--gold)' }}>
                "{completeItem.vision}"
              </blockquote>
            </div>
            <div className="form-group">
              <label className="form-label">How close did you get? What changed?</label>
              <textarea className="form-textarea" value={reflection} onChange={(e) => setReflection(e.target.value)}
                placeholder="Looking back at who I said I'd become vs who I actually became..." style={{ minHeight: 140 }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setCompleteItem(null)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-gold" onClick={handleComplete} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Saving...' : 'Complete Cycle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

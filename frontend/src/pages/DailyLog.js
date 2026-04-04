import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const EMOTIONS = ['Motivated', 'Anxious', 'Proud', 'Frustrated', 'Grateful', 'Tired', 'Inspired', 'Calm', 'Overwhelmed', 'Hopeful', 'Focused', 'Distracted'];

const PROMPTS = [
  'What did you learn today that you didn\'t know yesterday?',
  'What made you step outside your comfort zone today?',
  'What are you most proud of from today?',
  'What would you do differently if you could replay today?',
  'What pattern are you noticing in yourself lately?',
  'What relationship needed your attention today?',
];

export default function DailyLog() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [todayLog, setTodayLog] = useState(null);
  const [entries, setEntries] = useState({});
  const [highlight, setHighlight] = useState('');
  const [overallRating, setOverallRating] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prompt] = useState(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  const today = format(new Date(), 'EEEE, MMMM d');

  useEffect(() => {
    Promise.all([API.get('/categories'), API.get('/logs/today')])
      .then(([catsRes, logRes]) => {
        const cats = catsRes.data;
        setCategories(cats);
        const existing = logRes.data;
        if (existing) {
          setTodayLog(existing);
          setHighlight(existing.highlight || '');
          setOverallRating(existing.overall_rating || 5);
          const map = {};
          existing.entries.forEach((e) => {
            map[e.category_id] = { text: e.text, mood: e.mood, energy: e.energy, emotions: e.emotions || [] };
          });
          setEntries(map);
        } else {
          const map = {};
          cats.forEach((c) => { map[c.id] = { text: '', mood: 5, energy: 5, emotions: [] }; });
          setEntries(map);
        }
      })
      .catch(() => {
        setError(true);
        toast.error('Failed to load log data');
      })
      .finally(() => setLoading(false));
  }, []);

  const updateEntry = (catId, field, val) => {
    setEntries((prev) => ({ ...prev, [catId]: { ...prev[catId], [field]: val } }));
  };

  const toggleEmotion = (catId, emotion) => {
    const current = entries[catId]?.emotions || [];
    const updated = current.includes(emotion) ? current.filter(e => e !== emotion) : [...current, emotion];
    updateEntry(catId, 'emotions', updated);
  };

  const handleSave = async () => {
    const filled = Object.entries(entries).filter(([, e]) => e.text.trim());
    if (filled.length === 0) return toast.error('Write at least one entry');

    const entryList = filled.map(([catId, e]) => ({
      category_id: catId,
      text: e.text,
      mood: e.mood,
      energy: e.energy,
      emotions: e.emotions,
    }));

    setSaving(true);
    try {
      const res = await API.post('/logs', { entries: entryList, highlight, overall_rating: overallRating });
      if (res.data.streak > 1) toast.success(`🔥 ${res.data.streak} day streak!`);
      else toast.success('✦ Log saved!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save log');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="page-body">
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 180, marginBottom: 16, borderRadius: 16 }} />)}
    </div>
  );

  if (error) return (
    <div className="page-body">
      <div className="empty-state">
        <div className="empty-icon">⚠</div>
        <h3>Failed to load</h3>
        <p>Something went wrong loading your log data.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  );

  if (categories.length === 0) return (
    <div>
      <div className="page-header"><h2>Daily Log</h2></div>
      <div className="page-body">
        <div className="empty-state">
          <div className="empty-icon">▦</div>
          <h3>No categories yet</h3>
          <p>Create at least one category before logging your day.</p>
          <button className="btn btn-primary" onClick={() => navigate('/categories')}>Add Categories →</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h2>Daily Log ✦</h2>
        <p>{today} {todayLog ? '· Already logged today — editing' : '· Reflect on your day'}</p>
      </div>

      <div className="page-body">
        {/* Daily prompt */}
        <div className="card" style={{ background: 'var(--ink)', color: 'var(--paper)', marginBottom: 24 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(245,240,232,0.4)', marginBottom: 8 }}>Today's Prompt</div>
          <p style={{ fontFamily: 'Fraunces', fontSize: 18, fontStyle: 'italic', color: 'var(--gold)' }}>"{prompt}"</p>
        </div>

        {/* Category entries */}
        {categories.map((cat) => {
          const entry = entries[cat.id] || { text: '', mood: 5, energy: 5, emotions: [] };
          return (
            <div key={cat.id} className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${cat.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 24 }}>{cat.icon}</span>
                <h3 style={{ fontSize: 18 }}>{cat.name}</h3>
              </div>

              <div className="form-group">
                <label className="form-label">What happened in this area today?</label>
                <textarea
                  className="form-textarea"
                  value={entry.text}
                  onChange={(e) => updateEntry(cat.id, 'text', e.target.value)}
                  placeholder={`How did your ${cat.name.toLowerCase()} show up today? What did you do, feel, or learn?`}
                  style={{ minHeight: 80 }}
                />
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mood — {entry.mood}/10</label>
                  <div className="rating-row">
                    <span style={{ fontSize: 16 }}>😔</span>
                    <input type="range" className="rating-slider" min={1} max={10} value={entry.mood}
                      onChange={(e) => updateEntry(cat.id, 'mood', +e.target.value)}
                      style={{ '--val': `${(entry.mood - 1) / 9 * 100}%` }} />
                    <span style={{ fontSize: 16 }}>😊</span>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Energy — {entry.energy}/10</label>
                  <div className="rating-row">
                    <span style={{ fontSize: 16 }}>😴</span>
                    <input type="range" className="rating-slider" min={1} max={10} value={entry.energy}
                      onChange={(e) => updateEntry(cat.id, 'energy', +e.target.value)}
                      style={{ '--val': `${(entry.energy - 1) / 9 * 100}%`, '--color': 'var(--gold)' }} />
                    <span style={{ fontSize: 16 }}>⚡</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="form-label">Emotions felt (optional)</label>
                <div className="emotion-grid">
                  {EMOTIONS.map((em) => (
                    <button key={em} className={`emotion-chip ${entry.emotions?.includes(em) ? 'selected' : ''}`}
                      onClick={() => toggleEmotion(cat.id, em)}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Overall */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, marginBottom: 16 }}>Overall Day</h3>
          <div className="form-group">
            <label className="form-label">Highlight of the day</label>
            <input className="form-input" value={highlight} onChange={(e) => setHighlight(e.target.value)} placeholder="What's the one thing that stood out today?" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Overall day rating — {overallRating}/10</label>
            <input type="range" className="rating-slider" min={1} max={10} value={overallRating}
              onChange={(e) => setOverallRating(+e.target.value)}
              style={{ '--val': `${(overallRating - 1) / 9 * 100}%`, width: '100%' }} />
          </div>
        </div>

        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
          {saving ? 'Saving...' : todayLog ? 'Update Today\'s Log ✦' : 'Save Today\'s Log ✦'}
        </button>
      </div>
    </div>
  );
}

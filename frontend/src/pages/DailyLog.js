import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';


const EMOTIONS = ['Motivated', 'Anxious', 'Proud', 'Frustrated', 'Grateful', 'Tired', 'Inspired', 'Calm', 'Overwhelmed', 'Hopeful', 'Focused', 'Distracted'];

export default function DailyLog() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const targetDate = dateParam ? parseISO(dateParam) : new Date();

  const { refreshUser } = useAuth();
  const [categories, setCategories] = useState([]);
  const [todayLog, setTodayLog] = useState(null);
  const [entries, setEntries] = useState({});
  const [highlight, setHighlight] = useState('');
  const [overallRating, setOverallRating] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [smartPrompts, setSmartPrompts] = useState({});
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [gratitude, setGratitude] = useState(['', '', '']);
  const [regret, setRegret] = useState('');
  const todayDisplay = format(targetDate, 'EEEE, MMMM d');
  const todayDateStr = format(targetDate, 'yyyy-MM-dd');

  useEffect(() => {
    Promise.all([
      API.get('/categories'), 
      API.get(`/logs/${todayDateStr}`),
      API.get('/prompts/daily')
    ])
      .then(([catsRes, logRes, promptsRes]) => {
        const cats = catsRes.data;
        setCategories(cats);
        setSmartPrompts(promptsRes.data);
        const existing = logRes.data;
        if (existing) {
          setTodayLog(existing);
          setHighlight(existing.highlight || '');
          setOverallRating(existing.overall_rating || 5);
          setGratitude(existing.gratitude && existing.gratitude.length === 3 ? existing.gratitude : ['', '', '']);
          setRegret(existing.regret || '');
          const map = {};
          existing.entries.forEach((e) => {
            map[e.category_id] = { text: e.text, mood: e.mood, energy: e.energy, emotions: e.emotions || [], time_spent: e.time_spent || 0 };
          });
          setEntries(map);
        } else {
          const map = {};
          cats.forEach((c) => { map[c.id] = { text: '', mood: 5, energy: 5, emotions: [], time_spent: 0 }; });
          setEntries(map);
        }
      })
      .catch((e) => {
        setError(true);
        toast.error(getErrorMessage(e, 'Failed to load log data'));
      })


      .finally(() => {
        setLoading(false);
        // Load draft from localStorage if available
        const draftKey = `growthlog_draft_${todayDateStr}`;
        const draft = localStorage.getItem(draftKey);
        if (draft && !logRes.data) {
          try {
            const parsed = JSON.parse(draft);
            setEntries(parsed.entries || entries);
            if (parsed.highlight) setHighlight(parsed.highlight);
            if (parsed.overallRating) setOverallRating(parsed.overallRating);
            if (parsed.gratitude) setGratitude(parsed.gratitude);
            if (parsed.regret !== undefined) setRegret(parsed.regret);
          } catch (e) { /* ignore parse errors */ }
        }
      });

  }, []);

  // Auto-save draft
  useEffect(() => {
    if (loading || error || todayLog) return;
    const draftKey = `growthlog_draft_${todayDateStr}`;
    const data = { entries, highlight, overallRating, gratitude, regret };
    const hasContent = highlight.trim() || regret.trim() || gratitude.some(g => g.trim()) || Object.values(entries).some(e => e.text && e.text.trim());
    if (hasContent) {
      localStorage.setItem(draftKey, JSON.stringify(data));
    }
  }, [entries, highlight, overallRating, gratitude, regret, loading, error, todayLog, todayDateStr]);

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
      time_spent: parseInt(e.time_spent) || 0,
    }));

    setSaving(true);
    try {
      const res = await API.post('/logs', {
        date: todayDateStr,
        entries: entryList,
        highlight,
        overall_rating: overallRating,
        gratitude: gratitude.map(g => g.trim()),
        regret: regret.trim(),
      });
      await refreshUser();
      if (res.data.streak > 1) toast.success(`🔥 ${res.data.streak} day streak!`);
      else toast.success('✦ Log saved!');
      localStorage.removeItem(`growthlog_draft_${todayDateStr}`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save log'));
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Daily Log ✦</h2>
            <p>{todayDisplay} {todayLog ? '· Already logged today — editing' : '· Reflect on your day'}</p>
          </div>
          {categories.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setExpandedCategories(categories.map(c => c.id))} style={{ fontSize: 11 }}>
                Expand All
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setExpandedCategories([])} style={{ fontSize: 11 }}>
                Collapse All
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* Category entries */}
        {categories.map((cat) => {
          const entry = entries[cat.id] || { text: '', mood: 5, energy: 5, emotions: [], time_spent: 0 };
          const isExpanded = expandedCategories.includes(cat.id);

          return (
            <div key={cat.id} className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${cat.color}` }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: isExpanded ? 16 : 0, userSelect: 'none' }} 
                onClick={() => setExpandedCategories(prev => prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id])}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{cat.icon}</span>
                  <h3 style={{ fontSize: 18, margin: 0 }}>{cat.name}</h3>
                </div>
                <div>
                  <span style={{ color: 'var(--sage)' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--sage)', fontWeight: 600, fontStyle: 'italic' }}>
                      "{((catName) => {
                        const c = catName.toLowerCase();
                        if (/\bmind\b|\bmindset\b|\bmindfulness\b|\bpersonality\b|\blearning\b/.test(c)) return smartPrompts.mind;
                        if (/\bbody\b|\bfitness\b|\bhealth\b|\bphysical\b/.test(c)) return smartPrompts.body;
                        if (/\bcareer\b|\bwork\b|\bprofessional\b|\bbusiness\b|\bwealth\b/.test(c)) return smartPrompts.career;
                        if (/\bsocial\b|\brelationships?\b|\bconnection\b|\bfriends?\b|\bfamily\b/.test(c)) return smartPrompts.social;
                        if (/\bsoul\b|\bpeace\b|\bspirituality\b|\bspiritual\b|\bfaith\b|\bemotion\b/.test(c)) return smartPrompts.soul;
                        return smartPrompts.default || "What happened in this category today?";
                      })(cat.name)}"
                    </label>
                    <textarea
                      className="form-textarea"
                      value={entry.text}
                      onChange={(e) => updateEntry(cat.id, 'text', e.target.value)}
                      placeholder={`How did your ${cat.name.toLowerCase()} show up today? What did you do, feel, or learn?`}
                      style={{ minHeight: 80 }}
                    />
                    <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
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
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Time Invested — {entry.time_spent} min</label>
                      <div className="rating-row">
                        <span style={{ fontSize: 16 }}>⏱</span>
                        <input type="range" className="rating-slider" min={0} max={180} step={5} value={entry.time_spent}
                          onChange={(e) => updateEntry(cat.id, 'time_spent', parseInt(e.target.value) || 0)}
                          style={{ '--val': `${(entry.time_spent / 180) * 100}%`, '--color': '#8b6bc4' }} />
                        <span style={{ fontSize: 16 }}>⏳</span>
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
              )}
            </div>
          );
        })}

        {/* Gratitude & Regret */}
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--gold)' }}>
          <h3 style={{ fontSize: 18, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🌿</span> Gratitude Log
          </h3>
          <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', marginBottom: 16, marginTop: 0 }}>Three things you're grateful for today</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  minWidth: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--gold), #f4a22d)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#1a1a1a', flexShrink: 0
                }}>{i + 1}</span>
                <input
                  type="text"
                  className="form-input"
                  value={gratitude[i]}
                  onChange={(e) => {
                    const updated = [...gratitude];
                    updated[i] = e.target.value;
                    setGratitude(updated);
                  }}
                  placeholder={[
                    'I am grateful for…',
                    'Something that made me smile…',
                    'A person or moment I appreciate…'
                  ][i]}
                  style={{ flex: 1 }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Regret */}
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid #8b6bc4' }}>
          <h3 style={{ fontSize: 18, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔍</span> Regret Log
          </h3>
          <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', marginBottom: 16, marginTop: 0 }}>Something you wish you'd done differently today — a growth insight</p>
          <textarea
            className="form-textarea"
            value={regret}
            onChange={(e) => setRegret(e.target.value)}
            placeholder="What would I do differently if I could replay today? What does this teach me?"
            style={{ minHeight: 80 }}
          />
        </div>

        {/* Overall */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, marginBottom: 16 }}>Overall Day</h3>
          <div className="form-group">
            <label className="form-label">Highlight of the day</label>
            <textarea 
              className="form-textarea" 
              value={highlight} 
              onChange={(e) => setHighlight(e.target.value)} 
              placeholder="What's the one thing that stood out today?" 
              style={{ minHeight: 80 }}
            />
            <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
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

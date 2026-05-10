import { useEffect, useState, useRef } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';

// ── Markdown textarea with write/preview toggle ──────────────────────────────
function MdTextarea({ value, onChange, placeholder, borderColor = 'var(--sage)', minHeight = 80 }) {
  const [preview, setPreview] = useState(false);
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <button type="button" onClick={() => setPreview(false)}
          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: !preview ? 'var(--ink)' : 'rgba(13,13,13,0.07)',
            color: !preview ? 'white' : 'rgba(13,13,13,0.5)', fontWeight: 600 }}>
          ✏️ Write
        </button>
        <button type="button" onClick={() => setPreview(true)} disabled={!value?.trim()}
          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: value?.trim() ? 'pointer' : 'not-allowed',
            background: preview ? 'var(--ink)' : 'rgba(13,13,13,0.07)',
            color: preview ? 'white' : 'rgba(13,13,13,0.5)', fontWeight: 600, opacity: value?.trim() ? 1 : 0.4 }}>
          👁 Preview
        </button>
        <span style={{ fontSize: 10, color: 'rgba(13,13,13,0.3)', alignSelf: 'center', marginLeft: 4 }}>Markdown supported</span>
      </div>
      {preview ? (
        <div className="md-body" style={{ minHeight, padding: '10px 16px', background: 'rgba(13,13,13,0.02)',
          border: '1px solid rgba(13,13,13,0.08)', borderLeft: `3px solid ${borderColor}`,
          borderRadius: '0 10px 10px 0', fontSize: 13, lineHeight: 1.7 }}>
          <MarkdownRenderer content={value || '_Nothing written yet_'} />
        </div>
      ) : (
        <textarea className="form-textarea" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ minHeight, borderLeft: `3px solid ${borderColor}`, borderRadius: '0 10px 10px 0', paddingLeft: 16, resize: 'vertical' }} />
      )}
    </div>
  );
}

const CATEGORIES = [
  {
    id: 'priority', label: 'Priority', icon: '🎯',
    desc: 'Is this the right task right now?', color: 'var(--rust)',
    questions: [
      { key: 'q1', text: 'Is this task truly necessary right now, or can it wait?' },
      { key: 'q2', text: 'Is there a higher-priority task I am ignoring by doing this?' },
      { key: 'q3', text: 'What happens if I stop this task entirely — what is the real cost?' },
      { key: 'q4', text: 'Was this task assigned or self-pulled? Does that change its priority?' },
    ]
  },
  {
    id: 'value', label: 'Value & Learning', icon: '💡',
    desc: 'Is this task worth my time?', color: '#8b6bc4',
    questions: [
      { key: 'q5', text: 'What am I learning? Is the learning worth the time?' },
      { key: 'q6', text: 'Is this moving me closer to a meaningful outcome, or just keeping me busy?' },
      { key: 'q7', text: 'What is the best possible result if I finish this well?' },
      { key: 'q8', text: 'Is the output of this task something concrete and measurable?' },
    ]
  },
  {
    id: 'energy', label: 'Energy & Focus', icon: '⚡',
    desc: 'Is my mental state suited to this?', color: 'var(--gold)',
    questions: [
      { key: 'q9', text: 'Am I in the right mental state to do this task well right now?' },
      { key: 'q10', text: 'Am I feeling resistance or flow? What is that telling me?' },
      { key: 'q11', text: 'Is this task draining me in a way that will hurt the rest of my day?' },
      { key: 'q12', text: 'Should I take a 5-minute break before continuing?' },
    ]
  },
  {
    id: 'career', label: 'Career & Goals', icon: '🚀',
    desc: 'Does this connect to where I want to go?', color: 'var(--sage)',
    questions: [
      { key: 'q13', text: 'Does completing this task help my career or personal growth?' },
      { key: 'q14', text: 'Is this aligned with what I said I want to focus on this week?' },
      { key: 'q15', text: 'Am I doing this because it matters, or because it feels safe?' },
    ]
  },
  {
    id: 'delegation', label: 'Delegation', icon: '🤝',
    desc: 'Should this even be mine to do?', color: '#e07b39',
    questions: [
      { key: 'q16', text: 'Can someone else do this better, faster, or just as well?' },
      { key: 'q17', text: 'Can this be automated or templated so I never repeat it?' },
      { key: 'q18', text: 'Am I the right person to be spending time on this right now?' },
    ]
  },
];

const VERDICTS = [
  { key: 'continue', label: 'Continue', icon: '✅', desc: 'Right use of my time. Keep going.', color: 'var(--sage)' },
  { key: 'pause', label: 'Pause & Switch', icon: '⏸️', desc: 'Higher-priority task needs attention.', color: 'var(--gold)' },
  { key: 'drop', label: 'Drop / Delegate', icon: '🗑️', desc: 'Not worth my time or better handled by someone else.', color: 'var(--rust)' },
];

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

const QUICK_QUESTIONS = [
  { key: 'quick_most_important', label: 'Most important thing right now?' },
  { key: 'quick_real_progress',  label: 'Making real progress or going in circles?' },
  { key: 'quick_show_for_30',    label: 'What to show for this in 30 minutes?' },
  { key: 'quick_energy_suited',  label: 'Is my energy level suited to this task?' },
];

function CheckInCard({ checkin, onDelete }) {
  const [open, setOpen] = useState(false);
  const verdict = VERDICTS.find(v => v.key === checkin.verdict) || VERDICTS[0];

  const fullAnswers = [];
  if (checkin.mode !== 'quick' && checkin.answers) {
    CATEGORIES.forEach(cat => {
      cat.questions.forEach(q => {
        const ans = checkin.answers[q.key];
        if (ans?.trim()) fullAnswers.push({ cat, q, ans });
      });
    });
  }
  const quickAnswers = QUICK_QUESTIONS.map(q => ({ ...q, ans: checkin[q.key] })).filter(q => q.ans?.trim());

  return (
    <div style={{ border: '1px solid rgba(13,13,13,0.07)', borderRadius: 16, overflow: 'hidden', background: 'white', marginBottom: 10 }}>
      <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 16, color: 'rgba(13,13,13,0.35)' }}>{open ? '▼' : '▶'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{checkin.task_name}</div>
            <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 2 }}>
              Check-in #{checkin.check_in_number} · {checkin.mode === 'quick' ? '⚡ Quick' : '📋 Full'} · {checkin.created_at?.slice(0, 10)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: verdict.color, color: 'white', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}>
            {verdict.icon} {verdict.label}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onDelete(checkin.id); }} style={{ color: 'var(--rust)', padding: '4px 8px' }}>🗑</button>
        </div>
      </div>

      {open && (
        <div style={{ background: 'var(--mist)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Verdict block */}
          <div style={{ padding: '14px 18px', borderRadius: 12, border: `2px solid ${verdict.color}`, background: `${verdict.color}0d` }}>
            <div style={{ fontWeight: 700, color: verdict.color, fontSize: 14, marginBottom: 6 }}>{verdict.icon} Verdict: {verdict.label}</div>
            {checkin.verdict_reason && (
              <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--ink)' }}>{checkin.verdict_reason}</div>
            )}
            {checkin.next_action && (
              <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.6)', borderTop: '1px solid rgba(13,13,13,0.08)', paddingTop: 8, marginTop: 8 }}>
                <span style={{ fontWeight: 600 }}>Next action: </span>{checkin.next_action}
              </div>
            )}
          </div>

          {/* Full mode answers by category */}
          {checkin.mode !== 'quick' && fullAnswers.length > 0 && CATEGORIES.map(cat => {
            const catAnswers = fullAnswers.filter(a => a.cat.id === cat.id);
            if (catAnswers.length === 0) return null;
            return (
              <div key={cat.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 3, height: 16, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, color: cat.color }}>
                    {cat.icon} {cat.label}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 11 }}>
                  {catAnswers.map(({ q, ans }) => (
                    <div key={q.key} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', borderLeft: `3px solid ${cat.color}` }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(13,13,13,0.45)', marginBottom: 5 }}>{q.text}</div>
                      <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--ink)' }}>{ans}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Quick mode answers */}
          {checkin.mode === 'quick' && quickAnswers.length > 0 && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, color: 'rgba(13,13,13,0.4)', marginBottom: 10 }}>⚡ Quick Check-In Answers</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {quickAnswers.map(q => (
                  <div key={q.key} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', borderLeft: '3px solid var(--gold)' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(13,13,13,0.45)', marginBottom: 5 }}>{q.label}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--ink)' }}>{q.ans}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom questions */}
          {checkin.custom_questions?.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 3, height: 16, borderRadius: 2, background: '#8b6bc4', flexShrink: 0 }} />
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, color: '#8b6bc4' }}>✦ Custom Questions</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 11 }}>
                {checkin.custom_questions.map((cq, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', borderLeft: '3px solid #8b6bc4' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(13,13,13,0.45)', marginBottom: 5 }}>{cq.text}</div>
                    {cq.answer?.trim()
                      ? <div className="md-body" style={{ fontSize: 13, lineHeight: 1.65 }}><MarkdownRenderer content={cq.answer} /></div>
                      : <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.3)', fontStyle: 'italic' }}>No answer recorded</div>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {fullAnswers.length === 0 && quickAnswers.length === 0 && !checkin.custom_questions?.length && (
            <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.4)', textAlign: 'center', padding: '4px 0' }}>
              No answers were recorded for this check-in.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TaskCheckins() {
  const [checkins, setCheckins] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('full');
  const [activeCategory, setActiveCategory] = useState(0);
  const [taskName, setTaskName] = useState('');
  const [checkInNum, setCheckInNum] = useState(1);
  const [answers, setAnswers] = useState({});
  const [quickAnswers, setQuickAnswers] = useState({ q1:'', q2:'', q3:'', q4:'' });
  const [customQuestions, setCustomQuestions] = useState([]); // [{id, text, answer}]
  const [newCustomQ, setNewCustomQ] = useState('');
  const [verdict, setVerdict] = useState('continue');
  const [verdictReason, setVerdictReason] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState('task'); // task | questions | verdict
  // Timer
  const [timerSecs, setTimerSecs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSecs(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const load = async () => {
    setLoading(true);
    try {
      const ci = await API.get('/checkins');
      setCheckins(ci.data);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to load check-ins'));
    } finally {
      setLoading(false);
    }
    // Stats fetched separately so failure doesn't block the list
    try {
      const st = await API.get('/checkins/stats/summary');
      setStats(st.data);
    } catch (_) {
      // non-critical
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setTaskName(''); setCheckInNum(1); setAnswers({}); setQuickAnswers({ q1:'', q2:'', q3:'', q4:'' });
    setCustomQuestions([]); setNewCustomQ('');
    setVerdict('continue'); setVerdictReason(''); setNextAction('');
    setActiveCategory(0); setStep('task'); setTimerSecs(0); setTimerRunning(false);
  };

  const addCustomQuestion = () => {
    if (!newCustomQ.trim()) return;
    setCustomQuestions(qs => [...qs, { id: Date.now().toString(), text: newCustomQ.trim(), answer: '' }]);
    setNewCustomQ('');
  };

  const updateCustomAnswer = (id, answer) =>
    setCustomQuestions(qs => qs.map(q => q.id === id ? { ...q, answer } : q));

  const removeCustomQuestion = (id) =>
    setCustomQuestions(qs => qs.filter(q => q.id !== id));

  const handleSave = async () => {
    if (!taskName.trim()) return toast.error('Please enter a task name');
    setSaving(true);
    try {
      const payload = {
        task_name: taskName, check_in_number: checkInNum, mode,
        answers: mode === 'full' ? answers : null,
        quick_most_important: quickAnswers.q1,
        quick_real_progress: quickAnswers.q2,
        quick_show_for_30: quickAnswers.q3,
        quick_energy_suited: quickAnswers.q4,
        custom_questions: customQuestions.map(({ text, answer }) => ({ text, answer })),
        verdict, verdict_reason: verdictReason, next_action: nextAction,
      };
      await API.post('/checkins', payload);
      toast.success('✦ Check-in saved!');
      setShowForm(false);
      resetForm();
      load();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this check-in?')) return;
    try {
      await API.delete(`/checkins/${id}`);
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to delete'));
    }
  };

  const setAnswer = (key, val) => setAnswers(a => ({ ...a, [key]: val }));

  const verdictColor = VERDICTS.find(v => v.key === verdict)?.color || 'var(--sage)';
  const progress = mode === 'full'
    ? Math.round((Object.values(answers).filter(Boolean).length / 18) * 100)
    : Math.round((Object.values(quickAnswers).filter(Boolean).length / 4) * 100);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2>15-Min Task Check-In ⏱️</h2>
            <p>Pause every 15 minutes. Honestly assess your task. Make a verdict.</p>
          </div>
          <button
            className={`btn ${showForm ? 'btn-outline' : 'btn-primary'}`}
            style={{ borderRadius: 30, padding: '10px 24px' }}
            onClick={() => { if (showForm) { setShowForm(false); resetForm(); } else setShowForm(true); }}
          >
            {showForm ? '× Cancel' : '+ New Check-In'}
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* Stats */}
        {stats && !showForm && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
            {[
              { icon: '📋', val: stats.total, label: 'Total Check-ins', color: 'var(--ink)' },
              { icon: '✅', val: stats.continue_count, label: 'Continued', color: 'var(--sage)' },
              { icon: '⏸️', val: stats.pause_count, label: 'Paused', color: 'var(--gold)' },
              { icon: '🗑️', val: stats.drop_count, label: 'Dropped', color: 'var(--rust)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', border: '1px solid rgba(13,13,13,0.06)', borderRadius: 16, padding: '18px 20px', flex: '1 1 120px', minWidth: 110 }}>
                <div style={{ fontSize: 22 }}>{s.icon}</div>
                <div style={{ fontFamily: 'Fraunces', fontSize: 28, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div style={{ background: 'white', borderRadius: 20, padding: '28px 32px', border: '1px solid rgba(13,13,13,0.07)', boxShadow: '0 8px 32px rgba(13,13,13,0.05)', marginBottom: 32 }}>

            {/* Timer bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid rgba(13,13,13,0.06)' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: 36, fontWeight: 700, color: timerSecs >= 900 ? 'var(--rust)' : 'var(--ink)', letterSpacing: 2 }}>
                  {formatTime(timerSecs)}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 2 }}>
                  {timerSecs >= 900 ? '⚠️ 15 minutes reached — time to decide!' : 'Elapsed time on this task'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={`btn ${timerRunning ? 'btn-outline' : 'btn-primary'}`} style={{ borderRadius: 30 }} onClick={() => setTimerRunning(r => !r)}>
                  {timerRunning ? '⏸ Pause' : timerSecs > 0 ? '▶ Resume' : '▶ Start Timer'}
                </button>
                {timerSecs > 0 && <button className="btn btn-ghost" style={{ borderRadius: 30 }} onClick={() => { setTimerSecs(0); setTimerRunning(false); }}>↺ Reset</button>}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(13,13,13,0.5)', marginBottom: 6 }}>
                <span>Form completion</span><span>{progress}%</span>
              </div>
              <div style={{ height: 6, background: 'rgba(13,13,13,0.06)', borderRadius: 4 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--sage)', borderRadius: 4, transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {[{ k: 'full', l: '📋 Full (18 questions)' }, { k: 'quick', l: '⚡ Quick (5 questions)' }].map(m => (
                <button key={m.k} onClick={() => setMode(m.k)}
                  className={`btn ${mode === m.k ? 'btn-primary' : 'btn-outline'}`}
                  style={{ borderRadius: 30, fontSize: 13 }}>
                  {m.l}
                </button>
              ))}
            </div>

            {/* Step: Task details */}
            {step === 'task' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Task I am working on</label>
                  <input id="checkin-task-name" className="form-input" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="e.g. Refactor auth module, Write project proposal..." maxLength={300} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Check-in number (for this task session)</label>
                  <input type="number" className="form-input" value={checkInNum} onChange={e => setCheckInNum(+e.target.value)} min={1} max={99} style={{ maxWidth: 120 }} />
                </div>
                <button className="btn btn-primary" style={{ borderRadius: 30, alignSelf: 'flex-start', marginTop: 8 }}
                  onClick={() => { if (!taskName.trim()) return toast.error('Enter task name'); setStep('questions'); }}>
                  Continue to Questions →
                </button>
              </div>
            )}

            {/* Step: Questions */}
            {step === 'questions' && mode === 'full' && (
              <div>
                {/* Category tabs */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
                  {CATEGORIES.map((cat, i) => (
                    <button key={cat.id} onClick={() => setActiveCategory(i)}
                      style={{
                        borderRadius: 30, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                        background: activeCategory === i ? cat.color : 'rgba(13,13,13,0.06)',
                        color: activeCategory === i ? 'white' : 'rgba(13,13,13,0.6)',
                        transition: 'all 0.2s',
                      }}>
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>

                {/* Active category */}
                {CATEGORIES.map((cat, i) => i === activeCategory && (
                  <div key={cat.id}>
                    <div style={{ marginBottom: 20, padding: '12px 16px', background: `${cat.color}10`, borderLeft: `3px solid ${cat.color}`, borderRadius: '0 12px 12px 0' }}>
                      <div style={{ fontWeight: 700, color: cat.color }}>{cat.icon} {cat.label}</div>
                      <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.6)', marginTop: 2 }}>{cat.desc}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {cat.questions.map((q, qi) => (
                        <div key={q.key} className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ color: 'var(--ink)' }}>{qi + 1}. {q.text}</label>
                          <MdTextarea value={answers[q.key] || ''} onChange={val => setAnswer(q.key, val)}
                            placeholder="Your honest answer... (markdown supported)"
                            borderColor={cat.color} minHeight={80} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Custom questions section */}
                <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px dashed rgba(13,13,13,0.1)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>✦ Your Custom Questions</div>
                  {customQuestions.map((cq, i) => (
                    <div key={cq.id} className="form-group" style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Custom {i + 1}: {cq.text}</label>
                        <button type="button" onClick={() => removeCustomQuestion(cq.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rust)', fontSize: 14, padding: '2px 6px' }}>✕</button>
                      </div>
                      <MdTextarea value={cq.answer} onChange={val => updateCustomAnswer(cq.id, val)}
                        placeholder="Your answer... (markdown supported)"
                        borderColor="#8b6bc4" minHeight={70} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input" value={newCustomQ} onChange={e => setNewCustomQ(e.target.value)}
                      placeholder="Add a custom question..."
                      onKeyDown={e => e.key === 'Enter' && addCustomQuestion()}
                      style={{ flex: 1 }} maxLength={300} />
                    <button type="button" className="btn btn-outline" onClick={addCustomQuestion} style={{ whiteSpace: 'nowrap' }}>+ Add</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button className="btn btn-ghost" onClick={() => setStep('task')}>← Back</button>
                  {activeCategory < CATEGORIES.length - 1
                    ? <button className="btn btn-primary" style={{ borderRadius: 30 }} onClick={() => setActiveCategory(i => i + 1)}>Next Category →</button>
                    : <button className="btn btn-primary" style={{ borderRadius: 30 }} onClick={() => setStep('verdict')}>Go to Verdict →</button>
                  }
                </div>
              </div>
            )}

            {/* Quick mode questions */}
            {step === 'questions' && mode === 'quick' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ padding: '12px 16px', background: 'rgba(13,13,13,0.03)', borderRadius: 12, fontSize: 13, color: 'rgba(13,13,13,0.6)' }}>
                  ⚡ Use this when you only have 2 minutes for a check-in.
                </div>
                {[
                  { key: 'q1', text: 'Is this the most important thing I can be doing right now?' },
                  { key: 'q2', text: 'Am I making real progress, or going in circles?' },
                  { key: 'q3', text: 'What will I have to show for this in the next 30 minutes?' },
                  { key: 'q4', text: 'Is my energy level suited to this task?' },
                ].map((q, i) => (
                  <div key={q.key} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{i + 1}. {q.text}</label>
                    <MdTextarea value={quickAnswers[q.key]} onChange={val => setQuickAnswers(a => ({ ...a, [q.key]: val }))}
                      placeholder="Your honest answer... (markdown supported)"
                      borderColor="var(--gold)" minHeight={72} />
                  </div>
                ))}

                {/* Custom questions for quick mode too */}
                {customQuestions.length > 0 && (
                  <div style={{ paddingTop: 16, borderTop: '1px dashed rgba(13,13,13,0.1)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>✦ Your Custom Questions</div>
                    {customQuestions.map((cq, i) => (
                      <div key={cq.id} className="form-group" style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <label className="form-label" style={{ marginBottom: 0 }}>Custom {i + 1}: {cq.text}</label>
                          <button type="button" onClick={() => removeCustomQuestion(cq.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rust)', fontSize: 14, padding: '2px 6px' }}>✕</button>
                        </div>
                        <MdTextarea value={cq.answer} onChange={val => updateCustomAnswer(cq.id, val)}
                          placeholder="Your answer..."
                          borderColor="#8b6bc4" minHeight={70} />
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" value={newCustomQ} onChange={e => setNewCustomQ(e.target.value)}
                    placeholder="Add a custom question..."
                    onKeyDown={e => e.key === 'Enter' && addCustomQuestion()}
                    style={{ flex: 1 }} maxLength={300} />
                  <button type="button" className="btn btn-outline" onClick={addCustomQuestion} style={{ whiteSpace: 'nowrap' }}>+ Add</button>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-ghost" onClick={() => setStep('task')}>← Back</button>
                  <button className="btn btn-primary" style={{ borderRadius: 30 }} onClick={() => setStep('verdict')}>Go to Verdict →</button>
                </div>
              </div>
            )}

            {/* Step: Verdict */}
            {step === 'verdict' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(13,13,13,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Final Verdict — Look at all your answers and choose one:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {VERDICTS.map(v => (
                    <div key={v.key} onClick={() => setVerdict(v.key)}
                      style={{
                        padding: '16px 20px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                        border: `2px solid ${verdict === v.key ? v.color : 'rgba(13,13,13,0.08)'}`,
                        background: verdict === v.key ? `${v.color}10` : 'white',
                        display: 'flex', alignItems: 'center', gap: 14,
                      }}>
                      <span style={{ fontSize: 24 }}>{v.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: verdict === v.key ? v.color : 'var(--ink)' }}>{v.label}</div>
                        <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)', marginTop: 2 }}>{v.desc}</div>
                      </div>
                      {verdict === v.key && <span style={{ marginLeft: 'auto', fontWeight: 700, color: v.color }}>✓</span>}
                    </div>
                  ))}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reason for my verdict</label>
                  <MdTextarea value={verdictReason} onChange={setVerdictReason}
                    placeholder="Why did I make this decision? (markdown supported)"
                    borderColor={verdictColor} minHeight={80} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Next action I will take</label>
                  <MdTextarea value={nextAction} onChange={setNextAction}
                    placeholder="The very next concrete step... (markdown supported)"
                    borderColor="rgba(13,13,13,0.2)" minHeight={60} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button className="btn btn-ghost" onClick={() => setStep('questions')}>← Back</button>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 2, borderRadius: 30 }} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : '✦ Save Check-In'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Past Check-Ins */}
        {!showForm && (
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(13,13,13,0.35)', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              ⏱️ Past Check-Ins
              <div style={{ flex: 1, height: 1, background: 'rgba(13,13,13,0.06)' }} />
              <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', textTransform: 'none', letterSpacing: 0 }}>{checkins.length} saved</span>
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 16 }} />)}
              </div>
            ) : checkins.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">⏱️</div>
                <h3>No check-ins yet</h3>
                <p>Start a new check-in to evaluate your current task with intention.</p>
              </div>
            ) : (
              checkins.map(c => <CheckInCard key={c.id} checkin={c} onDelete={handleDelete} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

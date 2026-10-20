import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import ConfirmModal from '../components/ui/ConfirmModal';
import { parseServerTime } from '../components/focus/quickCheck';

// [key, question, label at 1, label at 5, counts against the score?]
const GROUPS = [
  { name: 'Need', hint: 'Is it actually necessary?', f: [
    ['required', 'Is this required?', 'Optional, nobody needs it', 'Must be done'],
    ['goals', 'Does it fit my goals?', 'Unrelated', 'Directly moves a goal'],
    ['urgency', 'How urgent is it?', 'No deadline', 'Due today'],
    ['handoff', 'Can someone else do it?', 'Only I can', 'Easy to hand off'],
  ] },
  { name: 'Impact', hint: 'How will it affect me?', f: [
    ['impact', 'Effect on my life right now', 'Makes things worse', 'Big improvement'],
    ['longterm', 'In 1 year, will this matter?', 'Forgotten', 'Still paying off'],
    ['skip', "What happens if I don't do it?", 'Nothing at all', 'Serious consequences'],
    ['harm', 'Harm or downside risk', 'None', 'Could hurt me or others', true],
  ] },
  { name: 'Growth', hint: 'What do I gain as a person?', f: [
    ['learning', 'Am I learning anything?', 'Nothing new', 'A real new skill'],
    ['health', 'Effect on body and mind', 'Drains me', 'Boosts my health'],
    ['people', 'Effect on relationships', 'Strains them', 'Strengthens them'],
  ] },
  { name: 'Cost', hint: 'What does it take from me?', f: [
    ['time', 'Time it takes', 'Minutes', 'Days', true],
    ['energy', 'Energy and effort', 'Easy', 'Exhausting', true],
    ['money', 'Money', 'Free', 'Expensive', true],
    ['opp', 'What I give up to do it', 'Nothing important', 'Something I care about', true],
  ] },
  { name: 'Heart', hint: 'Emotion and motive', f: [
    ['emotion', 'How do I feel about it?', 'Dread', 'Excited'],
    ['motive', 'Why am I doing it?', 'Pressure / to impress', 'My own choice'],
    ['regret', 'Would I regret skipping it?', 'Not at all', 'Yes, a lot'],
  ] },
];
const KEYS = GROUPS.flatMap(g => g.f.map(([k]) => k));
const DIMENSIONS = [['need', 'Need'], ['impact', 'Impact'], ['growth', 'Growth'], ['lightness', 'Lightness'], ['heart', 'Heart']];
const VERDICT_COLORS = {
  do_now: 'var(--sage)', schedule: 'var(--sage)', hand_off: 'var(--gold)', minimum: 'var(--gold)',
  optional: 'var(--gold)', drop: 'var(--rust)', dont: 'var(--rust)',
};
const EVALUATE_DELAY_MS = 150;

const blank = () => ({
  id: null, task: '', good: '', bad: '', ifnot: '', first_step: '',
  values: Object.fromEntries(KEYS.map(k => [k, 3])),
});

const EXAMPLE = {
  task: 'Weekend online course on data analysis',
  values: { required: 2, goals: 5, urgency: 2, handoff: 1, impact: 4, longterm: 5, skip: 3, harm: 1, learning: 5, health: 3, people: 2, time: 4, energy: 3, money: 2, opp: 3, emotion: 3, motive: 4, regret: 4 },
  good: 'New skill for my career, could lead to better job options',
  bad: 'Less rest on weekends, could feel tired on Monday',
  ifnot: 'Nothing breaks now, but I stay where I am skill-wise',
  first_step: 'Watch the first 20-minute lesson on Saturday morning',
};

function PastDecision({ d, active, onOpen, onReview }) {
  return (
    <div className={`card dm-past ${active ? 'active' : ''}`}>
      <button className="dm-past-main" onClick={() => onOpen(d)}>
        <span className="dm-past-score" style={{ borderColor: VERDICT_COLORS[d.verdict] }}>{d.score}</span>
        <span style={{ minWidth: 0 }}>
          <span className="qc-row-text" style={{ display: 'block' }}>{d.task}</span>
          <span className="qc-row-meta">{d.verdict_title} · {format(parseServerTime(d.created_at), 'MMM d, yyyy')}</span>
        </span>
      </button>
      <div className="dm-past-review">
        <span className="qc-row-meta">How did it turn out?</span>
        <button className={`btn btn-sm ${d.worth_it === true ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => onReview(d, true)} aria-pressed={d.worth_it === true}>👍 Worth it</button>
        <button className={`btn btn-sm ${d.worth_it === false ? 'btn-danger' : 'btn-outline'}`}
          onClick={() => onReview(d, false)} aria-pressed={d.worth_it === false}>👎 Not worth it</button>
      </div>
    </div>
  );
}

export default function Decisions() {
  const [form, setForm] = useState(blank);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(null); // the stored version of the open decision
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const taskRef = useRef(null);
  const requestId = useRef(0);

  useEffect(() => {
    API.get('/decisions').then(res => setHistory(res.data))
      .catch(err => toast.error(getErrorMessage(err, 'Could not load past decisions.')));
  }, []);

  // Score on the server as sliders move (debounced; stale responses are ignored)
  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      API.post('/decisions/evaluate', { values: form.values })
        .then(res => { if (id === requestId.current) setResult(res.data); })
        .catch(() => { });
    }, EVALUATE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [form.values]);

  const setValue = (k, v) => setForm(f => ({ ...f, values: { ...f.values, [k]: v } }));
  const setField = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const open = (d) => {
    setForm({ id: d.id, task: d.task, good: d.good || '', bad: d.bad || '', ifnot: d.ifnot || '', first_step: d.first_step || '', values: d.values });
    setSaved(d);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startNew = () => {
    setForm(blank());
    setSaved(null);
    taskRef.current?.focus();
  };

  const upsertHistory = (d) => setHistory(h => [d, ...h.filter(x => x.id !== d.id)]);

  const save = async () => {
    if (!form.task.trim()) {
      toast.error('Name the task or decision first.');
      taskRef.current?.focus();
      return;
    }
    setBusy(true);
    const payload = { task: form.task, values: form.values, good: form.good, bad: form.bad, ifnot: form.ifnot, first_step: form.first_step };
    try {
      const res = form.id ? await API.put(`/decisions/${form.id}`, payload) : await API.post('/decisions', payload);
      setForm(f => ({ ...f, id: res.data.id }));
      setSaved(res.data);
      upsertHistory(res.data);
      toast.success(form.id ? 'Decision updated.' : 'Decision saved.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save.'));
    } finally {
      setBusy(false);
    }
  };

  const addFirstStep = async () => {
    try {
      const res = await API.post(`/decisions/${saved.id}/todo`);
      setSaved(res.data);
      upsertHistory(res.data);
      toast.success('First step added to your To-Dos.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not add the To-Do.'));
    }
  };

  const review = async (d, worth_it) => {
    try {
      const res = await API.put(`/decisions/${d.id}`, { worth_it });
      upsertHistory(res.data);
      if (saved?.id === d.id) setSaved(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save.'));
    }
  };

  const remove = () => setConfirm({
    title: 'Delete this decision?',
    message: `"${saved.task}" will be removed permanently.`,
    confirmLabel: 'Delete',
    onConfirm: async () => {
      try {
        await API.delete(`/decisions/${saved.id}`);
        setHistory(h => h.filter(x => x.id !== saved.id));
        startNew();
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not delete.'));
      }
    },
  });

  const dirty = !saved || JSON.stringify(form.values) !== JSON.stringify(saved.values) ||
    ['task', 'good', 'bad', 'ifnot', 'first_step'].some(k => (form[k] || '') !== (saved[k] || ''));
  const color = result ? VERDICT_COLORS[result.verdict] : 'var(--sage)';
  const canAddStep = saved && !dirty && saved.first_step?.trim() && !saved.todo_id &&
    ['do_now', 'schedule', 'minimum', 'optional'].includes(saved.verdict);

  return (
    <div>
      <div className="page-header page-header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Decision Matrix ⚖️</h1>
          <p>For bigger choices: 18 questions, a score, and what to watch out for. Use the 🧭 quick check for everyday impulses.</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => { setForm({ ...blank(), ...EXAMPLE }); setSaved(null); }}>Show example</button>
          <button className="btn btn-primary" onClick={startNew}>+ New decision</button>
        </div>
      </div>

      <div className="page-body dm-wrap">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="dm-task">The task or decision</label>
          <input id="dm-task" ref={taskRef} className="form-input dm-task" maxLength={300}
            placeholder="e.g. Take the evening course" value={form.task} onChange={setField('task')} />
        </div>

        <section className="dm-verdict" aria-live="polite" style={{ '--dm-color': color }}>
          <div className="dm-score">{result ? result.score : '—'}</div>
          <div className="dm-vtitle">{result ? result.verdict_title : 'Scoring…'}</div>
          <div className="dm-vtext">{result?.verdict_text}</div>
          <div className="dm-bars">
            {DIMENSIONS.map(([k, label]) => (
              <div key={k} className="dm-bar">
                <span>{label}</span>
                <div className="dm-track"><div className="dm-fill" style={{ width: `${result?.dimensions[k] ?? 0}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        {GROUPS.map(g => (
          <section key={g.name} className="card dm-group">
            <h3 className="dm-group-title">{g.name}<small>{g.hint}</small></h3>
            {g.f.map(([k, q, lo, hi, cost]) => (
              <div key={k} className={`dm-factor ${cost ? 'cost' : ''}`}>
                <div className="dm-fq">
                  <label htmlFor={`dm-${k}`}>{q}</label>
                  <span className="dm-fv">{form.values[k]}/5</span>
                </div>
                <input id={`dm-${k}`} type="range" min="1" max="5" step="1" value={form.values[k]}
                  onChange={e => setValue(k, Number(e.target.value))} />
                <div className="qc-scale-ends"><span>1 · {lo}</span><span>{hi} · 5</span></div>
              </div>
            ))}
          </section>
        ))}

        <section className="card dm-group">
          <h3 className="dm-group-title">In your own words</h3>
          <div className="dm-notes">
            <div><label className="form-label" htmlFor="dm-good">What is good in it</label>
              <textarea id="dm-good" className="form-textarea" maxLength={2000} value={form.good} onChange={setField('good')} /></div>
            <div><label className="form-label" htmlFor="dm-bad">What is harmful in it</label>
              <textarea id="dm-bad" className="form-textarea" maxLength={2000} value={form.bad} onChange={setField('bad')} /></div>
            <div className="full"><label className="form-label" htmlFor="dm-ifnot">What happens if I don't do it</label>
              <textarea id="dm-ifnot" className="form-textarea" maxLength={2000} value={form.ifnot} onChange={setField('ifnot')} /></div>
            <div className="full"><label className="form-label" htmlFor="dm-first">If yes: smallest first step</label>
              <input id="dm-first" className="form-input" maxLength={300} placeholder="e.g. Put shoes by the door"
                value={form.first_step} onChange={setField('first_step')} /></div>
          </div>
        </section>

        {result && (
          <section className="dm-insights">
            <h3>What the matrix notices</h3>
            <ul>{result.insights.map(s => <li key={s}>{s}</li>)}</ul>
          </section>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={save} disabled={busy || !dirty}>
            {busy ? 'Saving…' : form.id ? (dirty ? 'Save changes' : 'Saved ✓') : 'Save this decision'}
          </button>
          {canAddStep && <button className="btn btn-gold" onClick={addFirstStep}>+ Add first step to To-Dos</button>}
          {saved?.todo_id && <Link to="/todos" className="btn btn-ghost">First step is in To-Dos →</Link>}
          {saved && <button className="btn btn-ghost" onClick={remove} style={{ marginLeft: 'auto' }}>Delete</button>}
        </div>

        <section>
          <h3 style={{ fontSize: 20, margin: '12px 0' }}>Past decisions</h3>
          {history.length === 0 ? (
            <p className="qc-row-meta">Saved decisions appear here. Come back later to mark whether each one was worth it — it feeds your patterns.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map(d => <PastDecision key={d.id} d={d} active={d.id === form.id} onOpen={open} onReview={review} />)}
            </div>
          )}
          <p className="qc-row-meta" style={{ marginTop: 16 }}>
            Looking for your older text check-ins? <Link to="/checkins" style={{ color: 'var(--sage)' }}>They're still here →</Link>
          </p>
        </section>
      </div>

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

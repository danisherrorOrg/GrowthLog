import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { addDays, format, parseISO } from 'date-fns';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { localDate, markPlanPrompted } from '../components/focus/quickCheck';

const QUESTIONS = [
  { key: 'goals', text: 'Does it move one of my goals?', lo: 'Unrelated', hi: 'Directly' },
  { key: 'year', text: 'Will it matter in a year?', lo: 'Forgotten', hi: 'Still paying off' },
  { key: 'skip', text: 'What happens if I skip it?', lo: 'Nothing', hi: 'Serious consequences' },
  { key: 'cost', text: 'What does it cost me (time + energy)?', lo: 'Very little', hi: 'A lot' },
  { key: 'want', text: 'Why am I doing it?', lo: 'Pressure', hi: 'My own choice' },
];

export const VERDICTS = {
  do_now: { icon: '✅', label: 'Do now', color: 'var(--sage)', effect: 'Top of today\'s list' },
  minimum: { icon: '⚡', label: 'Do the minimum', color: 'var(--gold)', effect: 'Do it fast, don\'t polish' },
  schedule: { icon: '📅', label: 'Schedule', color: 'var(--ink)', effect: 'Moves to a better day' },
  hand_off: { icon: '🤝', label: 'Hand off', color: 'var(--gold)', effect: 'Marked to delegate' },
  drop: { icon: '❌', label: 'Drop', color: 'var(--rust)', effect: 'Removed — guilt-free (undo anytime today)' },
};
const ORDER = ['do_now', 'minimum', 'schedule', 'hand_off', 'drop'];
const DO_NOW_LIMIT = 3;
const EMPTY = { goals: null, year: null, skip: null, cost: null, want: null };

function Scale({ q, value, onChange }) {
  return (
    <div className="qc-question">
      <div className="qc-question-text">{q.text}</div>
      <div className="qc-scale" role="radiogroup" aria-label={q.text}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={value === n}
            className={`qc-scale-btn ${value === n ? 'selected' : ''}`} onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="qc-scale-ends"><span>{q.lo}</span><span>{q.hi}</span></div>
    </div>
  );
}

function TriageCard({ todo, index, total, today, doNowCount, onApplied, onSkip }) {
  const [answers, setAnswers] = useState(EMPTY);
  const [delegable, setDelegable] = useState(false);
  const [result, setResult] = useState(null);
  const [choice, setChoice] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(localDate(addDays(parseISO(today), 1)));
  const [busy, setBusy] = useState(false);

  const ready = Object.values(answers).every(Boolean);

  const evaluate = async () => {
    setBusy(true);
    try {
      const res = await API.post('/day-plan/evaluate', { answers, delegable, urgent: todo.urgent });
      setResult(res.data);
      setChoice(res.data.suggested);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not evaluate.'));
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    setBusy(true);
    try {
      const res = await API.post('/day-plan/items', {
        date: today, todo_id: todo.id, answers, delegable, verdict: choice,
        schedule_date: choice === 'schedule' ? scheduleDate : null,
      });
      onApplied(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save.'));
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="mp-card-top">
        <span>Task {index + 1} of {total}</span>
        <button className="btn btn-ghost btn-sm" onClick={onSkip}>Skip for now →</button>
      </div>
      <h3 className="mp-title">{todo.title}</h3>
      <div className="mp-meta">
        {todo.urgent && <span className="qc-pill not-now">Due {todo.due_date === today ? 'today' : 'overdue'}</span>}
        {todo.priority && <span>{todo.priority} priority</span>}
        {todo.due_date && !todo.urgent && <span>due {format(parseISO(todo.due_date), 'MMM d')}</span>}
      </div>

      {!result ? (
        <>
          {QUESTIONS.map(q => (
            <Scale key={q.key} q={q} value={answers[q.key]} onChange={n => setAnswers(a => ({ ...a, [q.key]: n }))} />
          ))}
          <label className="mp-check">
            <input type="checkbox" checked={delegable} onChange={e => setDelegable(e.target.checked)} />
            Someone else could do this
          </label>
          <button className="btn btn-primary" disabled={!ready || busy} onClick={evaluate}
            style={{ width: '100%', justifyContent: 'center', marginTop: 12, opacity: ready ? 1 : 0.5 }}>
            {busy ? 'Thinking…' : 'Get verdict'}
          </button>
        </>
      ) : (
        <>
          <div className="mp-suggestion" style={{ borderLeftColor: VERDICTS[result.suggested].color }}>
            <div className="mp-suggestion-title">{VERDICTS[result.suggested].icon} {VERDICTS[result.suggested].label}</div>
            <div>{result.reason}</div>
            <div className="qc-verdict-score">Score {result.score}/100 — you can pick a different verdict below.</div>
          </div>

          <div className="mp-verdicts" role="radiogroup" aria-label="Verdict">
            {ORDER.map(v => (
              <button key={v} type="button" role="radio" aria-checked={choice === v}
                className={`mp-verdict-btn ${choice === v ? 'selected' : ''}`} onClick={() => setChoice(v)}>
                <span>{VERDICTS[v].icon} {VERDICTS[v].label}</span>
                <small>{VERDICTS[v].effect}</small>
              </button>
            ))}
          </div>

          {choice === 'schedule' && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label" htmlFor="mp-date">Which day?</label>
              <input id="mp-date" type="date" className="form-input" value={scheduleDate}
                min={localDate(addDays(parseISO(today), 1))} onChange={e => setScheduleDate(e.target.value)} />
            </div>
          )}
          {choice === 'do_now' && doNowCount >= DO_NOW_LIMIT && (
            <div className="qc-evening" style={{ marginTop: 12 }}>
              You already have {doNowCount} "Do now" tasks. A short list is the point — consider scheduling this one.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-outline" onClick={() => setResult(null)} disabled={busy}>← Change answers</button>
            <button className="btn btn-primary" onClick={apply} disabled={busy || (choice === 'schedule' && !scheduleDate)}
              style={{ flex: 1, justifyContent: 'center' }}>
              {busy ? 'Saving…' : `Confirm: ${VERDICTS[choice].label}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function MorningPlan() {
  const navigate = useNavigate();
  const today = localDate();
  const [plan, setPlan] = useState({ items: [], candidates: [] });
  const [loading, setLoading] = useState(true);
  const [skipped, setSkipped] = useState([]);
  const [newTask, setNewTask] = useState('');
  // The task on the card. Reloads can reorder the queue (a new task or an undo
  // may sort ahead of it), so it stays put until it's applied or skipped.
  const [activeId, setActiveId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await API.get('/day-plan', { params: { date: today } });
      setPlan(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load your plan.'));
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    markPlanPrompted();
    load();
  }, [load]);

  const queue = plan.candidates.filter(c => !skipped.includes(c.id));
  const current = queue.find(c => c.id === activeId) || queue[0];
  useEffect(() => {
    if (current && current.id !== activeId) setActiveId(current.id);
  }, [current, activeId]);
  const doNowCount = plan.items.filter(i => i.verdict === 'do_now').length;

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      await API.post('/todos', { title: newTask.trim() });
      setNewTask('');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not add the task.'));
    }
  };

  const undo = async (item) => {
    try {
      await API.delete(`/day-plan/items/${item.todo_id}`, { params: { date: today } });
      setSkipped(s => s.filter(id => id !== item.todo_id));
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not undo.'));
    }
  };

  const grouped = ORDER.map(v => [v, plan.items.filter(i => i.verdict === v)]).filter(([, items]) => items.length);

  return (
    <div>
      <div className="page-header page-header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Morning Plan ☀️</h2>
          <p>Two minutes to pick what's worth doing today — and let the rest go.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => navigate('/todos')}>Done planning →</button>
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 820 }}>
        <form onSubmit={addTask} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input className="form-input" maxLength={200} placeholder="Anything else on your mind for today?"
            value={newTask} onChange={e => setNewTask(e.target.value)} aria-label="Add a task" />
          <button className="btn btn-outline" type="submit" disabled={!newTask.trim()} style={{ whiteSpace: 'nowrap' }}>+ Add</button>
        </form>

        {loading ? (
          <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
        ) : current ? (
          <TriageCard
            key={current.id}
            todo={current}
            index={plan.items.length}
            total={plan.items.length + queue.length}
            today={today}
            doNowCount={doNowCount}
            onApplied={() => load()}
            onSkip={() => setSkipped(s => [...s, current.id])}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-icon">{plan.items.length ? '🌤️' : '☀️'}</div>
            <h3>{plan.items.length ? 'Your day is planned' : 'Nothing to plan'}</h3>
            <p>
              {plan.items.length
                ? `${doNowCount} task${doNowCount === 1 ? '' : 's'} to do now. Press Q before anything unplanned.`
                : 'No pending To-Dos. Add anything on your mind above.'}
            </p>
            {skipped.length > 0 && (
              <button className="btn btn-outline" onClick={() => setSkipped([])} style={{ marginTop: 12 }}>
                Review {skipped.length} skipped task{skipped.length === 1 ? '' : 's'}
              </button>
            )}
          </div>
        )}

        {grouped.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 20, marginBottom: 12 }}>Today's plan</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {grouped.map(([v, items]) => (
                <div key={v}>
                  <div className="mp-group-label" style={{ color: VERDICTS[v].color }}>
                    {VERDICTS[v].icon} {VERDICTS[v].label} · {items.length}
                  </div>
                  {items.map(item => (
                    <div key={item.todo_id} className="mp-item">
                      <span className="qc-row-text" style={{ fontSize: 15 }}>
                        {item.title}
                        {item.schedule_date && <span className="mp-item-note"> → {format(parseISO(item.schedule_date), 'EEE, MMM d')}</span>}
                        {item.todo_status === 'done' && <span className="mp-item-note"> · ✓ done</span>}
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={() => undo(item)}>Undo</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

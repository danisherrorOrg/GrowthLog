import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { addDays, format, parseISO } from 'date-fns';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import ConfirmModal from '../components/ui/ConfirmModal';
import {
  ACTION_LABELS, CHANGED_EVENT, localDate, openQuickCheck, parseServerTime,
} from '../components/focus/quickCheck';

const EVENING_HOUR = 17;

function summarize(checks) {
  const caught = checks.filter(c => c.verdict === 'not_now' && (c.action === 'skipped' || c.action === 'parked')).length;
  const did = checks.filter(c => c.action === 'doing');
  const didReviewed = did.filter(c => c.worth_it !== null && c.worth_it !== undefined);
  const didWorth = didReviewed.filter(c => c.worth_it).length;
  return { total: checks.length, caught, did: did.length, didReviewed: didReviewed.length, didWorth };
}

function summaryLine(s, isToday) {
  if (!s.total) return null;
  const parts = [`${isToday ? 'Today' : 'That day'}: ${s.total} check${s.total === 1 ? '' : 's'}`];
  if (s.caught) parts.push(`you caught ${s.caught} time-waster${s.caught === 1 ? '' : 's'} before starting`);
  if (s.didReviewed) parts.push(`${s.didWorth} of ${s.didReviewed} thing${s.didReviewed === 1 ? '' : 's'} you did ${s.didReviewed === 1 ? 'was' : 'were'} worth it`);
  return parts.join(' · ') + '.';
}

function CheckRow({ check, onUpdate, onDelete }) {
  const go = check.verdict === 'go';
  const reviewQuestion = check.action === 'skipped' || check.action === 'parked'
    ? 'Right call to hold off?'
    : 'Was it worth the time?';

  return (
    <div className="card qc-row">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="qc-row-text">{check.text}</div>
          <div className="qc-row-meta">
            {format(parseServerTime(check.created_at), 'h:mm a')}
            {' · '}<span className={`qc-pill ${go ? 'go' : 'not-now'}`}>{go ? 'Go ahead' : 'Not now'}</span>
            {' · '}{check.reason}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => onDelete(check)} aria-label="Delete check" title="Delete">✕</button>
      </div>

      <div className="qc-row-actions">
        {check.action ? (
          <span className="qc-row-action">
            {ACTION_LABELS[check.action]}
            {check.action === 'parked' && check.todo_id && <> · <Link to="/todos">in To-Dos</Link></>}
          </span>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="qc-row-action" style={{ opacity: 0.6 }}>What did you do?</span>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <button key={key} className="btn btn-outline btn-sm" onClick={() => onUpdate(check, { action: key })}>{label}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="qc-row-action" style={{ opacity: 0.6 }}>{reviewQuestion}</span>
          <button
            className={`btn btn-sm ${check.worth_it === true ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => onUpdate(check, { worth_it: true })} aria-pressed={check.worth_it === true}
          >👍</button>
          <button
            className={`btn btn-sm ${check.worth_it === false ? 'btn-danger' : 'btn-outline'}`}
            onClick={() => onUpdate(check, { worth_it: false })} aria-pressed={check.worth_it === false}
          >👎</button>
        </div>
      </div>
    </div>
  );
}

export default function FocusCheck() {
  const [date, setDate] = useState(localDate());
  const [checks, setChecks] = useState([]);
  const [planned, setPlanned] = useState([]);
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  const today = localDate();
  const isToday = date === today;

  const load = useCallback(async () => {
    try {
      const [res, plan] = await Promise.all([
        API.get('/quick-checks', { params: { date } }),
        API.get('/day-plan', { params: { date } }),
      ]);
      setChecks(res.data);
      setPlanned(plan.data.items.filter(i => i.verdict === 'do_now' || i.verdict === 'minimum'));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load your checks.'));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Patterns always look back from today, whichever day is being viewed
  useEffect(() => {
    const loadPatterns = () => API.get('/quick-checks/patterns', { params: { today: localDate() } })
      .then(res => setPatterns(res.data)).catch(() => { });
    loadPatterns();
    window.addEventListener(CHANGED_EVENT, loadPatterns);
    return () => window.removeEventListener(CHANGED_EVENT, loadPatterns);
  }, []);

  // Refresh when a check is made from the floating button / shortcut
  useEffect(() => {
    window.addEventListener(CHANGED_EVENT, load);
    return () => window.removeEventListener(CHANGED_EVENT, load);
  }, [load]);

  const update = async (check, patch) => {
    try {
      const res = await API.put(`/quick-checks/${check.id}`, patch);
      setChecks(cs => cs.map(c => (c.id === check.id ? res.data : c)));
      if (patch.action === 'parked') toast.success('Parked in your To-Dos.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save.'));
    }
  };

  const remove = (check) => setConfirm({
    title: 'Delete this check?',
    message: `"${check.text}" will be removed from your history.`,
    confirmLabel: 'Delete',
    onConfirm: async () => {
      try {
        await API.delete(`/quick-checks/${check.id}`);
        setChecks(cs => cs.filter(c => c.id !== check.id));
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not delete.'));
      }
    },
  });

  const shiftDay = (n) => setDate(d => localDate(addDays(parseISO(d), n)));

  const s = summarize(checks);
  const toReview = checks.filter(c => c.worth_it === null || c.worth_it === undefined).length;
  const showEvening = toReview > 0 && (!isToday || new Date().getHours() >= EVENING_HOUR);

  return (
    <div>
      <div className="page-header page-header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Should I Do This? 🧭</h2>
          <p>Catch time-wasters before they start. Press <kbd className="qc-kbd">Q</kbd> anywhere for a quick check.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openQuickCheck}>+ Quick check</button>
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 820 }}>
        <div className="qc-day-nav">
          <button className="btn btn-ghost btn-sm" onClick={() => shiftDay(-1)} aria-label="Previous day">←</button>
          <strong>{isToday ? 'Today' : format(parseISO(date), 'EEEE, MMM d')}</strong>
          <button className="btn btn-ghost btn-sm" onClick={() => shiftDay(1)} disabled={isToday} aria-label="Next day"
            style={{ visibility: isToday ? 'hidden' : 'visible' }}>→</button>
          {!isToday && <button className="btn btn-ghost btn-sm" onClick={() => setDate(today)}>Back to today</button>}
        </div>

        <div className="qc-stats">
          <div className="stat-card"><div className="stat-value">{s.total}</div><div className="stat-label">Checks</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: 'var(--sage)' }}>{s.caught}</div><div className="stat-label">Time-wasters caught</div></div>
          <div className="stat-card"><div className="stat-value">{s.did}</div><div className="stat-label">Went ahead</div></div>
          <div className="stat-card"><div className="stat-value">{s.didReviewed ? `${s.didWorth}/${s.didReviewed}` : '—'}</div><div className="stat-label">Worth the time</div></div>
        </div>

        {summaryLine(s, isToday) && <p className="qc-summary">{summaryLine(s, isToday)}</p>}

        {planned.length > 0 && (
          <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <strong>☀️ {isToday ? "Today's" : "That day's"} plan</strong>
              <span className="qc-row-meta">
                {planned.filter(i => i.todo_status === 'done').length}/{planned.length} done
              </span>
            </div>
            {planned.map(i => (
              <div key={i.todo_id} className="mp-item" style={{ padding: '6px 0' }}>
                <span style={{ textDecoration: i.todo_status === 'done' ? 'line-through' : 'none', opacity: i.todo_status === 'done' ? 0.55 : 1 }}>
                  {i.todo_status === 'done' ? '✔' : '✖'} {i.title}
                </span>
                {i.todo_status !== 'done' && <Link to="/todos" className="qc-row-meta">open</Link>}
              </div>
            ))}
          </div>
        )}

        {showEvening && (
          <div className="qc-evening">
            <strong>🌙 Evening review</strong> — {toReview} check{toReview === 1 ? '' : 's'} left to review. Tap 👍 or 👎 on each one below.
          </div>
        )}

        {loading ? (
          <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
        ) : checks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧭</div>
            <h3>{isToday ? 'No checks yet today' : 'No checks that day'}</h3>
            <p>Next time you feel pulled toward something unplanned, press <kbd className="qc-kbd">Q</kbd> or tap the 🧭 button first.</p>
            {isToday && <button className="btn btn-primary" onClick={openQuickCheck} style={{ marginTop: 16 }}>Try one now</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {checks.map(c => <CheckRow key={c.id} check={c} onUpdate={update} onDelete={remove} />)}
          </div>
        )}

        {patterns && (
          <section className="card qc-patterns">
            <h3>📈 Your patterns <span className="qc-row-meta">· last 30 days</span></h3>
            {patterns.ready ? (
              patterns.insights.length ? (
                <ul>{patterns.insights.map(i => <li key={i.id}><span aria-hidden="true">{i.icon}</span> {i.text}</li>)}</ul>
              ) : (
                <p className="qc-row-meta">Nothing stands out yet. Keep reviewing your checks with 👍/👎 — that's what patterns are built from.</p>
              )
            ) : (
              <p className="qc-row-meta">
                Patterns unlock after {patterns.progress.need_checks} checks on {patterns.progress.need_days} different days.
                You're at {patterns.progress.checks} check{patterns.progress.checks === 1 ? '' : 's'} on {patterns.progress.days} day{patterns.progress.days === 1 ? '' : 's'}.
              </p>
            )}
          </section>
        )}
      </div>

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

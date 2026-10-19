import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';
import { MINUTE_OPTIONS, QUESTIONS, fetchTopTask, localDate, notifyQuickCheckChanged } from './quickCheck';

const EMPTY = { helps_today: null, matters_week: null, giving_up: null };

/**
 * "Should I do this right now?" — type the impulse, tap 3 answers, get a verdict,
 * then choose: do it, park it as a To-Do, or skip it and go back to the top task.
 */
export default function QuickCheckModal({ onClose }) {
  const [text, setText] = useState('');
  const [answers, setAnswers] = useState(EMPTY);
  const [topTask, setTopTask] = useState(null);
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState(false);
  const [expected, setExpected] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetchTopTask().then(setTopTask).catch(() => { });
  }, []);

  // Layout's Esc handler ignores keys typed in inputs, so close from the text field too
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ready = text.trim() && Object.values(answers).every(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    try {
      const res = await API.post('/quick-checks', { text: text.trim(), ...answers, date: localDate(), hour: new Date().getHours() });
      setCheck(res.data);
      notifyQuickCheckChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not run the check.'));
    } finally {
      setBusy(false);
    }
  };

  const choose = async (action) => {
    setBusy(true);
    try {
      const timed = action === 'doing' && expected;
      await API.put(`/quick-checks/${check.id}`, timed ? { action, expected_minutes: expected } : { action });
      notifyQuickCheckChanged();
      if (action === 'parked') toast.success('Parked in your To-Dos for later.');
      else if (action === 'skipped') toast.success(topTask ? `Back to: ${topTask.title}` : 'Skipped. Nice catch.');
      else toast.success('Go for it — keep it focused.');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save your choice.'));
      setBusy(false);
    }
  };

  const go = check?.verdict === 'go';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ zIndex: 1500 }}>
      <div className="modal" style={{ maxWidth: 520 }} role="dialog" aria-label="Should I do this?">
        <div className="modal-header" style={{ marginBottom: 16 }}>
          <h3>🧭 Should I do this?</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {!check ? (
          <form onSubmit={submit}>
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label" htmlFor="qc-text">What are you about to do?</label>
              <input
                id="qc-text" ref={inputRef} className="form-input" maxLength={300}
                placeholder="e.g. Reorganize my desktop folders"
                value={text} onChange={e => setText(e.target.value)}
              />
              <div className="qc-top-task">
                {topTask ? <>Your top task: <strong>{topTask.title}</strong></> : 'No pending To-Dos — judge it against what matters today.'}
              </div>
            </div>

            {QUESTIONS.map(q => (
              <div key={q.key} className="qc-question">
                <div className="qc-question-text">{q.text}</div>
                <div className="qc-scale" role="radiogroup" aria-label={q.text}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n} type="button" role="radio" aria-checked={answers[q.key] === n}
                      className={`qc-scale-btn ${answers[q.key] === n ? 'selected' : ''}`}
                      onClick={() => setAnswers(a => ({ ...a, [q.key]: n }))}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="qc-scale-ends"><span>{q.lo}</span><span>{q.hi}</span></div>
              </div>
            ))}

            <button type="submit" className="btn btn-primary" disabled={!ready || busy}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8, opacity: ready ? 1 : 0.5 }}>
              {busy ? 'Checking…' : 'Check it'}
            </button>
          </form>
        ) : (
          <div>
            <div className={`qc-verdict ${go ? 'go' : 'not-now'}`}>
              <div className="qc-verdict-title">{go ? '🟢 Go ahead' : '🔴 Not now'}</div>
              <div className="qc-verdict-reason">{check.reason}</div>
              {!go && topTask && (
                <div className="qc-verdict-back">Back to: <strong>{topTask.title}</strong></div>
              )}
              <div className="qc-verdict-score">Score {check.score}/100 · “{check.text}”</div>
            </div>

            <div className="qc-minutes" role="radiogroup" aria-label="How long do you expect it to take?">
              <span className="qc-row-action">If you do it, how long will it take?</span>
              {MINUTE_OPTIONS.map(o => (
                <button
                  key={o.value} type="button" role="radio" aria-checked={expected === o.value}
                  className={`btn btn-sm ${expected === o.value ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setExpected(e => (e === o.value ? null : o.value))}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              {go ? (
                <>
                  <button className="btn btn-primary" disabled={busy} onClick={() => choose('doing')} style={{ justifyContent: 'center' }}>▶ Start it</button>
                  <button className="btn btn-outline" disabled={busy} onClick={() => choose('parked')} style={{ justifyContent: 'center' }}>🅿 Park for later</button>
                </>
              ) : (
                <>
                  <button className="btn btn-primary" disabled={busy} onClick={() => choose('skipped')} style={{ justifyContent: 'center' }}>
                    {topTask ? '↩ Back to my top task' : '↩ Skip it'}
                  </button>
                  <button className="btn btn-outline" disabled={busy} onClick={() => choose('parked')} style={{ justifyContent: 'center' }}>🅿 Park it as a To-Do</button>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => choose('doing')} style={{ justifyContent: 'center' }}>Do it anyway</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

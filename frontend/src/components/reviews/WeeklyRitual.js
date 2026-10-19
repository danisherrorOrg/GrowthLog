import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';

const STEPS = [
  { key: 'look', title: 'Look back' },
  { key: 'wins', title: 'Wins', prompt: 'What went well this week? What are you proud of?' },
  { key: 'challenges', title: 'Struggles', prompt: 'What was hard? What drained you or got in the way?' },
  { key: 'learnings', title: 'Learnings', prompt: 'What did this week teach you about yourself?' },
  { key: 'intentions', title: "Next week's focus", prompt: 'What will you focus on next week? Keep it to one to three things.' },
];

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function LookBack({ stats }) {
  const qc = stats.quick_checks;
  return (
    <div className="ritual-look">
      {stats.previous_intentions && (
        <div className="ritual-block ritual-previous">
          <div className="ritual-label">You said you'd focus on ({stats.previous_intentions.period_label})</div>
          <p>{stats.previous_intentions.intentions}</p>
        </div>
      )}

      <div className="ritual-stats">
        <div><strong>{stats.log_count}</strong>/{stats.total_days || 7} days logged</div>
        <div><strong>{stats.avg_mood || '—'}</strong> avg mood</div>
        <div><strong>{stats.avg_energy || '—'}</strong> avg energy</div>
        {stats.top_category && <div><strong>{stats.top_category.icon} {stats.top_category.name}</strong> most time</div>}
        {stats.goals_completed > 0 && <div><strong>{stats.goals_completed}</strong> {stats.goals_completed === 1 ? 'goal' : 'goals'} completed</div>}
      </div>

      {stats.highlights.length > 0 && (
        <div className="ritual-block">
          <div className="ritual-label">Highlights</div>
          <ul>{stats.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
        </div>
      )}

      {qc.total > 0 && (
        <div className="ritual-block">
          <div className="ritual-label">Quick checks</div>
          <p>
            {plural(qc.total, 'quick check')}: {qc.go} worth doing, {qc.not_now} "not now".
            {qc.caught > 0 && ` You caught ${plural(qc.caught, 'distraction')} before starting.`}
            {qc.done_anyway > 0 && ` You did ${qc.done_anyway} "not now" ${qc.done_anyway === 1 ? 'task' : 'tasks'} anyway.`}
          </p>
        </div>
      )}

      {stats.decisions.length > 0 && (
        <div className="ritual-block">
          <div className="ritual-label">Decisions</div>
          <ul>
            {stats.decisions.map(d => (
              <li key={d.id}>
                {d.task} <span className="ritual-muted">→ {d.verdict_title}</span>
                {d.worth_it === true && <span className="ritual-muted"> · worth it</span>}
                {d.worth_it === false && <span className="ritual-muted"> · not worth it</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats.log_count === 0 && qc.total === 0 && stats.decisions.length === 0 && (
        <p className="ritual-muted">Nothing logged this week. That's fine: the review still helps you reset for next week.</p>
      )}
    </div>
  );
}

// Guided end-of-week review: look back at the week, then wins, struggles, learnings and next week's focus.
export default function WeeklyRitual({ period, existing, onClose, onSaved }) {
  const [stats, setStats] = useState(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    wins: existing?.wins || '',
    challenges: existing?.challenges || '',
    learnings: existing?.learnings || '',
    intentions: existing?.intentions || '',
    rating: existing?.rating || 7,
  }));

  useEffect(() => {
    API.get('/reviews/stats', { params: { start_date: period.start, end_date: period.end, period_type: 'weekly' } })
      .then(res => setStats(res.data))
      .catch(err => {
        toast.error(getErrorMessage(err, "Couldn't load your week"));
        setStep(1);
      });
  }, [period.start, period.end]);

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const save = async () => {
    setSaving(true);
    try {
      if (existing) {
        await API.put(`/reviews/${existing.id}`, form);
      } else {
        await API.post('/reviews', {
          ...form, period_type: 'weekly', period_label: period.label, start_date: period.start, end_date: period.end,
        });
      }
      toast.success('✦ Weekly review saved');
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save review'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg" role="dialog" aria-label="Weekly review">
        <div className="modal-header">
          <div>
            <div className="ritual-label">{period.label} · Step {step + 1} of {STEPS.length}</div>
            <h3>{current.title}</h3>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="ritual-progress" aria-hidden="true">
          {STEPS.map((s, i) => <span key={s.key} className={i <= step ? 'done' : ''} />)}
        </div>

        {current.key === 'look' ? (
          stats ? <LookBack stats={stats} /> : <div className="skeleton" style={{ height: 220, borderRadius: 16 }} />
        ) : (
          <div className="form-group">
            <label className="form-label" htmlFor={`ritual-${current.key}`}>{current.prompt}</label>
            <textarea
              id={`ritual-${current.key}`}
              autoFocus
              className="form-textarea"
              style={{ minHeight: 140 }}
              maxLength={5000}
              value={form[current.key]}
              onChange={e => setForm(f => ({ ...f, [current.key]: e.target.value }))}
            />
            {current.key === 'wins' && stats?.highlights.length > 0 && (
              <div className="ritual-muted" style={{ marginTop: 8 }}>Your highlights: {stats.highlights.join(' · ')}</div>
            )}
          </div>
        )}

        {last && (
          <div className="form-group">
            <label className="form-label" htmlFor="ritual-rating">How was the week overall? {form.rating}/10</label>
            <input
              id="ritual-rating"
              type="range" className="rating-slider" min={1} max={10} value={form.rating}
              onChange={e => setForm(f => ({ ...f, rating: +e.target.value }))}
              style={{ '--val': `${(form.rating - 1) / 9 * 100}%`, width: '100%' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          {step > 0 && <button className="btn btn-outline" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>← Back</button>}
          {last ? (
            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ flex: 2 }}>
              {saving ? 'Saving...' : '✦ Save review'}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} style={{ flex: 2 }}>
              {step === 0 ? 'Start reflecting →' : 'Next →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

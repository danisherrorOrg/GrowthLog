import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { localDate } from '../focus/quickCheck';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Today's Morning Plan at a glance, with a link to /plan.
export default function TodayPlan() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    API.get('/day-plan', { params: { date: localDate() } })
      .then(res => setPlan(res.data))
      .catch(() => setPlan({ items: [], candidates: [] }));
  }, []);

  if (!plan) return null;
  const doNow = plan.items.filter(i => i.verdict === 'do_now');
  const open = doNow.filter(i => i.todo_status !== 'done');
  const waiting = plan.candidates.length;

  let title, text, action;
  if (plan.items.length > 0) {
    title = "Today's plan ☀️";
    text = doNow.length
      ? `${doNow.length - open.length} of ${doNow.length} "do now" tasks done.`
      : 'Nothing marked "do now" today.';
    if (waiting) text += ` ${plural(waiting, 'to-do')} still to triage.`;
    action = 'Open plan →';
  } else if (waiting) {
    title = 'Plan your day ☀️';
    text = `${plural(waiting, 'to-do')} waiting. Two minutes to pick what's worth doing today.`;
    action = 'Plan now →';
  } else {
    title = 'Morning Plan ☀️';
    text = 'No pending to-dos to plan. Add anything on your mind for today.';
    action = 'Open →';
  }

  return (
    <div className="card today-plan" style={{ marginBottom: 28 }}>
      <div className="today-plan-head">
        <div>
          <h3 style={{ marginBottom: 4 }}>{title}</h3>
          <p className="today-plan-text">{text}</p>
        </div>
        <button className="btn btn-outline btn-sm" style={{ flexShrink: 0 }} onClick={() => navigate('/plan')}>
          {action}
        </button>
      </div>
      {open.length > 0 && (
        <ul className="today-plan-list">
          {open.slice(0, 3).map(item => <li key={item.todo_id}>✅ {item.title}</li>)}
        </ul>
      )}
    </div>
  );
}

import { format, parseISO, isPast, isToday } from 'date-fns';
import API from '../../utils/api';

// Window events so any page can open the check or react to one being saved
export const OPEN_EVENT = 'quickcheck:open';
export const CHANGED_EVENT = 'quickcheck:changed';

export const openQuickCheck = () => window.dispatchEvent(new Event(OPEN_EVENT));
export const notifyQuickCheckChanged = () => window.dispatchEvent(new Event(CHANGED_EVENT));

// The user's local day, so a 11pm check doesn't land on tomorrow (UTC)
export const localDate = (d = new Date()) => format(d, 'yyyy-MM-dd');

// Mongo returns naive UTC datetimes; without a zone they'd be read as local time
export const parseServerTime = (s) => parseISO(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);

export const QUESTIONS = [
  { key: 'helps_today', text: "Does it help today's top task?", lo: 'Not at all', hi: 'It is my top task' },
  { key: 'matters_week', text: 'Will it matter in a week?', lo: 'Forgotten', hi: 'Definitely' },
  { key: 'giving_up', text: 'What am I giving up right now?', lo: 'Nothing important', hi: 'Something I care about' },
];

export const ACTION_LABELS = {
  doing: '▶ Did it',
  parked: '🅿 Parked',
  skipped: '↩ Skipped',
};

// Minute choices for "how long will / did it take?"
export const MINUTE_OPTIONS = [
  { value: 5, label: '5m' },
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 60, label: '1h' },
  { value: 120, label: '2h+' },
];

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const PLAN_RANK = { do_now: 0, minimum: 1 };

/** Rank for "today's list": morning-plan picks first, then overdue/due today, then priority. */
export function todayRank(todo, today = localDate()) {
  const planned = todo.plan_date === today ? PLAN_RANK[todo.plan_verdict] : undefined;
  let due = 1;
  if (todo.due_date) {
    const d = parseISO(todo.due_date);
    due = isToday(d) || isPast(d) ? 0 : 2;
  }
  return [planned ?? 9, due, PRIORITY_RANK[todo.priority] ?? 1];
}

export const compareTodayRank = (a, b) => {
  const ra = todayRank(a);
  const rb = todayRank(b);
  return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
};

/** Today's most important pending To-Do (a morning "Do now" pick when there is one). */
export async function fetchTopTask() {
  const res = await API.get('/todos', { params: { status: 'pending' } });
  const sorted = res.data.filter(t => !t.delegated).sort(compareTodayRank);
  return sorted[0] || null;
}

// ── Morning plan prompt: shown once per day, before 2pm ─────────────────────
const PLAN_PROMPT_KEY = 'growthlog_plan_prompted';
const PLAN_PROMPT_UNTIL_HOUR = 14;

export function markPlanPrompted() {
  try { localStorage.setItem(PLAN_PROMPT_KEY, localDate()); } catch { /* storage unavailable */ }
}

export function shouldPromptPlan() {
  if (new Date().getHours() >= PLAN_PROMPT_UNTIL_HOUR) return false;
  try { return localStorage.getItem(PLAN_PROMPT_KEY) !== localDate(); } catch { return false; }
}

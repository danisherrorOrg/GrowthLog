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

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

/** Today's most important pending To-Do: overdue/due-today first, then by priority. */
export async function fetchTopTask() {
  const res = await API.get('/todos', { params: { status: 'pending' } });
  const dueRank = (t) => {
    if (!t.due_date) return 1;
    const d = parseISO(t.due_date);
    return isToday(d) || isPast(d) ? 0 : 2;
  };
  const sorted = [...res.data].sort((a, b) =>
    dueRank(a) - dueRank(b) ||
    (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)
  );
  return sorted[0] || null;
}

import { useCallback, useEffect, useRef, useState } from 'react';

// A focus session is saved in localStorage so it survives leaving the page or
// refreshing. Time is worked out from the clock (runningSince), not by counting
// ticks, so it keeps going while the To-Dos page isn't open.
//
// session = {
//   todo: { id, title } | null,
//   duration: seconds in one countdown (the chosen preset),
//   bankedRound: seconds of the current countdown done before runningSince,
//   bankedTotal: seconds focused on this task before runningSince,
//   runningSince: ms timestamp while running, else null,
// }

export const DEFAULT_DURATION = 1500;
const EMPTY = { todo: null, duration: DEFAULT_DURATION, bankedRound: 0, bankedTotal: 0, runningSince: null };

export const storageKey = (userId) => `growthlog.focusSession.${userId || 'anon'}`;

function load(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && typeof saved === 'object' && saved.duration > 0) return { ...EMPTY, ...saved };
  } catch { /* storage unavailable or bad JSON */ }
  return EMPTY;
}

function save(key, session) {
  try {
    if (session.todo) localStorage.setItem(key, JSON.stringify(session));
    else if (session.duration !== DEFAULT_DURATION) localStorage.setItem(key, JSON.stringify({ duration: session.duration }));
    else localStorage.removeItem(key);
  } catch { /* storage unavailable */ }
}

// Seconds run since runningSince, capped so a round never goes past its duration
function liveSeconds(s, now) {
  if (!s.runningSince) return 0;
  const run = Math.max(0, (now - s.runningSince) / 1000);
  return Math.min(run, Math.max(0, s.duration - s.bankedRound));
}

// Stop the clock, moving the running time into the banked totals
function bank(s, now) {
  const live = liveSeconds(s, now);
  return { ...s, bankedRound: s.bankedRound + live, bankedTotal: s.bankedTotal + live, runningSince: null };
}

export default function useFocusSession(userId, { onFinish } = {}) {
  const key = storageKey(userId);
  const [session, setSession] = useState(() => load(key));
  const [now, setNow] = useState(() => Date.now());
  const finishedFor = useRef(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Load again if the signed-in user changes
  const loadedKey = useRef(key);
  useEffect(() => {
    if (loadedKey.current === key) return;
    loadedKey.current = key;
    setSession(load(key));
  }, [key]);

  const update = useCallback((fn) => {
    setSession(prev => {
      const next = fn(prev, Date.now());
      save(loadedKey.current, next);
      return next;
    });
    setNow(Date.now());
  }, []);

  const running = !!session.runningSince;
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const live = liveSeconds(session, now);
  const roundSeconds = Math.floor(session.bankedRound + live);
  const remaining = Math.max(0, session.duration - roundSeconds);
  const totalSeconds = Math.floor(session.bankedTotal + live);

  // The countdown ran out (maybe while the page was closed)
  useEffect(() => {
    if (!running || remaining > 0 || !session.todo) return;
    if (finishedFor.current === session.runningSince) return;
    finishedFor.current = session.runningSince;
    const finished = bank(session, Date.now());
    setSession(finished);
    save(loadedKey.current, finished);
    onFinishRef.current?.(finished.todo, Math.floor(finished.bankedTotal));
  }, [running, remaining, session]);

  const start = useCallback((todo) => update((s, t) => ({
    ...s, todo: { id: todo.id, title: todo.title }, bankedRound: 0, bankedTotal: 0, runningSince: t,
  })), [update]);

  const toggle = useCallback(() => update((s, t) => {
    if (s.runningSince) return bank(s, t);
    // Resuming a finished countdown starts a new one
    const round = s.bankedRound >= s.duration ? 0 : s.bankedRound;
    return { ...s, bankedRound: round, runningSince: t };
  }), [update]);

  // Restart the countdown; time already focused still counts toward the task
  const reset = useCallback(() => update((s, t) => ({ ...bank(s, t), bankedRound: 0 })), [update]);

  const pickDuration = useCallback((sec) => update((s, t) => {
    const wasRunning = !!s.runningSince;
    return { ...bank(s, t), duration: sec, bankedRound: 0, runningSince: wasRunning ? t : null };
  }), [update]);

  const clear = useCallback(() => update(s => ({ ...EMPTY, duration: s.duration })), [update]);

  const renameTodo = useCallback((title) => update(s => (
    s.todo ? { ...s, todo: { ...s.todo, title } } : s
  )), [update]);

  return {
    focusTodo: session.todo,
    duration: session.duration,
    remaining,
    roundSeconds,
    totalSeconds,
    isRunning: running && remaining > 0,
    start, toggle, reset, pickDuration, clear, renameTodo,
  };
}

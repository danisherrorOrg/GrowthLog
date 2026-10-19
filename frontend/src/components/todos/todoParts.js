import { useState } from 'react';
import { format, parseISO, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';

// Badges for tasks picked in today's Morning Plan (see pages/MorningPlan.js)
export const PLAN_BADGES = {
  do_now: { label: '☀ Do now', color: 'var(--sage)', bg: 'rgba(107,140,107,0.12)' },
  minimum: { label: '⚡ Minimum', color: '#a07a10', bg: 'rgba(201,168,76,0.15)' },
};

// ── Priority config ─────────────────────────────────────────────────────────
export const PRIORITY = {
  high: { color: 'var(--rust)', label: '🔴 High', bg: 'rgba(196,98,58,0.06)' },
  medium: { color: 'var(--gold)', label: '🟡 Medium', bg: 'rgba(201,168,76,0.06)' },
  low: { color: 'var(--sage)', label: '🟢 Low', bg: 'rgba(107,140,107,0.06)' },
};

// ── Time helpers ────────────────────────────────────────────────────────────
export function fmtMinutes(min) {
  if (!min && min !== 0) return null;
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function TimeAccuracy({ estimated, actual }) {
  if (!estimated || !actual) return null;
  const ratio = actual / estimated;
  let label, color, bg;
  if (ratio <= 0.9) { label = '🚀 Faster than expected'; color = '#2a7a2a'; bg = 'rgba(42,122,42,0.08)'; }
  else if (ratio <= 1.1) { label = '🎯 Right on time'; color = 'var(--sage)'; bg = 'rgba(107,140,107,0.1)'; }
  else if (ratio <= 1.5) { label = '⏱ Slightly over'; color = '#a07a10'; bg = 'rgba(201,168,76,0.1)'; }
  else { label = '⚠️ Significantly over'; color = 'var(--rust)'; bg = 'rgba(196,98,58,0.08)'; }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
      background: bg, color,
    }}>
      {label} ({Math.round(ratio * 100)}%)
    </div>
  );
}

// ── Time estimate input ─────────────────────────────────────────────────────
export function TimeEstimateInput({ value, onChange, label = 'Estimated Time', compact = false }) {
  const PRESETS = [15, 30, 60, 90, 120];
  const [custom, setCustom] = useState((value && !PRESETS.includes(value)) ? String(value) : '');
  const [useCustom, setUseCustom] = useState(value && !PRESETS.includes(value));

  return (
    <div>
      <label className="form-label" style={{ fontSize: 10 }}>{label}</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {PRESETS.map(p => (
          <button key={p} type="button"
            onClick={() => { setUseCustom(false); onChange(p); }}
            className={`btn btn-sm ${!useCustom && value === p ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: 11, padding: '4px 10px' }}>
            {fmtMinutes(p)}
          </button>
        ))}
        <button type="button"
          onClick={() => { setUseCustom(true); onChange(custom ? parseInt(custom) : null); }}
          className={`btn btn-sm ${useCustom ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: 11, padding: '4px 10px' }}>
          Custom
        </button>
        {useCustom && (
          <input type="number" value={custom}
            onChange={e => { setCustom(e.target.value); onChange(e.target.value ? parseInt(e.target.value) : null); }}
            placeholder="mins" min={1} max={9999}
            className="form-input input-sm" style={{ fontSize: 12, padding: '4px 8px' }} />
        )}
        {value && (
          <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', fontStyle: 'italic' }}>
            = {fmtMinutes(value)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Due-date badge helper ───────────────────────────────────────────────────
export function DueBadge({ dateStr, isDone }) {
  if (!dateStr) return null;
  let date;
  try { date = parseISO(dateStr); } catch { return null; }

  const overdue = !isDone && isPast(date) && !isToday(date);
  const dueToday = !isDone && isToday(date);
  const dueTmrw = !isDone && isTomorrow(date);
  const daysLeft = differenceInDays(date, new Date());

  let label, bg, color;
  if (overdue) { label = `${Math.abs(daysLeft)}d overdue`; bg = 'rgba(196,98,58,0.12)'; color = 'var(--rust)'; }
  else if (dueToday) { label = 'Due today'; bg = 'rgba(201,168,76,0.15)'; color = '#a07a10'; }
  else if (dueTmrw) { label = 'Due tomorrow'; bg = 'rgba(201,168,76,0.08)'; color = '#a07a10'; }
  else if (isDone) { label = format(date, 'MMM d'); bg = 'rgba(13,13,13,0.04)'; color = 'rgba(13,13,13,0.3)'; }
  else { label = format(date, 'MMM d'); bg = 'rgba(13,13,13,0.04)'; color = 'rgba(13,13,13,0.4)'; }

  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: bg, color, textTransform: 'uppercase', letterSpacing: 0.5,
      display: 'inline-flex', alignItems: 'center', gap: 3,
    }}>
      📅 {label}
    </span>
  );
}

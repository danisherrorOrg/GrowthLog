import { format, parseISO } from 'date-fns';

// The user's local day. new Date().toISOString() gives the UTC day, which is
// yesterday or tomorrow for part of the day anywhere outside UTC.
export const localDate = (d = new Date()) => format(d, 'yyyy-MM-dd');

// True for a YYYY-MM-DD day before the user's today
export const isBeforeToday = (day) => day < localDate();

// Older API responses had naive UTC datetimes; without a zone they'd be read as local time
export const parseServerTime = (s) => parseISO(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);

// The browser's IANA timezone, e.g. "Asia/Kolkata", or null if the browser can't tell
export const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

// Timezones for a picker: everything the browser knows, plus UTC and any value already saved
export const timezoneOptions = (...extra) => {
  let zones = [];
  try { zones = Intl.supportedValuesOf('timeZone'); } catch { /* older browsers */ }
  return [...new Set(['UTC', ...extra.filter(Boolean), ...zones])].sort((a, b) =>
    a === 'UTC' ? -1 : b === 'UTC' ? 1 : a.localeCompare(b));
};

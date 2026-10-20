import { localDate, parseServerTime, timezoneOptions, isBeforeToday } from './dates';

test('localDate uses the local calendar day, not the UTC one', () => {
  // 23:30 local on Oct 20 is a different UTC day in every zone east or west of UTC
  expect(localDate(new Date(2026, 9, 20, 23, 30))).toBe('2026-10-20');
  expect(localDate(new Date(2026, 9, 20, 0, 15))).toBe('2026-10-20');
});

test('parseServerTime reads naive and offset timestamps as UTC', () => {
  const want = Date.UTC(2026, 9, 19, 21, 18, 55);
  expect(parseServerTime('2026-10-19T21:18:55').getTime()).toBe(want);
  expect(parseServerTime('2026-10-19T21:18:55+00:00').getTime()).toBe(want);
  expect(parseServerTime('2026-10-19T21:18:55Z').getTime()).toBe(want);
});

test('timezoneOptions lists UTC first and keeps a saved zone', () => {
  const zones = timezoneOptions('Asia/Kolkata', 'Old/Custom_Zone');
  expect(zones[0]).toBe('UTC');
  expect(zones).toEqual(expect.arrayContaining(['Asia/Kolkata', 'Old/Custom_Zone']));
  expect(new Set(zones).size).toBe(zones.length);
});

test('isBeforeToday compares against the local day', () => {
  expect(isBeforeToday('2020-01-01')).toBe(true);
  expect(isBeforeToday(localDate())).toBe(false);
  expect(isBeforeToday('2099-12-31')).toBe(false);
});

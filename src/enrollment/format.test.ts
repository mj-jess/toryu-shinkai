import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  daysSince,
  formatDateBR,
  formatPhoneNumber,
  getTodayBR,
  getTodayISO,
  isoDaysAgo,
  parseDateBR,
} from './format.js';

describe('date helpers', () => {
  it('isoDaysAgo(0) is today', () => {
    expect(isoDaysAgo(0)).toBe(getTodayISO());
  });

  it('getTodayISO agrees with getTodayBR', () => {
    expect(formatDateBR(getTodayISO())).toBe(getTodayBR());
  });

  it('daysSince inverts isoDaysAgo, across month and year boundaries', () => {
    expect(daysSince(getTodayISO())).toBe(0);
    expect(daysSince(isoDaysAgo(14))).toBe(14);
    expect(daysSince(isoDaysAgo(30))).toBe(30);
    expect(daysSince(isoDaysAgo(365))).toBe(365);
  });
});

describe('formatPhoneNumber', () => {
  it('formats 9 plain digits', () => {
    expect(formatPhoneNumber('123456789')).toBe('(123) 456-789');
  });

  it('accepts input already formatted', () => {
    expect(formatPhoneNumber('(123) 456-789')).toBe('(123) 456-789');
  });

  it('accepts mixed separators', () => {
    expect(formatPhoneNumber('123-456.789')).toBe('(123) 456-789');
  });

  it('rejects fewer than 9 digits', () => {
    expect(formatPhoneNumber('12345678')).toBeNull();
  });

  it('rejects more than 9 digits', () => {
    expect(formatPhoneNumber('1234567890')).toBeNull();
  });

  it('rejects empty input', () => {
    expect(formatPhoneNumber('')).toBeNull();
  });
});

describe('getTodayBR', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 22)); // 22/07/2026
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns today in dd/mm/yyyy', () => {
    expect(getTodayBR()).toBe('22/07/2026');
  });
});

describe('parseDateBR', () => {
  it('parses a valid date into ISO', () => {
    expect(parseDateBR('22/07/2026')).toBe('2026-07-22');
  });

  it('accepts single-digit day and month', () => {
    expect(parseDateBR('5/3/2026')).toBe('2026-03-05');
  });

  it('trims surrounding whitespace', () => {
    expect(parseDateBR('  22/07/2026  ')).toBe('2026-07-22');
  });

  it('rejects a date that does not exist', () => {
    expect(parseDateBR('31/02/2026')).toBeNull();
  });

  it('rejects wrong format', () => {
    expect(parseDateBR('2026-07-22')).toBeNull();
    expect(parseDateBR('22/07/26')).toBeNull();
    expect(parseDateBR('not a date')).toBeNull();
  });
});

describe('formatDateBR', () => {
  it('formats ISO as dd/mm/yyyy', () => {
    expect(formatDateBR('2026-07-22')).toBe('22/07/2026');
  });
});

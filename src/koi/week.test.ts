import { describe, expect, it } from 'vitest';
import { isWeeklyPostDue } from './weekly-post.js';
import { previousWeekRange, weekKey, weekRange } from './week.js';

/** Local-time constructor so the ISO helpers agree with the test dates. */
function at(year: number, month: number, day: number, hour = 12): Date {
  return new Date(year, month - 1, day, hour);
}

describe('weekRange', () => {
  it('runs Monday to Sunday', () => {
    // 2026-07-23 is a Thursday.
    expect(weekRange(at(2026, 7, 23))).toEqual({ fromIso: '2026-07-20', toIso: '2026-07-26' });
  });

  it('keeps Monday itself as the start', () => {
    expect(weekRange(at(2026, 7, 20))).toEqual({ fromIso: '2026-07-20', toIso: '2026-07-26' });
  });

  it('keeps Sunday in the week that started on Monday', () => {
    expect(weekRange(at(2026, 7, 26))).toEqual({ fromIso: '2026-07-20', toIso: '2026-07-26' });
  });

  it('crosses month boundaries', () => {
    expect(weekRange(at(2026, 8, 1))).toEqual({ fromIso: '2026-07-27', toIso: '2026-08-02' });
  });
});

describe('previousWeekRange', () => {
  it('is the week before the reference week', () => {
    expect(previousWeekRange(at(2026, 7, 23))).toEqual({
      fromIso: '2026-07-13',
      toIso: '2026-07-19',
    });
  });

  it('on a Monday, covers the week that just ended', () => {
    expect(previousWeekRange(at(2026, 7, 27))).toEqual({
      fromIso: '2026-07-20',
      toIso: '2026-07-26',
    });
  });
});

describe('weekKey', () => {
  it('identifies a week by its Monday', () => {
    expect(weekKey(weekRange(at(2026, 7, 23)))).toBe('2026-07-20');
  });
});

describe('isWeeklyPostDue', () => {
  const monday9am = at(2026, 7, 27, 9);

  it('is due on Monday morning when the week was not posted', () => {
    expect(isWeeklyPostDue(monday9am, null)).toBe(true);
  });

  it('is not due before the posting hour', () => {
    expect(isWeeklyPostDue(at(2026, 7, 27, 8), null)).toBe(false);
  });

  it('is not due on other weekdays', () => {
    expect(isWeeklyPostDue(at(2026, 7, 28, 10), null)).toBe(false);
  });

  it('is not due again once that week was posted', () => {
    expect(isWeeklyPostDue(monday9am, '2026-07-20')).toBe(false);
  });

  it('is due again on the next Monday', () => {
    expect(isWeeklyPostDue(at(2026, 8, 3, 9), '2026-07-20')).toBe(true);
  });
});

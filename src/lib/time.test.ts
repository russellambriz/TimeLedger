import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration, formatWeekRange } from './format';
import { addDays, startOfDay, startOfWeek } from './time';

const at = (year: number, month: number, day: number, hour = 0, minute = 0) =>
  new Date(year, month - 1, day, hour, minute).getTime();

describe('local weeks', () => {
  it('starts weeks on Monday and keeps Sunday in the same week', () => {
    const friday = at(2026, 11, 13, 15);
    expect(startOfWeek(friday)).toBe(at(2026, 11, 9));
    expect(startOfWeek(at(2026, 11, 15, 23))).toBe(at(2026, 11, 9));
    expect(startOfWeek(at(2026, 11, 8, 12))).toBe(at(2026, 11, 2));
    expect(startOfWeek(at(2026, 11, 16, 0, 1))).toBe(at(2026, 11, 16));
  });

  it('crosses month boundaries', () => {
    expect(startOfWeek(at(2026, 1, 31, 18))).toBe(at(2026, 1, 26));
    expect(startOfDay(at(2026, 2, 1, 0, 30))).toBe(at(2026, 2, 1));
    expect(addDays(at(2026, 1, 31), 1)).toBe(at(2026, 2, 1));
  });
});

describe('formatting', () => {
  it('formats the clock and durations', () => {
    expect(formatClock(0)).toBe('00:00:00');
    expect(formatClock(1000)).toBe('00:00:01');
    expect(formatClock(3661000)).toBe('01:01:01');
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(59_000)).toBe('59s');
    expect(formatDuration(60_000)).toBe('1m');
    expect(formatDuration(3_600_000)).toBe('1h');
    expect(formatDuration(5_400_000)).toBe('1h 30m');
    expect(formatDuration(90_000, true)).toBe('1m 30s');
  });

  it('formats week ranges in the device calendar', () => {
    expect(formatWeekRange(at(2026, 11, 9))).toBe('Nov 9 – 15');
    expect(formatWeekRange(at(2026, 10, 26))).toBe('Oct 26 – Nov 1');
  });
});

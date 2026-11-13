import { describe, expect, it } from 'vitest';
import { defaultState } from './defaults';
import { dayBuckets, todayTotal, totals, weekBuckets, weekTotal } from './stats';
import { addDays, startOfDay, startOfWeek } from './time';
import type { State } from '../types';

const at = (year: number, month: number, day: number, hour = 0, minute = 0) =>
  new Date(year, month - 1, day, hour, minute).getTime();

function withSessions(sessions: State['sessions'], active: State['active'] = null): State {
  return { ...defaultState(), sessions, active };
}

describe('day and week totals', () => {
  it('splits a session across midnight and the Monday week boundary', () => {
    const state = withSessions([
      {
        id: 'sleep',
        categoryId: 'sleep',
        start: at(2026, 11, 15, 23),
        end: at(2026, 11, 16, 1),
      },
    ]);
    const now = at(2026, 11, 16, 10);

    expect(todayTotal(state, now).total).toBe(60 * 60 * 1000);
    expect(weekTotal(state, now).total).toBe(60 * 60 * 1000);

    const previous = totals(state, at(2026, 11, 9), at(2026, 11, 16), now);
    expect(previous.total).toBe(60 * 60 * 1000);
    expect(previous.slices).toEqual([{ categoryId: 'sleep', ms: 60 * 60 * 1000 }]);

    const sundayWeek = dayBuckets(state, at(2026, 11, 15), now);
    expect(sundayWeek[0].start).toBe(at(2026, 11, 9));
    expect(sundayWeek[6].start).toBe(at(2026, 11, 15));
    expect(sundayWeek[6].total).toBe(60 * 60 * 1000);
    expect(sundayWeek[0].total).toBe(0);

    const mondayWeek = dayBuckets(state, now, now);
    expect(mondayWeek[0].total).toBe(60 * 60 * 1000);
    expect(mondayWeek.slice(1).every((day) => day.total === 0)).toBe(true);
  });

  it('counts a running timer in the days it actually occupies', () => {
    const state = withSessions([], {
      startedAt: at(2026, 11, 8, 23),
      categoryId: 'sleep',
    });
    const now = at(2026, 11, 9, 2);

    expect(weekTotal(state, now).total).toBe(2 * 60 * 60 * 1000);
    expect(totals(state, at(2026, 11, 2), at(2026, 11, 9), now).total).toBe(60 * 60 * 1000);

    const previousDays = dayBuckets(state, at(2026, 11, 8), now);
    expect(previousDays[6].total).toBe(60 * 60 * 1000);
    expect(previousDays[6].slices[0].categoryId).toBe('sleep');

    const thisWeek = dayBuckets(state, now, now);
    expect(thisWeek[0].total).toBe(2 * 60 * 60 * 1000);
    expect(todayTotal(state, now).total).toBe(2 * 60 * 60 * 1000);
  });

  it('keeps a whole evening in the week that contains Sunday', () => {
    const state = withSessions([
      {
        id: 'late',
        categoryId: 'distraction',
        start: at(2026, 11, 15, 22),
        end: at(2026, 11, 16, 0),
      },
    ]);
    const weeks = weekBuckets(state, at(2026, 11, 16, 12), 2);
    expect(weeks).toHaveLength(2);
    expect(weeks[0].start).toBe(at(2026, 11, 9));
    expect(weeks[0].total).toBe(2 * 60 * 60 * 1000);
    expect(weeks[1].total).toBe(0);
  });

  it('stacks categories without double counting', () => {
    const state = withSessions([
      { id: 'a', categoryId: 'distraction', start: at(2026, 11, 13, 9), end: at(2026, 11, 13, 10) },
      { id: 'b', categoryId: 'exercise', start: at(2026, 11, 13, 18), end: at(2026, 11, 13, 18, 30) },
    ]);
    const now = at(2026, 11, 13, 21);
    const today = todayTotal(state, now);
    expect(today.total).toBe(90 * 60 * 1000);
    expect(today.slices.map((slice) => slice.categoryId)).toEqual(['distraction', 'exercise']);

    const days = dayBuckets(state, now, now);
    expect(days[4].total).toBe(today.total);
    expect(weekTotal(state, now).total).toBe(today.total);
  });

  it('preserves elapsed time across a long span, including a clock change', () => {
    const start = new Date(2026, 2, 8, 1, 30).getTime();
    const end = new Date(2026, 2, 8, 3, 30).getTime();
    const state = withSessions([{ id: 'dst', categoryId: 'health', start, end }]);
    const day = startOfDay(start);
    const result = totals(state, day, addDays(day, 1), end);
    expect(result.total).toBe(end - start);

    const longStart = at(2026, 11, 1, 12);
    const longEnd = at(2026, 11, 20, 8);
    const longState = withSessions([
      { id: 'long', categoryId: 'distraction', start: longStart, end: longEnd },
    ]);
    const rangeStart = startOfWeek(longStart);
    const rangeEnd = addDays(startOfWeek(longEnd), 7);
    const covered = weekBuckets(longState, longEnd, 6).reduce((sum, bucket) => sum + bucket.total, 0);
    expect(covered).toBe(totals(longState, rangeStart, rangeEnd, longEnd).total);
    expect(covered).toBe(longEnd - longStart);
  });
});

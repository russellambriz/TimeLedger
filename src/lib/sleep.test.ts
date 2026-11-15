import { describe, expect, it } from 'vitest';
import { defaultState } from './defaults';
import { reducer } from './reducer';
import { averageSleep, lastNight, missedNightDefaults, nights } from './sleep';
import { parseState } from './storage';
import { focusState } from './defaults';
import { todayTotal } from './stats';

const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime();

describe('sleep timer', () => {
  it('saves a night as a Sleep session and adds the Sleep category', () => {
    let s = reducer(defaultState(), { type: 'sleep-start', now: at(14, 23) });
    expect(s.sleep?.startedAt).toBe(at(14, 23));
    s = reducer(s, { type: 'sleep-stop', now: at(15, 7), id: 'n1' });
    expect(s.sleep).toBeNull();
    expect(s.sessions).toEqual([{ id: 'n1', categoryId: 'sleep', start: at(14, 23), end: at(15, 7) }]);
    expect(s.categories.some((c) => c.id === 'sleep')).toBe(true);
  });

  it('does not count sleep as focus time', () => {
    let s = reducer(defaultState(), { type: 'sleep-start', now: at(15, 1) });
    s = reducer(s, { type: 'sleep-stop', now: at(15, 7), id: 'n1' });
    expect(todayTotal(focusState(s), at(15, 12)).total).toBe(0);
  });

  it('keeps the goal within 4 to 12 hours', () => {
    let s = reducer(defaultState(), { type: 'set-sleep-goal', minutes: 450 });
    expect(s.sleepGoal).toBe(450);
    s = reducer(s, { type: 'set-sleep-goal', minutes: 60 });
    expect(s.sleepGoal).toBe(450);
  });

  it('survives a save and reload', () => {
    let s = reducer(defaultState(), { type: 'sleep-start', now: at(14, 23) });
    s = reducer(s, { type: 'set-sleep-goal', minutes: 510 });
    const loaded = parseState(JSON.parse(JSON.stringify(s)));
    expect(loaded?.sleep).toEqual({ startedAt: at(14, 23) });
    expect(loaded?.sleepGoal).toBe(510);
  });
});

describe('sleep stats', () => {
  let s = defaultState();
  s = reducer(s, { type: 'sleep-start', now: at(13, 23) });
  s = reducer(s, { type: 'sleep-stop', now: at(14, 6), id: 'a' }); // 7h, morning of 14th
  s = reducer(s, { type: 'sleep-start', now: at(14, 22) });
  s = reducer(s, { type: 'sleep-stop', now: at(15, 7), id: 'b' }); // 9h, morning of 15th
  s = reducer(s, { type: 'sleep-start', now: at(15, 14) });
  s = reducer(s, { type: 'sleep-stop', now: at(15, 15), id: 'nap' }); // 1h nap on the 15th

  it('groups sleep by the morning you woke up, naps included', () => {
    const week = nights(s, at(15, 20), 7);
    expect(week).toHaveLength(7);
    expect(week[6].total).toBe(10 * 3_600_000);
    expect(week[6].bedtime).toBe(at(14, 22));
    expect(week[5].total).toBe(7 * 3_600_000);
    expect(averageSleep(week)).toBe(8.5 * 3_600_000);
  });

  it('finds last night', () => {
    expect(lastNight(s, at(15, 20))?.total).toBe(10 * 3_600_000);
    expect(lastNight(s, at(17, 20))?.day).toBe(new Date(2026, 10, 15).getTime());
  });

  it('suggests last night for a missed entry', () => {
    expect(missedNightDefaults(at(15, 9))).toEqual({ start: at(14, 22, 30), end: at(15, 6, 30) });
    expect(missedNightDefaults(at(15, 3))).toEqual({ start: at(13, 22, 30), end: at(14, 6, 30) });
  });
});

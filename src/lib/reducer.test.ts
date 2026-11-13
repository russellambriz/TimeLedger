import { describe, expect, it } from 'vitest';
import { defaultState } from './defaults';
import { reducer } from './reducer';
import { todayTotal } from './stats';

const at = (year: number, month: number, day: number, hour = 0, minute = 0) =>
  new Date(year, month - 1, day, hour, minute).getTime();

describe('timer reducer', () => {
  it('starts in the last category and saves that category on stop', () => {
    const started = reducer(defaultState(), { type: 'start', now: at(2026, 11, 13, 9) });
    expect(started.active).toEqual({ startedAt: at(2026, 11, 13, 9), categoryId: 'distraction' });

    const switched = reducer(started, { type: 'set-category', categoryId: 'exercise' });
    expect(switched.active?.categoryId).toBe('exercise');
    expect(switched.lastCategoryId).toBe('exercise');

    const stopped = reducer(switched, { type: 'stop', now: at(2026, 11, 13, 10), id: 's1' });
    expect(stopped.active).toBeNull();
    expect(stopped.sessions).toEqual([
      { id: 's1', categoryId: 'exercise', start: at(2026, 11, 13, 9), end: at(2026, 11, 13, 10) },
    ]);
    expect(todayTotal(stopped, at(2026, 11, 13, 11)).total).toBe(60 * 60 * 1000);

    const again = reducer(stopped, { type: 'start', now: at(2026, 11, 13, 12) });
    expect(again.active?.categoryId).toBe('exercise');
  });

  it('discards a running timer without a session', () => {
    const started = reducer(defaultState(), { type: 'start', now: 1_000 });
    const discarded = reducer(started, { type: 'discard' });
    expect(discarded.active).toBeNull();
    expect(discarded.sessions).toHaveLength(0);
  });

  it('archives a category that already has sessions and keeps the last one', () => {
    let state = reducer(defaultState(), {
      type: 'add-session',
      id: 's1',
      categoryId: 'distraction',
      start: 1_000,
      end: 5_000,
    });
    state = reducer(state, { type: 'remove-category', id: 'distraction' });
    expect(state.categories.find((category) => category.id === 'distraction')?.archived).toBe(true);
    expect(state.sessions).toHaveLength(1);
    expect(state.lastCategoryId).not.toBe('distraction');

    const only = {
      ...defaultState(),
      categories: [{ id: 'health', name: 'Health', color: '#6AADA0' }],
      lastCategoryId: 'health',
    };
    expect(reducer(only, { type: 'remove-category', id: 'health' })).toBe(only);
  });

  it('rejects an impossible manual session', () => {
    const state = defaultState();
    expect(
      reducer(state, { type: 'add-session', id: 'bad', categoryId: 'health', start: 50, end: 50 }),
    ).toBe(state);
    const saved = reducer(state, {
      type: 'add-session',
      id: 'ok',
      categoryId: 'health',
      start: 10,
      end: 20,
    });
    expect(reducer(saved, { type: 'update-session', id: 'ok', end: 10 })).toBe(saved);
  });
});

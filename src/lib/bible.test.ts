import { describe, expect, it } from 'vitest';
import { defaultState } from './defaults';
import { reducer } from './reducer';
import { parseState } from './storage';
import { todayTotal } from './stats';
import { focusState } from './defaults';

describe('Bible Study activity', () => {
  it('is included for new users', () => {
    expect(defaultState().categories.some((c) => c.id === 'bible-study' && c.name === 'Bible Study')).toBe(true);
  });

  it('is added for existing users without touching their data', () => {
    const old = { version: 1, categories: [{ id: 'focus', name: 'Focus', color: '#D4B896' }], sessions: [{ id: 's', categoryId: 'focus', start: 1000, end: 2000 }], active: null, lastCategoryId: 'focus' };
    const loaded = parseState(old)!;
    expect(loaded.categories.map((c) => c.id)).toContain('bible-study');
    expect(loaded.sessions).toHaveLength(1);
  });

  it('counts as focus time', () => {
    const now = new Date(2026, 10, 26, 20).getTime();
    let s = reducer(defaultState(), { type: 'set-category', categoryId: 'bible-study' });
    s = reducer(s, { type: 'start', now: now - 30 * 60_000 });
    s = reducer(s, { type: 'stop', now, id: 'b' });
    expect(s.sessions[0].categoryId).toBe('bible-study');
    expect(todayTotal(focusState(s), now).total).toBe(30 * 60_000);
  });

  it('stays removed after the user removes it', () => {
    const removed = reducer(defaultState(), { type: 'remove-category', id: 'bible-study' });
    const reloaded = parseState(JSON.parse(JSON.stringify(removed)))!;
    const bible = reloaded.categories.find((c) => c.id === 'bible-study');
    expect(bible?.archived).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { fromJSON, toCSV, toJSON } from './export';
import { defaultState } from './defaults';
import { reducer } from './reducer';
import { loadState, parseState, saveState, STORAGE_KEY } from './storage';

function memory() {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe('local backup', () => {
  it('round-trips a running timer through storage and JSON', () => {
    const running = reducer(defaultState(), { type: 'start', now: Date.now() - 5_000 });
    const store = memory();
    expect(saveState(running, store)).toBe(true);
    expect(loadState(store).active?.startedAt).toBe(running.active?.startedAt);
    expect(store.getItem(STORAGE_KEY)).toContain('focus');

    const imported = fromJSON(toJSON(running));
    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.state.active).toEqual(running.active);
      expect(imported.state.sessions).toEqual(running.sessions);
    }
  });

  it('falls back when storage is corrupt and rejects foreign files', () => {
    const store = memory();
    store.setItem(STORAGE_KEY, '{not json');
    expect(loadState(store).categories.map((category) => category.id)).toContain('focus');
    expect(fromJSON('{"app":"other","version":1,"categories":[],"sessions":[]}').ok).toBe(false);
    expect(parseState({ version: 2, categories: [], sessions: [] })).toBeNull();
  });

  it('repairs archived-only backups and escapes spreadsheet formulas', () => {
    const parsed = parseState({
      version: 1,
      categories: [{ id: 'a', name: 'A', color: '#112233', archived: true }],
      sessions: [
        { id: 'keep', categoryId: 'a', start: 10, end: 40 },
        { id: 'drop', categoryId: 'a', start: 10, end: 10 },
      ],
    });
    expect(parsed?.categories[0].archived).toBeUndefined();
    expect(parsed?.sessions).toHaveLength(1);

    const state = defaultState();
    state.categories = [{ id: 'x', name: '=cmd "hi"', color: '#C4624E' }, ...state.categories];
    state.sessions = [{ id: 's1', categoryId: 'x', start: 0, end: 1500 }];
    const csv = toCSV(state);
    expect(csv.startsWith('id,category,category_id,start,end,duration_seconds\n')).toBe(true);
    expect(csv).toContain(`"'=cmd ""hi"""`);
    expect(csv).toContain('1.500');
  });
});

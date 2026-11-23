import { describe, expect, it } from 'vitest';
import { dailyCaffeine, drinksOn, inSystem, quickDrinks, tonightsBedtime } from './caffeine';
import { defaultState } from './defaults';
import { reducer } from './reducer';
import { parseState } from './storage';
import { startOfDay } from './time';

const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime();

describe('drinks', () => {
  it('adds, edits, and deletes a drink', () => {
    let s = reducer(defaultState(), { type: 'add-drink', id: 'c', name: ' Coffee ', mg: 95, at: at(23, 8) });
    expect(s.drinks).toEqual([{ id: 'c', name: 'Coffee', mg: 95, at: at(23, 8) }]);
    s = reducer(s, { type: 'update-drink', id: 'c', mg: 120 });
    expect(s.drinks?.[0].mg).toBe(120);
    s = reducer(s, { type: 'delete-drink', id: 'c' });
    expect(s.drinks).toEqual([]);
  });

  it('rejects impossible amounts', () => {
    const s = defaultState();
    expect(reducer(s, { type: 'add-drink', id: 'x', name: 'Coffee', mg: 0, at: at(23, 8) })).toBe(s);
    expect(reducer(s, { type: 'add-drink', id: 'x', name: 'Coffee', mg: 5000, at: at(23, 8) })).toBe(s);
  });

  it('keeps drinks and the limit after a reload', () => {
    let s = reducer(defaultState(), { type: 'add-drink', id: 'c', name: 'Coffee', mg: 95, at: at(23, 8) });
    s = reducer(s, { type: 'set-caffeine-limit', mg: 300 });
    const loaded = parseState(JSON.parse(JSON.stringify(s)));
    expect(loaded?.drinks).toHaveLength(1);
    expect(loaded?.caffeineLimit).toBe(300);
  });
});

describe('caffeine math', () => {
  let s = defaultState();
  s = reducer(s, { type: 'add-drink', id: 'a', name: 'Coffee', mg: 100, at: at(23, 8) });
  s = reducer(s, { type: 'add-drink', id: 'b', name: 'Tea', mg: 40, at: at(23, 13) });
  s = reducer(s, { type: 'add-drink', id: 'y', name: 'Soda', mg: 35, at: at(22, 15) });

  it('halves every 5 hours', () => {
    expect(inSystem(s, at(23, 8))).toBeCloseTo(100 + 35 * Math.pow(0.5, 17 / 5), 5);
    expect(inSystem(s, at(23, 13))).toBeCloseTo(50 + 40 + 35 * Math.pow(0.5, 22 / 5), 5);
  });

  it('totals by day', () => {
    expect(drinksOn(s, startOfDay(at(23, 12))).map((d) => d.id)).toEqual(['b', 'a']);
    const week = dailyCaffeine(s, at(23, 20), 7);
    expect(week[6].mg).toBe(140);
    expect(week[5].mg).toBe(35);
  });

  it('uses 10:30 PM as bedtime without sleep data, and the average bedtime with it', () => {
    expect(tonightsBedtime(defaultState(), at(23, 14))).toBe(at(23, 22, 30));
    let withSleep = reducer(defaultState(), { type: 'add-session', id: 'n', categoryId: 'sleep', start: at(22, 23, 45), end: at(23, 7) });
    withSleep = reducer(withSleep, { type: 'add-session', id: 'm', categoryId: 'sleep', start: at(22, 0, 15), end: at(22, 7) });
    // Average of 11:45 PM and 12:15 AM is midnight.
    expect(tonightsBedtime(withSleep, at(23, 14))).toBe(at(24, 0));
    // Shortly after midnight, the bedtime that just arrived is still "tonight".
    expect(tonightsBedtime(withSleep, at(24, 0, 30))).toBe(at(24, 0));
  });
});

describe('quick picks', () => {
  it('starts with the standard list, Celsius included', () => {
    const names = quickDrinks(defaultState()).map((d) => d.name);
    expect(names).toHaveLength(8);
    expect(names.slice(0, 2)).toEqual(['Coffee', 'Celsius']);
  });

  it('puts recent drinks first, including custom ones, without duplicates', () => {
    let s = defaultState();
    s = reducer(s, { type: 'add-drink', id: '1', name: 'Coffee', mg: 95, at: at(22, 8) });
    s = reducer(s, { type: 'add-drink', id: '2', name: 'Celsius', mg: 200, at: at(23, 9) });
    s = reducer(s, { type: 'add-drink', id: '3', name: 'Yerba mate', mg: 80, at: at(23, 14) });
    const picks = quickDrinks(s);
    expect(picks.slice(0, 3).map((d) => [d.name, d.recent])).toEqual([
      ['Yerba mate', true],
      ['Celsius', true],
      ['Coffee', true],
    ]);
    expect(picks).toHaveLength(8);
    expect(new Set(picks.map((d) => d.name)).size).toBe(8);
  });
});


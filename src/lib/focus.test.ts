import { describe, expect, it } from 'vitest';
import { defaultState, focusState, migrateFocus } from './defaults';
import { monthTotal, monthBuckets } from './stats';
import { parseState } from './storage';
const at = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h).getTime();
describe('focus progress', () => {
 it('splits a session at the month and year boundary and includes a running session', () => {
  const state = defaultState();
  state.sessions = [{id: 'a', categoryId: 'reading', start: at(2025,12,31,23), end: at(2026,1,1,1)}];
  state.active = {categoryId: 'homework', startedAt: at(2026,1,1,2)};
  const now = at(2026,1,1,3);
  expect(monthTotal(state, now).total).toBe(7200000);
  expect(monthBuckets(state, now, 2).map(b => b.total)).toEqual([3600000,7200000]);
 });
 it('handles February in a leap year', () => {
  const state = defaultState();
  state.sessions = [{id:'a',categoryId:'focus',start:at(2024,2,29,23),end:at(2024,3,1,1)}];
  expect(monthTotal(state, at(2024,2,29,23)).total).toBe(3600000);
  expect(monthTotal(state, at(2024,3,1,2)).total).toBe(3600000);
 });
 it('preserves legacy history and running timer but excludes non-focus time from progress', () => {
  const legacy = {...defaultState(), categories:[{id:'phone',name:'Phone/Social',color:'#D4A054'}], lastCategoryId:'phone', sessions:[{id:'old',categoryId:'phone',start:1000,end:5000}], active:{categoryId:'phone',startedAt:Date.now()-5000}};
  const migrated = parseState(legacy)!;
  expect(migrated.sessions).toEqual(legacy.sessions);
  expect(migrated.active).toEqual(legacy.active);
  expect(migrated.lastCategoryId).toBe('focus');
  expect(migrateFocus(migrated)).toEqual(migrated);
  expect(focusState(migrated).sessions).toEqual([]);
  expect(focusState(migrated).active).toBeNull();
 });
});

import { reducer } from './reducer';
import { saveState } from './storage';
describe('session safety', () => {
 it('rejects overlapping manual entries and edits but accepts adjacent sessions', () => {
  const state = {...defaultState(), sessions:[{id:'a', categoryId:'focus',start:1000,end:3000}]};
  expect(reducer(state,{type:'add-session',id:'b',categoryId:'reading',start:2000,end:4000})).toBe(state);
  const adjacent = reducer(state,{type:'add-session',id:'b',categoryId:'reading',start:3000,end:4000});
  expect(adjacent.sessions).toHaveLength(2);
  expect(reducer(adjacent,{type:'update-session',id:'b',start:2000})).toBe(adjacent);
 });
 it('rejects manual sessions that overlap the running timer', () => {
  const state = {...defaultState(),active:{categoryId:'focus',startedAt:2000}};
  expect(reducer(state,{type:'add-session',id:'b',categoryId:'reading',start:1000,end:3000})).toBe(state);
 });
 it('reports storage failure without claiming persistence', () => {
  expect(saveState(defaultState(),{setItem:() => {throw new Error('Quota exceeded');}})).toBe(false);
 });
});

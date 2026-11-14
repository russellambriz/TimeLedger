import { expect, it } from 'vitest';
import { defaultState, homeworkState } from './defaults';
import { fromJSON, toJSON } from './export';
import { parseState } from './storage';
import { todayTotal, weekTotal, monthTotal } from './stats';
it('adds subjects to existing ledgers once without changing their history', () => {
 const state = {...defaultState(), categories: defaultState().categories.filter(c => !c.id.startsWith('homework-'))};
 state.sessions = [{id:'old',categoryId:'homework',start:1000,end:2000}];
 const migrated = parseState(state)!;
 expect(migrated.sessions).toEqual(state.sessions);
 expect(migrated.categories.filter(c => c.id.startsWith('homework-'))).toHaveLength(2);
 expect(parseState(migrated)).toEqual(migrated);
});
it('tracks each subject separately and adds homework totals without double counting', () => {
 const start = new Date(2026,10,14,9).getTime(); const now = start+10800000;
 const state = defaultState();
 state.sessions = [
  {id:'c', categoryId:'homework-chemistry',start,end:start+3600000},
  {id:'m', categoryId:'homework-math',start:start+3600000,end:start+7200000},
 ];
 state.active = {categoryId:'homework-math',startedAt:start+7200000};
 for (const total of [todayTotal,weekTotal,monthTotal]) {
  expect(total(homeworkState(state,'homework-chemistry'),now).total).toBe(3600000);
  expect(total(homeworkState(state,'homework-math'),now).total).toBe(7200000);
  expect(total(homeworkState(state),now).total).toBe(10800000);
  expect(total(state,now).total).toBe(10800000);
 }
 const restored=fromJSON(toJSON({...state,active:null}));
 expect(restored.ok && restored.state.sessions).toEqual(state.sessions);
});

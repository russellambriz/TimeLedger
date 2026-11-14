import {expect,it} from 'vitest';
import {defaultState} from './defaults';
import {timelineSessions} from './timeline';
import {addDays,startOfDay} from './time';
it('splits overnight sessions while keeping the original exact dates', () => {
 const start = new Date(2026,10,14,23,30).getTime(), end = new Date(2026,10,15,1).getTime();
 const state = {...defaultState(), sessions:[{id:'a',categoryId:'homework-math',start,end}]};
 const first = timelineSessions(state,start,end)[0], second=timelineSessions(state,end,end)[0];
 expect(first.visibleEnd-first.visibleStart).toBe(30*60000);
 expect(second.visibleEnd-second.visibleStart).toBe(60*60000);
 expect(second.start).toBe(start);expect(first.end).toBe(end);
 expect(timelineSessions(state,new Date(2026,10,16).getTime(),end)).toHaveLength(0);
});
it('includes the active timer without adding a saved duplicate', () => {
 const start = new Date(2026,10,14,9).getTime();
 const state = {...defaultState(),active:{categoryId:'homework-chemistry',startedAt:start}};
 const rows=timelineSessions(state,start,start+60000);
 expect(rows).toHaveLength(1);expect(rows[0].running).toBe(true);expect(rows[0].visibleEnd-start).toBe(60000);
});
it('maps a full DST day to the whole timeline', () => {
 const start=startOfDay(new Date(2026,2,8).getTime()), end=addDays(start,1);
 const state={...defaultState(),sessions:[{id:'a',categoryId:'focus',start,end}]};
 const rows=timelineSessions(state,start,end);
 expect(rows[0].left).toBe(0);expect(rows[0].width).toBe(100);
 expect(timelineSessions(state,end,end)).toHaveLength(0);
});

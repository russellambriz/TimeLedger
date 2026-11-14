import type { State } from '../types';
import { startOfDay, addDays } from './time';
export function timelineSessions(state: State, day: number, now: number) {
  const start = startOfDay(day), end = addDays(start, 1);
  const sessions = state.sessions.map(s => ({...s, running: false}));
  if (state.active) sessions.push({id: 'running-timer', categoryId: state.active.categoryId, start: state.active.startedAt, end: now, running: true});
  return sessions.filter(s => s.start < end && s.end > start && s.end > s.start)
    .sort((a,b) => a.start - b.start)
    .map(s => ({...s, visibleStart: Math.max(s.start,start), visibleEnd: Math.min(s.end,end),
      left: (Math.max(s.start,start)-start)/(end-start)*100,
      width: (Math.min(s.end,end)-Math.max(s.start,start))/(end-start)*100}));
}

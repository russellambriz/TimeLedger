import { DEFAULT_SLEEP_GOAL, SLEEP_CATEGORY } from './defaults';
import { addDays, startOfDay } from './time';
import type { Session, State } from '../types';

/** One morning's sleep: every sleep session that ended on that calendar day (naps included). */
export type Night = {
  /** Start of the day you woke up. */
  day: number;
  total: number;
  bedtime: number | null;
  wake: number | null;
};

export const sleepGoalMs = (state: State) => (state.sleepGoal ?? DEFAULT_SLEEP_GOAL) * 60_000;

export function sleepSessions(state: State): Session[] {
  return state.sessions.filter((s) => s.categoryId === SLEEP_CATEGORY.id).sort((a, b) => b.end - a.end);
}

/** The last `count` days ending today, oldest first. */
export function nights(state: State, now: number, count: number): Night[] {
  const today = startOfDay(now);
  const first = addDays(today, -(count - 1));
  const list: Night[] = [];
  for (let i = 0; i < count; i += 1) list.push({ day: addDays(first, i), total: 0, bedtime: null, wake: null });
  const index = new Map(list.map((night, i) => [night.day, i]));
  for (const s of sleepSessions(state)) {
    const slot = index.get(startOfDay(s.end));
    if (slot === undefined) continue;
    const night = list[slot];
    night.total += s.end - s.start;
    night.bedtime = night.bedtime === null ? s.start : Math.min(night.bedtime, s.start);
    night.wake = night.wake === null ? s.end : Math.max(night.wake, s.end);
  }
  return list;
}

/** Average of the nights that have any sleep recorded, or null when none do. */
export function averageSleep(list: Night[]): number | null {
  const logged = list.filter((n) => n.total > 0);
  if (logged.length === 0) return null;
  return logged.reduce((sum, n) => sum + n.total, 0) / logged.length;
}

/** Most recent morning with sleep recorded. */
export function lastNight(state: State, now: number): Night | null {
  const latest = sleepSessions(state)[0];
  if (!latest) return null;
  const day = startOfDay(latest.end);
  const span = Math.round((startOfDay(now) - day) / 86_400_000) + 1;
  return nights(state, now, Math.max(1, span))[0] ?? null;
}

/** Default times for logging a missed night: 10:30 PM to 6:30 AM, ending on the most recent morning. */
export function missedNightDefaults(now: number): { start: number; end: number } {
  let wake = startOfDay(now) + 6.5 * 3_600_000;
  if (wake > now) wake = addDays(wake, -1);
  const bed = addDays(startOfDay(wake), -1) + 22.5 * 3_600_000;
  return { start: bed, end: wake };
}

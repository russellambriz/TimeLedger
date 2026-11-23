import { addDays, startOfDay } from './time';
import { nights } from './sleep';
import type { Drink, State } from '../types';

export const DEFAULT_CAFFEINE_LIMIT = 400;
/** Typical caffeine half-life in healthy adults; it varies a lot between people. */
export const HALF_LIFE_MS = 5 * 3_600_000;
/** Above this much caffeine at bedtime, falling asleep tends to get harder. */
export const BEDTIME_CAUTION_MG = 50;

export const DRINK_PRESETS: readonly { name: string; mg: number }[] = [
  { name: 'Coffee', mg: 95 },
  { name: 'Celsius', mg: 200 },
  { name: 'Red Bull 12\u00a0oz', mg: 114 },
  { name: 'Espresso', mg: 63 },
  { name: 'Cold brew', mg: 200 },
  { name: 'Black tea', mg: 47 },
  { name: 'Green tea', mg: 28 },
  { name: 'Matcha', mg: 70 },
  { name: 'Energy drink', mg: 160 },
  { name: 'Soda', mg: 35 },
];

/**
 * Quick-pick drinks: what you drank most recently comes first (including your
 * own custom drinks), then the standard list fills the rest.
 */
export function quickDrinks(state: State, count = 12): { name: string; mg: number; recent: boolean }[] {
  const out: { name: string; mg: number; recent: boolean }[] = [];
  const seen = new Set<string>();
  const key = (name: string) => name.trim().toLowerCase();
  const recent = (state.drinks ?? []).slice().sort((a, b) => b.at - a.at);
  for (const d of recent) {
    if (out.length >= count) break;
    if (seen.has(key(d.name))) continue;
    seen.add(key(d.name));
    out.push({ name: d.name, mg: d.mg, recent: true });
  }
  for (const preset of DRINK_PRESETS) {
    if (out.length >= count) break;
    if (seen.has(key(preset.name))) continue;
    seen.add(key(preset.name));
    out.push({ ...preset, recent: false });
  }
  return out;
}

export const caffeineLimit = (state: State) => state.caffeineLimit ?? DEFAULT_CAFFEINE_LIMIT;

export function drinksOn(state: State, day: number): Drink[] {
  const end = addDays(day, 1);
  return (state.drinks ?? []).filter((d) => d.at >= day && d.at < end).sort((a, b) => b.at - a.at);
}

/** Estimated caffeine still in the body at time `t`, using exponential decay. */
export function inSystem(state: State, t: number): number {
  let total = 0;
  for (const d of state.drinks ?? []) {
    if (d.at > t) continue;
    total += d.mg * Math.pow(0.5, (t - d.at) / HALF_LIFE_MS);
  }
  return total;
}

/** Daily totals for the last `count` days ending today, oldest first. */
export function dailyCaffeine(state: State, now: number, count: number): { day: number; mg: number }[] {
  const first = addDays(startOfDay(now), -(count - 1));
  const list = Array.from({ length: count }, (_, i) => ({ day: addDays(first, i), mg: 0 }));
  const index = new Map(list.map((item, i) => [item.day, i]));
  for (const d of state.drinks ?? []) {
    const slot = index.get(startOfDay(d.at));
    if (slot !== undefined) list[slot].mg += d.mg;
  }
  return list;
}

/**
 * Tonight's bedtime: the average bedtime from the last two weeks of sleep
 * (by time of day), or 10:30 PM when there is none.
 */
export function tonightsBedtime(state: State, now: number): number {
  const offsets: number[] = [];
  for (const n of nights(state, now, 14)) {
    if (n.bedtime === null) continue;
    // Minutes after noon, so 11 PM and 1 AM average sensibly.
    let minutes = (n.bedtime - startOfDay(n.bedtime)) / 60_000 - 720;
    if (minutes < 0) minutes += 1440;
    offsets.push(minutes);
  }
  const minutes = offsets.length ? offsets.reduce((a, b) => a + b, 0) / offsets.length : 630;
  const slot = startOfDay(now) + (720 + Math.round(minutes / 15) * 15) * 60_000;
  // The next bedtime that hasn't long passed: e.g. at 12:30 AM with a 1 AM bedtime, that's 30 minutes away.
  const candidates = [addDays(slot, -1), slot, addDays(slot, 1)];
  return candidates.find((t) => t >= now - 3 * 3_600_000) ?? slot;
}

import type { State } from '../types';
import { addDays, startOfDay, startOfWeek } from './time';

export type Slice = {
  categoryId: string;
  ms: number;
};

export type Total = {
  total: number;
  slices: Slice[];
};

export type Bucket = {
  start: number;
  end: number;
  total: number;
  slices: Slice[];
};

type Span = {
  categoryId: string;
  start: number;
  end: number;
};

function spans(state: State, now: number): Span[] {
  const list: Span[] = [];
  for (const session of state.sessions) {
    if (session.end > session.start) {
      list.push({
        categoryId: session.categoryId,
        start: session.start,
        end: session.end,
      });
    }
  }
  if (state.active && now > state.active.startedAt) {
    list.push({
      categoryId: state.active.categoryId,
      start: state.active.startedAt,
      end: now,
    });
  }
  return list;
}

function walk(span: Span, clipStart: number, clipEnd: number, onSlice: (dayStart: number, ms: number) => void) {
  let cursor = Math.max(span.start, clipStart);
  const limit = Math.min(span.end, clipEnd);
  let guard = 0;
  while (cursor < limit && guard < 20000) {
    guard += 1;
    const day = startOfDay(cursor);
    const next = addDays(day, 1);
    if (next <= cursor) break;
    const sliceEnd = Math.min(limit, next);
    onSlice(day, sliceEnd - cursor);
    cursor = sliceEnd;
  }
}

function ordered(state: State, map: Map<string, number>): Slice[] {
  const slices: Slice[] = [];
  const seen = new Set<string>();
  for (const category of state.categories) {
    const ms = map.get(category.id) ?? 0;
    if (ms > 0) {
      slices.push({ categoryId: category.id, ms });
      seen.add(category.id);
    }
  }
  for (const [categoryId, ms] of map) {
    if (ms > 0 && !seen.has(categoryId)) slices.push({ categoryId, ms });
  }
  return slices;
}

function emptyBucket(start: number, end: number): Bucket {
  return { start, end, total: 0, slices: [] };
}

function fillBuckets(buckets: Bucket[], state: State, now: number, keyOf: (dayStart: number) => number): Bucket[] {
  if (buckets.length === 0) return buckets;
  const maps = buckets.map(() => new Map<string, number>());
  const index = new Map(buckets.map((bucket, i) => [bucket.start, i]));
  const clipStart = buckets[0].start;
  const clipEnd = buckets[buckets.length - 1].end;
  for (const span of spans(state, now)) {
    walk(span, clipStart, clipEnd, (day, ms) => {
      const slot = index.get(keyOf(day));
      if (slot === undefined) return;
      const map = maps[slot];
      map.set(span.categoryId, (map.get(span.categoryId) ?? 0) + ms);
    });
  }
  return buckets.map((bucket, i) => {
    const slices = ordered(state, maps[i]);
    const total = slices.reduce((sum, slice) => sum + slice.ms, 0);
    return { ...bucket, slices, total };
  });
}

export function totals(state: State, rangeStart: number, rangeEnd: number, now: number): Total {
  const map = new Map<string, number>();
  for (const span of spans(state, now)) {
    walk(span, rangeStart, rangeEnd, (_day, ms) => {
      map.set(span.categoryId, (map.get(span.categoryId) ?? 0) + ms);
    });
  }
  const slices = ordered(state, map);
  return {
    total: slices.reduce((sum, slice) => sum + slice.ms, 0),
    slices,
  };
}

export function todayTotal(state: State, now: number): Total {
  const start = startOfDay(now);
  return totals(state, start, addDays(start, 1), now);
}

export function weekTotal(state: State, now: number): Total {
  const start = startOfWeek(now);
  return totals(state, start, addDays(start, 7), now);
}

/** Seven local days, Monday through Sunday, for the week containing `anyDayInWeek`. */
export function dayBuckets(state: State, anyDayInWeek: number, now: number): Bucket[] {
  const monday = startOfWeek(anyDayInWeek);
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const start = addDays(monday, index);
    return emptyBucket(start, addDays(start, 1));
  });
  return fillBuckets(buckets, state, now, (day) => day);
}

/** `count` weeks ending with the week that contains `now`. */
export function weekBuckets(state: State, now: number, count: number): Bucket[] {
  const current = startOfWeek(now);
  const first = addDays(current, -(count - 1) * 7);
  const buckets = Array.from({ length: count }, (_, index) => {
    const start = addDays(first, index * 7);
    return emptyBucket(start, addDays(start, 7));
  });
  return fillBuckets(buckets, state, now, startOfWeek);
}

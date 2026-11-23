import { parseDrink, parseState } from './storage';
import type { Category, Drink, Session, State } from '../types';

// Every synced thing is one record: a session, a category, or the "settings"
// record (running timer + last used activity). Records are never hard-deleted
// in the cloud; a deletion is a tombstone so it reaches every device.
export type RecordKind = 'session' | 'category' | 'settings' | 'drink';

export type SyncRow = {
  kind: RecordKind;
  id: string;
  data: Record<string, unknown> | null;
  deleted: boolean;
  /** Client time (ms) of the change. Newest change wins. */
  modified_at: number;
  /** Server time of the last write; used as the pull cursor. */
  updated_at?: string;
};

export type SyncMeta = {
  /** Account this device last synced with. */
  userId: string | null;
  /** Newest server updated_at already pulled. */
  cursor: string | null;
  /** Last change time per record key. */
  mtimes: Record<string, number>;
  /** Records changed on this device and not yet uploaded. */
  dirty: Record<string, true>;
};

export const SETTINGS_KEY = 'settings:main';
export const META_KEY = 'hourwell.sync.v1';

export const emptyMeta = (): SyncMeta => ({ userId: null, cursor: null, mtimes: {}, dirty: {} });

export const keyOf = (kind: RecordKind, id: string) => `${kind}:${id}`;

function splitKey(key: string): [RecordKind, string] {
  const at = key.indexOf(':');
  return [key.slice(0, at) as RecordKind, key.slice(at + 1)];
}

function sameSession(a: Session, b: Session) {
  return a.start === b.start && a.end === b.end && a.categoryId === b.categoryId;
}

function sameCategory(a: Category, b: Category) {
  return a.name === b.name && a.color === b.color && !!a.archived === !!b.archived;
}

function settingsOf(state: State) {
  return {
    active: state.active,
    lastCategoryId: state.lastCategoryId,
    sleep: state.sleep ?? null,
    sleepGoal: state.sleepGoal ?? null,
    caffeineLimit: state.caffeineLimit ?? null,
  };
}

function sameDrink(a: Drink, b: Drink) {
  return a.name === b.name && a.mg === b.mg && a.at === b.at;
}

/** Keys of every record that differs between two states (including removals). */
export function diffState(prev: State, next: State): string[] {
  const keys: string[] = [];
  const prevSessions = new Map(prev.sessions.map((s) => [s.id, s]));
  const nextSessions = new Map(next.sessions.map((s) => [s.id, s]));
  for (const [id, s] of nextSessions) {
    const old = prevSessions.get(id);
    if (!old || !sameSession(old, s)) keys.push(keyOf('session', id));
  }
  for (const id of prevSessions.keys()) if (!nextSessions.has(id)) keys.push(keyOf('session', id));

  const prevCats = new Map(prev.categories.map((c) => [c.id, c]));
  const nextCats = new Map(next.categories.map((c) => [c.id, c]));
  for (const [id, c] of nextCats) {
    const old = prevCats.get(id);
    if (!old || !sameCategory(old, c)) keys.push(keyOf('category', id));
  }
  for (const id of prevCats.keys()) if (!nextCats.has(id)) keys.push(keyOf('category', id));

  const prevDrinks = new Map((prev.drinks ?? []).map((d) => [d.id, d]));
  const nextDrinks = new Map((next.drinks ?? []).map((d) => [d.id, d]));
  for (const [id, d] of nextDrinks) {
    const old = prevDrinks.get(id);
    if (!old || !sameDrink(old, d)) keys.push(keyOf('drink', id));
  }
  for (const id of prevDrinks.keys()) if (!nextDrinks.has(id)) keys.push(keyOf('drink', id));

  if (JSON.stringify(settingsOf(prev)) !== JSON.stringify(settingsOf(next))) keys.push(SETTINGS_KEY);
  return keys;
}

/** Every record key present in a state. */
export function allKeys(state: State): string[] {
  return [
    ...state.categories.map((c) => keyOf('category', c.id)),
    ...state.sessions.map((s) => keyOf('session', s.id)),
    ...(state.drinks ?? []).map((d) => keyOf('drink', d.id)),
    SETTINGS_KEY,
  ];
}

/** Record local changes: bump their change time and queue them for upload. */
export function markChanged(meta: SyncMeta, keys: string[], now: number): SyncMeta {
  if (keys.length === 0) return meta;
  const mtimes = { ...meta.mtimes };
  const dirty = { ...meta.dirty };
  for (const key of keys) {
    mtimes[key] = Math.max(now, (mtimes[key] ?? 0) + 1);
    dirty[key] = true;
  }
  return { ...meta, mtimes, dirty };
}

/**
 * Prepare a device for an account. The first time a device syncs with an
 * account, everything already on it is queued for upload, so existing history
 * comes along automatically. Untouched records get change time 1, so an older
 * device's data is never overwritten by another device's untouched defaults.
 */
export function prepareForUser(meta: SyncMeta, state: State, userId: string): SyncMeta {
  if (meta.userId === userId) return meta;
  const mtimes = { ...meta.mtimes };
  const dirty = { ...meta.dirty };
  for (const key of allKeys(state)) {
    mtimes[key] = Math.max(mtimes[key] ?? 0, 1);
    dirty[key] = true;
  }
  return { userId, cursor: null, mtimes, dirty };
}

/** Build the upload row for a record key from the current state. */
export function rowFor(state: State, key: string, modifiedAt: number): SyncRow {
  const [kind, id] = splitKey(key);
  const base = { kind, id, modified_at: modifiedAt };
  if (kind === 'session') {
    const s = state.sessions.find((item) => item.id === id);
    return s
      ? { ...base, deleted: false, data: { categoryId: s.categoryId, start: s.start, end: s.end } }
      : { ...base, deleted: true, data: null };
  }
  if (kind === 'drink') {
    const d = (state.drinks ?? []).find((item) => item.id === id);
    return d
      ? { ...base, deleted: false, data: { name: d.name, mg: d.mg, at: d.at } }
      : { ...base, deleted: true, data: null };
  }
  if (kind === 'category') {
    const c = state.categories.find((item) => item.id === id);
    if (!c) return { ...base, deleted: true, data: null };
    const data: Record<string, unknown> = { name: c.name, color: c.color };
    if (c.archived) data.archived = true;
    return { ...base, deleted: false, data };
  }
  return { ...base, deleted: false, data: settingsOf(state) };
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Merge rows pulled from the cloud into local state. A remote row wins unless
 * this device holds a newer (or equal, not-yet-uploaded) change to the same
 * record. Returns the merged state and updated metadata.
 */
export function applyRemote(state: State, rows: SyncRow[], meta: SyncMeta): { state: State; meta: SyncMeta } {
  if (rows.length === 0) return { state, meta };
  const sessions = new Map(state.sessions.map((s) => [s.id, s]));
  const categories = new Map(state.categories.map((c) => [c.id, c]));
  let active = state.active;
  let lastCategoryId = state.lastCategoryId;
  let sleep = state.sleep ?? null;
  let sleepGoal = state.sleepGoal;
  let caffeineLimit = state.caffeineLimit;
  const drinks = new Map((state.drinks ?? []).map((d) => [d.id, d]));
  const mtimes = { ...meta.mtimes };
  const dirty = { ...meta.dirty };
  let cursor = meta.cursor;
  let changed = false;

  for (const row of rows) {
    if (row.updated_at && (!cursor || row.updated_at > cursor)) cursor = row.updated_at;
    const key = keyOf(row.kind, row.id);
    const local = mtimes[key] ?? 0;
    if (row.modified_at < local) continue;
    if (row.modified_at === local && dirty[key]) continue;
    mtimes[key] = row.modified_at;
    delete dirty[key];
    const d = row.data ?? {};

    if (row.kind === 'drink') {
      if (row.deleted) {
        changed = drinks.delete(row.id) || changed;
        continue;
      }
      const drink = parseDrink({ id: row.id, ...d });
      if (!drink) continue;
      const old = drinks.get(row.id);
      if (!old || !sameDrink(old, drink)) {
        drinks.set(row.id, drink);
        changed = true;
      }
    } else if (row.kind === 'session') {
      if (row.deleted) {
        changed = sessions.delete(row.id) || changed;
        continue;
      }
      const start = num(d.start);
      const end = num(d.end);
      const categoryId = typeof d.categoryId === 'string' ? d.categoryId : '';
      if (start === null || end === null || !(end > start) || !categoryId) continue;
      const next = { id: row.id, categoryId, start, end };
      const old = sessions.get(row.id);
      if (!old || !sameSession(old, next)) {
        sessions.set(row.id, next);
        changed = true;
      }
    } else if (row.kind === 'category') {
      if (row.deleted) {
        changed = categories.delete(row.id) || changed;
        continue;
      }
      if (typeof d.name !== 'string' || typeof d.color !== 'string') continue;
      const next: Category = { id: row.id, name: d.name, color: d.color };
      if (d.archived === true) next.archived = true;
      const old = categories.get(row.id);
      if (!old || !sameCategory(old, next)) {
        categories.set(row.id, next);
        changed = true;
      }
    } else if (row.kind === 'settings') {
      const a = d.active as { startedAt?: unknown; categoryId?: unknown } | null | undefined;
      const startedAt = num(a?.startedAt);
      const nextActive =
        a && startedAt !== null && typeof a.categoryId === 'string' ? { startedAt, categoryId: a.categoryId } : null;
      const nextLast = typeof d.lastCategoryId === 'string' ? d.lastCategoryId : lastCategoryId;
      const s = d.sleep as { startedAt?: unknown } | null | undefined;
      const sleepStart = num(s?.startedAt);
      const nextSleep = sleepStart !== null ? { startedAt: sleepStart } : null;
      const nextGoal = num(d.sleepGoal) ?? sleepGoal;
      const nextLimit = num(d.caffeineLimit) ?? caffeineLimit;
      if (
        JSON.stringify([nextActive, nextLast, nextSleep, nextGoal ?? null, nextLimit ?? null]) !==
        JSON.stringify([active, lastCategoryId, sleep, sleepGoal ?? null, caffeineLimit ?? null])
      ) {
        caffeineLimit = nextLimit;
        active = nextActive;
        lastCategoryId = nextLast;
        sleep = nextSleep;
        sleepGoal = nextGoal;
        changed = true;
      }
    }
  }

  const nextMeta = { ...meta, cursor, mtimes, dirty };
  if (!changed) return { state, meta: nextMeta };
  const merged = parseState({
    version: 1,
    categories: [...categories.values()],
    sessions: [...sessions.values()],
    active,
    lastCategoryId,
    sleep,
    sleepGoal,
    drinks: [...drinks.values()],
    caffeineLimit,
  });
  return { state: merged ?? state, meta: nextMeta };
}

export function loadMeta(storage: Pick<Storage, 'getItem'> = localStorage): SyncMeta {
  try {
    const raw = storage.getItem(META_KEY);
    if (!raw) return emptyMeta();
    const parsed = JSON.parse(raw) as Partial<SyncMeta>;
    return {
      userId: typeof parsed.userId === 'string' ? parsed.userId : null,
      cursor: typeof parsed.cursor === 'string' ? parsed.cursor : null,
      mtimes: parsed.mtimes && typeof parsed.mtimes === 'object' ? parsed.mtimes : {},
      dirty: parsed.dirty && typeof parsed.dirty === 'object' ? parsed.dirty : {},
    };
  } catch {
    return emptyMeta();
  }
}

export function saveMeta(meta: SyncMeta, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try {
    storage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Sync metadata is rebuilt on the next sign-in if it cannot be saved.
  }
}

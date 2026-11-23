import { defaultState, migrateFocus, migrateHomework } from './defaults';
import type { ActiveTimer, Category, Drink, Session, SleepTimer, State } from '../types';

export const MIN_SLEEP_GOAL = 240;
export const MAX_SLEEP_GOAL = 720;
export const MIN_CAFFEINE_LIMIT = 50;
export const MAX_CAFFEINE_LIMIT = 1000;
export const MAX_DRINK_MG = 1000;

export const STORAGE_KEY = 'timeledger.v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseState(input: unknown): State | null {
  if (!isRecord(input)) return null;
  if (input.app !== undefined && input.app !== 'timeledger') return null;
  if (input.version !== undefined && input.version !== 1) return null;
  if (!Array.isArray(input.categories) || !Array.isArray(input.sessions)) return null;
  if (input.sessions.length > 50000 || input.categories.length > 500) return null;

  const categories: Category[] = [];
  const seenCategories = new Set<string>();
  for (const raw of input.categories) {
    if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') continue;
    const id = raw.id;
    const name = raw.name.trim().slice(0, 40);
    if (!id || !name || seenCategories.has(id)) continue;
    const color =
      typeof raw.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(raw.color) ? raw.color.toUpperCase() : '#B08958';
    const category: Category = { id, name, color };
    if (raw.archived === true) category.archived = true;
    categories.push(category);
    seenCategories.add(id);
  }
  if (categories.length === 0) return null;

  const sessions: Session[] = [];
  const seenSessions = new Set<string>();
  for (const raw of input.sessions) {
    if (!isRecord(raw)) continue;
    const id = typeof raw.id === 'string' ? raw.id : '';
    const categoryId = typeof raw.categoryId === 'string' ? raw.categoryId : '';
    const start = typeof raw.start === 'number' ? raw.start : Number.NaN;
    const end = typeof raw.end === 'number' ? raw.end : Number.NaN;
    if (!id || !categoryId || seenSessions.has(id)) continue;
    if (!Number.isFinite(start) || !Number.isFinite(end) || !(end > start)) continue;
    sessions.push({ id, categoryId, start, end });
    seenSessions.add(id);
  }

  let active: ActiveTimer | null = null;
  if (isRecord(input.active)) {
    const startedAt = input.active.startedAt;
    const categoryId = input.active.categoryId;
    const earliest = Date.UTC(2000, 0, 1);
    if (
      typeof startedAt === 'number' &&
      Number.isFinite(startedAt) &&
      typeof categoryId === 'string' &&
      startedAt > earliest &&
      startedAt <= Date.now() + 60_000
    ) {
      active = { startedAt, categoryId };
    }
  }

  if (!categories.some((category) => !category.archived)) {
    const first = categories[0];
    categories[0] = { id: first.id, name: first.name, color: first.color };
  }
  const usable = categories.filter((category) => !category.archived);
  let lastCategoryId = typeof input.lastCategoryId === 'string' ? input.lastCategoryId : '';
  if (!usable.some((category) => category.id === lastCategoryId)) lastCategoryId = usable[0].id;
  if (active && !categories.some((category) => category.id === active?.categoryId)) {
    active = { ...active, categoryId: lastCategoryId };
  }

  let sleep: SleepTimer | null = null;
  if (isRecord(input.sleep)) {
    const startedAt = input.sleep.startedAt;
    if (typeof startedAt === 'number' && Number.isFinite(startedAt) && startedAt > Date.UTC(2000, 0, 1) && startedAt <= Date.now() + 60_000) {
      sleep = { startedAt };
    }
  }
  const sleepGoal =
    typeof input.sleepGoal === 'number' && input.sleepGoal >= MIN_SLEEP_GOAL && input.sleepGoal <= MAX_SLEEP_GOAL
      ? Math.round(input.sleepGoal)
      : undefined;

  const drinks: Drink[] = [];
  if (Array.isArray(input.drinks)) {
    const seenDrinks = new Set<string>();
    for (const raw of input.drinks.slice(0, 50000)) {
      const drink = parseDrink(raw);
      if (drink && !seenDrinks.has(drink.id)) {
        drinks.push(drink);
        seenDrinks.add(drink.id);
      }
    }
  }
  const caffeineLimit =
    typeof input.caffeineLimit === 'number' && input.caffeineLimit >= MIN_CAFFEINE_LIMIT && input.caffeineLimit <= MAX_CAFFEINE_LIMIT
      ? Math.round(input.caffeineLimit)
      : undefined;

  const base: State = { version: 1, categories, sessions, active, lastCategoryId };
  if (drinks.length) base.drinks = drinks;
  if (caffeineLimit !== undefined) base.caffeineLimit = caffeineLimit;
  if (sleep) base.sleep = sleep;
  if (sleepGoal !== undefined) base.sleepGoal = sleepGoal;
  return migrateHomework(migrateFocus(base));
}

/** Validate one drink from storage, a backup, or the cloud. */
export function parseDrink(raw: unknown): Drink | null {
  if (!isRecord(raw)) return null;
  const { id, name, mg, at } = raw;
  if (typeof id !== 'string' || !id || typeof name !== 'string' || !name.trim()) return null;
  if (typeof mg !== 'number' || !Number.isFinite(mg) || mg <= 0 || mg > MAX_DRINK_MG) return null;
  if (typeof at !== 'number' || !Number.isFinite(at) || at < Date.UTC(2000, 0, 1)) return null;
  return { id, name: name.trim().slice(0, 40), mg: Math.round(mg), at };
}

export function loadState(storage: Pick<Storage, 'getItem'> = localStorage): State {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return parseState(JSON.parse(raw)) ?? defaultState();
  } catch {
    return defaultState();
  }
}

export function saveState(state: State, storage: Pick<Storage, 'setItem'> = localStorage): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

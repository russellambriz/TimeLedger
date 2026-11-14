import { defaultState, migrateFocus } from './defaults';
import type { ActiveTimer, Category, Session, State } from '../types';

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

  return migrateFocus({ version: 1, categories, sessions, active, lastCategoryId });
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

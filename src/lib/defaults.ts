import type { Category, State } from '../types';

export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'focus', name: 'Focus', color: '#D4B896' },
  { id: 'reading', name: 'Reading', color: '#8CA99B' },
  { id: 'homework', name: 'Homework', color: '#9BAED0' },
  { id: 'deep-work', name: 'Deep Work', color: '#BAA0C7' },
];

export const PALETTE: readonly string[] = [
  '#C4624E',
  '#D4A054',
  '#E0C48A',
  '#7E9A62',
  '#6AADA0',
  '#7C90C0',
  '#B59BC8',
  '#C98B9A',
  '#D07A4A',
  '#8E8A84',
  '#5E8C88',
  '#A98467',
];

export function defaultState(): State {
  return {
    version: 1,
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    sessions: [],
    active: null,
    lastCategoryId: DEFAULT_CATEGORIES[0].id,
  };
}

export function selectedCategory(state: State): Category {
  const id = state.active?.categoryId ?? state.lastCategoryId;
  const found =
    state.categories.find((category) => category.id === id) ??
    state.categories.find((category) => !category.archived) ??
    state.categories[0];
  return found ?? { id: 'distraction', name: 'Distraction', color: '#C4624E' };
}

export function lookupCategory(state: State, id: string): { name: string; color: string } {
  const category = state.categories.find((item) => item.id === id);
  if (!category) return { name: 'Removed', color: '#8E8A84' };
  return { name: category.name, color: category.color };
}

export function nextColor(categories: readonly Category[]): string {
  const used = new Set(categories.map((category) => category.color.toUpperCase()));
  return PALETTE.find((color) => !used.has(color)) ?? PALETTE[categories.length % PALETTE.length];
}

// Original non-focus categories retain their history without inflating focus totals.
export const LEGACY_CATEGORIES = new Set(['distraction', 'phone', 'exercise', 'sleep', 'meditation', 'health']);
export function focusState(state: State): State {
  return { ...state, sessions: state.sessions.filter(s => !LEGACY_CATEGORIES.has(s.categoryId)),
    active: state.active && !LEGACY_CATEGORIES.has(state.active.categoryId) ? state.active : null };
}
export function migrateFocus(state: State): State {
  if (state.categories.some(c => c.id === 'focus')) return state;
  if (!state.categories.some(c => LEGACY_CATEGORIES.has(c.id))) return state;
  return { ...state, categories: [...DEFAULT_CATEGORIES.filter(c => !state.categories.some(old => old.id === c.id)), ...state.categories],
    lastCategoryId: LEGACY_CATEGORIES.has(state.lastCategoryId) ? 'focus' : state.lastCategoryId };
}

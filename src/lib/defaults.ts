import type { Category, State } from '../types';

export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'distraction', name: 'Distraction', color: '#C4624E' },
  { id: 'phone', name: 'Phone/Social', color: '#D4A054' },
  { id: 'exercise', name: 'Exercise', color: '#7E9A62' },
  { id: 'sleep', name: 'Sleep', color: '#7C90C0' },
  { id: 'meditation', name: 'Meditation', color: '#B59BC8' },
  { id: 'health', name: 'Health', color: '#6AADA0' },
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

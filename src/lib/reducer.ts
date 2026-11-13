import { defaultState } from './defaults';
import type { State } from '../types';

export type Action =
  | { type: 'start'; now: number }
  | { type: 'stop'; now: number; id: string }
  | { type: 'discard' }
  | { type: 'set-category'; categoryId: string }
  | { type: 'add-category'; id: string; name: string; color: string }
  | { type: 'update-category'; id: string; name?: string; color?: string }
  | { type: 'remove-category'; id: string }
  | { type: 'restore-category'; id: string }
  | { type: 'add-session'; id: string; categoryId: string; start: number; end: number }
  | { type: 'update-session'; id: string; categoryId?: string; start?: number; end?: number }
  | { type: 'delete-session'; id: string }
  | { type: 'replace'; state: State };

const COLOR = /^#[0-9A-Fa-f]{6}$/;

function activeCategories(state: State) {
  return state.categories.filter((category) => !category.archived);
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start': {
      if (state.active) return state;
      const category =
        state.categories.find((item) => item.id === state.lastCategoryId && !item.archived) ??
        state.categories.find((item) => !item.archived);
      if (!category) return state;
      return {
        ...state,
        lastCategoryId: category.id,
        active: { startedAt: action.now, categoryId: category.id },
      };
    }
    case 'stop': {
      if (!state.active) return state;
      const sessions = state.sessions.slice();
      if (action.now > state.active.startedAt && !sessions.some((session) => session.id === action.id)) {
        sessions.push({
          id: action.id,
          categoryId: state.active.categoryId,
          start: state.active.startedAt,
          end: action.now,
        });
      }
      return { ...state, active: null, sessions };
    }
    case 'discard': {
      if (!state.active) return state;
      return { ...state, active: null };
    }
    case 'set-category': {
      const category = state.categories.find((item) => item.id === action.categoryId && !item.archived);
      if (!category) return state;
      return {
        ...state,
        lastCategoryId: category.id,
        active: state.active ? { ...state.active, categoryId: category.id } : state.active,
      };
    }
    case 'add-category': {
      const name = action.name.trim().slice(0, 40);
      if (!name || state.categories.some((item) => item.id === action.id)) return state;
      const color = COLOR.test(action.color) ? action.color.toUpperCase() : '#B08958';
      return {
        ...state,
        categories: [...state.categories, { id: action.id, name, color }],
      };
    }
    case 'update-category': {
      const index = state.categories.findIndex((item) => item.id === action.id);
      if (index < 0) return state;
      const current = state.categories[index];
      let name = current.name;
      if (action.name !== undefined) {
        if (!action.name.trim()) return state;
        name = action.name.slice(0, 40);
      }
      const color = action.color && COLOR.test(action.color) ? action.color.toUpperCase() : current.color;
      if (name === current.name && color === current.color) return state;
      const categories = state.categories.slice();
      categories[index] = { ...current, name, color };
      return { ...state, categories };
    }
    case 'remove-category': {
      const target = state.categories.find((item) => item.id === action.id);
      if (!target || target.archived) return state;
      if (activeCategories(state).length <= 1) return state;
      const fallback = state.categories.find((item) => !item.archived && item.id !== target.id);
      if (!fallback) return state;
      const usedBySession = state.sessions.some((session) => session.categoryId === target.id);
      const categories = usedBySession
        ? state.categories.map((item) => (item.id === target.id ? { ...item, archived: true } : item))
        : state.categories.filter((item) => item.id !== target.id);
      return {
        ...state,
        categories,
        lastCategoryId: state.lastCategoryId === target.id ? fallback.id : state.lastCategoryId,
        active:
          state.active && state.active.categoryId === target.id
            ? { ...state.active, categoryId: fallback.id }
            : state.active,
      };
    }
    case 'restore-category': {
      const target = state.categories.find((item) => item.id === action.id);
      if (!target?.archived) return state;
      return {
        ...state,
        categories: state.categories.map((item) =>
          item.id === target.id ? { id: item.id, name: item.name, color: item.color } : item,
        ),
      };
    }
    case 'add-session': {
      if (!(action.end > action.start)) return state;
      if (!state.categories.some((item) => item.id === action.categoryId && !item.archived)) return state;
      if (state.sessions.some((session) => session.id === action.id)) return state;
      return {
        ...state,
        sessions: [
          ...state.sessions,
          { id: action.id, categoryId: action.categoryId, start: action.start, end: action.end },
        ],
      };
    }
    case 'update-session': {
      const index = state.sessions.findIndex((session) => session.id === action.id);
      if (index < 0) return state;
      const current = state.sessions[index];
      const start = action.start ?? current.start;
      const end = action.end ?? current.end;
      const categoryId = action.categoryId ?? current.categoryId;
      if (!(end > start)) return state;
      if (!state.categories.some((item) => item.id === categoryId)) return state;
      if (start === current.start && end === current.end && categoryId === current.categoryId) return state;
      const sessions = state.sessions.slice();
      sessions[index] = { ...current, start, end, categoryId };
      return { ...state, sessions };
    }
    case 'delete-session': {
      if (!state.sessions.some((session) => session.id === action.id)) return state;
      return { ...state, sessions: state.sessions.filter((session) => session.id !== action.id) };
    }
    case 'replace':
      return action.state;
    default:
      return state;
  }
}

export function freshState(): State {
  return defaultState();
}

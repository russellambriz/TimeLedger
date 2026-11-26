import { BIBLE_STUDY, defaultState, HOMEWORK_SUBJECTS, SLEEP_CATEGORY } from './defaults';
import { MAX_CAFFEINE_LIMIT, MAX_SLEEP_GOAL, MIN_CAFFEINE_LIMIT, MIN_SLEEP_GOAL, parseDrink } from './storage';
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
  | { type: 'sleep-start'; now: number }
  | { type: 'sleep-stop'; now: number; id: string }
  | { type: 'sleep-discard' }
  | { type: 'set-sleep-goal'; minutes: number }
  | { type: 'add-drink'; id: string; name: string; mg: number; at: number }
  | { type: 'update-drink'; id: string; name?: string; mg?: number; at?: number }
  | { type: 'delete-drink'; id: string }
  | { type: 'set-caffeine-limit'; mg: number }
  | { type: 'replace'; state: State };

const COLOR = /^#[0-9A-Fa-f]{6}$/;

function withSleepCategory(state: State): State {
  if (state.categories.some((item) => item.id === SLEEP_CATEGORY.id)) return state;
  return { ...state, categories: [...state.categories, { ...SLEEP_CATEGORY }] };
}

function activeCategories(state: State) {
  return state.categories.filter((category) => !category.archived);
}

export function reducer(original: State, action: Action): State {
  // Logging or editing a night must work even before the sleep timer has ever been used.
  const touchesSleep =
    (action.type === 'add-session' || action.type === 'update-session') && action.categoryId === SLEEP_CATEGORY.id;
  const state = touchesSleep ? withSleepCategory(original) : original;
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
      const categories = (usedBySession || target.id === BIBLE_STUDY.id || HOMEWORK_SUBJECTS.some(c => c.id === target.id))
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
      if (!Number.isFinite(action.start) || !Number.isFinite(action.end) || !(action.end > action.start)) return original;
      if (state.sessions.some(s => action.start < s.end && action.end > s.start)) return original;
      if (state.active && action.end > state.active.startedAt) return original;
      if (!state.categories.some((item) => item.id === action.categoryId && (!item.archived || touchesSleep))) return original;
      if (state.sessions.some((session) => session.id === action.id)) return original;
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
      if (index < 0) return original;
      const current = state.sessions[index];
      const start = action.start ?? current.start;
      const end = action.end ?? current.end;
      const categoryId = action.categoryId ?? current.categoryId;
      if (!Number.isFinite(start) || !Number.isFinite(end) || !(end > start)) return original;
      if (state.sessions.some(s => s.id !== action.id && start < s.end && end > s.start)) return original;
      if (state.active && end > state.active.startedAt) return original;
      if (!state.categories.some((item) => item.id === categoryId)) return original;
      if (start === current.start && end === current.end && categoryId === current.categoryId) return original;
      const sessions = state.sessions.slice();
      sessions[index] = { ...current, start, end, categoryId };
      return { ...state, sessions };
    }
    case 'delete-session': {
      if (!state.sessions.some((session) => session.id === action.id)) return state;
      return { ...state, sessions: state.sessions.filter((session) => session.id !== action.id) };
    }
    case 'sleep-start': {
      if (state.sleep) return state;
      return { ...withSleepCategory(state), sleep: { startedAt: action.now } };
    }
    case 'sleep-stop': {
      if (!state.sleep) return state;
      const sessions = state.sessions.slice();
      if (action.now > state.sleep.startedAt && !sessions.some((session) => session.id === action.id)) {
        sessions.push({ id: action.id, categoryId: SLEEP_CATEGORY.id, start: state.sleep.startedAt, end: action.now });
      }
      return { ...withSleepCategory(state), sleep: null, sessions };
    }
    case 'sleep-discard': {
      if (!state.sleep) return state;
      return { ...state, sleep: null };
    }
    case 'set-sleep-goal': {
      const minutes = Math.round(action.minutes);
      if (!(minutes >= MIN_SLEEP_GOAL && minutes <= MAX_SLEEP_GOAL) || minutes === state.sleepGoal) return state;
      return { ...state, sleepGoal: minutes };
    }
    case 'add-drink': {
      const drinks = state.drinks ?? [];
      if (drinks.some((d) => d.id === action.id)) return state;
      const drink = parseDrink({ id: action.id, name: action.name, mg: action.mg, at: action.at });
      if (!drink) return state;
      return { ...state, drinks: [...drinks, drink] };
    }
    case 'update-drink': {
      const drinks = state.drinks ?? [];
      const index = drinks.findIndex((d) => d.id === action.id);
      if (index < 0) return state;
      const old = drinks[index];
      const drink = parseDrink({ ...old, ...Object.fromEntries(Object.entries({ name: action.name, mg: action.mg, at: action.at }).filter(([, v]) => v !== undefined)) });
      if (!drink || (drink.name === old.name && drink.mg === old.mg && drink.at === old.at)) return state;
      const next = drinks.slice();
      next[index] = drink;
      return { ...state, drinks: next };
    }
    case 'delete-drink': {
      const drinks = state.drinks ?? [];
      if (!drinks.some((d) => d.id === action.id)) return state;
      return { ...state, drinks: drinks.filter((d) => d.id !== action.id) };
    }
    case 'set-caffeine-limit': {
      const mg = Math.round(action.mg);
      if (!(mg >= MIN_CAFFEINE_LIMIT && mg <= MAX_CAFFEINE_LIMIT) || mg === state.caffeineLimit) return state;
      return { ...state, caffeineLimit: mg };
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

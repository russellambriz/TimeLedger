import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { lookupCategory } from './lib/defaults';
import { formatDuration } from './lib/format';
import { reducer, type Action } from './lib/reducer';
import { loadState, saveState, STORAGE_KEY } from './lib/storage';
import type { Session, State } from './types';
import { SLEEP_CATEGORY } from './lib/defaults';
import { caffeineLimit, drinksOn } from './lib/caffeine';
import { startOfDay } from './lib/time';

type StoreApi = {
  state: State;
  now: number;
  toast: string | null;
  saveError: boolean;
  retrySave: () => void;
  start: () => void;
  /** Stop the focus timer. `endAt` saves an earlier finish time (for a forgotten stop). */
  stop: (endAt?: number) => void;
  discard: () => void;
  setCategory: (id: string) => void;
  addCategory: (name: string, color: string) => string | null;
  updateCategory: (id: string, patch: { name?: string; color?: string }) => void;
  removeCategory: (id: string) => void;
  restoreCategory: (id: string) => void;
  addSession: (input: { categoryId: string; start: number; end: number }) => boolean;
  updateSession: (id: string, patch: { categoryId?: string; start?: number; end?: number }) => boolean;
  deleteSession: (id: string) => void;
  importState: (next: State) => void;
  /** Start the sleep timer. Stops and saves a running focus session first. */
  startSleep: () => void;
  /** Stop the sleep timer and save the night. Returns the saved session. */
  stopSleep: (endAt?: number) => Session | null;
  discardSleep: () => void;
  setSleepGoal: (minutes: number) => void;
  addDrink: (input: { name: string; mg: number; at?: number }) => boolean;
  updateDrink: (id: string, patch: { name?: string; mg?: number; at?: number }) => boolean;
  deleteDrink: (id: string) => void;
  setCaffeineLimit: (mg: number) => void;
  /** Current state, readable outside React renders (used by sync). */
  getState: () => State;
  /** Apply a merged state from the cloud without treating it as a local change. */
  applySynced: (next: State) => boolean;
  /** Listen for local changes. Returns an unsubscribe function. */
  onLocalChange: (listener: (prev: State, next: State) => void) => () => void;
};

const StoreContext = createContext<StoreApi | null>(null);

function uid(): string {
  return crypto.randomUUID();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => loadState());
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const pendingSave = useRef<State | null>(null);
  const ref = useRef(state);
  const toastTimer = useRef<number | null>(null);
  const listeners = useRef(new Set<(prev: State, next: State) => void>());
  ref.current = state;

  const notify = (message: string, duration = 2400) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, duration);
  };

  const commit = (next: State) => {
    const saved = saveState(next);
    setSaveError(!saved);
    if (!saved) {
      pendingSave.current = next;
      notify('Could not save on this device. Please retry.');
      return false;
    }
    pendingSave.current = null;
    const prev = ref.current;
    ref.current = next;
    setState(next);
    if (prev !== next) for (const listener of listeners.current) listener(prev, next);
    return true;
  };

  const dispatch = (action: Action) => {
    const next = reducer(ref.current, action);
    if (next === ref.current) return null;
    return commit(next) ? next : null;
  };

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, state.active ? 200 : 30_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, [state.active]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = loadState();
      ref.current = next;
      setState(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const api: StoreApi = {
    state,
    now,
    toast,
    saveError,
    retrySave: () => { if (commit(pendingSave.current ?? ref.current)) notify("Saved on this device."); },
    start: () => {
      if (ref.current.sleep) api.stopSleep();
      const startedAt = Date.now();
      setNow(startedAt);
      dispatch({ type: 'start', now: startedAt });
    },
    stop: (endAt) => {
      const stoppedAt = Math.min(endAt ?? Date.now(), Date.now());
      const id = uid();
      const next = reducer(ref.current, { type: 'stop', now: stoppedAt, id });
      if (next === ref.current) return;
      const saved = commit(next);
      const session = next.sessions.find((item) => item.id === id);
      if (!saved || !session) return;
      const category = lookupCategory(next, session.categoryId);
      notify(`Saved · ${formatDuration(session.end - session.start, true)} · ${category.name}`);
    },
    discard: () => {
      dispatch({ type: 'discard' });
    },
    setCategory: (id) => {
      dispatch({ type: 'set-category', categoryId: id });
    },
    addCategory: (name, color) => {
      const id = uid();
      const next = dispatch({ type: 'add-category', id, name, color });
      return next ? id : null;
    },
    updateCategory: (id, patch) => {
      dispatch({ type: 'update-category', id, ...patch });
    },
    removeCategory: (id) => {
      dispatch({ type: 'remove-category', id });
    },
    restoreCategory: (id) => {
      dispatch({ type: 'restore-category', id });
    },
    addSession: (input) => dispatch({ type: 'add-session', id: uid(), ...input }) !== null,
    updateSession: (id, patch) => {
      const next = reducer(ref.current, { type: 'update-session', id, ...patch });
      if (next === ref.current && ref.current.sessions.some(s => s.id === id && (s.start !== patch.start || s.end !== patch.end || s.categoryId !== patch.categoryId))) return false;
      return commit(next);
    },
    deleteSession: (id) => {
      dispatch({ type: 'delete-session', id });
    },
    importState: (next) => {
      const saved = commit(next);
      if (saved) notify(`Imported ${next.sessions.length} sessions.`);
    },
    startSleep: () => {
      if (ref.current.active) api.stop();
      const startedAt = Date.now();
      setNow(startedAt);
      if (dispatch({ type: 'sleep-start', now: startedAt })) notify('Sleep well.');
    },
    stopSleep: (endAt) => {
      const id = uid();
      const next = reducer(ref.current, { type: 'sleep-stop', now: Math.min(endAt ?? Date.now(), Date.now()), id });
      if (next === ref.current || !commit(next)) return null;
      const session = next.sessions.find((item) => item.id === id && item.categoryId === SLEEP_CATEGORY.id) ?? null;
      notify(session ? `Good morning · slept ${formatDuration(session.end - session.start)}` : 'Good morning.');
      return session;
    },
    discardSleep: () => {
      dispatch({ type: 'sleep-discard' });
    },
    setSleepGoal: (minutes) => {
      dispatch({ type: 'set-sleep-goal', minutes });
    },
    addDrink: ({ name, mg, at }) => {
      const when = at ?? Date.now();
      const next = dispatch({ type: 'add-drink', id: uid(), name, mg, at: when });
      if (!next) return false;
      const day = startOfDay(when);
      const total = drinksOn(next, day).reduce((sum, d) => sum + d.mg, 0);
      const limit = caffeineLimit(next);
      const before = total - Math.round(mg);
      if (total > limit && before <= limit) {
        notify(`⚠ Over your ${limit} mg daily limit · ${total} mg ${day === startOfDay(Date.now()) ? 'today' : 'that day'}`, 5000);
      } else if (total > limit) {
        notify(`⚠ Still over your limit · ${total} of ${limit} mg`, 5000);
      } else {
        notify(`Added ${name.trim()} · ${Math.round(mg)} mg · ${total} of ${limit} mg`);
      }
      return true;
    },
    updateDrink: (id, patch) => {
      const next = reducer(ref.current, { type: 'update-drink', id, ...patch });
      if (next === ref.current) return true;
      return commit(next);
    },
    deleteDrink: (id) => {
      dispatch({ type: 'delete-drink', id });
    },
    setCaffeineLimit: (mg) => {
      dispatch({ type: 'set-caffeine-limit', mg });
    },
    getState: () => ref.current,
    applySynced: (next) => {
      if (next === ref.current) return true;
      if (!saveState(next)) return false;
      ref.current = next;
      setState(next);
      return true;
    },
    onLocalChange: (listener) => {
      listeners.current.add(listener);
      return () => listeners.current.delete(listener);
    },
  };

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const store = useContext(StoreContext);
  if (!store) throw new Error('Hourwell store is unavailable.');
  return store;
}

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { lookupCategory } from './lib/defaults';
import { formatDuration } from './lib/format';
import { reducer, type Action } from './lib/reducer';
import { loadState, saveState, STORAGE_KEY } from './lib/storage';
import type { State } from './types';

type StoreApi = {
  state: State;
  now: number;
  toast: string | null;
  start: () => void;
  stop: () => void;
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
};

const StoreContext = createContext<StoreApi | null>(null);

function uid(): string {
  return crypto.randomUUID();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => loadState());
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const ref = useRef(state);
  const toastTimer = useRef<number | null>(null);
  ref.current = state;

  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 2400);
  };

  const commit = (next: State) => {
    ref.current = next;
    setState(next);
    const saved = saveState(next);
    if (!saved) notify('Could not save on this device.');
    return saved;
  };

  const dispatch = (action: Action) => {
    const next = reducer(ref.current, action);
    if (next === ref.current) return null;
    commit(next);
    return next;
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
    start: () => {
      const startedAt = Date.now();
      setNow(startedAt);
      dispatch({ type: 'start', now: startedAt });
    },
    stop: () => {
      const stoppedAt = Date.now();
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
    updateSession: (id, patch) => dispatch({ type: 'update-session', id, ...patch }) !== null,
    deleteSession: (id) => {
      dispatch({ type: 'delete-session', id });
    },
    importState: (next) => {
      const saved = commit(next);
      if (saved) notify(`Imported ${next.sessions.length} sessions.`);
    },
  };

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const store = useContext(StoreContext);
  if (!store) throw new Error('TimeLedger store is unavailable.');
  return store;
}

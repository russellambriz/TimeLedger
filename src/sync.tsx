import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { diffState, loadMeta, markChanged, saveMeta } from './lib/syncCore';
import { runSync } from './lib/syncEngine';
import { useStore } from './store';

export type SyncStatus = 'loading' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error';

type SyncApi = {
  status: SyncStatus;
  email: string | null;
  error: string | null;
  lastSyncedAt: number | null;
  /** Changes on this device waiting to upload. */
  pending: number;
  /** Returns an error message, or null when the email was sent. */
  sendCode: (email: string) => Promise<string | null>;
  /** Returns an error message, or null when signed in. */
  verifyCode: (email: string, code: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  syncNow: () => void;
};

type Cloud = typeof import('./lib/cloud');
type User = { id: string; email?: string };

const SyncContext = createContext<SyncApi | null>(null);
const POLL_MS = 30_000;

function message(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (/fetch|network|load failed/i.test(text)) return 'Could not reach the cloud. Check your connection.';
  return text;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const storeRef = useRef(store);
  storeRef.current = store;

  const [cloud, setCloud] = useState<Cloud | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'syncing' | 'synced' | 'offline' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [pending, setPending] = useState(() => Object.keys(loadMeta().dirty).length);

  const userRef = useRef<User | null>(null);
  userRef.current = user;
  const cloudRef = useRef<Cloud | null>(null);
  cloudRef.current = cloud;
  const timer = useRef<number | null>(null);
  const running = useRef(false);
  const again = useRef(false);

  const run = async () => {
    const c = cloudRef.current;
    const u = userRef.current;
    if (!c || !u) return;
    if (running.current) {
      again.current = true;
      return;
    }
    if (!navigator.onLine) {
      setPhase('offline');
      return;
    }
    running.current = true;
    setPhase((p) => (p === 'synced' ? p : 'syncing'));
    try {
      await runSync({
        remote: c.supabaseRemote(u.id),
        userId: u.id,
        getState: () => storeRef.current.getState(),
        applyState: (next) => storeRef.current.applySynced(next),
        loadMeta: () => loadMeta(),
        saveMeta: (meta) => saveMeta(meta),
      });
      setPhase('synced');
      setError(null);
      setLastSyncedAt(Date.now());
    } catch (err) {
      setPhase(navigator.onLine ? 'error' : 'offline');
      setError(message(err));
    } finally {
      running.current = false;
      setPending(Object.keys(loadMeta().dirty).length);
      if (again.current) {
        again.current = false;
        schedule(0);
      }
    }
  };
  const runRef = useRef(run);
  runRef.current = run;

  const schedule = (delay: number) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      void runRef.current();
    }, delay);
  };

  // Record every local change so it can be uploaded, even while signed out.
  useEffect(
    () =>
      store.onLocalChange((prev, next) => {
        saveMeta(markChanged(loadMeta(), diffState(prev, next), Date.now()));
        setPending(Object.keys(loadMeta().dirty).length);
        if (userRef.current) schedule(800);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Load the cloud code separately so the timer opens instantly, even offline.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    import('./lib/cloud')
      .then((mod) => {
        if (cancelled) return;
        setCloud(mod);
        const { data } = mod.supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
          setAuthReady(true);
        });
        unsubscribe = () => data.subscription.unsubscribe();
      })
      .catch(() => setAuthReady(true));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // While signed in: sync now, on live updates, on return to the app, and every 30 seconds.
  useEffect(() => {
    if (!cloud || !user) return;
    schedule(0);
    const stopWatching = cloud.watchRemote(user.id, () => schedule(300));
    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') schedule(0);
    }, POLL_MS);
    const wake = () => {
      if (document.visibilityState === 'visible') schedule(0);
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    window.addEventListener('focus', wake);
    return () => {
      stopWatching();
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
      window.removeEventListener('focus', wake);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloud, user?.id]);

  const status: SyncStatus = !authReady ? 'loading' : !user ? 'signed-out' : phase === 'idle' ? 'syncing' : phase;

  const api: SyncApi = {
    status,
    email: user?.email ?? null,
    error,
    lastSyncedAt,
    pending,
    sendCode: async (email) => {
      if (!cloud) return 'Still loading. Try again in a moment.';
      try {
        const { error: err } = await cloud.supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL, shouldCreateUser: true },
        });
        return err ? message(err) : null;
      } catch (err) {
        return message(err);
      }
    },
    verifyCode: async (email, code) => {
      if (!cloud) return 'Still loading. Try again in a moment.';
      try {
        const { error: err } = await cloud.supabase.auth.verifyOtp({
          email: email.trim(),
          token: code.replace(/\s/g, ''),
          type: 'email',
        });
        return err ? message(err) : null;
      } catch (err) {
        return message(err);
      }
    },
    signOut: async () => {
      if (!cloud) return;
      await cloud.supabase.auth.signOut({ scope: 'local' });
      setPhase('idle');
      setLastSyncedAt(null);
    },
    syncNow: () => schedule(0),
  };

  return <SyncContext.Provider value={api}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncApi {
  const sync = useContext(SyncContext);
  if (!sync) throw new Error('Hourwell sync is unavailable.');
  return sync;
}

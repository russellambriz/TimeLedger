import { registerSW } from 'virtual:pwa-register';

/**
 * Keep installed copies current. iPhone Home Screen apps resume without
 * reloading, so they rarely look for a new version on their own. Check on
 * launch and whenever the app comes back to the screen; when a new version is
 * ready it activates and the page reloads into it. Every change is saved the
 * moment it's made, so the reload loses nothing (a running timer keeps going).
 */
export function keepAppUpdated() {
  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (document.visibilityState === 'visible' && navigator.onLine) void registration.update().catch(() => {});
      };
      document.addEventListener('visibilitychange', check);
      window.addEventListener('focus', check);
      window.addEventListener('online', check);
    },
  });
}

import { useState } from 'react';
import { useSync, type SyncStatus } from '../sync';
import { Sheet } from './Sheet';

/** True inside an app added to the Home Screen (where iPhone keeps storage separate from Safari). */
function isHomeScreenApp(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function statusLabel(status: SyncStatus, pending: number): string {
  switch (status) {
    case 'loading':
      return 'Sync';
    case 'signed-out':
      return 'Sign in to sync';
    case 'syncing':
      return 'Syncing…';
    case 'synced':
      return pending > 0 ? 'Syncing…' : 'Synced';
    case 'offline':
      return 'Offline · will sync later';
    case 'error':
      return 'Sync paused';
  }
}

function timeAgo(at: number | null): string {
  if (!at) return '';
  const seconds = Math.round((Date.now() - at) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
}

export function CloudSyncSheet({ onClose }: { onClose: () => void }) {
  const sync = useSync();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'link' | 'password'>(() => (isHomeScreenApp() ? 'password' : 'link'));
  const [password, setPasswordValue] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordNote, setPasswordNote] = useState<{ ok: boolean; text: string } | null>(null);

  if (sync.email) {
    return (
      <Sheet title="Sync" onClose={onClose}>
        <p className="sheet-copy">
          Signed in as <strong>{sync.email}</strong>. Your sessions, activities, and running timer stay in step on every
          device signed in with this email.
        </p>
        <p className="sync-state" role="status">
          <span className={`sync-dot is-${sync.status}`} aria-hidden="true" />
          {statusLabel(sync.status, sync.pending)}
          {sync.status === 'synced' && sync.pending === 0 && sync.lastSyncedAt ? ` · ${timeAgo(sync.lastSyncedAt)}` : ''}
        </p>
        {sync.status === 'error' && sync.error && <p className="form-error">{sync.error}</p>}
        {sync.pending > 0 && sync.status !== 'syncing' && (
          <p className="quiet">
            {sync.pending} change{sync.pending === 1 ? '' : 's'} waiting to upload. They are safe on this device.
          </p>
        )}
        <button type="button" className="menu-row" onClick={sync.syncNow}>
          Sync now
        </button>
        <form
          className="password-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (newPassword.length < 6) {
              setPasswordNote({ ok: false, text: 'Use at least 6 characters.' });
              return;
            }
            setBusy(true);
            const err = await sync.setPassword(newPassword);
            setBusy(false);
            setPasswordNote(err ? { ok: false, text: err } : { ok: true, text: 'Password saved. Use it to sign in on your other devices.' });
            if (!err) setNewPassword('');
          }}
        >
          <h3>Password</h3>
          <p className="quiet">
            Set a password to sign in where email links don’t work, like Hourwell on your iPhone Home Screen.
          </p>
          <label className="field">
            <span>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="At least 6 characters"
            />
          </label>
          {passwordNote && <p className={passwordNote.ok ? 'quiet ok-note' : 'form-error'}>{passwordNote.text}</p>}
          <button type="submit" className="menu-row" disabled={busy}>
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </form>
        <button
          type="button"
          className="menu-row"
          onClick={async () => {
            await sync.signOut();
            onClose();
          }}
        >
          Sign out of this device
        </button>
        <p className="quiet">Signing out keeps your sessions on this device. Sign in again any time to resume syncing.</p>
        <p className="quiet app-version">Hourwell version {__APP_VERSION__}</p>
      </Sheet>
    );
  }

  const sendCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter your email address.');
      return;
    }
    setBusy(true);
    setError(null);
    const err = await sync.sendCode(email);
    setBusy(false);
    if (err) setError(err);
    else setStep('code');
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const err = await sync.verifyCode(email, code);
    setBusy(false);
    if (err) setError(err.includes('expired') || err.includes('invalid') ? 'That code didn’t work. Check it, or send a new one.' : err);
  };

  const passwordSignIn = async () => {
    setBusy(true);
    setError(null);
    const err = await sync.signInWithPassword(email, password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <Sheet title="Sync your devices" onClose={onClose}>
      <div className="segment sign-in-mode" role="tablist" aria-label="Sign-in method">
        <button type="button" role="tab" aria-selected={mode === 'link'} onClick={() => { setMode('link'); setError(null); }}>
          Email link
        </button>
        <button type="button" role="tab" aria-selected={mode === 'password'} onClick={() => { setMode('password'); setError(null); }}>
          Password
        </button>
      </div>
      {mode === 'password' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void passwordSignIn();
          }}
        >
          <p className="sheet-copy">
            {isHomeScreenApp()
              ? 'On iPhone, email links open in Safari, not this app. Sign in with your password here instead.'
              : 'Sign in with the password you set in Sync.'}{' '}
            No password yet? Sign in with the email link in Safari first, then tap Sync → Save password.
          </p>
          <label className="field">
            <span>Email</span>
            <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPasswordValue(event.target.value)} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-gold" disabled={busy || !email.trim() || !password || sync.status === 'loading'}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : step === 'email' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendCode();
          }}
        >
          <p className="sheet-copy">
            Keep your focus time together on your phone, iPad, and computer. We’ll email you a sign-in link. No password
            needed. Everything already on this device comes with you.
          </p>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-gold" disabled={busy || sync.status === 'loading'}>
            {busy ? 'Sending…' : 'Email me a sign-in link'}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void verify();
          }}
        >
          <p className="sheet-copy">
            We sent an email to <strong>{email.trim()}</strong>. Open it <strong>on this device</strong> and tap{' '}
            <strong>Sign in</strong>. Hourwell opens signed in and starts syncing. It can take a minute to arrive, so
            check spam too.
          </p>
          {!showCode && (
            <button type="button" className="text-btn" onClick={() => setShowCode(true)}>
              Email has a code instead?
            </button>
          )}
          {showCode && (
            <label className="field">
              <span>Code</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                placeholder="123456"
              />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          {showCode && (
            <button type="submit" className="btn-gold" disabled={busy || code.length < 6}>
              {busy ? 'Checking…' : 'Sign in'}
            </button>
          )}
          <div className="confirm">
            <button type="button" className="text-btn" disabled={busy} onClick={() => void sendCode()}>
              Send again
            </button>
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
            >
              Use a different email
            </button>
          </div>
        </form>
      )}
      <p className="quiet app-version">Hourwell version {__APP_VERSION__}</p>
    </Sheet>
  );
}

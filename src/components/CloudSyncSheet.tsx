import { useState } from 'react';
import { useSync, type SyncStatus } from '../sync';
import { Sheet } from './Sheet';

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
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Sheet title="Sync your devices" onClose={onClose}>
      {step === 'email' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendCode();
          }}
        >
          <p className="sheet-copy">
            Keep your focus time together on your phone, iPad, and computer. We’ll email you a sign-in code. No password
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
            {busy ? 'Sending…' : 'Email me a code'}
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
            We sent a code to <strong>{email.trim()}</strong>. Enter it here. It can take a minute to arrive, so check
            spam too.
          </p>
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
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-gold" disabled={busy || code.length < 6}>
            {busy ? 'Checking…' : 'Sign in'}
          </button>
          <div className="confirm">
            <button type="button" className="text-btn" disabled={busy} onClick={() => void sendCode()}>
              Send a new code
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
    </Sheet>
  );
}

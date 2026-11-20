import { useState } from 'react';
import { formatDuration, fromDatetimeLocal, toDatetimeLocal } from '../lib/format';
import { Sheet } from './Sheet';

const fullTime = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Fix a running timer: save it with the real end time, or delete it if it was started by accident. */
export function FixTimerSheet({
  name,
  startedAt,
  endLabel,
  now,
  onStopAt,
  onDiscard,
  onClose,
}: {
  name: string;
  startedAt: number;
  /** "Finished" for focus, "Woke up" for sleep. */
  endLabel: string;
  now: number;
  onStopAt: (endAt: number) => void;
  onDiscard: () => void;
  onClose: () => void;
}) {
  const [endValue, setEndValue] = useState(() => toDatetimeLocal(Math.floor(now / 60000) * 60000));
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const end = fromDatetimeLocal(endValue);
  const length = Number.isFinite(end) && end > startedAt ? end - startedAt : null;

  const save = () => {
    if (!Number.isFinite(end)) return setError('Choose when you finished.');
    if (end <= startedAt) return setError(`That’s before it started (${fullTime(startedAt)}).`);
    if (end > Date.now() + 60_000) return setError('That’s in the future. Choose a time that has already passed.');
    onStopAt(end);
    onClose();
  };

  return (
    <Sheet title="Fix this timer" onClose={onClose}>
      <div className="session-summary">
        <span className="dot live" />
        <div>
          <p className="session-summary-title">{name} · running</p>
          <p className="session-summary-time">Started {fullTime(startedAt)}</p>
        </div>
      </div>

      <h3 className="fix-heading">Forgot to stop it?</h3>
      <p className="sheet-copy">Set when you actually {endLabel === 'Woke up' ? 'woke up' : 'finished'}. Only the time up to then is saved.</p>
      <label className="field">
        <span>{endLabel}</span>
        <input type="datetime-local" step={60} value={endValue} onChange={(event) => { setEndValue(event.target.value); setError(null); }} />
      </label>
      {length !== null && <p className="quiet length-preview">Length: {formatDuration(length)}</p>}
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn-gold" onClick={save}>
        Stop &amp; save at this time
      </button>

      <h3 className="fix-heading">Started by accident?</h3>
      {confirming ? (
        <div className="confirm">
          <p>Delete this timer? Nothing will be saved.</p>
          <button type="button" className="text-btn danger" onClick={() => { onDiscard(); onClose(); }}>
            Delete
          </button>
          <button type="button" className="text-btn" onClick={() => setConfirming(false)}>
            Keep it
          </button>
        </div>
      ) : (
        <button type="button" className="text-btn danger" onClick={() => setConfirming(true)}>
          Delete this timer
        </button>
      )}
    </Sheet>
  );
}

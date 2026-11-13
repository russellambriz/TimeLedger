import { useState } from 'react';
import { fromDatetimeLocal, toDatetimeLocal } from '../lib/format';
import { useStore } from '../store';
import type { Session } from '../types';
import { Sheet } from './Sheet';

function floorMinute(ms: number): number {
  return Math.floor(ms / 60000) * 60000;
}

export function SessionSheet({
  session,
  onClose,
}: {
  session: Session | null;
  onClose: () => void;
}) {
  const { state, now, addSession, updateSession, deleteSession } = useStore();
  const choices = state.categories.filter((category) => !category.archived || category.id === session?.categoryId);
  const initialEnd = floorMinute(now);
  const [categoryId, setCategoryId] = useState(session?.categoryId ?? state.lastCategoryId);
  const [startValue, setStartValue] = useState(toDatetimeLocal(session?.start ?? initialEnd - 30 * 60000));
  const [endValue, setEndValue] = useState(toDatetimeLocal(session?.end ?? initialEnd));
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const save = () => {
    const start = session && startValue === toDatetimeLocal(session.start) ? session.start : fromDatetimeLocal(startValue);
    const end = session && endValue === toDatetimeLocal(session.end) ? session.end : fromDatetimeLocal(endValue);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      setError('Choose a start and end.');
      return;
    }
    if (start > Date.now() + 60_000) {
      setError("Start can't be in the future.");
      return;
    }
    if (end > Date.now() + 60_000) {
      setError("End can't be in the future.");
      return;
    }
    if (!(end > start)) {
      setError('End must be after start.');
      return;
    }
    const ok = session
      ? updateSession(session.id, { categoryId, start, end })
      : addSession({ categoryId, start, end });
    if (!ok) {
      setError('Could not save that session.');
      return;
    }
    onClose();
  };

  return (
    <Sheet title={session ? 'Edit session' : 'Add session'} onClose={onClose}>
      <div className="chips" role="listbox" aria-label="Category">
        {choices.map((category) => (
          <button
            key={category.id}
            type="button"
            className={category.id === categoryId ? 'chip is-on' : 'chip'}
            onClick={() => setCategoryId(category.id)}
          >
            <span className="dot" style={{ background: category.color }} />
            {category.name}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Start</span>
        <input type="datetime-local" step={1} value={startValue} onChange={(event) => setStartValue(event.target.value)} />
      </label>
      <label className="field">
        <span>End</span>
        <input type="datetime-local" step={1} value={endValue} onChange={(event) => setEndValue(event.target.value)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn-gold" onClick={save}>
        Save session
      </button>
      {session && !confirming && (
        <button type="button" className="text-btn danger delete-link" onClick={() => setConfirming(true)}>
          Delete session
        </button>
      )}
      {session && confirming && (
        <div className="confirm">
          <p>Delete this session?</p>
          <button
            type="button"
            className="text-btn danger"
            onClick={() => {
              deleteSession(session.id);
              onClose();
            }}
          >
            Delete
          </button>
          <button type="button" className="text-btn" onClick={() => setConfirming(false)}>
            Keep
          </button>
        </div>
      )}
    </Sheet>
  );
}

import { useState } from 'react';
import { lookupCategory, SLEEP_CATEGORY } from '../lib/defaults';
import { formatDuration, formatRange, formatTime, fromDatetimeLocal, toDatetimeLocal } from '../lib/format';
import { useStore } from '../store';
import type { Session } from '../types';
import { Sheet } from './Sheet';

function floorMinute(ms: number): number {
  return Math.floor(ms / 60000) * 60000;
}

export function SessionSheet({
  session,
  onClose,
  title,
  note,
  lockCategoryId,
  defaultStart,
  defaultEnd,
}: {
  session: Session | null;
  onClose: () => void;
  title?: string;
  note?: string;
  /** Save with this category and hide the category picker (used for sleep). */
  lockCategoryId?: string;
  defaultStart?: number;
  defaultEnd?: number;
}) {
  const { state, now, addSession, updateSession, deleteSession } = useStore();
  // Sleep has its own tab, so it's only offered here when editing a sleep entry.
  const choices = state.categories.filter(
    (category) =>
      (!category.archived && category.id !== SLEEP_CATEGORY.id) || category.id === session?.categoryId,
  );
  const initialEnd = floorMinute(defaultEnd ?? now);
  const [categoryId, setCategoryId] = useState(lockCategoryId ?? session?.categoryId ?? state.lastCategoryId);
  const [startValue, setStartValue] = useState(toDatetimeLocal(session?.start ?? defaultStart ?? initialEnd - 30 * 60000));
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
      const clash = state.sessions.find((s) => s.id !== session?.id && start < s.end && end > s.start);
      if (clash) {
        setError(`These times overlap your ${lookupCategory(state, clash.categoryId).name} session (${formatRange(clash.start, clash.end)}). Change the times, or edit that session in History.`);
      } else if (state.active && end > state.active.startedAt) {
        setError(`A focus timer has been running since ${formatTime(state.active.startedAt)}. Stop it first, or end this before then.`);
      } else {
        setError('Could not save on this device. Try again.');
      }
      return;
    }
    onClose();
  };

  return (
    <Sheet title={title ?? (session ? 'Edit session' : 'Add session')} onClose={onClose}>
      {session && (
        <div className="session-summary" role="status">
          <span className="dot" style={{ background: lookupCategory(state, session.categoryId).color }} />
          <div>
            <p className="session-summary-title">
              {lookupCategory(state, session.categoryId).name}
              <span> · {new Date(session.start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </p>
            <p className="session-summary-time">
              {formatRange(session.start, session.end)} · {formatDuration(session.end - session.start)}
            </p>
          </div>
        </div>
      )}
      {note && <p className="sheet-copy">{note}</p>}
      {!lockCategoryId && <div className="chips" role="listbox" aria-label="Category">
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
      </div>}
      <label className="field">
        <span>{lockCategoryId ? 'Went to sleep' : 'Start'}</span>
        <input type="datetime-local" step={1} value={startValue} onChange={(event) => setStartValue(event.target.value)} />
      </label>
      <label className="field">
        <span>{lockCategoryId ? 'Woke up' : 'End'}</span>
        <input type="datetime-local" step={1} value={endValue} onChange={(event) => setEndValue(event.target.value)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn-gold" onClick={save}>
        Save
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

import { useMemo, useState } from 'react';
import { lookupCategory } from '../lib/defaults';
import { formatClock, formatDayHeading, formatDuration, formatRange } from '../lib/format';
import { addDays, startOfDay } from '../lib/time';
import { useStore } from '../store';
import type { Session } from '../types';
import { DataSheet } from './DataSheet';
import { SessionSheet } from './SessionSheet';

export function HistoryScreen({ onShowTimer }: { onShowTimer: () => void }) {
  const { state, now, discard } = useStore();
  const [editing, setEditing] = useState<Session | 'new' | null>(null);
  const [dataOpen, setDataOpen] = useState(false);
  const [discardArmed, setDiscardArmed] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<number, { session: Session; start: number; end: number }[]>();
    for (const session of state.sessions) {
      let cursor = session.start;
      let guard = 0;
      while (cursor < session.end && guard < 20000) {
        guard += 1;
        const day = startOfDay(cursor);
        const next = addDays(day, 1);
        if (next <= cursor) break;
        const end = Math.min(session.end, next);
        const row = { session, start: cursor, end };
        const list = map.get(day);
        if (list) list.push(row);
        else map.set(day, [row]);
        cursor = end;
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([day, rows]) => [day, rows.sort((a, b) => b.start - a.start)] as const);
  }, [state.sessions]);

  return (
    <section className="history">
      <div className="page">
        <header className="page-head">
          <h1>History</h1>
          <div className="head-actions">
            <button type="button" onClick={() => setDataOpen(true)}>
              Data
            </button>
            <button type="button" onClick={() => setEditing('new')}>
              Add
            </button>
          </div>
        </header>
        {state.active && (
          <div className="live-row">
            <button type="button" className="session" onClick={onShowTimer}>
              <span className="dot live" style={{ background: lookupCategory(state, state.active.categoryId).color }} />
              <span className="session-main">
                <span className="session-cat">{lookupCategory(state, state.active.categoryId).name}</span>
                <span className="session-when">In progress</span>
              </span>
              <span className="session-dur">{formatClock(Math.max(0, now - state.active.startedAt))}</span>
            </button>
            {discardArmed ? (
              <div className="confirm inline">
                <p>Discard this timer?</p>
                <button type="button" className="text-btn danger" onClick={() => discard()}>
                  Discard
                </button>
                <button type="button" className="text-btn" onClick={() => setDiscardArmed(false)}>
                  Keep
                </button>
              </div>
            ) : (
              <button type="button" className="text-btn danger discard" onClick={() => setDiscardArmed(true)}>
                Discard
              </button>
            )}
          </div>
        )}
        {groups.length === 0 && !state.active && <p className="empty">No sessions yet.</p>}
        {groups.map(([day, rows]) => (
          <section key={day}>
            <h2 className="day-label">{formatDayHeading(day, now)}</h2>
            {rows.map((row) => {
              const category = lookupCategory(state, row.session.categoryId);
              return (
                <button
                  key={`${row.session.id}-${day}`}
                  type="button"
                  className="session"
                  data-testid={`session-${row.session.id}`}
                  onClick={() => setEditing(row.session)}
                >
                  <span className="dot" style={{ background: category.color }} />
                  <span className="session-main">
                    <span className="session-cat">{category.name}</span>
                    <span className="session-when">{formatRange(row.start, row.end)}</span>
                  </span>
                  <span className="session-dur">{formatDuration(row.end - row.start)}</span>
                </button>
              );
            })}
          </section>
        ))}
      </div>
      {editing && <SessionSheet session={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {dataOpen && <DataSheet onClose={() => setDataOpen(false)} />}
    </section>
  );
}

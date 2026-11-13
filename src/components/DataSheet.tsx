import { useRef, useState } from 'react';
import { download, fromJSON, stamp, toCSV, toJSON } from '../lib/export';
import { useStore } from '../store';
import type { State } from '../types';
import { Sheet } from './Sheet';

export function DataSheet({ onClose }: { onClose: () => void }) {
  const { state, importState } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportJSON = () => download(`timeledger-${stamp()}.json`, toJSON(state), 'application/json');
  const exportCSV = () => download(`timeledger-${stamp()}.csv`, toCSV(state), 'text/csv');

  return (
    <Sheet title="Your data" onClose={onClose}>
      <p className="sheet-copy">
        Everything stays on this device until you export it. JSON keeps categories, sessions, and a running timer. CSV is the finished sessions.
      </p>
      <button type="button" className="menu-row" onClick={exportJSON}>
        Export JSON
      </button>
      <button type="button" className="menu-row" onClick={exportCSV}>
        Export CSV
      </button>
      <button type="button" className="menu-row" onClick={() => inputRef.current?.click()}>
        Import JSON
      </button>
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept="application/json,.json"
        aria-label="Import JSON backup"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          if (file.size > 5_000_000) {
            setPending(null);
            setError('That file is too large.');
            return;
          }
          const result = fromJSON(await file.text());
          if (!result.ok) {
            setPending(null);
            setError(result.error);
            return;
          }
          setError(null);
          setPending(result.state);
        }}
      />
      {error && <p className="form-error">{error}</p>}
      {pending && (
        <div className="confirm">
          <p>
            {pending.sessions.length} sessions · {pending.categories.length} categories. This replaces the data on this device.
          </p>
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              importState(pending);
              onClose();
            }}
          >
            Replace data
          </button>
          <button type="button" className="text-btn" onClick={() => setPending(null)}>
            Cancel
          </button>
        </div>
      )}
    </Sheet>
  );
}

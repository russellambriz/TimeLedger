import { useState } from 'react';
import { selectedCategory } from '../lib/defaults';
import { formatClock } from '../lib/format';
import { useStore } from '../store';
import { CategorySheet } from './CategorySheet';
import { StatRow } from './StatRow';

export function TimerScreen() {
  const { state, now, start, stop } = useStore();
  const [open, setOpen] = useState(false);
  const category = selectedCategory(state);
  const running = state.active !== null;
  const elapsed = running && state.active ? Math.max(0, now - state.active.startedAt) : 0;

  return (
    <section className="timer">
      <h1 className="brand">TimeLedger</h1>
      <StatRow now={now} />
      <div className="stage">
        <button
          type="button"
          className={running ? 'orb is-running' : 'orb'}
          data-testid="start-stop"
          aria-pressed={running}
          aria-label={running ? `Stop timer. ${category.name}` : `Start timer. ${category.name}`}
          onClick={() => {
            if (running) stop();
            else start();
          }}
        >
          <span className="ticks" aria-hidden="true" />
          {running ? (
            <>
              <span className="clock" data-testid="clock">
                {formatClock(elapsed)}
              </span>
              <span className="orb-hint">Stop</span>
            </>
          ) : (
            <span className="start-word">Start</span>
          )}
        </button>
        <button
          type="button"
          className="cat-pill"
          data-testid="category-pill"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Category: ${category.name}. Change category`}
          onClick={() => setOpen(true)}
        >
          <span className="dot" style={{ background: category.color }} />
          <span className="name">{category.name}</span>
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {open && <CategorySheet onClose={() => setOpen(false)} />}
    </section>
  );
}

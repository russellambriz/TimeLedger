import { useState } from 'react';
import { selectedCategory, LEGACY_CATEGORIES } from '../lib/defaults';
import { formatClock } from '../lib/format';
import { useStore } from '../store';
import { CategorySheet } from './CategorySheet';
import { StatRow } from './StatRow';

export function TimerScreen() {
  const { state, now, start, stop, setCategory } = useStore();
  const [open, setOpen] = useState(false);
  const category = selectedCategory(state);
  const running = state.active !== null;
  const elapsed = running && state.active ? Math.max(0, now - state.active.startedAt) : 0;

  return (
    <section className="timer">
      <h1 className="brand">TimeLedger</h1>
      <div className="focus-intro"><p className="eyebrow">A little more presence.</p><h2>{running ? "You’re making time." : "Make time for what matters."}</h2><p>{running ? "One thing at a time. You’re right where you need to be." : "Your book. Your studies. Your undivided attention."}</p></div>
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
              <span className="orb-hint">Stop &amp; save</span>
            </>
          ) : (
            <><span className="start-word">Focus</span><span className="orb-hint">Tap to begin</span></>
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
        <div className="quick-categories" aria-label="Focus activity">
          {state.categories.filter(c => !c.archived && !LEGACY_CATEGORIES.has(c.id)).slice(0, 4).map(c => <button key={c.id} aria-pressed={category.id === c.id} onClick={() => setCategory(c.id)}>{c.name}</button>)}
        </div>
        <p className="timer-caption">{running ? 'Tap once to finish. Your time is saved automatically.' : 'One tap to start. One tap to stop and save.'}</p>
      </div>
      {open && <CategorySheet onClose={() => setOpen(false)} />}
    </section>
  );
}

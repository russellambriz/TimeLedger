import { useMemo, useState } from 'react';
import { SLEEP_CATEGORY } from '../lib/defaults';
import { formatClock, formatDayHeading, formatDuration, formatRange } from '../lib/format';
import { averageSleep, lastNight, missedNightDefaults, nights, sleepGoalMs, sleepSessions } from '../lib/sleep';
import { MAX_SLEEP_GOAL, MIN_SLEEP_GOAL } from '../lib/storage';
import { startOfDay } from '../lib/time';
import { useStore } from '../store';
import type { Session } from '../types';
import { SessionSheet } from './SessionSheet';
import { FixTimerSheet } from './FixTimerSheet';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG_NIGHT = 16 * 3_600_000;

type Editing = { session: Session | null; title: string; note?: string; start?: number; end?: number };

export function SleepScreen() {
  const { state, now, startSleep, stopSleep, discardSleep, setSleepGoal } = useStore();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [fixOpen, setFixOpen] = useState(false);
  const sleeping = !!state.sleep;
  const elapsed = state.sleep ? Math.max(0, now - state.sleep.startedAt) : 0;
  const goal = sleepGoalMs(state);
  const goalMinutes = goal / 60_000;

  const week = useMemo(() => nights(state, now, 7), [state, now]);
  const average = averageSleep(week);
  const last = useMemo(() => lastNight(state, now), [state, now]);
  const recent = useMemo(() => sleepSessions(state).slice(0, 14), [state]);
  const metGoal = week.filter((n) => n.total >= goal).length;
  const scale = Math.max(goal * 1.25, ...week.map((n) => n.total));

  const wake = () => {
    const session = stopSleep();
    // A very long night usually means the wake-up tap was missed; offer to fix it.
    if (session && session.end - session.start > LONG_NIGHT) {
      setEditing({
        session,
        title: 'Check your wake time',
        note: `That’s ${formatDuration(session.end - session.start)}. If you woke up earlier, set the real time below.`,
      });
    }
  };

  return (
    <section className="timer sleep">
      <h1 className="brand">Hourwell</h1>
      <div className="focus-intro">
        <p className="eyebrow">Rest is part of the work.</p>
        <h2>{sleeping ? 'Sleep well.' : 'Wind down.'}</h2>
        <p>{sleeping ? 'Tap when you wake up. Your night saves itself.' : 'Tap at lights out. Tap again when you wake.'}</p>
      </div>

      <div className="stat-row" aria-label="Sleep summary">
        <div className="stat-card">
          <div className="stat-label">Last night</div>
          <div className="stat-value">{last ? formatDuration(last.total) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">7-night avg</div>
          <div className="stat-value">{average !== null ? formatDuration(average) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Goal</div>
          <div className="stat-value goal-stepper">
            <button
              type="button"
              aria-label="Lower sleep goal by 30 minutes"
              disabled={goalMinutes <= MIN_SLEEP_GOAL}
              onClick={() => setSleepGoal(goalMinutes - 30)}
            >
              −
            </button>
            <span>{formatDuration(goal)}</span>
            <button
              type="button"
              aria-label="Raise sleep goal by 30 minutes"
              disabled={goalMinutes >= MAX_SLEEP_GOAL}
              onClick={() => setSleepGoal(goalMinutes + 30)}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="stage">
        <button
          type="button"
          className={sleeping ? 'orb sleep-orb is-running' : 'orb sleep-orb'}
          aria-pressed={sleeping}
          aria-label={sleeping ? 'I’m awake. Stop sleep timer' : 'Going to sleep. Start sleep timer'}
          onClick={() => (sleeping ? wake() : startSleep())}
        >
          <span className="ticks" aria-hidden="true" />
          {sleeping ? (
            <>
              <span className="clock">{formatClock(elapsed)}</span>
              <span className="orb-hint">I’m awake</span>
            </>
          ) : (
            <>
              <MoonIcon />
              <span className="start-word">Sleep</span>
              <span className="orb-hint">Tap at lights out</span>
            </>
          )}
        </button>
        {sleeping ? (
          <button type="button" className="text-btn forgot-link" onClick={() => setFixOpen(true)}>
            Forgot to stop, or started by accident?
          </button>
        ) : (
          <p className="timer-caption">
            {state.active ? 'Starting sleep will stop and save your focus session.' : 'Forgot to tap? Add the night below.'}
          </p>
        )}
      </div>

      <div className="sleep-week">
        <div className="sleep-week-head">
          <h3>Last 7 nights</h3>
          <p className="quiet">
            Goal met {metGoal} of 7 nights
          </p>
        </div>
        <div className="sleep-plot" aria-hidden="true">
          <div className="sleep-goal-line" style={{ bottom: `${(goal / scale) * 100}%` }}>
            <span>Goal</span>
          </div>
          {week.map((n) => (
            <div key={n.day} className="sleep-bar-track">
              <div
                className={n.total >= goal ? 'sleep-bar-fill is-met' : 'sleep-bar-fill'}
                style={{ height: `${(n.total / scale) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <ul className="sleep-labels">
          {week.map((n) => (
            <li key={n.day} aria-label={`${formatDayHeading(n.day, now)}: ${n.total ? formatDuration(n.total) : 'no sleep logged'}`}>
              <span className="sleep-bar-value">{n.total ? formatDuration(n.total) : '—'}</span>
              <span className="sleep-bar-day">{WEEKDAY[new Date(n.day).getDay()]}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="sleep-list">
        <div className="sleep-week-head">
          <h3>Recent nights</h3>
          <button
            type="button"
            className="text-btn"
            onClick={() => setEditing({ session: null, title: 'Add a night', ...missedNightDefaults(now) })}
          >
            Add a night
          </button>
        </div>
        {recent.length === 0 && <p className="empty-line">No nights logged yet.</p>}
        {recent.map((s) => (
          <button
            key={s.id}
            type="button"
            className="session"
            onClick={() => setEditing({ session: s, title: 'Edit night' })}
          >
            <span className="dot" style={{ background: SLEEP_CATEGORY.color }} />
            <span className="session-main">
              <span className="session-cat">{formatDayHeading(startOfDay(s.end), now)}</span>
              <span className="session-when">{formatRange(s.start, s.end)}</span>
            </span>
            <span className="session-dur">{formatDuration(s.end - s.start)}</span>
          </button>
        ))}
      </div>

      {fixOpen && state.sleep && (
        <FixTimerSheet
          name="Sleep"
          startedAt={state.sleep.startedAt}
          endLabel="Woke up"
          now={now}
          onStopAt={(endAt) => stopSleep(endAt)}
          onDiscard={discardSleep}
          onClose={() => setFixOpen(false)}
        />
      )}
      {editing && (
        <SessionSheet
          session={editing.session}
          title={editing.title}
          note={editing.note}
          lockCategoryId={SLEEP_CATEGORY.id}
          defaultStart={editing.start}
          defaultEnd={editing.end}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function MoonIcon() {
  return (
    <svg className="moon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M19.5 14.2A7.6 7.6 0 0 1 9.8 4.5a7.6 7.6 0 1 0 9.7 9.7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

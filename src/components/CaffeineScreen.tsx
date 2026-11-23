import { useMemo, useState } from 'react';
import {
  BEDTIME_CAUTION_MG,
  caffeineLimit,
  dailyCaffeine,
  DRINK_PRESETS,
  drinksOn,
  inSystem,
  tonightsBedtime,
} from '../lib/caffeine';
import { formatTime } from '../lib/format';
import { MAX_CAFFEINE_LIMIT, MIN_CAFFEINE_LIMIT } from '../lib/storage';
import { startOfDay } from '../lib/time';
import { useStore } from '../store';
import type { Drink } from '../types';
import { DrinkSheet } from './DrinkSheet';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const mg = (value: number) => `${Math.round(value)} mg`;

export function CaffeineScreen() {
  const { state, now: tick, addDrink, setCaffeineLimit } = useStore();
  // The shared clock ticks every 30 s; use the real time so a drink just added counts right away.
  const now = Math.max(tick, Date.now());
  const [editing, setEditing] = useState<Drink | 'new' | null>(null);
  const limit = caffeineLimit(state);
  const today = useMemo(() => drinksOn(state, startOfDay(now)), [state, now]);
  const todayTotal = today.reduce((sum, d) => sum + d.mg, 0);
  const current = inSystem(state, now);
  const bedtime = tonightsBedtime(state, now);
  const atBedtime = bedtime > now ? inSystem(state, bedtime) : current;
  const week = useMemo(() => dailyCaffeine(state, now, 7), [state, now]);
  const scale = Math.max(limit * 1.2, ...week.map((d) => d.mg));
  const over = todayTotal > limit;

  return (
    <section className="timer caffeine">
      <h1 className="brand">Hourwell</h1>
      <div className="focus-intro">
        <p className="eyebrow">Steady energy.</p>
        <h2>Caffeine, in balance.</h2>
        <p>Tap a drink when you have it. See what’s left in your system by bedtime.</p>
      </div>

      <div className="stat-row" aria-label="Caffeine summary">
        <div className="stat-card">
          <div className="stat-label">Today</div>
          <div className="stat-value">{mg(todayTotal)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In your system</div>
          <div className="stat-value">≈ {mg(current)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Daily limit</div>
          <div className="stat-value goal-stepper">
            <button
              type="button"
              aria-label="Lower daily limit by 50 mg"
              disabled={limit <= MIN_CAFFEINE_LIMIT}
              onClick={() => setCaffeineLimit(limit - 50)}
            >
              −
            </button>
            <span>{limit}</span>
            <button
              type="button"
              aria-label="Raise daily limit by 50 mg"
              disabled={limit >= MAX_CAFFEINE_LIMIT}
              onClick={() => setCaffeineLimit(limit + 50)}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="caffeine-body">
        {over ? (
          <div className="caffeine-alert is-over" role="alert">
            <strong>⚠ Over your daily limit</strong>
            <span>
              {mg(todayTotal)} today, {mg(todayTotal - limit)} more than your {mg(limit)} limit. Consider switching to water
              or decaf for the rest of the day.
            </span>
          </div>
        ) : todayTotal >= limit * 0.8 ? (
          <div className="caffeine-alert" role="status">
            <strong>Close to your limit</strong>
            <span>
              {mg(todayTotal)} of {mg(limit)} today. Only {mg(limit - todayTotal)} to go.
            </span>
          </div>
        ) : null}
        <div className="limit-meter" role="img" aria-label={`${mg(todayTotal)} of ${mg(limit)} daily limit`}>
          <span className={over ? 'is-over' : ''} style={{ width: `${Math.min(100, (todayTotal / limit) * 100)}%` }} />
        </div>
        <p className={over ? 'form-error meter-note' : 'quiet meter-note'}>
          {over
            ? `${mg(todayTotal - limit)} over your daily limit.`
            : `${mg(limit - todayTotal)} left of your ${mg(limit)} limit today.`}
        </p>

        <h3 className="section-title">Add a drink</h3>
        <div className="drink-grid">
          {DRINK_PRESETS.map((preset) => {
            const exceeds = todayTotal + preset.mg > limit;
            return (
              <button
                key={preset.name}
                type="button"
                className={exceeds ? 'drink-chip would-exceed' : 'drink-chip'}
                aria-label={`Add ${preset.name}, ${preset.mg} mg${exceeds ? ', puts you over your daily limit' : ''}`}
                onClick={() => addDrink(preset)}
              >
                <span>{preset.name}</span>
                <small>{preset.mg} mg</small>
                {exceeds && <em>Over limit</em>}
              </button>
            );
          })}
        </div>
        <button type="button" className="text-btn" onClick={() => setEditing('new')}>
          Custom amount or earlier time
        </button>

        <div className={atBedtime > BEDTIME_CAUTION_MG ? 'bedtime-card is-high' : 'bedtime-card'}>
          <p className="bedtime-label">
            {bedtime > now ? `At bedtime (${formatTime(bedtime)})` : 'Past your usual bedtime'}
          </p>
          <p className="bedtime-value">≈ {mg(atBedtime)}</p>
          <p className="quiet">
            {atBedtime > BEDTIME_CAUTION_MG
              ? 'That much caffeine near bedtime can make it harder to fall asleep and sleep deeply.'
              : 'Low enough that it shouldn’t get in the way of sleep for most people.'}{' '}
            Estimate assumes caffeine halves about every 5 hours, which varies from person to person.
          </p>
        </div>

        <div className="sleep-week-head">
          <h3>Today’s drinks</h3>
        </div>
        {today.length === 0 && <p className="empty-line">Nothing yet today.</p>}
        {today.map((d) => (
          <button key={d.id} type="button" className="session" onClick={() => setEditing(d)}>
            <span className="dot" style={{ background: '#B98A5E' }} />
            <span className="session-main">
              <span className="session-cat">{d.name}</span>
              <span className="session-when">{formatTime(d.at)}</span>
            </span>
            <span className="session-dur">{mg(d.mg)}</span>
          </button>
        ))}

        <div className="sleep-week-head">
          <h3>Last 7 days</h3>
          <p className="quiet">Over limit {week.filter((d) => d.mg > limit).length} of 7 days</p>
        </div>
        <div className="sleep-plot" aria-hidden="true">
          <div className="sleep-goal-line" style={{ bottom: `${(limit / scale) * 100}%` }}>
            <span>Limit</span>
          </div>
          {week.map((d) => (
            <div key={d.day} className="sleep-bar-track">
              <div
                className={d.mg > limit ? 'caffeine-bar-fill is-over' : 'caffeine-bar-fill'}
                style={{ height: `${(d.mg / scale) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <ul className="sleep-labels">
          {week.map((d) => (
            <li key={d.day} aria-label={`${WEEKDAY[new Date(d.day).getDay()]}: ${mg(d.mg)}`}>
              <span className="sleep-bar-value">{d.mg ? Math.round(d.mg) : '—'}</span>
              <span className="sleep-bar-day">{WEEKDAY[new Date(d.day).getDay()]}</span>
            </li>
          ))}
        </ul>
      </div>

      {editing && <DrinkSheet drink={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

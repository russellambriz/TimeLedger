import { useMemo, useState } from 'react';
import { lookupCategory, focusState } from '../lib/defaults';
import { formatDuration, formatLongDay, formatMonthDay, formatWeekRange } from '../lib/format';
import { dayBuckets, weekBuckets, monthBuckets, type Bucket } from '../lib/stats';
import { addDays, startOfDay, startOfWeek, startOfMonth } from '../lib/time';
import { useStore } from '../store';
import type { State } from '../types';
import { StackedChart, type ChartBar } from './StackedChart';
import { StatRow } from './StatRow';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toBars(buckets: Bucket[], markKey: number, labelOf: (bucket: Bucket) => string, ledger: State): ChartBar[] {
  return buckets.map((bucket) => ({
    key: String(bucket.start),
    label: labelOf(bucket),
    total: bucket.total,
    mark: bucket.start === markKey,
    segments: bucket.slices.map((slice) => {
      const category = lookupCategory(ledger, slice.categoryId);
      return { id: slice.categoryId, name: category.name, color: category.color, ms: slice.ms };
    }),
  }));
}

export function InsightsScreen() {
  const { state: ledger, now } = useStore();
  const state = useMemo(() => focusState(ledger), [ledger]);
  const [mode, setMode] = useState<'days' | 'weeks' | 'months'>('days');
  const [offset, setOffset] = useState(0);
  const [pinned, setPinned] = useState<number | null>(null);
  const currentWeek = startOfWeek(now);
  const weekStart = addDays(currentWeek, offset * 7);
  const viewKey = mode === 'days' ? `days:${weekStart}` : mode;

  const bars = useMemo(() => {
    if (mode === 'months') return toBars(monthBuckets(state, now), startOfMonth(now), b => new Date(b.start).toLocaleDateString(undefined, {month: 'short'}), state);
    if (mode === 'weeks') {
      return toBars(weekBuckets(state, now, 8), startOfWeek(now), (bucket) => formatMonthDay(bucket.start), state);
    }
    return toBars(dayBuckets(state, weekStart, now), startOfDay(now), (bucket) => WEEKDAY[new Date(bucket.start).getDay()], state);
  }, [mode, now, state, weekStart]);

  const fallback = useMemo(() => {
    if (mode !== 'days') return Math.max(0, bars.length - 1);
    const todayKey = String(startOfDay(now));
    const today = bars.findIndex((bar) => bar.key === todayKey);
    if (today >= 0) return today;
    for (let index = bars.length - 1; index >= 0; index -= 1) {
      if (bars[index].total > 0) return index;
    }
    return 0;
  }, [bars, mode, now]);

  const active = pinned !== null && pinned < bars.length && viewKey ? pinned : fallback;
  const selected = bars[active] ?? bars[0];
  const visibleTotal = bars.reduce((sum, bar) => sum + bar.total, 0);
  const legendIds = new Set(bars.flatMap((bar) => bar.segments.map((segment) => segment.id)));
  const legend = state.categories.filter((category) => legendIds.has(category.id));

  const heading = selected
    ? mode === 'days'
      ? formatLongDay(Number(selected.key))
      : mode === 'months' ? new Date(Number(selected.key)).toLocaleDateString(undefined, {month: 'long', year: 'numeric'}) : formatWeekRange(Number(selected.key))
    : '';

  return (
    <section className="insights">
      <div className="page">
        <header className="page-head">
          <h1>Your focus, over time.</h1>
        </header>
        <StatRow now={now} />
        <div className="chart-head">
          <div className="segment" role="tablist" aria-label="Chart">
            <button type="button" role="tab" aria-selected={mode === 'days'} onClick={() => { setMode('days'); setPinned(null); }}>
              Days
            </button>
            <button type="button" role="tab" aria-selected={mode === 'weeks'} onClick={() => { setMode('weeks'); setPinned(null); }}>
              Weeks
            </button>
            <button type="button" role="tab" aria-selected={mode === 'months'} onClick={() => { setMode('months'); setPinned(null); }}>Months</button>
          </div>
          {mode === 'days' ? (
            <div className="pager">
              <button type="button" aria-label="Previous week" onClick={() => { setOffset((value) => value - 1); setPinned(null); }}>
                <Chevron direction="left" />
              </button>
              <div className="range">{formatWeekRange(weekStart)}</div>
              <button type="button" aria-label="Next week" disabled={offset >= 0} onClick={() => { setOffset((value) => Math.min(0, value + 1)); setPinned(null); }}>
                <Chevron direction="right" />
              </button>
            </div>
          ) : (
            <p className="quiet pager-note">{mode === 'months' ? 'Last 6 months' : 'Last 8 weeks'}</p>
          )}
        </div>
        <div className="panel">
          <StackedChart
            key={viewKey}
            bars={bars}
            active={active}
            onActive={setPinned}
            label={mode === 'days' ? 'Daily totals by category' : mode === 'months' ? 'Monthly focus totals by category' : 'Weekly focus totals by category'}
          />
          {legend.length > 0 && (
            <div className="legend">
              {legend.map((category) => (
                <span key={category.id}>
                  <i style={{ background: category.color }} />
                  {category.name}
                </span>
              ))}
            </div>
          )}
        </div>
        {selected && (
          <section className="detail" aria-live="polite">
            <p className="quiet">{mode === 'days' ? `Week · ${formatDuration(visibleTotal)}` : `${mode === 'months' ? 'Last 6 months' : 'Last 8 weeks'} · ${formatDuration(visibleTotal)}`}</p>
            <div className="detail-top">
              <h2>{heading}</h2>
              <p className="detail-total">{formatDuration(selected.total)}</p>
            </div>
            {selected.segments.length === 0 ? (
              <p className="empty-line">No time logged.</p>
            ) : (
              <ul className="break-list">
                {selected.segments.map((segment) => {
                  const percent = selected.total > 0 ? Math.round((segment.ms / selected.total) * 100) : 0;
                  const percentLabel = percent === 0 && segment.ms > 0 ? '<1%' : `${percent}%`;
                  return (
                    <li key={segment.id}>
                      <span className="dot" style={{ background: segment.color }} />
                      <span className="break-name">
                        {segment.name}
                        <span className="meter" aria-hidden="true">
                          <span style={{ width: `${percent}%`, background: segment.color }} />
                        </span>
                      </span>
                      <span className="break-dur">{formatDuration(segment.ms)}</span>
                      <span className="break-pct">{percentLabel}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </section>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M10 3.5 5.5 8 10 12.5' : 'M6 3.5 10.5 8 6 12.5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

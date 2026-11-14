import { useState } from 'react';
import type { State } from '../types';
import { lookupCategory } from '../lib/defaults';
import { formatDuration, toDatetimeLocal } from '../lib/format';
import { timelineSessions } from '../lib/timeline';
import { addDays, startOfDay } from '../lib/time';
const dateLabel = (ms: number) => new Date(ms).toLocaleDateString(undefined, {weekday:'short', month:'short',day:'numeric',year:'numeric'});
const timeLabel = (ms: number) => new Date(ms).toLocaleTimeString(undefined, {hour:'numeric',minute:'2-digit',second:'2-digit'});
const fullLabel = (ms: number) => new Date(ms).toLocaleString(undefined, {year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',timeZoneName:'short'});
export function FocusTimeline({state, now, initialDay}: {state: State; now: number; initialDay: number}) {
  const [day, setDay] = useState(() => startOfDay(Math.min(initialDay, now)));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const end = addDays(day,1);
  const rows = timelineSessions(state,day,now);
  const selected = rows.find(s => s.id === selectedId);
  const chooseDay = (value: number) => {setDay(startOfDay(value));setSelectedId(null);};
  return <section className="focus-timeline" aria-label="Focus session timeline">
    <div className="timeline-heading"><div><p className="eyebrow">WHEN YOU FOCUSED</p><h2>Your day, in focus.</h2></div>
      <button className="text-btn" onClick={() => chooseDay(now)}>Today</button></div>
    <p className="quiet">Pick a date or tap a daily chart bar. Tap a session for its exact times.</p>
    <div className="timeline-date">
      <button aria-label="Previous day" onClick={() => chooseDay(addDays(day,-1))}>‹</button>
      <label><span className="quiet">View date</span><input type="date" aria-label="Timeline date" value={toDatetimeLocal(day).slice(0,10)} max={toDatetimeLocal(now).slice(0,10)} onChange={e => {
        if (!e.target.value) return;
        const parsed = new Date(`${e.target.value}T00:00:00`).getTime();
        if (Number.isFinite(parsed) && parsed <= startOfDay(now)) chooseDay(parsed);
      }} /></label>
      <button aria-label="Next day" disabled={day >= startOfDay(now)} onClick={() => chooseDay(addDays(day,1))}>›</button>
    </div>
    <div className="timeline-day-title"><h3>{dateLabel(day)}</h3><span>{formatDuration(rows.reduce((sum,s) => sum+s.visibleEnd-s.visibleStart,0),true)}</span></div>
    <p className="quiet timeline-zone">Times follow your device’s time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p>
    <div className="timeline-axis" aria-hidden="true">{[0,.25,.5,.75,1].map((t,i) => <span key={t}>{i === 4 ? 'Midnight' : new Date(day+(end-day)*t).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</span>)}</div>
    {rows.length === 0 ? <p className="timeline-empty">No focus sessions on this date.</p> : rows.map(s => {
      const category=lookupCategory(state,s.categoryId);
      const label=`${category.name}: ${timeLabel(s.visibleStart)} – ${timeLabel(s.visibleEnd)}, ${formatDuration(s.visibleEnd-s.visibleStart,true)}${s.running ? ', in progress' : ''}`;
      return <button key={s.id} className="timeline-session" aria-label={label} aria-pressed={selectedId === s.id} onClick={() => setSelectedId(s.id)}>
        <span className="timeline-row-label"><span><i className="dot" style={{background:category.color}} />{category.name}{s.running ? ' · Live' : ''}</span><span>{formatDuration(s.visibleEnd-s.visibleStart,true)}</span></span>
        <span className="timeline-track"><span style={{left:`${s.left}%`,width:`${s.width}%`,background:category.color}} /></span>
        <span className="timeline-time">{timeLabel(s.visibleStart)} – {timeLabel(s.visibleEnd)}{s.visibleEnd === end ? ' (next midnight)' : ''}</span>
      </button>;
    })}
    {selected && <div className="timeline-selection" role="status"><strong>{lookupCategory(state,selected.categoryId).name}</strong><dl>
      <dt>Started</dt><dd>{fullLabel(selected.start)}</dd><dt>{selected.running ? 'Still focusing' : 'Ended'}</dt><dd>{selected.running ? 'In progress' : fullLabel(selected.end)}</dd>
      <dt>Full session</dt><dd>{formatDuration(selected.end-selected.start,true)}</dd><dt>On this date</dt><dd>{formatDuration(selected.visibleEnd-selected.visibleStart,true)}</dd>
    </dl></div>}
  </section>;
}

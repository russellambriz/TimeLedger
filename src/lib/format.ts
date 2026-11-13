import { addDays, startOfDay } from './time';

export function formatClock(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${hours.toString().padStart(2, '0')}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatDuration(ms: number, withSeconds = false): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (withSeconds) {
    if (hours > 0) return `${hours}h ${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    return `${seconds}s`;
  }

  if (totalSeconds === 0) return '0m';
  if (totalSeconds < 60) return `${totalSeconds}s`;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatTime(ms: number): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(ms);
}

export function formatRange(start: number, end: number): string {
  const startLabel = formatTime(start);
  const endLabel = formatTime(end);
  const startDay = startOfDay(start);
  const endDay = startOfDay(Math.max(start, end - 1));
  if (startDay === endDay) return `${startLabel} – ${endLabel}`;

  let cursor = startDay;
  let diff = 0;
  while (cursor < endDay && diff < 4) {
    cursor = addDays(cursor, 1);
    diff += 1;
  }
  if (diff === 1) return `${startLabel} – ${endLabel}`;

  const longEnd = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(end);
  return `${startLabel} – ${longEnd}`;
}

export function formatDayHeading(dayStart: number, now: number): string {
  const today = startOfDay(now);
  if (dayStart === today) return 'Today';
  if (dayStart === addDays(today, -1)) return 'Yesterday';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(dayStart);
}

export function formatLongDay(ms: number): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(ms);
}

export function formatWeekRange(start: number): string {
  const end = addDays(start, 6);
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const day = new Intl.DateTimeFormat('en-US', { day: 'numeric' });
  if (month.format(start) === month.format(end)) {
    return `${month.format(start)} ${day.format(start)} – ${day.format(end)}`;
  }
  return `${month.format(start)} ${day.format(start)} – ${month.format(end)} ${day.format(end)}`;
}

export function formatMonthDay(ms: number): string {
  const date = new Date(ms);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function toDatetimeLocal(ms: number): string {
  const date = new Date(ms);
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function fromDatetimeLocal(value: string): number {
  const parsed = new Date(value).getTime();
  return parsed;
}

export function toLocalISO(ms: number): string {
  const date = new Date(ms);
  const pad = (value: number) => value.toString().padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absolute = Math.abs(offset);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${pad(hours)}:${pad(minutes)}`;
}

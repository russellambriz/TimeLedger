/** Local calendar helpers. Weeks begin on Monday. All boundaries follow the device time zone. */

export function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function addDays(ms: number, days: number): number {
  const date = new Date(ms);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

export function startOfWeek(ms: number): number {
  const day = startOfDay(ms);
  const date = new Date(day);
  const weekday = date.getDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  date.setDate(date.getDate() - mondayOffset);
  return date.getTime();
}

export function startOfMonth(ms: number): number {
  const date = new Date(ms); date.setDate(1); date.setHours(0, 0, 0, 0); return date.getTime();
}
export function addMonths(ms: number, count: number): number {
  const date = new Date(startOfMonth(ms)); date.setMonth(date.getMonth() + count); return date.getTime();
}

import { lookupCategory } from './defaults';
import { toLocalISO } from './format';
import { parseState } from './storage';
import type { State } from '../types';

export type ImportResult = { ok: true; state: State } | { ok: false; error: string };

function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function seconds(ms: number): string {
  const value = ms / 1000;
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

export function toJSON(state: State): string {
  return JSON.stringify(
    {
      app: 'timeledger',
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: state.categories,
      sessions: state.sessions,
      active: state.active,
      lastCategoryId: state.lastCategoryId,
    },
    null,
    2,
  );
}

export function fromJSON(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't a TimeLedger backup." };
  }
  const state = parseState(parsed);
  if (!state) return { ok: false, error: "That file isn't a TimeLedger backup." };
  return { ok: true, state };
}

export function toCSV(state: State): string {
  const header = ['id', 'category', 'category_id', 'start', 'end', 'duration_seconds'];
  const lines = [header.join(',')];
  const sessions = state.sessions.slice().sort((a, b) => a.start - b.start);
  for (const session of sessions) {
    const category = lookupCategory(state, session.categoryId);
    lines.push(
      [
        csvCell(session.id),
        csvCell(category.name),
        csvCell(session.categoryId),
        csvCell(toLocalISO(session.start)),
        csvCell(toLocalISO(session.end)),
        csvCell(seconds(session.end - session.start)),
      ].join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

export function download(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function stamp(): string {
  const date = new Date();
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

import { applyRemote, prepareForUser, rowFor, type SyncMeta, type SyncRow } from './syncCore';
import type { State } from '../types';

export interface Remote {
  /** Upload rows. The server keeps whichever version has the newer modified_at. */
  push(rows: SyncRow[]): Promise<void>;
  /** Every row written since the cursor (all rows when null). */
  pull(since: string | null): Promise<SyncRow[]>;
}

export type SyncContext = {
  remote: Remote;
  userId: string;
  getState: () => State;
  /** Save a merged state without marking it as a local change. False if it could not be saved. */
  applyState: (next: State) => boolean;
  loadMeta: () => SyncMeta;
  saveMeta: (meta: SyncMeta) => void;
};

const PUSH_BATCH = 500;
// Re-read a little before the cursor so writes that committed slightly out of order are never missed.
const OVERLAP_MS = 60_000;

/** One full round: upload local changes, then download and merge everything new. */
export async function runSync(ctx: SyncContext): Promise<void> {
  let meta = prepareForUser(ctx.loadMeta(), ctx.getState(), ctx.userId);
  ctx.saveMeta(meta);

  const keys = Object.keys(meta.dirty);
  if (keys.length > 0) {
    const state = ctx.getState();
    const sent: Record<string, number> = {};
    const rows = keys.map((key) => {
      sent[key] = meta.mtimes[key] ?? 1;
      return rowFor(state, key, sent[key]);
    });
    for (let i = 0; i < rows.length; i += PUSH_BATCH) await ctx.remote.push(rows.slice(i, i + PUSH_BATCH));
    // Only clear records that did not change again while uploading.
    meta = ctx.loadMeta();
    const dirty = { ...meta.dirty };
    for (const key of keys) if (meta.mtimes[key] === sent[key]) delete dirty[key];
    meta = { ...meta, dirty };
    ctx.saveMeta(meta);
  }

  const since = meta.cursor ? new Date(Date.parse(meta.cursor) - OVERLAP_MS).toISOString() : null;
  const rows = await ctx.remote.pull(since);
  // Merge and save synchronously so no local change can slip in between.
  const merged = applyRemote(ctx.getState(), rows, ctx.loadMeta());
  if (!ctx.applyState(merged.state)) throw new Error('Could not save synced data on this device.');
  ctx.saveMeta(merged.meta);
}

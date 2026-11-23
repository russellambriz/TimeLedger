import { applyRemote, keyOf, prepareForUser, rowFor, type SyncMeta, type SyncRow } from './syncCore';
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
  let drinkError: unknown = null;
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
    // Drinks upload separately, so a cloud that isn't set up for them yet never blocks the rest.
    const core = rows.filter((row) => row.kind !== 'drink');
    const drinks = rows.filter((row) => row.kind === 'drink');
    for (let i = 0; i < core.length; i += PUSH_BATCH) await ctx.remote.push(core.slice(i, i + PUSH_BATCH));
    const uploaded = new Set(core.map((row) => keyOf(row.kind, row.id)));
    try {
      for (let i = 0; i < drinks.length; i += PUSH_BATCH) await ctx.remote.push(drinks.slice(i, i + PUSH_BATCH));
      for (const row of drinks) uploaded.add(keyOf(row.kind, row.id));
    } catch (err) {
      drinkError = err;
    }
    // Only clear records that uploaded and did not change again meanwhile.
    meta = ctx.loadMeta();
    const dirty = { ...meta.dirty };
    for (const key of uploaded) if (meta.mtimes[key] === sent[key]) delete dirty[key];
    meta = { ...meta, dirty };
    ctx.saveMeta(meta);
  }

  const since = meta.cursor ? new Date(Date.parse(meta.cursor) - OVERLAP_MS).toISOString() : null;
  const rows = await ctx.remote.pull(since);
  // Merge and save synchronously so no local change can slip in between.
  const merged = applyRemote(ctx.getState(), rows, ctx.loadMeta());
  if (!ctx.applyState(merged.state)) throw new Error('Could not save synced data on this device.');
  ctx.saveMeta(merged.meta);
  if (drinkError) {
    const text = drinkError instanceof Error ? drinkError.message : String(drinkError);
    throw new Error(
      /check constraint|records_kind_check/i.test(text)
        ? 'Caffeine isn’t syncing yet: the cloud needs a one-time update (see the README). Everything else synced.'
        : text,
    );
  }
}

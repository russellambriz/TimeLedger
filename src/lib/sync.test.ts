import { describe, expect, it } from 'vitest';
import { defaultState } from './defaults';
import { reducer, type Action } from './reducer';
import { applyRemote, diffState, emptyMeta, markChanged, type SyncMeta, type SyncRow } from './syncCore';
import { runSync, type Remote } from './syncEngine';
import type { State } from '../types';

/** In-memory stand-in for the Supabase table, with the same keep-newest rule as the SQL trigger. */
class FakeServer {
  rows = new Map<string, SyncRow & { updated_at: string }>();
  private clock = Date.UTC(2026, 10, 15);
  offline = false;
  remote(): Remote {
    return {
      push: async (rows) => {
        if (this.offline) throw new Error('Failed to fetch');
        for (const row of rows) {
          const key = `${row.kind}:${row.id}`;
          const old = this.rows.get(key);
          if (old && row.modified_at <= old.modified_at) continue;
          this.clock += 10;
          this.rows.set(key, { ...row, updated_at: new Date(this.clock).toISOString() });
        }
      },
      pull: async (since) => {
        if (this.offline) throw new Error('Failed to fetch');
        return [...this.rows.values()]
          .filter((row) => !since || row.updated_at > since)
          .sort((a, b) => a.updated_at.localeCompare(b.updated_at));
      },
    };
  }
}

/** One device: its own local state and sync metadata, like one phone or laptop. */
class Device {
  state: State = defaultState();
  meta: SyncMeta = emptyMeta();
  private now = Date.UTC(2026, 10, 15, 9);
  constructor(private server: FakeServer) {}
  tick(ms = 1000) {
    this.now += ms;
    return this.now;
  }
  act(action: Action) {
    const next = reducer(this.state, action);
    this.meta = markChanged(this.meta, diffState(this.state, next), this.tick());
    this.state = next;
  }
  sync(userId = 'user-1') {
    return runSync({
      remote: this.server.remote(),
      userId,
      getState: () => this.state,
      applyState: (next) => {
        this.state = next;
        return true;
      },
      loadMeta: () => this.meta,
      saveMeta: (meta) => {
        this.meta = meta;
      },
    });
  }
}

const ids = (state: State) => state.sessions.map((s) => s.id).sort();

describe('diffState', () => {
  it('finds added, changed, and removed records', () => {
    const a = defaultState();
    const b = reducer(a, { type: 'add-session', id: 's1', categoryId: 'reading', start: 1000, end: 2000 });
    expect(diffState(a, b)).toEqual(['session:s1']);
    const c = reducer(b, { type: 'update-session', id: 's1', end: 3000 });
    expect(diffState(b, c)).toEqual(['session:s1']);
    const d = reducer(c, { type: 'delete-session', id: 's1' });
    expect(diffState(c, d)).toEqual(['session:s1']);
    const e = reducer(d, { type: 'start', now: 5000 });
    expect(diffState(d, e)).toEqual(['settings:main']);
    const f = reducer(e, { type: 'update-category', id: 'reading', name: 'Books' });
    expect(diffState(e, f)).toEqual(['category:reading']);
  });
});

describe('applyRemote', () => {
  it('keeps a newer local change over an older remote one', () => {
    let state = reducer(defaultState(), { type: 'add-session', id: 's1', categoryId: 'reading', start: 1000, end: 2000 });
    const meta = markChanged(emptyMeta(), ['session:s1'], 500);
    const old: SyncRow = { kind: 'session', id: 's1', data: { categoryId: 'reading', start: 1000, end: 9000 }, deleted: false, modified_at: 400 };
    state = applyRemote(state, [old], meta).state;
    expect(state.sessions[0].end).toBe(2000);
  });

  it('ignores malformed remote rows', () => {
    const bad: SyncRow = { kind: 'session', id: 'x', data: { categoryId: 'reading', start: 5, end: 1 }, deleted: false, modified_at: 9 };
    const { state } = applyRemote(defaultState(), [bad], emptyMeta());
    expect(state.sessions).toEqual([]);
  });
});

describe('two devices syncing', () => {
  it('uploads existing history on first sign-in and downloads it on a new device', async () => {
    const server = new FakeServer();
    const phone = new Device(server);
    phone.act({ type: 'add-session', id: 'old-1', categoryId: 'reading', start: 1000, end: 2000 });
    phone.act({ type: 'add-session', id: 'old-2', categoryId: 'homework', start: 3000, end: 4000 });
    await phone.sync();

    const laptop = new Device(server);
    await laptop.sync();
    expect(ids(laptop.state)).toEqual(['old-1', 'old-2']);
    expect(Object.keys(phone.meta.dirty)).toEqual([]);
  });

  it('merges sessions recorded on both devices', async () => {
    const server = new FakeServer();
    const phone = new Device(server);
    const laptop = new Device(server);
    await phone.sync();
    await laptop.sync();
    phone.act({ type: 'add-session', id: 'p', categoryId: 'reading', start: 1000, end: 2000 });
    laptop.act({ type: 'add-session', id: 'l', categoryId: 'reading', start: 5000, end: 6000 });
    await phone.sync();
    await laptop.sync();
    await phone.sync();
    expect(ids(phone.state)).toEqual(['l', 'p']);
    expect(ids(laptop.state)).toEqual(['l', 'p']);
  });

  it('spreads deletions and edits, newest change winning', async () => {
    const server = new FakeServer();
    const phone = new Device(server);
    const laptop = new Device(server);
    phone.act({ type: 'add-session', id: 's', categoryId: 'reading', start: 1000, end: 2000 });
    phone.act({ type: 'add-session', id: 't', categoryId: 'reading', start: 3000, end: 4000 });
    await phone.sync();
    await laptop.sync();

    laptop.tick(5000);
    laptop.act({ type: 'update-session', id: 's', end: 2500 });
    phone.act({ type: 'update-session', id: 's', end: 1500 }); // older than the laptop's edit
    phone.act({ type: 'delete-session', id: 't' });
    await laptop.sync();
    await phone.sync();
    await laptop.sync();

    for (const device of [phone, laptop]) {
      expect(ids(device.state)).toEqual(['s']);
      expect(device.state.sessions[0].end).toBe(2500);
    }
  });

  it('shows a running timer on the other device and stops it there', async () => {
    const server = new FakeServer();
    const phone = new Device(server);
    const laptop = new Device(server);
    await phone.sync();
    await laptop.sync();
    phone.act({ type: 'start', now: phone.tick() });
    await phone.sync();
    await laptop.sync();
    expect(laptop.state.active?.startedAt).toBe(phone.state.active?.startedAt);

    laptop.tick(60_000);
    laptop.act({ type: 'stop', now: laptop.tick(), id: 'finished' });
    await laptop.sync();
    await phone.sync();
    expect(phone.state.active).toBeNull();
    expect(ids(phone.state)).toEqual(['finished']);
  });

  it('keeps changes made offline and uploads them later', async () => {
    const server = new FakeServer();
    const phone = new Device(server);
    await phone.sync();
    server.offline = true;
    phone.act({ type: 'add-session', id: 'offline', categoryId: 'reading', start: 1000, end: 2000 });
    await expect(phone.sync()).rejects.toThrow();
    expect(phone.meta.dirty['session:offline']).toBe(true);
    expect(ids(phone.state)).toEqual(['offline']);
    server.offline = false;
    await phone.sync();
    expect(phone.meta.dirty['session:offline']).toBeUndefined();
    expect(server.rows.has('session:offline')).toBe(true);
  });

  it('does not let a new device’s untouched defaults overwrite renamed activities', async () => {
    const server = new FakeServer();
    const phone = new Device(server);
    phone.act({ type: 'update-category', id: 'reading', name: 'Novels' });
    await phone.sync();
    const laptop = new Device(server);
    await laptop.sync();
    await phone.sync();
    for (const device of [phone, laptop]) {
      expect(device.state.categories.find((c) => c.id === 'reading')?.name).toBe('Novels');
    }
  });

  it('syncs a running sleep timer and the sleep goal', async () => {
    const server = new FakeServer();
    const phone = new Device(server);
    const laptop = new Device(server);
    await phone.sync();
    await laptop.sync();
    phone.act({ type: 'sleep-start', now: phone.tick() });
    phone.act({ type: 'set-sleep-goal', minutes: 510 });
    await phone.sync();
    await laptop.sync();
    expect(laptop.state.sleep?.startedAt).toBe(phone.state.sleep?.startedAt);
    expect(laptop.state.sleepGoal).toBe(510);

    laptop.tick(8 * 3_600_000);
    laptop.act({ type: 'sleep-stop', now: laptop.tick(), id: 'night' });
    await laptop.sync();
    await phone.sync();
    expect(phone.state.sleep ?? null).toBeNull();
    expect(phone.state.sessions.find((s) => s.id === 'night')?.categoryId).toBe('sleep');
  });
});

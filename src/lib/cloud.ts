import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { Remote } from './syncEngine';
import type { RecordKind, SyncRow } from './syncCore';

// Public project settings. The publishable key is designed to ship in apps;
// row-level security in supabase/schema.sql keeps each account's data private.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://thszqceytojatnmxblxi.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_PT68NOaP565u58_tgKdszA_SX8meuQD';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit', storageKey: 'hourwell.auth' },
});

const PAGE = 1000;

// Postgres returns microseconds; trim to milliseconds so every browser parses it.
const iso = (value: string) => new Date(value.replace(/(\.\d{3})\d+/, '$1')).toISOString();

export function supabaseRemote(userId: string): Remote {
  return {
    async push(rows) {
      const { error } = await supabase
        .from('records')
        .upsert(rows.map((row) => ({ ...row, user_id: userId })), { onConflict: 'user_id,kind,id' });
      if (error) throw new Error(error.message);
    },
    async pull(since) {
      const out: SyncRow[] = [];
      for (let from = 0; ; from += PAGE) {
        let query = supabase
          .from('records')
          .select('kind,id,data,deleted,modified_at,updated_at')
          .order('updated_at', { ascending: true })
          .order('kind')
          .order('id')
          .range(from, from + PAGE - 1);
        if (since) query = query.gt('updated_at', since);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        for (const row of data ?? []) {
          out.push({
            kind: row.kind as RecordKind,
            id: row.id as string,
            data: (row.data as Record<string, unknown> | null) ?? null,
            deleted: row.deleted === true,
            modified_at: Number(row.modified_at),
            updated_at: iso(row.updated_at as string),
          });
        }
        if (!data || data.length < PAGE) return out;
      }
    },
  };
}

/** Calls onChange whenever another device writes to this account. */
export function watchRemote(userId: string, onChange: () => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`records:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: `user_id=eq.${userId}` }, onChange)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

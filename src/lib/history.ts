import { supabase } from '@/db/supabase';

export interface HistoryEntry {
  query: string;
  at: string;
}

function normalize(list: unknown[]): HistoryEntry[] {
  return list
    .map((item) => {
      const row = item as { query?: unknown; at?: unknown; created_at?: unknown };
      const query = typeof row?.query === 'string' ? row.query.trim() : '';
      if (!query) return null;
      return { query, at: String(row.at ?? row.created_at ?? '') };
    })
    .filter((entry): entry is HistoryEntry => entry !== null);
}

/** Reads the stored query history; the published site ships no history.json. */
export async function loadHistory(): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from('query_history')
    .select('query, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !Array.isArray(data)) return [];
  return normalize(data);
}

export async function recordQuery(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  await supabase.from('query_history').insert({ query: trimmed });
}

export function mostRecentQuery(entries: HistoryEntry[]): string {
  return entries[0]?.query ?? '';
}

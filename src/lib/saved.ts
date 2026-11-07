import { supabase } from '@/db/supabase';
import type { IcebergProduct } from '@/types/iceberg';

export interface SavedIceberg {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  total_cost: number;
  retail_price: number;
  node_count: number;
  created_at: string;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'iceberg';
}

export async function saveIceberg(
  product: IcebergProduct,
  totalCost: number,
  nodeCount: number,
): Promise<string> {
  const slug = `${slugify(product.name)}-${Math.random().toString(36).slice(2, 7)}`;
  const { error } = await supabase.from('saved_icebergs').insert({
    slug,
    title: product.name,
    emoji: '',
    payload: product,
    total_cost: totalCost,
    retail_price: product.retailPrice,
    node_count: nodeCount,
  });
  if (error) throw new Error(error.message);
  return slug;
}

export async function loadIceberg(slug: string): Promise<IcebergProduct | null> {
  const { data, error } = await supabase
    .from('saved_icebergs')
    .select('payload')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.payload as IcebergProduct) ?? null;
}

export async function listRecent(limit = 8): Promise<SavedIceberg[]> {
  const { data, error } = await supabase
    .from('saved_icebergs')
    .select('id, slug, title, emoji, total_cost, retail_price, node_count, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as SavedIceberg[];
}

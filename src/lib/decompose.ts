import { sanitizeEmoji } from '@/lib/emoji';
import type {
  ConfigOption,
  Ingredient,
  NodeKind,
  SeedIngredient,
  SeedProduct,
  SimilarProduct,
  Source,
} from '@/types/iceberg';

const KINDS: NodeKind[] = ['intermediate', 'material', 'raw', 'tool', 'consumable', 'time'];

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) ?? '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? '';

let counter = 0;
const uid = (prefix: string) => `${prefix}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function normalizeSource(raw: unknown, fallbackQuery: string): Source {
  const r = (raw ?? {}) as Record<string, unknown>;
  const tier = String(r.qualityTier ?? 'mid');
  return {
    vendor: String(r.vendor ?? 'Amazon'),
    title: String(r.title ?? fallbackQuery),
    price: Number(r.price) > 0 ? Number(r.price) : 1,
    rating: Math.min(5, Math.max(0, Number(r.rating) || 4.3)),
    reviews: Math.max(0, Math.round(Number(r.reviews) || 0)),
    qualityTier: tier === 'budget' || tier === 'premium' ? tier : 'mid',
    shipping: String(r.shipping ?? 'Varies'),
    searchQuery: String(r.searchQuery ?? fallbackQuery),
  };
}

export function hydrateIngredients(
  seeds: SeedIngredient[],
  depth: number,
  parentName: string | null,
  prefix: string,
): Ingredient[] {
  return (seeds ?? []).map((seed, index) => {
    const id = `${prefix}-${index}`;
    const kind: NodeKind = KINDS.includes(seed.kind) ? seed.kind : 'material';
    const sources = Array.isArray(seed.sources) ? seed.sources.map((s) => normalizeSource(s, seed.name)) : [];
    if (kind !== 'time' && sources.length === 0) {
      sources.push({
        vendor: 'Amazon',
        title: seed.name || 'Part',
        price: Number(seed.unitCost) > 0 ? Number(seed.unitCost) : 1,
        rating: 4.2,
        reviews: 0,
        qualityTier: 'mid',
        shipping: 'Varies',
        searchQuery: seed.name || 'Part',
      });
    }
    return {
      id,
      name: seed.name || 'Part',
      emoji: sanitizeEmoji(seed.emoji, seed.name || 'Part', kind),
      kind,
      qty: Number(seed.qty) > 0 ? Number(seed.qty) : 1,
      unit: seed.unit || 'unit',
      unitCost: Number(seed.unitCost) || sources[0]?.price || 0,
      sources,
      selectedSource: 0,
      optional: Boolean(seed.optional),
      configId: seed.configId ?? null,
      enabled: seed.enabled ?? !seed.optional,
      timeMinutes: Number(seed.timeMinutes) || 0,
      lore: seed.lore ?? '',
      expandable: kind !== 'time',
      terminal: Boolean(seed.terminal),
      expanded: false,
      loading: false,
      loadingStartedAt: 0,
      pending: false,
      children: Array.isArray(seed.children) ? hydrateIngredients(seed.children, depth + 1, seed.name, id) : [],
      depth,
      parentName,
    };
  });
}

export function hydrateProduct(seed: SeedProduct, origin: 'seed' | 'ai' = 'seed') {
  return {
    id: seed.id,
    name: seed.name,
    category: seed.category,
    lore: seed.lore,
    retailPrice: seed.retailPrice,
    assemblyMinutes: seed.assemblyMinutes,
    configurations: seed.configurations ?? [],
    activeConfigs: (seed.configurations ?? []).map((c) => c.id),
    similar: seed.similar ?? [],
    ingredients: hydrateIngredients(seed.ingredients ?? [], 1, seed.name, seed.id),
    origin,
  };
}

export interface DecomposeResult {
  name: string;
  category: string;
  lore: string;
  retailPrice: number;
  assemblyMinutes: number;
  configurations: ConfigOption[];
  similar: SimilarProduct[];
  ingredients: SeedIngredient[];
}

function repairJson(raw: string): string {
  const s = raw.replace(/,\s*([}\]])/g, '$1');
  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{') stack.push('}');
    else if (c === '[') stack.push(']');
    else if (c === '}' || c === ']') stack.pop();
  }
  let out = s;
  if (inString) out += '"';
  while (stack.length) out += stack.pop();
  return out;
}

function parseModelJson(text: string): Record<string, unknown> {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  try {
    return JSON.parse(t) as Record<string, unknown>;
  } catch {
    return JSON.parse(repairJson(t)) as Record<string, unknown>;
  }
}

function normalizeResult(raw: Record<string, unknown>, fallbackName: string): DecomposeResult {
  const configs = Array.isArray(raw.configurations) ? raw.configurations : [];
  const similar = Array.isArray(raw.similar) ? raw.similar : [];
  const ingredients = Array.isArray(raw.ingredients) ? raw.ingredients : [];
  return {
    name: String(raw.name ?? fallbackName),
    category: String(raw.category ?? 'General'),
    lore: String(raw.lore ?? ''),
    retailPrice: Number(raw.retailPrice) || 0,
    assemblyMinutes: Number(raw.assemblyMinutes) || 0,
    configurations: configs.map((c) => {
      const o = c as Record<string, unknown>;
      return {
        id: String(o.id ?? 'opt'),
        label: String(o.label ?? 'Option'),
        description: String(o.description ?? ''),
      };
    }),
    similar: similar.map((c) => {
      const o = c as Record<string, unknown>;
      return {
        name: String(o.name ?? ''),
        retailPrice: Number(o.retailPrice) || 0,
        note: String(o.note ?? ''),
      };
    }),
    ingredients: ingredients.filter((i) => i && typeof i === 'object') as SeedIngredient[],
  };
}

export interface DecomposeParams {
  product: string;
  parentName?: string;
  parentKind?: string;
  depth: number;
  path?: string[];
  onProgress?: (chars: number) => void;
  signal?: AbortSignal;
}

export async function decomposeWithAI(params: DecomposeParams): Promise<DecomposeResult> {
  if (!SUPABASE_URL) throw new Error('Backend is not configured');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/iceberg-decompose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      product: params.product,
      parentName: params.parentName ?? null,
      parentKind: params.parentKind ?? null,
      depth: params.depth,
      path: params.path ?? [],
    }),
    signal: params.signal,
  });

  if (res.status === 429) throw new Error('Quota exceeded — try again in a moment.');
  if (res.status === 402) throw new Error('AI credits exhausted.');
  if (!res.ok || !res.body) throw new Error(`Decomposition failed (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const frame = JSON.parse(data) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const parts = frame.candidates?.[0]?.content?.parts ?? [];
        const text = parts.map((p) => p.text ?? '').join('');
        if (text) {
          full += text;
          params.onProgress?.(full.length);
        }
      } catch {
        /* partial frame */
      }
    }
  }

  if (!full.trim()) throw new Error('The model returned an empty response.');
  return normalizeResult(parseModelJson(full), params.parentName ?? params.product);
}

export function genericFallback(name: string): DecomposeResult {
  const label = name.trim() || 'Unknown item';
  const q = label.toLowerCase();
  return {
    name: label.charAt(0).toUpperCase() + label.slice(1),
    category: 'General',
    lore: `A rough placeholder for "${label}". The model could not be reached, so these are estimates — expand any part to retry.`,
    retailPrice: 60,
    assemblyMinutes: 120,
    configurations: [],
    similar: [],
    ingredients: [
      {
        name: 'Main material',
        kind: 'material',
        qty: 1,
        unit: 'kg',
        unitCost: 12,
        lore: `The dominant structural material of a ${q}.`,
        sources: [
          { vendor: 'Amazon', title: `${label} material`, price: 14, rating: 4.3, reviews: 420, qualityTier: 'mid', shipping: 'Prime · 2 d', searchQuery: `${q} material` },
          { vendor: 'AliExpress', title: `${label} stock`, price: 8.5, rating: 4.2, reviews: 1600, qualityTier: 'budget', shipping: 'Free · 18 d', searchQuery: `${q} material` },
        ],
      },
      {
        name: 'Fasteners',
        kind: 'material',
        qty: 12,
        unit: 'pcs',
        unitCost: 0.18,
        lore: 'Screws, rivets or clips depending on the design.',
        sources: [
          { vendor: 'McMaster-Carr', title: 'Fastener assortment', price: 0.22, rating: 4.7, reviews: 180, qualityTier: 'premium', shipping: '$9 · 2 d', searchQuery: 'stainless fastener assortment' },
        ],
      },
      {
        name: 'Finish',
        kind: 'consumable',
        qty: 0.2,
        unit: 'L',
        unitCost: 9,
        lore: 'Paint, oil or coating. Needs a day to cure.',
        sources: [
          { vendor: 'Home Depot', title: 'All-purpose finish', price: 11, rating: 4.4, reviews: 900, qualityTier: 'mid', shipping: '$6 · 3 d', searchQuery: 'all purpose finish coating' },
        ],
      },
      {
        name: 'Hand tools',
        kind: 'tool',
        qty: 1,
        unit: 'set',
        unitCost: 24,
        lore: 'Reusable tools for the build.',
        sources: [
          { vendor: 'Amazon', title: 'Tool set', price: 29, rating: 4.5, reviews: 3200, qualityTier: 'mid', shipping: 'Prime · 2 d', searchQuery: 'general hand tool set' },
        ],
      },
      { name: 'Build time', kind: 'time', qty: 120, unit: 'min', unitCost: 0, timeMinutes: 120, lore: 'Placeholder build time for a competent amateur.' },
    ],
  };
}

export { uid };

export interface AdjustInput {
  parent: { name: string; kind: string };
  children: { name: string; kind: string; qty: number; unit: string; enabled: boolean }[];
  instruction: string;
}

export async function adjustWithAI(input: AdjustInput): Promise<{ children: SeedIngredient[] }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/iceberg-adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Adjust failed: ${res.status}`);
  const data = (await res.json()) as { children?: SeedIngredient[] };
  return { children: Array.isArray(data.children) ? data.children : [] };
}

import { callExternal, loadAiConfig } from '../_shared/ai.ts';

const GATEWAY =
  'https://app-fmqivvhx90jl-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

interface RequestBody {
  product?: string;
  parentName?: string | null;
  parentKind?: string | null;
  depth?: number;
  path?: string[];
}

const SCHEMA = `{
  "name": string,
  "category": string,
  "lore": string,
  "retailPrice": number,
  "assemblyMinutes": number,
  "configurations": [{ "id": string, "label": string, "description": string }],
  "similar": [{ "name": string, "retailPrice": number, "note": string }],
  "ingredients": [Ingredient]
}

Ingredient = {
  "name": string,
  "emoji": string,
  "kind": "intermediate" | "material" | "raw" | "tool" | "consumable" | "time",
  "qty": number,
  "unit": string,
  "unitCost": number,
  "optional": boolean,
  "configId": string | null,
  "timeMinutes": number,
  "lore": string,
  "expandable": boolean,
  "terminal": boolean,
  "sources": [{
    "vendor": string,
    "title": string,
    "price": number,
    "rating": number,
    "reviews": number,
    "qualityTier": "budget" | "mid" | "premium",
    "shipping": string,
    "searchQuery": string
  }]
}`;

function buildPrompt(body: RequestBody): string {
  const product = (body.product ?? '').trim();
  const parentName = (body.parentName ?? '').trim();
  const depth = Number(body.depth ?? 0);
  const path = Array.isArray(body.path) ? body.path.filter(Boolean) : [];

  const target = parentName
    ? `Decompose the component "${parentName}" (a ${body.parentKind ?? 'part'} of a ${product}).`
    : `Decompose the finished product "${product}".`;

  const trail = path.length ? `\nDECOMPOSITION PATH: ${path.join(' → ')} → ${parentName || product}` : '';

  return `You are ICEBERG, a supply-chain and fabrication analyst. You produce exact, technically honest bills of materials.

${target}${trail}
DEPTH: ${depth}

Return ONLY a JSON object matching this schema. No markdown fences, no commentary, no trailing text.

${SCHEMA}

RULES
1. 6–12 ingredients. Name things the way a person taking the object apart would name them.
2. kind semantics:
   - "intermediate" = a human-scale part of the thing (leg, seat, backrest, sleeve, keycap, blade, sole). It can be broken down further.
   - "material" = consumed stock (hardwood, steel, cotton, resin, glass)
   - "tool" = reusable and NOT consumed (saw, sewing machine, soldering iron, clamp)
   - "consumable" = used up in small amounts (glue, stain, solder, thread, sandpaper)
   - "time" = labour only. unitCost MUST be 0 and timeMinutes MUST be set.
3. "emoji": exactly one emoji that best represents the item (🪵 for hardwood, 🔩 for screws, 🧴 for glue, ⏳ for time).
4. COMMON NAMES ONLY in "name". Never put dimensions, sizes, grades, part numbers, tolerances or model numbers in a name. Any technical detail belongs in "lore".
5. Intermediates must be the obvious parts, not factory sub-assemblies. A chair is 4 legs + 1 seat + an optional back — never "frame assembly" or "sub-assembly". Use qty to express repetition (qty 4, unit "leg").
6. NEVER emit an "assembly" or "process" ingredient. Labour is always a "time" ingredient.
7. "expandable": true for every non-time ingredient. You decide when to stop by returning "terminal": true and no children.
8. Every non-time ingredient needs at least 1 source (2–4 preferred) — tools, screws, bolts, glue and sandpaper included. If an exact product does not exist, use the closest category search. Use ONLY these vendor names: Amazon, eBay, AliExpress, Alibaba, Etsy, McMaster-Carr, Digi-Key, Home Depot, Local supplier.
9. "searchQuery" must be a short, real product search string a buyer would type (e.g. "kiln dried hardwood blank"). NEVER invent URLs or product links.
10. Prices in USD at realistic 2025 street prices. rating between 3.5 and 5.0. reviews is an integer.
11. qualityTier: "budget" = cheapest usable, "mid" = balanced, "premium" = best quality. Include at least one budget and one premium option where they exist.
12. If the product has meaningful variants, add "configurations" and mark variant-only ingredients optional:true with the matching configId. Otherwise configurations is [].
13. "lore": 1–2 sentences of concrete, interesting detail — why this material, what it costs, what goes wrong. No dimensions, no marketing language.
14. "assemblyMinutes": realistic hands-on build time for a competent amateur, excluding curing.
15. "similar": 2–4 comparable products with their retail price, so the user can compare.
16. "terminal": true only when the item genuinely cannot be broken down further (ore, log, bale, barrel, sand, crude). Terminal items get a red outline and are never expanded.
17. Price the material or component itself in a normal retail pack size — never a collector's item, movie prop, replica, poster, DVD or merchandise that merely depicts it.
18. If the item is not sold directly (priceless, bespoke, artwork, custom fabrication), estimate from the closest comparable commodity by mass or volume and state the basis in "lore".
19. Sanity-check every price: fasteners are cents, a sheet of plywood is tens of dollars, a motor is tens to hundreds, a machined billet is hundreds. Never return a price that is orders of magnitude off.
20. "unitCost" is the price of ONE unit (one screw, one kg, one sheet) and "qty" is how many units one parent needs. Every source "price" is also per unit.
21. "timeMinutes" may span years — aging, curing, seasoning, growing, drying or geological waits (5 years = 2,628,000). Use the real duration, never cap it at hours.
22. Go one level deeper than feels necessary: intermediates break into parts, parts break into materials, materials break into raw commodities (log, ore, bale, barrel).
23. If the target is already a base commodity (copper, sand, water), return a single "material" ingredient with no children.`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  if (!body.product || !body.product.trim()) {
    return json({ error: 'Missing product' }, 400);
  }

  const external = await loadAiConfig();
  if (external) {
    try {
      const text = await callExternal(external, buildPrompt(body), 16384, 0.4);
      const frame = JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] });
      return new Response(`data: ${frame}\n\n`, {
        headers: {
          ...CORS,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'External provider failed' }, 502);
    }
  }

  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
  if (!apiKey) return json({ error: 'Server configuration error' }, 500);

  const upstream = await fetch(GATEWAY, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gateway-Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(body) }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 16384,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (upstream.status === 429 || upstream.status === 402) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    return json({ error: `Upstream error: ${upstream.status}`, detail: detail.slice(0, 400) }, 502);
  }

  return new Response(upstream.body, {
    headers: {
      ...CORS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});

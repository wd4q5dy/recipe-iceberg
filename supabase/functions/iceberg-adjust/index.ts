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

interface ChildInput {
  name: string;
  kind: string;
  qty: number;
  unit: string;
  enabled: boolean;
}

interface RequestBody {
  parent?: { name?: string; kind?: string };
  children?: ChildInput[];
  instruction?: string;
}

const SCHEMA = `{
  "children": [{
    "name": string,
    "emoji": string,
    "kind": "intermediate" | "material" | "raw" | "tool" | "consumable" | "time",
    "qty": number,
    "unit": string,
    "unitCost": number,
    "enabled": boolean,
    "optional": boolean,
    "timeMinutes": number,
    "lore": string,
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
  }]
}`;

function buildPrompt(body: RequestBody): string {
  const parent = body.parent ?? {};
  const children = Array.isArray(body.children) ? body.children : [];
  return `You are ICEBERG, editing the immediate children of a product decomposition node.

PARENT: ${parent.name ?? 'product'} (${parent.kind ?? 'intermediate'})
CURRENT CHILDREN:
${children.map((c) => `- ${c.name} [${c.kind}] qty ${c.qty} ${c.unit} ${c.enabled ? '(included)' : '(excluded)'}`).join('\n')}

USER INSTRUCTION: ${body.instruction ?? ''}

Return ONLY a JSON object matching this schema. No markdown fences, no commentary.

${SCHEMA}

RULES
1. Apply the instruction. You may enable/disable a child (enabled), rename it, change its kind, change qty/unit, or replace it entirely.
2. Keep 1–12 children. Preserve children the instruction does not touch.
3. Every non-time child needs at least 1 source with a real vendor search query. Use ONLY: Amazon, eBay, AliExpress, Alibaba, Etsy, McMaster-Carr, Digi-Key, Home Depot, Local supplier.
4. "terminal": true only when the item genuinely cannot be broken down further.
5. "time" children have unitCost 0 and timeMinutes set.
6. Prices in USD at realistic 2025 street prices, per unit. "qty" is how many units the parent needs.
7. Price the material or component itself — never a collector's item, movie prop, replica, poster or merchandise that merely depicts it.
8. If the item is not sold directly (priceless, bespoke, artwork, custom fabrication), estimate from the closest comparable commodity by mass or volume and state the basis in "lore".
9. Sanity-check every price: fasteners are cents, a sheet of plywood is tens of dollars, a motor is tens to hundreds. Never return a price that is orders of magnitude off.
10. "timeMinutes" may span years — aging, curing, seasoning, growing or drying (5 years = 2,628,000). Use the real duration, never cap it at hours.`;
}

function extractSse(text: string): string {
  let out = '';
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const obj = JSON.parse(payload) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      for (const part of obj.candidates?.[0]?.content?.parts ?? []) {
        if (typeof part.text === 'string') out += part.text;
      }
    } catch {
      // ignore malformed chunks
    }
  }
  return out;
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

  if (!body.instruction || !body.instruction.trim()) return json({ error: 'Missing instruction' }, 400);

  const external = await loadAiConfig();
  if (external) {
    try {
      const raw = await callExternal(external, buildPrompt(body), 8192, 0.35);
      const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleaned) as { children?: unknown[] };
      return json({ children: Array.isArray(parsed.children) ? parsed.children : [] });
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
        temperature: 0.35,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (upstream.status === 429 || upstream.status === 402) {
    const errText = await upstream.text();
    return new Response(errText, { status: upstream.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    return json({ error: `Upstream error: ${upstream.status}`, detail: detail.slice(0, 400) }, 502);
  }

  const raw = extractSse(await upstream.text());
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as { children?: unknown[] };
    return json({ children: Array.isArray(parsed.children) ? parsed.children : [] });
  } catch {
    return json({ error: 'Model returned invalid JSON', detail: cleaned.slice(0, 300) }, 502);
  }
});

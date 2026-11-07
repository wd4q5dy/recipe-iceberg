import { PROVIDERS, isProvider } from '../_shared/ai.ts';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ error: 'Server configuration error' }, 500);

  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  if (req.method === 'GET') {
    const res = await fetch(`${url}/rest/v1/api_config?select=provider,model,api_key&limit=1`, { headers });
    const rows = res.ok ? ((await res.json()) as { provider?: string; model?: string; api_key?: string }[]) : [];
    const row = Array.isArray(rows) ? rows[0] : undefined;
    return json({
      provider: isProvider(row?.provider) ? row.provider : 'gemini',
      model: row?.model || PROVIDERS.gemini.defaultModel,
      hasKey: Boolean(row?.api_key),
    });
  }

  if (req.method === 'POST') {
    const body = (await req.json().catch(() => null)) as
      | { provider?: unknown; model?: unknown; apiKey?: unknown }
      | null;
    const provider = body?.provider;
    const model = String(body?.model ?? '').trim();
    const apiKey = String(body?.apiKey ?? '').trim();

    if (!isProvider(provider)) return json({ error: 'Unknown provider' }, 400);
    if (!model) return json({ error: 'Model is required' }, 400);
    if (!apiKey) return json({ error: 'API key is required' }, 400);

    const res = await fetch(`${url}/rest/v1/api_config`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ id: true, provider, model, api_key: apiKey, updated_at: new Date().toISOString() }]),
    });
    if (!res.ok) return json({ error: 'Could not save configuration' }, 502);
    return json({ provider, model, hasKey: true });
  }

  if (req.method === 'DELETE') {
    const res = await fetch(`${url}/rest/v1/api_config?id=eq.true`, { method: 'DELETE', headers });
    if (!res.ok) return json({ error: 'Could not clear configuration' }, 502);
    return json({ provider: 'gemini', model: PROVIDERS.gemini.defaultModel, hasKey: false });
  }

  return json({ error: 'Method not allowed' }, 405);
});

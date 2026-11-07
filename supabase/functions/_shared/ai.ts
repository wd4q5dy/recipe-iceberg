export const PROVIDERS = {
  gemini: {
    label: 'Google AI Studio',
    host: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.5-flash',
  },
  openai: {
    label: 'OpenAI',
    host: 'https://api.openai.com',
    defaultModel: 'gpt-4o-mini',
  },
  openrouter: {
    label: 'OpenRouter',
    host: 'https://openrouter.ai/api',
    defaultModel: 'google/gemini-2.5-flash',
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;

export interface AiConfig {
  provider: ProviderId;
  model: string;
  apiKey: string;
}

export function isProvider(value: unknown): value is ProviderId {
  return typeof value === 'string' && Object.hasOwn(PROVIDERS, value);
}

/** Reads the user's override from the service-role-only table. Never exposed to the client. */
export async function loadAiConfig(): Promise<AiConfig | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/api_config?select=provider,model,api_key&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { provider?: string; model?: string; api_key?: string }[];
    const row = Array.isArray(rows) ? rows[0] : undefined;
    if (!row?.api_key || !isProvider(row.provider)) return null;
    return {
      provider: row.provider,
      model: row.model || PROVIDERS[row.provider].defaultModel,
      apiKey: row.api_key,
    };
  } catch {
    return null;
  }
}

/** Host is always a hardcoded allowlisted literal — never derived from request input. */
export async function callExternal(
  config: AiConfig,
  prompt: string,
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const host = PROVIDERS[config.provider].host;

  if (config.provider === 'gemini') {
    const res = await fetch(`${host}/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) throw new Error(`External provider error: ${res.status}`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
  }

  const res = await fetch(`${host}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
      ...(config.provider === 'openai' ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`External provider error: ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

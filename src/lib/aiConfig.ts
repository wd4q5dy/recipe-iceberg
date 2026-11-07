import { supabase } from '@/db/supabase';

export interface AiConfigStatus {
  provider: string;
  model: string;
  hasKey: boolean;
}

const FALLBACK: AiConfigStatus = { provider: 'gemini', model: 'gemini-2.5-flash', hasKey: false };

export async function getAiConfig(): Promise<AiConfigStatus> {
  const { data, error } = await supabase.functions.invoke<AiConfigStatus>('api-config', { method: 'GET' });
  if (error || !data) return FALLBACK;
  return data;
}

export async function saveAiConfig(input: {
  provider: string;
  model: string;
  apiKey: string;
}): Promise<AiConfigStatus> {
  const { data, error } = await supabase.functions.invoke<AiConfigStatus>('api-config', {
    method: 'POST',
    body: input,
  });
  if (error) {
    const detail = await error.context?.text?.().catch(() => '');
    throw new Error(detail || 'Could not save configuration');
  }
  return data ?? { provider: input.provider, model: input.model, hasKey: true };
}

export async function clearAiConfig(): Promise<void> {
  const { error } = await supabase.functions.invoke('api-config', { method: 'DELETE' });
  if (error) throw new Error('Could not clear configuration');
}

import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { clearAiConfig, getAiConfig, saveAiConfig, type AiConfigStatus } from '@/lib/aiConfig';
import type { HistoryEntry } from '@/lib/history';
import { buildSourceZip, downloadBlob } from '@/lib/sourceBundle';

const PROVIDERS = [
  { id: 'gemini', label: 'Google AI Studio', model: 'gemini-2.5-flash' },
  { id: 'openai', label: 'OpenAI', model: 'gpt-4o-mini' },
  { id: 'openrouter', label: 'OpenRouter', model: 'google/gemini-2.5-flash' },
];

const FIELD =
  'h-7 w-full min-w-0 rounded border border-white/20 bg-[oklch(0.2_0.03_240)] px-2 text-[12px] text-white outline-none placeholder:text-white/30 focus:border-white/50';

export function DevPanel({ history }: { history: HistoryEntry[] }) {
  const [status, setStatus] = useState<AiConfigStatus | null>(null);
  const [provider, setProvider] = useState('gemini');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let alive = true;
    void getAiConfig().then((next) => {
      if (!alive) return;
      setStatus(next);
      setProvider(next.provider);
      setModel(next.model);
    });
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const next = await saveAiConfig({ provider, model, apiKey });
      setStatus(next);
      setApiKey('');
      setNote('Saved — new requests use this provider.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save configuration');
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await clearAiConfig();
      setStatus({ provider: 'gemini', model: 'gemini-2.5-flash', hasKey: false });
      setNote('Cleared — back to the internal gateway.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear configuration');
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(await buildSourceZip(history), `iceberg-source-${stamp}.zip`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      data-interactive
      className="fixed bottom-4 left-4 z-[600] w-[320px] rounded-lg border border-white/20 bg-[oklch(0.17_0.03_240)] p-3 text-[12px] leading-relaxed text-white/70"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-white">Developer</p>
        <p className="text-white/40">hold both Shift</p>
      </div>

      <p className="mt-2">
        AI:{' '}
        <span className="font-semibold text-white">
          {status?.hasKey ? `${status.provider} · ${status.model}` : 'internal gateway'}
        </span>
      </p>

      <div className="mt-2 space-y-1.5">
        <select
          value={provider}
          onChange={(event) => {
            const next = event.target.value;
            setProvider(next);
            const option = PROVIDERS.find((item) => item.id === next);
            if (option) setModel(option.model);
          }}
          aria-label="AI provider"
          className={FIELD}
        >
          {PROVIDERS.map((item) => (
            <option key={item.id} value={item.id} className="bg-[oklch(0.2_0.03_240)]">
              {item.label}
            </option>
          ))}
        </select>

        <input
          value={model}
          onChange={(event) => setModel(event.target.value)}
          placeholder="Model"
          aria-label="Model"
          className={FIELD}
        />

        <input
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          type="password"
          autoComplete="off"
          placeholder={status?.hasKey ? 'Key set — enter a new one to replace' : 'API key'}
          aria-label="API key"
          className={FIELD}
        />

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || !apiKey.trim() || !model.trim()}
            className="flex h-7 flex-1 items-center justify-center gap-1.5 border border-white/40 text-white/85 transition-colors hover:border-white/70 hover:text-white disabled:opacity-40"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </button>
          <button
            type="button"
            onClick={() => void clear()}
            disabled={busy || !status?.hasKey}
            className="h-7 flex-1 border border-white/20 text-white/60 transition-colors hover:border-white/50 hover:text-white disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

      {error && <p className="mt-1.5 text-[oklch(0.72_0.16_25)]">{error}</p>}
      {note && <p className="mt-1.5 text-[oklch(0.78_0.14_150)]">{note}</p>}

      <div className="mt-3 border-t border-white/10 pt-2">
        <button
          type="button"
          onClick={() => void download()}
          disabled={downloading}
          className="flex h-7 w-full items-center justify-center gap-1.5 border border-white/30 text-white/80 transition-colors hover:border-white/60 hover:text-white disabled:opacity-50"
        >
          {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Download source (.zip)
        </button>
        <p className="mt-1 text-white/40">{history.length} queries in history.json</p>
      </div>
    </div>
  );
}

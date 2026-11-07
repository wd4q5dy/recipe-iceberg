import { useEffect, useRef, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  compact?: boolean;
  loading?: boolean;
  onRestore?: () => void;
}

export function QueryInput({ value, onChange, onSubmit, compact = false, loading, onRestore }: QueryInputProps) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(compact ? 60 : 96);

  useEffect(() => {
    if (measureRef.current) setWidth(measureRef.current.offsetWidth);
  }, [value, compact]);

  const text = value || 'something';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim() && !loading) onSubmit(value);
      }}
      data-interactive
      className="relative inline-flex items-center justify-center"
    >
      <span
        ref={measureRef}
        aria-hidden="true"
        className={cn(
          'pointer-events-none invisible absolute whitespace-pre',
          compact ? 'text-[11px]' : 'text-2xl font-light tracking-tight md:text-[32px]',
        )}
      >
        {text}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="something"
        aria-label="Product to decompose"
        autoComplete="off"
        spellCheck={false}
        style={{ width: Math.max(compact ? 64 : 96, width + (compact ? 22 : 26)) }}
        className={cn(
          'bg-transparent outline-none transition-colors duration-300',
          compact
            ? 'h-7 rounded-full border border-[oklch(0.26_0.05_240/0.22)] bg-white/75 px-3 text-center text-[11px] text-[oklch(0.26_0.05_240)] backdrop-blur placeholder:text-[oklch(0.26_0.05_240/0.4)] focus:border-[oklch(0.26_0.05_240/0.6)]'
            : 'border-b border-[oklch(0.26_0.05_240/0.45)] pb-1 text-center text-2xl font-light tracking-tight text-[oklch(0.26_0.05_240)] caret-[oklch(0.26_0.05_240)] placeholder:text-[oklch(0.26_0.05_240/0.4)] focus:border-[oklch(0.26_0.05_240)] md:text-[32px]',
        )}
      />
      {onRestore && (
        <button
          type="button"
          onClick={onRestore}
          aria-label="Reopen decomposition"
          className="ml-2 flex h-7 w-7 items-center justify-center rounded-full border border-[oklch(0.26_0.05_240/0.3)] text-[oklch(0.26_0.05_240/0.7)] transition-colors hover:border-[oklch(0.26_0.05_240/0.7)] hover:text-[oklch(0.26_0.05_240)]"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  );
}

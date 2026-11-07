import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Ingredient } from '@/types/iceberg';

interface MaterialStripProps {
  parent: Ingredient;
  busy: boolean;
  onToggle: (id: string) => void;
  onAdjust: (instruction: string) => void;
  onClose: () => void;
}

export function MaterialStrip({ parent, busy, onToggle, onAdjust, onClose }: MaterialStripProps) {
  const [text, setText] = useState('');

  return (
    <div
      data-interactive
      className="fixed bottom-4 left-1/2 z-40 w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-white/20 bg-[oklch(0.17_0.03_240)] p-3 text-[12px] text-white/70"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate">
          Adjusting <span className="font-semibold text-white">{parent.name}</span> ·{' '}
          <span className="font-mono-num text-white/90">{parent.children.length}</span> children
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close material strip"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-white/15 text-white/50 hover:border-white/40 hover:text-white"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {parent.children.map((child) => (
          <button
            key={child.id}
            type="button"
            onClick={() => onToggle(child.id)}
            className={cn(
              'flex items-center gap-1.5 rounded border px-2 py-1 text-[12px] transition-colors',
              child.enabled
                ? 'border-white/40 text-white'
                : 'border-white/10 text-white/35 line-through hover:border-white/25',
            )}
          >
            <span aria-hidden="true">{child.emoji}</span>
            <span className="max-w-[160px] truncate">{child.name}</span>
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim() || busy) return;
          onAdjust(text.trim());
          setText('');
        }}
        className="mt-2 flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. no plastic, use brass screws, drop the backrest"
          aria-label="Instruction for the AI"
          className="h-8 min-w-0 flex-1 rounded border border-white/20 bg-transparent px-2 text-[12px] text-white outline-none placeholder:text-white/35 focus:border-white/50"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="h-8 shrink-0 rounded border border-white/30 px-3 text-[12px] text-white/80 transition-colors hover:border-white/60 hover:text-white disabled:opacity-40"
        >
          {busy ? 'Applying…' : 'Apply'}
        </button>
      </form>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorldCanvasProps {
  width: number;
  height: number;
  children: ReactNode;
}

const MIN_SCALE = 0.16;
const MAX_SCALE = 2.4;

export function WorldCanvas({ width, height, children }: WorldCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);

  const fitted = useRef(false);

  const fitTo = useCallback(
    (h: number) => {
      const el = ref.current;
      if (!el) return;
      const vw = el.clientWidth;
      const vh = el.clientHeight;
      const scale = Math.min(vw / width, vh / h) * 0.92;
      setView({ scale, x: (vw - width * scale) / 2, y: (vh - h * scale) / 2 });
    },
    [width],
  );

  useEffect(() => {
    if (fitted.current) return;
    fitted.current = true;
    fitTo(Math.min(height, 1150));
  }, [fitTo, height]);

  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    setView((v) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const k = next / v.scale;
      return { scale: next, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.shiftKey) {
        const rect = el.getBoundingClientRect();
        zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX - rect.left, e.clientY - rect.top);
        return;
      }
      setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [zoomAt]);

  const pinchState = () => {
    const pts = Array.from(pointers.current.values());
    if (pts.length < 2) return null;
    const [a, b] = pts;
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
    };
  };

  const zoomCenter = (factor: number) => {
    const el = ref.current;
    if (!el) return;
    zoomAt(factor, el.clientWidth / 2, el.clientHeight / 2);
  };

  return (
    <div
      ref={ref}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('[data-interactive]')) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        e.currentTarget.setPointerCapture(e.pointerId);
        if (pointers.current.size >= 2) {
          drag.current = null;
          setDragging(false);
          pinch.current = pinchState();
          return;
        }
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        setDragging(true);
      }}
      onPointerMove={(e) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.current.size >= 2) {
          const next = pinchState();
          const prev = pinch.current;
          if (next && prev && prev.dist > 0) {
            const rect = e.currentTarget.getBoundingClientRect();
            zoomAt(next.dist / prev.dist, next.cx - rect.left, next.cy - rect.top);
          }
          pinch.current = next;
          return;
        }

        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        d.x = e.clientX;
        d.y = e.clientY;
        setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
      }}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) pinch.current = null;
        if (drag.current?.id === e.pointerId) {
          drag.current = null;
          setDragging(false);
        }
      }}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) pinch.current = null;
        drag.current = null;
        setDragging(false);
      }}
      className={cn(
        'fixed inset-0 touch-none select-none overflow-hidden bg-[oklch(0.15_0.03_240)]',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
      )}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          width,
          height,
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
          transformOrigin: '0 0',
        }}
      >
        {children}
      </div>

      <div data-interactive className="fixed bottom-4 right-4 z-50 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => zoomCenter(1.25)}
          aria-label="Zoom in"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-[oklch(0.2_0.03_240/0.85)] text-white/70 backdrop-blur transition-colors hover:border-white/50 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => zoomCenter(0.8)}
          aria-label="Zoom out"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-[oklch(0.2_0.03_240/0.85)] text-white/70 backdrop-blur transition-colors hover:border-white/50 hover:text-white"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => fitTo(height)}
          aria-label="Fit to view"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-[oklch(0.2_0.03_240/0.85)] text-white/70 backdrop-blur transition-colors hover:border-white/50 hover:text-white"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="font-mono-num pointer-events-none fixed bottom-4 left-4 z-50 text-[9px] uppercase tracking-[0.24em] text-white/35">
        drag or scroll to pan · shift+scroll or pinch to zoom
      </p>
    </div>
  );
}

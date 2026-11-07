import { cn } from '@/lib/utils';

interface DepthRailProps {
  depths: number[];
  activeDepth: number;
  progress: number;
  onJump: (depth: number) => void;
  onScrub: (ratio: number) => void;
}

export function DepthRail({ depths, activeDepth, progress, onJump, onScrub }: DepthRailProps) {
  return (
    <div className="fixed right-2.5 top-1/2 z-40 hidden -translate-y-1/2 md:block">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Depth"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onScrub(Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)));
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') onScrub(Math.min(1, progress + 0.08));
          if (e.key === 'ArrowUp') onScrub(Math.max(0, progress - 0.08));
        }}
        className="relative h-52 w-6 cursor-pointer"
      >
        <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rounded-full bg-white/20" />
        <div
          className="absolute left-1/2 top-0 w-[2px] -translate-x-1/2 rounded-full bg-white/80 transition-[height] duration-150"
          style={{ height: `${progress * 100}%` }}
        />
        {depths.map((depth, index) => {
          const top = depths.length > 1 ? (index / (depths.length - 1)) * 100 : 0;
          const active = depth === activeDepth;
          return (
            <button
              key={depth}
              type="button"
              aria-label={`Jump to depth ${depth}`}
              onClick={(e) => {
                e.stopPropagation();
                onJump(depth);
              }}
              style={{ top: `${top}%` }}
              className={cn(
                'absolute left-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-200',
                active
                  ? 'scale-125 border-white bg-white'
                  : 'border-white/50 bg-transparent hover:scale-110 hover:border-white',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

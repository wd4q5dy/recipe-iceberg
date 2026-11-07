import { memo, useState } from 'react';
import { motion } from 'motion/react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { sanitizeEmoji } from '@/lib/emoji';
import { qty, timeCount } from '@/lib/format';
import { OUTLINE, glowStyle, oklch, outlineFor } from '@/lib/palette';
import { cn } from '@/lib/utils';
import type { Ingredient } from '@/types/iceberg';
import { PanelMenu } from './PanelMenu';

interface PanelProps {
  node: Ingredient;
  share: number;
  elapsed: number;
  onExpand: () => void;
  onSelectSource: (index: number) => void;
  onHover: (id: string | null) => void;
  onAdjust?: () => void;
  size?: 'full' | 'small';
  menuSide?: 'top' | 'bottom';
}

const SIZES = {
  full: { box: 124, border: 3, pad: 3, radius: 10, inner: 6, emoji: 52, count: 22, dot: 6 },
  small: { box: 64, border: 2, pad: 2, radius: 6, inner: 4, emoji: 26, count: 12, dot: 4 },
};

function PanelImpl({
  node,
  share,
  elapsed,
  onExpand,
  onSelectSource,
  onHover,
  onAdjust,
  size = 'full',
  menuSide = 'bottom',
}: PanelProps) {
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const S = SIZES[size];
  const color = node.pending ? OUTLINE.time : node.terminal ? OUTLINE.terminal : outlineFor(node.kind, share);
  const glyph = sanitizeEmoji(node.emoji, node.name, node.kind);
  const count = node.pending
    ? elapsed.toFixed(1)
    : node.kind === 'time'
      ? timeCount(node.timeMinutes)
      : qty(node.qty);
  const countSize =
    count.length > 7 ? S.count * 0.55 : count.length > 5 ? S.count * 0.72 : count.length > 3 ? S.count * 0.88 : S.count;
  const dimmed = node.expanded && node.children.length > 0 && node.depth > 0;
  const opacity = !node.enabled ? 0.3 : dimmed ? 0.45 : 1;

  const handleClick = () => {
    if (node.pending) return;
    if (isDesktop) {
      if (node.expandable) onExpand();
      return;
    }
    setOpen(true);
  };

  const tile = (
    <motion.div
      data-interactive
      whileHover={isDesktop && !node.pending ? { y: -4, scale: 1.045 } : undefined}
      whileTap={node.pending ? undefined : { scale: 0.97 }}
      role="button"
      tabIndex={node.pending ? -1 : 0}
      aria-label={node.name}
      onClick={handleClick}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{
        ...glowStyle(color, node.expanded || node.pending),
        width: S.box,
        height: S.box,
        borderWidth: S.border,
        borderStyle: 'solid',
        padding: S.pad,
        borderRadius: S.radius,
        opacity,
      }}
      className={cn('group relative shrink-0 cursor-pointer', node.pending && 'cursor-default')}
    >
      <div
        className="relative flex h-full w-full items-center justify-center"
        style={{ background: 'oklch(0.12 0.03 240 / 0.42)', borderRadius: S.inner }}
      >
        <span
          className={cn('leading-none', node.pending && 'animate-pulse')}
          style={{ fontSize: S.emoji, filter: `drop-shadow(0 0 12px ${oklch(color, 0.45)})` }}
          aria-hidden="true"
        >
          {glyph}
        </span>

        <span
          className="font-mono-num absolute bottom-0.5 right-1 font-semibold leading-none tracking-tight"
          style={{ fontSize: countSize, color: 'oklch(0.99 0.005 220)', textShadow: `0 0 12px ${oklch(color, 0.5)}` }}
        >
          {count}
        </span>

        {node.optional && (
          <span
            className="absolute left-1.5 top-1.5 rounded-full"
            style={{ width: S.dot, height: S.dot, background: oklch(color, 0.9) }}
            aria-hidden="true"
          />
        )}
      </div>
    </motion.div>
  );

  if (node.pending) return tile;

  if (isDesktop) {
    return (
      <HoverCard openDelay={0} closeDelay={140}>
        <HoverCardTrigger asChild>{tile}</HoverCardTrigger>
        <HoverCardPrimitive.Portal>
          <HoverCardContent
            side={menuSide}
            align="center"
            collisionPadding={14}
            sideOffset={8}
            className="!z-[9999] max-h-[70vh] w-[252px] overflow-y-auto rounded-lg border-white/20 bg-[oklch(0.17_0.03_240)] p-0 shadow-none"
          >
            <PanelMenu node={node} onSelectSource={onSelectSource} onExpand={onExpand} onAdjust={onAdjust} />
          </HoverCardContent>
        </HoverCardPrimitive.Portal>
      </HoverCard>
    );
  }

  return (
    <>
      {tile}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!z-[9999] max-h-[85dvh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-lg border-white/20 bg-[oklch(0.17_0.03_240)] p-0">
          <DialogTitle className="sr-only">{node.name}</DialogTitle>
          <PanelMenu
            node={node}
            onSelectSource={(i) => onSelectSource(i)}
            onExpand={() => {
              setOpen(false);
              onExpand();
            }}
            onAdjust={
              onAdjust
                ? () => {
                    setOpen(false);
                    onAdjust();
                  }
                : undefined
            }
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export const Panel = memo(
  PanelImpl,
  (a, b) =>
    a.node === b.node &&
    a.share === b.share &&
    a.elapsed === b.elapsed &&
    a.size === b.size &&
    a.menuSide === b.menuSide,
);

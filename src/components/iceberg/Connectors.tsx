import { useMemo } from 'react';
import { PANEL_H, V_GAP, type LayoutNode, type TreeLayout } from '@/lib/layout';
import { oklch, outlineFor } from '@/lib/palette';
import { nodeShare } from '@/lib/tally';

interface ConnectorsProps {
  layout: TreeLayout;
  retailPrice: number;
  hoveredId: string | null;
  topOffset?: number;
}

export function Connectors({ layout, retailPrice, hoveredId, topOffset = 0 }: ConnectorsProps) {
  const paths = useMemo(() => {
    const out: { key: string; d: string; color: string; active: boolean }[] = [];

    const walk = (parent: LayoutNode) => {
      for (const child of parent.children) {
        const x1 = parent.x;
        const y1 = parent.y + PANEL_H;
        const x2 = child.x;
        const y2 = child.y;
        const midY = y1 + V_GAP / 2;
        out.push({
          key: `${parent.node.id}->${child.node.id}`,
          d: `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`,
          color: oklch(outlineFor(child.node.kind, nodeShare(child.node, retailPrice)), 0.62),
          active: hoveredId === parent.node.id || hoveredId === child.node.id,
        });
        walk(child);
      }
    };

    walk(layout.root);
    return out;
  }, [layout, retailPrice, hoveredId]);

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={layout.width}
      height={topOffset + layout.height}
      aria-hidden="true"
    >
      {paths.map((path) => (
        <g key={path.key}>
          {path.active && (
            <path d={path.d} fill="none" stroke={path.color} strokeWidth={7} strokeOpacity={0.16} />
          )}
          <path
            d={path.d}
            fill="none"
            stroke={path.color}
            strokeWidth={path.active ? 2.4 : 1.2}
            strokeOpacity={path.active ? 0.95 : 0.38}
          />
        </g>
      ))}
    </svg>
  );
}

import type { NodeKind } from '@/types/iceberg';

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export const oklch = (color: Oklch, alpha = 1): string =>
  alpha >= 1
    ? `oklch(${color.l} ${color.c} ${color.h})`
    : `oklch(${color.l} ${color.c} ${color.h} / ${alpha})`;

export const SEA_HUE = 232;

/** Each depth step is 10% darker than the one above it: 0.74, 0.666, 0.599 … */
export function depthLightness(depth: number): number {
  return 0.74 * Math.pow(0.9, depth);
}

export function seaColor(depth: number): string {
  const l = depthLightness(depth);
  const c = 0.062 + Math.min(depth, 9) * 0.012;
  return oklch({ l: Number(l.toFixed(4)), c: Number(c.toFixed(4)), h: SEA_HUE });
}

export const SKY_TOP = oklch({ l: 0.99, c: 0.014, h: 238 });
export const SKY_MID = oklch({ l: 0.975, c: 0.032, h: 234 });
export const SKY_BOTTOM = oklch({ l: 0.958, c: 0.048, h: SEA_HUE });
export const HORIZON = oklch({ l: 1, c: 0, h: 0 }, 0.92);

export const OUTLINE: Record<string, Oklch> = {
  material: { l: 0.8, c: 0.006, h: 240 },
  raw: { l: 0.66, c: 0.035, h: 68 },
  tool: { l: 0.87, c: 0.155, h: 95 },
  consumable: { l: 0.84, c: 0.14, h: 195 },
  terminal: { l: 0.62, c: 0.21, h: 25 },
  time: { l: 0.82, c: 0.16, h: 152 },
  white: { l: 0.98, c: 0.006, h: 220 },
  gold: { l: 0.86, c: 0.14, h: 85 },
  cyan: { l: 0.85, c: 0.13, h: 200 },
};

/** Intermediates climb white → gold → cyan as they take a larger share of the product's price. */
export function outlineFor(kind: NodeKind, share: number): Oklch {
  if (kind === 'raw') return OUTLINE.raw;
  if (kind === 'material') return OUTLINE.material;
  if (kind === 'tool') return OUTLINE.tool;
  if (kind === 'consumable') return OUTLINE.consumable;
  if (kind === 'time') return OUTLINE.time;
  if (share < 0.06) return OUTLINE.white;
  if (share < 0.18) return OUTLINE.gold;
  return OUTLINE.cyan;
}

export function glowStyle(color: Oklch, active: boolean): React.CSSProperties {
  const strength = active ? 1 : 0.62;
  return {
    borderColor: oklch(color, active ? 0.95 : 0.7),
    boxShadow: [
      `0 0 0 1px ${oklch(color, 0.22 * strength)}`,
      `0 0 ${active ? 26 : 16}px -2px ${oklch(color, 0.5 * strength)}`,
      `inset 0 0 26px -12px ${oklch(color, 0.85 * strength)}`,
    ].join(', '),
  };
}

import type { Ingredient } from '@/types/iceberg';

export const PANEL_W = 124;
export const PANEL_H = 124;
export const H_GAP = 30;
export const V_GAP = 96;
export const LEVEL_H = PANEL_H + V_GAP;

export interface LayoutNode {
  node: Ingredient;
  depth: number;
  x: number;
  y: number;
  parentX: number;
  parentY: number;
  width: number;
  children: LayoutNode[];
}

export interface TreeLayout {
  root: LayoutNode;
  nodes: LayoutNode[];
  width: number;
  height: number;
  maxDepth: number;
}

export function makePendingNode(parent: Ingredient): Ingredient {
  return {
    id: `${parent.id}::pending`,
    name: 'Thinking',
    emoji: '⏳',
    kind: 'time',
    qty: 0,
    unit: '',
    unitCost: 0,
    sources: [],
    selectedSource: 0,
    optional: false,
    configId: null,
    enabled: true,
    timeMinutes: 0,
    lore: '',
    expandable: false,
    terminal: false,
    expanded: false,
    loading: true,
    loadingStartedAt: parent.loadingStartedAt,
    pending: true,
    children: [],
    depth: parent.depth + 1,
    parentName: parent.name,
  };
}

function build(node: Ingredient, depth: number): LayoutNode {
  const kids = node.expanded ? node.children.filter((c) => c.enabled) : [];
  if (node.loading && !node.pending) kids.push(makePendingNode(node));

  const children = kids.map((kid) => build(kid, depth + 1));
  const childrenWidth =
    children.reduce((acc, child) => acc + child.width, 0) + H_GAP * Math.max(0, children.length - 1);

  return {
    node,
    depth,
    x: 0,
    y: 0,
    parentX: 0,
    parentY: 0,
    width: Math.max(PANEL_W, childrenWidth),
    children,
  };
}

function place(layout: LayoutNode, left: number, topY: number, parentX: number, parentY: number) {
  layout.x = left + layout.width / 2;
  layout.y = topY + layout.depth * LEVEL_H;
  layout.parentX = parentX;
  layout.parentY = parentY;

  if (layout.children.length === 0) return;

  const childrenWidth =
    layout.children.reduce((acc, child) => acc + child.width, 0) + H_GAP * (layout.children.length - 1);
  let cursor = left + (layout.width - childrenWidth) / 2;

  for (const child of layout.children) {
    place(child, cursor, topY, layout.x, layout.y);
    cursor += child.width + H_GAP;
  }
}

function flatten(layout: LayoutNode, acc: LayoutNode[] = []): LayoutNode[] {
  acc.push(layout);
  for (const child of layout.children) flatten(child, acc);
  return acc;
}

export function layoutTree(root: Ingredient, topY = 0): TreeLayout {
  const tree = build(root, 0);
  place(tree, 0, topY, 0, 0);
  tree.parentX = tree.x;
  tree.parentY = tree.y;
  const nodes = flatten(tree);
  const maxDepth = nodes.reduce((acc, n) => Math.max(acc, n.depth), 0);

  return {
    root: tree,
    nodes,
    width: tree.width,
    height: maxDepth * LEVEL_H + PANEL_H,
    maxDepth,
  };
}

export function seaGradient(maxDepth: number, height: number): string {
  const stops: string[] = [];
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const start = Math.min(100, ((depth * LEVEL_H) / height) * 100);
    const end = Math.min(100, (((depth + 1) * LEVEL_H) / height) * 100);
    const color = `oklch(${(0.74 * Math.pow(0.9, depth)).toFixed(4)} ${(0.062 + Math.min(depth, 9) * 0.012).toFixed(4)} 232)`;
    stops.push(`${color} ${start.toFixed(2)}%`);
    stops.push(`${color} ${end.toFixed(2)}%`);
  }
  return `linear-gradient(180deg, ${stops.join(', ')})`;
}

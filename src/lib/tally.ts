import type { IcebergProduct, Ingredient, Tally, TallyItem } from '@/types/iceberg';

export function nodePrice(node: Ingredient): number {
  const src = node.sources[node.selectedSource] ?? node.sources[0];
  return src ? src.price : node.unitCost;
}

export function nodeCost(node: Ingredient): number {
  if (node.kind === 'time') return 0;
  return nodePrice(node) * node.qty;
}

/** Share of the finished product's price — drives the white → gold → cyan outline. */
export function nodeShare(node: Ingredient, retailPrice: number): number {
  if (retailPrice <= 0) return 0;
  return nodeCost(node) / retailPrice;
}

export function computeTally(product: IcebergProduct): Tally {
  let materialCost = 0;
  let consumableCost = 0;
  let timeMinutes = product.assemblyMinutes;
  let leafCount = 0;
  const materials: TallyItem[] = [];
  const tools = new Map<string, TallyItem>();

  const walk = (nodes: Ingredient[], mult: number) => {
    for (const node of nodes) {
      if (!node.enabled) continue;
      const amount = node.qty * mult;

      if (node.kind === 'tool') {
        const existing = tools.get(node.name);
        if (existing) {
          existing.qty += amount;
          existing.cost += nodePrice(node) * amount;
        } else {
          tools.set(node.name, {
            id: node.id,
            node,
            name: node.name,
            kind: node.kind,
            qty: amount,
            unit: node.unit,
            cost: nodePrice(node) * amount,
          });
        }
        continue;
      }

      if (node.kind === 'time') {
        timeMinutes += node.timeMinutes * mult;
        continue;
      }

      if (node.expanded && node.children.length > 0) {
        walk(node.children, amount);
        continue;
      }

      const cost = nodePrice(node) * amount;
      if (node.kind === 'consumable') consumableCost += cost;
      else materialCost += cost;
      timeMinutes += node.timeMinutes * mult;
      leafCount += 1;
      materials.push({
        id: node.id,
        node,
        name: node.name,
        kind: node.kind,
        qty: amount,
        unit: node.unit,
        cost,
      });
    }
  };

  walk(product.ingredients, 1);

  const toolList = Array.from(tools.values()).sort((a, b) => b.cost - a.cost);
  const toolCost = toolList.reduce((acc, t) => acc + t.cost, 0);
  const totalCost = materialCost + consumableCost + toolCost;
  const retailPrice = product.retailPrice;
  const deltaPct = retailPrice > 0 ? ((totalCost - retailPrice) / retailPrice) * 100 : 0;

  return {
    materialCost,
    toolCost,
    consumableCost,
    totalCost,
    retailPrice,
    deltaPct,
    timeMinutes,
    materials: materials.sort((a, b) => b.cost - a.cost),
    tools: toolList,
    leafCount,
  };
}

export function maxDepth(nodes: Ingredient[], depth = 1): number {
  return nodes.reduce(
    (acc, n) => Math.max(acc, n.children.length ? maxDepth(n.children, depth + 1) : depth),
    depth,
  );
}

export function countNodes(nodes: Ingredient[]): number {
  return nodes.reduce((acc, n) => acc + 1 + countNodes(n.children), 0);
}

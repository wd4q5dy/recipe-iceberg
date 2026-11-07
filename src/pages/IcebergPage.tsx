import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Connectors } from '@/components/iceberg/Connectors';
import { ICEBERG_TIP, LowPolyIceberg } from '@/components/iceberg/LowPolyIceberg';
import { DevPanel } from '@/components/iceberg/DevPanel';
import { MaterialStrip } from '@/components/iceberg/MaterialStrip';
import { Panel } from '@/components/iceberg/Panel';
import { Seabed } from '@/components/iceberg/Seabed';
import { TitanicBoat } from '@/components/iceberg/TitanicBoat';
import { QueryInput } from '@/components/iceberg/SearchBox';
import { WorldCanvas } from '@/components/iceberg/WorldCanvas';
import { useIceberg } from '@/hooks/useIceberg';
import { emojiFor } from '@/lib/emoji';
import { PANEL_H, PANEL_W, layoutTree, seaGradient } from '@/lib/layout';
import { HORIZON, SKY_BOTTOM, SKY_MID, SKY_TOP, oklch, seaColor } from '@/lib/palette';
import { useDualShift } from '@/hooks/useDualShift';
import { loadHistory, mostRecentQuery, recordQuery, type HistoryEntry } from '@/lib/history';
import { nodeShare } from '@/lib/tally';
import type { Ingredient } from '@/types/iceberg';

const SKY_H = 420;
const TREE_TOP = SKY_H - PANEL_H + 6;
const SEABED_H = 560;
const ICEBERG_W = 900;
const BLEED = 4000;
const SKY_GRADIENT = `linear-gradient(180deg, ${SKY_TOP} 0%, ${SKY_MID} 58%, ${SKY_BOTTOM} 100%)`;

export default function IcebergPage() {
  const iceberg = useIceberg();
  const { product, tally, reasoning, status, error } = iceberg;

  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [query, setQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [queryCollapsed, setQueryCollapsed] = useState(false);
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const revealDev = useDualShift();

  useEffect(() => {
    let alive = true;
    void loadHistory().then((entries) => {
      if (!alive) return;
      setHistory(entries);
      const recent = mostRecentQuery(entries);
      if (recent) setQuery((current) => current || recent);
    });
    return () => {
      alive = false;
    };
  }, []);
  const [, setTick] = useState(0);

  const rootNode = useMemo<Ingredient | null>(() => {
    if (!product) return null;
    return {
      id: 'root',
      name: product.name,
      emoji: emojiFor(product.name, 'intermediate'),
      kind: 'intermediate',
      qty: 1,
      unit: 'unit',
      unitCost: product.retailPrice,
      sources: [],
      selectedSource: 0,
      optional: false,
      configId: null,
      enabled: true,
      timeMinutes: product.assemblyMinutes,
      lore: product.lore,
      expandable: true,
      terminal: false,
      expanded: true,
      loading: false,
      loadingStartedAt: 0,
      pending: false,
      children: product.ingredients,
      depth: 0,
      parentName: null,
    };
  }, [product]);

  const layout = useMemo(() => (rootNode ? layoutTree(rootNode, TREE_TOP) : null), [rootNode]);

  const anyLoading = useMemo(() => {
    const walk = (nodes: Ingredient[]): boolean => nodes.some((n) => n.loading || walk(n.children));
    return product ? walk(product.ingredients) : false;
  }, [product]);

  useEffect(() => {
    if (!anyLoading) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 100);
    return () => window.clearInterval(id);
  }, [anyLoading]);

  useEffect(() => {
    document.title = product ? `${product.name} · Iceberg` : 'Iceberg';
  }, [product]);

  const worldW = layout ? Math.max(layout.width + 280, 1200) : 1200;
  const seaBottom = layout ? TREE_TOP + layout.height + 170 : SKY_H + 320;
  const worldH = seaBottom + SEABED_H;
  const originX = layout ? (worldW - layout.width) / 2 : 0;
  const rootX = layout ? originX + layout.root.x : worldW / 2;
  const showTree = Boolean(layout && product && !queryCollapsed);

  const adjustNode = useMemo(() => {
    if (!adjustId) return null;
    if (adjustId === 'root') return rootNode;
    const find = (nodes: Ingredient[]): Ingredient | null => {
      for (const n of nodes) {
        if (n.id === adjustId) return n;
        const found = find(n.children);
        if (found) return found;
      }
      return null;
    };
    return find(product?.ingredients ?? []);
  }, [adjustId, rootNode, product]);

  const submit = (value: string) => {
    setQuery(value);
    setQueryCollapsed(false);
    void recordQuery(value);
    void iceberg.explore(value);
  };

  return (
    <>
      <WorldCanvas width={worldW} height={worldH}>
      <div
        style={{ position: 'absolute', left: -BLEED, top: -BLEED, width: worldW + BLEED * 2, height: SKY_H + BLEED, background: SKY_GRADIENT }}
      />
      <div
        style={{
          position: 'absolute',
          left: -BLEED,
          top: SKY_H,
          width: worldW + BLEED * 2,
          height: seaBottom - SKY_H,
          background: layout ? seaGradient(layout.maxDepth, seaBottom - SKY_H) : seaColor(0),
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -BLEED,
          top: seaBottom,
          width: worldW + BLEED * 2,
          height: SEABED_H + BLEED,
          background: seaColor((layout?.maxDepth ?? 0) + 3),
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -BLEED,
          top: SKY_H,
          width: worldW + BLEED * 2,
          height: 1,
          background: HORIZON,
          boxShadow: `0 0 18px 1px ${oklch({ l: 1, c: 0, h: 0 }, 0.35)}`,
        }}
      />

      <div style={{ position: 'absolute', left: rootX - ICEBERG_W / 2, top: SKY_H - ICEBERG_TIP }}>
        <LowPolyIceberg seed={seed} />
      </div>

      <div style={{ position: 'absolute', left: rootX + 130, top: SKY_H - 74 }}>
        <TitanicBoat />
      </div>

      {showTree && layout && product && (
        <div style={{ position: 'absolute', left: originX, top: 0 }}>
          <Connectors layout={layout} retailPrice={product.retailPrice} hoveredId={hoveredId} topOffset={TREE_TOP} />
        </div>
      )}

      {showTree && layout && product && (
        <AnimatePresence initial={false}>
          {layout.nodes.map((entry) => (
            <motion.div
              key={entry.node.id}
              initial={{
                x: entry.parentX - entry.x,
                y: entry.parentY - entry.y,
                opacity: 0,
                scale: 0.5,
              }}
              animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              exit={{
                x: entry.parentX - entry.x,
                y: entry.parentY - entry.y,
                opacity: 0,
                scale: 0.5,
              }}
              transition={{ type: 'spring', stiffness: 240, damping: 26 }}
              style={{
                position: 'absolute',
                left: originX + entry.x - PANEL_W / 2,
                top: entry.y,
                width: PANEL_W,
                willChange: 'transform',
              }}
            >
              <Panel
                node={entry.node}
                share={nodeShare(entry.node, product.retailPrice)}
                elapsed={entry.node.loading ? (Date.now() - entry.node.loadingStartedAt) / 1000 : 0}
                onExpand={() =>
                  entry.node.depth === 0 ? setQueryCollapsed(true) : iceberg.expandNode(entry.node.id)
                }
                onSelectSource={(i) => iceberg.selectSource(entry.node.id, i)}
                onHover={setHoveredId}
                onAdjust={() => setAdjustId(entry.node.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      <div
        data-interactive
        style={{ position: 'absolute', left: rootX - 220, top: SKY_H - ICEBERG_TIP - 120, width: 440 }}
        className="flex flex-col items-center"
      >
          <QueryInput
            value={query}
            onChange={setQuery}
            onSubmit={submit}
            loading={status === 'loading'}
            onRestore={product ? () => setQueryCollapsed(false) : undefined}
          />
          {reasoning.active && (
            <p className="font-mono-num mt-3 text-[10px] tracking-[0.28em] text-[oklch(0.3_0.05_240/0.6)]">
              {reasoning.elapsed.toFixed(1)}s
            </p>
          )}
          {error && (
            <p className="mt-3 max-w-xs text-center text-[10px] leading-relaxed text-[oklch(0.3_0.05_240/0.65)]">
              {error}
            </p>
          )}
      </div>

      {product && tally && (
        <div style={{ position: 'absolute', left: 0, top: seaBottom, width: worldW, height: SEABED_H }}>
          <Seabed
            tally={tally}
            productName={product.name}
            onSelectSource={iceberg.selectSource}
            onHover={setHoveredId}
          />
        </div>
      )}
      </WorldCanvas>

      {adjustNode && (
        <MaterialStrip
          parent={adjustNode}
          busy={iceberg.adjusting}
          onToggle={(id) => iceberg.toggleNode(id)}
          onAdjust={(text) => void iceberg.adjustChildren(adjustNode.id, text)}
          onClose={() => setAdjustId(null)}
        />
      )}

      {revealDev && <DevPanel history={history} />}

    </>
  );
}

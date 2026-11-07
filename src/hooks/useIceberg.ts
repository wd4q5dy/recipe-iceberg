import { useCallback, useEffect, useRef, useState } from 'react';
import { findSeedProduct } from '@/data/seedProducts';
import { adjustWithAI, decomposeWithAI, genericFallback, hydrateIngredients, hydrateProduct } from '@/lib/decompose';
import { slugify } from '@/lib/saved';
import { computeTally } from '@/lib/tally';
import type { IcebergProduct, Ingredient, Tally } from '@/types/iceberg';

export type ExploreStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ReasoningState {
  active: boolean;
  label: string;
  elapsed: number;
  chars: number;
}

function updateNode(nodes: Ingredient[], id: string, fn: (n: Ingredient) => Ingredient): Ingredient[] {
  return nodes.map((n) => {
    if (n.id === id) return fn(n);
    if (n.children.length) return { ...n, children: updateNode(n.children, id, fn) };
    return n;
  });
}

function findPath(nodes: Ingredient[], id: string, trail: Ingredient[] = []): Ingredient[] | null {
  for (const n of nodes) {
    const next = [...trail, n];
    if (n.id === id) return next;
    if (n.children.length) {
      const found = findPath(n.children, id, next);
      if (found) return found;
    }
  }
  return null;
}

function findNode(nodes: Ingredient[], id: string): Ingredient | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

function collapseAll(nodes: Ingredient[]): Ingredient[] {
  return nodes.map((n) => ({ ...n, expanded: false, children: collapseAll(n.children) }));
}

export function useIceberg() {
  const [product, setProduct] = useState<IcebergProduct | null>(null);
  const [status, setStatus] = useState<ExploreStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState<ReasoningState>({ active: false, label: '', elapsed: 0, chars: 0 });
  const [adjusting, setAdjusting] = useState(false);

  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const stopReasoning = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setReasoning((r) => ({ ...r, active: false }));
  }, []);

  const startReasoning = useCallback((label: string) => {
    startRef.current = Date.now();
    setReasoning({ active: true, label, elapsed: 0, chars: 0 });
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setReasoning((r) => ({ ...r, elapsed: (Date.now() - startRef.current) / 1000 }));
    }, 100);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const explore = useCallback(
    async (raw: string) => {
      const query = raw.trim();
      if (!query) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      const seed = findSeedProduct(query);

      if (seed) {
        setStatus('loading');
        startReasoning(seed.name);
        await new Promise((r) => window.setTimeout(r, 380));
        setProduct(hydrateProduct(seed, 'seed'));
        setStatus('ready');
        stopReasoning();
        return;
      }

      setStatus('loading');
      startReasoning(query);
      try {
        const result = await decomposeWithAI({
          product: query,
          depth: 0,
          onProgress: (chars) => setReasoning((r) => ({ ...r, chars })),
          signal: controller.signal,
        });
        setProduct(hydrateProduct({ id: slugify(query), ...result }, 'ai'));
        setStatus('ready');
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Decomposition failed';
        setProduct(hydrateProduct({ id: slugify(query), ...genericFallback(query) }, 'ai'));
        setStatus('ready');
        setError(message);
      } finally {
        stopReasoning();
      }
    },
    [startReasoning, stopReasoning],
  );

  const expandNode = useCallback(
    async (id: string) => {
      const current = product;
      if (!current) return;
      const path = findPath(current.ingredients, id);
      if (!path) return;
      const node = path[path.length - 1];

      if (node.children.length > 0) {
        setProduct((p) =>
          p ? { ...p, ingredients: updateNode(p.ingredients, id, (n) => ({ ...n, expanded: !n.expanded })) } : p,
        );
        return;
      }

      setProduct((p) =>
        p ? { ...p, ingredients: updateNode(p.ingredients, id, (n) => ({ ...n, loading: true, loadingStartedAt: Date.now() })) } : p,
      );
      startReasoning(node.name);

      try {
        const result = await decomposeWithAI({
          product: current.name,
          parentName: node.name,
          parentKind: node.kind,
          depth: node.depth,
          path: path.map((p) => p.name),
        });
        const children = hydrateIngredients(result.ingredients, node.depth + 1, node.name, node.id);
        setProduct((p) =>
          p
            ? {
                ...p,
                ingredients: updateNode(p.ingredients, id, (n) => ({
                  ...n,
                  children,
                  expanded: true,
                  loading: false,
                  loadingStartedAt: 0,
                  terminal: children.length === 0,
                })),
              }
            : p,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not decompose this part');
        setProduct((p) =>
          p ? { ...p, ingredients: updateNode(p.ingredients, id, (n) => ({ ...n, loading: false, loadingStartedAt: 0 })) } : p,
        );
      } finally {
        stopReasoning();
      }
    },
    [product, startReasoning, stopReasoning],
  );

  const adjustChildren = useCallback(
    async (id: string, instruction: string) => {
      const current = product;
      if (!current) return;
      const parent =
        id === 'root'
          ? { name: current.name, kind: 'intermediate' as const, depth: 0, children: current.ingredients }
          : findNode(current.ingredients, id);
      if (!parent) return;

      setAdjusting(true);
      setError(null);
      try {
        const result = await adjustWithAI({
          parent: { name: parent.name, kind: parent.kind },
          children: parent.children.map((c) => ({
            name: c.name,
            kind: c.kind,
            qty: c.qty,
            unit: c.unit,
            enabled: c.enabled,
          })),
          instruction,
        });
        const hydrated = hydrateIngredients(result.children, parent.depth + 1, parent.name, id);
        if (id === 'root') {
          setProduct((p) => (p ? { ...p, ingredients: hydrated } : p));
        } else {
          setProduct((p) =>
            p
              ? {
                  ...p,
                  ingredients: updateNode(p.ingredients, id, (n) => ({
                    ...n,
                    children: hydrated,
                    expanded: true,
                    terminal: hydrated.length === 0,
                  })),
                }
              : p,
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not adjust materials');
      } finally {
        setAdjusting(false);
      }
    },
    [product],
  );

  const collapseEverything = useCallback(() => {
    setProduct((p) => (p ? { ...p, ingredients: collapseAll(p.ingredients) } : p));
  }, []);

  const toggleNode = useCallback((id: string) => {
    setProduct((p) =>
      p ? { ...p, ingredients: updateNode(p.ingredients, id, (n) => ({ ...n, enabled: !n.enabled })) } : p,
    );
  }, []);

  const selectSource = useCallback((id: string, index: number) => {
    setProduct((p) =>
      p ? { ...p, ingredients: updateNode(p.ingredients, id, (n) => ({ ...n, selectedSource: index })) } : p,
    );
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    stopReasoning();
    setProduct(null);
    setStatus('idle');
    setError(null);
  }, [stopReasoning]);

  const tally: Tally | null = product ? computeTally(product) : null;

  return {
    product,
    status,
    error,
    reasoning,
    adjusting,
    tally,
    explore,
    expandNode,
    adjustChildren,
    collapseEverything,
    toggleNode,
    selectSource,
    reset,
    setProduct,
    clearError: () => setError(null),
  };
}

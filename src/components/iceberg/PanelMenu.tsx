import { useState } from 'react';
import { ChevronDown, ExternalLink, SlidersHorizontal, Star } from 'lucide-react';
import { vendorShort, vendorUrl } from '@/data/vendors';
import { duration, money, moneyExact, qty } from '@/lib/format';
import { nodeCost, nodePrice } from '@/lib/tally';
import { cn } from '@/lib/utils';
import type { Ingredient } from '@/types/iceberg';

interface PanelMenuProps {
  node: Ingredient;
  onSelectSource: (index: number) => void;
  onExpand?: () => void;
  onAdjust?: () => void;
}

export function PanelMenu({ node, onSelectSource, onExpand, onAdjust }: PanelMenuProps) {
  const [showAlt, setShowAlt] = useState(true);
  const cost = nodeCost(node);
  const unit = nodePrice(node);
  const selected = node.sources[node.selectedSource] ?? node.sources[0];

  return (
    <div className="w-full text-left text-[12px] leading-relaxed text-white/70">
      <div className="px-3.5 pt-3">
        <p className="text-[12px] text-white/45">{node.kind}</p>
        <h3 className="mt-0.5 text-[12px] font-semibold text-white">{node.name}</h3>
      </div>

      <div className="mt-2 px-3.5">
        <p>
          Cost:{' '}
          <span className="font-mono-num font-semibold text-white">
            {node.kind === 'time' ? duration(node.timeMinutes) : moneyExact(cost)}
          </span>
        </p>
        {node.kind !== 'time' && (
          <p className="mt-0.5">
            <span className="font-mono-num text-white/90">
              {qty(node.qty)} {node.unit}
            </span>{' '}
            × <span className="font-mono-num text-white/90">{money(unit)}</span> each
          </p>
        )}
      </div>

      <div className="mt-2 px-3.5">
        {node.sources.length === 0 ? (
          <p className="border border-dashed border-white/15 px-2.5 py-1.5 text-[12px] text-white/40">
            {node.kind === 'intermediate'
              ? 'Intermediate — not sold directly'
              : node.kind === 'time'
                ? 'Time — not for sale'
                : 'No alternatives found'}
          </p>
        ) : (
          <>
            {selected && (
              <a
                href={vendorUrl(selected.vendor, selected.searchQuery)}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => onSelectSource(node.selectedSource)}
                className="flex items-center justify-between gap-2 border border-white/45 bg-white/10 px-2.5 py-2 text-[12px] text-white transition-colors hover:border-white/80 hover:bg-white/20"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">Buy at {selected.vendor}</span>
                </span>
                <span className="font-mono-num shrink-0 font-semibold">{money(selected.price)}</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setShowAlt((v) => !v)}
              className="mt-1 flex w-full items-center justify-between gap-2 border border-white/20 px-2.5 py-1.5 text-[12px] text-white/80 transition-colors hover:border-white/50 hover:text-white"
            >
              <span>Choose alternative</span>
              <ChevronDown className={cn('h-3 w-3 transition-transform', showAlt && 'rotate-180')} />
            </button>

            {showAlt && (
              <div className="mt-1 space-y-1">
                {node.sources.map((source, index) => (
                  <a
                    key={`${source.vendor}-${index}`}
                    href={vendorUrl(source.vendor, source.searchQuery)}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={() => onSelectSource(index)}
                    className={cn(
                      'flex items-center gap-2 border px-2 py-1.5 text-[12px] transition-colors',
                      index === node.selectedSource
                        ? 'border-white/60 bg-white/10'
                        : 'border-white/10 hover:border-white/40 hover:bg-white/5',
                    )}
                  >
                    <span className="w-9 shrink-0 text-white/55">{vendorShort(source.vendor)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-white/85">{source.title}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-white/55">
                        <Star className="h-2.5 w-2.5 shrink-0 fill-white/60 text-white/60" />
                        <span className="font-mono-num">{source.rating.toFixed(1)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{source.shipping}</span>
                      </span>
                    </span>
                    <span className="font-mono-num shrink-0 font-semibold text-white">{money(source.price)}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-white/40" />
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {node.lore && (
        <p className="mt-2 border-t border-white/10 px-3.5 pb-3 pt-2 text-[12px] text-white/60">{node.lore}</p>
      )}

      {onAdjust && node.children.length > 0 && (
        <button
          type="button"
          onClick={onAdjust}
          className="flex w-full items-center gap-1.5 border-t border-white/10 px-3.5 py-2 text-[12px] text-white/70 hover:bg-white/5 hover:text-white"
        >
          <SlidersHorizontal className="h-3 w-3" />
          Adjust materials
        </button>
      )}

      {onExpand && node.expandable && (
        <button
          type="button"
          onClick={onExpand}
          className="w-full border-t border-white/10 px-3.5 py-2 text-left text-[12px] text-white/70 hover:bg-white/5 hover:text-white"
        >
          {node.expanded ? 'Collapse' : 'Break down further'}
        </button>
      )}
    </div>
  );
}

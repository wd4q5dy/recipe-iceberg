import { duration, moneyExact } from '@/lib/format';
import type { Tally, TallyItem } from '@/types/iceberg';
import { Panel } from './Panel';

interface SeabedProps {
  tally: Tally;
  productName: string;
  onSelectSource: (id: string, index: number) => void;
  onHover: (id: string | null) => void;
}

export function Seabed({ tally, productName, onSelectSource, onHover }: SeabedProps) {
  return (
    <div className="px-8 pt-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="border-b border-white/20 pb-4 text-[12px] leading-relaxed text-white/70">
          <p>
            <span className="font-semibold text-white">1 {productName}</span> per{' '}
            <span className="font-mono-num font-semibold text-white">{moneyExact(tally.materialCost)}</span> of
            materials · <span className="font-mono-num text-white/90">{tally.materials.length}</span> materials ·{' '}
            <span className="font-mono-num text-white/90">{tally.tools.length}</span> tools ·{' '}
            <span className="font-mono-num text-white/90">{duration(tally.timeMinutes)}</span>
          </p>
          <p className="mt-1">
            Materials <span className="font-mono-num text-white/90">{moneyExact(tally.materialCost)}</span> · consumables{' '}
            <span className="font-mono-num text-white/90">{moneyExact(tally.consumableCost)}</span> · tools{' '}
            <span className="font-mono-num text-white/90">{moneyExact(tally.toolCost)}</span>
          </p>
          <p className="mt-1">
            Total{' '}
            <span className="font-mono-num font-semibold text-white">{moneyExact(tally.totalCost)}</span> · retail{' '}
            <span className="font-mono-num text-white/90">{moneyExact(tally.retailPrice)}</span> ·{' '}
            <span className="font-mono-num text-white/90">
              {tally.deltaPct > 0 ? '+' : ''}
              {tally.deltaPct.toFixed(0)}%
            </span>{' '}
            vs retail
          </p>
        </div>

        <Row
          label="Materials"
          items={tally.materials}
          retailPrice={tally.retailPrice}
          onSelectSource={onSelectSource}
          onHover={onHover}
        />
        <Row
          label="Tools"
          items={tally.tools}
          retailPrice={tally.retailPrice}
          onSelectSource={onSelectSource}
          onHover={onHover}
        />
      </div>
    </div>
  );
}

function Row({
  label,
  items,
  retailPrice,
  onSelectSource,
  onHover,
}: {
  label: string;
  items: TallyItem[];
  retailPrice: number;
  onSelectSource: (id: string, index: number) => void;
  onHover: (id: string | null) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-5">
      <p className="mb-2 text-[12px] text-white/50">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Panel
            key={item.id}
            node={item.node}
            share={retailPrice > 0 ? item.cost / retailPrice : 0}
            elapsed={0}
            size="small"
            menuSide="top"
            onExpand={() => {}}
            onSelectSource={(i) => onSelectSource(item.node.id, i)}
            onHover={onHover}
          />
        ))}
      </div>
    </div>
  );
}

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { Panel } from '@/components/iceberg/Panel';
import { Seabed } from '@/components/iceberg/Seabed';
import type { Ingredient, Tally } from '@/types/iceberg';

describe('HoverCard and Seabed stacking reproduction', () => {
  it('renders HoverCardContent above seabed summary text when open', async () => {
    const mockNode: Ingredient = {
      id: 'test-node',
      name: 'Test Ingredient',
      emoji: '🧊',
      kind: 'intermediate',
      qty: 1,
      unit: 'unit',
      unitCost: 10,
      sources: [
        {
          vendor: 'Amazon',
          title: 'Vendor A Product',
          price: 10,
          rating: 4.5,
          reviews: 100,
          qualityTier: 'mid',
          shipping: 'Prime',
          searchQuery: 'Test Ingredient',
        },
      ],
      selectedSource: 0,
      optional: false,
      configId: null,
      enabled: true,
      timeMinutes: 5,
      lore: 'Test lore',
      expandable: false,
      terminal: false,
      expanded: false,
      loading: false,
      loadingStartedAt: 0,
      pending: false,
      children: [],
      depth: 1,
      parentName: null,
    };

    const mockTally: Tally = {
      materialCost: 50,
      consumableCost: 10,
      toolCost: 20,
      totalCost: 80,
      retailPrice: 100,
      deltaPct: -20,
      timeMinutes: 30,
      materials: [
        {
          id: 'mat-1',
          name: 'Material 1',
          cost: 50,
          unitCost: 50,
          qty: 1,
          unit: 'unit',
          node: { ...mockNode, id: 'mat-node-1', name: 'Material 1' },
        },
      ],
      tools: [],
    };

    // Render world container matching WorldCanvas / IcebergPage structure
    render(
      <div style={{ position: 'relative', width: 1000, height: 800 }}>
        {/* Panel positioned inside motion.div matching IcebergPage */}
        <div
          style={{
            position: 'absolute',
            left: 100,
            top: 100,
            width: 124,
            transform: 'none',
            willChange: 'transform',
          }}
        >
          <Panel
            node={mockNode}
            share={0.5}
            elapsed={0}
            onExpand={() => {}}
            onSelectSource={() => {}}
            onHover={() => {}}
            menuSide="bottom"
          />
        </div>

        {/* Seabed summary positioned right overlapping where the tooltip drops */}
        <div style={{ position: 'absolute', left: 0, top: 180, width: 1000, height: 400 }}>
          <Seabed
            tally={mockTally}
            productName="Test Product"
            onSelectSource={() => {}}
            onHover={() => {}}
          />
        </div>
      </div>
    );

    // Hover the panel to trigger the HoverCard
    const panelBtn = page.getByRole('button', { name: 'Test Ingredient' });
    await expect.element(panelBtn).toBeVisible();
    await panelBtn.hover();

    // Find the HoverCard content
    const tooltipText = page.getByText('Buy at Amazon');
    await expect.element(tooltipText).toBeVisible();

    const tooltipEl = tooltipText.element().closest('[data-radix-popper-content-wrapper]') || tooltipText.element();
    const rect = tooltipEl.getBoundingClientRect();

    // Check hit testing at the center of the tooltip
    const hitEl = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    expect(tooltipEl.contains(hitEl) || tooltipEl === hitEl).toBe(true);
  });
});

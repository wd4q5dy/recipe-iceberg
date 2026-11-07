import { useMemo } from 'react';

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 900;
const H = 900;
export const ICEBERG_TIP = 180;

export function LowPolyIceberg({ seed }: { seed: number }) {
  const { triangles, silhouette } = useMemo(() => {
    const rand = mulberry32(seed);
    const cx = W / 2;

    const rightSide: [number, number][] = [
      [cx, 0],
      [cx + 40 + rand() * 26, 58 + rand() * 24],
      [cx + 92 + rand() * 34, 148 + rand() * 26],
      [cx + 186 + rand() * 54, 246 + rand() * 38],
      [cx + 296 + rand() * 62, 372 + rand() * 46],
      [cx + 356 + rand() * 54, 528 + rand() * 54],
      [cx + 326 + rand() * 62, 690 + rand() * 54],
      [cx + 208 + rand() * 54, 822 + rand() * 38],
      [cx + 54, 878],
    ];
    const leftSide = rightSide
      .slice(1, -1)
      .reverse()
      .map(([x, y]) => [W - x, y] as [number, number]);
    const outline = [...rightSide, ...leftSide];

    const cols = 7;
    const rows = 8;
    const grid: { x: number; y: number }[][] = [];
    for (let r = 0; r <= rows; r += 1) {
      const row: { x: number; y: number }[] = [];
      for (let c = 0; c <= cols; c += 1) {
        row.push({
          x: (c / cols) * W + (rand() - 0.5) * (W / cols) * 0.9,
          y: (r / rows) * H + (rand() - 0.5) * (H / rows) * 0.9,
        });
      }
      grid.push(row);
    }

    const tris: { points: string; fill: string }[] = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const a = grid[r][c];
        const b = grid[r][c + 1];
        const d = grid[r + 1][c];
        const e = grid[r + 1][c + 1];
        for (const tri of [
          [a, b, e],
          [a, e, d],
        ]) {
          const cy = (tri[0].y + tri[1].y + tri[2].y) / 3;
          const above = cy < ICEBERG_TIP;
          const depth = cy / H;
          const l = above ? 0.995 - depth * 0.02 : 0.955 - depth * 0.07;
          const alpha = above ? 0.26 + rand() * 0.3 : 0.06 + rand() * 0.19;
          tris.push({
            points: tri.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
            fill: `oklch(${l.toFixed(3)} ${above ? 0.022 : 0.01} ${above ? 200 : 222} / ${alpha.toFixed(3)})`,
          });
        }
      }
    }

    return {
      triangles: tris,
      silhouette: `M ${outline.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L ')} Z`,
    };
  }, [seed]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="pointer-events-none absolute"
      aria-hidden="true"
    >
      <defs>
        <clipPath id="iceberg-clip">
          <path d={silhouette} />
        </clipPath>
      </defs>
      <g clipPath="url(#iceberg-clip)">
        {triangles.map((t, i) => (
          <polygon key={i} points={t.points} fill={t.fill} stroke="oklch(1 0 0 / 0.14)" strokeWidth="0.9" />
        ))}
      </g>
      <path d={silhouette} fill="none" stroke="oklch(1 0 0 / 0.45)" strokeWidth="1.4" />
    </svg>
  );
}

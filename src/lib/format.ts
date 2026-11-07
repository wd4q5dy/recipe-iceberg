const SCALES: [number, string][] = [
  [1e15, 'Q'],
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'k'],
];

function scaled(n: number, value: number): string {
  const v = n / value;
  const abs = Math.abs(v);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  const text = v.toFixed(digits);
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

export function money(n: number): string {
  if (!Number.isFinite(n)) return '$0.00';
  const abs = Math.abs(n);
  for (const [value, suffix] of SCALES) {
    if (abs >= value) return `$${scaled(n, value)}${suffix}`;
  }
  if (abs < 0.01 && abs > 0) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export function moneyExact(n: number): string {
  if (!Number.isFinite(n)) return '$0.00';
  const abs = Math.abs(n);
  for (const [value, suffix] of SCALES) {
    if (abs >= value) return `$${scaled(n, value)}${suffix}`;
  }
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function duration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m ? `${h} h ${m} m` : `${h} h`;
  }
  const days = minutes / 1440;
  if (days < 365) return `${Math.round(days)} d`;
  const years = days / 365;
  if (years < 1000) return `${years < 10 ? years.toFixed(1).replace(/\.0$/, '') : Math.round(years)} y`;
  const ky = years / 1000;
  if (ky < 1000) return `${ky < 10 ? ky.toFixed(1).replace(/\.0$/, '') : Math.round(ky)} ky`;
  const my = ky / 1000;
  if (my < 1000) return `${my < 10 ? my.toFixed(1).replace(/\.0$/, '') : Math.round(my)} My`;
  return `${Math.round(my / 1000)} Gy`;
}

export function qty(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n === 0) return '0';
  if (n < 0.001) {
    let digits = 3;
    while (digits < 12 && Number(n.toFixed(digits)) === 0) digits += 1;
    return n.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
  }
  if (n < 1) return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  if (n < 100) return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return Math.round(n).toLocaleString('en-US');
}

export function pct(n: number): string {
  if (!Number.isFinite(n)) return '0%';
  return `${n > 0 ? '+' : ''}${n.toFixed(0)}%`;
}

/** Pure digits — panels never render letters. */
export function timeCount(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0';
  if (minutes < 60) return String(Math.round(minutes));
  const h = minutes / 60;
  if (h < 8760) return h < 10 ? h.toFixed(1).replace(/\.0$/, '') : String(Math.round(h));
  const y = h / 8760;
  return y < 10 ? y.toFixed(1).replace(/\.0$/, '') : String(Math.round(y));
}

export function durationShort(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m ? `${h}h${m}` : `${h}h`;
  }
  return `${Math.round(minutes / 1440)}d`;
}

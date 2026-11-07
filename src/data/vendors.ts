export interface VendorDef {
  name: string;
  short: string;
  build: (q: string) => string;
  tone: 'marketplace' | 'maker' | 'industrial' | 'local';
}

const enc = (q: string) => encodeURIComponent(q.trim());

export const VENDORS: VendorDef[] = [
  {
    name: 'Amazon',
    short: 'AMZ',
    build: (q) => `https://www.amazon.com/s?k=${enc(q)}`,
    tone: 'marketplace',
  },
  {
    name: 'eBay',
    short: 'EBAY',
    build: (q) => `https://www.ebay.com/sch/i.html?_nkw=${enc(q)}`,
    tone: 'marketplace',
  },
  {
    name: 'AliExpress',
    short: 'ALI',
    build: (q) => `https://www.aliexpress.com/wholesale?SearchText=${enc(q)}`,
    tone: 'marketplace',
  },
  {
    name: 'Alibaba',
    short: 'ALIB',
    build: (q) => `https://www.alibaba.com/trade/search?SearchText=${enc(q)}`,
    tone: 'industrial',
  },
  {
    name: 'Etsy',
    short: 'ETSY',
    build: (q) => `https://www.etsy.com/search?q=${enc(q)}`,
    tone: 'maker',
  },
  {
    name: 'McMaster-Carr',
    short: 'MCM',
    build: (q) => `https://www.mcmaster.com/search/?q=${enc(q)}`,
    tone: 'industrial',
  },
  {
    name: 'Digi-Key',
    short: 'DK',
    build: (q) => `https://www.digikey.com/en/products/result?keywords=${enc(q)}`,
    tone: 'industrial',
  },
  {
    name: 'Home Depot',
    short: 'HD',
    build: (q) => `https://www.homedepot.com/s/${enc(q)}`,
    tone: 'industrial',
  },
  {
    name: 'Local supplier',
    short: 'LOCAL',
    build: (q) => `https://www.google.com/search?q=${enc(`${q} supplier near me`)}`,
    tone: 'local',
  },
];

export function vendorUrl(vendor: string, query: string): string {
  const def = VENDORS.find((v) => v.name.toLowerCase() === vendor.toLowerCase());
  if (def) return def.build(query);
  return `https://www.google.com/search?q=${enc(`${query} ${vendor}`)}`;
}

export function vendorShort(vendor: string): string {
  return VENDORS.find((v) => v.name.toLowerCase() === vendor.toLowerCase())?.short ?? vendor.slice(0, 4).toUpperCase();
}

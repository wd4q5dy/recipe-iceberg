import selfSource from './sourceBundle.ts?raw';
import type { HistoryEntry } from '@/lib/history';
import { makeZip, type ZipFile } from '@/lib/zip';

const SOURCE = import.meta.glob('/src/**/*.{ts,tsx,css,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const EDGE = import.meta.glob('/supabase/functions/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const ROOT = import.meta.glob(
  '/{package.json,vite.config.ts,tailwind.config.js,index.html,tsconfig.json,tsconfig.app.json,tsconfig.node.json,components.json,postcss.config.js}',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const PUBLIC = import.meta.glob('/public/**/*', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const README = `# Iceberg

## Requirements
Node.js 18 or newer, plus npm.

## Run
1. npm install
2. npm run dev
3. Open the localhost URL it prints

The included .env holds the public Supabase URL and anon key this build used.
Swap them if you point the app at a different project.

## Build
npm run build
npm run preview

## AI
Decompositions run through the Supabase Edge Functions in supabase/functions/.
Deploy them with the Supabase CLI, then either set INTEGRATIONS_API_KEY or
configure an external provider from the in-app developer panel
(hold both Shift keys to reveal it).

## History
history.json holds your past queries, most recent first.
`;

/** The sandbox package.json only carries lint stubs, so ship a runnable one. */
function buildPackageJson(): string {
  const raw = ROOT['/package.json'];
  const pkg = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  pkg.scripts = { dev: 'vite', build: 'vite build', preview: 'vite preview' };
  delete pkg.packageManager;
  return JSON.stringify(pkg, null, 2);
}

function buildEnv(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return [
    `VITE_SUPABASE_URL=${env.VITE_SUPABASE_URL ?? ''}`,
    `VITE_SUPABASE_ANON_KEY=${env.VITE_SUPABASE_ANON_KEY ?? ''}`,
    `VITE_APP_ID=${env.VITE_APP_ID ?? ''}`,
    '',
  ].join('\n');
}

const PUBLIC_FALLBACK = ['favicon.png', 'images/error/404.svg', 'images/error/404-dark.svg'];

async function collectPublic(): Promise<ZipFile[]> {
  const entries: [string, string][] = Object.entries(PUBLIC).map(([path, url]) => [
    path.replace(/^\/public\//, ''),
    url,
  ]);
  if (entries.length === 0) {
    for (const path of PUBLIC_FALLBACK) entries.push([path, `/${path}`]);
  }

  const files: ZipFile[] = [];
  for (const [path, url] of entries) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buffer = await res.arrayBuffer();
      files.push({ path, data: new Uint8Array(buffer) });
    } catch {
      // asset unavailable — skip it
    }
  }
  return files;
}

export async function buildSourceZip(history: HistoryEntry[]): Promise<Blob> {
  const encoder = new TextEncoder();
  const files: ZipFile[] = [];

  const add = (path: string, content: string) => {
    const clean = path.replace(/^\//, '');
    if (files.some((file) => file.path === clean)) return;
    files.push({ path: clean, data: encoder.encode(content) });
  };

  for (const [path, content] of Object.entries(SOURCE)) add(path, content);
  add('src/lib/sourceBundle.ts', selfSource);
  for (const [path, content] of Object.entries(EDGE)) add(path, content);
  for (const [path, content] of Object.entries(ROOT)) {
    if (path === '/package.json') continue;
    add(path, content);
  }

  add('package.json', buildPackageJson());
  add('.env', buildEnv());
  add('.env.example', 'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n');
  add('history.json', JSON.stringify(history, null, 2));
  add('README.md', README);

  files.push(...(await collectPublic()));

  return makeZip(files);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

const dataDir = path.resolve(__dirname, '../../../data');
const runsDir = path.resolve(__dirname, '../../../runs');
const mapRoot = path.resolve(__dirname, '.');
const mapPublicFontDir = path.resolve(mapRoot, 'public', 'font');
const mapBuildFontDir = path.resolve(__dirname, '../../../dist/tactical-map/font');
const browserChildProcessShim = path.resolve(mapRoot, 'shims', 'browserChildProcessShim.ts');

function tacticalMapManualChunks(id: string): string | undefined {
  const normalized = id.replace(/\\/g, '/');
  const eventCatalogMatch = normalized.match(/\/data\/scenarios\/events\/([^/]+)\.json$/);
  if (eventCatalogMatch) return `event-catalog-${eventCatalogMatch[1].replace(/[^a-z0-9_-]/gi, '-')}`;
  if (normalized.endsWith('/data/scenarios/essays/essay_index.json')) return 'codex-essay-index';
  if (normalized.endsWith('/data/source/oob_brigades.json')) return 'oob-brigades';
  if (normalized.endsWith('/data/source/oob_brigade_designations.json')) return 'oob-brigade-designations';
  if (normalized.endsWith('/data/derived/operational/osid_areas.json')) return 'operational-osid-areas';

  if (normalized.includes('/node_modules/')) {
    if (normalized.includes('/react/') || normalized.includes('/react-dom/') || normalized.includes('/scheduler/')) {
      return 'vendor-react';
    }
    if (normalized.includes('/maplibre-gl/')) return 'vendor-maplibre';
    if (normalized.includes('/@deck.gl/') || normalized.includes('/deck.gl/')) return 'vendor-deck';
    if (normalized.includes('/@luma.gl/')) return 'vendor-luma';
    if (normalized.includes('/@loaders.gl/')) return 'vendor-loaders';
    if (normalized.includes('/@turf/')) return 'vendor-turf';
    if (normalized.includes('/zustand/')) return 'vendor-state';
    return 'vendor-misc';
  }

  if (normalized.includes('/src/sim/')) return 'map-sim';
  if (
    normalized.includes('/src/ui/map/components/warroom/') ||
    normalized.includes('/src/ui/map/components/army_hq/') ||
    normalized.includes('/src/ui/map/components/chronicle/')
  ) {
    return 'feature-command-ui';
  }
  if (normalized.includes('/src/ui/map/components/ops_modal/')) return 'feature-ops-planning';
  if (normalized.includes('/src/ui/map/components/presidential_desk/')) return 'feature-presidential-desk';
  if (normalized.includes('/src/ui/map/components/onboarding/')) return 'feature-onboarding';
  if (normalized.includes('/src/ui/map/components/plan_ui/')) return 'feature-plan-ui';
  if (normalized.includes('/src/ui/map/components/verdict/')) return 'feature-verdict';
  if (normalized.includes('/src/ui/map/map/')) return 'map-rendering';
  return undefined;
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-data',
      configureServer(server) {
        server.middlewares.use('/data', (req, res, next) => {
          const url = req.url ?? '/';
          const pathname = url.split('?')[0];
          // Serve runs/<runId>/final_save.json from /data/runs/<runId>/final_save.json (for "Load run" debugging).
          const runsPrefix = '/runs/';
          if (pathname.startsWith(runsPrefix)) {
            const subPath = pathname.slice(runsPrefix.length);
            if (!subPath || subPath.includes('..')) {
              next();
              return;
            }
            const filePath = path.join(runsDir, subPath);
            if (!filePath.startsWith(runsDir) || !filePath.endsWith('.json')) {
              next();
              return;
            }
            fs.stat(filePath, (err, stat) => {
              if (err || !stat?.isFile()) {
                next();
                return;
              }
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Length': stat.size,
                'Access-Control-Allow-Origin': '*',
              });
              fs.createReadStream(filePath).pipe(res);
            });
            return;
          }
          const filePath = path.join(dataDir, pathname.replace(/^\//, ''));
          if (!filePath.startsWith(dataDir)) {
            next();
            return;
          }
          fs.stat(filePath, (err, stat) => {
            if (err || !stat.isFile()) {
              next();
              return;
            }
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes: Record<string, string> = {
              '.pmtiles': 'application/octet-stream',
              '.geojson': 'application/geo+json',
              '.json': 'application/json',
              '.pbf': 'application/x-protobuf',
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            const rangeHeader = req.headers.range;

            if (ext === '.pmtiles') {
              console.log(`[dev-data] PMTiles ${rangeHeader ? `Range: ${rangeHeader}` : 'full'} → ${filePath.split('\\').pop()}`);
            }

            if (rangeHeader) {
              const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
              if (match) {
                const start = parseInt(match[1], 10);
                const requestedEnd = match[2] ? parseInt(match[2], 10) : stat.size - 1;
                if (start >= stat.size) {
                  res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
                  res.end();
                  return;
                }
                const end = Math.min(requestedEnd, stat.size - 1);
                const chunkSize = end - start + 1;
                res.writeHead(206, {
                  'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                  'Accept-Ranges': 'bytes',
                  'Content-Length': chunkSize,
                  'Content-Type': contentType,
                  'Cache-Control': 'no-store',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
                });
                fs.createReadStream(filePath, { start, end }).pipe(res);
              } else {
                res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
                res.end();
              }
            } else {
              res.writeHead(200, {
                'Content-Length': stat.size,
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-store',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
              });
              fs.createReadStream(filePath).pipe(res);
            }
          });
        });
      },
    },
    {
      name: 'copy-map-public-fonts',
      closeBundle() {
        fs.rmSync(mapBuildFontDir, { recursive: true, force: true });
        fs.mkdirSync(path.dirname(mapBuildFontDir), { recursive: true });
        fs.cpSync(mapPublicFontDir, mapBuildFontDir, { recursive: true });
      },
    },
  ],
  root: mapRoot,
  define: {
    // Injected at build time so the tactical shell can confirm which bundle is loaded.
    __MAP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    port: 3002,
    fs: {
      allow: ['..', '../..', '../../..'],
    },
  },
  publicDir: false,
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../../../dist/tactical-map'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        tactical_map: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: tacticalMapManualChunks,
      },
    },
    copyPublicDir: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'child_process': browserChildProcessShim,
      'node:child_process': browserChildProcessShim,
    },
  },
});

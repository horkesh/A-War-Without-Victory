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

  // App source is deliberately NOT manually chunked.
  //
  // The tactical map's own modules form a strongly-connected component: army_hq,
  // map-rendering, map-geometry and the warroom UI all import one another. Manual
  // chunks that cut through an SCC produce a CYCLIC chunk graph, and ES module
  // initialisation order then throws a temporal-dead-zone ReferenceError at runtime.
  // That is exactly what shipped: splitting src/ui/map/components/army_hq/ across
  // four chunks by filename gave 26 chunk cycles and a production bundle that died
  // with "Cannot access 'ir' before initialization" before React could mount, so the
  // packaged desktop app fell back to its legacy recovery menu. The dev server never
  // saw it because dev does not chunk-split.
  //
  // Rollup's automatic chunking keeps modules that are cyclic in the same chunk, so
  // leaving app source alone is what keeps the chunk graph acyclic. Only leaves are
  // safe to name manually: third-party packages and the large static JSON payloads
  // handled above, none of which can import back into app source.
  //
  // If you add a manual chunk here for anything under /src/, re-run
  // `node tools/ui/check_chunk_cycles.cjs` after a build and expect it to fail.
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
    // Raised from 1200 when source-level manualChunks were removed. Splitting app
    // source produced a cyclic chunk graph and a bundle that did not boot at all, so
    // the entry chunk is now large (~2.7 MB) by design. The desktop app loads it from
    // localhost, where that costs little. This is an accepted trade, not a silenced
    // warning: a bundle that runs beats a smaller one that throws before React mounts.
    chunkSizeWarningLimit: 3000,
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

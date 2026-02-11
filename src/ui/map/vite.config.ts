import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync, existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRootFromConfig = resolve(__dirname, '../../..');
const projectRootFromCwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : projectRootFromConfig;

/**
 * Serve /data/ and /assets/ from project root so the tactical map can load
 * GeoJSON, control data, and other derived data files.
 */
function serveTacticalMapData(): Plugin {
    return {
        name: 'serve-tactical-map-data',
        configureServer(server) {
            const handler = (req: { url?: string; method?: string }, res: any, next: () => void) => {
                const raw = req.url ?? '';
                const [pathname, query = ''] = raw.split('?');
                if (req.method !== 'GET' && req.method !== 'HEAD') return next();
                // Skip Vite module requests
                const isModuleRequest = query && /(?:^|&)(?:url|import)(?=&|$|=)/.test('&' + query);
                if (isModuleRequest) return next();
                if (!pathname.startsWith('/assets/') && !pathname.startsWith('/data/')) return next();
                // Skip source files — let Vite handle .ts/.js/.tsx/.jsx as modules
                if (/\.(ts|js|tsx|jsx|mjs|cjs|vue|svelte)$/.test(pathname)) return next();

                const relativePath = pathname.replace(/^\//, '');
                // Try project root from cwd first, then from config dir
                const candidateCwd = resolve(projectRootFromCwd, relativePath);
                const candidateConfig = resolve(projectRootFromConfig, relativePath);
                const filePath = existsSync(candidateCwd)
                    ? candidateCwd
                    : existsSync(candidateConfig)
                        ? candidateConfig
                        : null;

                if (!filePath) {
                    console.warn('[tactical-map] not found:', pathname);
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'text/plain');
                    res.end('Not Found');
                    return;
                }

                const ext = pathname.slice(pathname.lastIndexOf('.'));
                const types: Record<string, string> = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.json': 'application/json',
                    '.geojson': 'application/geo+json',
                };
                const contentType = types[ext] ?? 'application/octet-stream';
                try {
                    const data = readFileSync(filePath);
                    res.statusCode = 200;
                    res.setHeader('Content-Type', contentType);
                    res.setHeader('Content-Length', String(data.length));
                    res.end(data);
                } catch {
                    next();
                }
            };
            const stack = server.middlewares.stack as Array<{
                route: string;
                handle: (req: unknown, res: unknown, next: () => void) => void;
            }>;
            stack.unshift({ route: '', handle: handler as any });
        },
    };
}

export default defineConfig({
    root: __dirname,
    plugins: [serveTacticalMapData()],
    server: {
        port: 3001,
        open: false,
        strictPort: true,
        host: true,
    },
    build: {
        outDir: resolve(__dirname, '../../../dist/tactical-map'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, './tactical_map.html'),
            },
        },
        copyPublicDir: false,
    },
    resolve: {
        alias: [
            { find: '@', replacement: resolve(__dirname, '../../../src') },
        ],
    },
});

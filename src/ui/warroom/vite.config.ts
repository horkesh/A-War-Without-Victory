import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = resolve(__dirname, 'public');
// Fallback roots for /data/ and /assets/: config dir then cwd (so "npm run dev:warroom" from repo root finds data/)
const projectRootFromConfig = resolve(__dirname, '../../..');
const projectRootFromCwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : projectRootFromConfig;
const browserChildProcessShim = resolve(__dirname, '../map/shims/browserChildProcessShim.ts');

const standaloneHtmlPath = resolve(__dirname, 'map_viewer_standalone.html');

/** Serve standalone map HTML and public/data so /map_viewer_standalone.html and /data/ always work. */
function serveWarroomPublic(): Plugin {
    return {
        name: 'serve-warroom-public',
        configureServer(server) {
            const handler = (req: { url?: string; method?: string }, res: any, next: () => void) => {
                const raw = req.url ?? '';
                const [pathname, query = ''] = raw.split('?');
                if (req.method !== 'GET' && req.method !== 'HEAD') return next();
                const isModuleRequest = query && /(?:^|&)(?:url|import)(?=&|$|=)/.test('&' + query);
                if (isModuleRequest) return next();
                // Serve standalone map viewer HTML explicitly so Vite never returns index.html for this path
                if (pathname === '/map_viewer_standalone.html') {
                    try {
                        const html = readFileSync(standaloneHtmlPath, 'utf-8');
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'text/html; charset=utf-8');
                        res.end(html);
                    } catch {
                        next();
                    }
                    return;
                }
                if (!pathname.startsWith('/assets/') && !pathname.startsWith('/data/')) return next();

                // 1. Check if the file exists locally in the warroom directory.
                // If it does, let Vite handle it (it's likely a component-local asset or module).
                const relativePath = pathname.replace(/^\//, '');
                const localPath = resolve(__dirname, relativePath);
                if (existsSync(localPath)) return next();

                // 2. Extra safety: do not intercept source files meant for the Vite module graph
                if (pathname.endsWith('.ts') || pathname.endsWith('.js') || pathname.endsWith('.tsx') || pathname.endsWith('.jsx')) return next();

                let filePath = resolve(publicDir, relativePath);
                if (!existsSync(filePath)) {
                    const fallbackCwd = resolve(projectRootFromCwd, relativePath);
                    const fallbackConfig = resolve(projectRootFromConfig, relativePath);
                    const fallbackPath = existsSync(fallbackCwd) ? fallbackCwd : existsSync(fallbackConfig) ? fallbackConfig : null;
                    if (fallbackPath) {
                        filePath = fallbackPath;
                        console.log('[warroom-public] serving from project root:', pathname, '->', filePath);
                    } else {
                        console.warn('[warroom-public] not found:', filePath, '(tried cwd:', fallbackCwd, ', config:', fallbackConfig, ')');
                        res.statusCode = 404;
                        res.setHeader('Content-Type', 'text/plain');
                        res.end('Not Found');
                        return;
                    }
                } else {
                    console.log('[warroom-public] serving:', pathname, '->', filePath);
                }
                const ext = pathname.slice(pathname.lastIndexOf('.'));
                const types: Record<string, string> = {
                    '.webp': 'image/webp',
                    '.png': 'image/png',
                    '.json': 'application/json',
                    '.geojson': 'application/geo+json'
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
            const stack = server.middlewares.stack as Array<{ route: string; handle: (req: unknown, res: unknown, next: () => void) => void }>;
            stack.unshift({ route: '', handle: handler as (req: unknown, res: unknown, next: () => void) => void });
        }
    };
}

export default defineConfig({
    root: __dirname, // Warroom directory as root
    publicDir: resolve(__dirname, 'public'), // Also set for build / fallback
    plugins: [serveWarroomPublic()],
    server: {
        port: 3000,
        open: false,
        strictPort: false,
        host: true // listen on all interfaces so localhost (IPv6 ::1) and 127.0.0.1 both reach the server
    },
    build: {
        outDir: resolve(__dirname, '../../../dist/warroom'),
        emptyOutDir: true,
        chunkSizeWarningLimit: 900,
        rollupOptions: {
            input: {
                main: resolve(__dirname, './index.html'),
                'map-viewer': resolve(__dirname, './map_viewer_standalone.html')
            }
        },
        copyPublicDir: false
    },
    resolve: {
        alias: [
            { find: '@', replacement: resolve(__dirname, '../../../src') },
            { find: 'child_process', replacement: browserChildProcessShim },
            { find: 'node:child_process', replacement: browserChildProcessShim }
        ]
    }
});

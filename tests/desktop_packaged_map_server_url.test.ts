import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

// Exercise the real function from electron-main.cjs with stubbed `app` and `http`.
const source = readFileSync('src/desktop/electron-main.cjs', 'utf8');
const start = source.indexOf('async function resolveMapServerBaseUrl(');
const end = source.indexOf('function registerProbeSafeIpcHandlers(');
const functionSource = source.slice(start, end);

const VITE_DEV_HTML = '<!doctype html><script type="module" src="/@vite/client"></script>';

function loadResolver(isPackaged: boolean) {
    const probed: string[] = [];
    // Every loopback port answers as a running Vite dev server.
    const http = {
        get(url: string, onResponse: (res: EventEmitter & { statusCode: number }) => void) {
            probed.push(url);
            const req = Object.assign(new EventEmitter(), { setTimeout: () => req, destroy: () => undefined });
            queueMicrotask(() => {
                const res = Object.assign(new EventEmitter(), { statusCode: 200 });
                onResponse(res);
                res.emit('data', Buffer.from(VITE_DEV_HTML));
                res.emit('end');
            });
            return req;
        },
    };
    const resolve = runInNewContext(`${functionSource}\nresolveMapServerBaseUrl;`, {
        app: { isPackaged },
        http,
        mapServerPort: 51234,
        getMapServerUrl: (extra: string) => `http://127.0.0.1:51234${extra}`,
        RUNTIME_PROBE_MODE: true,
        console,
        Promise,
        Error,
    }) as () => Promise<string | null>;
    return { resolve, probed };
}

describe('resolveMapServerBaseUrl', () => {
    it('isolates the function source', () => {
        expect(start).toBeGreaterThan(0);
        expect(end).toBeGreaterThan(start);
    });

    it('never looks for a dev server in the packaged game', async () => {
        const { resolve, probed } = loadResolver(true);
        await expect(resolve()).resolves.toBe('http://127.0.0.1:51234/');
        expect(probed).toEqual([]);
    });

    it('still prefers a running Vite dev server in development', async () => {
        const { resolve, probed } = loadResolver(false);
        await expect(resolve()).resolves.toBe('http://127.0.0.1:3002');
        expect(probed).toEqual(['http://127.0.0.1:3002/index.html']);
    });
});

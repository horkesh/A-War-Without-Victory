import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * The packaged runtime probe must not fail CI on a font that actually rendered, and must
 * still fail on a font that genuinely did not load.
 *
 * MEASURED 2026-09-01. The probe failed on every font the tactical map uses. Instrumenting
 * the map server showed it received exactly one request per font, answered 200, and
 * finished the response. Instrumenting the renderer showed document.fonts.status ===
 * 'loaded' with check() true for both families. The bytes arrived and the text rendered;
 * only Chromium's cache lookup errored, and which webContents reported it varied run to
 * run.
 *
 * So the incidental network signal was swapped for a direct assertion that the fonts
 * resolved. These tests pin BOTH halves of that swap — forgiving the artifact is only
 * acceptable while the positive assertion is present and load-bearing.
 */
describe('packaged runtime probe: font cache-lookup artifact vs real font failure', () => {
    let mainSource: string;
    let isIgnorableRuntimeProbeFailure: (entry: unknown) => boolean;

    beforeAll(() => {
        mainSource = fs.readFileSync(
            path.join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'),
            'utf8',
        );
        const start = mainSource.indexOf('function isIgnorablePackagedRouteTeardownFailure(');
        const end = mainSource.indexOf('// Positive proof that every @font-face', start);
        expect(start, 'teardown predicate must exist').toBeGreaterThan(-1);
        expect(end, 'font assertion must follow the ignore predicates').toBeGreaterThan(start);

        isIgnorableRuntimeProbeFailure = Function(
            `${mainSource.slice(start, end)}
             return isIgnorableRuntimeProbeFailure;`,
        )() as (entry: unknown) => boolean;
    });

    const localFont = 'http://127.0.0.1:62958/assets/IBMPlexSans_Condensed-Bold-BzFyGlEG.ttf';
    const cacheMiss = (over: Record<string, unknown> = {}) => ({
        type: 'request-failed',
        label: 'webContents:2',
        error: 'net::ERR_CACHE_MISS',
        method: 'GET',
        resource_type: 'font',
        url: localFont,
        intentional_abort: false,
        ...over,
    });

    it('forgives a local font cache-lookup artifact', () => {
        expect(isIgnorableRuntimeProbeFailure(cacheMiss())).toBe(true);
    });

    it('still fails a local font that could not be found or connected to', () => {
        expect(isIgnorableRuntimeProbeFailure(cacheMiss({ error: 'net::ERR_FILE_NOT_FOUND' }))).toBe(false);
        expect(isIgnorableRuntimeProbeFailure(cacheMiss({ error: 'net::ERR_CONNECTION_REFUSED' }))).toBe(false);
        expect(isIgnorableRuntimeProbeFailure(cacheMiss({ error: 'net::ERR_EMPTY_RESPONSE' }))).toBe(false);
    });

    it('still fails a non-font resource that misses the cache', () => {
        expect(isIgnorableRuntimeProbeFailure(cacheMiss({ resource_type: 'script' }))).toBe(false);
        expect(isIgnorableRuntimeProbeFailure(cacheMiss({ resource_type: 'stylesheet' }))).toBe(false);
        expect(isIgnorableRuntimeProbeFailure(cacheMiss({ resource_type: 'xhr' }))).toBe(false);
    });

    it('does not forgive a font served from anywhere but the local map server', () => {
        expect(isIgnorableRuntimeProbeFailure(cacheMiss({ url: 'http://10.0.0.5:8080/a.woff2' }))).toBe(false);
        expect(isIgnorableRuntimeProbeFailure(cacheMiss({ url: 'https://cdn.example.com/a.woff2' }))).toBe(false);
    });

    it('does not forgive an http status failure or a dead renderer', () => {
        expect(isIgnorableRuntimeProbeFailure({ type: 'http-status-failure', resource_type: 'font', status: 404, url: localFont })).toBe(false);
        expect(isIgnorableRuntimeProbeFailure({ type: 'render-process-gone', reason: 'crashed' })).toBe(false);
    });

    it('keeps the positive font assertion that justifies the forgiveness', () => {
        // The artifact is only safe to ignore because the probe proves the fonts resolved.
        expect(mainSource).toMatch(/async function assertPackagedFontsLoaded\(win, label\)/);
        // A missing/corrupt font leaves its FontFace in status 'error' — that must throw.
        expect(mainSource).toMatch(/face\.status === 'error'/);
        expect(mainSource).toMatch(/failed to load packaged fonts/);
        // Both families must be renderable, not merely free of errors.
        expect(mainSource).toMatch(/cannot render with packaged font families/);
        expect(mainSource).toMatch(/document\.fonts\.check\('16px "IBM Plex Sans Condensed"'\)/);
        expect(mainSource).toMatch(/document\.fonts\.check\('16px "IBM Plex Mono"'\)/);
        // And it must actually be invoked against the packaged tactical map window.
        expect(mainSource).toMatch(
            /assertPackagedFontsLoaded\(\s*mapProbeWindow,\s*'packaged tactical map window',\s*\)/,
        );
    });
});

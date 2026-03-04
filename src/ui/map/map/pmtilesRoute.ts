/**
 * PMTiles URL rewriting for the current runtime environment.
 * Rewrites pmtiles:/// (absolute paths) to include the current origin so the
 * pmtiles protocol handler can resolve byte-range requests correctly in both
 * browser (localhost Vite dev server) and Electron (HTTP server on random port).
 */
export function rewritePmtilesUrlsForRuntime(
    style: Record<string, unknown>,
    origin: string,
): Record<string, unknown> {
    const str = JSON.stringify(style);
    const base = `pmtiles://${origin}/`;
    const rewritten = str.replace(/pmtiles:\/\/\//g, base);
    return JSON.parse(rewritten) as Record<string, unknown>;
}

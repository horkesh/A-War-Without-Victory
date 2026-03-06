/**
 * Rewrite pmtiles:/// URLs in a MapLibre style for the current environment.
 * pmtiles:///path → pmtiles://http://host:port/path (or https, file, etc.)
 */
export function rewritePmtilesUrls(
  style: Record<string, unknown>,
  origin: string
): Record<string, unknown> {
  const str = JSON.stringify(style);
  const base = `pmtiles://${origin}/`;
  const rewritten = str.replace(/pmtiles:\/\/\//g, base);
  return JSON.parse(rewritten) as Record<string, unknown>;
}

export function rewritePmtilesUrlsForRuntime(style: Record<string, unknown>, origin: string): Record<string, unknown> {
  const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  const styleText = JSON.stringify(style);

  // Desktop canonical path: always prefer app data route for PMTiles sources.
  if (normalizedOrigin.startsWith('awwv://')) {
    const rewrittenDesktop = styleText.replace(
      /pmtiles:\/\/\/data\/derived\//g,
      'pmtiles://awwv://app/data/derived/'
    );
    return JSON.parse(rewrittenDesktop) as Record<string, unknown>;
  }

  const browserBase = `pmtiles://${normalizedOrigin}/`;
  const rewrittenBrowser = styleText.replace(/pmtiles:\/\/\//g, browserBase);
  return JSON.parse(rewrittenBrowser) as Record<string, unknown>;
}

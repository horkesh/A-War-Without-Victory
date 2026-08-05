import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { rewritePmtilesUrlsForRuntime } from '../src/ui/map/map/pmtilesRoute.js';

describe('desktop pmtiles protocol route rewriting', () => {
  let buildDataDerivedResponse: (
    request: Request,
    dataDerivedDir: string,
    segs: string[]
  ) => Response | null;
  let isPathInside: (baseDir: string, filePath: string) => boolean;
  let productionStaticHelpers: {
    isPathInside: (baseDir: string, filePath: string) => boolean;
    buildPackagedFileCacheHeaders: (
      pathname: string,
      stat: { size: number; mtimeMs: number },
      packaged: boolean,
    ) => Record<string, string>;
    buildStaticFileResponseMetadata: (
      pathname: string,
      stat: { size: number; mtimeMs: number },
      packaged: boolean,
      contentType: string,
      rangeHeader?: string | null,
      ifNoneMatch?: string | null,
    ) => { status: number; headers: Record<string, string>; range: { start: number; end: number } | null };
  };

  beforeAll(async () => {
    // @ts-expect-error CJS helper module has no TypeScript declaration.
    ({ buildDataDerivedResponse, isPathInside } = await import('../src/desktop/protocol_data_route.cjs'));

    const mainSource = fs.readFileSync(path.join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'), 'utf8');
    const helperStart = mainSource.indexOf("const STATIC_RESPONSE_EXPOSE_HEADERS =");
    const helperEnd = mainSource.indexOf('function getMapTransitionSaveRoot()', helperStart);
    const helperSource = mainSource.slice(helperStart, helperEnd);
    productionStaticHelpers = Function(
      'path',
      `${helperSource}\nreturn { isPathInside, buildPackagedFileCacheHeaders, buildStaticFileResponseMetadata };`,
    )(path) as typeof productionStaticHelpers;
  });

  const style = {
    version: 8,
    sources: {
      hillshade: { type: 'raster', url: 'pmtiles:///data/derived/tiles/hillshade.pmtiles' },
      osm: { type: 'vector', url: 'pmtiles:///data/derived/tiles/osm.pmtiles' },
    },
  } as Record<string, unknown>;

  it('rewrites browser origins to same-origin pmtiles URLs', () => {
    const rewritten = rewritePmtilesUrlsForRuntime(style, 'http://localhost:5173');
    const sources = (rewritten.sources as Record<string, { url?: string }>);
    expect(sources.hillshade.url).toBe('pmtiles://http://localhost:5173/data/derived/tiles/hillshade.pmtiles');
    expect(sources.osm.url).toBe('pmtiles://http://localhost:5173/data/derived/tiles/osm.pmtiles');
  });

  it('rewrites desktop awwv origins to canonical warroom data route', () => {
    const rewritten = rewritePmtilesUrlsForRuntime(style, 'awwv://warroom');
    const sources = (rewritten.sources as Record<string, { url?: string }>);
    // rewritePmtilesUrlsForRuntime uses the origin as-is: pmtiles://${origin}/path
    expect(sources.hillshade.url).toBe('pmtiles://awwv://warroom/data/derived/tiles/hillshade.pmtiles');
    expect(sources.osm.url).toBe('pmtiles://awwv://warroom/data/derived/tiles/osm.pmtiles');
  });

  it('serves range responses for derived PMTiles files', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'awwv-derived-'));
    const tilesDir = path.join(dir, 'tiles');
    fs.mkdirSync(tilesDir, { recursive: true });
    fs.writeFileSync(path.join(tilesDir, 'sample.pmtiles'), Buffer.from('0123456789', 'utf8'));

    const response = buildDataDerivedResponse(
      new Request('awwv://app/data/derived/tiles/sample.pmtiles', {
        headers: { range: 'bytes=2-5' },
      }),
      dir,
      ['app', 'data', 'derived', 'tiles', 'sample.pmtiles']
    );

    expect(response).not.toBeNull();
    expect(response?.status).toBe(206);
    expect(response?.headers.get('content-range')).toBe('bytes 2-5/10');
    const body = Buffer.from(await response!.arrayBuffer()).toString('utf8');
    expect(body).toBe('2345');

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('uses one behavioral production contract for packaged 200, 206, 304, and 416 responses', () => {
    const stat = { size: 10, mtimeMs: 1_000 };
    const full = productionStaticHelpers.buildStaticFileResponseMetadata(
      '/data/derived/tiles/sample.pmtiles', stat, true, 'application/octet-stream', null, null,
    );
    const range = productionStaticHelpers.buildStaticFileResponseMetadata(
      '/data/derived/tiles/sample.pmtiles', stat, true, 'application/octet-stream', 'bytes=2-5', null,
    );
    const conditionalRange = productionStaticHelpers.buildStaticFileResponseMetadata(
      '/data/derived/tiles/sample.pmtiles', stat, true, 'application/octet-stream', 'bytes=2-5', full.headers.ETag,
    );
    const invalidRange = productionStaticHelpers.buildStaticFileResponseMetadata(
      '/data/derived/tiles/sample.pmtiles', stat, true, 'application/octet-stream', 'bytes=20-30', null,
    );

    expect(full.status).toBe(200);
    expect(range.status).toBe(206);
    expect(conditionalRange.status).toBe(304);
    expect(invalidRange.status).toBe(416);
    expect(range.headers.ETag).toBe(full.headers.ETag);
    expect(range.headers['Cache-Control']).toBe(full.headers['Cache-Control']);
    expect(invalidRange.headers['Accept-Ranges']).toBe('bytes');
    expect(invalidRange.headers['Access-Control-Expose-Headers']).toContain('Accept-Ranges');
  });

  it('only marks Vite content-hashed assets immutable and disables validators in development', () => {
    const stat = { size: 10, mtimeMs: 1_000 };
    const icon = productionStaticHelpers.buildPackagedFileCacheHeaders('/assets/ui/icons/icon_warning.svg', stat, true);
    const ordinaryFont = productionStaticHelpers.buildPackagedFileCacheHeaders('/assets/ui/fonts/IBMPlexSans-SemiBold.ttf', stat, true);
    const viteAsset = productionStaticHelpers.buildPackagedFileCacheHeaders('/assets/tactical_map-CNcXGW38.js', stat, true);
    const development = productionStaticHelpers.buildStaticFileResponseMetadata(
      '/assets/tactical_map-CNcXGW38.js', stat, false, 'application/javascript', null, '"a-3e8"',
    );

    expect(icon['Cache-Control']).toBe('no-cache');
    expect(ordinaryFont['Cache-Control']).toBe('no-cache');
    expect(viteAsset['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(development.status).toBe(200);
    expect(development.headers['Cache-Control']).toBe('no-store');
    expect(development.headers.ETag).toBeUndefined();
  });

  it('uses boundary-safe production containment for sibling-prefix paths', () => {
    const base = path.resolve('resources', 'app');
    expect(productionStaticHelpers.isPathInside(base, path.join(base, 'assets', 'map.js'))).toBe(true);
    expect(productionStaticHelpers.isPathInside(base, path.resolve(base, '..', 'app.asar'))).toBe(false);
  });

  it('blocks traversal in derived data route', () => {
    const response = buildDataDerivedResponse(
      new Request('awwv://app/data/derived/../secret.txt'),
      'C:\\tmp\\awwv-derived',
      ['app', 'data', 'derived', '..', 'secret.txt']
    );
    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
  });

  it('rejects Windows-like prefix bypass paths', () => {
    if (process.platform === 'win32') {
      expect(isPathInside('C:\\base', 'C:\\base\\ok\\file.pmtiles')).toBe(true);
      expect(isPathInside('C:\\base', 'C:\\base2\\file.pmtiles')).toBe(false);
    } else {
      // On POSIX, test with native paths — the Windows variants are not meaningful.
      expect(isPathInside('/base', '/base/ok/file.pmtiles')).toBe(true);
      expect(isPathInside('/base', '/base2/file.pmtiles')).toBe(false);
    }
  });
});

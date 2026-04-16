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

  beforeAll(async () => {
    // @ts-expect-error CJS helper module has no TypeScript declaration.
    ({ buildDataDerivedResponse, isPathInside } = await import('../src/desktop/protocol_data_route.cjs'));
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

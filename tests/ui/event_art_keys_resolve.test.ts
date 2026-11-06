/**
 * Every `image` key authored in the event catalogs resolves to a shipped still.
 *
 * The resolver silently falls back to text when a key matches nothing, which is
 * the right runtime behaviour and the wrong authoring behaviour: a typo or a
 * plate that never landed would go unnoticed. This pins the catalogs to the
 * asset directory. The §6 stills are not special-cased here; their gating is a
 * content decision recorded in the governance records, not a resolver rule.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const catalogDir = resolve(root, 'data/scenarios/events');
const assetDir = resolve(root, 'src/ui/map/assets/event_illustrations');

describe('authored event image keys', () => {
  it('each resolves to a file under event_illustrations', () => {
    const missing: string[] = [];
    let authored = 0;
    for (const file of readdirSync(catalogDir).filter((f) => f.endsWith('.json'))) {
      const json = JSON.parse(readFileSync(join(catalogDir, file), 'utf8')) as unknown;
      const rows = (Array.isArray(json) ? json : (json as { events?: unknown[] }).events) ?? [];
      for (const row of rows as Array<{ id?: string; image?: unknown }>) {
        if (typeof row.image !== 'string') continue;
        authored++;
        if (!existsSync(join(assetDir, basename(row.image)))) missing.push(`${file}: ${row.id} -> ${row.image}`);
      }
    }
    expect(authored).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { buildControlGeoJSON } from '../src/ui/map/map/builders/buildControlGeoJSON.js';
import { buildCorpsFrontLinesGeoJSON } from '../src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.js';

const SAVE_PATH = resolve(__dirname, '..', 'data', 'derived', 'latest_run_final_save.json');
const GEO_PATH = resolve(__dirname, '..', 'data', 'derived', 'operational', 'operational_settlements.geojson');
const hasFixtures = existsSync(SAVE_PATH) && existsSync(GEO_PATH);

describe.skipIf(!hasFixtures)('sector front glow continuity (real save)', () => {
    it('renders each sector glow as one continuous chain per offset side', () => {
        const raw = JSON.parse(readFileSync(SAVE_PATH, 'utf8'));
        const base = JSON.parse(readFileSync(GEO_PATH, 'utf8'));
        const parsed = parseGameState(raw) as any;
        const controlled = buildControlGeoJSON(base, parsed.controlBySettlement ?? {});
        const front = buildCorpsFrontLinesGeoJSON(
            controlled,
            parsed.corpsFrontSectors ?? [],
            parsed.rbihHrhbAllied,
            parsed.osidCentroids,
            parsed.frontPressureByEdge,
            parsed.frontEdgesOsid ?? [],
            parsed.formationsById,
        );

        const bySectorSide = new Map<string, number>();
        for (const feature of front.features) {
            const props = feature.properties ?? {};
            if (props.lineType !== 'glow') continue;
            if (!props.sector_id) continue;
            const key = `${props.faction}::${props.sector_id}::${props.offset_side ?? 'none'}`;
            bySectorSide.set(key, (bySectorSide.get(key) ?? 0) + 1);
        }

        const fragmented = [...bySectorSide.entries()]
            .filter(([, count]) => count > 1)
            .map(([key, count]) => ({ key, count }))
            .sort((a, b) => a.key.localeCompare(b.key));

        expect(fragmented).toEqual([]);
    });
});

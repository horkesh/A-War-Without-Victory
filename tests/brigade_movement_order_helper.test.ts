import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const COLUMN_ORDER_PRODUCERS = [
    'src/sim/combat/brigade_front_distribution.ts',
    'src/sim/combat/brigade_home_return.ts',
    'src/sim/combat/commander_march_correction.ts',
    'src/sim/combat/sector_offensive.ts',
] as const;

describe('brigade movement order helper contract', () => {
    it('uses the typed column movement order helper instead of local shape casts', () => {
        for (const path of COLUMN_ORDER_PRODUCERS) {
            const raw = readFileSync(resolve(path), 'utf8');

            expect(raw, path).not.toContain('} as { destination_sids: SettlementId[] }');
            expect(raw, path).toContain('createColumnMovementOrder');
        }
    });
});

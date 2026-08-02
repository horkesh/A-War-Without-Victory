import { describe, expect, it } from 'vitest';

import { createOOBLookup } from '../src/sim/oob_lookup.js';

describe('OOB lookup determinism', () => {
    it('chooses the same lowest settlement id regardless of source insertion order', () => {
        const brigades = [{
            id: 'brigade_b',
            name: 'Brigade B',
            faction: 'RS',
            home_mun: 'mun-1',
            home_settlement: 'Shared Name',
        }];
        const settlementsA = {
            'sid-2': { name: 'Shared Name', mun_code: 'code-1' },
            'sid-1': { name: 'Shared Name', mun_code: 'code-1' },
        };
        const settlementsB = Object.fromEntries(Object.entries(settlementsA).reverse());
        const munPop = { 'code-1': { mun1990_id: 'mun-1' } };

        const first = createOOBLookup(brigades, settlementsA, munPop, {}).hqLookup('RS', 'mun-1', 1);
        const second = createOOBLookup(brigades, settlementsB, munPop, {}).hqLookup('RS', 'mun-1', 1);

        expect(first).toBe('sid-1');
        expect(second).toBe(first);
    });
});

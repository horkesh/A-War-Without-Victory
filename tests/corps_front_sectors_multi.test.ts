import { describe, expect, it } from 'vitest';

import { MIN_SECTOR_EDGES } from '../src/sim/combat/corps_front_sectors.js';
import { EXEMPT_CORPS_IDS } from '../src/sim/combat/corps_front_sectors_constants.js';

describe('corps front sector constants', () => {
    it('exports the current minimum sector edge threshold', () => {
        expect(MIN_SECTOR_EDGES).toBe(5);
    });

    it('does not classify hvo_central_bosnia as an exempt corps', () => {
        expect(EXEMPT_CORPS_IDS.has('hvo_central_bosnia')).toBe(false);
    });
});

/**
 * Package "1994-95 attack and defence", P0 (2026-11-16): the multi-corps "offensive" pre-set
 * (coordinateMultiCorpsOffensive) is retired. Do not revive it.
 *
 * It ran at step 0b, before generateCorpsStanceOrders, which rewrites every corps stance. So it only
 * survived for a corps with a player stance order (`player_ordered_stance`, which step 2 skips), where
 * it overrode the President's accepted stance for the turn. Headless it changed nothing: the 188-week
 * run is byte-identical without it.
 */

import { describe, expect, it } from 'vitest';
import * as botCorpsAi from '../../src/sim/combat/bot_corps_ai.js';
import * as botCorpsStance from '../../src/sim/combat/bot_corps_stance.js';

describe('P0: the multi-corps offensive pre-set is retired', () => {
    it('coordinateMultiCorpsOffensive is gone from the stance module and the corps-AI re-exports', () => {
        expect('coordinateMultiCorpsOffensive' in botCorpsStance).toBe(false);
        expect('coordinateMultiCorpsOffensive' in botCorpsAi).toBe(false);
    });
});

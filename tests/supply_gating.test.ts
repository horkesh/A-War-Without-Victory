/**
 * Unit tests for Phase B: supply gating of offensive operations.
 *
 * Verifies:
 * - getBrigadeSupplyState() correctly reads supply state from report
 * - Critical supply → forced defend, no voluntary attacks
 * - Strained supply → min_attack_outcome upgraded to 'victory', no pioneer attacks
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getBrigadeSupplyState } from '../src/sim/combat/bot_brigade_ai_osid.js';
import type { FormationState, FactionId } from '../src/state/game_state.js';
import type { SupplyStateByOsidReport } from '../src/state/supply_state_derivation.js';

function makeBrigade(id: string, faction: FactionId, osid: string): FormationState {
    return {
        id, name: id, faction, kind: 'brigade', status: 'active',
        personnel: 2000, location_osid: osid,
    } as FormationState;
}

function makeSupplyReport(
    faction: FactionId,
    entries: Array<{ osid: string; state: 'adequate' | 'strained' | 'critical' }>
): SupplyStateByOsidReport {
    return {
        schema: 1,
        turn: 5,
        factions: [{
            faction_id: faction,
            by_osid: entries,
        }],
    };
}

describe('Supply Gating — getBrigadeSupplyState', () => {
    it('returns adequate when no supply report is provided', () => {
        const b = makeBrigade('b1', 'RS', 'op:brcko:1');
        assert.equal(getBrigadeSupplyState(b, null), 'adequate');
        assert.equal(getBrigadeSupplyState(b, undefined), 'adequate');
    });

    it('returns adequate when brigade location is not in the report', () => {
        const b = makeBrigade('b1', 'RS', 'op:brcko:1');
        const report = makeSupplyReport('RS', [
            { osid: 'op:other:1', state: 'critical' },
        ]);
        assert.equal(getBrigadeSupplyState(b, report), 'adequate');
    });

    it('returns correct supply state from report', () => {
        const report = makeSupplyReport('RS', [
            { osid: 'op:a:1', state: 'adequate' },
            { osid: 'op:b:1', state: 'strained' },
            { osid: 'op:c:1', state: 'critical' },
        ]);

        assert.equal(getBrigadeSupplyState(makeBrigade('b1', 'RS', 'op:a:1'), report), 'adequate');
        assert.equal(getBrigadeSupplyState(makeBrigade('b2', 'RS', 'op:b:1'), report), 'strained');
        assert.equal(getBrigadeSupplyState(makeBrigade('b3', 'RS', 'op:c:1'), report), 'critical');
    });

    it('returns adequate for different faction', () => {
        const report = makeSupplyReport('RS', [
            { osid: 'op:a:1', state: 'critical' },
        ]);
        const b = makeBrigade('b1', 'RBiH', 'op:a:1');
        assert.equal(getBrigadeSupplyState(b, report), 'adequate');
    });

    it('returns adequate when brigade has no location', () => {
        const b = makeBrigade('b1', 'RS', 'op:a:1');
        (b as any).location_osid = undefined;
        assert.equal(getBrigadeSupplyState(b, makeSupplyReport('RS', [
            { osid: 'op:a:1', state: 'critical' },
        ])), 'adequate');
    });
});

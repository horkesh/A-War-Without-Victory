/**
 * Retired-field sweep guard (2026-11-18).
 *
 * Dead state fields left over from retired systems (the supply-reserve economy, humanitarian
 * convoys, smuggling and airdrop allocations, siege counters, brigade reposition orders, the
 * legacy AoR cap) were removed from the GameState types, the validators, the turn-summary types,
 * the turn-aftermath view, the player-visible projection and the field-classification registry.
 *
 * This guard is SOURCE level only: it fails if a retired field name comes back into one of those
 * files. It deliberately says nothing about serialized state; the save-migration step owns that.
 *
 * Comments are stripped before matching (tests/helpers/sourceComments.ts) so a retirement note
 * does not trip the guard, and every scan has a positive control so an empty read cannot pass.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { withoutComments } from './helpers/sourceComments';

function read(rel: string): string {
    return withoutComments(readFileSync(join(process.cwd(), rel)).toString());
}

/** Lines of `source` that mention any of `names` (trimmed, with line numbers), minus exempt lines. */
function mentions(source: string, names: readonly string[], exempt?: RegExp): string[] {
    return source
        .split('\n')
        .map((line, index) => ({ line: line.trim(), n: index + 1 }))
        .filter(({ line }) => names.some((name) => line.includes(name)))
        .filter(({ line }) => !(exempt && exempt.test(line)))
        .map(({ line, n }) => `${n}: ${line.slice(0, 120)}`);
}

const RETIRED_STATE_FIELDS = [
    'pending_convoy_decisions',
    'convoy_decision_history',
    'siege_turn_counters',
    'general_supply_reserve',
    'heavy_munitions_reserve',
    'smuggling_routes',
    'smuggling_allocation',
    'airdrop_allocation',
    'supply_reserves_enabled',
    'artillery_preparation_consumed',
    'brigade_reposition_orders',
    'brigade_desired_aor_cap',
] as const;

const RETIRED_STATE_TYPES = ['SmugglingRouteState', 'PendingConvoyDecision', 'ConvoyDecisionRecord'] as const;

const RETIRED_VALIDATORS = [
    'validateSmugglingRoutes',
    'validateSmugglingAllocation',
    'validatePendingConvoyDecisions',
    'validateConvoyDecisionHistory',
    'validateBrigadeRepositionOrders',
    'isConvoyDecision',
] as const;

const RETIRED_TURN_SUMMARY_FIELDS = ['supply_deltas', 'heavy_munitions_deltas', 'supply_snapshot'] as const;

const RETIRED_AFTERMATH_VIEW_FIELDS = [
    'ownSupplySpent',
    'ownHeavyMunitionsSpent',
    'ownSupplyDelta',
    'ownHeavyMunitionsDelta',
    'TURN_AFTERMATH_SUPPLY_KEYS',
] as const;

describe('retired dead state fields stay out of the source', () => {
    it('positive controls: the scanned files are read and still carry live neighbours', () => {
        expect(read('src/state/game_state.ts').includes('export interface MilitaryState')).toBe(true);
        expect(read('src/state/game_state.ts').includes('strategic_reserves')).toBe(true);
        expect(read('src/state/validateGameState.ts').includes('validateProductionFacilities')).toBe(true);
        expect(read('src/state/turn_summary.ts').includes('supply_transitions')).toBe(true);
        expect(read('src/sim/turn_pipeline_types.ts').includes('export interface AARSnapshot')).toBe(true);
        expect(read('src/sim/compile_turn_summary.ts').includes('compileSupplyTransitions')).toBe(true);
        expect(read('src/ui/map/data/turnAftermath.ts').includes('ownFormationsDestroyed')).toBe(true);
        expect(read('src/desktop/player_visible_state.cjs').includes('supply_transitions')).toBe(true);
        expect(read('tools/diagnostics/game_state_field_classification.ts').includes('MilitaryState.theatres')).toBe(true);
        // negotiation_offers keeps its own, live, rationale.supply_snapshot.
        expect(read('src/state/negotiation_offers.ts').includes('supply_snapshot')).toBe(true);
    });

    it('game_state.ts declares none of the retired fields or their record types', () => {
        expect(mentions(read('src/state/game_state.ts'), [...RETIRED_STATE_FIELDS, ...RETIRED_STATE_TYPES])).toEqual([]);
    });

    it('validateGameState.ts validates none of them (the v27 convoy required-field rows are the only mention)', () => {
        const v27ConvoyRow = /^\{\s*version:\s*27,\s*path:\s*'military\.(pending_convoy_decisions|convoy_decision_history)'/;
        expect(
            mentions(read('src/state/validateGameState.ts'), [...RETIRED_STATE_FIELDS, ...RETIRED_STATE_TYPES, ...RETIRED_VALIDATORS], v27ConvoyRow),
        ).toEqual([]);
    });

    it('the turn-summary types and compiler carry no supply or heavy-munitions deltas or snapshot', () => {
        expect(mentions(read('src/state/turn_summary.ts'), RETIRED_TURN_SUMMARY_FIELDS)).toEqual([]);
        expect(mentions(read('src/sim/compile_turn_summary.ts'), [...RETIRED_TURN_SUMMARY_FIELDS, 'compileSupplyDeltas', 'heavy_munitions'])).toEqual([]);
    });

    it('AARSnapshot carries no reserve snapshot', () => {
        const source = read('src/sim/turn_pipeline_types.ts');
        const start = source.indexOf('export interface AARSnapshot');
        const end = source.indexOf('\n}', start);
        expect(start).toBeGreaterThan(-1);
        const block = source.slice(start, end);
        expect(block.includes('heavy_munitions')).toBe(false);
        expect(/^\s*supply\s*:/m.test(block)).toBe(false);
    });

    it('the turn-aftermath view has no supply or heavy-munitions cost fields, and the supplySpent copy is gone', () => {
        expect(mentions(read('src/ui/map/data/turnAftermath.ts'), [...RETIRED_AFTERMATH_VIEW_FIELDS, 'supplySpent', 'supply_deltas', 'heavy_munitions_deltas'])).toEqual([]);
        expect(mentions(read('src/ui/map/i18n/messages.en.ts'), ['turnAftermath.cost.reason.supplySpent'])).toEqual([]);
        expect(mentions(read('src/ui/map/i18n/messages.bcs.ts'), ['turnAftermath.cost.reason.supplySpent'])).toEqual([]);
    });

    it('the player-visible projection no longer reads or projects them', () => {
        expect(
            mentions(read('src/desktop/player_visible_state.cjs'), [...RETIRED_STATE_FIELDS, ...RETIRED_TURN_SUMMARY_FIELDS]),
        ).toEqual([]);
    });

    it('the field-classification registry lists none of them', () => {
        expect(mentions(read('tools/diagnostics/game_state_field_classification.ts'), RETIRED_STATE_FIELDS)).toEqual([]);
    });
});

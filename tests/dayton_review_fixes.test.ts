/**
 * Independent review fixes (RD, 2026-11-07), on the real 188-week save:
 *  F1 — ground between RBiH and HRHB is not negotiable at Dayton, fixed packages included.
 *  F2 — the displayed final split equals the settled share the grade reads.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { GameState } from '../src/state/game_state.js';
import type { DaytonProposal } from '../src/state/negotiation_types.js';
import { resolveDaytonNegotiation } from '../src/sim/negotiation/dayton_negotiation.js';

const RAW = readFileSync(resolve('data/derived/latest_run_final_save.json'), 'utf8');
const fresh = (player: 'RBiH' | 'RS' | 'HRHB'): GameState => {
    const state = JSON.parse(RAW) as GameState;
    state.meta.player_faction = player;
    return state;
};
const proposal = (demands: string[] = [], concessions: string[] = []): DaytonProposal =>
    ({ territorial_demands: demands, territorial_concessions: concessions, institutional_choices: {} });

describe('F1: Federation-internal fixed packages are not negotiable', () => {
    it('HRHB demanding RBiH-held Central or Western Bosnia moves nothing', () => {
        const state = fresh('HRHB');
        const result = resolveDaytonNegotiation(state, proposal(['central_bosnia', 'western_bosnia']));
        expect(result.territorial_packages_accepted).not.toContain('central_bosnia');
        expect(result.territorial_packages_accepted).not.toContain('western_bosnia');
        expect(state.military.negotiation!.settlement?.map_overrides ?? {}).toEqual({});
    });

    it('RBiH demanding HRHB-held Mostar, or conceding it, moves nothing', () => {
        const demand = resolveDaytonNegotiation(fresh('RBiH'), proposal(['mostar']));
        expect(demand.territorial_packages_accepted).not.toContain('mostar');
        const concede = resolveDaytonNegotiation(fresh('RBiH'), proposal([], ['mostar']));
        expect(concede.territorial_packages_accepted).not.toContain('mostar');
    });

    it('a player may still concede its own ground across the entity line', () => {
        const result = resolveDaytonNegotiation(fresh('RBiH'), proposal([], ['central_bosnia']));
        expect(result.territorial_packages_accepted).toContain('central_bosnia');
    });
});

describe('F2: the final split is the settled share', () => {
    it('final_territory_split equals the settlement territory share (normalised, 1 dp)', () => {
        const state = fresh('RBiH');
        const result = resolveDaytonNegotiation(state, proposal());
        const pct = state.military.negotiation!.settlement!.territory_pct;
        const covered = (pct.RBiH ?? 0) + (pct.RS ?? 0) + (pct.HRHB ?? 0);
        for (const f of ['RBiH', 'RS', 'HRHB']) {
            expect(result.final_territory_split[f]).toBeCloseTo(((pct[f] ?? 0) / covered) * 100, 1);
        }
    });
});

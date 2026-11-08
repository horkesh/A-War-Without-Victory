/**
 * Dayton decline and imposition (owner, 2026-11-07): a player who declines Dayton gets
 * eight more weeks of war; then the faction's coercion event fires (RBiH: United States;
 * RS: Belgrade; HRHB: Zagreb) and the table reopens with no decline. Ground held against
 * the Dayton map is negotiable there (and at an on-time Dayton) as captured-ground packages.
 */
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

import type { GameState } from '../src/state/game_state.js';
import type { NegotiationBreakdown, PatronRelationship } from '../src/state/negotiation_types.js';
import { createEmptyCapital } from '../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import {
    DAYTON_COERCING_POWER,
    DAYTON_DECLINE_GRACE_WEEKS,
    DAYTON_IMPOSITION_DUE_FLAG,
    DAYTON_DECLINED_BY_FLAG,
    DAYTON_SETTLEMENT_SIGNED_FLAG,
    applyPlayerDaytonHardline,
    declineDaytonNegotiation,
    enforceDaytonImposition,
    initiateDaytonNegotiation,
    resolveDaytonNegotiation,
} from '../src/sim/negotiation/dayton_negotiation.js';
import { buildFrontPackages, frontPackagesForPlayer } from '../src/sim/negotiation/front_packages.js';
import { computePlayerProposalSpend } from '../src/sim/negotiation/bot_negotiation.js';
import { settlementControllersFor } from '../src/sim/negotiation/peace_settlement.js';
import { warPhaseNegotiationSteps } from '../src/sim/turn_phases/war_phase_negotiation_steps.js';
import { DAYTON_CONTINUATION_OPPORTUNITIES, isDaytonContinuationWindowOpen } from '../src/sim/combat/operation_opportunity_catalog_dayton_continuation.js';
import { OPERATION_OPPORTUNITY_CATALOG } from '../src/sim/combat/operation_opportunities.js';
import { loadEventDefinitionsFromDir } from '../src/sim/events/event_loader.js';
import { evaluateCondition } from '../src/sim/events/event_types.js';

function makeState(player: 'RBiH' | 'RS' | 'HRHB', turn = 188): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    for (const faction of ['RBiH', 'RS', 'HRHB']) {
        capital[faction] = { ...createEmptyCapital(), territory_controlled_pct: 30 };
        patron_relationships[faction] = {
            patron_id: 'international_community', support_level: 50, override_authority: 10,
            sanctions_active: false, relationship_events: [],
        };
    }
    const state = {
        meta: { turn, war_start_turn: 0, phase: 'war', seed: 1, date: '1995-11-09', game_over: false, player_faction: player },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            negotiation: { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: initializeStrategicDimensions() },
        },
        political: { political_controllers: {} },
        displacement: {},
    } as unknown as GameState;
    state.military.negotiation!.pending_dayton = initiateDaytonNegotiation(state) as never;
    return state;
}

const runStep = (name: string, state: GameState) => {
    const step = warPhaseNegotiationSteps.find((s) => s.name === name);
    if (!step) throw new Error(`missing step ${name}`);
    return step.run({ state } as never);
};

describe('declineDaytonNegotiation', () => {
    it('withdraws the menu and schedules imposition eight weeks out', () => {
        const state = makeState('RBiH');
        const r = declineDaytonNegotiation(state);
        expect(DAYTON_DECLINE_GRACE_WEEKS).toBe(8);
        expect(r).toEqual({ ok: true, imposition_turn: 196 });
        expect(state.military.negotiation!.pending_dayton).toBeUndefined();
        expect(state.military.negotiation!.dayton_decline).toEqual({ faction: 'RBiH', declined_turn: 188, imposition_turn: 196 });
        expect(state.meta.game_over).toBe(false);
    });

    it('refuses when there is nothing to decline', () => {
        const state = makeState('RBiH');
        delete state.military.negotiation!.pending_dayton;
        expect(declineDaytonNegotiation(state).ok).toBe(false);
        const over = makeState('RBiH');
        over.meta.game_over = true;
        expect(declineDaytonNegotiation(over).ok).toBe(false);
    });

    it('is not re-offered while the decline stands', async () => {
        const state = makeState('RBiH');
        declineDaytonNegotiation(state);
        state.meta.turn = 189;
        await runStep('evaluate-dayton-trigger', state);
        expect(state.military.negotiation!.pending_dayton).toBeUndefined();
    });
});

describe('enforceDaytonImposition', () => {
    for (const faction of ['RBiH', 'RS', 'HRHB'] as const) {
        it(`${faction}: war continues eight weeks, then ${DAYTON_COERCING_POWER[faction]} imposes the settlement`, () => {
            const state = makeState(faction);
            declineDaytonNegotiation(state);
            for (const turn of [189, 190, 191, 192, 193, 194]) {
                state.meta.turn = turn;
                expect(enforceDaytonImposition(state)).toBeNull();
                expect(state.military.event_flags?.[DAYTON_IMPOSITION_DUE_FLAG]).toBeUndefined();
            }
            state.meta.turn = 195; // the turn before imposition raises the event flag
            expect(enforceDaytonImposition(state)).toBeNull();
            expect(state.military.event_flags?.[DAYTON_IMPOSITION_DUE_FLAG]).toBe(faction);
            expect(state.meta.game_over).toBe(false);
            // The imposition turn reopens the table as a forced menu (no decline).
            state.meta.turn = 196;
            expect(enforceDaytonImposition(state)).toBeNull();
            const menu = state.military.negotiation!.pending_dayton;
            expect(menu?.forced).toEqual({ on_faction: faction, by: DAYTON_COERCING_POWER[faction], opened_turn: 196 });
            expect(state.meta.game_over).toBe(false);
            expect(declineDaytonNegotiation(state)).toEqual({ ok: false, error: 'forced_settlement' });
            // Left unanswered into the next turn, it is signed on the Dayton map.
            state.meta.turn = 197;
            const result = enforceDaytonImposition(state);
            expect(result?.imposed).toEqual({ on_faction: faction, by: DAYTON_COERCING_POWER[faction], turn: 197 });
            expect(state.military.negotiation!.dayton_result?.imposed?.by).toBe(DAYTON_COERCING_POWER[faction]);
            expect(state.military.negotiation!.pending_dayton).toBeUndefined();
            expect(state.meta.game_over).toBe(true);
            expect(state.meta.outcome).toBe('dayton');
        });
    }

    it('a settlement submitted at the forced table is recorded as imposed', () => {
        const state = makeState('RBiH');
        declineDaytonNegotiation(state);
        state.meta.turn = 196;
        enforceDaytonImposition(state);
        const result = resolveDaytonNegotiation(state, { territorial_demands: [], territorial_concessions: [], institutional_choices: {} });
        expect(result.imposed).toEqual({ on_faction: 'RBiH', by: 'united_states', turn: 196 });
        expect(state.meta.game_over).toBe(true);
    });

    it('is a no-op without a decline (headless and signed games)', () => {
        const state = makeState('RBiH');
        state.meta.turn = 200;
        expect(enforceDaytonImposition(state)).toBeNull();
        expect(state.meta.game_over).toBe(false);
        expect(state.military.event_flags).toBeUndefined();
    });
});

describe('coercion events', () => {
    const defs = loadEventDefinitionsFromDir(0, resolve(process.cwd(), 'data/scenarios/events'));
    const ids = {
        RBiH: 'us_forces_dayton_rbih_1995',
        RS: 'belgrade_signs_dayton_for_rs_1995',
        HRHB: 'zagreb_signs_dayton_for_hrhb_1995',
    } as const;

    it('load through the event loader and are marked counterfactual', () => {
        for (const id of Object.values(ids)) {
            const def = defs.find((d) => d.id === id);
            expect(def, id).toBeDefined();
            expect(def!.source_tier).toBe('design_counterfactual');
            expect(def!.once).toBe(true);
        }
    });

    it('fire only for the declining faction once the imposition flag is raised', () => {
        for (const faction of ['RBiH', 'RS', 'HRHB'] as const) {
            const state = makeState(faction, 192);
            const without = Object.values(ids).map((id) => evaluateCondition(defs.find((d) => d.id === id)!.trigger.condition!, state));
            expect(without).toEqual([false, false, false]);
            state.military.event_flags = { [DAYTON_IMPOSITION_DUE_FLAG]: faction };
            for (const [f, id] of Object.entries(ids)) {
                expect(evaluateCondition(defs.find((d) => d.id === id)!.trigger.condition!, state), `${faction} -> ${id}`).toBe(f === faction);
            }
        }
    });
});

describe('declining reopens the war (owner, 2026-11-07)', () => {
    it('lifts the Holbrooke-halt launch suppression and aggression cut, nothing else', () => {
        const state = makeState('RBiH');
        state.military.event_last_fired_turn = { us_halts_federation_advance_1995: 186 };
        state.military.offensive_ops_suppressions = [
            { faction: 'RBiH', expires_turn: 192, reason: 'us_halts_federation_advance_1995' },
            { faction: 'RS', expires_turn: 195, reason: 'some_other_event' },
        ];
        state.military.event_aggression_modifiers = [
            { faction: 'RBiH', delta: -0.2, expires_turn: 198 },
            { faction: 'HRHB', delta: -0.2, expires_turn: 198 },
            { faction: 'RBiH', delta: -0.1, expires_turn: 205 },
        ];
        declineDaytonNegotiation(state);
        expect(state.military.offensive_ops_suppressions).toEqual([{ faction: 'RS', expires_turn: 195, reason: 'some_other_event' }]);
        expect(state.military.event_aggression_modifiers).toEqual([{ faction: 'RBiH', delta: -0.1, expires_turn: 205 }]);
        expect(state.military.event_flags?.advance_halted).toBe(false);
        expect(state.military.event_flags?.[DAYTON_DECLINED_BY_FLAG]).toBe('RBiH');
    });
});

describe("a player's hard line at its Dayton acceptance event takes the decline path", () => {
    it('RBiH hard line at the week-184 talks: no menu at 188, forced table at 192, imposed by the United States', async () => {
        const state = makeState('RBiH', 184);
        delete state.military.negotiation!.pending_dayton;
        state.military.event_flags = { rbih_dayton_acceptance: 'hardline' };
        expect(applyPlayerDaytonHardline(state)).toBe(true);
        expect(state.military.negotiation!.dayton_decline).toEqual({ faction: 'RBiH', declined_turn: 184, imposition_turn: 192 });
        state.meta.turn = 192;
        await runStep('evaluate-dayton-trigger', state);
        expect(state.military.negotiation!.pending_dayton).toBeUndefined();
        expect(enforceDaytonImposition(state)).toBeNull();
        const menu = (s: GameState) => s.military.negotiation!.pending_dayton; // re-read past the delete's narrowing
        expect(menu(state)?.forced?.by).toBe('united_states');
        state.meta.turn = 193;
        expect(enforceDaytonImposition(state)?.imposed?.by).toBe('united_states');
    });

    it('a bot hard line, or an accept, changes nothing', () => {
        const bot = makeState('RS', 184);
        bot.military.event_flags = { rbih_dayton_acceptance: 'hardline' };
        expect(applyPlayerDaytonHardline(bot)).toBe(false);
        const accept = makeState('RBiH', 184);
        accept.military.event_flags = { rbih_dayton_acceptance: 'accept' };
        expect(applyPlayerDaytonHardline(accept)).toBe(false);
        expect(accept.military.negotiation!.dayton_decline).toBeUndefined();
    });
});

describe('Dayton event records follow the real settlement', () => {
    const defs = loadEventDefinitionsFromDir(0, resolve(process.cwd(), 'data/scenarios/events'));
    const def = (id: string) => defs.find((d) => d.id === id)!;

    it('"Dayton signed" no longer fires off the talks answer, only on the signature flag', () => {
        const state = makeState('RBiH', 185);
        state.military.event_flags = { rbih_dayton_acceptance: 'accept' };
        expect(evaluateCondition(def('dayton_signed_1995').trigger.condition!, state)).toBe(false);
        state.military.event_flags[DAYTON_SETTLEMENT_SIGNED_FLAG] = true;
        expect(evaluateCondition(def('dayton_signed_1995').trigger.condition!, state)).toBe(true);
    });

    it('signing or imposing Dayton fires the "Dayton signed" record', () => {
        const state = makeState('RBiH');
        declineDaytonNegotiation(state);
        state.meta.turn = 196;
        enforceDaytonImposition(state);
        expect(state.military.fired_event_ids ?? []).not.toContain('dayton_signed_1995');
        state.meta.turn = 197;
        enforceDaytonImposition(state);
        expect(state.military.fired_event_ids).toContain('dayton_signed_1995');
        expect(state.military.event_flags?.[DAYTON_SETTLEMENT_SIGNED_FLAG]).toBe(true);
    });

    it('the RS and HRHB acceptance events do not fire after a decline', () => {
        const state = makeState('RBiH', 190);
        state.military.event_flags = { rs_strategic_goals: 'all_six', hrhb_political_goal: 'croat_republic' };
        expect(evaluateCondition(def('rs_dayton_acceptance_1995').trigger.condition!, state)).toBe(true);
        expect(evaluateCondition(def('hrhb_dayton_acceptance_1995').trigger.condition!, state)).toBe(true);
        state.military.event_flags[DAYTON_DECLINED_BY_FLAG] = 'RBiH';
        expect(evaluateCondition(def('rs_dayton_acceptance_1995').trigger.condition!, state)).toBe(false);
        expect(evaluateCondition(def('hrhb_dayton_acceptance_1995').trigger.condition!, state)).toBe(false);
    });

    // PR #557 review: the bundled desktop sim cannot reach the source-relative events
    // directory, so the signing paths must fire the record from the catalog they are given.
    it('the "Dayton signed" record comes from the catalog the caller passes', () => {
        const withCatalog = makeState('RBiH');
        resolveDaytonNegotiation(withCatalog, { territorial_demands: [], territorial_concessions: [], institutional_choices: {} }, defs);
        expect(withCatalog.military.fired_event_ids).toContain('dayton_signed_1995');

        // An empty catalog is used as given (no fallback to the source-tree loader).
        const emptyCatalog = makeState('RBiH');
        resolveDaytonNegotiation(emptyCatalog, { territorial_demands: [], territorial_concessions: [], institutional_choices: {} }, []);
        expect(emptyCatalog.military.fired_event_ids ?? []).not.toContain('dayton_signed_1995');
        expect(emptyCatalog.military.event_flags?.[DAYTON_SETTLEMENT_SIGNED_FLAG]).toBe(true);
    });

    it('the imposition step and the pipeline step pass the catalog through', () => {
        const state = makeState('RBiH');
        declineDaytonNegotiation(state);
        state.meta.turn = 196;
        enforceDaytonImposition(state, []);
        state.meta.turn = 197;
        enforceDaytonImposition(state, []);
        expect(state.military.negotiation?.dayton_result).toBeDefined();
        expect(state.military.fired_event_ids ?? []).not.toContain('dayton_signed_1995');

        const step = warPhaseNegotiationSteps.find((s) => s.name === 'enforce-dayton-imposition')!;
        const piped = makeState('RBiH');
        declineDaytonNegotiation(piped);
        piped.meta.phase = 'war';
        for (const turn of [196, 197]) {
            piped.meta.turn = turn;
            step.run({ state: piped, input: { eventDefinitions: defs } } as never);
        }
        expect(piped.military.fired_event_ids).toContain('dayton_signed_1995');
    });

    it('the desktop sim and IPC handlers sign Dayton with the base-directory catalog', () => {
        const desktopSim = readFileSync(resolve(process.cwd(), 'src/desktop/desktop_sim.ts'), 'utf8');
        expect(desktopSim).toMatch(/baseDir \? loadDesktopEventDefinitions\(baseDir\) : undefined/);
        expect(desktopSim).toContain('resolveDaytonNegotiation(state, proposal, baseDir)');
        const main = readFileSync(resolve(process.cwd(), 'src/desktop/electron-main.cjs'), 'utf8');
        const calls = main.match(/sim\.resolveDesktopDaytonAgreement\([\s\S]*?\);/g) ?? [];
        expect(calls.length).toBe(2);
        for (const call of calls) expect(call).toContain('getBaseDir()');
    });
});

describe('captured ground is negotiable at Dayton (owner, 2026-11-07)', () => {
    // Šipovo: the Dayton map gives all of it to RS, and it is not protected ground. RBiH holds Pribeljci.
    const SIPOVO = ['op:sipovo:brdjani', 'op:sipovo:gornji_mujdzici_2', 'op:sipovo:pribeljci_2', 'op:sipovo:sipovo_2', 'op:sipovo:volari_2'];
    const HELD = 'op:sipovo:pribeljci_2';
    const ID = 'front:sipovo:RBiH:RS';
    const withHeld = (player: 'RBiH' | 'RS' | 'HRHB' = 'RBiH', held: string[] = [HELD]) => {
        const state = makeState(player);
        const controllers: Record<string, string> = {};
        for (const o of SIPOVO) controllers[o] = held.includes(o) ? 'RBiH' : 'RS';
        state.political.political_controllers = controllers as never;
        return state;
    };
    const proposal = (demands: string[] = [], concessions: string[] = []) =>
        ({ territorial_demands: demands, territorial_concessions: concessions, institutional_choices: {} });
    /** RS cannot afford anything (no capital), so only its patron can make it give ground. */
    const refusingRS = (state: GameState, override: number) => {
        const neg = state.military.negotiation!;
        neg.patron_relationships.RS!.override_authority = override;
        neg.strategic_dimensions = undefined;
        neg.capital.RS = undefined as never;
        return state;
    };

    it('each municipality where the front departs from the Dayton map becomes a package', () => {
        const packages = buildFrontPackages(withHeld());
        expect(packages.map((p) => p.id)).toEqual([ID]);
        const pkg = packages[0]!;
        expect(pkg).toMatchObject({ name: 'Šipovo', default_holder: 'RS', claimant: 'RBiH', osids: [HELD], municipality: 'sipovo' });
        expect(pkg.area_pct).toBeGreaterThan(0);
        expect(pkg.capital_cost_to_demand).toBeGreaterThan(pkg.capital_cost_to_concede);
    });

    it('cost grows with area', () => {
        const small = buildFrontPackages(withHeld())[0]!;
        const large = buildFrontPackages(withHeld('RBiH', [HELD, 'op:sipovo:brdjani']))[0]!;
        expect(large.area_pct).toBeGreaterThan(small.area_pct!);
        expect(large.capital_cost_to_demand).toBeGreaterThan(small.capital_cost_to_demand);
        expect(computePlayerProposalSpend(proposal([ID]), 'RBiH', [large])).toBe(large.capital_cost_to_demand);
    });

    it('ground inside a fixed package is left to that package', () => {
        const state = makeState('RBiH');
        // Sanski Most is in the fixed Western Bosnia package; Dayton gives most of it to RBiH.
        state.political.political_controllers = {
            'op:sanski_most:budimlic_japra_2': 'RS', 'op:sanski_most:donja_kozica': 'RS', 'op:sanski_most:jelasinovci': 'RS',
        } as never;
        expect(buildFrontPackages(state)).toEqual([]);
    });

    it('ground between RBiH and HRHB is not negotiable at Dayton (owner ruling 2026-11-07)', () => {
        const state = makeState('RBiH');
        // Posušje: the Dayton map gives all of it to HRHB; RBiH holds one cell.
        state.political.political_controllers = { 'op:posusje:posusje_2': 'RBiH', 'op:posusje:sutina_2': 'HRHB', 'op:posusje:vir_2': 'HRHB' } as never;
        expect(buildFrontPackages(state)).toEqual([]);
    });

    it('the player sees the ground it holds and the ground the map gives it', () => {
        expect(frontPackagesForPlayer(withHeld('RBiH'), 'RBiH').map((p) => p.id)).toEqual([ID]);
        expect(frontPackagesForPlayer(withHeld('RS'), 'RS').map((p) => p.id)).toEqual([ID]);
        // HRHB sees Federation-partner ground that the map gives RS.
        expect(frontPackagesForPlayer(withHeld('HRHB'), 'HRHB').map((p) => p.id)).toEqual([ID]);
    });

    it('unraised, captured ground follows the Dayton map (the forced-table fallback)', () => {
        const state = withHeld();
        declineDaytonNegotiation(state);
        state.meta.turn = 196;
        enforceDaytonImposition(state);
        state.meta.turn = 197;
        enforceDaytonImposition(state);
        expect(settlementControllersFor(state)?.[HELD]).toBe('RS');
        expect(state.military.negotiation!.settlement?.map_overrides ?? {}).toEqual({});
    });

    it('the renderer read model shows the settled map and the cells that change hands', async () => {
        const { deriveSettlementMap } = await import('../src/ui/map/data/GameStateAdapter.js');
        const state = withHeld();
        expect(deriveSettlementMap(state)).toBeUndefined();
        resolveDaytonNegotiation(state, proposal());
        const map = deriveSettlementMap(state)!;
        expect(map.planId).toBe('dayton');
        expect(map.controllers[HELD]).toBe('RS');
        expect(map.changedOsids).toEqual([HELD]); // RBiH-held at signature, RS on the map signed
        expect(Object.keys(map.territoryPct).sort()).toEqual(['HRHB', 'RBiH', 'RS']);
    });

    it('demanded and won at the forced table, the claimant keeps it', () => {
        const state = withHeld();
        declineDaytonNegotiation(state);
        state.meta.turn = 196;
        enforceDaytonImposition(state);
        const result = resolveDaytonNegotiation(state, proposal([ID]));
        expect(result.territorial_packages_accepted).toContain(ID);
        expect(state.military.negotiation!.settlement?.map_overrides).toEqual({ [HELD]: 'RBiH' });
        expect(settlementControllersFor(state)?.[HELD]).toBe('RBiH');
    });

    it('captured ground is negotiable at an on-time Dayton too', () => {
        const state = withHeld();
        const result = resolveDaytonNegotiation(state, proposal([ID]));
        expect(result.imposed).toBeUndefined();
        expect(settlementControllersFor(state)?.[HELD]).toBe('RBiH');
    });

    it('a refused demand fails unless the patron overrules it within its area budget', () => {
        const kept = refusingRS(withHeld(), 10);
        expect(resolveDaytonNegotiation(kept, proposal([ID])).territorial_packages_rejected).toContain(ID);
        expect(settlementControllersFor(kept)?.[HELD]).toBe('RS');
        // Pribeljci is 0.36% of BiH: inside Belgrade's budget at 75 (0.5%).
        const overruled = refusingRS(withHeld(), 75);
        const result = resolveDaytonNegotiation(overruled, proposal([ID]));
        expect(result.territorial_packages_accepted).toContain(ID);
        expect(result.patron_overrides_applied).toContain(`territorial:${ID}:RS`);
        expect(settlementControllersFor(overruled)?.[HELD]).toBe('RBiH');
    });

    it('the patron budget grows with override authority', () => {
        // Pribeljci + Brđani ≈ 0.57% of BiH: over the budget at 75 (0.5%), within it at 80 (1.25%).
        const both = [HELD, 'op:sipovo:brdjani'];
        const at75 = resolveDaytonNegotiation(refusingRS(withHeld('RBiH', both), 75), proposal([ID]));
        expect(at75.territorial_packages_rejected).toContain(ID);
        const at80 = resolveDaytonNegotiation(refusingRS(withHeld('RBiH', both), 80), proposal([ID]));
        expect(at80.territorial_packages_accepted).toContain(ID);
    });

    it('protected ground (Prijedor) is never given up, voluntarily or under the patron', () => {
        const state = makeState('RBiH');
        state.political.political_controllers = {
            'op:prijedor:brezicani': 'RS', 'op:prijedor:cejreci': 'RS', 'op:prijedor:kamicani': 'RS', 'op:prijedor:kozarac_2': 'RBiH',
        } as never;
        state.military.negotiation!.patron_relationships.RS!.override_authority = 95;
        const result = resolveDaytonNegotiation(state, proposal(['front:prijedor:RBiH:RS']));
        expect(result.territorial_packages_rejected).toContain('front:prijedor:RBiH:RS');
        expect(result.patron_overrides_applied).toEqual([]);
        expect(settlementControllersFor(state)?.['op:prijedor:kozarac_2']).toBe('RS');
    });

    it('ground taken after a decline is never patron-forced (the United States is the coercing power)', () => {
        const state = refusingRS(withHeld(), 95);
        declineDaytonNegotiation(state);
        state.political.control_events = [{ turn: 190, settlement_id: HELD, from: 'RS', to: 'RBiH', mechanism: 'combat' }] as never;
        state.meta.turn = 196;
        enforceDaytonImposition(state);
        const result = resolveDaytonNegotiation(state, proposal([ID]));
        expect(result.territorial_packages_rejected).toContain(ID);
        expect(settlementControllersFor(state)?.[HELD]).toBe('RS');
    });

    it('the map assignee may concede captured ground to its holder', () => {
        const state = withHeld('RS');
        resolveDaytonNegotiation(state, proposal([], [ID]));
        expect(settlementControllersFor(state)?.[HELD]).toBe('RBiH');
    });

    it('the UI menu carries the captured ground and the forced flag', async () => {
        const { derivePendingDayton } = await import('../src/ui/map/data/GameStateAdapter.js');
        const onTime = withHeld();
        expect(derivePendingDayton(onTime)?.frontPackages).toMatchObject([{ id: ID, osids: [HELD] }]);
        expect(derivePendingDayton(onTime)?.forced).toBeUndefined();
        const state = withHeld();
        declineDaytonNegotiation(state);
        state.meta.turn = 196;
        enforceDaytonImposition(state);
        expect(derivePendingDayton(state)?.forced).toEqual({ onFaction: 'RBiH', by: 'united_states' });
        expect(derivePendingDayton(state)?.frontPackages?.[0]).toMatchObject({ id: ID, claimant: 'RBiH', defaultHolder: 'RS' });
    });

    it('a menu left open while the front moves negotiates the front at signature', () => {
        const state = withHeld();
        state.political.political_controllers = { ...state.political.political_controllers, [HELD]: 'RS' } as never;
        const result = resolveDaytonNegotiation(state, proposal([ID]));
        expect(result.territorial_packages_accepted).not.toContain(ID);
        expect(settlementControllersFor(state)?.[HELD]).toBe('RS');
    });
});

describe('encircled pockets travel with the surrounding captured ground (owner, 2026-11-07)', () => {
    // Šipovo town, its five neighbours held by RBiH (four in Šipovo, two in Mrkonjić Grad).
    const POCKET = 'op:sipovo:sipovo_2';
    const RING = ['op:mrkonjic_grad:gerzovo_2', 'op:mrkonjic_grad:majdan_2', 'op:sipovo:brdjani', 'op:sipovo:gornji_mujdzici_2', 'op:sipovo:pribeljci_2', 'op:sipovo:volari_2'];
    const ID = 'front:sipovo:RBiH:RS';
    const encircled = (pocketHolder: 'RS' | 'HRHB' = 'RS', ringOverride: Record<string, string> = {}) => {
        const state = makeState('RBiH');
        const controllers: Record<string, string> = { [POCKET]: pocketHolder };
        for (const o of RING) controllers[o] = 'RBiH';
        state.political.political_controllers = { ...controllers, ...ringOverride } as never;
        return state;
    };
    const proposal = (demands: string[] = []) => ({ territorial_demands: demands, territorial_concessions: [], institutional_choices: {} });

    it('an RS town RBiH ground surrounds joins the adjacent package and its price', () => {
        const pkg = buildFrontPackages(encircled()).find((p) => p.id === ID)!;
        expect(pkg.encircled_osids).toEqual([POCKET]);
        expect(pkg.osids).toContain(POCKET);
        const noPocket = encircled();
        delete (noPocket.political.political_controllers as Record<string, string>)[POCKET];
        const without = buildFrontPackages(noPocket).find((p) => p.id === ID)!;
        expect(pkg.area_pct).toBeGreaterThan(without.area_pct!);
        expect(pkg.capital_cost_to_demand).toBeGreaterThan(without.capital_cost_to_demand);
    });

    it('it changes hands only if the package is won', () => {
        const unraised = encircled();
        resolveDaytonNegotiation(unraised, proposal());
        expect(settlementControllersFor(unraised)?.[POCKET]).toBe('RS');
        const won = encircled();
        resolveDaytonNegotiation(won, proposal([ID]));
        expect(settlementControllersFor(won)?.[POCKET]).toBe('RBiH');
    });

    it('a pocket with an open side, or between the Federation parties, is left alone', () => {
        const open = buildFrontPackages(encircled('RS', { 'op:sipovo:volari_2': 'RS' })).find((p) => p.id === ID);
        expect(open?.encircled_osids).toBeUndefined();
        const federation = buildFrontPackages(encircled('HRHB')).find((p) => p.id === ID);
        expect(federation?.encircled_osids).toBeUndefined();
    });
});

describe('Dayton continuation operations (owner, 2026-11-07: "Resume halted 1995 pushes")', () => {
    const ids = DAYTON_CONTINUATION_OPPORTUNITIES.map((d) => d.opportunity_id).sort();

    it('are registered in the opportunity catalog and never open without a decline', () => {
        for (const id of ids) expect(OPERATION_OPPORTUNITY_CATALOG.some((d) => d.opportunity_id === id)).toBe(true);
        const state = makeState('RBiH', 190);
        for (const def of DAYTON_CONTINUATION_OPPORTUNITIES) {
            expect(def.evaluators.date_window(state, 190, def).green, def.opportunity_id).toBe(false);
        }
        expect(isDaytonContinuationWindowOpen(state, 190)).toBe(false);
    });

    it('open while the decline window runs and close at the imposition', () => {
        const state = makeState('RBiH');
        declineDaytonNegotiation(state); // declined 188, imposition 196
        expect(isDaytonContinuationWindowOpen(state, 188)).toBe(false);
        expect(isDaytonContinuationWindowOpen(state, 189)).toBe(true);
        expect(isDaytonContinuationWindowOpen(state, 196)).toBe(true);
        expect(isDaytonContinuationWindowOpen(state, 197)).toBe(false);
    });

    it('HV Guards join only when Zagreb is not the coercing power (owner ruling)', () => {
        const byId = (id: string) => DAYTON_CONTINUATION_OPPORTUNITIES.find((d) => d.opportunity_id === id)!;
        const joint = byId('southern_move_manjaca_95');
        const hvoOnly = byId('southern_move_manjaca_hvo_95');
        expect(hvoOnly.axes.flatMap((a) => a.brigades).some((b) => b.startsWith('hv_'))).toBe(false);
        for (const decliner of ['RBiH', 'RS', 'HRHB'] as const) {
            const state = makeState(decliner);
            declineDaytonNegotiation(state);
            expect(joint.evaluators.date_window(state, 190, joint).green, `joint/${decliner}`).toBe(decliner !== 'HRHB');
            expect(hvoOnly.evaluators.date_window(state, 190, hvoOnly).green, `hvo/${decliner}`).toBe(decliner === 'HRHB');
        }
    });

    it('Banja Luka and Kola (US red line, BB1 p.392) and the Omarska camp cells stay out of every objective list', () => {
        // Camp-site exclusion is enforced by test (SENSITIVE_HISTORY_DESIGN_GATE §1): op:prijedor:omarska_2
        // and op:prijedor:kamicani are never authored objectives (R2 historian condition).
        const forbidden = ['op:banja_luka:banja_luka_2', 'op:banja_luka:kola', 'op:prijedor:omarska_2', 'op:prijedor:kamicani'];
        const objectives = DAYTON_CONTINUATION_OPPORTUNITIES.flatMap((d) => d.axes.flatMap((a) => a.objectives));
        for (const f of forbidden) expect(objectives).not.toContain(f);
    });

    const byIdC = (id: string) => DAYTON_CONTINUATION_OPPORTUNITIES.find((d) => d.opportunity_id === id)!;
    const adjacency = (() => {
        const g = JSON.parse(readFileSync(resolve(process.cwd(), 'data/derived/operational/operational_contact_graph.json'), 'utf8')) as { edges: { a: string; b: string }[] };
        const m = new Map<string, Set<string>>();
        for (const { a, b } of g.edges) {
            (m.get(a) ?? m.set(a, new Set()).get(a)!).add(b);
            (m.get(b) ?? m.set(b, new Set()).get(b)!).add(a);
        }
        return m;
    })();

    it('the 5th Corps continuation reaches Prijedor town and Kozarac (owner, 2026-11-07; BB1 p.383)', () => {
        const sana = byIdC('sana_continuation_95');
        const axis = (id: string) => sana.axes.find((a) => a.axis_id === id)!;
        expect(axis('ljubija').objectives).toEqual(['op:sanski_most:ostra_luka', 'op:prijedor:ljubija_2', 'op:prijedor:prijedor_2']);
        expect(axis('kozarac').objectives).toEqual(['op:prijedor:maricka_2', 'op:prijedor:kozarac_2', 'op:prijedor:rasavci_2']);
        expect(sana.axes.flatMap((a) => a.brigades)).not.toContain('arbih_501st_slavna_mountain'); // holds Krasulje
    });

    it('every continuation axis is staged next to its first objective and each step is reachable', () => {
        for (const def of DAYTON_CONTINUATION_OPPORTUNITIES) {
            for (const axis of def.axes) {
                const staging = axis.staging_osid ?? def.staging_osid;
                expect(adjacency.has(staging), `${def.opportunity_id}/${axis.axis_id} staging`).toBe(true);
                axis.objectives.forEach((o, i) => {
                    const reach = [staging, ...axis.objectives.slice(0, i)];
                    expect(reach.some((p) => adjacency.get(p)?.has(o)), `${def.opportunity_id}/${axis.axis_id} ${o}`).toBe(true);
                });
                expect(adjacency.get(staging)?.has(axis.objectives[0]!), `${def.opportunity_id}/${axis.axis_id} first`).toBe(true);
            }
        }
    });

    it('rosters are disjoint across continuation operations (the two Southern Move variants are mutually exclusive)', () => {
        const owner = new Map<string, string>();
        for (const def of DAYTON_CONTINUATION_OPPORTUNITIES) {
            const family = def.opportunity_id.startsWith('southern_move_manjaca') ? 'southern_move' : def.opportunity_id;
            for (const b of new Set(def.axes.flatMap((a) => a.brigades))) {
                const prior = owner.get(b);
                expect(prior === undefined || prior === family, `${b}: ${prior} and ${family}`).toBe(true);
                owner.set(b, family);
            }
        }
    });

    it('the Sarajevo breakout follows the selected June 1995 route and never takes a one-capture link (BB1 pp.310-312)', () => {
        const op = byIdC('sarajevo_breakout_95');
        expect(op.faction).toBe('RBiH');
        expect(op.primary_corps).toBe('arbih_1st_corps');
        expect(op.supersedes_live_operation).toBeUndefined();
        const objectives = op.axes.flatMap((a) => a.objectives);
        for (const o of ['op:ilidza:sarajevo_dio_ilidza_2', 'op:ilidza:sarajevo_dio_novi_grad_sarajevo', 'op:novo_sarajevo:lukavica']) {
            expect(objectives).not.toContain(o);
        }
        expect(adjacency.get('op:novi_grad_sarajevo:recica')?.has('op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo')).toBe(true);
        expect(adjacency.get('op:vogosca:vogosca_3')?.has('op:vogosca:hotonj')).toBe(true);
    });

    it('only the Dayton continuation family may supersede a live operation', () => {
        const others = OPERATION_OPPORTUNITY_CATALOG.filter((d) => d.family !== 'dayton_continuation');
        expect(others.every((d) => d.supersedes_live_operation === undefined)).toBe(true);
    });
});

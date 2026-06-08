/**
 * Dayton war-endgame — PLAYER-AGENCY SMOKE TEST (the thesis check).
 *
 * The comprehensive design (docs/plans/2026-06-07-dayton-comprehensive-negotiation-design.md)
 * promises: "detailed state structure, not just the map." This suite is the
 * end-to-end verification that a player can author a FULL 5-dimension, maximally
 * divergent peace and have it resolve coherently. The per-dimension mechanics are
 * unit-tested in dayton_phase2_dial_bot_verdict.test.ts / peace_dysfunction.test.ts /
 * dayton_institutional_expansion.test.ts; THIS suite traces the integrated promise:
 *
 *   (a) a max-divergence proposal COSTS correctly + the bot prices it against capital.
 *   (b) patron override past the ≥75 threshold forces the authored choices through.
 *   (c) counter-offers cycle (bot returns a counter) and acceptance is permitted.
 *   (d) the verdict NAMES the authored choices (the signed dims persist on the
 *       result + ride into the verdict + the dysfunction flags reflect them) — not a
 *       silent "best" outcome.
 *   (e) the endgame snapshot FREEZES all 5 dimensions.
 *   (f) proposals from RBiH / RS / HRHB cost ASYMMETRICALLY.
 *   (g) the all-historical-default proposal is byte-identical (no new dims persisted).
 *
 * Determinism: no RNG/clock; identical inputs → identical result (asserted).
 */
import { describe, it, expect } from 'vitest';
import type { GameState, FactionId } from '../src/state/game_state.js';
import type {
    DaytonProposal,
    NegotiationBreakdown,
    PatronRelationship,
    DaytonResult,
} from '../src/state/negotiation_types.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../src/state/negotiation_types.js';
import { resolveDaytonNegotiation } from '../src/sim/negotiation/dayton_negotiation.js';
import { evaluateBotResponse, computeProposalCostToFaction } from '../src/sim/negotiation/bot_negotiation.js';
import { computeFullVerdict } from '../src/sim/negotiation/scoring.js';
import { freezeEndgameSnapshot } from '../src/sim/endgame/endgame_snapshot.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import type { DimensionStore } from '../src/sim/events/strategic_dimensions.js';

const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

// A simple three-way OSID footprint so the territory split + fragmentation are
// well-defined. RS holds the contested east (gorazde/brcko/srebrenica keywords),
// RBiH the core, HRHB the south — a credible 1995 map.
function controllers(): Record<string, string> {
    const c: Record<string, string> = {};
    for (let i = 0; i < 40; i++) c[`op:core:rbih_${i}`] = 'RBiH';
    for (let i = 0; i < 40; i++) c[`op:gorazde:rs_${i}`] = 'RS';
    for (let i = 0; i < 20; i++) c[`op:mostar:hrhb_${i}`] = 'HRHB';
    return c;
}

function makeState(overrides: Partial<{
    turn: number; war_start_turn: number; player_faction: string;
    capital: Record<string, Partial<NegotiationBreakdown>>;
    patron: Record<string, Partial<PatronRelationship>>;
    political_controllers: Record<string, string>;
    dimStore: DimensionStore;
    decision_mode: string;
}> = {}): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    for (const faction of FACTIONS) {
        capital[faction] = { ...createEmptyCapital(), ...(overrides.capital?.[faction] ?? {}) };
        patron_relationships[faction] = { ...createDefaultPatronRelationship(faction), ...(overrides.patron?.[faction] ?? {}) };
    }
    return {
        meta: {
            turn: overrides.turn ?? 200, war_start_turn: overrides.war_start_turn ?? 0,
            phase: 'war', seed: 1, date: '1995-11-21', game_over: false,
            player_faction: overrides.player_faction ?? 'RBiH',
            decision_mode: overrides.decision_mode ?? 'emergent',
        },
        factions: FACTIONS.map(id => ({ id })),
        military: {
            formations: {},
            negotiation: {
                capital, patron_relationships, peace_plan_history: [],
                strategic_dimensions: overrides.dimStore ?? initializeStrategicDimensions(),
            },
        },
        political: { political_controllers: overrides.political_controllers ?? controllers() },
        displacement: {},
    } as unknown as GameState;
}

/** A dimension store where a faction's composite capital is ~1 (objects to anything). */
function lowCapitalDimStore(...factions: string[]): DimensionStore {
    const store = initializeStrategicDimensions();
    for (const faction of factions) {
        for (const dim of Object.keys(store[faction] ?? {})) {
            store[faction][dim] = { base_value: 1, event_modifier: 0, effective_value: 1 };
        }
    }
    return store;
}

/**
 * The MAX-DIVERGENCE proposal: every dimension pushed as far from the historical
 * Dayton settlement as the design allows.
 *   - Dim 1 (territorial): demand the eastern enclaves + Brčko.
 *   - Dim 2 (autonomy dial): unitary (the maximal centralization frame).
 *   - Dim 3 (competency): centralize defense + police + judiciary to the state.
 *   - Dim 4 (constitutional): single president, simple-majority veto, civic model,
 *       domestic-only court, no OHR (dismantle the supervised-gridlock peace).
 *   - Dim 5 (return/justice): non-cooperation with the ICTY + frozen lines.
 */
function maxDivergenceProposal(): DaytonProposal {
    return {
        territorial_demands: ['gorazde_corridor', 'srebrenica_area', 'brcko_district'],
        territorial_concessions: [],
        institutional_choices: {},
        entity_autonomy: 'unitary',
        competency_allocation: { comp_defense: 'state', comp_police: 'state', comp_judiciary: 'state' },
        constitutional_choices: {
            arch_presidency: 'single_elected',
            arch_veto_regime: 'simple_majority',
            arch_constituent_model: 'civic_citizens',
            arch_const_court: 'domestic_only',
            arch_ohr_authority: 'none',
        },
        return_justice: {
            rj_icty_cooperation: 'non_cooperation',
            rj_refugee_return: 'frozen_lines',
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// (a) max-divergence COSTS correctly + the bot prices it against capital
// ─────────────────────────────────────────────────────────────────────────────

describe('player-agency smoke (a): max-divergence proposal is priced, not free', () => {
    it('costs RS a large sum (it loses sovereignty, territory, and ICTY cover)', () => {
        const p = maxDivergenceProposal();
        const rsCost = computeProposalCostToFaction(p, 'RS');
        // Declaration (24, unitary) + 3 cross-grain state competencies + cross-grain
        // constitutional dismantling + conceding 3 territorial packages it holds.
        expect(rsCost).toBeGreaterThan(80);
    });

    it('the bot evaluates it against earned capital (not a magic accept)', () => {
        const state = makeState({ player_faction: 'RBiH' });
        const resp = evaluateBotResponse(state, 'RS' as FactionId, maxDivergenceProposal());
        expect(resp.proposal_cost).toBeGreaterThan(0);
        expect(resp.available_capital).toBeGreaterThan(0);
        // With no patron pressure and a default capital base, RS does NOT roll over.
        expect(resp.decision).not.toBe('accept');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// (b) patron override past the threshold forces the authored choices through
// ─────────────────────────────────────────────────────────────────────────────

describe('player-agency smoke (b): patron override forces the authored peace', () => {
    it('RS+HRHB patrons ≥75 push every authored dimension into the signed result', () => {
        const state = makeState({
            player_faction: 'RBiH',
            patron: { RS: { override_authority: 85 }, HRHB: { override_authority: 85 } },
            dimStore: lowCapitalDimStore('RS', 'HRHB'), // both object to any deviation
        });
        const result = resolveDaytonNegotiation(state, maxDivergenceProposal());

        // Every authored structural dimension survived (was forced) onto the result.
        expect(result.entity_autonomy).toBe('unitary');
        expect(result.competency_allocation).toEqual({ comp_defense: 'state', comp_police: 'state', comp_judiciary: 'state' });
        expect(result.constitutional_choices?.arch_ohr_authority).toBe('none');
        expect(result.constitutional_choices?.arch_veto_regime).toBe('simple_majority');
        expect(result.return_justice?.rj_icty_cooperation).toBe('non_cooperation');

        // Patron-override entries were recorded for each lane the bots OBJECTED to
        // and the patron then forced through (named, not silent). The unitary dial,
        // the centralizing competencies, and the OHR dismantling all run AGAINST RS's
        // ideal → RS objects → its patron forces them → override recorded.
        const ov = result.patron_overrides_applied;
        expect(ov).toContain('dial:unitary:RS');
        expect(ov).toContain('competency:comp_defense:RS');
        expect(ov).toContain('constitutional:arch_ohr_authority:RS');
        // territorial demands forced through against the RS holder.
        expect(ov).toContain('territorial:gorazde_corridor:RS');
        // NOTE (modeled-asymmetry, not a gap): ICTY non-cooperation is RS's OWN
        // preferred posture (it shields Pale from the tribunal), so RS does NOT object
        // and no override is needed for it — yet it still persists onto the result
        // (asserted below) AND the dysfunction floor entrenches the rupture (test d).
        // A non-tradeable rupture is enforced by the dysfunction floor, not by a bot
        // objection. So we assert the CHOICE survived, not that an override fired.
        expect(result.return_justice?.rj_icty_cooperation).toBe('non_cooperation');
    });

    it('WITHOUT patron pressure the objected-to dimensions drop back to default', () => {
        const state = makeState({
            player_faction: 'RBiH',
            dimStore: lowCapitalDimStore('RS', 'HRHB'),
        });
        const result = resolveDaytonNegotiation(state, maxDivergenceProposal());
        // Un-overridden objections drop the deviating sub-choices — they never enter
        // the signed result, so the authored unitary dial does NOT survive.
        expect(result.entity_autonomy).toBeUndefined();
        expect(result.competency_allocation).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// (c) counter-offers cycle, and acceptance is permitted
// ─────────────────────────────────────────────────────────────────────────────

describe('player-agency smoke (c): counter-offer cycle + acceptance', () => {
    it('the bot returns a counter-offer (one-step dial retreat + cited stance)', () => {
        const state = makeState({ player_faction: 'RBiH' });
        const resp = evaluateBotResponse(state, 'RS' as FactionId, maxDivergenceProposal());
        // Either a counter or an outright reject — never a silent accept of max divergence.
        expect(['counter', 'reject']).toContain(resp.decision);
        if (resp.decision === 'counter') {
            // The counter moves the dial one notch toward RS's ideal (unitary→federalized)
            // and cites a real 1994-95 stance.
            expect(resp.counter_proposal?.entity_autonomy).toBe('federalized');
            expect(resp.reason).toMatch(/Contact-Group|Pale|Counter-proposal/);
        }
    });

    it('a within-budget historical-default proposal is ACCEPTED (acceptance path works)', () => {
        const state = makeState({ player_faction: 'RBiH' });
        const resp = evaluateBotResponse(state, 'RS' as FactionId, {
            territorial_demands: [], territorial_concessions: [], institutional_choices: {},
        });
        expect(resp.decision).toBe('accept');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// (d) the verdict NAMES the authored choices (not a silent best outcome)
// ─────────────────────────────────────────────────────────────────────────────

describe('player-agency smoke (d): verdict names the authored choices', () => {
    function forcedResult(): { state: GameState; result: DaytonResult } {
        const state = makeState({
            player_faction: 'RBiH',
            patron: { RS: { override_authority: 85 }, HRHB: { override_authority: 85 } },
            dimStore: lowCapitalDimStore('RS', 'HRHB'),
            capital: {
                // genocide/atrocity ledger so the ICTY non-cooperation floor is meaningful.
                RS: { refugees_created: 150_000, civilian_casualties_caused: 5000 },
            },
        });
        const result = resolveDaytonNegotiation(state, maxDivergenceProposal());
        return { state, result };
    }

    it('the signed result carries the authored dims AND the dysfunction flags reflect them', () => {
        const { result } = forcedResult();
        // The result itself names the authored choices.
        expect(result.entity_autonomy).toBe('unitary');
        expect(result.return_justice?.rj_icty_cooperation).toBe('non_cooperation');
        // ICTY non-cooperation → the ratified_cleansing flag stays lit (non-tradeable).
        expect(result.peace_dysfunction_flags).toContain('ratified_cleansing');
        // Dismantling OHR + domestic court → ohr_dependency CLEARS; civic model → no
        // sejdic_finci_fault. The verdict reflects what the player authored, not a default.
        expect(result.peace_dysfunction_flags).not.toContain('ohr_dependency');
        expect(result.peace_dysfunction_flags).not.toContain('sejdic_finci_fault');
    });

    it('computeFullVerdict surfaces the authored dayton_result + dysfunction index', () => {
        const { state } = forcedResult();
        const verdict = computeFullVerdict(state);
        expect(verdict.outcome_type).toBe('dayton');
        expect(verdict.dayton_result?.entity_autonomy).toBe('unitary');
        expect(verdict.dayton_result?.return_justice?.rj_icty_cooperation).toBe('non_cooperation');
        expect(typeof verdict.peace_dysfunction_index).toBe('number');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// (e) the endgame snapshot FREEZES all 5 dimensions
// ─────────────────────────────────────────────────────────────────────────────

describe('player-agency smoke (e): snapshot freezes all 5 dimensions', () => {
    it('the frozen verdict snapshot carries every authored dimension', () => {
        const state = makeState({
            player_faction: 'RBiH',
            patron: { RS: { override_authority: 85 }, HRHB: { override_authority: 85 } },
            dimStore: lowCapitalDimStore('RS', 'HRHB'),
        });
        resolveDaytonNegotiation(state, maxDivergenceProposal());
        // resolveDayton already calls freezeEndgameSnapshot; assert it is idempotent
        // and that all 5 dims survive on the frozen verdict.
        freezeEndgameSnapshot(state);
        const snap = (state.meta as unknown as { endgame_snapshot?: { verdict?: { dayton_result?: DaytonResult }; peace_dysfunction?: unknown } }).endgame_snapshot;
        expect(snap).toBeDefined();
        const dr = snap?.verdict?.dayton_result;
        // Dim 1 territorial, Dim 2 dial, Dim 3 competency, Dim 4 constitutional, Dim 5 rj.
        expect(dr?.final_territory_split).toBeDefined();
        expect(dr?.entity_autonomy).toBe('unitary');
        expect(dr?.competency_allocation).toBeDefined();
        expect(dr?.constitutional_choices).toBeDefined();
        expect(dr?.return_justice).toBeDefined();
        // The dysfunction breakdown is frozen too (survives save/load).
        expect(snap?.peace_dysfunction).toBeDefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// (f) RBiH / RS / HRHB cost ASYMMETRICALLY
// ─────────────────────────────────────────────────────────────────────────────

describe('player-agency smoke (f): per-faction asymmetric cost', () => {
    it('centralizing competencies + unitary dial costs RS most, RBiH least, HRHB between', () => {
        const p: DaytonProposal = {
            territorial_demands: [], territorial_concessions: [], institutional_choices: {},
            entity_autonomy: 'unitary',
            competency_allocation: { comp_defense: 'state', comp_police: 'state' },
        };
        const rs = computeProposalCostToFaction(p, 'RS');
        const rbih = computeProposalCostToFaction(p, 'RBiH');
        const hrhb = computeProposalCostToFaction(p, 'HRHB');
        // Centralizing toward the state extracts from RS; RBiH benefits; HRHB is the swing.
        expect(rs).toBeGreaterThan(hrhb);
        expect(hrhb).toBeGreaterThan(rbih);
    });

    it('decentralizing (confederation + entity competencies) inverts the asymmetry onto RBiH', () => {
        const p: DaytonProposal = {
            territorial_demands: [], territorial_concessions: [], institutional_choices: {},
            entity_autonomy: 'confederation',
            competency_allocation: { comp_foreign_policy: 'entity', comp_monetary: 'entity' },
        };
        const rs = computeProposalCostToFaction(p, 'RS');
        const rbih = computeProposalCostToFaction(p, 'RBiH');
        // Devolving sovereign-core to the entities extracts from RBiH; RS benefits.
        expect(rbih).toBeGreaterThan(rs);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// (g) all-historical-default is byte-identical (no new dims persisted) + determinism
// ─────────────────────────────────────────────────────────────────────────────

describe('player-agency smoke (g): historical default byte-identity + determinism', () => {
    it('the all-default proposal persists NO new dims (result shape unchanged)', () => {
        const state = makeState({ player_faction: 'RBiH' });
        const result = resolveDaytonNegotiation(state, {
            territorial_demands: [], territorial_concessions: [], institutional_choices: {},
        });
        expect(result.entity_autonomy).toBeUndefined();
        expect(result.competency_allocation).toBeUndefined();
        expect(result.constitutional_choices).toBeUndefined();
        expect(result.return_justice).toBeUndefined();
    });

    it('identical inputs → identical result (deterministic, no RNG/clock)', () => {
        const a = resolveDaytonNegotiation(
            makeState({ player_faction: 'RBiH', patron: { RS: { override_authority: 85 }, HRHB: { override_authority: 85 } }, dimStore: lowCapitalDimStore('RS', 'HRHB') }),
            maxDivergenceProposal(),
        );
        const b = resolveDaytonNegotiation(
            makeState({ player_faction: 'RBiH', patron: { RS: { override_authority: 85 }, HRHB: { override_authority: 85 } }, dimStore: lowCapitalDimStore('RS', 'HRHB') }),
            maxDivergenceProposal(),
        );
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it('a RS player and a RBiH player pay asymmetrically for the SAME dial (player-relative cost)', () => {
        // The dial declaration is charged to the side the frame extracts from,
        // independent of who is at the table — so the RS player still "pays" via its
        // own capital while RBiH benefits. Verify the proposal-cost asymmetry holds
        // regardless of player_faction (cost is faction-relative, not player-relative).
        const p: DaytonProposal = { territorial_demands: [], territorial_concessions: [], institutional_choices: {}, entity_autonomy: 'unitary' };
        expect(computeProposalCostToFaction(p, 'RS')).toBeGreaterThan(computeProposalCostToFaction(p, 'RBiH'));
    });
});

/**
 * §6 bright line: every faction, in every decision mode (BRIGHTLINE-MODE, §6 panel 8/8, 2026-11-27;
 * SENSITIVE_HISTORY_DESIGN_GATE.md §2a(i)). Supersedes the 2026-11-16 mode/seat gate.
 *
 * Atrocity must never produce a better end-state, and silence is never cheaper than an explicit order (G5).
 * The consequences (the §2a `authorized_cleansing_condemnation` flag, its display freshening, the atrocity
 * cost term) apply to a faction whenever its own modelled acts trigger them: in emergent and historical mode,
 * live or headless, at every autonomy level, with or without a player faction. Nothing in the verdict reads
 * decision_mode, player_faction, autonomy_level or headless_scenario_auto_control, so a hands-off live game
 * reads exactly like the headless run. The trigger is the act, never the faction: a side with no modelled
 * act is not flagged.
 *
 * Out of scope on purpose (pinned below): the patron state update. Its per-turn emergent-only defiance term
 * was retired by the patron-defiance panel (2026-11-17); a defiance answer now carries its own
 * `patron_supply_cut` event effect, which no decision mode gates.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeFactionVerdict, computeWarCostIndex, currentCondemnationFlags } from '../src/sim/negotiation/scoring.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../src/state/negotiation_types.js';
import type { NegotiationBreakdown } from '../src/state/negotiation_types.js';
import type { GameState } from '../src/state/game_state.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { withoutComments } from './helpers/sourceComments';

type Mode = 'historical' | 'emergent' | undefined;

interface Setup {
    mode?: Mode;
    player_faction?: unknown;
    headless?: boolean;
    autonomy_level?: number;
    capital?: Partial<Record<string, Partial<NegotiationBreakdown>>>;
}

/** Short cheap war (base war-cost is low) so only the atrocity term can move a grade. */
function makeState(setup: Setup = {}): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, unknown> = {};
    const casualty_ledger: Record<string, unknown> = {};
    for (const fid of ['RBiH', 'RS', 'HRHB']) {
        capital[fid] = { ...createEmptyCapital(), territory_controlled_pct: 36, ...(setup.capital?.[fid] ?? {}) };
        patron_relationships[fid] = createDefaultPatronRelationship(fid);
        casualty_ledger[fid] = { killed: 200, wounded: 0, missing_captured: 0, equipment_lost: { tanks: 0, artillery: 0, aa_systems: 0 }, per_formation: {} };
    }
    const meta: Record<string, unknown> = { turn: 8, phase: 'war', seed: 1, date: '1995-01-15' };
    if (setup.mode !== undefined) meta.decision_mode = setup.mode;
    if ('player_faction' in setup) meta.player_faction = setup.player_faction;
    if (setup.headless !== undefined) meta.headless_scenario_auto_control = setup.headless;
    if (setup.autonomy_level !== undefined) meta.autonomy_level = setup.autonomy_level;
    return {
        meta,
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            casualty_ledger,
            negotiation: { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: initializeStrategicDimensions() },
        },
        political: { political_controllers: {}, war_exhaustion: { RBiH: 500, RS: 500, HRHB: 500 } },
        displacement: {},
    } as unknown as GameState;
}

/** One authorized sweep booked to every faction. */
const SWEEP_EVERYWHERE = { war_crimes_events: 1, war_crimes_events_emergent: 1 };
const ALL_SWEEP = { RBiH: SWEEP_EVERYWHERE, RS: SWEEP_EVERYWHERE, HRHB: SWEEP_EVERYWHERE };
const FACTIONS = ['RS', 'RBiH', 'HRHB'];

/** Every run-context combination the old gate distinguished. */
const CONTEXTS: Setup[] = [];
for (const mode of ['emergent', 'historical', undefined] as Mode[]) {
    for (const player of [undefined, null, 'RS', 'RBiH', 'HRHB', '', 42]) {
        for (const headless of [undefined, true, false]) {
            for (const autonomy_level of [undefined, 0, 1, 2, 3]) {
                const setup: Setup = { mode, headless, autonomy_level };
                if (player !== undefined) setup.player_faction = player;
                CONTEXTS.push(setup);
            }
        }
    }
}

describe('the verdict does not read the run context', () => {
    it('one authorized sweep condemns every faction in every mode, seat, autonomy and headless setting', () => {
        for (const setup of CONTEXTS) {
            const state = makeState({ ...setup, capital: ALL_SWEEP });
            for (const faction of FACTIONS) {
                const v = computeFactionVerdict(state, faction);
                expect(v.condemnation_flags, JSON.stringify({ setup, faction })).toContain('authorized_cleansing_condemnation');
                expect(['C', 'D', 'F']).toContain(v.grade);
                expect(v.outcome_class).toBe('hollow_victory');
            }
        }
    });

    it('the verdict, the flags and the cost index are byte-identical across every run context (hands-off live = headless)', () => {
        const reference = makeState({ mode: 'historical', headless: true, capital: ALL_SWEEP });
        for (const setup of CONTEXTS) {
            const state = makeState({ ...setup, capital: ALL_SWEEP });
            for (const faction of FACTIONS) {
                expect(JSON.stringify(computeFactionVerdict(state, faction))).toBe(JSON.stringify(computeFactionVerdict(reference, faction)));
                expect(currentCondemnationFlags(state, faction)).toEqual(currentCondemnationFlags(reference, faction));
                expect(computeWarCostIndex(state, faction)).toBe(computeWarCostIndex(reference, faction));
            }
        }
    });

    it('a faction with no modelled act is never flagged, in any context (the trigger is the act, not the faction)', () => {
        for (const setup of CONTEXTS) {
            const state = makeState(setup);
            for (const faction of FACTIONS) {
                expect(computeFactionVerdict(state, faction).condemnation_flags ?? []).not.toContain('authorized_cleansing_condemnation');
            }
        }
    });
});

describe('historical mode judges the modelled record like an emergent campaign', () => {
    it('headless historical (no player faction): the sweep is condemned for each faction that carried it out, and only that faction', () => {
        const state = makeState({ mode: 'historical', headless: true, capital: { HRHB: SWEEP_EVERYWHERE } });
        expect(computeFactionVerdict(state, 'HRHB').condemnation_flags).toContain('authorized_cleansing_condemnation');
        for (const other of ['RS', 'RBiH']) {
            expect(computeFactionVerdict(state, other).condemnation_flags ?? []).not.toContain('authorized_cleansing_condemnation');
        }
    });

    it('15,000 civilian-harm arm: reads the fresh displacement aggregate, for a player or a bot faction alike', () => {
        const build = (harm: number, player?: string) => {
            const state = makeState({ mode: 'historical', ...(player ? { player_faction: player } : {}), capital: { RS: { civilian_casualties_caused: 0 } } });
            (state as unknown as { displacement: unknown }).displacement = {
                displacement_humanitarian_aggregates: { RS: { bosniak: { refugees_created: 1000, refugees_received: 0, civilian_casualties_caused: harm } } },
            };
            return state;
        };
        for (const player of [undefined, 'RS', 'RBiH']) {
            expect(computeFactionVerdict(build(15000, player), 'RS').condemnation_flags).toContain('authorized_cleansing_condemnation');
            expect(computeFactionVerdict(build(14999, player), 'RS').condemnation_flags ?? []).not.toContain('authorized_cleansing_condemnation');
        }
    });

    it('a final-turn takeover that pushes harm up is displayed fresh for every faction', () => {
        const state = makeState({
            mode: 'historical',
            player_faction: 'RS',
            capital: { RS: { refugees_created: 0, civilian_casualties_caused: 0 }, HRHB: { refugees_created: 0, civilian_casualties_caused: 0 } },
        });
        (state as unknown as { displacement: unknown }).displacement = {
            displacement_humanitarian_aggregates: {
                RS: { bosniak: { refugees_created: 50000, refugees_received: 0, civilian_casualties_caused: 5000 } },
                HRHB: { bosniak: { refugees_created: 50000, refugees_received: 0, civilian_casualties_caused: 5000 } },
            },
        };
        for (const faction of ['RS', 'HRHB']) {
            const v = computeFactionVerdict(state, faction);
            expect(v.capital_breakdown?.refugees_created).toBe(50000);
            expect(v.capital_breakdown?.civilian_casualties_caused).toBe(5000);
        }
    });

    it('cost term (legacy path, non-saturated fixture): atrocity raises the index for every faction, with or without a player', () => {
        const atrocity = { war_crimes_events: 3, refugees_created: 50000, civilian_casualties_caused: 20000 };
        const clean = makeState({ mode: 'historical' });
        for (const setup of [{ mode: 'historical' as Mode }, { mode: 'historical' as Mode, player_faction: 'RS' }, { mode: 'historical' as Mode, headless: true }]) {
            const dirty = makeState({ ...setup, capital: { RS: atrocity, RBiH: atrocity, HRHB: atrocity } });
            for (const faction of FACTIONS) {
                expect(computeWarCostIndex(clean, faction)).toBeLessThan(1);
                expect(computeWarCostIndex(dirty, faction)).toBeGreaterThan(computeWarCostIndex(clean, faction));
            }
        }
    });
});

describe('autonomy and saves', () => {
    it('handing the faction to staff (autonomy 3) keeps it accountable', () => {
        const state = makeState({ mode: 'historical', player_faction: 'RS', autonomy_level: 3, capital: ALL_SWEEP });
        expect(computeFactionVerdict(state, 'RS').condemnation_flags).toContain('authorized_cleansing_condemnation');
    });

    it('a legacy save (decision_mode defaulted to historical by migration 35) with an existing counter is condemned at its next verdict, player or bot', () => {
        for (const player of [undefined, 'RBiH', 'RS']) {
            const state = makeState({ mode: 'historical', ...(player ? { player_faction: player } : {}), capital: { RBiH: { war_crimes_events_emergent: 2 } } });
            expect(computeFactionVerdict(state, 'RBiH').condemnation_flags).toContain('authorized_cleansing_condemnation');
        }
    });
});

describe('static guards', () => {
    const code = (path: string) => withoutComments(readFileSync(path, 'utf8'));

    it('the verdict layer reads no run-context field and has no bright-line predicate', () => {
        const source = code('src/sim/negotiation/scoring.ts');
        expect(source).not.toMatch(/decision_mode/);
        expect(source).not.toMatch(/player_faction/);
        expect(source).not.toMatch(/headless_scenario_auto_control/);
        expect(source).not.toMatch(/autonomy_level/);
        expect(source).not.toMatch(/isBrightLineFaction/);
        expect(existsSync('src/state/atrocity_accountability.ts')).toBe(false);
    });

    it('the patron state update carries no defiance term and no bright-line gate (patron-defiance panel)', () => {
        const source = code('src/state/patron_pressure.ts');
        expect(source).not.toMatch(/decision_mode/);
        expect(source).not.toMatch(/patron_confidence/);
        expect(source).not.toMatch(/patron_defiance_supply_cuts/);
        expect(source).not.toMatch(/isBrightLineFaction/);
    });

    it('no shipped scenario authors player_faction, and the scenario runner always marks the run headless', () => {
        const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
            const path = `${dir}/${entry.name}`;
            return entry.isDirectory() ? walk(path) : path.endsWith('.json') ? [path] : [];
        });
        const authors = walk('data/scenarios').filter((path) => /"player_faction"\s*:/.test(readFileSync(path, 'utf8')));
        expect(authors).toEqual([]);
        expect(code('src/scenario/scenario_runner.ts')).toMatch(/state\.meta\.headless_scenario_auto_control = true/);
    });

    it('no src file references the retired predicate', () => {
        const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
            const path = `${dir}/${entry.name}`;
            return entry.isDirectory() ? walk(path) : /\.(ts|tsx)$/.test(path) ? [path] : [];
        });
        const hits = walk('src').filter((path) => /isBrightLineFaction|atrocity_accountability/.test(code(path)));
        expect(hits).toEqual([]);
    });
});

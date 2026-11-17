/**
 * §6 bright line for the human player's own faction in ANY decision mode (panel ruling 2026-11-16).
 *
 * Atrocity must never produce a better end-state. The atrocity counters are written in every mode, but the
 * consequences (the §2a `authorized_cleansing_condemnation` flag, its display freshening, the atrocity cost
 * term) used to apply on `decision_mode === 'emergent'` alone, and "Replay the record" (historical) is one
 * menu click. They now apply to a faction when `isBrightLineFaction(state, faction)`: every faction in
 * emergent mode, and the human player's own faction in any mode. A headless / no-human historical run has no
 * player faction, so it is unchanged by construction.
 *
 * Out of scope on purpose (pinned below): the patron-defiance supply cut stays emergent-only.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeFactionVerdict, computeWarCostIndex, currentCondemnationFlags } from '../src/sim/negotiation/scoring.js';
import { isBrightLineFaction } from '../src/state/atrocity_accountability.js';
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

/** One authorized sweep booked to every faction (the act is the same; who is accountable differs). */
const SWEEP_EVERYWHERE = { war_crimes_events: 1, war_crimes_events_emergent: 1 };
const ALL_SWEEP = { RBiH: SWEEP_EVERYWHERE, RS: SWEEP_EVERYWHERE, HRHB: SWEEP_EVERYWHERE };

describe('isBrightLineFaction truth table', () => {
    const modes: Mode[] = ['emergent', 'historical', undefined];
    const players: unknown[] = [undefined, null, 'RS', 'RBiH', '', 42];
    for (const mode of modes) {
        for (const player of players) {
            for (const faction of ['RS', 'RBiH', 'HRHB']) {
                const expected = mode === 'emergent' || (typeof player === 'string' && player === faction);
                it(`mode=${String(mode)} player=${JSON.stringify(player) ?? 'undefined'} faction=${faction} -> ${expected}`, () => {
                    const state = makeState({ mode, player_faction: player });
                    expect(isBrightLineFaction(state, faction)).toBe(expected);
                });
            }
        }
    }

    it('fails closed with no meta at all and never defaults a faction', () => {
        expect(isBrightLineFaction({ meta: undefined } as unknown as GameState, 'RBiH')).toBe(false);
        expect(isBrightLineFaction({ meta: {} } as unknown as GameState, 'RBiH')).toBe(false);
    });

    it('headless auto-control with player_faction set is the same as unset (the runner marker wins)', () => {
        for (const faction of ['RS', 'RBiH', 'HRHB']) {
            const withPlayer = makeState({ mode: 'historical', player_faction: 'RS', headless: true });
            const without = makeState({ mode: 'historical', headless: true });
            expect(isBrightLineFaction(withPlayer, faction)).toBe(false);
            expect(isBrightLineFaction(without, faction)).toBe(false);
        }
        // Emergent mode is not touched by the marker: every faction still bears the consequences.
        expect(isBrightLineFaction(makeState({ mode: 'emergent', player_faction: 'RS', headless: true }), 'HRHB')).toBe(true);
    });

    it('headless harness: a headless historical state is byte-identical in the verdict whether or not a player faction is authored', () => {
        const a = makeState({ mode: 'historical', headless: true, capital: ALL_SWEEP });
        const b = makeState({ mode: 'historical', headless: true, player_faction: 'RS', capital: ALL_SWEEP });
        for (const faction of ['RS', 'RBiH', 'HRHB']) {
            expect(JSON.stringify(computeFactionVerdict(b, faction))).toBe(JSON.stringify(computeFactionVerdict(a, faction)));
            expect(computeWarCostIndex(b, faction)).toBe(computeWarCostIndex(a, faction));
        }
    });
});

describe('historical mode: the human player\'s own atrocity carries the consequences', () => {
    it('player RS + one authorized sweep: flag, grade capped at C, hollow_victory; the bot factions in the same state are untouched', () => {
        const state = makeState({ mode: 'historical', player_faction: 'RS', capital: ALL_SWEEP });
        const rs = computeFactionVerdict(state, 'RS');
        expect(rs.condemnation_flags).toContain('authorized_cleansing_condemnation');
        expect(['C', 'D', 'F']).toContain(rs.grade);
        expect(rs.outcome_class).toBe('hollow_victory');
        for (const bot of ['RBiH', 'HRHB']) {
            const v = computeFactionVerdict(state, bot);
            expect(v.condemnation_flags ?? []).not.toContain('authorized_cleansing_condemnation');
            expect(v.outcome_class).not.toBe('hollow_victory');
        }
    });

    it('the same sweep with no player faction (headless-style state) is not condemned, as before', () => {
        const state = makeState({ mode: 'historical', capital: ALL_SWEEP });
        for (const faction of ['RS', 'RBiH', 'HRHB']) {
            expect(computeFactionVerdict(state, faction).condemnation_flags ?? []).not.toContain('authorized_cleansing_condemnation');
        }
    });

    it('human RBiH is accountable the same way (the rule is faction-neutral)', () => {
        const state = makeState({ mode: 'historical', player_faction: 'RBiH', capital: ALL_SWEEP });
        expect(computeFactionVerdict(state, 'RBiH').condemnation_flags).toContain('authorized_cleansing_condemnation');
        expect(computeFactionVerdict(state, 'RS').condemnation_flags ?? []).not.toContain('authorized_cleansing_condemnation');
    });

    it('currentCondemnationFlags (the Dayton room and delegation folder reading) follows the same predicate', () => {
        const state = makeState({ mode: 'historical', player_faction: 'RS', capital: ALL_SWEEP });
        expect(currentCondemnationFlags(state, 'RS')).toContain('authorized_cleansing_condemnation');
        expect(currentCondemnationFlags(state, 'HRHB')).not.toContain('authorized_cleansing_condemnation');
    });

    it('15,000 civilian-harm arm: reads the fresh displacement aggregate for the player, not the stale capital snapshot', () => {
        const build = (harm: number) => {
            const state = makeState({ mode: 'historical', player_faction: 'RS', capital: { RS: { civilian_casualties_caused: 0 } } });
            (state as unknown as { displacement: unknown }).displacement = {
                displacement_humanitarian_aggregates: { RS: { bosniak: { refugees_created: 1000, refugees_received: 0, civilian_casualties_caused: harm } } },
            };
            return state;
        };
        expect(computeFactionVerdict(build(15000), 'RS').condemnation_flags).toContain('authorized_cleansing_condemnation');
        expect(computeFactionVerdict(build(14999), 'RS').condemnation_flags ?? []).not.toContain('authorized_cleansing_condemnation');
        // The same harm booked to a bot faction (the recorded takeover history) is not condemned in historical mode.
        const bot = build(20000);
        (bot as unknown as { meta: { player_faction: string } }).meta.player_faction = 'RBiH';
        expect(computeFactionVerdict(bot, 'RS').condemnation_flags ?? []).not.toContain('authorized_cleansing_condemnation');
    });

    it('a final-turn takeover that pushes harm over 15,000 is displayed fresh for the player and raw for a bot', () => {
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
        const rs = computeFactionVerdict(state, 'RS');
        const hrhb = computeFactionVerdict(state, 'HRHB');
        expect(rs.capital_breakdown?.refugees_created).toBe(50000);
        expect(rs.capital_breakdown?.civilian_casualties_caused).toBe(5000);
        expect(hrhb.capital_breakdown?.refugees_created).toBe(0);
        expect(hrhb.capital_breakdown?.civilian_casualties_caused).toBe(0);
    });

    it('cost term (legacy path): raised for the player faction, unchanged for a bot and for a no-player state', () => {
        const atrocity = { RS: { war_crimes_events: 3, refugees_created: 50000, civilian_casualties_caused: 20000 }, RBiH: { war_crimes_events: 3, refugees_created: 50000, civilian_casualties_caused: 20000 } };
        const noPlayer = makeState({ mode: 'historical', capital: atrocity });
        const withPlayer = makeState({ mode: 'historical', player_faction: 'RS', capital: atrocity });
        expect(computeWarCostIndex(withPlayer, 'RS')).toBeGreaterThan(computeWarCostIndex(noPlayer, 'RS'));
        expect(computeWarCostIndex(withPlayer, 'RBiH')).toBe(computeWarCostIndex(noPlayer, 'RBiH'));
    });

    it('a restrained human player is not condemned (the gate is the act, not the mode)', () => {
        const state = makeState({ mode: 'historical', player_faction: 'RBiH' });
        expect(computeFactionVerdict(state, 'RBiH').condemnation_flags ?? []).not.toContain('authorized_cleansing_condemnation');
    });
});

describe('autonomy and saves', () => {
    it('handing the faction to staff (autonomy 3) keeps it accountable: player_faction stays set', () => {
        const state = makeState({ mode: 'historical', player_faction: 'RS', autonomy_level: 3, capital: ALL_SWEEP });
        expect(computeFactionVerdict(state, 'RS').condemnation_flags).toContain('authorized_cleansing_condemnation');
    });

    it('a legacy save (decision_mode defaulted to historical by migration 35) with a player faction and an existing counter is condemned at its next verdict', () => {
        const state = makeState({ mode: 'historical', player_faction: 'RBiH', capital: { RBiH: { war_crimes_events_emergent: 2 } } });
        expect(computeFactionVerdict(state, 'RBiH').condemnation_flags).toContain('authorized_cleansing_condemnation');
    });

    it('emergent mode is unchanged: every faction, with or without a player faction', () => {
        for (const player of [undefined, 'RS']) {
            const state = makeState({ mode: 'emergent', player_faction: player, capital: ALL_SWEEP });
            for (const faction of ['RS', 'RBiH', 'HRHB']) {
                expect(computeFactionVerdict(state, faction).condemnation_flags).toContain('authorized_cleansing_condemnation');
            }
        }
    });
});

describe('static guards', () => {
    const code = (path: string) => withoutComments(readFileSync(path, 'utf8'));

    it('scoring.ts has no bare decision_mode gate: every atrocity gate goes through isBrightLineFaction', () => {
        const source = code('src/sim/negotiation/scoring.ts');
        expect(source).not.toMatch(/decision_mode/);
        expect(source.match(/isBrightLineFaction\(/g)?.length).toBe(3);
    });

    it('the patron-defiance supply cut stays emergent-only (its own lane, its own measured runs)', () => {
        expect(code('src/state/patron_pressure.ts')).toMatch(/state\.meta\?\.decision_mode === 'emergent'/);
        expect(code('src/state/patron_pressure.ts')).not.toMatch(/isBrightLineFaction/);
    });

    it('the predicate does not default the faction and needs the headless marker check', () => {
        const source = code('src/state/atrocity_accountability.ts');
        expect(source).not.toMatch(/\?\?\s*'RBiH'/);
        expect(source).toMatch(/headless_scenario_auto_control !== true/);
        expect(source).toMatch(/typeof meta\?\.player_faction === 'string'/);
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
});

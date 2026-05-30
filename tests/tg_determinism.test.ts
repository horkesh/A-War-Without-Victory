/**
 * Tactical Group determinism suite (ADR-0005 §Test Surface — `tg_determinism`).
 *
 * The `tg_determinism` test was named in ADR-0005 §Test Surface but never written.
 * This file closes that gap. It exercises the reachable TG formation/dissolution
 * path (selectDonors → formTacticalGroup → distributeCasualtiesAcrossTg →
 * dissolveTacticalGroup) and asserts:
 *
 *   (a) ROUND-TRIP byte-identity: serialize → deserialize → re-serialize is
 *       byte-identical (no field drift; sorted donor ordering stable).
 *   (b) SAME-SEED reproducibility: running the identical micro-scenario twice
 *       from the same seed yields identical final serialized state (donor
 *       selection, BFS-hop falloff, casualty pro-rata, lent-ledger writes,
 *       cooldown — all reproducible).
 *   (c) NO non-determinism source reachable in the TG modules (static scan for
 *       Math.random / Date.now / new Date, consistent with
 *       tests/determinism_static_scan_r1_5.test.ts).
 *
 * NOTE on flags: the TG sub-flags (ENABLE_TG_FORMATION, ENABLE_TG_COHESION_BLEED,
 * etc.) are compile-time `const false`, so they cannot be runtime-toggled in a
 * unit test. The lifecycle helpers are CALLER-GATED pure mutation functions
 * (see tactical_group_lifecycle.ts header) — exercising them directly is exactly
 * the "flags enabled" code path the engine takes when the flags are on. The
 * compile-time `const false` branches (cohesion bleed, promotion counter) are
 * covered by tg_lifecycle / tg_og_promotion; here we pin determinism of the
 * always-reachable serialized surface.
 */

import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type {
    FormationState,
    GameState,
    MilitaryState,
    TgDonorContribution,
} from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { serializeGameState } from '../src/state/serializeGameState.js';
import { selectDonors } from '../src/sim/combat/tactical_group_selection.js';
import {
    dissolveTacticalGroup,
    formTacticalGroup,
} from '../src/sim/combat/tactical_group_lifecycle.js';
import { distributeCasualtiesAcrossTg } from '../src/sim/combat/tactical_group_casualties.js';

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id, faction: 'RBiH', name: id, created_turn: 0, status: 'active', assignment: null,
        corps_id: 'corp_a',
        location_osid: 'SID_001',
        personnel: 1500,
        cohesion: 80,
        ...overrides,
    } as FormationState;
}

function factionFixture(id: string, exhaustion: number, prewar: number): any {
    return {
        id, profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion },
        areasOfResponsibility: [], supply_sources: [], command_capacity: 0,
        negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
        prewar_capital: prewar, declaration_pressure: 0, declared: false, declaration_turn: null,
    };
}

/** Builds a fresh, FULLY-VALID micro-scenario state (passes serializeState validation).
 *  The donor brigade ids are intentionally OUT of sorted order so the sort-stability of
 *  formTacticalGroup is exercised. */
function microScenario(): GameState {
    const brigades = [
        brigade('anchor'),
        brigade('zzz_donor', { personnel: 2000 }),
        brigade('aaa_donor', { personnel: 1800 }),
        brigade('mmm_donor', { personnel: 1600 }),
    ];
    const formations: Record<string, FormationState> = {};
    for (const b of brigades) formations[b.id] = b;
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 5, seed: 'tg-determinism-seed', phase: 'war',
            referendum_held: true, referendum_turn: 6, war_start_turn: 4,
            referendum_eligible_turn: null, referendum_deadline_turn: null,
            game_over: false, outcome: undefined, player_faction: 'RBiH',
        } as any,
        factions: [
            factionFixture('RBiH', 5, 70),
            factionFixture('RS', 8, 100),
            factionFixture('HRHB', 4, 40),
        ],
        military: {
            formations,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            tactical_groups: {},
            army_hq_operations: {},
            army_hq_last_op_turn: {},
            army_hq_op_count_by_year: {},
        } as Partial<MilitaryState> as MilitaryState,
        political: {
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
            negotiation_ledger: [],
            supply_rights: { corridors: [] },
            political_controllers: { SID_001: 'RBiH', SID_002: 'RS', SID_003: 'HRHB' },
            municipalities: {},
        } as any,
        displacement: {} as any,
    } as GameState;
}

/** Runs the full reachable TG micro-pipeline against a fresh state and returns it.
 *  Deterministic: no time/random; sorted iteration internally. */
function runTgPipeline(): GameState {
    const state = microScenario();
    const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:test:test' });
    const formed = formTacticalGroup(state, {
        op_id: 'op_det',
        anchor_brigade_id: 'anchor',
        donors,
        current_turn: 5,
    });
    const tgId = formed.tg_id!;
    const tg = state.military.tactical_groups![tgId];

    // Casualty pro-rata: anchor floor + largest-remainder donor share, deterministic tiebreak.
    const split = distributeCasualtiesAcrossTg(
        300,
        tg.anchor_brigade_id,
        tg.donor_contributions,
    );
    // Persist the split into the TG ledger (frozen pro-rata bookkeeping).
    for (const d of tg.donor_contributions) {
        d.casualties_so_far = split.donor_casualties[d.brigade_id] ?? 0;
    }

    // Advance and dissolve (cooldown + lent-field clearing).
    dissolveTacticalGroup(state, tgId, 12);
    return state;
}

describe('tg determinism (ADR-0005 §Test Surface tg_determinism)', () => {
    it('(a) serialize → deserialize → re-serialize is byte-identical (no drift, sort-stable)', () => {
        const state = runTgPipeline();
        const once = serializeState(state);
        const hydrated = deserializeState(once);
        const twice = serializeState(hydrated);
        const thrice = serializeState(deserializeState(twice));
        expect(twice).toBe(once);
        expect(thrice).toBe(twice);
        // serializeGameState is a pure function: same input → byte-identical output.
        // (Compare two serializations of the SAME hydrated object — the migration-default
        //  fixed point — not raw vs migrated, which differ by migration-added defaults.)
        const g1 = serializeGameState(hydrated);
        const g2 = serializeGameState(hydrated);
        expect(g1).toBe(g2);
    });

    it('(b) same-seed micro-scenario run twice yields identical final state', () => {
        const a = serializeState(runTgPipeline());
        const b = serializeState(runTgPipeline());
        expect(b).toBe(a);
    });

    it('(b) donor selection, BFS-hop falloff, and casualty pro-rata are reproducible', () => {
        // Run twice; compare the exact selected donor pool + lent amounts + casualty split.
        const sigOf = (): string => {
            const state = microScenario();
            const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:test:test' });
            const formed = formTacticalGroup(state, {
                op_id: 'op_det', anchor_brigade_id: 'anchor', donors, current_turn: 5,
            });
            const tg = state.military.tactical_groups![formed.tg_id!];
            const split = distributeCasualtiesAcrossTg(300, tg.anchor_brigade_id, tg.donor_contributions);
            return JSON.stringify({
                donorIds: tg.donor_contributions.map(d => d.brigade_id),
                lent: tg.donor_contributions.map(d => d.personnel_lent),
                hops: tg.donor_contributions.map(d => d.distance_hops),
                anchorCas: split.anchor_casualties,
                donorCas: split.donor_casualties,
            });
        };
        expect(sigOf()).toBe(sigOf());
    });

    it('(b) donor_contributions are stored in sorted (strictCompare) order regardless of input order', () => {
        const state = runTgPipeline();
        const ids = Object.values(state.military.tactical_groups ?? {})
            .flatMap(tg => tg.donor_contributions.map(d => d.brigade_id));
        // dissolveTacticalGroup removes the TG; re-form a fresh one to inspect ordering.
        const fresh = microScenario();
        const donors = selectDonors(fresh, { anchor_brigade_id: 'anchor', staging_osid: 'op:test:test' });
        const formed = formTacticalGroup(fresh, { op_id: 'op_det', anchor_brigade_id: 'anchor', donors, current_turn: 5 });
        const sorted = fresh.military.tactical_groups![formed.tg_id!].donor_contributions.map(d => d.brigade_id);
        expect(sorted).toEqual([...sorted].sort());
        // The dissolved-state path produced no lingering donor ids.
        expect(ids).toEqual([]);
    });

    it('(c) no Math.random / Date.now / new Date reachable in any tactical_group_* module', async () => {
        const tgModules = [
            'src/sim/combat/tactical_group_anchor.ts',
            'src/sim/combat/tactical_group_casualties.ts',
            'src/sim/combat/tactical_group_config.ts',
            'src/sim/combat/tactical_group_lifecycle.ts',
            'src/sim/combat/tactical_group_naming.ts',
            'src/sim/combat/tactical_group_personnel.ts',
            'src/sim/combat/tactical_group_promotion.ts',
            'src/sim/combat/tactical_group_selection.ts',
        ];
        const disallowed: Array<{ label: string; regex: RegExp }> = [
            { label: 'Date.now()', regex: /Date\.now\s*\(/ },
            { label: 'new Date()', regex: /new Date\s*\(/ },
            { label: 'Math.random()', regex: /Math\.random\s*\(/ },
        ];
        const violations: string[] = [];
        for (const rel of tgModules) {
            const content = await readFile(rel, 'utf8');
            const lines = content.split('\n');
            let inBlockComment = false;
            for (let i = 0; i < lines.length; i += 1) {
                const line = lines[i] ?? '';
                const trimmed = line.trim();
                if (inBlockComment) {
                    if (trimmed.includes('*/')) inBlockComment = false;
                    continue;
                }
                if (trimmed.startsWith('/*')) {
                    inBlockComment = !trimmed.includes('*/');
                    continue;
                }
                if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.length === 0) continue;
                for (const p of disallowed) {
                    if (p.regex.test(line)) violations.push(`${rel}:${i + 1} ${p.label}`);
                }
            }
        }
        expect(violations, `TG determinism violations:\n${violations.join('\n')}`).toEqual([]);
    });
});

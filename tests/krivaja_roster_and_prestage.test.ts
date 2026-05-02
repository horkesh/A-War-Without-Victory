/**
 * LANE-2026-05-02-KRIVAJA: Red-first tests for the Krivaja-95 roster
 * historical correction + trigger-turn pre-stage helper.
 *
 * Predecessor lane (commit 9ff4f352 "VRS Drina Delivery Mega-lane Phase 7")
 * closed PARTIAL because Krivaja-95 fired at t168 with planning_invalidated /
 * 0 attacks: (i) catalog roster put `rs_1st_zvornik` in the opening assault
 * which contradicts ICTY Krstić §123 / Popović §242 — Zvornik LIB held the
 * Sapna/Zvornik shoulder vs ARBiH 2nd Corps and joined post-fall (12–18 July)
 * for column interdiction; (ii) there was no trigger-turn pre-stage path so
 * Phase B drift kept rs_5th_podrinje at op:vlasenica:bacici (4 hops) at the
 * trigger turn. With only rs_1st_bratunac at staging, hasExecutableOpeningAttack
 * fails (force_ratio 0.084).
 *
 * This test file MUST FAIL on current code (pre-Phase 2). After Phase 2 it
 * MUST pass without regressions to the existing Krivaja-95 catalog tests.
 *
 * Authority: ICTY Krstić IT-98-33-T §122–139; ICTY Popović IT-05-88 §242;
 * Balkan Battlegrounds vol. 2 p.414. The 1st Milici LIB (rs_1st_milii) was
 * the W-axis supporting force; 1st Zvornik LIB was NOT in the opening
 * assault.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'vitest';

import {
    _TRIGGERED_OPS,
    checkTriggeredOperations,
    prestageBrigadesForTriggeredOp,
} from '../src/sim/combat/triggered_operations.js';
import type { GameState } from '../src/state/game_state.js';

// ---------------------------------------------------------------------------
// T1 — Catalog historical correction
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-KRIVAJA T1: catalog roster correction', () => {
    it('Krivaja-95 axis brigades include rs_1st_milii and exclude rs_1st_zvornik', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Krivaja-95');
        assert.ok(def, 'Operation Krivaja-95 must exist in catalog');
        assert.equal(def!.axes.length, 1);
        const brigades = def!.axes[0]!.brigades as readonly string[];
        assert.ok(
            brigades.includes('rs_1st_milii'),
            `Krivaja-95 axis must include rs_1st_milii (Krstić §123 W-axis); got ${JSON.stringify(brigades)}`,
        );
        assert.ok(
            !brigades.includes('rs_1st_zvornik'),
            `Krivaja-95 axis must NOT include rs_1st_zvornik (Zvornik LIB held Sapna shoulder, joined post-fall); got ${JSON.stringify(brigades)}`,
        );
    });
});

// ---------------------------------------------------------------------------
// T2 — Catalog comment cites ICTY source for the correction
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-KRIVAJA T2: catalog comment cites ICTY source', () => {
    it('Krivaja-95 catalog block cites Krstić, names 1st Milici, and notes Zvornik post-fall role', () => {
        const src = readFileSync('src/sim/combat/triggered_operations.ts', 'utf8');
        // Locate the Krivaja-95 catalog block. We anchor on the unique name
        // line and walk backward to find the entry-opening `{` at column 4
        // (4-space indent), since prose comments contain incidental `{`
        // characters (e.g., OSID-set notation `{luka_2, …}`) that would
        // otherwise mislead `lastIndexOf('{')`.
        const krivajaIdx = src.indexOf("name: 'Operation Krivaja-95'");
        assert.ok(krivajaIdx > 0, 'Krivaja-95 catalog entry must exist in source');
        // Search backward line-by-line for the `    {` that opens the entry.
        const before = src.slice(0, krivajaIdx);
        const beforeLines = before.split('\n');
        let blockStartLine = -1;
        for (let i = beforeLines.length - 1; i >= 0; i--) {
            if (/^\s{4}\{\s*$/.test(beforeLines[i]!)) {
                blockStartLine = i;
                break;
            }
        }
        assert.ok(blockStartLine >= 0, 'must find entry-opening brace at 4-space indent');
        const blockStart = beforeLines.slice(0, blockStartLine).join('\n').length
            + (blockStartLine > 0 ? 1 : 0); // account for the joining newline
        const blockEnd = src.indexOf("\n    },", krivajaIdx);
        assert.ok(blockEnd > blockStart, 'must find entry-closing brace');
        const block = src.slice(blockStart, blockEnd);

        const hasKrstic = /Krsti[ćc]/.test(block);
        const hasMilici = /1st\s+Milic[ii]/.test(block);
        const hasZvornikPostFall =
            /Zvornik[\s\S]*post-fall/i.test(block) ||
            /Zvornik[\s\S]*column interdiction/i.test(block) ||
            /Zvornik[\s\S]*Sapna/i.test(block);

        assert.ok(hasKrstic, 'Krivaja-95 catalog comment must cite ICTY Krstić');
        assert.ok(hasMilici, 'Krivaja-95 catalog comment must name 1st Milici (replacement brigade)');
        assert.ok(
            hasZvornikPostFall,
            'Krivaja-95 catalog comment must explain Zvornik LIB was NOT in the opening assault (post-fall column interdiction / Sapna shoulder)',
        );
    });
});

// ---------------------------------------------------------------------------
// T3 — Pre-stage helper exists and is exported
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-KRIVAJA T3: prestageBrigadesForTriggeredOp exported', () => {
    it('triggered_operations exports prestageBrigadesForTriggeredOp as a function', () => {
        assert.equal(
            typeof prestageBrigadesForTriggeredOp,
            'function',
            'prestageBrigadesForTriggeredOp must be exported as a function',
        );
    });
});

// ---------------------------------------------------------------------------
// Test fixture builders
// ---------------------------------------------------------------------------

interface MinimalFormationOverrides {
    status?: 'active' | 'inactive' | 'destroyed';
    location_osid?: string;
    personnel?: number;
    kind?: string;
    faction?: string;
}

function makeFormation(id: string, overrides: MinimalFormationOverrides = {}): unknown {
    // corps_id required so getFormationCorpsId() in buildOperation matches
    // axisDef.corps ('vrs_drina') and the brigade is admitted into the axis.
    return {
        id,
        kind: overrides.kind ?? 'brigade',
        status: overrides.status ?? 'active',
        location_osid: overrides.location_osid ?? 'op:bratunac:bratunac_2',
        personnel: overrides.personnel ?? 1500,
        faction: overrides.faction ?? 'RS',
        corps_id: 'vrs_drina',
        disrupted_turns: 0,
    };
}

function buildSyntheticState(turn: number): GameState {
    // Minimal synthetic GameState wired with the four Krivaja-95 participants
    // at distinct locations so the helper has something to do for every brigade
    // EXCEPT rs_1st_bratunac (already at staging) and rs_skelani_battalion
    // (inactive — must be skipped).
    return {
        meta: { turn },
        military: {
            corps_command: {
                vrs_drina: {
                    command_span: 0,
                    subordinate_count: 0,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'defensive',
                    active_operations: [],
                },
            },
            formations: {
                rs_1st_bratunac: makeFormation('rs_1st_bratunac', {
                    location_osid: 'op:bratunac:bratunac_2',
                }),
                rs_1st_milii: makeFormation('rs_1st_milii', {
                    location_osid: 'op:vlasenica:grabovica',
                }),
                rs_5th_podrinje: makeFormation('rs_5th_podrinje', {
                    location_osid: 'op:vlasenica:bacici',
                }),
                rs_skelani_battalion: makeFormation('rs_skelani_battalion', {
                    status: 'inactive',
                    personnel: 0,
                    location_osid: 'op:srebrenica:skelani_2',
                }),
            },
            triggered_operations_accepted: {},
            declined_operations: {},
        },
        political: { political_controllers: {} },
        operation_history: [],
    } as unknown as GameState;
}

// ---------------------------------------------------------------------------
// T4 — Pre-stage helper writes deterministic movement orders
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-KRIVAJA T4: prestage helper writes correct orders', () => {
    it('emits column-march orders for non-staged active participants only', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Krivaja-95');
        assert.ok(def, 'Operation Krivaja-95 must exist');
        const state = buildSyntheticState(168);

        prestageBrigadesForTriggeredOp(state, def!);

        const orders = state.military.brigade_movement_orders ?? {};

        // rs_1st_milii: not at staging → must have an order
        const miliiOrder = orders['rs_1st_milii' as never] as unknown as
            | { destination_sids?: string[]; stance?: string }
            | undefined;
        assert.ok(miliiOrder, 'rs_1st_milii must have a movement order');
        assert.equal(miliiOrder!.destination_sids?.[0], 'op:bratunac:bratunac_2');
        assert.equal(miliiOrder!.stance, 'column');

        // rs_5th_podrinje: not at staging → must have an order
        const podrinjeOrder = orders['rs_5th_podrinje' as never] as unknown as
            | { destination_sids?: string[]; stance?: string }
            | undefined;
        assert.ok(podrinjeOrder, 'rs_5th_podrinje must have a movement order');
        assert.equal(podrinjeOrder!.destination_sids?.[0], 'op:bratunac:bratunac_2');
        assert.equal(podrinjeOrder!.stance, 'column');

        // rs_1st_bratunac: already at staging → must NOT have an order
        assert.equal(
            (orders as Record<string, unknown>)['rs_1st_bratunac'],
            undefined,
            'rs_1st_bratunac is already at staging; no order should be emitted',
        );

        // rs_skelani_battalion: inactive → must NOT have an order
        assert.equal(
            (orders as Record<string, unknown>)['rs_skelani_battalion'],
            undefined,
            'rs_skelani_battalion is inactive; no order should be emitted',
        );
    });
});

// ---------------------------------------------------------------------------
// T5 — Pre-stage helper deterministic across re-runs (D1/D2)
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-KRIVAJA T5: prestage helper is deterministic', () => {
    it('two independent calls produce byte-identical brigade_movement_orders', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Krivaja-95');
        assert.ok(def);
        const stateA = buildSyntheticState(168);
        const stateB = buildSyntheticState(168);

        prestageBrigadesForTriggeredOp(stateA, def!);
        prestageBrigadesForTriggeredOp(stateB, def!);

        const ordersA = stateA.military.brigade_movement_orders ?? {};
        const ordersB = stateB.military.brigade_movement_orders ?? {};

        // Use sorted-key serialization so insertion order does not affect equality.
        const stableSerialize = (obj: Record<string, unknown>): string => {
            const keys = Object.keys(obj).sort();
            return JSON.stringify(keys.map((k) => [k, obj[k]]));
        };

        assert.equal(
            stableSerialize(ordersA as Record<string, unknown>),
            stableSerialize(ordersB as Record<string, unknown>),
            'prestage helper must be deterministic across re-runs',
        );
    });
});

// ---------------------------------------------------------------------------
// T6 — Pre-stage helper invoked from checkTriggeredOperations BEFORE op push
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-KRIVAJA T6: checkTriggeredOperations invokes prestage', () => {
    it('emits movement orders for non-staged participants when Krivaja-95 fires', () => {
        const state = buildSyntheticState(168);

        // Ensure all five Krivaja-95 objectives are RBiH-controlled so the
        // hasEnemyObjective check inside checkTriggeredOperations passes.
        const KRIVAJA_OBJECTIVES = [
            'op:srebrenica:donji_potocari_2',
            'op:srebrenica:srebrenica_2',
            'op:srebrenica:bostahovine_2',
            'op:srebrenica:milacevici',
            'op:srebrenica:suceska',
        ];
        const controllers = (state.political as unknown as { political_controllers: Record<string, string> })
            .political_controllers;
        for (const osid of KRIVAJA_OBJECTIVES) {
            controllers[osid] = 'RBiH';
        }

        const injected = checkTriggeredOperations(state);

        assert.ok(
            injected.includes('Operation Krivaja-95'),
            `Krivaja-95 must be injected at turn 168; got ${JSON.stringify(injected)}`,
        );

        const orders = state.military.brigade_movement_orders ?? {};
        const miliiOrder = (orders as Record<string, { destination_sids?: string[]; stance?: string }>)['rs_1st_milii'];
        const podrinjeOrder = (orders as Record<string, { destination_sids?: string[]; stance?: string }>)['rs_5th_podrinje'];

        assert.ok(miliiOrder, 'rs_1st_milii must have a movement order after checkTriggeredOperations');
        assert.equal(miliiOrder.destination_sids?.[0], 'op:bratunac:bratunac_2');
        assert.equal(miliiOrder.stance, 'column');

        assert.ok(podrinjeOrder, 'rs_5th_podrinje must have a movement order after checkTriggeredOperations');
        assert.equal(podrinjeOrder.destination_sids?.[0], 'op:bratunac:bratunac_2');
        assert.equal(podrinjeOrder.stance, 'column');
    });
});

// ---------------------------------------------------------------------------
// D3 — Determinism static-grep guard on the helper site
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-KRIVAJA D3: helper source is determinism-clean', () => {
    it('triggered_operations.ts must not introduce Math.random / Date.now / new Date()', () => {
        const src = readFileSync('src/sim/combat/triggered_operations.ts', 'utf8');
        // We only audit the helper's source file as a whole. If pre-existing
        // determinism violations exist they would have been caught long before
        // this lane; this guard prevents the new helper from regressing.
        assert.equal(/\bMath\.random\s*\(/.test(src), false, 'no Math.random( in triggered_operations.ts');
        assert.equal(/\bDate\.now\s*\(/.test(src), false, 'no Date.now( in triggered_operations.ts');
        assert.equal(/\bnew\s+Date\s*\(/.test(src), false, 'no new Date( in triggered_operations.ts');
    });
});

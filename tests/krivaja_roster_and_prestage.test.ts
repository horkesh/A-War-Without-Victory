/**
 * LANE-2026-05-02-KRIVAJA: Red-first tests for the Krivaja-95 roster
 * historical correction + trigger-turn pre-stage helper.
 *
 * Predecessor lane (commit 9ff4f352 "VRS Drina Delivery Mega-lane Phase 7")
 * closed PARTIAL because Krivaja-95 fired at t168 with planning_invalidated /
 * 0 attacks. The first revision of this lane (commit 68b56d1f) replaced
 * `rs_1st_zvornik` with `rs_1st_milii` claiming Krstić §123 supported a
 * "1st Milici W-axis" reading and Zvornik was post-fall only — both claims
 * were FABRICATED by the dispatched historian agent. Codex review caught
 * this and required direct ICTY paragraph verification (this revision).
 *
 * Authority — direct ICTY paragraph verification (2026-05-02 follow-up):
 *
 * ICTY Krstić IT-98-33-T §§122–123 (verbatim from
 * https://www.icty.org/x/cases/krstic/tjug/en/krs-tj010802e-1.htm) discuss
 * Krivaja-95's STRATEGIC OBJECTIVES (split the enclaves; reduce them to
 * urban cores). They do NOT name brigades or assign attack axes.
 *
 * ICTY Popović IT-05-88-T §244 (verbatim from
 * https://www.icty.org/x/cases/popovic/tjug/en/100610judgement.pdf): "On 2
 * July 1995, two orders, 'Krivaja-95', were issued in the name of Živanović,
 * the Drina Corps Commander. The first order was a preparatory order
 * addressed to the Zvornik, Birac, Romanija, Vlasenica, Podrinje, Bratunac,
 * Milici and Skelani brigades of the Drina Corps."
 *
 * ICTY Popović §245 fn 757 (verbatim): "a part of the Bratunac Brigade was
 * given the task to prevent the intervention of the ABiH from Potočari
 * towards Srebrenica, and the Battalion of the Zvornik Brigade was given
 * the task to attack ABiH forces along the axis of three wooded hills (500
 * metres north of Zeleni Jadar) – Pusmulići village – Bojna – Srebrenica."
 *
 * ICTY Popović §247 (verbatim): TG-1 was commanded by Pandurević, Commander
 * of the Zvornik Brigade; "On 4 July, when TG-1 left the Standard Barracks
 * in Zvornik ... On 5 July 1995, the segment of Tactical Group 1, led by
 * Pandurević and Tactical Group 2, led by Trivić arrived in Zeleni Jadar,
 * in the south of the Srebrenica enclave."
 *
 * Therefore the Krivaja-95 catalog must include BOTH `rs_1st_zvornik` AND
 * `rs_1st_milii` (along with `rs_1st_bratunac`, `rs_5th_podrinje`,
 * `rs_skelani_battalion`). All five names appear in Popović §244's
 * eight-brigade preparatory-order list, with specific opening-assault tasks
 * per §245 fn 757 + §247.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, it, vi } from 'vitest';

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
    it('Krivaja-95 axis brigades reflect Popović §244 brigade list (Zvornik, Bratunac, Milici, 5th Podrinje, Skelani)', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Krivaja-95');
        assert.ok(def, 'Operation Krivaja-95 must exist in catalog');
        assert.equal(def!.axes.length, 1);
        const brigades = def!.axes[0]!.brigades as readonly string[];
        // Popović §244: preparatory order addressed to "the Zvornik, Birac, Romanija, Vlasenica,
        // Podrinje, Bratunac, Milici and Skelani brigades of the Drina Corps".
        // Five OOB-mapped Drina-Corps brigades MUST be present.
        for (const required of [
            'rs_1st_zvornik',
            'rs_1st_bratunac',
            'rs_1st_milii',
            'rs_5th_podrinje',
            'rs_skelani_battalion',
        ]) {
            assert.ok(
                brigades.includes(required),
                `Krivaja-95 axis must include ${required} per Popović §244 / §245 fn 757 / §247; got ${JSON.stringify(brigades)}`,
            );
        }
    });
});

// ---------------------------------------------------------------------------
// T2 — Catalog comment cites ICTY source for the correction
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-KRIVAJA T2: catalog comment cites ICTY Popović for brigade-granularity', () => {
    it('Krivaja-95 catalog block cites Popović §244 / §245 / §247 and does NOT cite Krstić §123 for brigade composition', () => {
        const src = readFileSync('src/sim/combat/triggered_operations.ts', 'utf8');
        // Locate the Krivaja-95 catalog block. We anchor on the unique name
        // line and walk backward to find the entry-opening `{` at column 4
        // (4-space indent), since prose comments contain incidental `{`
        // characters (e.g., OSID-set notation `{luka_2, …}`) that would
        // otherwise mislead `lastIndexOf('{')`.
        const krivajaIdx = src.indexOf("name: 'Operation Krivaja-95'");
        assert.ok(krivajaIdx > 0, 'Krivaja-95 catalog entry must exist in source');
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
            + (blockStartLine > 0 ? 1 : 0);
        const blockEnd = src.indexOf("\n    },", krivajaIdx);
        assert.ok(blockEnd > blockStart, 'must find entry-closing brace');
        const block = src.slice(blockStart, blockEnd);

        // Required: Popović citation for brigade composition.
        assert.ok(
            /Popovi[ćc][\s\S]*§\s*244/.test(block),
            'Krivaja-95 comment must cite Popović §244 (brigade composition)',
        );
        assert.ok(
            /Popovi[ćc][\s\S]*§\s*245/.test(block) || /§\s*245\s*fn\s*757/.test(block),
            'Krivaja-95 comment must cite Popović §245 / §245 fn 757 (specific tasks)',
        );
        // Required: name both Zvornik (named in §244, battalion-level task in §245 fn 757,
        // TG-1 commander Pandurević per §247) and Milici (named in §244).
        assert.ok(/Zvornik/.test(block), 'comment must name Zvornik per §244 / §245 fn 757 / §247');
        assert.ok(/Milici/.test(block), 'comment must name Milici per §244');
        // Required: explicitly retract the prior Krstić §123 W-axis claim. The retraction
        // should be marked so future readers do not re-introduce the fabrication.
        assert.ok(
            /Krsti[ćc]\s+§+\s*12[23][\s\S]*do(?:\s+|\s*NOT\s+|\s+not\s+)name|do\s+NOT\s+name|not\s+name\s+brigades/i.test(block) ||
            /Krsti[ćc][\s\S]*do\s+NOT\s+name\s+brigades/i.test(block),
            'comment must explicitly retract the prior Krstić §123 brigade-naming claim (state §§122–123 do NOT name brigades / assign axes)',
        );
        // Forbidden: the prior fabricated "post-fall column interdiction" claim about Zvornik
        // contradicts §247 (TG-1 / Zvornik Brigade in opening assault from south, 5–6 July).
        assert.ok(
            !/Zvornik[\s\S]{0,200}post-fall[\s\S]{0,200}only/i.test(block) &&
            !/Zvornik[\s\S]{0,200}only[\s\S]{0,200}post-fall/i.test(block) &&
            !/joined\s+only\s+post-fall/i.test(block),
            'comment must not claim Zvornik joined Krivaja-95 only post-fall — §247 places Zvornik-Brigade-led TG-1 in the opening assault from the south on 5–6 July',
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
    // Minimal synthetic GameState wired with the five Krivaja-95 catalog
    // participants (Popović §244) at distinct locations so the helper has
    // something to do for every brigade EXCEPT rs_1st_bratunac (already at
    // staging) and rs_skelani_battalion (inactive — must be skipped).
    // rs_1st_zvornik location mirrors the n1614 diagnostic placement.
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
                rs_1st_zvornik: makeFormation('rs_1st_zvornik', {
                    location_osid: 'op:hanpijesak:han_pijesak_2',
                }),
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
            brigade_movement_state: {} as Record<string, unknown>,
            brigade_movement_orders: {} as Record<string, unknown>,
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

        // rs_1st_zvornik: not at staging → must have an order (per Popović §245 fn 757 / §247)
        const zvornikOrder = orders['rs_1st_zvornik' as never] as unknown as
            | { destination_sids?: string[]; stance?: string }
            | undefined;
        assert.ok(zvornikOrder, 'rs_1st_zvornik must have a movement order');
        assert.equal(zvornikOrder!.destination_sids?.[0], 'op:bratunac:bratunac_2');
        assert.equal(zvornikOrder!.stance, 'column');

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
    afterEach(() => {
        vi.resetModules();
        vi.doUnmock('../src/sim/combat/tactical_group_config.js');
    });

    it('emits movement orders for non-staged participants when Krivaja-95 fires', async () => {
        // LANE-NIGHTSHIFT-KRIVAJA-95-T168-FLOOR-FIX (d622b762, 2026-05-06):
        // Krivaja-95 trigger floor bumped 168→170 to enforce §6 canonical floor.
        //
        // TG activation (commit 0b681ffe, flags default-ON): with ENABLE_TG_ARMY_HQ_OPS on,
        // Krivaja-95 (army_hq_op_id set) is OWNED by the inject-army-hq-operations war-phase
        // step and is SKIPPED by the legacy checkTriggeredOperations path (triggered_operations.ts
        // line `if (ENABLE_TG_ARMY_HQ_OPS && def.army_hq_op_id != null) continue;`). This test
        // verifies the LEGACY triggered path's prestage wiring, so force the AHQ flag OFF to
        // exercise that path (flag-off byte-identity behavior, 188w 940251e4acaff3d4).
        vi.resetModules();
        vi.doMock('../src/sim/combat/tactical_group_config.js', async () => {
            const actual = await vi.importActual<typeof import('../src/sim/combat/tactical_group_config.js')>(
                '../src/sim/combat/tactical_group_config.js',
            );
            return { ...actual, ENABLE_TG_ARMY_HQ_OPS: false };
        });
        const { checkTriggeredOperations: checkTriggeredOperationsLegacy } =
            await import('../src/sim/combat/triggered_operations.js');

        const state = buildSyntheticState(170);
        state.military.fired_event_ids = [
            ...(state.military.fired_event_ids ?? []),
            'srebrenica_falls_1995',
        ];
        state.military.event_fire_counts = {
            ...(state.military.event_fire_counts ?? {}),
            srebrenica_falls_1995: 1,
        };
        state.military.event_last_fired_turn = {
            ...(state.military.event_last_fired_turn ?? {}),
            srebrenica_falls_1995: 170,
        };

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

        const injected = checkTriggeredOperationsLegacy(state);

        assert.ok(
            injected.includes('Operation Krivaja-95'),
            `Krivaja-95 must be injected at turn 170; got ${JSON.stringify(injected)}`,
        );

        const orders = state.military.brigade_movement_orders ?? {};
        const miliiOrder = (orders as Record<string, { destination_sids?: string[]; stance?: string }>)['rs_1st_milii'];
        const podrinjeOrder = (orders as Record<string, { destination_sids?: string[]; stance?: string }>)['rs_5th_podrinje'];
        const zvornikOrder = (orders as Record<string, { destination_sids?: string[]; stance?: string }>)['rs_1st_zvornik'];

        assert.ok(miliiOrder, 'rs_1st_milii must have a movement order after checkTriggeredOperations');
        assert.equal(miliiOrder.destination_sids?.[0], 'op:bratunac:bratunac_2');
        assert.equal(miliiOrder.stance, 'column');

        assert.ok(podrinjeOrder, 'rs_5th_podrinje must have a movement order after checkTriggeredOperations');
        assert.equal(podrinjeOrder.destination_sids?.[0], 'op:bratunac:bratunac_2');
        assert.equal(podrinjeOrder.stance, 'column');

        assert.ok(zvornikOrder, 'rs_1st_zvornik must have a movement order after checkTriggeredOperations');
        assert.equal(zvornikOrder.destination_sids?.[0], 'op:bratunac:bratunac_2');
        assert.equal(zvornikOrder.stance, 'column');
    });
});

// ---------------------------------------------------------------------------
// T7–T10 — Pre-stage helper preserves existing movement plans (Codex review,
// 2026-05-02 follow-up). The helper NEVER overwrites: brigades already
// in_transit keep transit progress; brigades with existing
// brigade_movement_orders keep that order.
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-KRIVAJA T7: prestage preserves in_transit toward same staging', () => {
    it('does not write a new order for a brigade already in_transit toward axis.staging_osid', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Krivaja-95');
        assert.ok(def);
        const state = buildSyntheticState(168);
        // rs_1st_milii is already in transit toward bratunac_2, with 1 turn remaining.
        const movementState = (state.military as unknown as { brigade_movement_state: Record<string, unknown> })
            .brigade_movement_state;
        movementState['rs_1st_milii'] = {
            status: 'in_transit',
            stance: 'column',
            destination_sids: ['op:bratunac:bratunac_2'],
            path: ['op:vlasenica:grabovica', 'op:bratunac:bratunac_2'],
            turns_remaining: 1,
        };

        prestageBrigadesForTriggeredOp(state, def!);

        const orders = state.military.brigade_movement_orders ?? {};
        const miliiOrder = (orders as Record<string, unknown>)['rs_1st_milii'];
        assert.equal(
            miliiOrder,
            undefined,
            'rs_1st_milii already in_transit toward staging; helper must not write a new order (would reset progress)',
        );

        // Transit state is preserved (turns_remaining unchanged)
        const transit = movementState['rs_1st_milii'] as { turns_remaining?: number };
        assert.equal(transit.turns_remaining, 1, 'in_transit turns_remaining must be unchanged');
    });
});

describe('LANE-2026-05-02-KRIVAJA T8: prestage preserves in_transit toward different destination', () => {
    it('does not override a brigade already in_transit toward a different OSID', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Krivaja-95');
        assert.ok(def);
        const state = buildSyntheticState(168);
        // rs_5th_podrinje is in_transit toward an unrelated OSID (e.g. emergency-defense march).
        const movementState = (state.military as unknown as { brigade_movement_state: Record<string, unknown> })
            .brigade_movement_state;
        movementState['rs_5th_podrinje'] = {
            status: 'in_transit',
            stance: 'column',
            destination_sids: ['op:zvornik:kozluk_2'],
            path: ['op:vlasenica:bacici', 'op:zvornik:kozluk_2'],
            turns_remaining: 2,
        };

        prestageBrigadesForTriggeredOp(state, def!);

        const orders = state.military.brigade_movement_orders ?? {};
        const podrinjeOrder = (orders as Record<string, unknown>)['rs_5th_podrinje'];
        assert.equal(
            podrinjeOrder,
            undefined,
            'rs_5th_podrinje already in_transit toward another destination; helper must not override (no priority over the originating owner)',
        );
    });
});

describe('LANE-2026-05-02-KRIVAJA T9: prestage preserves existing brigade_movement_orders', () => {
    it('does not silently stomp an existing pending order toward a different OSID', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Krivaja-95');
        assert.ok(def);
        const state = buildSyntheticState(168);
        // rs_1st_milii has a pending movement order toward an unrelated OSID written by
        // some other owner (commander correction, emergency defense, army reserve recall).
        const orders = (state.military as unknown as { brigade_movement_orders: Record<string, unknown> })
            .brigade_movement_orders;
        const PRE_EXISTING_DEST = 'op:zvornik:kozluk_2';
        orders['rs_1st_milii'] = {
            destination_sids: [PRE_EXISTING_DEST],
            stance: 'column',
        };

        prestageBrigadesForTriggeredOp(state, def!);

        const after = (state.military.brigade_movement_orders ?? {}) as Record<
            string,
            { destination_sids?: string[]; stance?: string }
        >;
        assert.equal(
            after['rs_1st_milii']?.destination_sids?.[0],
            PRE_EXISTING_DEST,
            'rs_1st_milii had a pre-existing order toward a different OSID; helper must NOT stomp it (no priority)',
        );
        assert.equal(after['rs_1st_milii']?.stance, 'column');
    });
});

describe('LANE-2026-05-02-KRIVAJA T10: prestage no-op when existing order matches staging', () => {
    it('does not double-write or alter an existing order already pointing at axis.staging_osid', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Krivaja-95');
        assert.ok(def);
        const state = buildSyntheticState(168);
        const orders = (state.military as unknown as { brigade_movement_orders: Record<string, unknown> })
            .brigade_movement_orders;
        const beforeRef = {
            destination_sids: ['op:bratunac:bratunac_2'],
            stance: 'column' as const,
        };
        orders['rs_5th_podrinje'] = beforeRef;

        prestageBrigadesForTriggeredOp(state, def!);

        const after = (state.military.brigade_movement_orders ?? {}) as Record<
            string,
            { destination_sids?: string[]; stance?: string }
        >;
        assert.equal(
            after['rs_5th_podrinje'],
            beforeRef,
            'rs_5th_podrinje had a pre-existing order toward staging; helper must leave it untouched (same reference)',
        );
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

/**
 * Late-1995 historical reversal operations contract tests.
 *
 * Source: docs/40_reports/implemented/20260501_LATE_1995_SCRIPTED_OPS_PACKET.md
 *
 * Verifies the late-1995 operations added to close the Family-1 (missing
 * scenario content) gap. Operation Sana and Mistral 2 were migrated to the opportunity
 * catalog (LANE B Phase 3, 2026-05-01); see
 * tests/operation_opportunities_5th_corps_sana.test.ts for its coverage.
 * Krivaja-95 / Stupčanica-95 are sensitive-history T4 candidates — they
 * remain calendar-triggered until the SENSITIVE_HISTORY_DESIGN_GATE.md §6
 * sign-off chain authors a T4 opportunity replacement.
 *
 * Contract for the remaining two:
 *   1. Each op exists with the correct faction / primary_corps / turn gate.
 *   2. Each op's trigger returns false before its historical turn window.
 *   3. Each op's objective OSIDs are 712-OSID universe canonical names.
 *   4. Each op's objectives are painted-flipped between apr1995 and oct1995.
 *   5. No op fires before turn 168 (the earliest historical turn = Krivaja-95).
 *   6. The two remaining ops appear after the four legacy ops in the catalog.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'vitest';

import { _TRIGGERED_OPS } from '../src/sim/combat/triggered_operations.js';
import type { GameState } from '../src/state/game_state.js';

const NEW_OP_NAMES = [
    'Operation Krivaja-95',
    'Operation Stupčanica-95',
] as const;

const PAINTED_OCT_1995 = JSON.parse(
    readFileSync('data/source/calibration/painted_control_oct1995.json', 'utf8'),
) as { by_settlement_id?: Record<string, string> } & Record<string, string>;
const PAINTED_APR_1995 = JSON.parse(
    readFileSync('data/source/calibration/painted_control_apr1995.json', 'utf8'),
) as { by_settlement_id?: Record<string, string> } & Record<string, string>;

const oct1995Map = (PAINTED_OCT_1995.by_settlement_id ?? PAINTED_OCT_1995) as Record<string, string>;
const apr1995Map = (PAINTED_APR_1995.by_settlement_id ?? PAINTED_APR_1995) as Record<string, string>;

function trivialState(turn: number): GameState {
    // Minimal state for trigger-only tests. Triggers in this packet are pure
    // turn comparisons, so we do not need a full game state to invoke them.
    return {
        meta: { turn } as unknown,
        military: { corps_command: {}, formations: {} },
        political: { political_controllers: {} },
    } as unknown as GameState;
}

describe('late-1995 triggered operations — catalog', () => {
    it('contains the two sensitive-history late-1995 reversal operations after the four legacy ops', () => {
        const names = _TRIGGERED_OPS.map((def) => def.name);
        for (const name of NEW_OP_NAMES) {
            assert.ok(names.includes(name), `expected catalog to contain ${name}`);
        }
        // Ordering: legacy four first, late-1995 sensitive-history two after.
        // Sana and Mistral 2 are migrated to opportunity catalogs.
        // ADR-0005 v3.0 (2026-05-29): the army_hq_only def Farz 95 (Vozuća) is
        // inserted between Krivaja-95 and Stupčanica-95, so the two sensitive-
        // history ops are no longer the literal tail-2. Assert instead that both
        // appear after the four legacy ops (the original intent of this contract).
        const legacyFour = [
            'Operation Posavina Corridor',
            'Operation Herzegovina Consolidation',
            'Operation Kotor Varos',
            'Operation Cerska-Kamenica',
        ];
        const lastLegacyIdx = Math.max(...legacyFour.map((n) => names.indexOf(n)));
        for (const name of NEW_OP_NAMES) {
            assert.ok(names.indexOf(name) > lastLegacyIdx, `expected ${name} after the four legacy ops`);
        }
    });

    it('Operation Krivaja-95 has the expected faction/corps/turn-gate/single-axis shape', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Krivaja-95');
        assert.ok(def);
        assert.equal(def!.faction, 'RS');
        assert.equal(def!.primary_corps, 'vrs_drina');
        assert.equal(def!.axes.length, 1);
        assert.equal(def!.axes[0]!.axis_id, 'srebrenica_enclave');
        assert.equal(def!.axes[0]!.corps, 'vrs_drina');
        assert.equal(def!.staging_osid, 'op:bratunac:bratunac_2');
        // Trigger gate: w >= 170 (LANE-NIGHTSHIFT-KRIVAJA-95-T168-FLOOR-FIX
        // 2026-05-06: bumped 168→170 to enforce §6 canonical floor; sign-off
        // precedent b03333af / bc44ddec).
        assert.equal(def!.trigger(trivialState(169), 169), false);
        assert.equal(def!.trigger(trivialState(170), 170), true);
    });

    it('Operation Stupčanica-95 has the expected faction/corps/turn-gate/single-axis shape', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Stupčanica-95');
        assert.ok(def);
        assert.equal(def!.faction, 'RS');
        assert.equal(def!.primary_corps, 'vrs_drina');
        assert.equal(def!.axes.length, 1);
        assert.equal(def!.axes[0]!.axis_id, 'zepa_pocket');
        assert.equal(def!.staging_osid, 'op:vlasenica:grabovica');
        assert.equal(def!.axes[0]!.objectives.length, 1);
        assert.equal(def!.axes[0]!.objectives[0], 'op:rogatica:zepa_2');
        // Trigger gate: w >= 172 (after Krivaja-95 completion)
        assert.equal(def!.trigger(trivialState(171), 171), false);
        assert.equal(def!.trigger(trivialState(172), 172), true);
    });

    it('Operation Mistral 2 has migrated out of triggered operations', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Mistral 2');
        assert.equal(def, undefined);
    });

    // Operation Sana and Mistral 2 shape tests migrated to opportunity catalog
    // suites. The opportunity catalog now owns the axis layout + brigade roster.
});

describe('late-1995 triggered operations — turn gates protect early-war runs', () => {
    it('no late-1995 op trigger returns true at any turn < 168', () => {
        for (const name of NEW_OP_NAMES) {
            const def = _TRIGGERED_OPS.find((d) => d.name === name);
            assert.ok(def, name);
            for (const t of [0, 10, 40, 52, 100, 104, 156, 167]) {
                assert.equal(
                    def!.trigger(trivialState(t), t),
                    false,
                    `${name} must not trigger at turn ${t}`,
                );
            }
        }
    });

    it('all late-1995 op turn gates are >= 168 (Krivaja-95 earliest)', () => {
        for (const name of NEW_OP_NAMES) {
            const def = _TRIGGERED_OPS.find((d) => d.name === name);
            assert.ok(def, name);
            // Sweep from 168 upward and find the first turn where trigger flips true.
            let firstTrue = -1;
            for (let t = 168; t <= 200; t++) {
                if (def!.trigger(trivialState(t), t)) {
                    firstTrue = t;
                    break;
                }
            }
            assert.ok(firstTrue >= 168, `${name} first-true turn ${firstTrue} must be >= 168`);
        }
    });
});

describe('late-1995 triggered operations — objective OSIDs are valid + painted-flipped', () => {
    it('Krivaja-95 objectives are exactly the apr1995=RBiH → oct1995=RS Srebrenica enclave OSIDs', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Krivaja-95');
        assert.ok(def);
        for (const osid of def!.axes[0]!.objectives) {
            assert.equal(apr1995Map[osid], 'RBiH', `${osid} should be apr1995=RBiH`);
            assert.equal(oct1995Map[osid], 'RS', `${osid} should be oct1995=RS`);
        }
    });

    it('Stupčanica-95 objective op:rogatica:zepa_2 is apr1995=RBiH → oct1995=RS', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Stupčanica-95');
        assert.ok(def);
        const objective = def!.axes[0]!.objectives[0];
        assert.equal(apr1995Map[objective!], 'RBiH');
        assert.equal(oct1995Map[objective!], 'RS');
    });

    // Sana and Mistral 2 painted-truth assertions migrated to opportunity-catalog test packs.

    it('all new-op objectives are deterministic (each axis preserves declared order, no duplicates)', () => {
        for (const name of NEW_OP_NAMES) {
            const def = _TRIGGERED_OPS.find((d) => d.name === name);
            assert.ok(def, name);
            for (const axis of def!.axes) {
                const seen = new Set<string>();
                for (const osid of axis.objectives) {
                    assert.ok(!seen.has(osid), `duplicate objective ${osid} in ${name}/${axis.axis_id}`);
                    seen.add(osid);
                }
            }
        }
    });
});

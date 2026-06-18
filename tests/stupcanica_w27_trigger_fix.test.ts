/**
 * Stupčanica-95 w27 trigger fix — LANE-NIGHTSHIFT-STUPCANICA-W27-TRIGGER-FIX.
 *
 * Pre-existing canon-violation: "Operation Stupčanica-95" appeared in 40w / 188w
 * runs at w27 (e.g. n1717, n1707), well below the §6 sensitive-history canonical
 * floor of t≥172. The Krivaja-95 t168 floor fix `d622b762` correctly bumped both
 * Krivaja-95 (t≥170) and Stupčanica-95 (t≥172) trigger predicates in
 * `triggered_operations.ts`. Investigation showed the trigger predicates were
 * always being honored — the leak was elsewhere.
 *
 * Root cause (Phase 0 diagnosis = (c) name-collision): the bot operation name
 * pool in `src/sim/combat/operation_names.ts` contained the literal entries
 * `'Operacija Krivaja'`, `'Operacija Stupčanica'`, `'Operacija Sana'`, and
 * `'Operacija Maestral'` — the SAME canonical names used by the
 * triggered/opportunity ops. `pickOperationName(corpsId, turn, faction)`
 * sequentially consumes the pool with no exclusion list for canonical
 * sensitive-history names. So at any turn (including w27), an unrelated
 * bot-launched corps op could be assigned the canonical name "Operacija
 * Stupčanica" — masquerading as the canonical Stupčanica-95 in AAR scans
 * and weekly reports.
 *
 * The fix is a single-file data edit (operation_names.ts): remove the four
 * colliding canonical names from the bot pool. The block-level comment in
 * that file ALREADY claimed these names were excluded ("Pre-planned and
 * triggered operation names are NOT in these pools") — this fix makes the
 * code match the documented intent.
 *
 * Faction-symmetric mechanism: same exclusion applied to RS (Krivaja /
 * Stupčanica), RBiH (Sana), and HRHB (Maestral). No combat, §6 territorial,
 * or §6 atrocity surface is touched.
 *
 * Sign-off precedent: Krivaja Phase 1 `bc44ddec`; Stupčanica SHAPE B
 * `b03333af`; Krivaja-95 t168 floor fix `d622b762`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import { _TRIGGERED_OPS } from '../src/sim/combat/triggered_operations.js';
import { OPERATION_NAMES, pickOperationName } from '../src/sim/combat/operation_names.js';
import type { GameState } from '../src/state/game_state.js';

function trivialState(turn: number): GameState {
    return {
        meta: { turn } as unknown,
        military: { corps_command: {}, formations: {} },
        political: { political_controllers: {} },
    } as unknown as GameState;
}

function stateWithZepaFallReceipt(turn: number): GameState {
    return {
        meta: { turn } as unknown,
        military: {
            corps_command: {},
            formations: {},
            fired_event_ids: ['zepa_falls_1995'],
            event_fire_counts: { zepa_falls_1995: 1 },
            event_last_fired_turn: { zepa_falls_1995: turn },
        },
        political: { political_controllers: {} },
    } as unknown as GameState;
}

// ═══════════════════════════════════════════════════════════════════════════
// T1 — Stupčanica-95 trigger evaluates to false at turn=27 (canon floor t≥172).
// Pin the canonical floor; regression-guards d622b762.
// ═══════════════════════════════════════════════════════════════════════════
describe('Stupčanica-95 trigger — canonical floor t≥172', () => {
    it('T1: trigger evaluates to false at turn=27 (canon-violation regression pin)', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Stupčanica-95');
        assert.ok(def, 'expected Operation Stupčanica-95 in triggered ops catalog');
        assert.equal(
            def!.trigger(trivialState(27), 27),
            false,
            'Stupčanica-95 must NOT trigger at turn=27 (canon floor t≥172).',
        );
        // Also verify the trigger is false at every turn 0..171, not just 27.
        for (const t of [0, 10, 27, 40, 100, 168, 170, 171]) {
            assert.equal(
                def!.trigger(trivialState(t), t),
                false,
                `Stupčanica-95 must NOT trigger at turn=${t} (below t≥172 floor).`,
            );
        }
    });

    it('T2: trigger evaluates to true after the Zepa fall receipt at turn=172+', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Stupčanica-95');
        assert.ok(def);
        // First true at canon floor t=172, then 173, 174, 175, ...
        assert.equal(def!.trigger(stateWithZepaFallReceipt(172), 172), true);
        assert.equal(def!.trigger(stateWithZepaFallReceipt(174), 174), true);
        assert.equal(def!.trigger(stateWithZepaFallReceipt(175), 175), true);
        assert.equal(def!.trigger(stateWithZepaFallReceipt(200), 200), true);
    });

    it('T3: trigger evaluation is deterministic — re-eval byte-identical', () => {
        const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Stupčanica-95');
        assert.ok(def);
        // Same (state, turn) must return the same boolean every call.
        for (const t of [27, 100, 171, 172, 174, 200]) {
            const state = t >= 172 ? stateWithZepaFallReceipt(t) : trivialState(t);
            const a = def!.trigger(state, t);
            const b = def!.trigger(state, t);
            const c = def!.trigger(state, t);
            assert.equal(a, b, `non-deterministic trigger at turn=${t}: call1≠call2`);
            assert.equal(b, c, `non-deterministic trigger at turn=${t}: call2≠call3`);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// T4 — Bot operation name pool does NOT collide with canonical sensitive-
// history op names. This is the actual mechanism fix; without it, the
// trigger predicate is bypassed by a name-collision via `pickOperationName`.
// ═══════════════════════════════════════════════════════════════════════════
describe('bot operation name pool — no canonical sensitive-history name collisions', () => {
    it('T4: RS pool excludes Krivaja and Stupčanica (canonical triggered ops)', () => {
        assert.ok(
            !OPERATION_NAMES.RS!.includes('Operacija Krivaja'),
            '"Operacija Krivaja" must NOT be in the RS bot pool — collides with canonical "Operation Krivaja-95".',
        );
        assert.ok(
            !OPERATION_NAMES.RS!.includes('Operacija Stupčanica'),
            '"Operacija Stupčanica" must NOT be in the RS bot pool — collides with canonical "Operation Stupčanica-95".',
        );
    });

    it('T5: RBiH pool excludes Sana (canonical opportunity op)', () => {
        assert.ok(
            !OPERATION_NAMES.RBiH!.includes('Operacija Sana'),
            '"Operacija Sana" must NOT be in the RBiH bot pool — collides with canonical "Operation Sana" (opportunity catalog).',
        );
    });

    it('T6: HRHB pool excludes Maestral (canonical Mistral 2 triggered op)', () => {
        assert.ok(
            !OPERATION_NAMES.HRHB!.includes('Operacija Maestral'),
            '"Operacija Maestral" must NOT be in the HRHB bot pool — collides with canonical "Operation Mistral 2".',
        );
    });

    it('T7: pickOperationName never returns a canonical sensitive-history name', () => {
        // Sweep a generous (corps, turn) grid for each faction and ensure no
        // canonical sensitive-history name is ever picked. State is reset per
        // call so we explore the hash-start space without sequential exhaustion.
        const banned = {
            RS: ['Operacija Krivaja', 'Operacija Stupčanica'],
            RBiH: ['Operacija Sana'],
            HRHB: ['Operacija Maestral'],
        } as const;
        const corpsIds = ['corps_1kk', 'vrs_drina', 'vrs_east_bosnian', 'vrs_sarajevo_romanija', 'arbih_1kor', 'arbih_2kor', 'arbih_3kor', 'arbih_5kor', 'hvo_main_staff', 'hvo_tomislavgrad'];
        for (const faction of ['RS', 'RBiH', 'HRHB'] as const) {
            for (const corps of corpsIds) {
                for (let t = 0; t < 200; t++) {
                    const name = pickOperationName(corps, t, faction);
                    for (const b of banned[faction]) {
                        assert.notEqual(
                            name,
                            b,
                            `pickOperationName(${corps}, ${t}, ${faction}) returned banned canonical name "${b}".`,
                        );
                    }
                }
            }
        }
    });
});

/**
 * §6 mechanics item 2 (MUST-FIX before the engine freeze; signed unanimously, round 3, 2026-11-23; s6_mech_r3_final.md):
 * at Full Control the player can give a paramilitary standing order with no request pending.
 *
 * - The review IPC accepts a policy-only call (no decisions) when nothing of the side's is pending, under the same
 *   autonomy rule as the opener (the manual player only, `selectManualPlayerFaction`) and the same cap (§6 design M).
 * - Fixed in the same change: the global order is written only after matching succeeds, so an unmatched call leaves it.
 * - The call writes ONE target-less standing-order row (`kind: 'standing_order'`, `order`, `faction`, deterministic id),
 *   never `decision: 'allow'`.
 * - Own-record readers count it (it ends the no-card historical default); every per-target reader skips it: a source
 *   scan over every history reader, plus a seeded-row test (no receipt, grade, cost-ledger, deployment or spawn effect).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveParamilitaryReviewRequests } from '../src/desktop/paramilitary_review_ipc.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import {
    explicitParamilitaryOrder,
    humanStandingParamilitaryOrder,
    resolveNonManualParamilitaryPolicy,
} from '../src/sim/combat/paramilitary_policy.js';
import { detectParamilitaryTargets, recordPlayerParamilitaryStandingOrder } from '../src/sim/combat/paramilitary_sweep.js';
import {
    PARAMILITARY_ORDER_NOT_MANUAL,
    PARAMILITARY_POLICY_CANNOT_LOOSEN,
    readParamilitaryStandingOrder,
    type ParamilitaryPolicyOrder,
} from '../src/sim/events/paramilitary_policy_card.js';
import { hasInPersonParamilitaryStandingOrder } from '../src/sim/events/paramilitary_policy_flag.js';
import { computeWarCostIndex, currentCondemnationFlags } from '../src/sim/negotiation/scoring.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import type { FactionId, FactionState, GameState, ParamilitaryDecisionRecord } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { buildDecisionConsequenceLedger } from '../src/ui/map/data/decisionConsequenceLedger.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { RBIH_POLICY, RS_POLICY } from './helpers/s6_opening_lane_fixtures.js';
import { withoutComments } from './helpers/sourceComments.js';

const requireCjs = createRequire(import.meta.url);
const { projectPlayerVisibleState } = requireCjs('../src/desktop/player_visible_state.cjs') as {
    projectPlayerVisibleState: (state: unknown) => any;
};

const CARD: Record<string, string> = { RBiH: RBIH_POLICY, RS: RS_POLICY };
const POLICY_FLAG: Record<string, string> = { RBiH: 'rbih_paramilitary_policy', RS: 'rs_paramilitary_policy' };
const HUBS = ['op:pocket:hub_a', 'op:pocket:hub_b', 'op:pocket:hub_c'];
const TARGET = 'op:pocket:target';
const ENEMY: Record<string, FactionId> = { RBiH: 'RS', RS: 'RBiH', HRHB: 'RS' };

function edges(): EdgeRecord[] {
    const pairs: Array<[string, string]> = [[HUBS[0]!, HUBS[1]!], [HUBS[0]!, HUBS[2]!]];
    for (const hub of HUBS) pairs.push([hub, TARGET]);
    return pairs.map(([a, b]) => ({ a, b }) as EdgeRecord);
}

function reverseMap(): OperationalToCanonicalReverseMap {
    return new Map([...HUBS, TARGET].map((osid) => [osid, [osid]]));
}

/** One enemy pocket inside the player's ground (the T3 gate test's fixture), the player at `autonomy`. */
function pocketState(player: FactionId, turn = 6, autonomy = 0): GameState {
    const controllers: Record<string, FactionId> = {};
    for (const hub of HUBS) controllers[hub] = player;
    controllers[TARGET] = ENEMY[player]!;
    return {
        meta: { turn, phase: 'war', schema_version: 1, seed: 'test', player_faction: player, headless_scenario_auto_control: false, autonomy_level: autonomy } as GameState['meta'],
        factions: [{ id: 'HRHB' } as FactionState, { id: 'RBiH' } as FactionState, { id: 'RS' } as FactionState],
        military: {
            formations: {},
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']),
            fired_event_ids: [],
            event_fire_counts: {},
            event_last_fired_turn: {},
            enabled_event_ids: [],
            closed_event_ids: [],
            event_decision_log: [],
            event_flags: {},
        } as any,
        political: {
            political_controllers: controllers,
            municipalities: {
                pocket: {
                    organizational_penetration: {
                        sda_penetration: 85,
                        sds_penetration: 85,
                        hdz_penetration: 85,
                        patriotska_liga: player === 'RBiH' ? 90 : 5,
                        paramilitary_rs: player === 'RS' ? 90 : 5,
                        paramilitary_hrhb: player === 'HRHB' ? 90 : 5,
                    },
                },
            },
        } as any,
        displacement: {
            civilian_casualties: {
                RS: { killed: 0, fled_abroad: 0 },
                RBiH: { killed: 0, fled_abroad: 0 },
                HRHB: { killed: 0, fled_abroad: 0 },
            },
        } as any,
    } as GameState;
}

/** The side's policy card fired and its answer applied (the flag is written only by an applied answer). */
function applyCard(state: GameState, faction: FactionId, answer: ParamilitaryPolicyOrder, source: 'player' | 'bot' = 'player', turn = 4): void {
    const card = CARD[faction]!;
    state.military.fired_event_ids.push(card);
    state.military.event_fire_counts[card] = 1;
    state.military.event_last_fired_turn[card] = turn;
    state.military.event_decision_log.push({ event_id: card, response_id: answer, decision_source: source, faction, turn } as any);
    state.military.event_flags[POLICY_FLAG[faction]!] = answer;
    state.paramilitary_policy = answer;
}

function order(state: GameState, policy: ParamilitaryPolicyOrder) {
    return resolveParamilitaryReviewRequests(state, { decisions: [], policy });
}

function expectRefusedUnchanged(state: GameState, policy: ParamilitaryPolicyOrder, error: string, label: string): void {
    const before = JSON.stringify(state);
    expect(order(state, policy), label).toEqual({ ok: false, error });
    expect(JSON.stringify(state), label).toBe(before);
}

function standingRows(state: GameState) {
    return (state.paramilitary_decision_history ?? []).filter((row) => row.kind === 'standing_order');
}

describe('§6 item 2: the policy-only review call (the Full Control opener)', () => {
    it('HRHB at Full Control: the opener records Always deny as one standing-order row and ends the historical default', () => {
        const state = pocketState('HRHB', 6, 0);
        expect(explicitParamilitaryOrder(state, 'HRHB')).toBeNull();
        const result = order(state, 'always_deny');
        expect(result).toEqual({ ok: true, report: { spawned: [], captured: [], dissolved: [], pending_player_requests: 0 } });
        expect(state.paramilitary_policy).toBe('always_deny');
        expect(state.paramilitary_decision_history).toEqual([
            { kind: 'standing_order', id: 'paramilitary_order:6:HRHB', turn: 6, faction: 'HRHB', order: 'always_deny' },
        ]);
        // Never a decision row: no `decision`, no target.
        expect(state.paramilitary_decision_history![0]).not.toHaveProperty('decision');
        expect(state.paramilitary_decision_history![0]).not.toHaveProperty('target_osid');
        // Own-record readers count it.
        expect(explicitParamilitaryOrder(state, 'HRHB')).toBe('always_deny');
        expect(hasInPersonParamilitaryStandingOrder(state, 'HRHB')).toBe(true);
        // Its staff at Assisted now follow the player's refusal, not the historical default.
        state.meta.autonomy_level = 1;
        expect(humanStandingParamilitaryOrder(state, 'HRHB')).toBe('always_deny');
        expect(resolveNonManualParamilitaryPolicy(state, 'HRHB', undefined)).toBe('always_deny');
    });

    it('HRHB at Assisted: the opener is refused and nothing changes (the historical default stands)', () => {
        const state = pocketState('HRHB', 6, 1);
        expectRefusedUnchanged(state, 'always_deny', PARAMILITARY_ORDER_NOT_MANUAL, 'HRHB a1');
        expect(state.paramilitary_decision_history).toBeUndefined();
        expect(explicitParamilitaryOrder(state, 'HRHB')).toBeNull();
    });

    it('RS from Observer to Full Control: refused at Observer, then Always deny is recorded at Full Control', () => {
        const state = pocketState('RS', 8, 3);
        applyCard(state, 'RS', 'always_allow', 'bot');
        expectRefusedUnchanged(state, 'always_deny', PARAMILITARY_ORDER_NOT_MANUAL, 'RS a3');
        state.meta.autonomy_level = 0;
        expect(order(state, 'always_deny').ok).toBe(true);
        expect(readParamilitaryStandingOrder(state, 'RS')).toBe('always_deny');
        expect(hasInPersonParamilitaryStandingOrder(state, 'RS')).toBe(true);
        expect(standingRows(state).map((row) => row.order)).toEqual(['always_deny']);
        // At Full Control under Always deny no request is filed and nothing is sent.
        const report = detectParamilitaryTargets(state, edges(), reverseMap(), undefined);
        expect(report.spawned).toEqual([]);
        expect(report.pending_player_requests).toBe(0);
        expect(state.pending_paramilitary_requests ?? []).toEqual([]);
    });

    it('RS who chose Always allow in person tightens it to Always deny through the opener', () => {
        const state = pocketState('RS', 8, 0);
        applyCard(state, 'RS', 'always_allow', 'player');
        expect(order(state, 'always_allow').ok).toBe(true);
        expect(hasInPersonParamilitaryStandingOrder(state, 'RS')).toBe(true);
        expect(readParamilitaryStandingOrder(state, 'RS')).toBe('always_allow');
        state.meta.turn = 9;
        expect(order(state, 'always_deny').ok).toBe(true);
        expect(readParamilitaryStandingOrder(state, 'RS')).toBe('always_deny');
        expect(standingRows(state).map((row) => [row.id, row.order])).toEqual([
            ['paramilitary_order:8:RS', 'always_allow'],
            ['paramilitary_order:9:RS', 'always_deny'],
        ]);
        const report = detectParamilitaryTargets(state, edges(), reverseMap(), undefined);
        expect(report.spawned).toEqual([]);
        expect(report.pending_player_requests).toBe(0);
    });

    it('cap and gate: never above the applied card answer, nor above ask before it applies; refused calls write nothing', () => {
        const refused = pocketState('RS', 8, 0);
        applyCard(refused, 'RS', 'always_deny');
        expectRefusedUnchanged(refused, 'always_allow', PARAMILITARY_POLICY_CANNOT_LOOSEN, 'RS refused: allow');
        expectRefusedUnchanged(refused, 'ask', PARAMILITARY_POLICY_CANNOT_LOOSEN, 'RS refused: ask');
        expect(order(refused, 'always_deny').ok).toBe(true);

        const unapplied = pocketState('RBiH', 2, 0);
        expectRefusedUnchanged(unapplied, 'always_allow', PARAMILITARY_POLICY_CANNOT_LOOSEN, 'RBiH before its card applies');
        expect(order(unapplied, 'always_deny').ok).toBe(true);

        // HRHB has no card and no cap: Always allow is accepted.
        const hrhb = pocketState('HRHB', 6, 0);
        expect(order(hrhb, 'always_allow').ok).toBe(true);
        expect(standingRows(hrhb).map((row) => row.order)).toEqual(['always_allow']);
    });

    it('a policy-only call while one of the side\'s requests is pending stays invalid; a policy with no decisions array is invalid', () => {
        const state = pocketState('HRHB', 6, 0);
        state.pending_paramilitary_requests = [{ target_osid: TARGET, faction: 'HRHB', strength: 150, mode: 'rear_pocket' } as any];
        expectRefusedUnchanged(state, 'always_deny', 'invalid_decisions', 'pending own request');
        const before = JSON.stringify(state);
        expect(resolveParamilitaryReviewRequests(state, { policy: 'always_deny' })).toEqual({ ok: false, error: 'no_state_or_invalid_payload' });
        expect(resolveParamilitaryReviewRequests(state, { decisions: [{ bogus: 1 }], policy: 'always_deny' })).toEqual({ ok: false, error: 'invalid_decisions' });
        expect(JSON.stringify(state)).toBe(before);
    });

    it('write order fixed: an unmatched call with a policy returns request_not_found and leaves the global order as it was', () => {
        const state = pocketState('HRHB', 6, 0);
        state.paramilitary_policy = 'always_deny';
        state.pending_paramilitary_requests = [{ target_osid: TARGET, faction: 'HRHB', strength: 150, mode: 'rear_pocket' } as any];
        const result = resolveParamilitaryReviewRequests(state, {
            decisions: [{ target_osid: 'op:elsewhere', decision: 'deny' }],
            policy: 'ask',
        });
        expect(result).toEqual({ ok: false, error: 'request_not_found' });
        // Before the fix the global order was written first and read 'ask' here.
        expect(state.paramilitary_policy).toBe('always_deny');
        state.paramilitary_policy = 'ask';
        const partial = resolveParamilitaryReviewRequests(state, {
            decisions: [{ target_osid: 'op:elsewhere', decision: 'deny' }],
            policy: 'always_deny',
        });
        // always_deny fills the pending request, so this one matches and succeeds: the write happens after matching.
        expect(partial.ok).toBe(true);
        expect(state.paramilitary_policy).toBe('always_deny');

        const unmatched = pocketState('HRHB', 6, 0);
        unmatched.paramilitary_policy = 'always_deny';
        unmatched.pending_paramilitary_requests = [
            { target_osid: TARGET, faction: 'HRHB', strength: 150, mode: 'rear_pocket' } as any,
            { target_osid: 'op:second', faction: 'HRHB', strength: 150, mode: 'rear_pocket' } as any,
        ];
        expect(resolveParamilitaryReviewRequests(unmatched, {
            decisions: [{ target_osid: TARGET, decision: 'deny' }],
            policy: 'ask',
        })).toEqual({ ok: false, error: 'incomplete_decisions' });
        expect(unmatched.paramilitary_policy).toBe('always_deny');
    });

    it('the id is deterministic: a second order the same turn replaces the row; rows sort by turn then strictCompare(id)', () => {
        const state = pocketState('HRHB', 6, 0);
        state.paramilitary_decision_history = [
            { id: 'paramilitary:6:op:z', turn: 6, target_osid: 'op:z', faction: 'HRHB', strength: 150, decision: 'deny' },
            { id: 'paramilitary:3:op:a', turn: 3, target_osid: 'op:a', faction: 'HRHB', strength: 150, decision: 'deny' },
        ];
        recordPlayerParamilitaryStandingOrder(state, 'HRHB', 'always_allow');
        recordPlayerParamilitaryStandingOrder(state, 'HRHB', 'always_deny');
        expect(state.paramilitary_decision_history!.map((row) => row.id)).toEqual([
            'paramilitary:3:op:a',
            'paramilitary:6:op:z',
            'paramilitary_order:6:HRHB',
        ]);
        expect(standingRows(state).map((row) => row.order)).toEqual(['always_deny']);
    });
});

describe('§6 item 2: a seeded standing-order row has no per-target effect', () => {
    const ORDER_ROW: ParamilitaryDecisionRecord = {
        // Filed the turn after the sweep below, so the receipt's cause (an own-record reader, pinned separately) is the same.
        kind: 'standing_order', id: 'paramilitary_order:6:RS', turn: 6, faction: 'RS', order: 'always_allow',
    };

    function seeded(withRow: boolean): GameState {
        const state = pocketState('RS', 6, 0);
        applyCard(state, 'RS', 'always_allow', 'player');
        state.military.formations = {
            para_1: {
                id: 'para_1', faction: 'RS', kind: 'paramilitary', status: 'dissolved', created_turn: 5,
                paramilitary_target: TARGET, personnel: 0,
            } as any,
        };
        state.paramilitary_deployment_count = { RS: 1 } as any;
        if (withRow) state.paramilitary_decision_history = [ORDER_ROW];
        return state;
    }

    it('no receipt, no consequence-ledger line, no cadence event, no unrequested-sweep change', () => {
        // The renderer's path: the player-visible projection (which keeps the own row), then the adapter.
        const without = parseGameState(projectPlayerVisibleState(JSON.parse(serializeState(seeded(false)))));
        const withRow = parseGameState(projectPlayerVisibleState(JSON.parse(serializeState(seeded(true)))));
        expect(withRow.paramilitaryDecisionHistory).toBeUndefined();
        // The same sweep receipts (the row decides no target, so it hides none and adds none). Only the receipt's CAUSE
        // reads it, as an own record (deriveParamilitaryReceiptCause): pinned in the next test.
        const strip = (list: typeof without.paramilitaryUnrequested) => (list ?? []).map(({ cause: _cause, ...rest }) => rest);
        expect(withRow.paramilitaryUnrequested).toHaveLength(1);
        expect(strip(withRow.paramilitaryUnrequested)).toEqual(strip(without.paramilitaryUnrequested));
        expect(buildDecisionConsequenceLedger(withRow, 100)).toEqual(buildDecisionConsequenceLedger(without, 100));
        expect(buildDecisionConsequenceLedger(withRow, 100).some((record) => record.id.includes('paramilitary_order'))).toBe(false);
    });

    it('the receipt cause counts the row as the side\'s own record: never the historical default after the player\'s order', () => {
        // Own-record reader decision (PR record): like any record the player filed, the row makes the cause neutral, so a
        // receipt never credits the player's own order to the historical policy (§4 C1) and an HRHB sweep after the
        // player's order is never called the historical default.
        const cardSide = seeded(true);
        cardSide.paramilitary_decision_history = [{ ...ORDER_ROW, id: 'paramilitary_order:5:RS', turn: 5 } as ParamilitaryDecisionRecord];
        const cardView = parseGameState(projectPlayerVisibleState(JSON.parse(serializeState(cardSide))));
        expect(cardView.paramilitaryUnrequested?.map((sweep) => sweep.cause)).toEqual(['neutral']);

        const hrhb = (withRow: boolean) => {
            const state = pocketState('HRHB', 6, 1);
            state.military.formations = {
                para_1: { id: 'para_1', faction: 'HRHB', kind: 'paramilitary', status: 'dissolved', created_turn: 5, paramilitary_target: TARGET, personnel: 0 } as any,
            };
            if (withRow) state.paramilitary_decision_history = [{ kind: 'standing_order', id: 'paramilitary_order:4:HRHB', turn: 4, faction: 'HRHB', order: 'always_allow' }];
            return parseGameState(projectPlayerVisibleState(JSON.parse(serializeState(state)))).paramilitaryUnrequested?.map((sweep) => sweep.cause);
        };
        expect(hrhb(false)).toEqual(['historical_default_staff']);
        expect(hrhb(true)).toEqual(['neutral']);
    });

    it('no grade or cost effect, and the projection keeps the own row for the renderer', () => {
        expect(computeWarCostIndex(seeded(true), 'RS')).toBe(computeWarCostIndex(seeded(false), 'RS'));
        expect(currentCondemnationFlags(seeded(true), 'RS')).toEqual(currentCondemnationFlags(seeded(false), 'RS'));
        const projected = projectPlayerVisibleState(seeded(true));
        expect(projected.paramilitary_decision_history).toEqual([ORDER_ROW]);
    });

    it('no deployment or spawn: detect sends and files exactly what it does without the row', () => {
        const a = seeded(false);
        const b = seeded(true);
        // Same turn as the row: collectParamilitaryIssuedTargets must not read a target off it.
        a.meta.turn = 6;
        b.meta.turn = 6;
        const ra = detectParamilitaryTargets(a, edges(), reverseMap(), undefined);
        const rb = detectParamilitaryTargets(b, edges(), reverseMap(), undefined);
        expect(rb).toEqual(ra);
        expect(b.pending_paramilitary_requests ?? []).toEqual(a.pending_paramilitary_requests ?? []);
        expect(Object.keys(b.military.formations).sort()).toEqual(Object.keys(a.military.formations).sort());
    });

    it('the save round trip keeps the row byte for byte', () => {
        const state = seeded(true);
        const once = serializeState(state);
        const twice = serializeState(deserializeState(once));
        expect(twice).toBe(once);
        expect(deserializeState(once).paramilitary_decision_history).toEqual([ORDER_ROW]);
    });
});

// ─── Source scan: every reader of the history is classified, and every per-target reader skips the row ───

const READER_PATTERN = /paramilitary_decision_history|paramilitaryDecisionHistory/;

/** Own-record readers: they read only `faction` and `turn`, so the row counts as the side's own record. */
const OWN_RECORD_READERS = new Set([
    'src/sim/combat/paramilitary_policy.ts',
    'src/sim/events/paramilitary_policy_flag.ts',
]);
/** Per-target readers: each must skip the standing-order row by its kind. */
const PER_TARGET_READERS = new Set([
    'src/sim/combat/paramilitary_sweep.ts',
    'src/ui/map/data/GameStateAdapter.ts',
    'tools/diagnostics/presidential_cadence_report.ts',
    'tools/ui/paradox_local_qa.cjs',
]);
/** Readers of the adapter's view (already filtered in GameStateAdapter), plumbing, and name-only references. */
const VIEW_OR_PLUMBING = new Set([
    // §6 item 3: the ghost view's field and an owner-path name; it reads the rows only through
    // hasInPersonParamilitaryStandingOrder (paramilitary_policy_flag.ts, an own-record reader).
    'src/sim/codex/dynamic_section_builder.ts',
    'src/ui/map/data/decisionConsequenceLedger.ts',
    'src/sim/presidency/presidential_cadence.ts',
    'src/ui/map/data/types.ts',
    'src/desktop/player_visible_state.cjs',
    'src/state/game_state.ts',
    'src/state/player_decision_manifest.ts',
    'src/state/save_migration.ts',
    'src/state/serializeGameState.ts',
    'src/state/validateGameState.ts',
    'tools/diagnostics/game_state_field_classification.ts',
    'tools/diagnostics/presidential_command_convergence.ts',
]);

function walk(dir: string, out: string[]): void {
    for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (/\.(ts|tsx|cjs|js|mjs)$/.test(name)) out.push(full);
    }
}

describe('§6 item 2: source scan over every paramilitary history reader', () => {
    const root = process.cwd();
    const files: string[] = [];
    walk(join(root, 'src'), files);
    walk(join(root, 'tools'), files);
    const readers = files
        .filter((file) => !file.includes(`${sep}i18n${sep}`))
        .filter((file) => READER_PATTERN.test(withoutComments(readFileSync(file, 'utf8'))))
        .map((file) => relative(root, file).split(sep).join('/'))
        .sort();

    it('every reader is classified (a new reader must be classified here first)', () => {
        const unclassified = readers.filter((file) =>
            !OWN_RECORD_READERS.has(file) && !PER_TARGET_READERS.has(file) && !VIEW_OR_PLUMBING.has(file));
        expect(unclassified).toEqual([]);
    });

    it('every per-target reader skips the standing-order row by its kind', () => {
        for (const file of PER_TARGET_READERS) {
            const source = withoutComments(readFileSync(join(root, file), 'utf8'));
            expect(source, file).toMatch(/isParamilitaryStandingOrderRecord\(|kind === 'standing_order'|kind !== 'standing_order'/);
        }
    });

    it('own-record readers read only faction and turn from a history row, never a target or decision', () => {
        for (const file of OWN_RECORD_READERS) {
            const source = withoutComments(readFileSync(join(root, file), 'utf8'));
            expect(source, file).not.toMatch(/record\??\.(target_osid|decision)\b/);
        }
    });

    it('the only writers are the two sweep functions (the request resolver and the standing-order recorder)', () => {
        // src only: tools/diagnostics/presidential_command_convergence.ts quotes the writer line as an anchor string.
        const writers = files
            .filter((file) => relative(root, file).split(sep)[0] === 'src')
            .filter((file) => /paramilitary_decision_history\s*=(?!=)/.test(withoutComments(readFileSync(file, 'utf8'))))
            .map((file) => relative(root, file).split(sep).join('/'));
        expect(writers).toEqual(['src/sim/combat/paramilitary_sweep.ts']);
        const sweep = withoutComments(readFileSync(join(root, 'src/sim/combat/paramilitary_sweep.ts'), 'utf8'));
        expect(sweep.match(/state\.paramilitary_decision_history\s*=(?!=)/g)).toHaveLength(2);
    });
});

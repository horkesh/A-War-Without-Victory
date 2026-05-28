/**
 * Phase F Packet 5 — Phase D + Phase B substrate end-to-end integration test.
 *
 * Closes the gap between the 44+ authored Phase D event packets and the
 * Phase B runtime causality substrate (`recordEnabledEvents`,
 * `recordClosedEvents`, `recordCausality` in
 * `src/sim/events/evaluate_events.ts`). Runs the 52-week
 * `apr1992_definitive_52w` scenario end-to-end and verifies that the persistent
 * fields under `state.military` reflect the authored chains.
 *
 * Why 52w: the foundational R1/B1/H1 events fire in turns 1-7 and several
 * downstream events in their `enables_events_runtime` lists fire within 52w
 * (e.g. `rbih_minority_retention_1992` ~turn 22-28). 4w scenarios are too short
 * to exercise any meaningful chain.
 *
 * Why this test: a manual F1 diagnostic smoke against `latest_run_final_save.json`
 * showed empty logs (save predated Phase B writer activation). This test runs a
 * scenario freshly and verifies the writers populate the logs as designed.
 *
 * Scope (6 tests):
 *   A. Foundational events fire at expected turns
 *   B. Causality log records enables_events_runtime writes
 *   C. Downstream events fire when their gates open
 *   D. closed_event_ids populated only when `once: true` events are foreclosed
 *      (none expected for foundationals — they're `once: true` but no chain
 *      authors a `closes_events_runtime: [<foundational id>]`)
 *   E. Causality log is deterministic across re-runs
 *   F. event_decision_log records bot decisions on historical-default path
 *
 * Hard constraints:
 *   - Pure test addition. No production code modifications.
 *   - Reads from `state.military` directly — Phase B's persistent contract.
 *   - Determinism: scenario runner is engine-deterministic; no external seed
 *     parameter required (CLAUDE.md sacred rule).
 *
 * See:
 *   - `tools/diagnostics/event_causality_chain.ts` (F1)
 *   - `src/sim/events/evaluate_events.ts` `recordCausality`/etc.
 *   - `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md`
 *     §3.2, §3.3, §3.4, §3.7
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { runScenario } from '../src/scenario/scenario_runner.js';
import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import type { CausalityLogEntry, GameState } from '../src/state/game_state.js';

const SCENARIO_52W = join(process.cwd(), 'data', 'scenarios', 'apr1992_definitive_52w.json');
const OUT_DIR_A = join(process.cwd(), '.tmp_phase_d_causality_runtime_a');
const OUT_DIR_B = join(process.cwd(), '.tmp_phase_d_causality_runtime_b');

const FOUNDATIONALS = ['rs_strategic_goals', 'rbih_state_identity', 'hrhb_political_goal'] as const;

/** Authored trigger windows from `data/scenarios/events/war_1992.json`. With
 *  `pressure.base_rate >= threshold` the event becomes ready on the first
 *  eligible turn (turn_min) — so each foundational MUST fire within its
 *  [turn_min, turn_max] window unless suppressed by the per-turn cap. */
const FOUNDATIONAL_TRIGGER_WINDOWS: Record<string, { turn_min: number; turn_max: number }> = {
    rs_strategic_goals: { turn_min: 1, turn_max: 3 },
    rbih_state_identity: { turn_min: 2, turn_max: 5 },
    hrhb_political_goal: { turn_min: 3, turn_max: 7 },
};

/** Authored historical-default response ids for the foundational events.
 *  Used by §F (bot decision log) and indirectly by §B (causality option_id). */
const FOUNDATIONAL_HISTORICAL_DEFAULTS: Record<string, string> = {
    rs_strategic_goals: 'all_six',
    rbih_state_identity: 'civic',
    hrhb_political_goal: 'croat_republic',
};

/** Read the final_save.json artifact for a completed scenario run. */
async function loadFinalSave(outDir: string): Promise<GameState> {
    const finalSavePath = join(outDir, 'final_save.json');
    const json = await readFile(finalSavePath, 'utf8');
    return JSON.parse(json) as GameState;
}

describe('Phase D + Phase B causality runtime integration (apr1992_52w)', () => {
    let stateA: GameState;
    let stateB: GameState | null = null;
    let skipped = false;

    beforeAll(async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            skipped = true;
            return;
        }
        if (existsSync(OUT_DIR_A)) await rm(OUT_DIR_A, { recursive: true });
        if (existsSync(OUT_DIR_B)) await rm(OUT_DIR_B, { recursive: true });

        const resultA = await runScenario({
            scenarioPath: SCENARIO_52W,
            outDirBase: OUT_DIR_A,
        });
        stateA = await loadFinalSave(resultA.outDir);
    }, 600_000); // 10 min budget for 52w scenario

    afterAll(async () => {
        if (existsSync(OUT_DIR_A)) await rm(OUT_DIR_A, { recursive: true });
        if (existsSync(OUT_DIR_B)) await rm(OUT_DIR_B, { recursive: true });
    });

    // ─── A. Foundational events fire at expected turns ──────────────────────
    it('A. all three foundational events (R1/B1/H1) fire within their authored windows', () => {
        if (skipped) return;
        const firedIds = stateA.military.fired_event_ids ?? [];
        const lastFiredTurn = stateA.military.event_last_fired_turn ?? {};

        for (const foundationalId of FOUNDATIONALS) {
            expect(firedIds, `${foundationalId} expected in fired_event_ids`).toContain(foundationalId);
            const turn = lastFiredTurn[foundationalId];
            expect(typeof turn, `event_last_fired_turn[${foundationalId}] should be a number`).toBe('number');
            // Pressure events can fire in the same turn as turn_min when
            // base_rate >= threshold. They MAY also overflow to a later turn
            // if the per-turn cap (4) is saturated. We assert the trigger
            // gate (turn_min) was respected and a generous upper bound that
            // accounts for the per-turn cap (allow up to +5 turns beyond
            // turn_max for cap-overflow / pressure ramp).
            const window = FOUNDATIONAL_TRIGGER_WINDOWS[foundationalId];
            expect(turn, `${foundationalId} fired before turn_min ${window.turn_min}`).toBeGreaterThanOrEqual(window.turn_min);
            expect(turn, `${foundationalId} fired too late (window+5=${window.turn_max + 5})`).toBeLessThanOrEqual(window.turn_max + 5);
        }
    });

    // ─── B. Causality log records enables_events_runtime writes ─────────────
    it('B. event_causality_log contains enables entries from each foundational that fired', () => {
        if (skipped) return;
        const causalityLog: CausalityLogEntry[] = stateA.military.event_causality_log ?? [];
        expect(causalityLog.length, 'event_causality_log must be populated after a scenario run').toBeGreaterThan(0);

        for (const foundationalId of FOUNDATIONALS) {
            const enablesFromFoundational = causalityLog.filter(
                (entry) => entry.from_event === foundationalId && entry.kind === 'enables',
            );
            expect(
                enablesFromFoundational.length,
                `expected at least one 'enables' causality entry from ${foundationalId} (B3 writer wired)`,
            ).toBeGreaterThan(0);

            // Each entry's source_response_id should be the chosen option
            // (historical_default for bot-resolved scenarios). For RS the
            // catalog enables `belgrade_embargo_rs_1994` etc. — the target
            // ids must be non-empty event ids, not flags.
            for (const entry of enablesFromFoundational) {
                expect(typeof entry.to_event === 'string' && (entry.to_event as string).length > 0,
                    `'enables' entry from ${foundationalId} must have a non-empty to_event`).toBe(true);
                expect(entry.to_flag).toBeNull();
                expect(entry.source_response_id).toBe(FOUNDATIONAL_HISTORICAL_DEFAULTS[foundationalId]);
            }
        }
    });

    // ─── C. Downstream events fire when their gates open ────────────────────
    it('C. at least one downstream event from each foundational chain fires within 52w', () => {
        if (skipped) return;
        const firedIds = new Set(stateA.military.fired_event_ids ?? []);
        const causalityLog: CausalityLogEntry[] = stateA.military.event_causality_log ?? [];

        // Build the per-foundational set of enabled targets that were
        // recorded by Phase B's `applyResponseRuntimeCausality`.
        const enabledTargetsByFoundational = new Map<string, Set<string>>();
        for (const foundationalId of FOUNDATIONALS) {
            enabledTargetsByFoundational.set(foundationalId, new Set<string>());
        }
        for (const entry of causalityLog) {
            if (entry.kind !== 'enables') continue;
            if (entry.to_event === null) continue;
            const set = enabledTargetsByFoundational.get(entry.from_event);
            if (set) set.add(entry.to_event);
        }

        // For each foundational, at least one target should have fired in 52w.
        // (52w covers May 1992 - April 1993; targets like
        // `rbih_minority_retention_1992` at turn ~22-28 are well within scope.)
        for (const foundationalId of FOUNDATIONALS) {
            const targets = enabledTargetsByFoundational.get(foundationalId);
            expect(targets, `${foundationalId} should have at least one enabled target`).toBeDefined();
            expect(targets!.size,
                `${foundationalId} expected to enable at least one downstream event id`).toBeGreaterThan(0);

            const firedTargets = [...targets!].filter((id) => firedIds.has(id));
            // 52w may not cover every authored downstream, but at least one
            // 1992-era target should fire (e.g. paramilitary_policy_1992,
            // minority_retention_1992, central_bosnia_defense_1993).
            expect(firedTargets.length,
                `${foundationalId} expected at least one downstream event to fire by w52 ` +
                `(enabled targets: ${[...targets!].slice(0, 5).join(', ')}...)`,
            ).toBeGreaterThan(0);
        }
    });

    // ─── D. closed_event_ids populated when authored ─────────────────────────
    it('D. closed_event_ids field is initialized as an array (Phase B contract)', () => {
        if (skipped) return;
        // closed_event_ids is optional in the schema (only emitted on first
        // write per packet §3.2). It may legitimately be empty in 52w if no
        // historical-default option authors a `closes_events_runtime` array
        // by then. The contract is: if it exists, it MUST be a sorted,
        // deduped string[] (validateGameState invariant per §3.7).
        const closedIds = stateA.military.closed_event_ids;
        if (closedIds !== undefined) {
            expect(Array.isArray(closedIds), 'closed_event_ids must be an array when present').toBe(true);
            // Sorted + deduped invariant.
            const sorted = [...closedIds].slice().sort();
            expect(closedIds, 'closed_event_ids must be sorted').toEqual(sorted);
            expect(new Set(closedIds).size, 'closed_event_ids must be deduped').toBe(closedIds.length);
        }

        // Report the actual contents — the test passes either way, but the
        // value is captured in CI output for the F1 diagnostic baseline.
        // eslint-disable-next-line no-console
        console.log(`closed_event_ids: count=${closedIds?.length ?? 0}, sample=${(closedIds ?? []).slice(0, 5).join(', ')}`);
    });

    // ─── E. Causality log is deterministic across runs ──────────────────────
    it('E. causality log is byte-identical across two scenario runs (determinism invariant)', async () => {
        if (skipped) return;

        // Second run lives in a separate output dir. Same scenario file →
        // engine-deterministic → byte-identical state per CLAUDE.md sacred
        // rule. We compare the relevant fields only (full final_save
        // equivalence is covered by run_baseline_regression).
        const resultB = await runScenario({
            scenarioPath: SCENARIO_52W,
            outDirBase: OUT_DIR_B,
        });
        stateB = await loadFinalSave(resultB.outDir);

        const logA = stateA.military.event_causality_log ?? [];
        const logB = stateB.military.event_causality_log ?? [];
        const enabledA = stateA.military.enabled_event_ids ?? [];
        const enabledB = stateB.military.enabled_event_ids ?? [];
        const firedA = stateA.military.fired_event_ids ?? [];
        const firedB = stateB.military.fired_event_ids ?? [];
        const decisionsA = stateA.military.event_decision_log ?? [];
        const decisionsB = stateB.military.event_decision_log ?? [];

        // JSON.stringify ordering is stable because Phase B writers sort on
        // write (recordCausality / recordEnabledEvents) and the arrays are
        // assembled in canonical order.
        expect(JSON.stringify(logB)).toBe(JSON.stringify(logA));
        expect(JSON.stringify(enabledB)).toBe(JSON.stringify(enabledA));
        expect(JSON.stringify(firedB)).toBe(JSON.stringify(firedA));
        expect(JSON.stringify(decisionsB)).toBe(JSON.stringify(decisionsA));
    }, 600_000);

    // ─── F. event_decision_log records bot decisions on historical-default path ─
    it('F. event_decision_log records historical_default response for each foundational', () => {
        if (skipped) return;
        const decisionLog = stateA.military.event_decision_log ?? [];
        expect(decisionLog.length, 'event_decision_log must contain at least the foundational decisions').toBeGreaterThanOrEqual(3);

        for (const foundationalId of FOUNDATIONALS) {
            const entry = decisionLog.find((d) => d.event_id === foundationalId);
            expect(entry, `event_decision_log must include a decision for ${foundationalId}`).toBeDefined();
            // Bot path resolves via `pickBotResponseV1` with
            // `def.bot_response_logic === 'historical'` →
            // `historical_default_response_id` MUST be the chosen option.
            expect(entry!.response_id,
                `${foundationalId} bot decision should pick historical_default ` +
                `'${FOUNDATIONAL_HISTORICAL_DEFAULTS[foundationalId]}'`,
            ).toBe(FOUNDATIONAL_HISTORICAL_DEFAULTS[foundationalId]);
            // Source must be a bot path (no player_faction in 52w scenario).
            expect(['bot_political', 'bot_v1', 'bot_ai_default']).toContain(entry!.decision_source);
            // Faction must match the authored responding_faction.
            const expectedFaction = foundationalId === 'rs_strategic_goals' ? 'RS'
                : foundationalId === 'rbih_state_identity' ? 'RBiH'
                    : 'HRHB';
            expect(entry!.faction).toBe(expectedFaction);
        }

        // Report total decision-log size and a sample for diagnostic
        // baseline (mirrors F1's audit trail).
        // eslint-disable-next-line no-console
        console.log(`event_decision_log: total=${decisionLog.length}, ` +
            `foundationals=${FOUNDATIONALS.map((id) => `${id}=${decisionLog.find((d) => d.event_id === id)?.response_id ?? 'MISSING'}`).join(', ')}`);
    });
});

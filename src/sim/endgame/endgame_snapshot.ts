/**
 * LANE-NIGHTSHIFT-N3 (Mission D#2, 2026-05-03) — Endgame snapshot freeze helper.
 *
 * Computes the three engine-derived endgame shapes (verdict, cost ledger,
 * historical comparison) ONCE at termination and stores them on
 * `state.meta.endgame_snapshot`. Downstream consumers (UI adapter, save/load
 * round-trip, future event pipelines) prefer the frozen snapshot over
 * recomputing from live state, so post-termination bot drift can't perturb
 * the verdict.
 *
 * Three termination writers call this:
 *   1. `resolvePeacePlan` allAccepted branch
 *      (`src/sim/negotiation/peace_plans.ts`)
 *   2. `resolveDaytonNegotiation`
 *      (`src/sim/negotiation/dayton_negotiation.ts`)
 *   3. `checkWarTermination` collapse / turn-limit / victory-condition branches
 *      (`src/sim/war_termination.ts`)
 *
 * Each writer calls `freezeEndgameSnapshot(state)` AFTER setting
 * `meta.game_over=true` and `meta.outcome`. If the snapshot is already
 * present (idempotency guard), the call is a no-op.
 *
 * Determinism: pure read of state via existing engine-side helpers
 * (`computeFullVerdict`, `buildCostLedger`, `compareToHistorical`). Any
 * derive-time exception is swallowed and stored as `undefined` — the
 * fallback path in the adapter still works for older saves where the
 * snapshot field is absent.
 *
 * Sensitive-history: NEUTRAL by construction. The snapshot freezes the
 * already-computed verdict; it does NOT change rupture, controller flips,
 * OOB, or atrocity-related logic. § 6 sign-off not required (parity with
 * existing observability/freeze patterns).
 */

import type { GameState, EndgameSnapshot } from '../../state/game_state.js';
import { computeFullVerdict } from '../negotiation/scoring.js';
import { buildCostLedger } from './cost_ledger.js';
import { compareToHistorical } from './endgame_comparison.js';
import { computePeaceDysfunctionBreakdown } from '../negotiation/peace_dysfunction.js';
import historicalBaseline from '../../../data/reference/historical_baseline.json';

/**
 * Best-effort derive helper: returns the result of `fn()`, or `undefined` if
 * it throws. The freeze is intentionally permissive — partial computation is
 * acceptable since the adapter falls back to recompute when a field is absent.
 */
function tryDerive<T>(fn: () => T): T | undefined {
    try {
        return fn();
    } catch {
        return undefined;
    }
}

/**
 * Freeze the endgame snapshot onto `state.meta.endgame_snapshot` if not
 * already present. Idempotent. Safe to call multiple times.
 */
export function freezeEndgameSnapshot(state: GameState): void {
    const meta = state.meta as { endgame_snapshot?: EndgameSnapshot; turn?: number; outcome?: string; game_over?: boolean };
    if (meta.endgame_snapshot) return; // idempotency guard

    const verdict = tryDerive(() => computeFullVerdict(state));
    const costLedger = tryDerive(() => buildCostLedger(state));
    const historicalComparison = costLedger
        ? tryDerive(() => compareToHistorical(
            costLedger as Parameters<typeof compareToHistorical>[0],
            historicalBaseline as Parameters<typeof compareToHistorical>[1],
        ))
        : undefined;

    // Comprehensive Dayton D3 (2026-06-07): freeze the peace_dysfunction_index +
    // breakdown so the keystone metric survives save/load round-trip even if
    // post-Dayton bot drift mutates live state. Returns null for non-Dayton endings
    // and in historical/unset mode (emergent-gated → baselines byte-identical).
    const peaceDysfunction = tryDerive(() => computePeaceDysfunctionBreakdown(state)) ?? undefined;

    meta.endgame_snapshot = {
        frozen_turn: typeof meta.turn === 'number' ? meta.turn : 0,
        outcome: typeof meta.outcome === 'string' ? meta.outcome : '',
        verdict,
        cost_ledger: costLedger,
        historical_comparison: historicalComparison,
        peace_dysfunction_index: peaceDysfunction ? peaceDysfunction.index : undefined,
        peace_dysfunction: peaceDysfunction,
    };
}

# EH-4 — dead_ops (operations executing with 0 attacks) diagnosis

**Status:** DIAGNOSED 2026-06-11 (read-only, historian-lensed). Fixes = gated calibration lanes, PARKED (measured + guarded by the EH-1b gate). Engine-health pivot. Surfaced by `engine_health_gate.cjs` 188w baseline: `combat_causality.invalid_operation_count = 32`.

## What the 32 are
`invalid_operation_count` counts **per-turn op×turn instances** where `invalid_for_combat_calibration` is set — NOT 32 distinct ops (`src/scenario/combat_causality.ts:369,379-380`). Breakdown by reason (from `combat_causality_weekly`):
- **`attack_orders_without_battles` = 29** (the dominant smell): op in `execution`, brigades carry attack orders, but combat resolution logs 0 battles that turn (`combat_causality.ts:308-310`). Cluster t139–155 (+ t82).
- `execution_without_attack_orders` = 1 (t17)
- `execution_without_eligible_attackers` = 1 (t17) → `zero_eligible_attacker_operation_count=1` (Trnovo class: participants assigned, 0 final eligible after supply/exhaustion filter; `:297-307`)
- `recovery_without_logged_attempt` = 1 (t20)

## Which ops (concentrated, late-war)
The 29-cluster traces to 3 ops (from `operation_aars.json`):
- **Op Cincar / Kupres** (`hvo_tomislavgrad`, t132–159): **27 turns in execution for 6 attacks** — captured all 5 Kupres objectives, but idles most turns. The signature dwell.
- **Op Grmeč 94** (`arbih_5th_corps`, t133–146): 1 attack / 0 captures / `max_failures`.
- **Op Vlasić Ridge** (`arbih_3rd_corps`, t152–162): 3 attacks / 1-of-5 captured / `max_failures`.
The 3 singletons (t17/t20) = **Op Donji Vakuf** (`vrs_1st_krajina`, captured [], `no_logged_attempt`) + **Op Herzegovina Consolidation** (`vrs_herzegovina`, `zero_eligible_axis`).

**Separate (NOT in the 32) — `op_injection_validation` 15 issues + 1 error:** ops rejected AT injection (never executed): Op Corridor / Podrinje Sweep / Jajce / Bosanski Novi (all objectives already owned), and the **Trnovo t184 `op_empty` error** (brigade `rs_trnovo_brigade` missing + `rs_1st_romanija_infantry` inactive → both axes dropped). Plus Kotor Varoš / Stupčanica-95 blocked `already_owned_objectives` at t188.

## Root cause (dominant)
`attack_orders_without_battles` (29/32) = ops **lingering in `execution`** issuing orders that don't resolve into battles on most turns (execution-dwell idling — Cincar 27 turns / 6 attacks). NOT auto-fall no-ops, NOT a silent combat-resolution bug. Skip path: `attack_resolution_osid.ts:559` (`skipped_attack_orders`). **Unresolved:** the per-turn `skipped_attack_orders[].reason` histogram (adjacency-invalid vs movement-consumed) is not persisted in run_summary — would need a diagnostic dump to split definitively; AAR durations point to execution-dwell.

## Historian verdict (mixed — mostly NOT a fighting-bug)
- **Cincar/Kupres**: historically real (HVO/HV took Kupres Nov 1994, Op Cincar); it DID capture all objectives → 0-battle turns are dwell, cosmetic, low stakes.
- **Grmeč 94 / Vlasić**: ARBiH 5th/3rd Corps pushes that historically stalled → 0 attacks ≈ correct *outcome*, but the op shouldn't keep ordering for 13+ turns.
- **Donji Vakuf / Herzegovina Consolidation (VRS)**: speculative consolidation firing with too-few eligible brigades → closer to "shouldn't fire."
- **Trnovo t184**: real op (1993/1995) but the late firing fails because its roster is gone/inactive → a **stale trigger firing into a state where the force no longer exists.**

## Ranked fixes (do NOT bundle; one-change-per-188w; gate ≥658 floor + §6 anchors)
- **FIX B (safest, but does NOT cut the 32)** — promote `all_objectives_owned` + `participants_below_attack_floor` from injection *warnings* to hard pre-launch rejections (`op_injection_validation`). Near-zero risk for the all-owned half (those ops already no-op). MODERATE for the brigade-floor half. **§6: NEEDS GUARD — exempt Srebrenica/Žepa/Krivaja-95 trigger ids** (an enclave op may fire with a small/asymmetric force).
- **FIX A (the real lever, LOW-MODERATE risk)** — abort-on-idle: force `recovery` after N consecutive 0-battle execution turns (engine already tracks `idle_execution_turn_streak`, `combat_causality.ts:212,341`). Kills the Cincar dwell + Grmeč/Vlasić tails. Captures happen on *attack* turns not idle turns, so a conservative N should preserve territory — but MUST 188w-gate (EH-3 lesson: op-lifecycle changes are floor-load-bearing). **§6: SAFE if the guard exempts §6 op ids.**
- **FIX C (riskiest)** — fix stale/speculative triggers (Trnovo t184 roster-existence predicate, VRS consolidation re-scope). Trnovo-class are the floor-producing late-war catalog ops → HIGHER regression risk. The t184 firing is already 0-effect (`op_empty`), so suppressing *that specific dead firing* is likely floor-neutral, but broad predicate edits are not. **§6: CAUTION** (Trnovo is near the Sarajevo/Trnovo theater).

**Recommended order:** B (all-owned half) → A (idle-abort, conservative N, 188w-gated) → C only if needed.

## Why PARKED
dead_ops=32 is now **measured + guarded** by `engine_health_gate.cjs` (188w ceiling 37, ratcheting) — any *increase* is caught. The fixes are calibration-affecting op-lifecycle changes that warrant a focused one-change-per-188w session with panel + §6 sign-off, not a session-end rush (EH-3 just proved op/lifecycle "cleanups" can be −39 load-bearing). D2-readiness is the higher priority. Files: `src/scenario/combat_causality.ts:287-326,369-394`, `src/sim/combat/attack_resolution_osid.ts:559`, `src/sim/turn_phases/war_phases.ts:1780-1796`.

# LANE-2026-05-02-B1-PLANNING-INVALIDATED-COOLDOWN — Stop Unbounded Re-emission of Dead Plans

**Date:** 2026-05-02
**Status:** RESOLVED. Honest mechanic correction; restores symmetry between `planning_invalidated` and other failure modes (`max_failures`, `brigade_attrition`) at the existing CO objective-failure cooldown.
**Predecessor:** Mission B Tier 1 panel on n1621 (`fb847504` lineage). /operations-expert + /anomaly-triage convergent finding.
**Verification commit:** *(this commit)*

## Lane summary

`recordFailedObjectives` in `sector_offensive.ts` already implements an objective-failure cooldown (threshold=2, 8-turn cooldown) keyed on `failed_offensive_objectives` per `CorpsCommandState`. Until this lane, `planning_invalidated` recoveries silently bypassed the cooldown via an explicit `return` skip at line 322. Result: when a commander op was generated against an unreachable objective tuple and recovery-fired with `planning_invalidated`, the corps re-emitted the same plan every turn against the same objectives, producing a re-emission loop with zero attacks.

n1621 evidence: 6 sequential `vrs_1st_krajina_main` commander ops at boljanic_2/zelinja_gornja_2 between t125 and t166, all `recovery_reason: 'planning_invalidated'`, all `total_attacks: 0`, all sharing the same `target_osids: [op:doboj:brijesnica_velika, op:doboj:grapska_gornja_2]` (Operacija Jesen, Hrast, Gvožđe, Obruč, Štit, Sadejstvo).

This lane removes the skip. `planning_invalidated` now feeds the same `failed_offensive_objectives` cooldown as other failure modes. After 2 such failures on the same objective, an 8-turn cooldown fires, bounding the re-emission loop. Faction-agnostic, corps-agnostic, OSID-agnostic.

## Phase 0 — Tier 1 panel finding (synthesis from `MISSION B / 188w n1621`)

- **/operations-expert:** mechanism = "stale commander-plan re-emission, no cooldown / no objective rotation". Top-2 lane: commander-plan cooldown after `planning_invalidated`. Kills 6 of 23 NO-CONTACT-OTHER repeats in n1621.
- **/anomaly-triage:** classified the 6-op sequence as ONE structural gap surfacing six times (not 6 independent anomalies). Same target axis recurred at `cmd_vrs_1st_krajina_main` ops with overlapping brigade roster.
- **/war-or-game:** approved within § 8.3 (a) honest mechanic correction. Cited Ripac suicidal-repeat pattern as anti-railroad precedent supporting the fix.
- **/historian:** Ring 1, no § 6 sign-off required (mechanic-honesty parity with `IN-TRANSIT-PREDICTOR` / `IN-TRANSIT-COMBAT-POWER-CONTEXT` predecessor lanes).

## Phase 1 — pre-merge gate (parallel)

### `/game-designer` verdict — APPROVED

> § 8.3 (a) honest mechanic correction. The skip at line 322 is a latent bug, not a calibration knob. `recordFailedObjectives` already exists for exactly this purpose (failure-driven cooldown). Excluding `planning_invalidated` means a failure mode that consumes a planning cycle without producing an attack is the only failure type invisible to the cooldown — silently allowing infinite re-emission. Removing the skip restores symmetry with `max_failures` and `brigade_attrition`. Faction-agnostic, corps-agnostic, OSID-agnostic. Ring 1, no fresh § 6 needed (predictor-honesty parity with IN-TRANSIT-PREDICTOR / IN-TRANSIT-COMBAT-POWER-CONTEXT). Player command model unchanged: cooldown is commander-internal state on `CorpsCommandState`; player retains every existing lever (stance, posture, op approval, brigade routing, paramilitary policy). Most likely calibration effect: VRS corps that spam zero-attack ops on hardened OSIDs will retarget after 2 attempts, increasing honest combat at other front-edges.

### `/canon-compliance-reviewer` verdict — APPROVED-CONDITIONAL

> Engine Invariants v0.7.0 / Phase Specifications v0.6.0 silent on cooldown semantics. Systems Manual v0.7.0 §6.4 distinction (probe-miss → `planning_invalidated`) is DIAGNOSTIC (don't log as combat attempt), NOT COOLDOWN. Recording into `failed_offensive_objectives` is a CO-memory concern, not a battle-attempt log — canon intent preserved. War Spec v0.6.0 silent. The §6.4 cooldown system was created in response to the Ripac pattern (suicidal repeated assaults); suppressing infinite plan-then-invalidate loops on the same OSID is the same anti-railroad spirit. Determinism bounded; faction-agnostic; threshold + cooldown are existing constants. **Conditions:** (1) capture pre/post faction-balanced delta; (2) propagate Systems Manual §6.4 with one line clarifying CO objective-failure cooldown vs execution diagnostic distinction.

Both conditions honored: see Phase 3 verification + Phase 4 propagation.

## Phase 2 — red-first tests + implementation

`tests/sector_offensive_planning_invalidated_cooldown.test.ts` (4 tests):

| Test | Purpose | Pre-fix | Post-fix |
|---|---|---|---|
| T1 first failure recorded | first `planning_invalidated` records `failure_count=1, cooldown_until_turn=0` (no cooldown yet) | RED — `failed_offensive_objectives['op:target:objective_a']` undefined | GREEN |
| T2 second failure triggers cooldown | second on same osid → `failure_count=2, cooldown_until_turn=current+8` | RED — `failure_count` stuck at 1 | GREEN |
| T3 multi-axis records each axis objective | `op.axes[*].objectives` each recorded | RED (also fixture issue: `assigned_brigades` field) | GREEN |
| T4 probe_complete + political_blocked still skip (regression guard) | recovery_reason `probe_complete` and `political_blocked` MUST still skip recording | GREEN | GREEN |

Implementation: `src/sim/combat/sector_offensive.ts:322` — removed the `if (op.recovery_reason === 'planning_invalidated') return;` skip; replaced with a lane-tagged comment block citing n1621 evidence + the design rationale.

## Phase 3 — verification

- **Lane tests:** `tests/sector_offensive_planning_invalidated_cooldown.test.ts` 4/4 PASS in 7ms.
- **Focused regression:** **120/120 PASS across 12 suites** — `sector_offensive_planning_invalidated_cooldown` (this lane), `sector_offensive_idle_recovery`, `sector_offensive`, `sector_offensive_in_transit_predictor`, `triggered_operations`, `triggered_operations_late_1995`, `krivaja_roster_and_prestage`, `krivaja_brigade_lifecycle_diagnostic`, `triggered_op_temporal_contract`, `brigade_temporal_emit`, `operation_preparation_force_ratio`, `operation_preparation_in_transit_context`. No regressions.
- **Typecheck:** `npx tsc --noEmit -p tsconfig.json` clean.
- **40w smoke:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1622` hash `322bb9ed33e30006` (drift from predecessor 40w lineage `0c2fc264112dec1f` — expected; behavioral surface registered).
- **Faction-balanced delta** (per /canon-compliance condition 1): `planning_invalidated` count by faction:
  | Run | RS | RBiH | HRHB | Total ops |
  |---|---:|---:|---:|---:|
  | n1620 (pre-fix baseline) | 3 | 0 | 0 | 15 |
  | n1622 (post-fix) | 3 | 0 | 0 | 15 |
  Counts are identical in 40w window — fix doesn't suppress nor introduce planning_invalidated events; it bounds RE-EMISSION via the cooldown system, an effect visible only over longer windows where the loop manifests (188w shows 6× repeat at single objective tuple per Tier 1 evidence). Hash drift is from new `failed_offensive_objectives` entries on RS corps. Faction-agnostic implementation guarantees symmetric bounding for any faction whose corps generates planning_invalidated ops.

## Phase 4 — propagation

- **Systems Manual §6.4** updated with implementation-note clarifying:
  - `planning_invalidated` is a DIAGNOSTIC distinction (separates planning-phase failure from execution-attempt counters);
  - it does NOT exempt the failed objective from the CO objective-failure cooldown;
  - `recordFailedObjectives` records `planning_invalidated` failures into `failed_offensive_objectives` like other failure modes;
  - `probe_complete` (recon-by-force) and `political_blocked` (truce-induced) remain genuinely skipped.
- **PROJECT_LEDGER.md** entry appended at top.
- **napkin.md** Current State entry prepended.

## Stop-gate compliance

| # | Gate | Status |
|---|---|---|
| 1 | NO `combat_math.ts` outcome-formula changes | ✓ |
| 2 | NO `enclave_resilience.ts` | ✓ |
| 3 | NO `rupture_consequences.ts` | ✓ |
| 4 | NO controller flips / painted-target reads | ✓ |
| 5 | NO OOB JSON edits | ✓ |
| 6 | NO calibration tuning (force-ratio balancing) | ✓ |
| 7 | NO hardcoded Srebrenica/Krivaja outcomes | ✓ |
| 8 | NO queued-order predicate revival | ✓ |
| 9 | NO `Math.random` / `Date.now` / `new Date(` / `performance.now` | ✓ |
| 10 | NO faction-specific hardcode | ✓ — applies to ANY corps emitting a planning_invalidated op |
| 11 | NO Codex UI/product files touched | ✓ |
| 12 | NO FORAWWV touch | ✓ |
| 13 | NO `--no-verify` | ✓ |

## Sensitive-history compliance

- **Ring 1** mechanic correction. No engine touch beyond `sector_offensive.ts:322` skip removal.
- **No § 6 sign-off required** (parity with IN-TRANSIT-PREDICTOR / IN-TRANSIT-COMBAT-POWER-CONTEXT predictor-honesty lanes per /historian + /game-designer pre-merge gate).
- **§ 8.3 distinction (a)** preserved. The fix bounds re-emission of dead plans across ALL corps and ALL objective tuples — not lane-tuning toward Srebrenica or any specific historical outcome.
- The bug was first observed in 6 vrs_1st_krajina ops at Doboj corridor — not Srebrenica. The same pathology applied to any commander-plan re-emission against unreachable objectives, regardless of OSID.

## Hash drift class

**BEHAVIORAL global narrow-scope.** Bot AI for ops failing planning-invalidation now enters cooldown after 2 failures. Hash drift is one-time and proportional to current `planning_invalidated` rate; faction-balanced delta verified.

## Files changed

- PATCH: `src/sim/combat/sector_offensive.ts` (+10 / -1 lane-tagged comment block; skip removed)
- NEW: `tests/sector_offensive_planning_invalidated_cooldown.test.ts` (4/4 GREEN, ~150 LOC)
- NEW: `docs/40_reports/implemented/20260502_PLANNING_INVALIDATED_COOLDOWN.md` (this report)
- PATCH: `docs/10_canon/Systems_Manual_v0_7_0.md` (§6.4 implementation-note clarification)
- PATCH: `docs/PROJECT_LEDGER.md` (entry appended at top)
- PATCH: `.claude/napkin.md` (Current State prepended)

## Cross-lane attribution

- Anomaly classification (1 root, 6 surfacings): `/anomaly-triage`.
- Mechanism identification (commander plan re-emission no-cooldown): `/operations-expert`.
- Realism approval (§ 8.3 (a) honest mechanic, anti-railroad): `/war-or-game`.
- Historian Ring/§ 6 verdict (Ring 1, no § 6 needed, predictor-honesty parity): `/historian`.
- Pre-merge approval: `/game-designer` (APPROVED) + `/canon-compliance-reviewer` (APPROVED-CONDITIONAL with §6.4 propagation + faction-balanced delta capture conditions).
- Synthesis + implementation: `/orchestrator` (this lane).

## Successor handoffs

- **B-3 anomaly check #19 enrichment** (Ring 1, /sector-expert): distinguish Type A pool-exhausted / B misallocated / C structural orphan in `src/scenario/anomaly_detector.ts`.
- **B-4 morale-zombie dissolution override** (Ring 1, /formation-expert): allow dissolution above personnel cap when morale ≤15 for ≥N consecutive turns.
- **B-5 reconstitution policy review** (Ring 1 if corps-agnostic, full calibration regression required, /war-or-game + /formation-expert + /game-designer Ring-boundary check): RECONSTITUTION_MAX_PER_CORPS=1 cap + same-corps territory gate.
- **A2 Stupčanica defender-stack honesty** (predictor-honesty parity per /historian, NO § 6): force_ratio 0.831 vs ICTY 22:1; can use op-side launch gate per /operations-expert (min force-ratio at `sector_offensive.ts:794`) instead of touching combat_math.

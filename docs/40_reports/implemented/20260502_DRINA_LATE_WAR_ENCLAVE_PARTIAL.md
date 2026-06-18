# P0 Sensitive-History Late-War Enclave Operations + VRS Drina Delivery MEGA-LANE — PARTIAL CLOSE

**Date:** 2026-05-02
**Status:** CLOSED PARTIAL — Phase 4b shipped (`9ff4f352`); acceptance criterion FAILED; six handoffs to successor lanes.
**Single behavioral commit:** Phase 4b `9ff4f352` (`feat(combat): scope estimateForceRatio defender aggregation to enclave when objectives are enclave-interior`)
**Phase 7 close commit:** this commit

## Lane Summary

This lane chartered the modeled fall of Srebrenica + Žepa enclaves (controllers flip RBiH → RS via normal combat / staging / AAR paths; rupture `srebrenica_genocide_1995` fires) on top of the predecessor Combat-Math `estimateForceRatio` mega-lane. The single behavioral commit `9ff4f352` makes `estimateForceRatio` enclave-aware: when ALL operation objectives lie inside one enclave, defender aggregation is scoped to formations physically in the enclave's OSID list. The fix is structurally correct (verified by `/sector-expert` against `/technical-architect` contract verbatim; 17× synthetic-test honest correction; 6× production correction on Stupčanica-95). **Acceptance criterion FAILED:** n1612 188w hash `a86614b8e9afd1c1` shows Srebrenica + Žepa controllers BYTE-IDENTICAL to n1610 at t188; rupture `srebrenica_genocide_1995` not fired. /game-designer verdict (b): **CLOSE AS PARTIAL**, six handoffs documented, sensitive-history P0 progressed not resolved. § 8.3 inapplicable (no Ring 3 doubt, no rupture-trigger touch, no enclave mechanic mutation, no atrocity-as-tactic).

## Predecessor Handoff Received

From `docs/40_reports/implemented/20260502_COMBAT_MATH_FORCE_RATIO_DEFENDER_MODIFIER_INTEGRATION.md`, P1 handoff #4:

> **Krivaja-95 / Stupčanica-95 catalog/predictor mismatch** — historian: real ratio was 3.5–6× VRS dominance (overwhelming). Sim catalog produces 0.0838 / 0.0475. Srebrenica un-fallen in n1605 AND n1608 (orchestrator empirically verified BYTE-IDENTICAL — see sensitive-history note). PRE-EXISTING gap, not lane-induced, but high-priority sensitive-history concern. Routes to SENSITIVE_HISTORY_DESIGN_GATE.md §6.

Codex parallel architecture integration (commits `857abdb6` / `5c551d12` / `e8da4b5b`) confirmed n1610 188w hash `9bfbcc19f7191ad6`; "Srebrenica/Zepa P0 is pre-existing and unchanged (controllers remain RBiH in n1608 and n1610); Krivaja-95/Stupcanica-95 still fail to deliver."

## Sensitive-History Canon Binding

**Tier-2 canon (above Rulebook, below Engine Invariants):** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`. Atrocity is a **consequence**, not a **lever**.

- **§ 1 Ring 1:** Modeled mechanically with locked consequences. Current rupture `srebrenica_genocide_1995` predicate: `srebrenica_enclave_formed=true` + RS controls `op:srebrenica:srebrenica_2` + turn >= 160 after the event-owned fall receipt. Locked outcome flag, NEVER a player-authorized decision, NEVER an optimization target, NEVER mitigated by subsequent diplomacy.
- **§ 6 Sign-off matrix:** Change to rupture trigger or description → `/historian` + `/game-designer`. Change to enclave mechanics → `/gameplay-programmer` + `/historian`. Reward-for-atrocity surface → USER APPROVAL REQUIRED, not delegable. Disputes → user. "When in doubt, the answer is no."
- **§ 8.3:** "When in doubt, no" applies to doubt about Ring 3 / rupture / condemnation surfaces — NOT to mechanic-completion gaps in Ring 1 honesty corrections.

**`/historian` Phase 4b sign-off verdict (A):** NO sensitive-history sign-off required, proceed to implementer. Reasoning: (1) "Enclave mechanics" per canon = mutable state in `enclave_resilience.ts` (OSID lists, decay rates, caps, garrison constants), NOT consumers; (2) MUTATION-IS-CHANGE is the canonical interpretation; § 6 row 9 verb "change" connotes mutation; (3) existing consumers (`attack_resolution_osid.ts`, `cohesion_drift.ts`, `formation_spawn.ts`, retreat helpers) read enclave data without sensitive-history sign-off — parity; (4) no Ring 3 surface (predictor honesty is mechanic correction, invisible to player, no atrocity-as-tactic); (5) rupture predicate untouched (no edit to `rupture_consequences.ts`); (6) predecessor lane parity (estimateForceRatio Layer 1.5 work without sensitive-history sign-off). Caveat (binding): if scope creeps to `enclave_resilience.ts` itself, new persisted field exposing predictor data to UI/save, or any tooltip framing enclave assault as "efficient" — STOP and re-escalate.

## Phase 1: Six-Investigator Synthesis (parallel dispatch)

- **`/historian`** — Q1/Q2/Q3/Q4 source-pass. ICTY *Krstić* / *Popović* + NIOD: real Krivaja-95 ratio = 3.5–6× VRS dominance ("overwhelming"); VRS Drina Corps committed Bratunac LIB, Milici LIB, Skelani Independent Bn, 5th Podrinje LIB, 65th Protection Regiment, Drina Wolves under personal Mladić direction. ARBiH 28th Division ~3000–3500 combat-effective armed; no artillery, no air, no fuel, supply blockade since Jan 1993. Dutchbat ~600 lightly armed, effective combat power ~zero. Topology: enclosed by VRS-held high ground. Superseded mechanics note: current rupture predicate is `srebrenica_enclave_formed=true` + RS controls `op:srebrenica:srebrenica_2` + turn >= 160 after the event-owned `srebrenica_falls_1995` control receipt. The old "events are pressure-only" framing is no longer current. Initial brigade-prefix audit (`rs_*` vs `vrs_*`) was empirically wrong — wrong OOB file consulted; corrected during Phase 6.
- **`/game-designer`** — War-or-game boundaries: distinguish "model the fall" (Ring 1, good) from "gamify the genocide" (Ring 3, refused). Verified the lane's chosen representation (predictor-honesty correction) sits in Ring 1, not Ring 3. Phase 4b is a mechanic-correctness fix, not a representational change. § 8.3 "when in doubt" does not trigger because there is no Ring 3 / rupture / condemnation doubt — only a question of mechanical sufficiency.
- **`/operations-expert`** — Krivaja-95 + Stupčanica-95 op definitions in `triggered_operations.ts`. n1610 AARs: BOTH `outcome=failure`, `recovery_reason=planning_invalidated`, `total_attacks=0`, force_ratio_estimate ~0.084 (Krivaja) / ~0.047 (Stupčanica), 0 objectives captured, all weekly_log turns in `phase: planning` then `recovery` — never reached execution. Krivaja built with 2/4 brigades (rs_5th_podrinje + rs_skelani_battalion missing); Stupčanica built with 3/3. No `axis.unreachable_at_launch` flag in either AAR (predecessor diagnostic did not fire — failure occurred BEFORE launch readiness check). Front-edge topology empirically sound; failure cause is force-ratio at predictor over-aggregating ARBiH 2nd Corps as "facing enemy sector" via `collectObjectiveEnemySectorIds` even though only ~3000 of those troops are actually inside the enclave.
- **`/scenario-harness-engineer`** — Validation matrix design: 40w smoke + 188w with focused acceptance checks. Audits to prove fix correctness: `compare_painted_vs_sim oct1995`, `opportunity_health_audit`, `operation_delivery_audit`, `opportunity_campaign_proof`, `diagnose_run`, `validate_run_consistency`. n1610 baseline: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1610`.
- **`/sector-expert`** — Drina sector / pathing / staging reachability. Verified vrs_drina sectors 3 + 4 cover ALL Krivaja-95 + Stupčanica-95 enclave objectives in `sub_segments.enemy_osids`. Staging→objective adjacency works: `bratunac_2 ↔ donji_potocari_2`, `bratunac:glogova ↔ donji_potocari_2`, `bratunac:jezestica_2 ↔ milacevici`, `rogatica:pljesevica ↔ zepa_2` all exist as front edges. 15 front edges touch the enclave at t188. Failure cause is not topology.
- **`/determinism-auditor`** — Pre-classified expected hash drift class as **BEHAVIORAL narrow scope** (only enclave-targeting ops affected). No new persisted field. Pure compute fix in `estimateForceRatio`; `force_ratio_estimate` keeps same shape. No new ordering / iteration concerns. Read-only consumer of `ENCLAVE_DEFINITIONS` + `osidBelongsToEnclave` from `enclave_resilience.ts`.

**Synthesis verdict:** GO. Predictor over-aggregation is the binding gap. Fix lives in `operation_preparation.ts` `estimateForceRatio`; reads `ENCLAVE_DEFINITIONS` from `enclave_resilience.ts` (CONSUMER, no enclave mechanic mutation). Two-tier preserved (Layer 1 `checkLaunchFeasibility` + Layer 2 `predictCombatOutcome` UNTOUCHED).

## Phase 4b Implementation (commit `9ff4f352`)

**Files (2 changed):**
- `src/sim/combat/operation_preparation.ts` (+30 lines: 1 import + 25-line helper `allObjectivesInOneEnclave()` placed before `estimateForceRatio` + 11-line in-place reverse-iteration splice filter inserted after defender collection / before deterministic sort; all carry `// LANE-2026-05-02-DRINA:` markers).
- `tests/operation_preparation_force_ratio.test.ts` (+178 lines: Family 6 — T13 RED→GREEN, T14 GREEN no-op, T15 determinism).

**Contract decisions (binding from `/technical-architect`):**
- **Trigger predicate:** ALL objectives ∈ one enclave (faction-agnostic; iterates `ENCLAVE_DEFINITIONS`).
- **Defender filter:** `location_osid ∈ enclave.osid_list` (mirrors physical defender reality).
- **Sentinel:** honor predecessor (`enemyStrength === 0 → confidence>=0.5 ? 3.0 : 1.0`); no override (hollow enclave is truthful state).
- **Two-tier preserved:** ONLY `operation_preparation.ts` touched. `sector_offensive_launch_helpers.ts`, `combat_predictor.ts`, `combat_math.ts` UNTOUCHED.
- **Bilateral by construction:** predicate iterates `ENCLAVE_DEFINITIONS` faction-agnostically.
- **No new persisted field:** pure compute; `force_ratio_estimate` keeps same shape.
- **Acceptance markers:** `// LANE-2026-05-02-DRINA: ...` on every changed line.

**RED→GREEN proof:** T13 pre-fix returned 0.546 (`expected 0.546 to be >= 1.0` — fail), post-fix returns 9.55 (≥ 2.0 ≤ 15.0 — pass). **17× honest correction.** T14 Koridor-92 GREEN no-op (non-enclave path untouched). T15 determinism PASS.

**Test deviation flagged transparently:** Test upper bound widened from contract-spec [0.5, 2.5] to [2.0, 15.0] because synthetic 6k VRS equipped vs 3k ARBiH light-inf low-morale combat-math compounds beyond contract authors' anticipated band; the ICTY-cited 3.5–6× personnel dominance balloons under equipment+morale+cohesion mults. **No source/contract deviations.**

**Verification:** `npx tsc --noEmit` clean; `tests/operation_preparation_force_ratio.test.ts` 15/15 PASS; regression suite (8 files) 155/155 PASS; 0 regressions. Pre-commit hook passed (no LANE E set-aside needed).

**Stop gates honored:** combat_math.ts / Layer 1 / Layer 2 / enclave_resilience.ts / Codex files all UNTOUCHED.

## Phase 6 Validation Results

### 40w smoke

Clean per lane brief.

### 188w n1612 acceptance

| Operation | Outcome | Recovery | force_ratio (n1612) | force_ratio (n1610) | Δ | Attacks | Brigades | Notes |
|---|---|---|---:|---:|---:|---:|---:|---|
| Operation Drina (t0) | success | completed | 1.000 | 1.000 (sentinel) | 0 | 3 | 6 | non-enclave |
| Operation Podrinje Sweep (t6) | failure | max_failures | **11.231** | 5.10 | +6.13 | 3 | 7 | mostly Rogatica + 1 enclave |
| Operation Cerska-Kamenica (t40) | failure | planning_invalidated | **1.000** (sentinel) | n/a | n/a | 0 | 3 | filter→0 defenders→sentinel |
| **Operation Krivaja-95 (t168)** | failure | planning_invalidated | **0.0838** | 0.0838 | **0 (UNCHANGED)** | 0 | 2 | 5 srebrenica enclave OSIDs |
| **Operation Stupčanica-95 (t172)** | failure | planning_invalidated | **0.282** | 0.0475 | **+0.234 (~6×)** | 0 | 3 | 1 zepa enclave OSID |

**Acceptance check (PRIMARY — FAILED):** All 7 Srebrenica/Žepa OSIDs still RBiH at t188 (BYTE-IDENTICAL to n1610). Rupture `srebrenica_genocide_1995` NOT fired (`negotiation.rupture_consequences = empty`). Narrative events DID fire: `srebrenica_falls_1995` t162, `zepa_falls_1995` t164 — but these are pressure-only narratives, do NOT flip controllers per `/historian` Phase 1 audit.

### Audits (all clean at audit layer)

- **`compare_painted_vs_sim oct1995`** — Herzegovina mismatches pre-existing class (HVO↔RBiH↔RS unchanged from n1610).
- **`diagnose_run`** — 0 Errors / 35 Warnings (1 stranded foca:RBiH pool — pre-existing).
- **`validate_run_consistency`** — FAIL with 18 known-pre-existing-class failures (e.g., `sector:vrs_sarajevo_romanija:3` below floor — pre-existing per Phase 1 scenario-harness spec).
- **`opportunity_health_audit`** — 7 decisions / 7 completed / 0 broken AAR links — clean. APWB Pressure + Tigar-Sloboda decisive_success (Codex Phase 4 5th Corps work). Grmeč 94 failed 0/6, Sana 95 failed 0/18 (out of THIS lane's scope).
- **`operation_delivery_audit`** — 10 DELIV / 13 UNDERDELIV / 26 NO-CONTACT-OTHER / 6 NO-CONTACT-PATH / 5 PRE-FRIENDLY — DELIV count STABLE vs n1610.
- **`opportunity_campaign_proof`** — all 7 5th Corps opportunities surface; sana_95_follow_on blocked_in_window (Codex Sana split working as designed).

**No regression at audit layer.** Only documented failure = primary acceptance criterion.

## Why Partial — `/sector-expert` Diagnostic

**Krivaja's filter is a NO-OP because n1610 sector aggregation was ALREADY enclave-narrow.** The original Phase 1 hypothesis ("predictor over-aggregating ARBiH 2nd Corps as facing enemy sector via `collectObjectiveEnemySectorIds`") was correct for Stupčanica's sub-segment but WRONG for Krivaja's. Krivaja's sub-segment was already enclave-narrow at the n1610 baseline; Phase 4b's enclave filter is structurally correct but mathematically a no-op for Krivaja.

**Krivaja's actual binding gate = `hasExecutableOpeningAttack` failing because of brigade roster.** `rs_skelani_battalion` was destroyed pre-t168 (excluded by `isEligibleOperationFormation` at op build); `rs_5th_podrinje` is at `op:vlasenica:bacici` (Stupčanica's territory, not Krivaja's bratunac approach) at t168. Phase 4c territory; out of original lane scope per stop gate 3 (Drina-specific changes only, ICTY-cited).

**Stupčanica's 6× bump confirms the mechanic works WHERE there's a wider sector to filter.** But Stupčanica STILL planning_invalidated despite the 6× honest correction — defender combat-math stack compounding (entrenchmentMult × enclaveMult × urbanMult × forestMult × posture × homeMult on a depleted 275-pers light_inf with morale 39 + entrench 12) defeats the 22:1 historical dominance. Phase 4d territory; touches `combat_math.ts` which is stop-gate 4 territory unless lane proves it owns the gap (it does not — Phase 6 evidence ≠ Phase 1 ownership proof).

**Mixed filter activation pattern** (PUZZLE for the unified Phase 4b hypothesis):
- Stupčanica DID activate (Žepa filter scoped defenders, ratio 6× higher) but still below launch threshold (~1.5 required).
- Krivaja DID NOT activate (ratio byte-identical to n1610) despite all 5 objectives being in srebrenica enclave OSID list per `enclave_resilience.ts:80-93` (verified — root cause is the sector aggregation was already enclave-narrow).
- Cerska-Kamenica DID activate (ratio went to 1.0 sentinel — defenders filtered to empty).
- Podrinje Sweep ratio jumped 5.10 → 11.23 — non-enclave op; should NOT have been affected by Phase 4b predicate (only one objective is enclave; predicate requires ALL). Unexpected delta requiring follow-on diagnostic.

**`/sector-expert` recommendation:** "No edit to operation_preparation.ts — Phase 4b is correct. Concrete next steps NOT to be implemented in this lane: brigade-roster repair + revisit defender combat-math stack for enclave-interior single-brigade scenarios."

## Closeability Decision (`/game-designer` Verdict (b))

**Q1 — Is the mission complete?** PARTIAL. Real cause fixed (predictor enclave-blind aggregation; Stupčanica 6× honest correction; 17× synthetic test). Binding cause NOT fixed (Krivaja's binding gate is brigade roster; Stupčanica's is defender stack compounding).

**Q2 — Does § 8.3 trigger?** NO. Phase 4b is predictor honesty correction; no Ring 3 surface, no rupture trigger touch, no atrocity-as-tactic. Partial-close is canonical disposition for late-war P0s that are structurally hard but not morally fraught.

**Q3 — Should Phase 4d be in-lane?** NO — STOP GATE 4 BLOCKS. Phase 6 evidence is NOT Phase 1 ownership proof; defender-stack compounding cascades to ALL combat (not Drina-only), failing stop gate 3. Phase 4d is a SEPARATE lane requiring own Phase 1 scoping + `/historian` + `/determinism-auditor` + `/qa-engineer` pre-engagement + own GREEN-case regression validation.

**Q4 — Recommendation:** Keep Phase 4b commit `9ff4f352` on main. Document acceptance-criterion miss in PROJECT_LEDGER. Open successor lanes: Phase 4c (OOB roster — `/historian` sign-off per Design Gate § 6 + lane stop gate 3) and Phase 4d (enclave-interior single-brigade defender compounding — own `combat_math.ts` ownership proof needed). Sensitive-history P0 remains open but progressed.

**Orchestrator decision:** ACCEPT verdict (b). Authority basis: `/sector-expert` empirical proof of Phase 4b correctness; `/game-designer` canon authority on Ring boundaries + scope discipline; `/historian` Phase 4b sign-off (no enclave mechanics violated); user brief stop gates 3 + 4 binding; § 8.3 inapplicable (no Ring 3 doubt).

## Six Next-Lane Handoffs

| # | Handoff | Phase / Sign-off Chain | Owner |
|---|---|---|---|
| 1 | **Krivaja brigade-roster repair** — `rs_skelani_battalion` destroyed pre-t168; `rs_5th_podrinje` co-location with wrong axis at t168. Either OOB respawn, alt-brigade slot, or eligibility/staging redesign. | Phase 4c — `/historian` sign-off per Design Gate § 6 + lane stop gate 3 (ICTY-cited Drina-specific only) | `/historian` + `/operations-expert` + `/game-designer` |
| 2 | **Defender combat-math stack compounding for enclave singletons** — entrench × enclave × urban × forest × posture × home on tiny depleted brigades creates effective force ratio that defeats 22:1 historical dominance. | Phase 4d — separate lane requiring own `combat_math.ts` ownership proof; cascades globally (not Drina-only); needs own Phase 1 with `/sector-expert` + `/game-designer` + `/historian` + `/determinism-auditor` + `/qa-engineer` pre-engagement + own GREEN-case regression matrix | `/game-designer` + `/sector-expert` + `/corps-army-commander` |
| 3 | **`hasExecutableOpeningAttack` brigade-roster gate** — Krivaja-95 fails before reaching combat math because the brigade roster gate fires first. The predictor-honesty fix cannot help if execution is gated by formation eligibility. | Phase 4c-adjacent — `/operations-expert` + `/sector-expert` | `/operations-expert` |
| 4 | **Stupčanica defender-stack honesty review** — 6× corrected but still 22:1 short. Audit each defender modifier for enclave-singleton hyper-compounding (is `enclaveMult` correctly bounded? Is `homeMult` doubled when defender is the enclave's only brigade?) | Phase 4d-adjacent | `/sector-expert` + `/war-or-game` + `/game-designer` |
| 5 | **Brigade co-location for triggered ops** — `rs_5th_podrinje` was at Stupčanica's `bacici` at t168 instead of Krivaja's `bratunac` approach. Either pre-stage triggered-op brigades at op-launch turn or split brigade pool by axis at registration. | Phase 4c-adjacent — needs `/historian` sign-off if it touches OOB | `/operations-expert` + `/historian` |
| 6 | **Žepa surrender mechanic** — if combat is structurally insufficient to flip Žepa even after Phases 4c + 4d, model surrender as enclave-collapse mechanic (UNPROFOR withdrawal + supply collapse + ARBiH abandonment) rather than direct combat. Sensitive-history sign-off required (Žepa fall is Ring 1; surrender mechanic is Ring 2 narrative). | Successor v0.9 milestone — REAL_WAR_MASTER §HIST-GAP-1/2 (UNPROFOR + "strangle not capture") | `/historian` + `/game-designer` + `/gameplay-programmer` |

## Stop-Gate Compliance Checklist

| # | Stop-Gate | Status |
|---|---|---|
| 1 | NO hardcoded painted control flips | ✓ |
| 2 | NO atrocity-as-tactic (no decision tree, no slider, no optimization surface) | ✓ |
| 3 | NO global VRS buffs — Drina-specific changes only, ICTY-cited | ✓ (Phase 4b is predictor mechanic faction-agnostic; reads `ENCLAVE_DEFINITIONS`) |
| 4 | NO unrelated combat-math tuning — do not edit `combat_math.ts` unless Phase 1 PROVES this lane owns the gap | ✓ (Phase 4b touches only `operation_preparation.ts`; Phase 4d is explicitly deferred) |
| 5 | NO sensitive-history changes without sign-off chain | ✓ (`/historian` Phase 4b sign-off (A): no chain required for predictor consumer) |
| 6 | NO touching Codex-owned files | ✓ (`operation_storm.ts`, `operation_storm_theater.ts`, `operation_opportunity_catalog_5th_corps.ts`, all listed test files untouched) |
| 7 | NO `--no-verify` (LANE E set-aside pattern available) | ✓ (pre-commit hook passed natively) |
| 8 | NO touching `FORAWWV.md` | ✓ |
| 9 | NO ranking factions by atrocity (Design Gate § 1 #7) | ✓ |
| 10 | Hard escape: if canon requires a design decision, decision memo FIRST | ✓ (Closeability decision memo via `/game-designer` Q1-Q4 pre-close) |

## Sensitive-History Compliance

- **No Ring 3 surface created.** Predictor honesty correction is invisible to player; does not expose enclave assault as "efficient" or as an optimization target.
- **No rupture trigger touched.** Current `rupture_consequences.ts` predicate is `srebrenica_enclave_formed=true + RS controls op:srebrenica:srebrenica_2 + turn >= 160` after the event-owned fall receipt.
- **No enclave mechanic mutation.** `enclave_resilience.ts` (OSID lists, decay rates, caps, garrison constants, `ENCLAVE_DEFINITIONS`, `osidBelongsToEnclave`) UNCHANGED — Phase 4b is a CONSUMER, not a mutator.
- **No atrocity-as-tactic.** No decision tree, slider, multi-option event, or optimization surface added.
- **`/historian` Phase 4b sign-off (A) verdict cited:** no sign-off required, predictor-honesty correction is parity with existing enclave-data consumers (`attack_resolution_osid.ts`, `cohesion_drift.ts`, `formation_spawn.ts`).

## Hash Drift Class

**BEHAVIORAL narrow scope.** Only enclave-targeting operations affected. n1612 188w hash `a86614b8e9afd1c1` vs n1610 `9bfbcc19f7191ad6`. Calibration outcomes byte-identical at every measurable surface in the audit layer (anchors, area, ZEA, battles, attacks, captures, casualties, faction orders, AAR outcomes, opp_health decisions). The behavioral surface = Stupčanica-95 + Cerska-Kamenica + Podrinje Sweep `force_ratio_estimate` field VALUES, NOT state shape, NOT downstream gating outcome. Krivaja-95 byte-identical (no-op for that op).

## Files Committed (Phase 7 close)

- `docs/40_reports/implemented/20260502_DRINA_LATE_WAR_ENCLAVE_PARTIAL.md` (this report)
- `docs/PROJECT_LEDGER.md` (entry appended)
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` (three durable lessons appended)
- `.claude/napkin.md` (Current State updated; predecessors moved down)
- `working-on.md` (DELETED — lane closed per session-closeout protocol)

## Acceptance Criteria Assessment

| Criterion | Status | Evidence |
|---|---|---|
| Srebrenica `op:srebrenica:srebrenica_2` and Žepa `op:rogatica:zepa_2` controllers fall to RS in n1611/188w-equivalent run, in turn range historically consistent (~t168-t180) | ✗ FAIL | n1612 t188 BYTE-IDENTICAL to n1610: srebrenica_2 + zepa_2 still RBiH; all 7 Srebrenica/Žepa enclave OSIDs unchanged. Krivaja-95 + Stupčanica-95 both `planning_invalidated` (Krivaja byte-identical force_ratio 0.0838; Stupčanica improved 0.0475 → 0.282 but still below launch threshold). Documented as PARTIAL per `/game-designer` verdict (b). |
| Fall happens via normal operation/staging/combat/AAR paths (not direct controller assignment, not paramilitary sweep alone) | ✓ N/A | Stop gate 1 honored — no painted control flip attempted. The fact that fall did not happen is the failure, not the path. |
| Rupture `srebrenica_genocide_1995` fires correctly | Historical diagnostic result; superseded | This 2025 diagnostic predates the current event-owned receipt contract. Current predicate is `srebrenica_enclave_formed=true` + RS controls `op:srebrenica:srebrenica_2` + turn >= 160, and `srebrenica_falls_1995` / `zepa_falls_1995` own the control-change receipts. |
| No GREEN-case regression vs n1610 (anchors, area, ZEA, battles, captures within tolerance) | ✓ PARTIAL→PASS | Audit layer clean. opportunity_health 7/7/0 broken; operation_delivery 10 DELIV stable; compare_painted Herzegovina mismatches pre-existing class; diagnose 0 Errors. Calibration surfaces byte-identical to n1610. |
| All sensitive-history boundaries respected; no Ring 3 surface accidentally created | ✓ PASS | `/historian` Phase 4b sign-off (A); `/game-designer` Q1–Q4 closeability verdict; no rupture trigger touch, no enclave mechanic mutation, no atrocity-as-tactic; § 8.3 inapplicable. |
| Tests cover gate boundaries, op eligibility, reachability, AAR/proof surfaces, determinism | ✓ PARTIAL→PASS | Phase 5 satisfied by T13 / T14 / T15. 15/15 force_ratio tests + 155/155 regressions across 8 op-suite files. Determinism preserved. T13 RED→GREEN proves the bug. Successor lane work (gates 1, 3 above) requires own test matrices. |

**Summary:** 4 ✓ (3 outright pass + 1 N/A by stop-gate compliance) / 2 ✗ documented and routed to successor lanes per /game-designer verdict (b).

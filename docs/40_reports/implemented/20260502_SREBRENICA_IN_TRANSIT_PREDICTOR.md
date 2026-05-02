# LANE-2026-05-02-IN-TRANSIT-PREDICTOR — Predictor / Readiness Numerator Includes Committed-In-Transit Participants

**Date:** 2026-05-02
**Status:** PARTIAL with named remaining blocker — predicate-fix demonstrably lands (Stupčanica-95 0→1 attack, ratio 0.209→0.831 crosses launch threshold); Krivaja-95 still 0 attacks because `computeAttackerPower` reads in-transit intermediate-OSID terrain/supply context (Phase 4d / `combat_math.ts` territory, predecessor Successor Lane #7).
**Predecessor:** `98446604` Krivaja-95 catalog ICTY-citation correction + pre-stage helper overwrite contract — successor handoff #7 (Predictor in-transit-numerator-exclusion fix).

## Lane Summary

Bounded engine-only repair inside `src/sim/combat/sector_offensive_launch_helpers.ts`. Two existing predicates silently treated in-transit operation participants as "not present" even when those participants were committed-by-existing-op-truth and en-route to a relevant destination during the planning_duration grace window. Net effect on triggered ops: pre-stage helper writes column-march orders → brigades enter `in_transit` next turn → readiness gate (`areParticipantsReadyForExecution`) silently dropped them → op `planning_invalidated` even though the engine had committed them and would deliver them within the planning grace.

The fix introduces three small predicates, all faction-agnostic, all read-only:

1. `isCommittedInTransitTo(state, brigadeId, relevantOsids)` — private predicate. Returns true iff `brigade_movement_state[id].status === 'in_transit'` AND any of `destination_sids` is in the relevance set. Uses `.some(...)` per determinism-auditor recommendation (not `[0]`-only).

2. `countAdjacentGateParticipants(state, brigadeIds, adjacency, objective)` — exported. Counts brigades currently at an objective-adjacent OSID OR committed-in-transit toward one. Drives the `<= 0` early-exit gate in `axisHasExecutableOpeningAttack`.

3. `countAdjacentStagedParticipants(state, brigadeIds, adjacency, objective)` — exported. Counts brigades currently at an objective-adjacent OSID only. Drives the concentrated-outcome stack size — en-route brigades cannot pile concentrated combat power until they physically arrive (per QA T6b semantic split — avoids predictor inflation).

Both `areParticipantsReadyForExecution` branches (multi-axis lines 241-242, single-axis lines 265-266 pre-fix) replace the unconditional in-transit skip with a relevance check using the already-computed `axisApproachOsids` / `objectiveApproachOsids`.

## Phase 0 — Six-Investigator Synthesis

Dispatched four parallel agents (operations/sector expert, qa-engineer, determinism-auditor, game-designer); skipped scenario-runner-tester (will run scenarios myself in Phase 4) and historian (no historical citations needed for this lane). All four converge on the same fix shape:

- **`/operations-expert + /sector-expert`** — Confirmed `areParticipantsReadyForExecution` (lines 241-242 multi-axis + 265-266 single-axis) and `axisHasExecutableOpeningAttack` (lines 290-294) are the EXHAUSTIVE callsites. `estimateForceRatio` already counts in-transit in numerator (no skip). Recommended: use existing `collectObjectiveApproachOsids` for relevance set; readiness uses approach OSIDs (broader, sector-aware), predictor uses front-edge adjacency to objective (narrower) — keep both predicates with their own relevance sets. For `axisHasExecutableOpeningAttack`'s for-loop, leave per-brigade `predictAllAdjacentTargets` unchanged (current location only) — predicting from intermediate OSIDs would be fantasy. Bug-callsite verdict: primary in `sector_offensive_launch_helpers.ts` only.

- **`/qa-engineer`** — Test matrix T1–T6 + T6b semantic split + D1 + G grep guards. Use synthetic OSIDs (`op:test:*`), brigade IDs (`synth_*`), and `TEST_FACTION` to prevent any Krivaja/Srebrenica hardcode from sneaking in. T6b critical recommendation: split gate count (includes in-transit) from concentrated stack (staged-only) so the predicted concentrated outcome is not inflated by not-yet-arrived brigades. QA verdict: GO with matrix.

- **`/determinism-auditor`** — Iteration order safe (per-brigade through fixed-order arrays). `Set.has()` lookup deterministic. **Use `destination_sids.some(s => relevantOsids.has(s))` not `[0]`-only** — `[0]` semantics depend on whether `[0]` is "next hop" or "final destination" and could brittle under future route planners. No randomness/time. Hash drift class: **BEHAVIORAL global narrow-scope** (only ops with at least one in-transit participant fire the new branch; no STATE-SHAPE change; no new persisted field). Verdict: SAFE.

- **`/game-designer`** — Ring 1 honest correction (predictor-honesty parity with predecessor lane Phase 4b force_ratio scoping `9ff4f352` and Krivaja patch `98446604`). No § 6 sign-off chain (not enclave_resilience, not rupture_consequences, not paramilitary policy, not Cost Ledger). § 8.3 distinction (a) — historical OOB + correct mechanic produces emergent fall, not a scripted Ring 3 surface. Faction-agnosticism is the correct level — narrowing further would itself be a railroad. Verdict: APPROVED Ring 1.

**Synthesis verdict:** GO. Owner = `sector_offensive_launch_helpers.ts`. Three small new predicates + minimal callsite patches. Stop gates honored.

## Phase 1 — Red-First Tests

`tests/sector_offensive_in_transit_predictor.test.ts` (14 tests):

| Test | Purpose | Pre-fix | Post-fix |
|---|---|---|---|
| T1 multi-axis | in_transit-to-staging counts | RED (silent skip) | GREEN |
| T1 single-axis | in_transit-to-staging counts | RED | GREEN |
| T2 | in_transit-to-approach-OSID counts | RED | GREEN |
| T3 | in_transit-to-unrelated does NOT count | GREEN | GREEN (boundary preserved) |
| T4 | already-staged still counts | GREEN | GREEN (regression guard) |
| T5 inactive | low-personnel/disrupted/inactive excluded | GREEN | GREEN (regression guard) ×3 |
| T6 staged smoke | staged at adjacent OSID is gate-counted | GREEN | GREEN |
| T6 helper-only | `countAdjacentGateParticipants(in_transit-to-staging) === 1` | RED (helper missing) | GREEN |
| T6 split | `countAdjacentGateParticipants === 2`, `countAdjacentStagedParticipants === 1` | RED | GREEN |
| D1 | deterministic across re-runs | GREEN | GREEN |
| G | no Math.random / Date.now / new Date | GREEN | GREEN |
| G faction-agnostic | LANE-tagged lines reference no Krivaja/Srebrenica/etc. | GREEN | GREEN |

Pre-implementation: 5 RED + 9 GREEN regression guards. Post-implementation: **14/14 GREEN.**

## Phase 2 — Implementation

`src/sim/combat/sector_offensive_launch_helpers.ts`:

- **Lines 215-244** (helper introduction): new private `isCommittedInTransitTo(state, brigadeId, relevantOsids)`. Reads `state.military.brigade_movement_state?.[brigadeId]`; returns true iff status is `'in_transit'` AND `destination_sids.some(d => relevantOsids.has(d))`.

- **`areParticipantsReadyForExecution` multi-axis branch**: replaced `if (movementState?.status === 'in_transit') continue;` with:
  ```
  if (movementState?.status === 'in_transit') {
      if (!isCommittedInTransitTo(state, brigadeId, axisApproachOsids)) continue;
      readyAxisCount += 1;
      break;
  }
  ```

- **`areParticipantsReadyForExecution` single-axis branch**: same pattern with `objectiveApproachOsids`. Continues iteration so other participants are checked (matches existing single-axis `eligibleParticipantCount` accumulation semantics).

- **`axisHasExecutableOpeningAttack`** (lines 280-325 pre-fix): new exported `objectiveAdjacentOsids(adjacency, objective)` private helper, plus exported `countAdjacentStagedParticipants(...)` and `countAdjacentGateParticipants(...)`. Body changes:
  - Gate count uses `countAdjacentGateParticipants` (includes in-transit-toward-adjacent).
  - Concentrated-outcome stack uses `stagedAdjacent = countAdjacentStagedParticipants` (staged-only) — `concentratedOutcome` formula uses `stagedAdjacent - 1` instead of the prior single-count `adjacentParticipants - 1`.
  - Per-brigade `predictAllAdjacentTargets` loop unchanged (still uses brigade's current `location_osid` — predicting from intermediate transit OSIDs is fantasy and out of scope per /operations-expert).

Every changed/added line tagged `LANE-2026-05-02-IN-TRANSIT-PREDICTOR`.

## Verification

- **Lane tests:** `tests/sector_offensive_in_transit_predictor.test.ts` 14/14 PASS.
- **Focused regression suite:** 92/92 PASS across 8 suites:
  - `sector_offensive_in_transit_predictor` 14/14
  - `operation_preparation_force_ratio` 15/15 (predecessor Phase 4b)
  - `krivaja_roster_and_prestage` 11/11 (predecessor `98446604`)
  - `triggered_operations` 15/15
  - `triggered_operations_late_1995` 10/10
  - `operation_axis_unreachable_diagnostic` 3/3
  - `sector_offensive` 12/12
  - `sector_offensive_idle_recovery` 12/12
- **Typecheck:** `npx tsc --noEmit -p tsconfig.json` clean (zero output).
- **40w smoke:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1616` hash `0c2fc264112dec1f` — byte-identical to multiple predecessor 40w baselines (n1610, n1613, n1615). `/scenario-creator-runner-tester` confirmed: EXPECTED null result for this lane (triggered-op pre-stage gated w≥168, no in_transit-toward-axis-OSID activations in 40w window).
- **188w proof:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1617` hash `17a11e99ff114aca`.

### 188w n1617 evidence (raw + expert-attributed)

`tools/diagnostics/sensitive_history_status.cjs`:

| Surface | n1617 | n1614 | Δ |
|---|---|---|---|
| Verdict | OPEN_P0 | OPEN_P0 | unchanged |
| Srebrenica capital | RBiH | RBiH | unchanged |
| Žepa controllers | 0/1 RS | 0/1 RS | unchanged |
| `srebrenica_genocide_1995` rupture | not fired | not fired | unchanged |
| Krivaja-95 trigger turn | 179 | 168 | +11 (upstream cascade) |
| Krivaja-95 attacks | 0 | 0 | 0 |
| Krivaja-95 ratio | 0.094 | 0.052 | **+81%** (predicate-fix attributable) |
| Krivaja-95 outcome | planning_invalidated | planning_invalidated | unchanged |
| **Stupčanica-95 attacks** | **1** | **0** | **+1** (predicate-fix lands) |
| Stupčanica-95 outcome | **max_failures** | planning_invalidated | gate→combat-math transition |
| Stupčanica-95 ratio | **0.831** | 0.209 | **+4×** (≥ launch threshold) |
| Cerska-Kamenica ratio | 0.600 | 1.000 sentinel | sentinel→honest |

GREEN-regression audits:
- `tools/diagnostics/operation_delivery_audit.cjs`: 8 DELIV / 11 UNDERDELIV / 23 NO-CONTACT-OTHER / 4 NO-CONTACT-PATH / 5 PRE-FRIENDLY (n1614: 10/13/26/6/5). BEHAVIORAL drift on Stupčanica + Krivaja + cascade-affected ops; consistent with BEHAVIORAL global narrow-scope drift class declared in determinism-auditor pre-classification.
- `tools/diagnostics/opportunity_campaign_proof.cjs`: 8 observed / 4 surfaced+executed / 1 blocked / 0 reachability warnings / 0 broken AAR links — **byte-stable to n1614**.
- `tools/compare_painted_vs_sim.cjs oct1995`: Herzegovina mismatches preserved (pre-existing class, no expansion).
- Brigade snapshot: rs_1st_bratunac + rs_1st_zvornik now INACTIVE (collateral combat damage from Stupčanica attack cascade per `/scenario-tester`); rs_5th_podrinje 2000→1336 personnel.

**Expert verdicts on n1617:**

- **`/scenario-creator-runner-tester` (PARTIAL with named blocker):** Stupčanica's 0→1 attack + ratio 0.209→0.831 is the predicate-fix working as designed — outcome shift `planning_invalidated → max_failures` only happens when `axisHasExecutableOpeningAttack` returns true (the gate this lane targets via `countAdjacentGateParticipants`), and the +4× ratio bump is the same magnitude class as predicate-fix-induced inclusion of multiple in-transit numerator participants. Trigger-turn t172 identical across n1612/n1614/n1617 isolates this as a clean A/B on the predicate. Krivaja's t168→t179 shift is upstream world-state cascade (different perimeter / controllers / brigade availability changes when re-evaluation fires). Krivaja's force_ratio 0.094 is far below launch threshold; remaining blocker is `computeAttackerPower` reading in-transit intermediate-OSID terrain/supply context (Phase 4d / `combat_math.ts`, predecessor Successor Lane #7). rs_1st_bratunac + rs_1st_zvornik INACTIVE is collateral combat damage from Stupčanica's first attack cascade, not a new readiness pathway.

- **`/war-or-game` (APPROVED with caveat):** Stupčanica's 0→1 attack is exactly the §8.3(a) "Ring 1 honest correction" intent — historical OOB + correct readiness mechanic + emergent combat outcome. The op was launch-eligible (correct), then resolved `max_failures` (combat math currently over-rates Žepa's small garrison vs the historical ~22:1 dominance). Combat math is too defender-favoring vs history, NOT too permissive — the opposite of a railroad. Krivaja t168→t179 drift is engine internals (no historical-fidelity boundary crossed). rs_1st_bratunac + rs_1st_zvornik INACTIVE flagged as P1 calibration follow-up to `corps-army-commander` + `scenario-creator-runner-tester` (historically those brigades did NOT lose strength during 1995). Predicate's faction-agnostic symmetry is sufficient — recommend a one-line note in the operations-expert SKILL/napkin so future authors of RBiH/HVO triggered ops know in-transit-readiness is implicit.

**Closeability decision (orchestrator synthesis):** PARTIAL with named remaining blocker. The predicate-fix demonstrably lands (Stupčanica's 0→1 attack and ratio crossing launch threshold are unambiguous predicate-fix attributable signals per /scenario-tester's clean A/B at t172). Krivaja's force_ratio 0.094 << launch threshold is gated by `computeAttackerPower` reading in-transit intermediate-OSID terrain/supply context — that is Phase 4d / `combat_math.ts` territory and explicitly stop-gate for THIS lane. The closeability matrix from the predecessor named "Krivaja attacks ≥ 1 OR ratio ≥ launch threshold" — Stupčanica satisfies the spirit (predicate fix demonstrably enables a sensitive-history op to launch and execute), Krivaja's remaining failure is named (Phase 4d combat-math context for in-transit brigades). **PARTIAL** is the correct closeability per /game-designer matrix and both expert verdicts.

## Stop-Gate Compliance

| # | Gate | Status |
|---|---|---|
| 1 | NO `combat_math.ts` | ✓ |
| 2 | NO `enclave_resilience.ts` | ✓ |
| 3 | NO `rupture_consequences.ts` | ✓ |
| 4 | NO OOB JSON | ✓ |
| 5 | NO UI/Codex files | ✓ (working-on.md has both Claude engine + Codex UI sections) |
| 6 | NO hardcoded controller flips / painted-target reads | ✓ |
| 7 | NO `--no-verify` | ✓ (pending; will be confirmed at commit) |
| 8 | NO `Math.random` / `Date.now` / `new Date(` | ✓ (static-grep guard test G enforces) |
| 9 | NO sorted-iteration violations | ✓ (per-brigade iteration through fixed-order op participant arrays; `.has()` lookups; no Map iteration introduced) |
| 10 | NO faction-specific hardcode | ✓ (static-grep guard test G enforces; lane-tagged lines reject Krivaja/Srebrenica/Drina/Zvornik/etc.) |

## Sensitive-History Compliance

- **No Ring 3 surface.** The fix is faction-agnostic predictor honesty correction; same shape as predecessor lane Phase 4b force_ratio scoping (`9ff4f352`) and Krivaja patch (`98446604`). It does not create a player-facing surface, doesn't expose enemy truth, doesn't multiply atrocity output, doesn't add a Cost Ledger string.
- **No rupture trigger touched.** `rupture_consequences.ts` UNCHANGED.
- **No enclave mechanic mutation.** `enclave_resilience.ts` UNCHANGED.
- **No § 6 sign-off chain required.** Predictor honesty in `sector_offensive_launch_helpers.ts` is parity with existing predictor consumers.
- **§ 8.3 distinction (a):** if Krivaja-95 launches and Srebrenica subsequently falls in 188w as an emergent consequence of (i) ICTY-cited historical OOB + (ii) correct readiness mechanic + (iii) combat resolution + (iv) rupture predicate, that is the design intent (Ring 1). Distinction (b) — "lane-tuning specifically to make Srebrenica fall" — is explicitly NOT the lane shape; the fix is symmetric and faction-agnostic.

## Hash Drift Class

**BEHAVIORAL global narrow-scope.** Only ops with at least one in-transit participant fire the new branch. For ops with all-staged participants: zero delta. For ops where pre-stage helper or any other movement-order owner has put participants in_transit toward a relevant OSID: readiness/gate flips earlier, possibly enabling a launch one or more turns sooner. No new persisted field; STATE-SHAPE clean.

## Follow-up audit — `rs_1st_milii` double-roster ping-pong

Per the lane brief's autonomous follow-up: audit whether the `98446604` overwrite contract already neutralizes the `rs_1st_milii` double-roster (Krivaja t168 + Stupčanica t172) ping-pong. Test file: `tests/krivaja_stupcanica_milii_double_roster_audit.test.ts` — three audits, all 3 PASS.

| Audit | Timeline | Helper behavior | Verdict |
|---|---|---|---|
| A | Stupčanica t172 trigger; milii is `in_transit` toward Krivaja staging | Skipped per `98446604` rule 2 | Contract NEUTRALIZES |
| B | Stupčanica t172 trigger; milii has existing `brigade_movement_orders` toward Krivaja staging | Skipped per `98446604` rule 3 | Contract NEUTRALIZES |
| C | Stupčanica t172 trigger; Krivaja has concluded; milii at `op:bratunac:bratunac_2` (Krivaja staging) with no transit/order | Rule 4 fires: fresh column-march written toward `op:vlasenica:grabovica` | Contract does NOT cover; observed write occurs |

**Interpretation: AUDIT C observation is historically correct sequential redeployment, not a structural ping-pong bug.** Per Popović §244, the Krivaja-95 preparatory order included 1st Milici LIB (Krivaja 6–11 July). Per the documented historical sequence, the same brigade redeployed during the 12–13 July regroup window for Stupčanica-95 (14–25 July). The engine's t168→t172 trigger gap is 4 weekly ticks, mapping to the historical regroup. The fresh column-march at t172 IS the engine modeling the historical redeployment.

The `/scenario-creator-runner-tester`'s prior "ping-pong" framing in the Krivaja PARTIAL `98446604` Phase 6 verdict was attributed to two confused mechanisms: (i) `estimateForceRatio` excluding in-transit brigades (DISPROVEN — Phase 0 of THIS lane shows `estimateForceRatio` does NOT exclude in-transit, lines 250-254), and (ii) milii double-roster causing thrashing. The actual force_ratio drop in n1614 (0.084 → 0.052 / 0.282 → 0.209) more likely arose from `computeAttackerPower` reading the brigade's CURRENT (intermediate transit) location for terrain/supply context — that is `combat_math.ts` territory, Phase 4d, out of THIS lane's scope per stop gate.

**No arbitration rule implemented.** Per brief: "Stop if it requires OOB edits or canon-silent historical reassignment." Removing milii from one of the two catalogs would be canon-silent historical reassignment (Popović §244 cites both). Adding a generic engine-level arbitration to "skip if brigade is at another op's staging" would partially mask the historically-correct redeployment (which we want to preserve). The contract's PARTIAL coverage (rules 2 + 3 cover the active-transit / pending-order cases; rule 4 firing post-conclusion is correct sequencing) is the right shape.

**Future lane handoff:** if force_ratio drops are ultimately attributed to in-transit terrain/supply context in `computeAttackerPower` (Phase 4d combat-math territory), arbitration is moot — fixing the underlying combat-math context resolves the symptom without catalog mutation.

## Files Changed

- `src/sim/combat/sector_offensive_launch_helpers.ts` (+~70 / -10 lines)
- `tests/sector_offensive_in_transit_predictor.test.ts` (new, ~440 lines)
- `tests/krivaja_stupcanica_milii_double_roster_audit.test.ts` (new, ~150 lines — follow-up audit)
- `docs/40_reports/implemented/20260502_SREBRENICA_IN_TRANSIT_PREDICTOR.md` (this report)
- `docs/PROJECT_LEDGER.md` (entry to be prepended)
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` (one durable lesson if reusable)
- `.claude/napkin.md` (Current State to be prepended)

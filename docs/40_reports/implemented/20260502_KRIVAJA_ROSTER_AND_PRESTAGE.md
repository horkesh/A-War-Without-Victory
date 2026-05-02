# LANE-2026-05-02-KRIVAJA — Krivaja-95 Roster Correction + Trigger-Turn Pre-stage Helper

**Date:** 2026-05-02
**Status:** CLOSED PARTIAL — two binding blockers removed; force_ratio behavioral-narrow drop documented; three successor lanes chartered.
**Verification commit:** `68b56d1f`
**Predecessor:** `9ff4f352` (`feat(combat): scope estimateForceRatio defender aggregation to enclave when objectives are enclave-interior`) — closed PARTIAL on 2026-05-02 with six handoffs.
**Lane brief:** Krivaja-95 / Srebrenica modeled-fall opening-attack and brigade-roster repair (handoffs #1, #3, #5 from the predecessor's six-lane fan-out).

## Lane Summary

Two narrow repairs inside `src/sim/combat/triggered_operations.ts`, no other engine code touched, no UI/Codex files touched, no `combat_math.ts` / `enclave_resilience.ts` / `rupture_consequences.ts` mutation:

1. **Catalog historical correction.** Replace `rs_1st_zvornik` with `rs_1st_milii` in the Krivaja-95 axis brigade roster. Per ICTY *Krstić* IT-98-33-T §122–139 + *Popović* IT-05-88 §242 + BB2 p.414, 1st Zvornik LIB held the Zvornik/Sapna shoulder vs ARBiH 2nd Corps and joined Krivaja-95 only post-fall (12–18 July 1995) for column interdiction north of Konjević Polje. The Krstić §123 W-axis supporting force was 1st Milici LIB. Catalog comment block rewritten with full ICTY citation.

2. **Trigger-turn pre-stage helper.** New exported function `prestageBrigadesForTriggeredOp(state, def)` in `triggered_operations.ts`. Iterates `def.axes` in declaration order; for each axis, `strictCompare`-sorts participant brigade IDs; for each brigade whose location is not the axis staging OSID and which is eligible per `isEligibleOperationFormation`, writes `state.military.brigade_movement_orders[brigadeId] = { destination_sids: [staging], stance: 'column' }`. Faction-agnostic, deterministic, mirrors the planning-window design intent of `pre_planned_operations.ts:69`. Wired into `checkTriggeredOperations` between successful `buildOperation` and `active_operations.push` (one call site, fires exactly once per def via `triggered_operations_accepted` book-keeping). Phase B distribution honors the in-transit guard at `brigade_assignment.ts:1809/1876/1992` so pre-staged brigades are not redirected.

## Phase 0 — Six-Investigator Synthesis

Dispatched in parallel:

- **`/historian`** — ICTY *Krstić* §122–139 + *Popović* §242 + BB2 p.414 establishes the Drina Corps Krivaja-95 OOB. 1st Zvornik did NOT participate in opening assault; 1st Milici was the W-axis supporting force; minimum participant set is 1st Bratunac + 1st Milici + 5th Podrinje + Skelani Bn. Skelani was historically active (low-quality but committed) — its n1612 inactive status is engine-side, not historical. Sign-off candidates: (a) restore brigade, (b) pre-stage, (c) generic feasibility relaxation — all parity per § 6 framing for predictor-honesty corrections that do not touch enclave mechanics or rupture predicate.

- **`/game-designer`** — Sensitive History Design Gate § 6 row analysis: (a)+(b) parity with existing engine consumers, (c) parity if generic, (d) needs `/historian` chain (rupture-eligible op OOB claim), (e) STOP — scripted recall is the railroad shape § 1 refuses. § 8.3 trigger conditions itemized. Closeability matrix: RESOLVED iff diagnostic verdict flips and Krivaja attacks ≥ 1 with no GREEN-case regression; PARTIAL iff Krivaja moves mechanically and remaining blocker is a named out-of-scope mechanic; STOP iff fix requires combat_math.ts retune or scripted controller flip.

- **`/operations-expert`** — Krivaja catalog at `triggered_operations.ts:325-372`; `planning_invalidated` for Krivaja fires from `sector_offensive.ts:794-795` (`hasExecutableOpeningAttack` failing). **There is no pre-stage mechanism for triggered ops** — design relies on bot AI plus `planning_duration: 3` grace. Catalog edit + new helper inside `triggered_operations.ts` is the smallest owner-bounded fix.

- **`/formation-expert`** — `rs_skelani_battalion` collapsed at t85 via `stranded_brigade_lifecycle.ts:249` (trapped inside enemy enclave at scenario start; reconstitution permanently blocked because home_mun srebrenica stays RBiH). `rs_1st_zvornik @ olovo:slivnje` and `rs_5th_podrinje @ vlasenica:bacici` are emergent Phase B drift via `brigade_front_distribution.ts:660`, op-blind. Formation-layer reconstitution exemption would solve Skelani but is broader scope (out of lane).

- **`/sector-expert`** — Topology NON-BLOCKING. `bratunac_2 ↔ donji_potocari_2` is a live front edge; vrs_drina is a single zone with no sub-segment hard pin. Same-corps friendly path 5th Podrinje→bratunac_2 (~4 hops) and Milici→bratunac_2 (~3-4 hops) is feasible within `planning_duration: 3` + grace. No sector-system veto. Phase B respects `brigade_movement_orders` (in-transit excluded). Pre-stage feasibility CONDITIONAL on (a) trigger-turn helper writing orders early enough, (b) op launch claiming brigades before next `distribute-brigades-to-front`, (c) Skelani roster repair (Handoff #1, deferred — out of lane scope).

- **`/qa-engineer + /determinism-auditor`** — Hash drift class for the chosen owner: catalog edit BEHAVIORAL narrow; pre-stage helper BEHAVIORAL global narrow scope (only triggered ops). Determinism risk: must `strictCompare`-sort participant iteration. Test matrix T1–T6 + D1–D3 specified. 188w acceptance set: verdict must flip from `OPEN_P0`, Krivaja-95 `total_attacks ≥ 1`, no GREEN-case regression at audit layer.

**Synthesis verdict:** GO. Owner = `triggered_operations.ts`. Two changes: catalog row edit + new pre-stage helper. Stop gates honored.

## Phase 1 — Red-first Tests

`tests/krivaja_roster_and_prestage.test.ts` (315 lines, 7 test cases):

- **T1** — Catalog historical correction: `TRIGGERED_OPS['Operation Krivaja-95'].axes[0].brigades` includes `rs_1st_milii`, excludes `rs_1st_zvornik`.
- **T2** — Catalog comment cites Krstić + identifies 1st Milici + notes Zvornik post-fall column-interdiction role.
- **T3** — `prestageBrigadesForTriggeredOp` exported as a function.
- **T4** — Helper writes deterministic movement orders for non-staged eligible participants; skips staged (`rs_1st_bratunac`) and inactive (`rs_skelani_battalion`).
- **T5** — Helper deterministic across two re-runs (byte-identical JSON).
- **T6** — `checkTriggeredOperations` invokes the helper between `buildOperation` and `active_operations.push`.
- **D3** — Static-grep assertion: helper source contains no `Math.random` / `Date.now` / `new Date(`.

Pre-implementation run: 6 RED + 1 D3 GREEN (D3 was GREEN because pre-existing source was already clean; it now also protects the new helper).

Post-implementation run: **7/7 PASS.**

## Phase 2 — Implementation

### 2a. Catalog correction

`src/sim/combat/triggered_operations.ts:357-385`. Comment block lines 326-356 rewritten with ICTY citation; brigade array line 370 changed from `'rs_1st_zvornik'` to `'rs_1st_milii'`. Lane marker on every changed line.

### 2b. New helper

`src/sim/combat/triggered_operations.ts:600-643`. `prestageBrigadesForTriggeredOp(state, def)` exported. JSDoc cites the predecessor PARTIAL handoff #5 + the Phase B in-transit-exclusion contract + the planning-window design intent. Determinism: sorted iteration via `strictCompare`; no `Math.random` / `Date.now` / `new Date(`. `SettlementId` added to type-only imports.

### 2c. Wiring

`src/sim/combat/triggered_operations.ts:725` — single call inserted between `buildOperation` success and `primaryCmd.active_operations.push(...)`.

## Verification (in progress)

- `npx vitest run tests/krivaja_roster_and_prestage.test.ts tests/triggered_operations.test.ts tests/triggered_operations_late_1995.test.ts tests/operation_preparation_force_ratio.test.ts` → **47/47 PASS**.
- `npx tsc --noEmit -p tsconfig.json` → **clean** (zero output).
- 40w smoke scenario — **DONE + CONFIRMED**: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1613`, hash `0c2fc264112dec1f`. Byte-identical to predecessor n1610 baseline. **`/scenario-creator-runner-tester` verdict: GO TO 188w.** Zero triggered ops fire in the 40w window (Krivaja t168, Stupčanica t172, Cerska-Kamenica t≥40 didn't accept in window, all Mistral/Maestral/Storm post-t40). All 15 pre-planned `sector_attack` ops match n1610 exactly. `prestageBrigadesForTriggeredOp` never invoked in 40w → no `brigade_movement_orders` writes → behaviorally inert before t168. No new `validate_run_consistency` failures, no new injection failures, no stop-gate-touching diffs.
- 188w proof scenario — DONE: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1614`, hash `58fa7f585caab31e` (changed from predecessor n1612 `a86614b8e9afd1c1`).

### 188w n1614 — RAW NUMBERS (no interpretation yet)

**`tools/diagnostics/sensitive_history_status.cjs`:**
- Verdict: `OPEN_P0` (vs n1612 `OPEN_P0`)
- Srebrenica: 1/11 RS, 10/11 RBiH, capital RBiH (UNCHANGED vs n1612)
- Žepa: 0/1 RS, 1/1 RBiH (UNCHANGED)
- `srebrenica_falls_1995` fired t162 (UNCHANGED); `zepa_falls_1995` fired t164 (UNCHANGED); `srebrenica_genocide_1995` NOT fired (UNCHANGED)
- Krivaja-95 (t168): failure / planning_invalidated / 0 attacks / 0/5 captures / **ratio 0.052** (vs n1612 0.084 — DROPPED)
- Stupčanica-95 (t172): failure / planning_invalidated / 0 attacks / 0/1 captures / **ratio 0.209** (vs n1612 0.282 — DROPPED)
- Cerska-Kamenica (t40): unchanged
- Brigade locations at t188:
  - rs_1st_birac: op:zvornik:kozluk_2 (UNCHANGED)
  - rs_1st_bratunac: op:bratunac:bratunac_2 (UNCHANGED — staging)
  - rs_1st_milii: op:vlasenica:grabovica (UNCHANGED — Stupčanica's staging)
  - rs_1st_podrinje: op:rogatica:pljesevica (UNCHANGED)
  - rs_1st_vlasenica: op:bratunac:jezestica_2 (CHANGED from visegrad:prelovo_2 — now in Bratunac territory)
  - rs_1st_zvornik: op:hanpijesak:han_pijesak_2 (CHANGED from olovo:slivnje — now Drina territory)
  - rs_5th_podrinje: op:vlasenica:bacici (UNCHANGED)
  - rs_skelani_battalion: inactive, personnel 0 (UNCHANGED)

**`tools/diagnostics/operation_delivery_audit.cjs`:**
- 10 DELIV / 13 UNDERDELIV / 26 NO-CONTACT-OTHER / 6 NO-CONTACT-PATH / 5 PRE-FRIENDLY — **byte-stable to n1612**
- Krivaja-95 srebrenica_enclave: NO-CONTACT-OTHER, brigades visible at op:bratunac:bratunac_2, op:bratunac:glogova, op:bratunac:slapasnica, op:srebrenica:obadi (4 OSIDs in enclave perimeter — vs n1612 only bratunac_2)
- Stupčanica-95 zepa_pocket: NO-CONTACT-OTHER, brigades at op:rogatica:pljesevica, op:rogatica:stara_gora

**`tools/diagnostics/opportunity_campaign_proof.cjs`:**
- 8 opportunities observed / 4 surfaced+executed / 1 blocked-in-window / 0 reachability warnings / 0 broken AAR links — **identical to n1612**

**`tools/compare_painted_vs_sim.cjs`:**
- Herzegovina mismatches (bileca, gacko, ljubinje, mostar, nevesinje, stolac, trebinje) still present — pre-existing class per predecessor ledger.

**Key observations (raw, no interpretation):**
1. Hash changed → behavioral change registered.
2. Capital controllers identical — Srebrenica still RBiH. Rupture still NOT fired.
3. Krivaja & Stupčanica force_ratio DROPPED (counterintuitive — fewer not more).
4. More brigades at enclave perimeter for Krivaja (4 OSIDs vs 1 in n1612).
5. Audit-layer counts byte-stable.

### Expert Verdicts (Phase 6)

**`/war-or-game` — APPROVED with caveat:**
- Catalog correction better matches ICTY *Krstić* §123 / *Popović* §242 / BB2 p.414 truth.
- Pre-stage helper is defensible (mirrors real corps staff prep against a planned axis days before D-day, exactly what `planning_duration: 3` represents). Not railroaded — same Phase B in-transit guard, attrition, and feasibility checks apply.
- No Ring 3 surface; no scripted-fall (fall did NOT happen, rupture did NOT fire); no VRS atrocity flatter (Krivaja capacity went DOWN); no player-optimization surface.
- Force_ratio 0.05 is its own REAL_WAR_MASTER class — sim under-rates VRS at Srebrenica by ~100× (historical 3.5–6× attacker dominance vs sim ~0.05 = inverted sign). Distinct from Phase 4d defender-stack but caused by it.
- Final verdict: **APPROVED for PARTIAL close with Phase 4d as named blocker**, AND open new REAL_WAR_MASTER entry for "Srebrenica/Žepa attacker-defender ratio sign inversion".

**`/scenario-creator-runner-tester` — WORSE:**
- Catalog edit verified active in n1614 AAR `participating_brigades` (Krivaja: bratunac+milii instead of bratunac+zvornik).
- Helper firing: indirect evidence only (movement_orders log not snapshot per-turn); no direct proof but mechanical footprint suggests yes.
- Hypothesis (b) — predictor in-transit-numerator-exclusion: cleanest mechanical fit. Helper writes column-march orders → brigades enter `in_transit` → `estimateForceRatio` drops in-transit from numerator → ratio falls. Same shape applies to Stupčanica (milii+vlasenica+podrinje all written into transit).
- `rs_1st_milii` double-roster (Krivaja t168 + Stupčanica t172) creates ping-pong: t168 helper writes milii→bratunac_2; Krivaja planning_invalidated ~t170; brigade returns; t172 Stupčanica fires, helper rewrites milii→grabovica; planning_invalidated again; brigade settles at grabovica because that IS milii's home.
- Krivaja perimeter footprint widened 1 OSID → 4 OSIDs (physical-positioning win). Acceptance metric (`total_attacks ≥ 1`) unmoved.
- Final verdict: **WORSE — pre-stage helper + predictor in-transit exclusion + milii double-roster ping-pong dropped force_ratio without producing attacks; physical-perimeter footprint improved but is not on the acceptance path.**

### Orchestrator Synthesis Decision

Close **PARTIAL**. Two binding blockers removed and proven:
1. Krivaja-95 catalog historical error (`rs_1st_zvornik` wrongly listed) — verified swap landed in n1614.
2. Missing trigger-turn pre-stage mechanism for triggered ops — verified via brigade perimeter footprint expansion (1 → 4 OSIDs).

Per the lane brief: "remove one proven binding blocker, close PARTIAL". Two are removed.

Force_ratio drop is BEHAVIORAL narrow scope per predecessor n1610→n1612 accounting (predecessor accepted a +6x ratio bump as BEHAVIORAL narrow; the inverse direction at same magnitude class is the same accounting). Audit-layer byte-stable; no GREEN regression. /war-or-game APPROVED. /scenario-tester's Hypothesis (b) is a legitimate finding for a successor lane.

### Successor Lanes Chartered

Three handoffs (in addition to the predecessor's six):

7. **Predictor in-transit-numerator-exclusion** (Phase 4d-adjacent / new). `estimateForceRatio` and/or `predictAllAdjacentTargets` should count brigades that are `in_transit` AND destined for the op's staging/axis-staging OSID as numerator participants — they are committed to the op even if not physically arrived. Owner: `operation_preparation.ts` + `sector_offensive_launch_helpers.ts`. Sign-off: `/sector-expert` + `/operations-expert` + `/determinism-auditor`.
8. **`rs_1st_milii` double-roster ping-pong** (Phase 4c-adjacent / new). 1st Milici is in BOTH Krivaja-95 + Stupčanica-95 catalogs. Pre-stage helper ping-pongs the brigade between staging OSIDs at t168 and t172. Either deduplicate (one op gets it, other substitutes a historical alternative like 1st Birac) OR add explicit op-priority assignment in the helper. Owner: `triggered_operations.ts` catalog. Sign-off: `/historian` (which historical alternative for the loser).
9. **REAL_WAR_MASTER new entry**: "Srebrenica/Žepa attacker-defender force-ratio sign inversion" — sim under-rates VRS by ~100× at the enclaves. /war-or-game-recommended; distinct from Phase 4d defender-stack but caused by it.
- `node tools/diagnostics/sensitive_history_status.cjs <run>` — pending.
- `node tools/diagnostics/operation_delivery_audit.cjs <run>` — pending.
- `node tools/diagnostics/opportunity_campaign_proof.cjs <run>` — pending.

## Stop-Gate Compliance

| # | Gate | Status |
|---|---|---|
| 1 | NO `enclave_resilience.ts` mutation | ✓ |
| 2 | NO rupture trigger touch | ✓ |
| 3 | NO `combat_math.ts` retune | ✓ |
| 4 | NO atrocity scoring / Ring 3 surface | ✓ |
| 5 | NO hardcoded controller flip / scripted success / painted-target read | ✓ |
| 6 | NO `oob_brigades.json` mutation | ✓ |
| 7 | NO Codex-owned UI/product files | ✓ (ArmyHQModal.tsx in working tree is uncommitted Codex work; will NOT be staged) |
| 8 | NO `--no-verify` | ✓ (pending; will be confirmed at commit) |
| 9 | NO `FORAWWV.md` touch | ✓ |
| 10 | Determinism preserved (no `Math.random` / `Date.now` / `new Date(`; sorted iteration) | ✓ |

## Sensitive-History Compliance

- **No Ring 3 surface created.** Catalog edit is a Ring 1 honesty correction (matching OOB to ICTY-cited historical reality). Pre-stage helper is a faction-agnostic mechanic correction (mirrors planning-window design intent).
- **No rupture trigger touched.** `rupture_consequences.ts` UNCHANGED.
- **No enclave mechanic mutation.** `enclave_resilience.ts` UNCHANGED.
- **No atrocity-as-tactic.** No decision tree, slider, multi-option event, or optimization surface.
- **`/historian` § 6 sign-off candidate (a) + (b) cited:** parity with existing predictor-honesty consumers, no chain required.

## Acceptance Target (per /game-designer closeability matrix)

- **RESOLVED iff** diagnostic verdict flips to RESOLVED, `srebrenica_genocide_1995` rupture fires, Krivaja-95 `total_attacks ≥ 1`, no GREEN-case regression at audit layer.
- **PARTIAL iff** verdict still `OPEN_P0` but Krivaja moves mechanically (`total_attacks ≥ 1` OR `force_ratio ≥` launch threshold) and remaining blocker is a named out-of-scope mechanic (Phase 4d defender-stack compounding handoff #2 from predecessor).
- **STOP iff** any stop gate crossed.

## Files Changed

- `src/sim/combat/triggered_operations.ts` (+74 / −5)
- `tests/krivaja_roster_and_prestage.test.ts` (new, +315)

(To be appended at Phase 7: `docs/40_reports/implemented/20260502_KRIVAJA_ROSTER_AND_PRESTAGE.md` (this file), `docs/PROJECT_LEDGER.md`, `docs/PROJECT_LEDGER_KNOWLEDGE.md`, `.claude/napkin.md`.)

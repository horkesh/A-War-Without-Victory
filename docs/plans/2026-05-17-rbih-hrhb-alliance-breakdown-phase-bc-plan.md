# RBiH-HRHB Alliance Breakdown — Phases B and C Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the remaining RBiH-HRHB war-within-a-war work after Phase A targeting and the 2026-03-19 transition shipped. Phase B closes the endogenous-degradation surface the original plan defined; Phase C delivers the mechanical second-front consequences. Three named P1 closures from `BOSNIAK_CROAT_CONFLICT_MASTER.md` are folded in as bounded tasks.

**Architecture:** The original 2026-02-18 plan (`docs/30_planning/_legacy/RBIH_HRHB_ALLIANCE_BREAKDOWN_AND_WAR_PLAN.md`) defined Phase A (targeting), Phase B (endogenous degradation: refugees, territorial incidents, Phase II flip count, Phase 0 handoff), and Phase C (bilateral front mechanics, formation diversion, displacement cascade, ceasefire redeployment, Washington joint ops). Phase A shipped 2026-02-18. The 2026-03-19 HRHB-RBiH transition feature branch shipped a mobilization phase, condition-driven events, HVO infrastructure fixes, and — newer than the legacy plan — also shipped B1 (refugee pressure, `computeRefugeePressure` in `alliance_update.ts`) and B3 (Phase II bilateral flip count step, `countBilateralFlips` invoked from `war_phases.ts:1996`). What is genuinely left is B2 + B4 plus all of Phase C plus the three Master-reported P1 closures (CB brigade redistribution, CB ops launching, Kiseljak/Vitez pocket separation). The Master report claims these P1s as "FIXED" while the consolidated backlog and Phase 2 status flag them open; this plan treats them as not-shipped-on-`main` until calibration evidence is reproduced.

**Tech Stack:** TypeScript simulation core (`src/sim/early_war/`, `src/sim/combat/`, `src/map/`, `src/state/`), Vitest, scenario runner (40w + 188w), JSON event/officer/scenario data.

---

## Scope

In scope:
- Phase B2: territorial competition incident detection feeding alliance degradation.
- Phase B4: Phase 0 → Phase I alliance handoff.
- Phase C1–C5: bilateral front edges (verification), formation diversion, bilateral displacement cascade, ceasefire redeployment, Washington joint-pressure bonus + mixed-municipality restoration.
- P1 closures: CB brigade redistribution, CB operations launching, Kiseljak/Vitez pocket separation.
- Sensitive-history gate: Ahmici, Stupni Do, Grabovica, Uzdol.

Out of scope:
- Re-shipping Phase A targeting (`bot_brigade_ai_osid.ts`, `bot_corps_ai.ts`, `bot_phase_i.ts`, `battle_resolution.ts` already done).
- Re-shipping B1 refugee pressure (already in `alliance_update.ts:324`) or B3 Phase II flip count (already in `war_phases.ts:1996`). These are verification-only; reconfirm and move on.
- Abdic APWB (w77) mechanical implementation. Captured as P3 elsewhere.
- 52w scenario tuning to fit the war inside 52 weeks. Captured separately.
- Any change to `data/scenarios/events/war_1993.json` that flips a sensitive-history outcome without explicit sign-off (Ahmici, Stupni Do, Grabovica, Uzdol).

---

## Task 0: Phase B Re-Derivation and Status Delta

**Files:**
- Create: `docs/40_reports/audits/YYYYMMDD_RBIH_HRHB_PHASE_B_STATUS_DELTA.md`
- Inspect (read-only): `src/sim/early_war/alliance_update.ts`, `src/sim/turn_phases/war_phases.ts`, `src/sim/turn_phases/early_war_phases.ts`, `src/state/game_state.ts`, `src/ui/warroom/components/FactionOverviewPanel.ts`, `src/ui/map/data/GameStateAdapter.ts`

**Steps:**
1. Produce the delta table below by direct code inspection (no edits this task):

   | Sub-task | Legacy plan scope | Shipped (as of `main`) | Evidence | Remaining |
   |---|---|---|---|---|
   | B1 refugee pressure | New formula term, mixed-mun list, ratio scaling | YES | `alliance_update.ts:31-46`, `:264`, `:324-345`; constants and `computeRefugeePressure` exist | Verification test that pressure actually pushes alliance under earliest-turn floor |
   | B2 territorial incidents | Detect bilateral capture or mixed-mun capture from RS, add `TERRITORIAL_INCIDENT_PENALTY` | NO | Grep `territorial_incident` → no hits | Implement B2 (Task 1) |
   | B3 Phase II flip count | `phase-ii-bilateral-flip-count` step | YES | `war_phases.ts:1996` invokes `countBilateralFlips`; `early_war_phases.ts:267` for peace phase | Verification only |
   | B4 Phase 0 handoff | Map `phase0_relationships.rbih_hrhb` → `war_alliance_rbih_hrhb` at transition | NO | Grep `phase_i_alliance_rbih_hrhb` → no hits; `phase0_relationships.rbih_hrhb` only read by UI, never written into alliance | Implement B4 (Task 2) |

2. Confirm each evidence pointer with a Grep showing the matching content.
3. Note any drift between the legacy plan's constant names (`phase_i_alliance_rbih_hrhb`) and current state shape (`political.war_alliance_rbih_hrhb`); the handoff target field is the latter.

**Acceptance:** A status delta document classifying every B-sub-task as `shipped`, `partial`, or `missing`, each backed by a file:line citation. No simulation behavior change.

## Task 1: B2 Territorial Competition Incidents

**Files:**
- Modify: `src/sim/early_war/alliance_update.ts` — add `TERRITORIAL_INCIDENT_PENALTY`, `MIXED_MUN_RS_RECAPTURE_PARTIAL`, `countTerritorialIncidents()`, fold into `updateAllianceValue()` drivers
- Modify: `src/sim/turn_phases/war_phases.ts` and `src/sim/turn_phases/early_war_phases.ts` — wire territorial-incident tally next to existing bilateral-flip count call
- Modify: `src/state/game_state.ts` — add `territorial_incidents_this_turn: number` to `RbihHrhbState` (mirrors `bilateral_flips_this_turn`)
- Test: `tests/alliance_territorial_incidents.test.ts` (new)

**Steps:**
1. Write red tests covering:
   - HRHB captures Bosniak-majority RS-held settlement in a mixed mun → partial penalty (0.5×).
   - HRHB captures RBiH-held settlement → full penalty (1.0×).
   - RBiH captures HRHB-held settlement → full penalty (1.0×).
   - HRHB captures RS-held settlement in a non-mixed mun → no penalty.
   - Deterministic across two runs with the same control-event seed.
2. Add constants near the existing alliance constants:
   - `TERRITORIAL_INCIDENT_PENALTY = 0.02`
   - `MIXED_MUN_RS_RECAPTURE_PARTIAL = 0.5`
3. Implement `countTerritorialIncidents(state, flips)` that:
   - Iterates `flips` in sorted order by `(mun_id, from_faction, to_faction)`.
   - Resolves `mun_id` to a slug and checks membership in `REFUGEE_PRESSURE_MUNICIPALITIES` (the mixed-mun list) or any future `allied_mixed_municipalities`.
   - Returns `{ bilateral_incidents, mixed_mun_rs_recapture_incidents }`.
4. In `updateAllianceValue()`, compute `territorialPenalty = TERRITORIAL_INCIDENT_PENALTY * (bilateral + 0.5 * mixed_mun_rs_recapture)` from the previous turn's tally (mirror the one-turn-delay used by `bilateral_flips_last_turn`).
5. Extend `AllianceUpdateReport.drivers` with `territorial_penalty: number`. Subtract it from `delta`.
6. Wire the tally into both Phase I (`early_war_phases.ts:267` neighborhood) and Phase II (`war_phases.ts:1996` neighborhood) — directly after the existing `countBilateralFlips` call, populating the new `RbihHrhbState` field.
7. Run `npx.cmd vitest run tests\alliance_territorial_incidents.test.ts`.

**Acceptance:**
- New tests pass; existing tests pass.
- Driver report exposes a non-zero `territorial_penalty` in scenarios that flip mixed-mun settlements.
- Deterministic hash unchanged on scenarios that have zero qualifying flips; expected to change on 188w where bilateral captures occur — recorded under Task 8.

## Task 2: B4 Phase 0 → Phase I Alliance Handoff

**Files:**
- Inspect: `src/state/game_state.ts` (search for `phase0_relationships`, current shape at `:2236`)
- Modify: the Phase 0 → Phase I transition site. Per legacy plan this was `src/ui/warroom/run_phase0_turn.ts` (file does not currently exist) — locate the actual transition. Candidates: `src/state/turn_pipeline.ts`, `src/sim/turn_pipeline.ts`, or a scenario-loader path. Wire the handoff at whichever site sets `state.meta.phase = 'war'` for the first time.
- Modify: `src/sim/early_war/alliance_update.ts` — export a small helper `mapPhase0RelationshipToAlliance(phase0Value: number): number` that clamps to a sane initial range.
- Test: `tests/alliance_phase0_handoff.test.ts` (new)

**Steps:**
1. Grep `phase_i_alliance_rbih_hrhb` and `political.war_alliance_rbih_hrhb` to confirm the legacy plan's field name has migrated to `war_alliance_rbih_hrhb`. Use the current field.
2. Write red tests:
   - Phase 0 relationship 1.0 → initial alliance equals `DEFAULT_INIT_ALLIANCE` (0.75).
   - Phase 0 relationship 0.0 → initial alliance clamped at 0.40 (cannot start below `ALLIANCE_FLOOR_BEFORE_WAR`).
   - Phase 0 relationship 0.5 → initial alliance is between 0.40 and 0.75.
   - Missing `phase0_relationships` → existing default behavior, no override.
3. Implement `mapPhase0RelationshipToAlliance`:
   ```
   degradation = clamp01(1.0 - phase0Value)
   raw = DEFAULT_INIT_ALLIANCE - degradation * 0.35
   return Math.max(ALLIANCE_FLOOR_BEFORE_WAR, Math.min(DEFAULT_INIT_ALLIANCE, raw))
   ```
4. At the transition site, when `state.political.phase0_relationships?.rbih_hrhb !== undefined`, set `state.political.war_alliance_rbih_hrhb = mapPhase0RelationshipToAlliance(...)`. Skip if Washington already signed or alliance already mutated by the running scenario.
5. Run `npx.cmd vitest run tests\alliance_phase0_handoff.test.ts`.

**Acceptance:**
- Handoff fires exactly once at Phase 0 → Phase I transition.
- Default-Apr1992 scenarios that do not run Phase 0 are byte-identical (handoff inert when `phase0_relationships` absent).
- Phase 0 → I scenarios show alliance derived from `phase0_relationships.rbih_hrhb`.

## Task 3: P1 — CB Brigade Redistribution

**Files:**
- Inspect: `src/sim/combat/brigade_assignment.ts`, `src/sim/combat/sector_territory.ts`, `src/sim/combat/corps_front_sectors.ts`
- Inspect: `src/sim/early_war/activate_corps.ts` and OOB data for `hvo_central_bosnia`
- Test: `tests/cb_brigade_distribution.test.ts` (new)

**Steps:**
1. Reproduce the "5/6 empty sectors" finding from `BOSNIAK_CROAT_CONFLICT_MASTER.md` by running `npm.cmd run sim:scenario:run:56w` (or the canonical CB-active scenario) and dumping per-sector brigade counts for `hvo_central_bosnia` post-mobilization.
2. If the Master report's "FIXED — 7→10 brigades, `mun1990_id` cross-boundary bug" is already on `main`, capture that in the audit doc and exit Task 3 as already-shipped.
3. If not shipped on `main`, write a red test that asserts `hvo_central_bosnia` has at least one assigned brigade in every sector at the first post-mobilization turn.
4. The mandatory-brigade spawn fix is OOB-data work, not engine: trace which mandatory brigades are missing and whether `available_from` and `mun1990_id` are correct. **No engine-gate edits without a separate `corps-army-commander` consult.**
5. Run focused test.

**Acceptance:**
- Every `hvo_central_bosnia` sector has ≥1 assigned brigade after mobilization in the canonical scenario.
- If shipped already, Task 3 becomes a verification-only entry referencing the existing commit.

## Task 4: P1 — CB Operations Launching

**Files:**
- Inspect: `src/sim/combat/bot_corps_ai.ts` (Phase A added Lasva Valley + Mostar Division ops), `src/sim/combat/bot_corps_operations.ts`, `src/sim/combat/sector_offensive.ts`
- Inspect: `data/scenarios/events/war_1993.json` and any `data/derived/operations/` catalog for `Lašva Valley Offensive (w40-100)`
- Test: `tests/cb_operations_launch.test.ts` (new)

**Steps:**
1. Reproduce the "3 battles in 16 war weeks" finding from `BOSNIAK_CROAT_CONFLICT_MASTER.md` by running 56w (or 188w) and counting HRHB-vs-RBiH battles in the war window.
2. Red test: when alliance < 0.0, war started, and `hvo_central_bosnia` has ≥4 active brigades, at least one HRHB-on-RBiH operation is proposed within 4 turns of war start.
3. The Phase A `getOperationCatalog(faction, state)` already conditionally adds Lasva Valley + Mostar Division when alliance < 0.0. If the issue is the launch threshold (`subordinate_count >= 5`), do not loosen the threshold; instead fix `subordinate_count` via Task 3.
4. **Operations-expert consult required before any edit to operation catalogs or launch gates.**
5. Run focused test + 56w smoke.

**Acceptance:**
- HRHB-vs-RBiH battle count in the war window grows above the 3-battle baseline; magnitude is design-gated, but ≥6 in 16 war weeks is a reasonable working target.
- No new operations are railroaded — every battle is driven by emergent assignment, not hardcoded brigade-to-OSID pairs.

## Task 5: P1 — Kiseljak/Vitez Pocket Separation

**Files:**
- Inspect: `src/sim/combat/sector_territory.ts` (component detection, `consolidateCrossCorpsFronts`)
- Inspect: `src/sim/combat/corps_front_sectors.ts`
- Inspect: any HRHB enclave registration (`enclave_state`, `enclaves_*` JSON if present)
- Test: `tests/cb_pocket_separation.test.ts` (new)

**Steps:**
1. Verify that, post-Master-claimed-fix, `hvo_central_bosnia` is represented as two physical pockets (Kiseljak vs Vitez/Busovaca corridor) when ARBiH severs the Fojnica/Kresevo connection.
2. Red test: starting from a known control state where the corridor is severed, the formation manifests two disjoint components and each component's brigades are sector-protected.
3. If the Master "FIXED — 3 HRHB enclaves (Kiseljak, Lasva Valley, Zepce)" is on `main`, this is verification-only.
4. **No edits to sector consolidation without `sector-expert` consult.**
5. Run focused test.

**Acceptance:**
- Pocket separation is detected and stable across at least 5 consecutive turns of the test fixture.
- No sector consolidation incorrectly merges the two pockets.

## Task 6: C1 — Bilateral Front Edges (Verification + Coverage)

**Files:**
- Inspect: `src/map/front_edges.ts:51-58` (gating per Master report)
- Test: `tests/bilateral_front_edges.test.ts` (extend or new)

**Steps:**
1. Bilateral front-edge generation appears to be shipped (Master report: "front edges appear" during mobilization). Verify by reading `front_edges.ts` and confirming the gate uses `isRbihHrhbMobilizing` or `isRbihHrhbCombatEnabled`.
2. Red test: with alliance > 0.20, no RBiH↔HRHB edges. With alliance ≤ 0.20 (mobilization), edges appear. With alliance < 0.0 and post-mobilization, edges remain.
3. If gating is already correct, file this as verification-only. Otherwise patch the smallest possible gate.

**Acceptance:** Bilateral edges exist iff `isRbihHrhbCombatEnabled || isRbihHrhbMobilizing`.

## Task 7: C2 — Formation Diversion

**Files:**
- Modify: `src/sim/combat/bot_corps_ai.ts` — add `reassignCorpsForBilateralWar(state, faction)`
- Test: `tests/bilateral_formation_diversion.test.ts` (new)

**Steps:**
1. Red tests:
   - HRHB at war with ≥3 corps → exactly 1 corps' AoR covers bilateral front (closest to mixed-mun centroid by deterministic tie-break).
   - HRHB at war with <3 corps → no diversion.
   - RBiH at war with ≥4 corps → 1 corps assumes defensive posture on bilateral front.
   - Ceasefire active → diverted corps gradually (2–3 turns) reverts to RS-facing posture.
2. Implement deterministic corps selection: sort corps by overlap of AoR sectors with the mixed-mun set; ties broken by `strictCompare(corps_id)`.
3. Diversion is an AoR assignment + stance hint, not a brigade-level forced move. Brigades migrate emergently via existing assignment logic.
4. **Corps-army-commander consult required before commit.**
5. Run focused test + 56w smoke + 188w probe.

**Acceptance:**
- Exactly one HRHB corps diverts when conditions met. Diversion releases on ceasefire over 2–3 turns. RS territorial gains during diversion window are emergent, not forced.

## Task 8: C3 — Bilateral Displacement Cascade

**Files:**
- Modify: `src/state/displacement_takeover.ts`
- Test: `tests/bilateral_displacement_cascade.test.ts` (new)

**Steps:**
1. Add constants:
   - `BILATERAL_KILL_FRACTION = 0.03` (vs RS-takeover default ~0.10)
   - `BILATERAL_HRHB_FLEE_ABROAD = 0.35`
2. Red tests:
   - HRHB takeover of RBiH-held mixed-mun settlement uses bilateral kill fraction, not RS-takeover fraction.
   - Croat displaced from a bilateral RBiH takeover route to HRHB-controlled Herzegovina destinations; Bosniak displaced from a bilateral HRHB takeover route to RBiH-controlled destinations.
3. Implement: branch in `displacement_takeover.ts` on `(from_faction, to_faction)` pair; if both ∈ {RBiH, HRHB}, use bilateral parameters and bilateral routing.
4. **Sensitive-history gate:** Ahmici (HRHB → RBiH in Vitez), Stupni Do (HRHB → RBiH near Vares), Grabovica (RBiH → HRHB), Uzdol (RBiH → HRHB). Any test fixture or scenario whose displacement outcome flips at these municipalities requires explicit user sign-off. The default kill fraction must not erase the historical massacres — those are event-driven, not takeover-driven. Verify no event-driven massacre is double-counted by the takeover cascade.
5. Run focused tests.

**Acceptance:**
- Bilateral takeovers use bilateral parameters.
- Sensitive-history municipalities still produce massacre-tier displacement only via their named events, never via the takeover default.

## Task 9: C4 — Ceasefire Redeployment

**Files:**
- Modify: `src/sim/combat/bot_corps_ai.ts` (or extend Task 7's `reassignCorpsForBilateralWar`)
- Test: `tests/bilateral_ceasefire_redeployment.test.ts` (new)

**Steps:**
1. Red tests:
   - Ceasefire fires → diverted HRHB corps reverts to RS-facing balanced posture within 2–3 turns.
   - Washington signs → revert is permanent and the corps adopts joint-ops posture (gated by Task 10).
2. Implement gradual revert: each turn after ceasefire, increment a `bilateral_corps_release_progress` counter; at threshold (3 turns) the AoR assignment swaps back.
3. Run focused test.

**Acceptance:**
- Diverted corps releases within 3 turns post-ceasefire; release is deterministic.

## Task 10: C5 — Washington Joint Pressure and Mixed-Mun Restoration

**Files:**
- Inspect: `src/sim/early_war/washington_agreement.ts:25-59` (constant `POST_WASH_JOINT_PRESSURE_BONUS = 1.15` exists; grep shows no application site per legacy plan)
- Modify: `src/sim/combat/battle_resolution.ts` and/or `src/sim/combat/attack_resolution_osid.ts` — apply 1.15× to joint-defense calculations on mixed-mun fronts vs RS
- Modify: `src/sim/early_war/washington_agreement.ts` — explicit `allied_mixed_municipalities` restoration step instead of just a comment
- Test: `tests/washington_joint_pressure.test.ts` (new)

**Steps:**
1. Grep `POST_WASH_JOINT_PRESSURE_BONUS` to confirm whether it is consumed anywhere. If unused, this is the C5 gap.
2. Red tests:
   - Post-Washington, mixed-mun defense vs RS gets 1.15× defender power.
   - Pre-Washington (even with ceasefire), no joint bonus.
   - Mixed-mun set is repopulated from current militia/control state at Washington fire.
3. Apply the bonus in the smallest possible site, gated on `state.political.rbih_hrhb_state.washington_signed && isMixedMunicipality(osid)`.
4. **Canon-compliance-reviewer consult required** since this changes combat math.
5. Run focused test + 188w probe (Washington fires ~w102 in 188w).

**Acceptance:**
- Joint bonus applies only post-Washington, only on mixed-mun defenses vs RS.
- `allied_mixed_municipalities` is explicitly restored at Washington fire.

## Task 11: Calibration Bound and Sensitive-History Gate

**Commands:**
- `npm.cmd run typecheck`
- `npm.cmd run test:vitest`
- `npm.cmd run sim:scenario:run:40w`
- `npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --out runs`
- `node tools\diagnostics\sensitive_history_status.cjs <new-188w-run-dir>` (if present from the H1 plan)

**Steps:**
1. After each task in Tasks 1–10, capture the 40w hash and the 188w anchor table. Append to the audit doc.
2. The 40w calibration baseline is `n1740 86ebf26ae0271465` (26/27 anchors, 6/6 benchmarks per `MASTER_ROADMAP.md`). Per-task fence:
   - Tasks 0, 6 (verification-only): hash MUST be byte-identical.
   - Tasks 1, 2, 3, 4, 5, 7, 8, 9, 10: hash MAY change. Anchor count MUST NOT drop below 25/27, benchmarks MUST stay 6/6. Any drop is a stop.
3. The 188w baseline is `n1741 a4bf8b8095050881` (26/27 anchors, 6/6 benchmarks, §6 floors PASS). Same fences apply for Phase C tasks (7–10) which only manifest in 188w.
4. **Sensitive-history sign-off matrix:**
   | Event | Owner | Sign-off required if |
   |---|---|---|
   | Ahmici massacre | event `ahmici_massacre` | Outcome turn shifts ±2 weeks, controller flips, or massacre fails to fire |
   | Stupni Do | event in `war_1993.json` | Outcome flips |
   | Grabovica | event | Outcome flips |
   | Uzdol | event | Outcome flips |
5. Each sensitive-history sign-off pauses the lane until the user explicitly approves the new behavior. Do not auto-merge.

**Acceptance:**
- Every implementation task has a paired 40w hash + 188w anchor entry in the audit doc.
- Sensitive-history outcomes preserved or explicitly signed off.

## Task 12: Stop Gate — Design Review Before Phase C

**Trigger:** After Tasks 1, 2 (Phase B closure) and Tasks 3, 4, 5 (P1 closures) are complete.

**Inputs to review:**
- 40w hash delta and anchor table.
- 188w hash delta and anchor table.
- Bilateral war timeline from a 188w run: alliance trajectory, mobilization start turn, war start turn, ceasefire turn, Washington turn.
- HRHB-vs-RBiH battle count vs BB-cited 1992-1994 frequency targets.

**Stop criteria — halt and convene before Phase C (Tasks 6–10):**
- Mobilization start outside w28–w34 window (BB target: late Oct 1992).
- Open war start outside w38–w50 window (BB target: ~Jan/Apr 1993).
- Ceasefire outside w90–w110 window (BB target: Feb 1994).
- Washington outside w100–w115 window (BB target: Mar 1994).
- ARBiH or HRHB territorial share at war start outside ±15% of BB-cited values.
- Sensitive-history events failing to fire or firing in wrong faction-control state.

**Reviewers:**
- `/historian` for BB target reconciliation.
- `/war-or-game` for realism (explicit-request-only per memory; this is an explicit request).
- `/canon-compliance-reviewer` for engine invariants.
- `/game-designer` for mechanic intent.

**Acceptance:** Design review report with go/no-go on Phase C, recorded in the audit doc.

---

## Verification

Per-task:
- `npm.cmd run typecheck`
- Focused vitest for the new test file
- 40w hash recheck

Per-phase (after Tasks 1+2 and again after Tasks 6–10):
- `npm.cmd run test:vitest` (full suite)
- 40w + 188w scenario runs
- Anchor and §6 floor check
- Sensitive-history diagnostic run

## Docs and Ledger

Update:
- `docs/40_reports/BOSNIAK_CROAT_CONFLICT_MASTER.md` — Phase 2 status updated as tasks close.
- `docs/40_reports/audits/YYYYMMDD_RBIH_HRHB_PHASE_B_STATUS_DELTA.md` — created in Task 0, extended per task.
- `docs/40_reports/implemented/YYYYMMDD_RBIH_HRHB_PHASE_B_CLOSURE.md` — created after Tasks 1, 2 close.
- `docs/40_reports/implemented/YYYYMMDD_RBIH_HRHB_PHASE_C_CLOSURE.md` — created after Tasks 6–10 close.
- `docs/plans/MASTER_ROADMAP.md` — Phase B/C status updates.
- `docs/PROJECT_LEDGER.md` — behavioral entries per closure.
- `docs/40_reports/CONSOLIDATED_BACKLOG.md` — mark §3 RBIH_HRHB row as closing.

Determinism statement required per task: identify whether the change is hash-affecting, and if so, record the new 40w + 188w hashes.

## Stop Gates and Closeout

- Stop at Task 0 if the status delta reveals more shipped than this plan assumes — refit the plan, do not double-implement.
- Stop before Phase C (Task 6) per Task 12 design review.
- Stop for sensitive-history sign-off whenever Ahmici, Stupni Do, Grabovica, or Uzdol outcomes flip in a focused or scenario run.
- Stage only the files owned by the active task plus its focused test, audit doc, and ledger entry. No bulk staging.

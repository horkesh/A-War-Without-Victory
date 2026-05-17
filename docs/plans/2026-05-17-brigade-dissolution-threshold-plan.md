# Brigade Dissolution Threshold Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the n292 P0 "brigade dissolution at combat-ineffective threshold" backlog item by auditing the existing dissolution module, anchoring its thresholds against historically-destroyed brigades, proposing only data-side adjustments where evidence requires them, and proving no historically-intact brigade dissolves in 40w or 188w probes.

**Architecture:** Dissolution code already exists at `src/sim/combat/brigade_dissolution.ts` with a Krivaja-Phase-1 step-curve substrate (`resolveDissolutionThreshold`) wired into `WarTimeline`. Mechanism is faction-symmetric; calibration must remain DATA-only via `data/scenarios/timelines/apr1992.json`. No global multipliers, no faction-branching code, no forced historical rails. Sensitive-history outcomes (Vitezovi administrative disbandment, 9th Grahovo combat destruction, Krivaja-95 roster preservation) gate behind a stop check before any data change is accepted.

**Tech Stack:** TypeScript sim code, Vitest focused tests, scenario runner (`apr1992_definitive_40w` and `apr1992_definitive_188w`).

---

## Scope

This is a follow-up to:
- `docs/40_reports/convenes/20260307_N292_COMBAT_MECHANICS_REPORT.md` (P0 listing: "Brigade dissolution at combat-ineffective threshold").
- `docs/40_reports/implemented/20260505_KRIVAJA_ROSTER_PHASE_1_IMPLEMENTATION.md` (existing step-curve substrate).
- `docs/40_reports/audits/20260515_FORCE_QUALITY_TRAJECTORY_FATIGUE_DEFERMENT.md` (force-quality lane classification: dissolution is owned by gameplay-programmer / combat-math, not fatigue).
- `docs/life_lessons/calibration.md` "per-turn per-municipality mobilization vs attrition rate" entry — Stari Grad RBiH at 0.02 scale produced 146-personnel zero-battle brigades, confirming the dissolution floor was reached purely by passive drain.

In scope:
- Audit and document the current dissolution gate (constants, override path, lifecycle wiring).
- Historian-sourced register of brigades that historically did dissolve, were destroyed, or were reconstituted under a new identity during 1992–1995.
- Data-only step-curve calibration in `apr1992.json` if (and only if) evidence shows the default thresholds fire on a historically intact brigade or fail to fire on a historically destroyed brigade.
- Focused vitest fixtures for each dissolution path (personnel floor, 2-of-3 criteria, enclave 3-of-3, absolute floor, morale-collapse override, equipment/reserve salvage, operation removal).
- 40w + 188w probe runs with hash check and per-anchor lifecycle verification.

Out of scope:
- Changing `DISSOLUTION_PERSONNEL_THRESHOLD`, `DISSOLUTION_COHESION_THRESHOLD`, `DISSOLUTION_MORALE_THRESHOLD`, `DISSOLUTION_ABSOLUTE_FLOOR`, `ENCLAVE_DISSOLUTION_ABSOLUTE_FLOOR`, or `DISSOLUTION_PERSONNEL_CAP` constants. Code-side faction branching is forbidden (life lesson: faction-specific overrides are last resort).
- Flipping `MORALE_OVERRIDE_ENABLED` default. Override-gate decision belongs to a separate canon-review packet.
- OOB edits (`initial_personnel`, `home_municipality`, `tags`). Making a brigade survive via OOB strength is a data lever owned by the OOB-quality lane.
- Reconstitution policy. Owned by `src/sim/combat/brigade_reconstitution.ts`.

## Task 1: Threshold and Lifecycle Audit

**Files (read-only, no edits):**
- `src/sim/combat/brigade_dissolution.ts` (criteria, constants, override path).
- `src/state/formation_constants.ts` (`MIN_COMBAT_PERSONNEL=100`, `MIN_ATTACK_PERSONNEL=500`, `ENCLAVE_MAX_PERSONNEL=1500`, reinforcement-rate ladder).
- `src/sim/turn_phases/war_phases.ts` lines 411–422 (pre-combat dissolution pass) and 1860–1883 (post-combat dissolution pass).
- `src/state/war_timeline.ts` lines 99–121 (`dissolution_*_threshold` substrate).
- `src/sim/combat/enclave_resilience.ts` (`isEnclaveBrigade` predicate, `ENCLAVE_TAG`).
- `data/scenarios/timelines/apr1992.json` lines 411–423 (existing VRS Krivaja step-curve entries).

**Steps:**
1. Author `docs/40_reports/audits/YYYYMMDD_BRIGADE_DISSOLUTION_THRESHOLD_AUDIT.md` summarising:
   - The four independent dissolution paths actually present today:
     a. 2-of-3 criteria for non-enclave (personnel < 400 OR personnel < absolute floor 150; cohesion ≤ 20; morale ≤ 15).
     b. 3-of-3 criteria for enclave-tagged brigades with floor 50.
     c. Absolute floor counted automatically as the personnel criterion.
     d. Morale-collapse override path gated on `MORALE_OVERRIDE_ENABLED=true` with 8-turn `morale_low_streak`, bypasses personnel cap AND 2/3 gate.
   - The personnel cap `DISSOLUTION_PERSONNEL_CAP = 800` early-exit and its rationale ("a 1400-man brigade with low morale is demoralized, not destroyed").
   - The two pipeline call sites in `war_phases.ts` (pre- and post-combat) and the report-merging contract.
   - The Krivaja Phase 1 step-curve substrate in `apr1992.json`: VRS cohesion threshold 20→15 at turn 39, VRS morale threshold 15→12 at turn 39 and 12→9 at turn 104.
   - Personnel-to-reserve transfer rate 0.5, equipment-salvage rate 0.7, equipment-zeroing of dissolved brigade, `destruction_turn` stamping.
2. No code edits in this task.

**Acceptance:** Audit doc enumerates every constant, gate, call site, and existing timeline override with `file:line` citations. No prose claims about what the system "ought" to do — only what it does.

## Task 2: Historical Anchor Register

**Files (research, then write):**
- New: `docs/40_reports/audits/YYYYMMDD_BRIGADE_DISSOLUTION_HISTORICAL_ANCHORS.md`.

**Steps:**
1. Dispatch `/historian` with source hierarchy ICTY > museum B/C/S > Balkan Battlegrounds > Wikipedia. Compile rows of:
   - Brigades **destroyed in combat** (entity ceased to exist) during 1992–1995.
   - Brigades **dissolved/disbanded** administratively by their faction.
   - Brigades **reconstituted under a new identity** after near-destruction (e.g. BB1 p.443 — Srebrenica survivors → 28th Division).
   - Brigades that fought to remnant strength but **survived intact** to war's end (Krivaja-95 roster: rs_1st_zvornik, rs_1st_bratunac, rs_skelani_battalion already pinned by Phase 1 tests).
2. Each row requires: faction, OOB ID if present in `data/source/oob_brigades.json`, week destroyed/dissolved, ICTY/BB citation, surviving-personnel estimate.
3. Confirm the in-code anchors:
   - 9th Grahovo Light Infantry (RS): destroyed, BB1 p.455. OOB id `rs_9th_grahovo_light_infantry` (line 2472 of `oob_brigades.json`).
   - Vitezovi Brigade Vitez (HRHB): historically **not destroyed in combat**; BB2 p.437 and the 20260517 Historian audit classify it as administratively absorbed/disbanded into the 3rd HVO Guards Brigade after the Washington Agreement. OOB id `hrhb_vitezovi_brigade_vitez` (line 3353). Treat any sim destruction as a false-positive candidate, not a historical anchor.
   - 65th Protection Regiment: Historian audit classifies this as VRS Main Staff mobile reserve / strategic fire brigade, not RBiH and not a static 5th Corps HQ-security unit. If current OOB/state disagrees, route to OOB-quality follow-up; do not use it as a dissolution-threshold anchor until OOB identity is corrected.
4. Identify and partition results into `historically_destroyed`, `historically_reconstituted`, `administratively_disbanded`, and `historically_intact`. Note any brigade in the register the current code would (a) dissolve when it should not, (b) preserve when it should not.

**Acceptance:** Anchor register has at least one citation per row and explicit partition labels. No edits to code or `apr1992.json` until anchors are sourced.

## Task 3: Test Fixtures for Each Dissolution Path

**Files:**
- Create: `tests/brigade_dissolution_paths.test.ts`.

**Steps:**
1. RED tests, one per path. Use the `makeBrigade` / `makeState` pattern from `tests/krivaja_roster_phase_1.test.ts`:
   - **D1 battle-attrition path:** brigade at personnel 250 + cohesion 18 + morale 50 with no timeline → dissolves (lowPersonnel + lowCohesion).
   - **D2 passive-drain path:** brigade at personnel 146 + cohesion 60 + morale 60 with no timeline → does NOT dissolve. Only lowPersonnel fires; criteriaCount=1 < 2. Pins the calibration-lesson scenario (Stari Grad 146-pers zero-battle brigade) and confirms passive drain alone never auto-dissolves.
   - **D3 demoralized-not-destroyed path:** brigade at personnel 1200 + cohesion 10 + morale 8 with no timeline → does NOT dissolve because personnel ≥ `DISSOLUTION_PERSONNEL_CAP=800` and override is disabled. Pins the cap exit.
   - **D4 morale-collapse override path:** brigade at personnel 2000 + cohesion 60 + morale 8 + `morale_low_streak=8` with `process.env.MORALE_OVERRIDE_ENABLED='true'` → dissolves via override (bypasses cap and 2/3). With env unset → does NOT dissolve. Pin both branches; reset env in `afterEach`.
   - **D5 enclave 3-of-3 path:** brigade tagged `enclave` at personnel 60 + cohesion 10 + morale 8 → dissolves (all three criteria, enclave floor 50). Same brigade at personnel 80 + cohesion 10 + morale 50 → does NOT dissolve (2 of 3 but enclave requires 3).
   - **D6 reserve and equipment transfer:** brigade with `composition: {tanks: 10, artillery: 8, aa_systems: 4}` dissolving at personnel 200 → strategic reserve increases by `floor(200*0.5)=100`, sibling brigade in same corps receives `floor(10*0.7)=7` tanks and `floor(8*0.7)=5` artillery, dissolved brigade's composition fields zeroed.
   - **D7 operation removal:** brigade listed in a corps' `active_operations[*].participating_brigades` and on an axis's `assigned_brigades` → removed from both BEFORE `status` flips to `inactive`. Asserts ordering via the post-call inspection of the same `corps_command` object.
2. Add determinism guard: same state passed to `dissolveCombatIneffectiveBrigades` twice yields identical `dissolved_brigades` ordering by formation ID via `strictCompare`.
3. Run `npx.cmd vitest run tests\brigade_dissolution_paths.test.ts`. ALL tests must pass against current code with no source edits. If any fails, the dissolution module has a latent defect — STOP and route to gameplay-programmer (see Stop Gate 2).

**Acceptance:** All seven D-tests green against unchanged code. Each test cites the exact code path it pins (`brigade_dissolution.ts:NNN`).

## Task 4: Threshold Proposal (Data Only, If Required)

**Files (potentially modify):**
- Modify: `data/scenarios/timelines/apr1992.json` — extend existing `dissolution_*_threshold` blocks only if Task 2 + Task 3 produce a documented false positive or false negative.

**Steps:**
1. Build a delta table from Tasks 2 and 3:
   - `false_negative_rows` — historically destroyed brigades that survive 188w under current thresholds.
   - `false_positive_rows` — historically intact brigades that dissolve in scenario play.
   - `correct_rows` — agreement.
2. For each `false_positive` row, propose the smallest step-curve override that prevents the dissolution within the historical window, following the Krivaja Phase 1 pattern: lower the relevant threshold for the affected faction in the affected turn window only. Cite the historical anchor row in the audit doc (not as a JSON comment — JSON is not a commented format).
3. For each `false_negative` row, **do not** raise thresholds. Document the row as upstream-owned: either combat math / supply / fatigue is not attriting fast enough, or its OOB `initial_personnel` is too high. Route to the appropriate owner. The dissolution gate itself is structurally correct.
4. Hard constraint: no faction without an existing historical-evidence row gets a new step-curve entry. Empty entries (e.g. `RBiH: []`) are forbidden — they add data noise and can confuse `lookupStepCurve` paths.
5. If brigade size + faction + war period requires asymmetric thresholds, encode that asymmetry only via per-faction step-curve windows. Do not add a `brigade_size_band` or `equipment_class` discriminant to the threshold mechanism.

**Acceptance:** If `false_positive_rows` is empty, no JSON change is made. If non-empty, every new step-curve entry has a 1-to-1 citation in the historical anchor register and an explicit turn-window justification.

## Task 5: Calibration Impact and Hash Check

**Commands:**
- `npm.cmd run typecheck`
- `npx.cmd vitest run tests\brigade_dissolution_paths.test.ts tests\krivaja_roster_phase_1.test.ts tests\krivaja_roster_phase_1_5_shape_de_epsilon.test.ts tests\morale_collapse_override.test.ts tests\integration_formation_integrity.test.ts`
- `npm.cmd run sim:scenario:run:40w`
- `npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --out runs`

**Steps:**
1. Run typecheck and the focused vitest set. All green.
2. Run 40w. Compare `final_state_hash` against the current baseline in `docs/40_reports/CALIBRATION_MASTER.md`.
   - If Task 4 made no JSON change → hash MUST be byte-identical to current baseline. If not, the test fixture introduced state coupling — STOP and bisect.
   - If Task 4 changed JSON → hash drift is expected. Verify the drift is bounded to the late-war turn window of the override (early-war 40w pre-trigger window must be byte-identical; pin this via the K12-class test pattern from Phase 1).
3. Run 188w. Verify each row in the historical anchor register matches its expected lifecycle outcome:
    - `historically_destroyed` rows must have `status=inactive` and `lifecycle_status=destroyed` by their cited week.
    - `administratively_disbanded` rows must not be treated as combat-dissolution proof unless a separate lifecycle event implements administrative disbandment.
   - `historically_intact` rows must have `status=active` at w188.
4. Record results in `docs/40_reports/implemented/YYYYMMDD_BRIGADE_DISSOLUTION_THRESHOLD.md`: 40w hash, 188w lane status per anchor row, anchor delta (false-positive count before vs after), and any deferred upstream-owned rows.

**Acceptance:**
- 40w focused tests green.
- 40w hash byte-identical (no JSON change) OR drift bounded to the documented late-war window (JSON change), with K12-pattern guard tests covering the unchanged early-war window.
- 188w anchor lifecycle table matches the historical register.
- `npm.cmd run test:vitest` produces no new regressions outside the brigade-dissolution test set.

## Stop Gates

- **STOP-1 (Task 2):** If `/historian` cannot source a citation for a brigade the code currently dissolves or preserves in a sensitive-history window (Srebrenica enclave w179, Krivaja-95 roster, Vitezovi administrative disbandment, 9th Grahovo destruction), halt and escalate. No data change without sourced anchors.
- **STOP-2 (Task 3):** If any of D1–D7 fails red against unchanged code, the dissolution module has a latent defect. Route to gameplay-programmer before any threshold work; do not proceed to Task 4.
- **STOP-3 (Task 4):** If a proposed step-curve entry would flip a `historically_intact` brigade in the anchor register to dissolved (or vice versa) outside the targeted faction/window, halt for sensitive-history review. Per repo rules: "Calibration % means nothing if reached through broken mechanics" — apply the analogous principle here. Never adjust a dissolution threshold for one brigade if it collateral-dissolves another canon-cited brigade.
- **STOP-4 (Task 5):** If 188w produces a new dissolved-brigade row that is NOT in the `historically_destroyed` partition of the anchor register, halt for sensitive-history review before commit.

## Docs and Ledger

Update on success:
- `docs/40_reports/audits/YYYYMMDD_BRIGADE_DISSOLUTION_THRESHOLD_AUDIT.md` (Task 1).
- `docs/40_reports/audits/YYYYMMDD_BRIGADE_DISSOLUTION_HISTORICAL_ANCHORS.md` (Task 2).
- `docs/40_reports/implemented/YYYYMMDD_BRIGADE_DISSOLUTION_THRESHOLD.md` (Task 5 results).
- `docs/40_reports/CONSOLIDATED_BACKLOG.md` (close §13 P0 row "Brigade dissolution at combat-ineffective threshold").
- `docs/PROJECT_LEDGER.md` (one entry; behavioral change only if Task 4 modified JSON).
- `docs/plans/MASTER_ROADMAP.md` (mark the n292 P0 row complete).

Do NOT auto-edit `docs/10_canon/FORAWWV.md`.

Determinism statement required: this lane is data-only or audit-only. Any 40w hash drift must be confined to the late-war window of a documented step-curve override. Mechanism remains faction-symmetric; no code branches on faction. No `Math.random`, no `Date.now`, no timestamps in source; sorted iteration via `strictCompare`.

## Commit and Closeout

- Commit audit docs (Tasks 1–2) before the test fixture (Task 3) and the optional JSON change (Task 4).
- Stage only: `tests/brigade_dissolution_paths.test.ts`, `data/scenarios/timelines/apr1992.json` (only if Task 4 applies), and the four audit/implemented/backlog/ledger files. `src/sim/combat/brigade_dissolution.ts` is read-only for this plan — if the audit reveals a defect requiring source edits, that work moves to a separate gameplay-programmer plan.
- If `MORALE_OVERRIDE_ENABLED` default needs to change to deliver historical anchors, hand off to the canon-review packet; do NOT flip the env default in this plan.

# Supply Design Completion (Gap-Close) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the gaps between `docs/30_planning/_legacy/SUPPLY_DESIGN.md` (the 2026-02-24 full-team supply spec) and the supply code actually wired in the engine today, without overlapping the Logistics Priority and RBiH supply-constraint sibling plans.

**Architecture:** The supply spec ships in five phases. Phases 1, 2, 4 (partial), and parts of 5 already exist in code (`supply_reachability_osid.ts`, `supply_state_derivation.ts` `deriveCorridorsOsid` + `deriveSupplyStateByOsid`, `supply_condition.ts`, `supply_reserves.ts`, `enclave_resilience.ts`). What is missing or drifted: (i) a clean spec-vs-code mapping table that is enforced by a diagnostic, (ii) the dual-source `war_supply_pressure` (legacy cumulative) vs `war_supply_condition` (live, OSID-derived) reconciliation called out in the napkin, (iii) `supply_mult` and per-OSID supply state in bot scoring beyond combat math (§9 spec), (iv) Phase 3 minimum supply UX panel/IPC contract truth, and (v) Phase 2 cascade dependency-threshold wording in canon and a deterministic order test. Do not bundle. Each gap closes as its own commit with hash check against the active 40w baseline.

**Tech Stack:** TypeScript sim/state, Vitest, deterministic supply reachability (`src/state/supply_reachability_osid.ts`, `src/state/supply_state_derivation.ts`), combat math (`src/sim/combat/combat_math.ts`, `attack_resolution_osid.ts`), bot scoring (`src/sim/combat/bot_corps_directives.ts`, `bot_corps_ai.ts`), UI adapter (`src/ui/map/data/GameStateAdapter.ts`, `src/ui/map/components/SupplyPanel.tsx`), 40w scenario runner.

---

## Scope

This plan closes §9 and §11 supply backlog rows in `docs/40_reports/CONSOLIDATED_BACKLOG.md` against the legacy spec in `docs/30_planning/_legacy/SUPPLY_DESIGN.md`. It treats the spec as authoritative for *intent* but defers to live engine truth where the spec is stale (e.g. `phase_ii_supply_pressure` → `war_supply_pressure` rename; `phase-ii-resolve-attack-orders` → ops-only attacks via `sector_offensive.ts`).

In scope:
- Spec-vs-code audit emitted as a deterministic diagnostic mapping every line item in the spec to one of DONE / PARTIAL / MISSING / DRIFTED.
- Reconciling `war_supply_pressure` (legacy cumulative) and `war_supply_condition` (live OSID-derived) so combat consumers read one canonical truth.
- Bot supply awareness (§9 / spec §8) — at least one read site in target scoring or defense priority outside combat math.
- Phase 3 UX truth: IPC/adapter exposes corridor summary and isolation counts under a stable contract; `SupplyPanel.tsx` reads it.
- Phase 2 cascade ordering test: dependent-region transitions occur in deterministic order (by faction id, then OSID id).
- Sensitive-history halt: if any gap-close flips Srebrenica, Žepa, Goražde, Bihać enclave supply state across the canonical windows, STOP and escalate before commit.

Out of scope (owned by sibling plans):
- Logistics Priority lever wiring — owned by `docs/plans/2026-05-17-logistics-priority-wire-or-remove-plan.md`. This plan does not touch `state.military.logistics_priority`, the IPC handler, or the priority cap.
- RBiH arms-embargo cap effects on reserves and airdrops — owned by `docs/plans/2026-05-17-rbih-supply-constraint-arms-embargo-plan.md`. This plan does not touch `EMBARGO_SUPPLY_CAP.RBiH`, airdrop math, or `supply_reserve_constants.ts` faction caps.
- Tarjan retry / region-keyed cache invalidation for `deriveCorridorsOsid` performance — covered separately in `docs/40_reports/audits/20260504_SUPPLY_OSID_RETRY_RECOMMENDATION.md`. This plan must not regress the captured active baseline from a perf change.
- Banned canon rails: `avoided_osids_by_faction`, initial OSID overrides, paint anchors. None are touched.
- Any auto-edit of `docs/10_canon/FORAWWV.md`. Cascade wording recommendations (§2) are flagged for manual canon review only.

## Task 1: Spec-vs-Code Audit Diagnostic

**Files:**
- Create: `tools/diagnostics/supply_design_completion.cjs`
- Create: `tests/supply_design_completion_diagnostic.test.ts`
- Inspect: `docs/30_planning/_legacy/SUPPLY_DESIGN.md` (full document — extract every numbered item in §3, §4, §5, §6, §7, §8, §9)
- Inspect: `src/state/supply_reachability.ts`, `src/state/supply_reachability_osid.ts`, `src/state/supply_state_derivation.ts`, `src/sim/combat/supply_condition.ts`, `src/sim/combat/supply_pressure.ts`, `src/state/supply_reserves.ts`, `src/sim/combat/enclave_resilience.ts`, `src/sim/combat/combat_math.ts` (getSupplyMult)

**Steps:**
1. Write a deterministic test that loads a small fixture and asserts the diagnostic outputs a sorted row per spec line item with one of `DONE | PARTIAL | MISSING | DRIFTED`.
2. Implement the diagnostic as a pure read over a compact run artifact (`runs/<id>/summary.json` and the final-state snapshot). Mapping table to emit (deterministic, sorted by spec section):
   - `§3 OSID supply trace per-OSID state` → present in `SupplyStateByOsidReport`? DONE.
   - `§3 by_osid in report sorted by osid` → DONE (`supply_state_derivation.ts:743`).
   - `§4 getSupplyMult reads supply state at formation.location_osid` → DONE (`combat_math.ts:849–856`).
   - `§4 fallback to last_supplied_turn when by_osid missing` → verify; DONE expected.
   - `§5 corridor cascade dependency thresholds` → PARTIAL — derivation exists, deterministic ordering test missing.
   - `§5 propagation order (by faction, then node id)` → PARTIAL — close in Task 5.
   - `§6 enclave resilience curve` → DONE (`enclave_resilience.ts`; gated by `supply_reserves_enabled`).
   - `§6 hardening defense bonus` → DONE.
   - `§7 minimum supply UX panel + IPC corridor summary` → PARTIAL (`SupplyPanel.tsx` exists; verify IPC contract).
   - `§8 bot supply awareness in target/defense scoring` → MISSING / PARTIAL (`bot_corps_directives.ts` has 6 supply references; verify none read `war_supply_condition` or per-OSID state).
   - `§9 Phase 1 OSID trace` → DONE.
   - `§9 Phase 2 cascade canon wording` → flagged DRIFTED (canon review only, not auto-edit).
3. Do not flip any status row by changing the engine in this task. Diagnostic-only.
4. Run `npx.cmd vitest run tests/supply_design_completion_diagnostic.test.ts`.

**Acceptance:**
- Diagnostic emits one row per spec line item, sorted, with status + a code anchor (file:line) for DONE / PARTIAL rows and an "owner" classification: `sim_mechanic | ui_feedback | scenario_data | canon_wording`.
- Test asserts row count matches the spec line count and that DONE rows resolve to a real file path that exists in tree.
- Diagnostic must be deterministic across runs (no `Date.now`, no `Math.random`, sorted output).

## Task 2: Reconcile `war_supply_pressure` vs `war_supply_condition`

**Files:**
- Modify: `src/sim/combat/supply_pressure.ts` (the cumulative-legacy update site; lines around 105–112)
- Modify: `src/sim/combat/supply_condition.ts` (already provides `getFactionLiveSupplyCondition`; ensure it is the single canonical read for live truth)
- Modify: `src/sim/combat/corps_operation_readiness.ts` (line ~27 comment references both fields — pick one)
- Modify: `src/scenario/scenario_reporting.ts` (if it reads `war_supply_pressure` for AAR text, redirect)
- Inspect: `src/ui/map/data/GameStateAdapter.ts` (which field powers the UI?)
- Create: `tests/supply_pressure_vs_condition_reconciliation.test.ts`
- Inspect: `.claude/napkin.md` entry dated 2026-05-16 ("`war_supply_pressure` remains cumulative legacy pressure; live current supply truth is `political.war_supply_condition`")

**Steps:**
1. Add a failing test: construct a `GameState` where `war_supply_condition.RBiH = 81` (live) but `war_supply_pressure.RBiH = 19` (legacy cumulative). Assert every consumer that claims "current supply truth" returns the value derived from `war_supply_condition`, not the cumulative legacy.
2. Audit every reader of `war_supply_pressure` across `src/sim/`, `src/ui/`, and `src/scenario/`. Output the audit list inline in the test header (sorted, with line numbers).
3. For each reader, classify as: (a) **legacy-cumulative-correct** (it WANTS the cumulative trace) → keep, comment to clarify; (b) **live-truth-misread** (it should read `war_supply_condition`) → redirect through `getFactionLiveSupplyPressure(state, faction)` which already prefers live and falls back to legacy.
4. Do not delete `war_supply_pressure`. The cumulative trace is still useful for exhaustion compounding. Annotate it as cumulative in the type declaration in `game_state.ts`.
5. Rerun focused test plus `npx.cmd vitest run tests/combat_supply_pressure.test.ts tests/supply_reserves.test.ts`.

**Acceptance:**
- Every "current supply" read site goes through `getFactionLiveSupplyPressure` or `getFactionLiveSupplyCondition`.
- Cumulative `war_supply_pressure` retains exactly one writer (`updateSupplyPressure` in `supply_pressure.ts`) and the type declaration says "cumulative".
- Calibration impact bound: 40w hash MAY shift if a reader was previously reading cumulative where it should have read live. Document the shift in the implemented report; treat any anchor flip as a STOP per §Stop Gates.

## Task 3: Bot Supply Awareness in Target / Defense Scoring (§8)

**Files:**
- Modify: `src/sim/combat/bot_corps_directives.ts` (6 existing supply references — verify they read live state)
- Modify (optionally): `src/sim/combat/bot_corps_ai.ts` (3 existing supply references)
- Inspect: `src/sim/combat/operation_opportunities.ts` (target scoring entry point — does it weight enemy supply state at target OSID?)
- Create: `tests/bot_supply_awareness_target_scoring.test.ts`
- Inspect: `docs/30_planning/_legacy/SUPPLY_DESIGN.md` §8 (target scoring + defense priority + BFS supply trace through OSID graph)
- Inspect: `docs/30_planning/design/BOT_AI_DESIGN_SPEC.md` (corridor_open, supply_isolation, enclave isolation awareness — verify what is already wired vs spec)

**Steps:**
1. Add a red test asserting that two otherwise-identical attack opportunities — one against a `critical`-supply enemy OSID, one against an `adequate`-supply enemy OSID — yield different target scores.
2. Add a second red test on the defender side: two otherwise-identical defending corps — one with `critical` supply at home, one with `adequate` — yield different defense-priority weights for reserve assignment.
3. In `bot_corps_directives.ts`, pass `SupplyStateByOsidReport` (or `last_supply_state_by_osid` flat lookup) into the target-scoring closure. Add a deterministic multiplier (e.g. `1.10` against `critical`, `1.05` against `strained`, `1.00` against `adequate`) and bound it inside the existing scoring weights so the supply factor does not dominate other terms.
4. Do not introduce new state. Read only from `context.report.supply_resolution_osid` or the flat snapshot already in `state.political.last_supply_state_by_osid`.
5. Make tests green. Then run `npx.cmd vitest run tests/bot_corps_directives.test.ts tests/operation_opportunities*.test.ts` to verify regression baseline.

**Acceptance:**
- Bot target scoring reads enemy supply state at target OSID.
- Bot defense scoring reads own supply state at home OSID.
- Default (`adequate / adequate`) is byte-identical to today's behavior because the multiplier is `1.00`.
- Calibration impact bound: 40w hash WILL shift because some targets newly weight higher when enemy is critical. Expected anchor effect: small (≤2 anchors). STOP per §Stop Gates if larger.

## Task 4: Phase 3 Minimum Supply UX Contract Truth

**Files:**
- Inspect / modify: `src/ui/map/components/SupplyPanel.tsx`
- Inspect / modify: `src/ui/map/data/GameStateAdapter.ts` (corridor + isolation count exposure)
- Inspect: `src/desktop/electron-main.cjs` (does an IPC handler exist for `query-supply-paths` or corridor summary?)
- Create: `tests/supply_panel_contract.test.ts`
- Create: `tests/desktop_supply_summary_ipc_contract.test.ts` (only if a new IPC channel is needed; otherwise skip)

**Steps:**
1. Add a contract test asserting that the adapter exposes for each faction: `adequate_count`, `strained_count`, `critical_count`, `corridor_open_count`, `corridor_brittle_count`, `corridor_cut_count`. All counts deterministic, sorted by faction id.
2. If `SupplyPanel.tsx` currently reads any field that is not in this contract (or reads raw `by_osid` lists for display rather than counts), refactor it to consume the summary only. No per-settlement micromanagement (spec §7).
3. If an IPC channel is needed, it must be a read-only summary query — never a write that mutates supply state. Skip creating one if the adapter already exposes the data direct.
4. Tooltip / copy on `SupplyPanel.tsx` must reflect Adequate/Strained/Critical wording from Systems Manual §14, not invented language. Wording owner is `/narrative-designer` if any prose change exceeds 20 words.

**Acceptance:**
- `SupplyPanel.tsx` builds against the adapter contract test.
- `npm.cmd run desktop:map:build` produces `dist/tactical-map/` cleanly.
- No new IPC channel is introduced unless test 2 proves the adapter cannot serve the data.

## Task 5: Phase 2 Cascade Deterministic Order Test

**Files:**
- Modify: `src/state/supply_state_derivation.ts` (the existing `deriveSupplyStateByOsid` / `deriveCorridorsOsid` propagation path; ensure dependent-region updates iterate by faction id then OSID id under `strictCompare`)
- Create: `tests/supply_cascade_deterministic_order.test.ts`
- Inspect: `docs/10_canon/Engine_Invariants_v0_5_0.md` §4 (cascade language already says "junction loss alone must not collapse a corridor unless dependency thresholds are crossed" — verify code matches this)

**Steps:**
1. Add a deterministic test: a small synthetic graph where one bridge edge is flipped between two factions. Run the derivation twice with shuffled adjacency-insertion order. Assert the resulting `by_osid` list is byte-identical.
2. If the test is already green (engine is already deterministic on this case), keep the test as a regression guard and proceed.
3. If the test is red, the fix is local: sort the propagation queue by `strictCompare(osid)` and the outer faction loop by `strictCompare(faction_id)`. Do not change cascade *threshold* semantics in this plan — that is a canon recommendation flagged in Task 1, not a code change.
4. Flag for manual canon review: append the Engine Invariants §4 wording recommendation from `SUPPLY_DESIGN.md` §5 (last paragraph) into a new entry under `docs/40_reports/CANON_REVIEW_QUEUE.md` (create the file if it does not exist). Do not auto-edit `docs/10_canon/`.

**Acceptance:**
- Cascade ordering test green.
- Canon review queue entry filed for §5 wording recommendation.
- No threshold semantics changed in code.

## Task 6: Sensitive-History Stop Gate Smoke

**Files:**
- Inspect: `tools/diagnostics/sensitive_history_status.cjs`
- Modify or create: `tests/supply_sensitive_history_smoke.test.ts`

**Steps:**
1. Run `npm.cmd run sim:scenario:run:40w` once after Tasks 2 + 3 land.
2. Diff supply state at canonical windows for Srebrenica, Žepa, Goražde, Bihać against the prior baseline. Specifically:
   - Srebrenica supply collapse (canonical: progressive critical through 1993–1995).
   - Bihać pocket starvation (canonical: critical through long stretches, especially 1994).
   - Goražde supply (canonical: critical / strained under siege).
   - Žepa (canonical: critical through 1993–1995).
3. If any window outcome flips (e.g. Bihać becomes adequate in a window it was critical, or Srebrenica becomes adequate post-isolation), STOP and escalate to the user before commit. Do not auto-tune.
4. Document numeric supply state at these OSIDs at week 10, 20, 30, 40 in the implemented report.

**Acceptance:**
- Smoke test exists and runs against the 40w artifact.
- Sensitive-history windows are unchanged or change is documented and signed off.

## Verification

Run in order; abort on first failure:

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/supply_design_completion_diagnostic.test.ts tests/supply_pressure_vs_condition_reconciliation.test.ts tests/bot_supply_awareness_target_scoring.test.ts tests/supply_panel_contract.test.ts tests/supply_cascade_deterministic_order.test.ts tests/supply_sensitive_history_smoke.test.ts`
- `npm.cmd run test:vitest`
- `npm.cmd run desktop:map:build`
- `npm.cmd run sim:scenario:run:40w`
- `node tools\diagnostics\supply_design_completion.cjs <run-dir>`

PowerShell shell semantics: use `;` not `&&` to chain commands.

## Docs and Ledger

Update on green:
- `docs/40_reports/CONSOLIDATED_BACKLOG.md` (mark §9 and §11 supply rows resolved; cite this plan and sibling plans)
- `docs/40_reports/implemented/YYYYMMDD_SUPPLY_DESIGN_COMPLETION.md` (per-task evidence, hash before/after each commit, anchor diff)
- `docs/40_reports/CANON_REVIEW_QUEUE.md` (created if absent; §5 wording recommendation for Engine Invariants §4)
- `docs/PROJECT_LEDGER.md` (one entry per behavior commit — Task 2 reconciliation, Task 3 bot supply awareness, Task 4 UX contract)
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` (thematic note: "Dual-source supply state — cumulative `war_supply_pressure` vs live `war_supply_condition` — readers must go through `getFactionLiveSupplyPressure`")

Do not auto-edit `docs/10_canon/FORAWWV.md`. Do not auto-edit `docs/10_canon/Engine_Invariants_v0_5_0.md` or `Systems_Manual_v0_5_0.md` — cascade and per-OSID wording changes are queued for manual canon review only.

## Determinism Statement

Every change in this plan is read-from-existing-state or derive-and-sort. No new RNG. No new timestamps. No new state writes outside Task 2's clarifying type-annotation. Sorted iteration via `strictCompare` is preserved everywhere; Task 5 explicitly tests deterministic propagation order. Default behavior on Tasks 3, 4 (with `adequate` supply baseline and no priority overrides) MUST keep 40w scenario hash byte-identical to today's baseline; any deviation is documented and gated.

## Stop Gates and Closeout

- STOP after Task 1 if the spec audit diagnostic surfaces a DRIFTED row in a system this plan was not chartered to touch — file a backlog row instead of expanding scope.
- STOP after Task 2 if area-weighted control shifts by more than `0.5` percentage points, OR any of the 27 anchor outcomes flip, OR benchmark count drops below 6/6 in 40w. Escalate to user with numeric diff.
- STOP after Task 3 with the same calibration thresholds. The supply-aware bot scoring is the highest-risk change in this plan; expect a small anchor shift but no flips.
- STOP after Task 6 if Srebrenica, Žepa, Goražde, or Bihać supply windows flip. Escalate before commit.
- STOP if any code path begins to read `state.military.logistics_priority` (sibling plan owns it) or `EMBARGO_SUPPLY_CAP.RBiH` (other sibling plan owns it). Re-scope.
- STOP if cascade derivation performance regresses against the currently documented supply-osid phase budget (562 ms / turn unless superseded by a newer perf report) by more than 10%. The Tarjan / region-cache retry is owned by `docs/40_reports/audits/20260504_SUPPLY_OSID_RETRY_RECOMMENDATION.md`, not this plan.
- Stage only: failing/passing tests for this plan, the diagnostic and its test fixture, the targeted modifications listed per task, the implemented report, the backlog row updates, the canon review queue entry, ledger entries. Do not bundle any unrelated work into the commit. One task = one commit = one hash check.

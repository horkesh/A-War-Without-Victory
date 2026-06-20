# Supply / Logistics Comprehension Outside the GUI Branch (Read-Model + Docs Plan)

**Date:** 2026-05-29
**Status:** Design proposal (planning only — NO source code, do NOT commit)
**Lane:** P2 — Supply/logistics comprehension outside GUI branch (`docs/plans/COMMAND_BOARD.md:41`)
**Owner:** UI/UX developer + product-manager (UI/product read-model lane)
**Reviewers:** gameplay-programmer, QA engineer, determinism-auditor
**Expands:** `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 2 (lines 70-86) — does NOT contradict it
**Authority (hierarchy order):**
- `CLAUDE.md` — Determinism SACRED; GameState single source of truth; no `Math.random`/`Date.now`/timestamps; sorted iteration via `strictCompare`; FORAWWV.md edits require Pyrrhic-panel sign-off.
- COMMAND_BOARD row constraint: **"read-model/docs clarity only"**; **STOP GATE = "New command authority, new sim rule, or GUI branch collision."**
- Source-phase allowed work (`2026-05-24-...:76`): "read-model clarity, docs/tooltips/diagnostics, and existing-state explanation."
- Depth exemplar: `docs/plans/2026-05-29-b7-sarajevo-siege-continuous-condition-plan.md` (player-surface read-model section §6).

> **For Claude executing this:** REQUIRED SUB-SKILL `superpowers:executing-plans`, task-by-task. This is a **COMPREHENSION / read-model lane** — make existing supply truth legible. It changes **NO supply mechanic, NO sim rule, NO command authority**. Every deliverable is a pure deterministic projection of already-public, already-player-scoped state, or prose docs. Flag-OFF-equivalent: the engine is untouched, so 40w/188w hashes are **byte-identical** by construction.

---

## 1. Objective + Why

**Objective.** Make the supply/logistics state the engine already derives **legible to the player outside the active GUI branch** — by (a) extending the existing player-scoped supply read-model so it explains *condition, trend, and the dual-truth distinction* (not only a critical/warning alarm), and (b) writing a plain-language player + engineering docs explainer of how to read supply. No new simulation behavior.

**Why now.**
1. **The truth exists but is barely legible.** Supply is fully derived per-turn (`supply_state_by_osid`, `supply_corridors_osid`, `political.war_supply_condition`, cumulative `political.war_supply_pressure`, `factionReserves`), but the only player-facing *explanation* outside the GUI shell is a single Decision-Room card that fires **only at `critical`/`warning`** (`presidentialDecisionRoom.ts:482-505`) and the GUI-owned `SupplyPanel.tsx`. When supply is merely degrading (not yet critical) the player has no narrated read on *which way it is trending* or *why*.
2. **Dual-truth confusion is a documented footgun.** Napkin (`.claude/napkin.md:55`): `war_supply_pressure` is **cumulative legacy** (high = bad), live current truth is `political.war_supply_condition`; consumers must go through `getFactionLiveSupplyPressure(...)`. `SupplyPanel.tsx:55-65` already has bespoke fallback logic blending the two. That blend is GUI-owned; the *comprehension* concept (which number means what) belongs in a read-model + docs, surfaced identically wherever supply is narrated.
3. **GUI branch owns the shell, not comprehension.** The Phase-2 source plan and COMMAND_BOARD both forbid GUI-shell collision. The legibility win is achievable purely in `src/ui/map/data/` read-models (the non-shell projection layer the Decision Room and warroom already consume) plus docs — no `.tsx` shell edits.

**Non-objective (stated up front so it cannot drift):** No new supply mechanic, no new IPC write/command, no enemy-supply exposure, no new sim field, no calibration tune, no GUI shell (`.tsx`) edit, no change to `SupplyPanel.tsx`.

---

## 2. Scope & Non-Scope

### In scope (read-model + docs ONLY)
- **Extend the existing player-scoped read-model** `src/ui/map/data/playerSupplyVisibility.ts` (the singular UI-1 owner, Batch 40) with **comprehension fields**: a banded condition score (from `warPhaseSupplyCondition`), a deterministic **trend** (improving/stable/worsening) computed from `turnSummaries[].supply_snapshot`, and a plain-language **dual-truth note** (live condition vs cumulative pressure). Same module, same owner — extension, not a new owner.
- **A new pure sibling projection** `src/ui/map/data/supplyComprehensionExplainer.ts` ONLY IF the extended view exceeds the single-responsibility size of `playerSupplyVisibility.ts` (the builder is already ~160 lines). Preference: extend in place; split only if the trend logic warrants it. Either way the explainer consumes the existing view, never re-derives from raw state.
- **Player-facing docs explainer**: a "How to read supply" section in the Player Turn Guide (`docs/plans/2026-05-17-player-turn-guide-plan.md` deliverable, or its shipped guide doc if present) — banded vocabulary (Adequate / Strained / Critical; Open / Brittle / Cut), what trend means, why "pressure going up = bad" but "condition going up = good".
- **Engineering docs note** in `docs/PROJECT_LEDGER_KNOWLEDGE.md`: the dual-source supply-truth rule (mirrors the napkin line), pointing future read-model authors at `getFactionLiveSupplyPressure` / `war_supply_condition` and at this comprehension view as the single legibility surface.
- **Tests**: vitest for the extended read-model (banding, trend determinism, no-hidden-truth, old-save/missing-data fallbacks) + typecheck.

### Non-scope (explicit — these are the STOP gates)
- **NO new sim rule / supply mechanic.** No edit to `src/sim/combat/supply_*`, `src/state/supply_*`, `enclave_resilience.ts`, `combat_math.ts getSupplyMult`, or any derivation. (STOP GATE: "new sim rule".)
- **NO new command authority.** No IPC channel, no write path, no player action that mutates supply. Read-only projections only. (STOP GATE: "new command authority".)
- **NO GUI shell edit.** No change to `SupplyPanel.tsx` or any `.tsx`. The GUI branch owns the shell while active. (STOP GATE: "GUI branch collision".)
- **NO enemy supply truth.** Only the player faction's own already-scoped slices (`supplyStateByOsid` is adapter-scoped to player via `includeOsid`, `GameStateAdapter.ts:287-291`; `supplySummaryByFaction[playerFaction]` only).
- **NO new GameState field, NO save-migration.** Trend is computed at read time from `turnSummaries` already present in `LoadedGameState`. No persisted state added.
- **NO calibration / hash-affecting change.** Engine untouched → 40w/188w byte-identical by construction; no baseline refresh.
- **NO new owner duplication.** Supply read-model owner is `playerSupplyVisibility.ts`; warroom docket owner is `warroomPriorityDocket.ts`; decision-room owner is `presidentialDecisionRoom.ts`. This lane extends the supply owner and *consumes* it from the others — it does not fork a second supply projection.
- **NO ungated `FORAWWV.md` edit.** Any canon-wording desire is routed through Pyrrhic-panel sign-off.

---

## 3. Current-State Findings (file:line)

**Where supply truth lives (engine / state):**
- Live current supply condition per faction: `political.war_supply_condition` (the truth); cumulative legacy pressure: `political.war_supply_pressure` (high = bad). Single canonical live reader: `getFactionLiveSupplyPressure(...)` / `getFactionLiveSupplyCondition(...)` in `src/sim/combat/supply_condition.ts`. Napkin rule: `.claude/napkin.md:55`.
- Per-OSID supply state + corridors: `state.supply_state_by_osid` and `state.supply_corridors_osid` (consumed by the adapter below).
- Per-turn history for trend: `turn_summary.ts:152` `supply_snapshot?` (per-faction reserve at turn end) and `:139` `supply_transitions` (per-OSID state changes). Available on `LoadedGameState.turnSummaries` (`types.ts:1032`).

**Adapter projections (already player-scoped — the legibility inputs):**
- `GameStateAdapter.ts:280-315` `deriveSupplyStateByOsidView()` — **player-faction-scoped** via `includeOsid` (only player-controlled OSIDs; `:287-291`), sorted by OSID `strictCompare` (`:298`). → `LoadedGameState.supplyStateByOsid` (`types.ts:914`).
- `GameStateAdapter.ts:328-364` `deriveSupplySummaryByFaction()` — per-faction adequate/strained/critical + corridor open/brittle/cut counts, sorted (`:332`,`:362`). → `LoadedGameState.supplySummaryByFaction` (`types.ts:916`).
- `GameStateAdapter.ts:1961` — `warPhaseSupplyPressure` / `warPhaseSupplyCondition` passed through **`scopeToPlayerFaction(...)`** (player-scoped). → `types.ts:937,939`.

**Existing read-model owner (the thing to extend, NOT duplicate):**
- `src/ui/map/data/playerSupplyVisibility.ts` — `buildPlayerSupplyVisibility(state)` (`:111`). Player-scoped, deterministic (`strictCompare` `:41`; formations iterated id-order `:48`). Emits counts, corridor-at-risk, isolated-formation count, `severity` (`critical|warning|info|unknown`), `headline`, `evidence`. **Reads only player-faction rows** (`:119` `summary[playerFaction]`; `:120` already-scoped `supplyStateByOsid`). Tested: `tests/ui_player_supply_visibility.test.ts`.

**Where supply is/isn't surfaced to the player (the comprehension gap):**
- **Surfaced:** Decision Room card via `addSupplyVisibilityCard()` (`presidentialDecisionRoom.ts:482-505`) — but it **early-returns unless `severity` is `critical` or `warning`** (`:485`). When supply is degrading-but-not-critical, the player sees nothing. The card also gives a headline + evidence counts but **no trend** and **no dual-truth explanation**.
- **Surfaced (GUI shell, OFF-LIMITS):** `SupplyPanel.tsx` — reserve bars + corridor totals, with bespoke pressure-vs-condition fallback (`:55-65`). GUI-branch-owned; this lane must not touch it.
- **NOT surfaced anywhere as comprehension:** the trend over time (snapshots exist but are unused for a player read); the live-vs-cumulative distinction in plain language; an always-on (info-level) read of supply legibility outside the alarm threshold.
- **Warroom docket** (`warroomPriorityDocket.ts:64`) has **no supply entry** today (grep: no supply matches) — a candidate read-only consumer for the extended view, IF it does not collide with docket ownership (it owns docket *assembly*, not supply derivation — consuming the existing view is consistent with the Decision-Room precedent).

**Determinism baseline:** all existing supply projections are pure, `strictCompare`-sorted, no RNG/timestamps. The extension must preserve this exactly.

---

## 4. Design — The Comprehension Read-Model

A **single deterministic projection** that turns already-public, already-player-scoped supply slices into a narrated, banded, trended view. Pure function of `LoadedGameState`; no sim recompute; no enemy truth.

### 4.1 Extended view shape (extension of `PlayerSupplyVisibilityView`)
Add comprehension fields to the existing view (or a sibling `SupplyComprehensionView` composed from it):

```ts
// additive — existing fields unchanged
conditionScore?: number;           // from warPhaseSupplyCondition[playerFaction] (live, 0..100; higher = better)
conditionBand: 'sustained' | 'strained' | 'failing' | 'unknown';  // banded live condition
trend: 'improving' | 'stable' | 'worsening' | 'unknown';          // from supply_snapshot deltas
trendEvidence: string;             // e.g. "reserves -6 over last 3 turns" — plain language, player faction only
dualTruthNote: string;             // fixed explainer string: live condition vs cumulative pressure
```

- **`conditionBand`** from `warPhaseSupplyCondition[playerFaction]` (live truth): banded by fixed thresholds (e.g. `>=70 sustained`, `>=40 strained`, else `failing`). Thresholds are *display bands*, not sim constants — documented in the read-model, not pulled from engine tuning files (no sim coupling).
- **`trend`** computed from `turnSummaries` `supply_snapshot[playerFaction]`: compare the most recent snapshot to the snapshot N turns back (N fixed, e.g. 3), sign of the delta → improving/stable/worsening. Deterministic: snapshots are turn-ordered already; stable band uses a fixed epsilon. If fewer than 2 snapshots, `unknown`.
- **`dualTruthNote`** is a static, localized explainer string (no numbers leaked beyond player's own): "Condition (higher is better) reflects current supply; pressure (higher is worse) is cumulative strain." Sourced from i18n, not invented per-call.
- **No new severity semantics.** `severity` stays as today; comprehension fields are additive so the Decision-Room card behavior is unchanged unless we deliberately widen it (see 4.3).

### 4.2 Player-safety / no-hidden-truth
- Reads **only** `state.player_faction`'s own rows: `supplySummaryByFaction[playerFaction]`, the already-player-scoped `supplyStateByOsid`, `warPhaseSupplyCondition[playerFaction]` (already `scopeToPlayerFaction`-filtered at the adapter), and `supply_snapshot[playerFaction]` from turn summaries.
- Returns `null` for non-player factions (mirrors existing `:114-117`).
- No corridor/OSID detail for enemy factions ever enters the view.

### 4.3 Consumption (read-only, no new owner)
- **Decision Room (existing consumer):** optionally enrich the existing supply card's `evidence` with `trend` + `dualTruthNote` (still gated to critical/warning — does NOT change when it fires, only what it explains). This is the minimal, lowest-collision-risk surface.
- **Warroom docket (optional, gated):** add a read-only supply line consuming the extended view at info+ level, IF and only if it does not duplicate the supply owner (it consumes, not re-derives) and does not collide with active GUI work. Defer to a later commit; not required for DoD.
- No `.tsx` shell change. The Decision-Room and warroom data builders are `src/ui/map/data/` projection modules, not GUI shell.

### 4.4 Determinism
- Pure over inputs; `strictCompare` for any ordering; integer/sign comparisons for trend; fixed display thresholds; no `Math.random`/`Date.now`/timestamps; no sim recompute. Same input state → identical view.

---

## 5. Step-by-Step Implementation (numbered discrete commits)

Each task = one commit. Engine untouched throughout → 40w/188w byte-identical by construction (no hash run required to prove a sim change; run smoke triad to prove no regression).

**Task 1 — Tests-first: extended read-model contract.**
- Files: `tests/ui_player_supply_visibility.test.ts` (extend) or new `tests/ui_supply_comprehension.test.ts`.
- Add red tests: (a) `conditionBand` derives from `warPhaseSupplyCondition` thresholds; (b) `trend` = worsening/improving/stable from crafted `turnSummaries.supply_snapshot` sequences; (c) trend `unknown` with <2 snapshots; (d) determinism — same state twice → identical view; (e) no-hidden-truth — enemy faction rows present in state are never reflected; (f) non-player faction → `null`.
- Commit: failing tests + intent.

**Task 2 — Extend the read-model builder.**
- Files: `src/ui/map/data/playerSupplyVisibility.ts` (extend `PlayerSupplyVisibilityView` + `buildPlayerSupplyVisibility`). Split to `src/ui/map/data/supplyComprehensionExplainer.ts` only if the trend helper pushes the module past single-responsibility; if split, the new module consumes the existing view, not raw state.
- Implement `conditionBand`, `trend`, `trendEvidence`, `dualTruthNote` per §4.1. Pure, `strictCompare`-sorted, no new state.
- Make Task-1 tests green.

**Task 3 — i18n strings for the dual-truth note + band/trend labels.**
- Files: i18n locale files under `src/ui/map/i18n/` (the `t(...)` source used in `playerSupplyVisibility`/decision-room). Add keys for `dualTruthNote`, band labels, trend labels. No prose >20 words without narrative-designer sign-off (mirror source-plan §122 wording rule).
- Verify keys resolve in test.

**Task 4 — Enrich Decision-Room card explanation (read-only, no fire-condition change).**
- Files: `src/ui/map/data/presidentialDecisionRoom.ts` `addSupplyVisibilityCard` (`:482-505`) — append `trend` + `dualTruthNote` to `evidence`/`explanation`. **Do NOT change the `severity` early-return (`:485`)** in this task (changing when it fires is a separate, reviewed decision — see Task 6).
- Extend `tests/ui_decision_room_supply_visibility.test.ts` to assert enriched evidence, unchanged fire condition.

**Task 5 — Docs explainer (player + engineering).**
- Player: add a "How to read supply" section to the Player Turn Guide deliverable (`docs/plans/2026-05-17-player-turn-guide-plan.md` target doc) — banded vocabulary, trend meaning, condition-vs-pressure direction. Docs-only.
- Engineering: append `docs/PROJECT_LEDGER_KNOWLEDGE.md` thematic note (dual-source supply truth; this view is the legibility surface; route current-supply reads through `getFactionLiveSupplyPressure`/`war_supply_condition`). Mirror the napkin line; do not contradict it.
- `docs/PROJECT_LEDGER.md`: one entry for the read-model behavior change (Task 2/4).

**Task 6 — (OPTIONAL, deferred) Always-on info-level surface + warroom docket line.**
- Only after Tasks 1-5 land and a UI/product decision confirms widening the Decision-Room fire condition (or adding a warroom info line) does NOT collide with active GUI work. This is a follow-up commit, gated, not part of core DoD. STOP and confirm non-collision before starting.

---

## 6. Determinism & Canon

- **UI-only, no sim recompute.** All work is in `src/ui/map/data/` projection modules + docs. No component (`.tsx`) recompute; no `src/sim`/`src/state` edit. The read-model is a pure function of `LoadedGameState`.
- **Determinism sacred** (`CLAUDE.md`): no `Math.random`/`Date.now`/timestamps; `strictCompare` for ordering; fixed display thresholds; sign-based trend. Same state → identical view (tested).
- **GameState single source of truth:** the view reads, never writes. No new persisted field, no migration.
- **Canon:** no canon doc edited; `FORAWWV.md` untouched. The condition-vs-pressure semantics are *described*, not *changed*. Banding thresholds are display-layer constants documented in the read-model, explicitly NOT engine tuning constants (no coupling to `supply_*` tuning files).

---

## 7. Anti-Collision Strategy

- **Avoid the active GUI branch:** zero `.tsx` edits. `SupplyPanel.tsx` is untouched. All surfaces are `src/ui/map/data/` projection builders (Decision Room, warroom docket) — the same layer Batch-40 used for `playerSupplyVisibility.ts`. Before Task 2, run `git status --short --branch` and `git log --oneline -10 -- src/ui/map/components/SupplyPanel.tsx src/ui/map/data/playerSupplyVisibility.ts` to confirm no concurrent edits; if `SupplyPanel.tsx` or `playerSupplyVisibility.ts` shows uncommitted/recent GUI-branch churn, STOP and prepare a packet instead (source-plan branch-collision rule, `:40-42`).
- **Singular read-model ownership:** extend `playerSupplyVisibility.ts` (the supply owner); do NOT create a second supply projection. Decision Room (`presidentialDecisionRoom.ts`) and warroom (`warroomPriorityDocket.ts`) remain *consumers* of the one supply view, consistent with `addSupplyVisibilityCard` precedent. The optional sibling `supplyComprehensionExplainer.ts` (if split) composes the owner's view — it is a formatter, not a second deriver.
- **No command/IPC surface:** read-only throughout; no new IPC channel (source-plan §86 STOP: "new sim authority").

---

## 8. Test Plan

- **New/extended vitest (tests-first):**
  - `tests/ui_player_supply_visibility.test.ts` (or `tests/ui_supply_comprehension.test.ts`) — band derivation, trend (improving/stable/worsening/unknown), determinism (twice-identical), no-hidden-truth, non-player → null, missing-data fallbacks (no snapshots, no summary).
  - `tests/ui_decision_room_supply_visibility.test.ts` — enriched evidence; fire condition unchanged.
  - i18n key-resolution assertion for the new strings.
- **Adapter nested-path guard:** a test asserting the view tolerates `undefined` `supplySummaryByFaction` / `warPhaseSupplyCondition` / `turnSummaries` (the known adapter wrong-nested-path-returns-undefined bug class) → `unknown` bands, no throw (mirror existing `hasSupplyData` guard `:121-123`).
- **Typecheck:** `npx.cmd tsc --noEmit`.
- **Full suite + smoke triad:** `npm.cmd run test:vitest`; `npm.cmd run desktop:map:build` (proves the data-layer change compiles into the map bundle even though no `.tsx` changed).
- **Hash (regression-only, not behavior-proof):** engine untouched, so no scenario hash run is required to prove a sim change; an optional `npm.cmd run sim:scenario:run:40w` byte-identical check is the belt-and-suspenders proof that nothing leaked into sim. PowerShell: chain with `;` not `&&`.

## 9. Verification Gates

Run in order; abort on first failure:
1. `npx.cmd vitest run tests/ui_player_supply_visibility.test.ts tests/ui_decision_room_supply_visibility.test.ts` (focused, `--reporter=dot`).
2. `npm.cmd run typecheck`.
3. `npm.cmd run test:vitest` (full suite — no cross-test regression).
4. `npm.cmd run desktop:map:build` (clean `dist/tactical-map/`).
5. `git diff --check`.
6. (Optional belt) `npm.cmd run sim:scenario:run:40w` → hash byte-identical to current baseline (proves zero sim leak).

## 10. Risks / Rollback / Dependencies / Owner / DoD

**Risks**
1. **GUI branch collision (highest).** Mitigation: zero `.tsx` edits; pre-Task-2 `git status`/`git log` on `SupplyPanel.tsx` + `playerSupplyVisibility.ts`; STOP → packet if churn detected (§7).
2. **Hidden enemy supply truth leak.** Mitigation: read only player-faction-scoped slices (already adapter-scoped); explicit no-hidden-truth test (§8); non-player → null.
3. **Adapter nested-path bug** (wrong path silently `undefined`). Mitigation: guard test for all three undefined inputs; bands degrade to `unknown`, never throw; reuse the existing `hasSupplyData` pattern.
4. **Scope creep into a sim/command change.** Mitigation: §2 non-scope + COMMAND_BOARD STOP gates; any urge to widen the Decision-Room fire condition or add an action is deferred to gated Task 6 with confirm.
5. **Owner duplication.** Mitigation: extend the single supply owner; consumers consume, never re-derive (§7).
6. **Calibration drift.** Mitigation: engine untouched → byte-identical by construction; optional 40w confirm.

**Rollback:** every task is one commit, independently revertible; no persisted state or migration, so revert is a clean code/docs back-out with no save-shape impact and no baseline refresh.

**Dependencies:** existing adapter projections (`supplyStateByOsid`, `supplySummaryByFaction`, `warPhaseSupplyCondition`, `turnSummaries` — all present); existing read-model `playerSupplyVisibility.ts` (Batch 40); i18n `t(...)` surface; Player Turn Guide doc target. No engine dependency.

**Owner:** UI/UX developer (read-model + surface) + product-manager (docs/comprehension). Reviewers: gameplay-programmer (confirm no sim coupling), QA engineer (test coverage), determinism-auditor (purity).

**Definition of Done**
- `playerSupplyVisibility.ts` extended with `conditionBand` + `trend` + `dualTruthNote`, pure and deterministic; no new owner forked.
- Decision-Room card explanation enriched (trend + dual-truth) with **unchanged fire condition**.
- i18n strings added; docs explainer in Player Turn Guide + `PROJECT_LEDGER_KNOWLEDGE.md` dual-truth note; `PROJECT_LEDGER.md` entry.
- All new/extended tests green; no-hidden-truth + adapter-undefined guards green; typecheck + full suite + `desktop:map:build` green; `git diff --check` clean.
- Zero `.tsx` edits; zero `src/sim`/`src/state` edits; zero new IPC/command; (optional) 40w hash byte-identical.
- COMMAND_BOARD P2 supply row + this plan updated on closeout; Task 6 (always-on/warroom) explicitly deferred and gated.

---

## Appendix A — Files (read/touch map)
- Extend: `src/ui/map/data/playerSupplyVisibility.ts:25,111` (view shape + builder) ; optional sibling `src/ui/map/data/supplyComprehensionExplainer.ts` (formatter only).
- Enrich (read-only): `src/ui/map/data/presidentialDecisionRoom.ts:482-505` (card evidence; fire condition unchanged).
- i18n: `src/ui/map/i18n/` locale files (new keys).
- Tests: `tests/ui_player_supply_visibility.test.ts`, `tests/ui_decision_room_supply_visibility.test.ts`, optional `tests/ui_supply_comprehension.test.ts`.
- Docs: Player Turn Guide target (`docs/plans/2026-05-17-player-turn-guide-plan.md`) ; `docs/PROJECT_LEDGER_KNOWLEDGE.md` ; `docs/PROJECT_LEDGER.md` ; `docs/plans/COMMAND_BOARD.md:41`.
- Read-only inputs (DO NOT edit): `src/ui/map/data/GameStateAdapter.ts:280-364,1961` ; `src/ui/map/data/types.ts:914,916,937,939,1032` ; `src/state/turn_summary.ts:139,152` ; `src/sim/combat/supply_condition.ts` (`getFactionLiveSupplyPressure`).
- OFF-LIMITS (GUI branch): `src/ui/map/components/SupplyPanel.tsx`.

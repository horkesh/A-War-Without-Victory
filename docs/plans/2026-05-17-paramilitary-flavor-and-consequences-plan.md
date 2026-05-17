# Paramilitary Flavor and Consequences Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add consequence scaling, batch-review UI wiring, and cited named-unit flavor on top of the shipped paramilitary sweep system without turning atrocity into a player-optimizable lever.

**Architecture:** Three sequential phases on the existing paramilitary sweep pipeline. Phase 1 wires severity bands from `paramilitary_sweep.ts` through the Cost Ledger into the capital writer (hash-changing — explicit user sign-off required). Phase 2 wires the already-mounted `ParamilitaryReviewModal` to the player-decision manifest and Presidential Inbox (renderer-only, hash byte-stable). Phase 3 adds a deterministic named-unit catalog with mandatory static name-pool exclusion test and moves `PARAMILITARY_FADE_WEEK` from 20 to 28. Every phase passes `SENSITIVE_HISTORY_DESIGN_GATE.md` §3 UI rules, §6 sign-off, and §1 data-not-comment exclusion. "Atrocity is a consequence, not a lever."

**Tech Stack:** TypeScript simulation core, React renderer (`ParamilitaryReviewModal`), Vitest, deterministic OOB data files.

---

## Scope

This is a follow-up to the shipped paramilitary sweep system (`src/sim/combat/paramilitary_sweep.ts`) and the Lane H3 historian audit (`docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md`).

In scope:
- Severity-banded consequences (1–3 / 4–9 / 10+) on capital deltas with a flat −10 international-standing cliff at the Severe (10+) threshold.
- Wiring the existing `ParamilitaryReviewModal` (mounted at `App.tsx:962`, action routed at `App.tsx:816`) to the player-decision manifest, `GameStateAdapter` projection, and Presidential Inbox emission.
- Deterministic named-unit catalog seeded by `(faction, mode, spawn_index)`, with five cited units (Patriotska Liga / Green Berets, HOS, Convicts' Battalion, Arkan's Tigers, White Eagles).
- `PARAMILITARY_FADE_WEEK` 20 → 28 (midpoint of BB1 p.166–168's 26–32 ARBiH-absorption window).

Out of scope (per task brief):
- `cost_ledger.ts` round-trip refactor.
- Any new top-level `GameState` keys.
- The broader cost-ledger annotation system rework.
- Scorpions (Škorpioni) and Yellow Wasps (Žute Ose) named units — blocked behind a `/historian` follow-up task; not landed in Phase 3.
- Any new player-facing surface beyond the already-shipped `paramilitary_policy` field (per `SENSITIVE_HISTORY_DESIGN_GATE.md` §3).
- Any rounded/euphemized civilian-cost numbers in UI (per §3 UI rule).

## Task 1 — Phase 1: Consequence Scaling (Severity Bands)

**Files:**
- Modify: `src/sim/combat/paramilitary_sweep.ts`
- Modify: `src/sim/endgame/cost_ledger.ts`
- Modify: `src/sim/negotiation/compute_capital.ts`
- Test: `tests/paramilitary_severity_bands.test.ts` (new)
- Test: extend `tests/cost_ledger_paramilitary_annotations.test.ts` if present, otherwise add `tests/cost_ledger_war_crimes_findings.test.ts`.

**Steps:**
1. Write a failing test that asserts: with `paramilitary_deployment_count` per turn of 1 → band `minor`, 4 → band `mid`, 10 → band `severe`, plus exact capital deltas.
2. In `paramilitary_sweep.ts`, after sweep resolution, emit a structured `cost_war_crimes_findings_<faction>` annotation tagged with the band (`minor` | `mid` | `severe`) and the raw deployment count. No new top-level `GameState` key — write through the existing Cost Ledger annotation surface in `cost_ledger.ts`.
3. In `compute_capital.ts`, consume the band:
   - Minor band: per-deployment penalty (small).
   - Mid band: per-deployment penalty (larger).
   - Severe band: **flat −10 international-standing cliff** applied once at the 10+ threshold, on top of the per-deployment line (no rounding, no euphemism — see §3 UI rule).
4. Run `npx.cmd vitest run tests\paramilitary_severity_bands.test.ts tests\cost_ledger_war_crimes_findings.test.ts`.
5. Run `npx.cmd vitest run` (full suite) and `npm.cmd run typecheck`.
6. Hash will change. Run `npm.cmd run sim:scenario:run:40w` and report the new hash + 6/6 benchmark status + anchor count vs the active pre-change baseline captured from `MASTER_ROADMAP.md` / `CALIBRATION_MASTER.md`. The 2026-05-17 execution handoff grants implementation authority; only a sensitive-history outcome shift still pauses the lane.

**Acceptance:**
- Band classification is deterministic and pure on `paramilitary_deployment_count`.
- Severe-band cliff fires exactly once per turn per faction at the 10+ threshold.
- Capital writer reads bands from Cost Ledger annotations, not from raw deployment counts.
- 40w scenario hash recorded with diff vs the captured active baseline. No anchor regression beyond the band that the new cliff explains.
- §3 numbers in any ledger/UI text are integer civilian counts, not rounded percentages.

**Sensitive-history gate:** §6 row "Change to paramilitary policy surface" — `/game-designer` + `/ui-ux-developer` + user review before implementation. §3 #5 "no atrocity efficiency metric" — the cliff exists explicitly to prevent just-below-threshold optimization, not to enable above-threshold extraction.

## Task 2 — Phase 2: Batch Review UI Wiring

**Files:**
- Modify: `src/state/player_decision_manifest.ts`
- Modify: `src/ui/map/data/GameStateAdapter.ts`
- Inspect: `src/ui/map/components/ParamilitaryReviewModal.tsx` (already mounted)
- Inspect: `src/ui/map/App.tsx` (current action routing and modal mount owner)
- Modify: Presidential Inbox card source (whichever feeds inbox cards — discover during Task 2 step 1).
- Test: `tests/paramilitary_review_decision_manifest.test.ts` (new)
- Test: `tests/game_state_adapter_estimated_civilian_risk.test.ts` (new)

**Steps:**
1. Discover the Presidential Inbox card emission path (likely in `src/state/inbox*` or under `src/ui/map/data/`). Record the canonical owner file in the implemented report.
2. Add a `player_decision_manifest.ts` entry for `paramilitary_review`, matching the action wiring at `App.tsx:816`.
3. Project `estimated_civilian_risk` through `GameStateAdapter.ts` as an **integer civilian count** (no rounding, no percentage, no euphemism — §3 UI rule). Source field must already exist on sweep state; if it does not, fail loudly rather than fabricate a projection.
4. Emit a Presidential Inbox card when paramilitary requests are pending and `paramilitary_policy === 'ask'`. The card must render the population, projected civilian casualties, war-crime-event increment, international-standing impact, and a historical-citation slot — exactly the §3 list, in that voice.
5. Run focused vitest suites and `npm.cmd run typecheck`.
6. Run `npm.cmd run desktop:map:build` to confirm renderer compiles.

**Acceptance:**
- `paramilitary_review` action survives a round-trip through the decision manifest.
- `estimated_civilian_risk` is sourced from sweep state, not invented in the adapter.
- Inbox card renders only when `paramilitary_policy === 'ask'` AND requests are pending.
- **Hash byte-stable** vs the captured active baseline — renderer-only changes. Confirm with `npm.cmd run sim:scenario:run:40w` after Phase 2.

**Sensitive-history gate:** §3 UI rules — no rounded numbers, no military-necessity framing, no euphemisms; the modal must not become a "level of brutality" slider or a "paramilitary doctrine" submenu. §6 row "Change to paramilitary policy surface" sign-off.

## Task 3 — Phase 3: Named Units + Fade Window

**Files:**
- Create: `data/source/oob/paramilitary_named_units.ts`
- Modify: `src/sim/combat/paramilitary_sweep.ts` (consume named-unit catalog by `(faction, mode, spawn_index)` key; bump `PARAMILITARY_FADE_WEEK` 20 → 28).
- Modify: `src/state/formation_constants.ts` if `PARAMILITARY_FADE_WEEK` lives there (one of the three grep hits).
- Test: `tests/paramilitary_named_units_catalog.test.ts` (new — determinism + cited-only)
- Test: `tests/paramilitary_name_pool_exclusion.test.ts` (new — **mandatory static exclusion test, Stupčanica precedent**)
- Test: `tests/paramilitary_fade_week.test.ts` (new — 28 not 20; ARBiH absorption window assertion)

**Steps:**
1. Create the named-unit catalog file with exactly five cited units:
   - **Patriotska Liga / Green Berets** (RBiH) — cite BB1 p.166–168.
   - **HOS** (HRHB-aligned, HSP-political) — cite BB1 p.170.
   - **Convicts' Battalion** (HVO Mostar, Naletilić "Tuta") — cite ICTY Naletilić IT-98-34.
   - **Arkan's Tigers** (Serbian Volunteer Guard) — cite BB1 p.173–174.
   - **White Eagles** (Beli Orlovi, Šešelj) — cite BB1 p.173.
   - Each entry: `{ faction, mode, name, citation, available_from?, available_to? }`. Deterministic lookup keyed on `(faction, mode, spawn_index)` — `spawn_index` is the per-faction-per-mode deterministic counter from sweep state. No `Math.random()`, no timestamps.
2. Write the **mandatory static name-pool exclusion test** (`paramilitary_name_pool_exclusion.test.ts`) per the §1 data-not-comment exclusion rule and the Stupčanica-95 precedent (commit `759a35cd`). The test must:
   - Load the canonical catalog.
   - Assert no name from `paramilitary_named_units.ts` appears in any bot generator pool (operation names, formation names, persona pools).
   - Fail loudly if a generator pool ever imports or aliases the catalog.
3. Add explicit `// SOURCE BLOCKED:` comments — and the matching `expect(...).not.toContain(...)` assertions — for `Scorpions (Škorpioni)` and `Yellow Wasps (Žute Ose, Vukovic brothers)`. Comment must point to the pending `/historian` follow-up task ID. **These two units do not ship in Phase 3.**
4. Bump `PARAMILITARY_FADE_WEEK` 20 → 28 (midpoint of BB1 p.166–168's 26–32 ARBiH-absorption window). Add a unit test asserting the constant equals 28 and a comment citing BB1 p.166–168.
5. Run focused tests, `npm.cmd run typecheck`, and `npm.cmd run sim:scenario:run:40w`.
6. **STOP for explicit user sign-off before commit** — fade-week bump alone changes the hash.

**Acceptance:**
- Catalog ships exactly 5 cited units; Scorpions and Yellow Wasps are explicitly blocked with `/historian` follow-up reference.
- Static name-pool exclusion test passes (Stupčanica precedent enforced).
- `PARAMILITARY_FADE_WEEK === 28`, cited.
- 40w scenario hash recorded with diff vs Phase 1 hash. Anchor + benchmark deltas reported.

**Sensitive-history gate:** §1 data-not-comment exclusion (mandatory static test). §3 #8 "no granular attribution of individual victims" — named units name **perpetrators only**, never victims. §6 row "Change to paramilitary policy surface" sign-off. §3 #5 "no atrocity efficiency metric" — named units add historical flavor, not mechanical bonus.

## Verification

Run after each phase:
- `npm.cmd run typecheck`
- `npx.cmd vitest run` (full suite — paramilitary touches multiple suites)
- `npm.cmd run sim:scenario:run:40w`
- For Phase 2 only: `npm.cmd run desktop:map:build`

Report after each phase:
- Hash (Phase 1: changes; Phase 2: byte-stable vs captured active baseline; Phase 3: changes).
- Anchors and benchmarks vs captured active baseline.
- Diff of `paramilitary_deployment_count` distribution and `war_crimes_events` per faction.

## Docs and Ledger

Update after each phase commit:
- `docs/40_reports/implemented/YYYYMMDD_PARAMILITARY_FLAVOR_AND_CONSEQUENCES_PHASE_<N>.md`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` for any thematic finding (e.g., Stupčanica-precedent reinforcement).

Determinism statement required per phase. Phase 2 must explicitly state "renderer-only, byte-stable" and prove it with the 40w hash. Phases 1 and 3 must explicitly state hash-changing and capture user sign-off in the report.

Never auto-edit `docs/10_canon/FORAWWV.md` — flag for manual review if any phase implies a canon update.

## Stop Gates And Closeout

- **Stop after Phase 1 only if sensitive-history anchors or named event outcomes shift unexpectedly** — capital deltas + cliff are authorized by the 2026-05-17 handoff, but outcome drift still requires explicit review.
- **Stop after Phase 2 if hash is not byte-stable** vs captured active baseline — renderer-only work must not move the simulation. If it does, revert and investigate before continuing.
- **Stop after Phase 3 only if sensitive-history anchors or named event outcomes shift unexpectedly** — fade-week move and named-unit catalog are authorized by the 2026-05-17 handoff, but outcome drift still requires explicit review.
- **Do not ship Scorpions or Yellow Wasps** in Phase 3. Open the `/historian` follow-up task and record it in the implemented report before any future expansion.
- Stage only the files owned by the active phase: simulation owner + Cost Ledger writer + capital writer for Phase 1; manifest + adapter + inbox source for Phase 2; OOB catalog + sweep consumer + fade-week constant for Phase 3. Plus focused tests, implemented report, roadmap, and ledger files per phase.
- Never bundle phases into a single commit. One change per calibration run.

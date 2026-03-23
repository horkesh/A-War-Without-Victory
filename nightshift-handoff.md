# Nightshift Handoff — 2026-03-24

## State of the Game
- **v0.6.1** — v0.6.x COMPLETE. 1410 tests, 116 suites. tsc clean.
- **92.0% area-weighted** (n1030, honest baseline, freshly frozen)
- **Calibration regression passes**: `npm run calibrate:40w` — ALL CHECKS PASSED
- 94 events (75 mechanical), 96-essay Codex (QA certified), Chronicle, Wrapped, HQ, Dayton merge all shipped
- **Next milestone: v0.7.x (Dynamic Codex)**

## Bugs Fixed This Session (already committed in working tree)

**P0 FIXED: `resolveEventDecision()` now applies `sets_flags` and `dimension_shifts` from chosen response options.**
- Was: silently dropped flags from player decisions. Bot auto-responses through `evaluate_events.ts` were fine.
- Fix: `src/sim/events/resolve_decision.ts` — imports and calls `applyDefinitionFlags` + `applyDefinitionDimensionShifts` from `evaluate_events.ts`.
- Tests: 2 new tests in `tests/event_decisions.test.ts` (flag application + dimension shift application).
- Calibration: PASSED — identical hash (no 40w events use the affected path).

**P1 FIXED: `pickBotResponseV1()` now scores `capital_based`/`capital_weighted`/`strategic_weighted` response options.**
- Was: fell through to "pick first option" for all three modes.
- Fix: `src/sim/events/bot_response.ts` — scores options by `dimension_shifts` weighted by `DIMENSION_WEIGHTS`, with mechanical effects as tiebreaker. `strategic_weighted` also factors in commander personality.
- Calibration: PASSED — identical hash (no current events triggered the new scoring in 40w).

## Mission: Get as far toward v1.0 as possible

### Priority Order (execute top-down)

#### Tier 0: v0.6.5 — Offensive Paramilitary Sweep (CALIBRATION, DO FIRST)

**Plan 0 — v0.6.5: Drina Valley Paramilitary Sweep** (8 tasks)
- Plan: `docs/plans/2026-03-24-offensive-paramilitary-sweep-plan.md`
- What: Extend `paramilitary_sweep.ts` with front-line offensive mode for April-June 1992 ethnic cleansing. RS paramilitaries (Arkan, White Eagles) sweep Bosniak-majority Drina OSIDs ahead of/alongside VRS regulars.
- Target: +2-3pp calibration (92% → 94-95%). 13 specific Drina OSIDs.
- **MUST land before v0.7.0** — establishes higher baseline, makes `drina_cleansing_occurred` flag fire reliably.
- **One change, one calibration run.** Do NOT bundle with anything else.
- After completion: re-freeze baseline, verify `npm run calibrate:40w` passes.
- **IMPORTANT**: Municipality scope restriction prevents sweep outside Drina region. Enclave integrity (Srebrenica, Goražde) must be verified post-run.

#### Tier 0.5: Integration Tests (write alongside Tier 0)

**Adapter field completeness test** + **IPC handler logic test** + **Save/load round-trip test** — 3 tests a nightshift agent can write NOW. See Integration Tester review. These protect against the silent UI killer (2,409-line adapter, ~100 fields, only ~10 tested).

#### Tier 1: v0.7.x — Dynamic Codex (GATE FOR EVERYTHING)

**Plan 1 — v0.7.0: Event Flag Wiring** (~20-25 tasks)
- Plan: `docs/plans/2026-03-23-event-flag-wiring-plan.md`
- What: Wire ~25 orphan flags to engine consumers, implement 2 placeholder evaluators, wire event JSON gates + pressure modifiers, convert 3-9 FIXED events to CONDITIONAL
- Key phases: (1) Implement `enclave_supply_status` + `corridor_severed` evaluators, (2) Wire event JSON flag gates, (3) Wire pressure modifiers, (4) Engine system reads — one change per calibration run!, (5) FIXED→CONDITIONAL conversions, (6) Cleanup
- **IMPORTANT**: Phase 4 requires one-change-per-calibration-run protocol. This is slow but mandatory per sacred rules.
- Implementation guides for placeholder evaluators added to plan Section 3.4
- After completion: run `npm run calibrate:40w` to verify no regression

**Plan 2 — v0.7.3: Canon Audit (Peace Phase Removal)** (~18-22 tasks)
- Plan: `docs/plans/2026-03-23-canon-audit-checklist.md`
- What: Remove Sep 1991 start refs, rename peace_phases.ts → early_war_phases.ts, archive phase0 code, update ~100 files
- INDEPENDENT — can run in parallel with v0.7.0 if using separate worktree
- Execute phases A→G in order. Phase E (PhaseName type change) is LAST.
- Save migration: coerce `phase: 'peace'` → `'war'` in serialize.ts (noted in plan)
- After each phase: smoke-test triad (tsc + vitest + desktop:map:build)
- **NEVER auto-edit `docs/10_canon/FORAWWV.md`** — flag for manual review

**Plan 3 — v0.7.1: Essay Template Engine** (~17-22 tasks for Done Gate minimum)
- Plan: `docs/plans/2026-03-23-essay-template-engine-plan.md`
- What: Dynamic essay schema, condition expression evaluator, ghost rendering, Codex UI (Historical/Your War toggle)
- Phase 1 (schema + engine) + Phase 2 (UI) are well-specified and mechanical
- Phase 3 (content authoring: 169 dynamic sections) — do minimum viable (10 essays with dynamic sections). Use /historian for content.
- `ghost_when: "turn_past:N"` syntax resolved — see implementation note added to plan Section 5
- File path: use `src/codex/` directory (create it)
- Depends on v0.7.0 flag vocabulary being wired

**Plan 4 — v0.7.2: Warroom React Migration** (~33 tasks)
- Plan: `docs/plans/2026-03-24-v072-warroom-react-migration-plan.md`
- What: Migrate legacy vanilla TS warroom to React stack
- INDEPENDENT — can run in parallel
- Large scope — may not complete in one session

#### Tier 2: v0.8.x — Command Chain

**Plan 5 — v0.8.0: Political Leader Bot** (~38 tasks)
- Plan: `docs/plans/2026-03-24-v080-political-leader-bot-plan.md`
- Depends on: v0.7.0 (flags wired)
- Can START alongside v0.7.1 since it only needs flags, not essays
- What: Political personality profiles, event decision engine, alliance management, war crimes policy, resource allocation, Dayton posture

**Plan 6 — v0.8.1: Order Interpretation System** (~23 tasks)
- Plan: `docs/plans/2026-03-24-v081-order-interpretation-plan.md`
- Depends on: v0.8.0 (political bot)
- What: Officer personality filters player commands — compliance, creative interpretation, cautious delay, pushback/refusal

**Plan 7 — v0.8.2: Autonomy Depth + Claude API** (5 phases)
- Plan: `docs/plans/2026-03-24-v082-autonomy-api-plan.md`
- Depends on: v0.8.0 + v0.8.1
- What: Command autonomy slider (4 levels), Claude API at political level, determinism-safe replay caching

#### Tier 3: v0.9.x — Consequences + Polish

**Plan 8 — v0.9.0: Consequence System** (26 new events, 7 chains)
- Plan: `docs/plans/2026-03-24-v090-consequence-system-plan.md`
- Depends on: v0.7.0 (flags) + v0.8.0 (political bot) + P0 bug fix
- What: 7 consequence chains (RS goals, HRHB goal, RBiH identity, Srebrenica, Bihac, early peace, Croat alliance). 26 new conditional events in `data/scenarios/events/consequences.json`. 5 new effect types (guerrilla_threat, recruitment_modifier, doctrine_constraint, alliance_lock, bot_priority_shift). 12 Tier 3 dynamic Codex sections + 7 Tier 4 ahistorical essay templates.

### Parallelism Map

```
PARALLEL TRACK A:          PARALLEL TRACK B:
v0.7.0 (flags)             v0.7.3 (canon audit)
    |                          |
    v                      v0.7.2 (warroom migration)
v0.7.1 (essay templates)
    |
v0.8.0 (political bot)
    |
v0.8.1 (order interpretation)
    |
v0.8.2 (autonomy + API)
```

Track A and Track B are FULLY INDEPENDENT. Use worktrees or dispatch parallel agents.

## Sacred Rules Reminder
- **Determinism is sacred**: No Math.random(), no timestamps in sim code
- **One change per calibration run**: Change ONE thing, run scenario, compare, sign off
- **NEVER override initial OSIDs**
- **NEVER use avoided_osids_by_faction**
- **NEVER auto-edit FORAWWV.md**
- **Smoke-test triad after every change**: `tsc --noEmit` + `vitest run` + `desktop:map:build`
- **Calibration regression**: `npm run calibrate:40w` after any sim-affecting change
- **Life lessons**: Read `docs/life_lessons.md` — check for relevant lessons before each task

## Verification Commands
```bash
npx tsc --noEmit                      # Typecheck
npm run test:vitest                    # 1410 tests
npm run desktop:map:build             # Electron map build
npm run calibrate:40w                 # Regression check (territory + events + hash)
npm run sim:scenario:run:40w          # Full 40w scenario
node tools/compare_painted_vs_sim.cjs <run_dir>  # Area-weighted comparison
```

## Files Modified This Session
- `docs/20_engineering/VERSIONING.md` — roadmap restructured, milestones marked complete
- `tools/freeze_baseline.cjs` — bug fix (computed area-weighted, fixed save path)
- `data/calibration/baseline_40w.json` — re-frozen at 92.0% (n1030)
- `tests/event_timing.test.ts` — 19→22 events
- `docs/plans/2026-03-16-v0.7.0-performance.md` — RESLOTTED to v0.9.3
- `docs/plans/2026-03-16-v0.7.3-visual-polish.md` — RESLOTTED to v0.9.4
- `docs/plans/2026-03-23-event-flag-wiring-plan.md` — added Section 3.4 (evaluator implementation guides)
- `docs/plans/2026-03-23-essay-template-engine-plan.md` — resolved ghost_when syntax + file path
- `docs/plans/2026-03-23-canon-audit-checklist.md` — version number fix + save migration note
- `docs/PROJECT_LEDGER.md` — new entry + status line
- `.claude/napkin.md` — current state refreshed
- `working-on.md` — updated to v0.7.0 focus

## New Plans Written This Session
- `docs/plans/2026-03-24-v072-warroom-react-migration-plan.md` (v0.7.2, ~33 tasks)
- `docs/plans/2026-03-24-v080-political-leader-bot-plan.md` (v0.8.0, ~38 tasks)
- `docs/plans/2026-03-24-v081-order-interpretation-plan.md` (v0.8.1, ~23 tasks)
- `docs/plans/2026-03-24-v082-autonomy-api-plan.md` (v0.8.2, 5 phases)
- `docs/plans/2026-03-24-v090-consequence-system-plan.md` (v0.9.0, 7 chains, 26 events)

Good luck. "Another such victory and we are undone."

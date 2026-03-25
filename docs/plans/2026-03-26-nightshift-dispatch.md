# Nightshift Dispatch Plan — 2026-03-26

**Status:** READY FOR DISPATCH
**Manager:** /nightshift (orchestrates, does not code)
**Parallel capacity:** 8 workstreams in isolated worktrees/directories
**Process gates:** Every workstream has owner, reviewer, and quality gates

---

## Process Rules (ENFORCED)

1. **Smoke triad** after every code change: `tsc --noEmit` + `vitest run` + `desktop:map:build`
2. **/simplify** after every code workstream completes (before review)
3. **/code-review** before any merge to main
4. **/canon-compliance-review** for anything touching game behavior or canon docs
5. **/determinism-auditor** for any new sim code
6. **/war-or-game** sign-off after essay authoring and calibration runs
7. **/quality-assurance-process** validates process compliance before merge
8. **One-change-per-calibration-run** for sim-affecting changes (none planned tonight)
9. **STOP AND ASK** gates: canon audit Phase E (type changes), any unexpected test failures

---

## WORKSTREAM 1: Author 13 Missing 1992 Essays

**Owner:** /narrative-designer
**Consulted:** /historian (MUST convene before each essay for sourced facts)
**Reviewer:** /war-or-game (tone + realism check on all 13)
**Spec:** `docs/plans/2026-03-25-letter-home-and-essay-authoring-spec.md` Section 2
**Files:** `data/scenarios/essays/` (13 new JSON files)

**Process:**
1. /historian researches each event against BB + ICTY (batch of 3-4 at a time)
2. /narrative-designer writes essay using historian's sourced findings
3. /war-or-game reviews all 13 for tone, balance, no hedging ICTY verdicts
4. JSON validation after each file
5. /quality-assurance-process sign-off

**Key discovery:** Content already exists inline in `essay_index.json`. Extract first, then /historian verifies, /narrative-designer rewrites to quality bar if needed.

**Bonus when done:** Run 3-pass QA (historian, web, geographic) on the 13 new essays.

---

## WORKSTREAM 2: Letter Home Templates + Name Pools

**Owner:** /narrative-designer
**Consulted:** /historian (name authenticity for 1991 census generation)
**Reviewer:** /game-designer (does it serve the negative-sum identity?)
**Spec:** `docs/plans/2026-03-25-letter-home-and-essay-authoring-spec.md` Section 1

**Files:** `data/templates/letter_home_templates.json` (NEW)

**Process:**
1. Format 20 templates from spec into JSON
2. /historian verifies name pools are period-appropriate
3. /game-designer reviews: do vignettes create moral weight without melodrama?
4. JSON validation

**Bonus when done:** Author 8-12 Patron Phone Call events. /historian researches ICTY transcripts for actual Milosevic/Tudjman/Holbrooke quotes. /narrative-designer writes events.

---

## WORKSTREAM 3: Ghost Map + Exhaustion Clock

**Owner:** /ui-ux-developer
**Consulted:** /game-designer (exhaustion clock visual — candle vs bar vs other?)
**Reviewer:** /code-review + /simplify
**Spec:** `docs/plans/2026-03-25-ghost-map-exhaustion-clock-spec.md`
**Worktree:** `feature/ghost-map-exhaustion-clock`

**Files created:** `buildGhostMapLayer.ts`, `ExhaustionClock.tsx`
**Files modified:** 8 (per spec)

**Process:**
1. /ui-ux-developer implements per spec
2. Smoke triad
3. /simplify reviews the new code
4. /code-review checks style, correctness, accessibility
5. Visual verification in Electron (`npm run desktop`)
6. /quality-assurance-process sign-off

---

## WORKSTREAM 4: Letter Home Engine

**Owner:** /gameplay-programmer
**Consulted:** /determinism-auditor (deterministic selection MUST be verified)
**Consulted:** /ui-ux-developer (CoS briefing integration)
**Reviewer:** /code-review + /simplify
**Spec:** `docs/plans/2026-03-25-letter-home-and-essay-authoring-spec.md` Section 1.5-1.7
**Worktree:** `feature/letter-home`

**Files created:** `src/sim/letter_home.ts`
**Files modified:** `ChiefOfStaffBriefing.tsx`

**STOP AND ASK gate:** Before implementing, determine whether `generateLetterHome()` runs as a pipeline step (sim-side, uses GameState fields only) or as a UI-adapter call (uses adapter fields). If sim-side, use `state.military.casualty_ledger` and derive battle context from `turn_summary`. Do NOT reference `latestTurnSummary` (UI-adapter-only field). Recommend: UI-side generation from adapter data — simpler, no pipeline change, no save format change.

**Process:**
1. /gameplay-programmer implements deterministic selection + template substitution
2. /determinism-auditor reviews: no Math.random(), seeded from turn + casualty count
3. Smoke triad
4. /simplify reviews
5. /code-review checks
6. /quality-assurance-process sign-off

**Dependency:** Needs `data/templates/letter_home_templates.json` from WS2 (stub with 2 templates if WS2 not done)

---

## WORKSTREAM 5: Ops Modal UX Overhaul

**Owner:** /ui-ux-developer
**Consulted:** /modern-wargame-expert (WP1 parameter naming — do EU4/HoI players understand these terms?)
**Reviewer:** /code-review + /simplify
**Spec:** `docs/40_reports/PROMPT_OPS_MODAL_UX_OVERHAUL.md`
**Worktree:** `feature/ops-modal-ux`

**Process:**
1. WP4a FIRST (pointer-events bug — critical path)
2. WP1 (parameter strip) — /simplify after
3. WP2 (brigade cards) — /simplify after
4. WP3 (G-2 phase) — /simplify after
5. WP4b-f (modal flow) — /simplify after
6. Full /code-review of all changes
7. Visual verification in Electron
8. /quality-assurance-process sign-off

---

## WORKSTREAM 6: Integration Tests

**Owner:** /integration-tester
**Consulted:** /systems-programmer (determinism round-trip tests)
**Reviewer:** /qa-engineer (coverage analysis)
**Spec:** `docs/plans/2026-03-25-integration-test-plan.md`
**Worktree:** `feature/integration-tests`

**Process:**
1. Implement 5 test files per spec
2. Run full test suite — all 21 new + all existing must pass
3. /qa-engineer reviews coverage: are the assertions meaningful?
4. /quality-assurance-process sign-off

**Bonus when done:** Adapter field audit — verify GameStateAdapter exposes pool decay, exhaustion clock, control events. Run 52w regression and /war-or-game sign-off.

---

## WORKSTREAM 7: v0.8.0 Scaffold + v0.9 Design Docs

**Owner:** /technical-architect
**Consulted:** /game-designer (v0.9 consequence system — what divergences matter?)
**Consulted:** /historian (Cost Ledger — which ICTY case structures to template?)
**Reviewer:** /product-manager (sequencing, scope)

**STOP AND ASK gate for 7A:** Create ONLY the type interfaces from the architecture spec Section 1.2. Do NOT implement any behavioral logic. Do NOT resolve the 8 open questions at the end of the architecture doc — flag them for daytime review. This is a types-only scaffold.

**Process:**
1. 7A: Create `src/state/political_leader_types.ts` (interfaces only, per gate above)
2. 7B: Write v0.9.0 consequence system design doc. Convene /game-designer first.
3. 7C: Write Cost Ledger template format. Convene /historian for ICTY case structure.
4. 7D: Write Endgame Comparison data requirements. Convene /historian for historical timeline gaps.
5. /product-manager reviews all docs for scope and sequencing
6. /quality-assurance-process sign-off

---

## WORKSTREAM 8: Canon Audit (Phases A-C ONLY)

**Owner:** /canon-compliance-reviewer
**Consulted:** /technical-architect (Phase A deletions — verify no runtime imports)
**Reviewer:** /code-review (rename + import updates)
**Spec:** `docs/plans/2026-03-23-canon-audit-checklist.md`
**Worktree:** `chore/canon-audit`

**Process:**
1. Phase A: Delete `src/phase0/` (11 files) + 3 phase0 scenarios. /technical-architect verifies no live imports. **CRITICAL:** After deletion, grep `tests/` for `phase0` imports. Remove or stub affected test files. Remove their entries from `vitest.config.ts` include array. Run smoke triad to verify zero breakage.
2. Phase B: Rename `peace_phases.ts` to `early_war_phases.ts`. Update all imports.
3. Phase C: Update 16+ docs removing Sep 1991/peace phase references. NEVER touch FORAWWV.md.
4. Smoke triad after each phase
5. /simplify on renamed file
6. /code-review before merge
7. **HARD STOP at Phase D** — type system changes need daytime sign-off

**Bonus when done:** Stale plan archiving (move completed plans to `_completed/`), branch cleanup (`clean_gone`), MEMORY.md curation (trim to <200 lines), napkin curation (enforce max 10/category).

---

## MERGE ORDER (Morning)

1. WS1 (essays) — pure data, zero risk
2. WS2 (templates) — pure data
3. WS7 (docs + types) — pure docs + one new type file
4. WS8 (canon audit) — deletions + renames, run full suite after
5. WS6 (integration tests) — new files, run full suite
6. WS3 (ghost map + clock) — UI additions, `desktop:map:build`
7. WS5 (ops modal) — UI changes, `desktop:map:build`
8. WS4 (letter home) — last, depends on WS2 data

**Post-merge:** Full smoke triad + 40w calibration run + /war-or-game sign-off

---

## /SIMPLIFY Schedule

| After | Target Files |
|-------|-------------|
| WS3 | `buildGhostMapLayer.ts`, `ExhaustionClock.tsx` |
| WS4 | `letter_home.ts`, `ChiefOfStaffBriefing.tsx` changes |
| WS5 WP1 | `PlanParameters.tsx` |
| WS5 WP2 | `BrigadeCard.tsx` |
| WS5 WP3 | `G2Phase.tsx`, new components |
| WS5 WP4 | `OpsModal.tsx` flow changes |
| WS6 | All 5 test files |
| WS8 Phase B | Renamed `early_war_phases.ts` |

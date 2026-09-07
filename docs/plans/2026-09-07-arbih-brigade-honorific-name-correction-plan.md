# ARBiH Brigade Honorific Name Correction — Plan

**Date:** 2026-09-07
**Lane:** R7 — Content, historical attribution (small disjoint packet)
**Status:** PLANNED, NOT YET IMPLEMENTED
**Branch/worktree:** `r7-arbih-honorific-names` at `F:/AWWV-worktrees/r7-arbih-honorific-names` (isolated from `main` and from the concurrent `codex/*` branches/worktrees — `apr1994-operational-corrections`, `bc01-player-opportunities`, `bc02-load-ratings`)

## Finding

33 ARBiH brigades carry "Vitezka" ("Viteška") or "Slavna" — real Bosnian War-era ARBiH unit combat-honor titles — baked directly into their `name` field in `data/source/oob_brigades.json` (e.g. `"111th Vitezka Motorized"`, `"161st Slavna Olovo Mountain"`), plus the matching Bosnian strings in `src/ui/map/data/formationNameLocalizations.ts`. These are decorations, not permanent unit designations; historically they were awarded to individual brigades over the course of the war for combat merit. Starting the game with them already displayed presents an unearned honor as pre-existing.

The mechanical half of this problem is already fixed. `decoration_types.ts` / `decoration_evaluator.ts` implement an earn-in-play decoration system, and `oob_loader.ts:71-72` documents that `distinction_potential` "replaces pre-awarding historical_decorations at war start." Verified in data: zero brigades carry the old `honor` field (which would grant a turn-0 combat bonus + decoration) — that path is dead. The 33 flagged brigades are exactly the ones carrying `distinction_potential: tier_1` (14, matching "Slavna") or `tier_2` (19, matching "Vitezka/Viteška") — the earned system already targets the right units. Only the display text still shows the honor as already granted.

## Scope decision: name only, not id

Each brigade's internal `id` (e.g. `arbih_111th_vitezka_motorized`) also embeds the honorific, but ids are load-bearing keys, not display text: a spot check of 4 of the 33 ids found **1,300–1,700 references each** across engine files (operation catalogs with BB-cited page references, triggered/pre-planned operations, tests, calibration artifacts). Renaming ids would be a large, calibration-risky refactor across dozens of files for zero player-facing benefit.

**Decision: rename `name` (and its Bosnian localization) only. Leave `id` untouched.**

## Sim-safety check

Confirmed no `src/sim/` or `src/state/` logic reads the brigade `.name` string for gating or comparison. `.name` hits in `src/sim/` are narrative/logging text (`battle_resolution.ts` AAR descriptions, `war_stories.ts` event records, `recruitment_engine.ts` name-copy on spawn) or belong to unrelated `name` fields on other types (`ArmyOperationPriority.name` in `bot_strategy.ts`, `CorpsOperation.name` in `army_reserve_system.ts`/`pre_planned_operations.ts`, collapse flag names in `collapse_flag_lifecycle.ts`) — none of these are brigade identity. The rename is byte-neutral to control/combat outcomes; **no 188w recalibration required** (unlike an id rename, which would need one).

## Naming rule

Strip the honorific token, keep the rest of the designation:
- `"111th Vitezka Motorized"` → `"111th Motorized"`
- `"161st Slavna Olovo Mountain"` → `"161st Olovo Mountain"`
- Where the honorific was the only descriptor, substitute `"Brigade"`: `"727th Slavna"` → `"727th Brigade"`

Apply the identical strip to the 33 matching entries in `formationNameLocalizations.ts` (e.g. `"255. slavna brdska brigada..."` → `"255. brdska brigada..."`).

## Steps

1. Historian + Formation-expert confirm the naming rule per brigade — most are mechanical strips, but the handful of honorific-only names (e.g. `727th`) need an explicit substitution decision, not a blind strip.
2. Edit `name` for the 33 rows in `data/source/oob_brigades.json`.
3. Edit the matching 33 entries in `src/ui/map/data/formationNameLocalizations.ts`.
4. Update the pinned literal strings in `tests/brigade_name_localization.test.ts` — it snapshots display name and a generated `designation_code` (e.g. `AWWV-BDE-ARBIH-503RD-SLAVNA-MOUNTAIN`); the code is derived from source data, not stored, so it regenerates — only the test's expected string needs editing.
5. Grep `docs/knowledge/*` and narrative/essay content for verbatim citations of the old display names; update to match.
6. Run `npx.cmd vitest run tests/brigade_name_localization.test.ts tests/oob_loader.test.ts tests/oob_early_war_entry.test.ts` plus `npx tsc --noEmit`.
7. Canon-compliance light pass (factual correction, not a thesis change — does not require full Pyrrhic panel or FORAWWV edit).

## Precedent

`docs/40_reports/proposals/20260619_VITEZOVI_IDENTITY_MODELING_DECISION.md` is the closest prior case (HRHB `hrhb_vitezovi_brigade_vitez` identity correction) and is the template for process weight here: it warns "even display/name-only changes can move output surfaces because OOB loading and reports depend on formation names" — hence the explicit test/docs sweep above rather than treating this as a pure data edit.

## Non-goals

- No `id` rename.
- No change to `distinction_potential`, the decoration-earning mechanics, or combat bonuses.
- No FORAWWV canon edit — this is factual/historical-attribution content correction, not a thesis change.

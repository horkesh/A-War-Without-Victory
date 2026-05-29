# Merge Handoff to Tactical Groups Team

**Date:** 2026-05-29
**From branch:** `codex/diagnostics-output-artifact-doc-closeout` (HEAD `50393254`)
**To recipient:** Tactical Groups team (active on `claude/tactical-groups-2026-05-28` HEAD `e00b33b3`)
**Purpose:** Heads-up on save schema slot conflict + canonical resolution path when tactical-groups is ready to merge against new main.

## TL;DR

When you rebase against the new main (which will include the dynamic-events branch's 51 commits), you'll have a 3-file conflict surface — and one of those is a save schema version-slot collision that requires renumbering. **Estimated work: ~1 hour mechanical**, no semantic redesign needed.

## The schema slot collision

Both branches independently incremented `CURRENT_SCHEMA_VERSION` from main's `v18`:

| Branch | `CURRENT_SCHEMA_VERSION` | What's in `v19` (and beyond) |
|---|---|---|
| dynamic-events | `33` | `v19`=Displacement civilian casualty; `v20`=JNA phantom spawned marker; ... `v32`=closed_event_ids; `v33`=event_causality_log |
| tactical-groups | `19` | `v19`=ADR-0005 v2.0 Tactical Group + Army HQ Operation state scaffold |

After dynamic-events merges, main has v18 + v19..v33 (15 new migrations).

**Resolution policy:** Renumber tactical-groups' `v19` to `v34` after rebase. Update `CURRENT_SCHEMA_VERSION = 34` in `src/state/game_state.ts`. The ADR-0005 migration body stays the same; only the slot number changes. Save migration tests + fixture roundtrip tests should pass after renumber.

## Overlap files (3)

| File | Conflict type | Resolution |
|---|---|---|
| `src/state/game_state.ts` | semantic-additive | Take both: mine adds `closed_event_ids` + `event_causality_log` fields to `MilitaryState`; yours adds `TgId` + `ArmyHqOpId` + `TgStatus` + `TgDonorContribution` types + ADR-0005 entity types. Bump `CURRENT_SCHEMA_VERSION` to `34` |
| `src/state/save_migration.ts` | slot collision | Renumber your `v19` to `v34`; keep migration body identical |
| `docs/PROJECT_LEDGER.md` | text append-only | Interleave entries chronologically (newest at top) |

## What the dynamic-events branch shipped (one-line summary per phase)

- **Phase B substrate**: event runtime causality writers + save schema v18→v33 + 12 loader validation passes (incl. DimensionId + EffectKind vocabulary checks)
- **Phase D** (44 packets): event-system causal-chain authoring
- **Phase E**: political-dimension propagation gate behind feature flags (default OFF; baseline byte-identical)
- **Phase F**: diagnostic suite + integration test
- **Phase G**: GitHub Actions CI workflow (event-system + Phase E/F/H gates)
- **Phase H**: UI/Codex integration (5 components activated end-to-end via catalog wire-up)
- **Phase I**: simplification cleanup arc (-163 LOC, 5x STOP-and-report safeguards)
- **Phase J**: Phase E activation simulator + readiness report + RBiH cohesion clamp diagnosis

## Post-rebase checklist for tactical-groups team

1. `git rebase main` against new main (which includes dynamic-events)
2. Resolve `src/state/game_state.ts` by additively combining both branches' type additions; set `CURRENT_SCHEMA_VERSION = 34`
3. Renumber `src/state/save_migration.ts` `v19` → `v34` (`registerMigration({ version: 34, description: '...', migrate: ... })`)
4. Merge `docs/PROJECT_LEDGER.md` interleaving entries chronologically
5. Update any references to your v19 schema in save fixtures or tests (e.g. `tests/fixtures/save_migration/v19_*.json` → `v34_*.json` if applicable)
6. Run the test gate:
   - `npx tsc --noEmit` (verify type union is sound)
   - Save migration test suite (`vitest run tests/save_migration*`) — should round-trip cleanly with renumbered slot
   - 27-file event-system + Phase E/F/H test matrix (per `.github/workflows/event-system-ci.yml`)
   - Baseline regression: `node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts`
7. If `ENABLE_TACTICAL_GROUPS` umbrella flag stays default off post-rebase, baseline regression should pass byte-identical (matches your existing v18-default behavior claim in `save_migration.ts` v19→v34 description)

## Note on Phase E flag gates

The dynamic-events branch added Phase E feature flags (`AWWV_POLITICAL_DIMENSION_PROPAGATION` + `AWWV_PDP_INTL_STANDING_OPS_HESITATION` + `AWWV_PDP_COHESION_CAUTION_BIAS`) using the same module-local override pattern as your `ENABLE_TACTICAL_GROUPS` umbrella flag (mirrors `src/sim/pressure/phase3c_exhaustion_collapse_gating.ts`). The feature-flag patterns are consistent across both branches — no architecture conflict, just additive flag declarations.

## Cross-references

- Engine authoring guide (relevant for future event-system extensions): `docs/20_engineering/EVENT_SYSTEM_AUTHORING_GUIDE.md`
- Phase E activation procedure (informs how feature-flag activation should be staged): `docs/40_reports/implemented/20260528_PHASE_E_ACTIVATION_PROCEDURE.md`
- Phase E activation readiness report (your team should review for activation-coordination patterns): `docs/40_reports/proposals/20260529_PHASE_E_ACTIVATION_READINESS.md`
- Strategic dimension clamp semantics (in case you investigate clamped values later): `docs/20_engineering/EMERGENT_CASCADE_ARCHITECTURE.md` Strategic Dimension Clamp Semantics section

## Contact / questions

Open issues against the dynamic-events branch or comment on the merge PR.

# v0.9.0 Consequence System Milestone Closure

**Date:** 2026-05-10  
**Lane:** v0.9.0 Consequence System  
**Status:** Agent-closed for the refreshed milestone scope

## Summary

The v0.9.0 Consequence System is now closed for autonomous agent-owned work. The remaining ordinary gap was the non-sensitive RBiH identity follow-through left by the old seven-chain draft: civic identity was only a historical no-op, and the pragmatic path was explicitly left as a future weaker variant.

This slice adds two bounded, live-substrate consequence events:

- `csq_civic_identity_consolidation_1993`
- `csq_pragmatic_coalition_1993`

They reuse existing effects only: `cohesion_change`, `patron_pressure`, `recruitment_modifier`, `dimension_shifts`, and audit-only `cost_ledger_annotation`.

## Closure Contract

The old all-at-once seven-chain plan is reconciled against the refreshed 2026-04-14 milestone plan:

- Chains 1-6 now have live consequence IDs, including the new civic/pragmatic identity follow-through.
- Old Chain 7 event IDs are superseded by the accepted-peace engine contract: `resolvePeacePlan(...)` writes `war_ended_early` / `early_peace_implemented`, freezes the endgame snapshot, and the Cost Ledger emits `early_peace_implementation_record`.
- Sensitive-history/enclave/genocide expansion remains governed by `SENSITIVE_HISTORY_DESIGN_GATE.md`; it is not ordinary v0.9.0 event-wave debt.

## Verification

- Red first: `npx.cmd vitest run tests/consequence_identity_completion.test.ts tests/v090_consequence_milestone_closure.test.ts --reporter=dot` failed 5/7 on missing `csq_civic_identity_consolidation_1993` and `csq_pragmatic_coalition_1993`.
- Green focused: the same suite passed 7/7 after authoring.
- Inventory: `node tools/diagnostics/consequence_substrate_inventory.cjs` reports 244 events, 827 effect instances, 18 effect kinds, 18 live substrates, zero partial-reader substrates, and zero unknown substrates.

## Canon Posture

Additive Ring 1/2 consequence content. No new condition kind, effect kind, save schema field, rupture rule, score rule, OOB data, political-controller paint, scenario baseline, or sensitive-history adjudication changed.

## Files

- `data/scenarios/events/consequences.json`
- `tests/consequence_identity_completion.test.ts`
- `tests/v090_consequence_milestone_closure.test.ts`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
- `docs/10_canon/Game_Bible_v0_9_0.md`
- `docs/10_canon/War_Specification_v0_9_0.md`
- `docs/40_reports/audits/20260510_CONSEQUENCE_SUBSTRATE_INVENTORY.md`
- `docs/40_reports/README.md`
- `docs/PROJECT_LEDGER.md`
- `.claude/napkin.md`

# Independent review — player-campaign acceptance contract

**Date:** 2026-10-24  
**Verdict:** GO  
**Scope:** Documentation and acceptance criteria only. No gameplay, source, package, campaign, or canon validation was run by this reviewer.

## Reviewed authority

- `AGENTS.md`
- runtime `orchestrator` skill
- `docs/20_engineering/AGENT_WORKFLOW.md`
- `docs/plans/2026-07-31-full-campaign-electron-validation-plan.md`
- `docs/40_reports/CALIBRATION_MASTER.md`
- `docs/20_engineering/PLAYER_VISIBLE_STATE.md`
- `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`
- applicable determinism and engine-invariant sections
- synchronized current-state summaries in `COMMAND_BOARD.md`, `MASTER_ROADMAP.md`, `PROJECT_LEDGER.md`, and `plan_index.yml`

## Findings

No remaining acceptance-scope or canon-boundary finding.

The final contract correctly:

- keeps n94 authoritative for no-player calibration and unchanged regression gates;
- retires exact n94 controller, checkpoint-score, and formerly-correct-map equality only for ordinary player campaigns;
- treats player map and score comparisons as diagnostics and adopts no 700 or replacement floor;
- requires ordinary visible UI ownership, explicit ordered choices and receipts, and forbids hidden authorization or state injection;
- requires exact same-input production-path determinism across every comparable captured settled state/artifact, so later reconvergence cannot conceal divergence;
- requires exact canonical Save → Main Menu → Field Records → Resume preservation for RBiH, RS, and HRHB;
- preserves lawful movement/combat/control ownership, supply/alliance/enclave/save invariants, unconditional protected/canon anchors, and source-conditioned historical outcomes without a blanket waiver;
- retains zero-unresolved engine health, strict runtime/audio, complete package/input provenance, telemetry, three 24-turn and three 188-turn sessions, replay, surface, diary, and product-quality gates;
- records the retained RBiH turn-39 result as partial infrastructure evidence only;
- defers maximum-RS and all-three-A experiments until after qualification and excludes them as default-AI, victory, or qualification requirements; and
- selects a cheap retained-evidence and reader-applicability audit before any new costly campaign.

Historical failed equality evidence remains intact as retained history, and the live plan, calibration master, roadmap, board, ledger, and derived index consistently report that the player contract is defined while qualification remains incomplete.

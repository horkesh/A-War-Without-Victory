# AWWV Command Board

**Purpose:** Current operational dispatch board for roadmap/backlog work. This document is the first place to look before starting autonomous work. It summarizes the active lanes, current owner lane, next action, verification expectation, and stop gate.

**Last reconciled:** 2026-05-24.

**Controlling sources:** `docs/plans/MASTER_ROADMAP.md`, `docs/plans/2026-05-18-autonomous-remaining-work-coverage-matrix.md`, `docs/40_reports/CONSOLIDATED_BACKLOG.md`, `docs/40_reports/GAME_STATE_RATING_MASTER.md`, and `docs/PROJECT_LEDGER.md`.

**Plan standard:** active, gated, operator, and owned-elsewhere plan packets should comply with `docs/plans/PLAN_EXECUTION_STANDARD.md`; the current hardening queue lives at `docs/plans/2026-05-24-active-plan-hardening-pass.md`.

## Status Legend

| Status | Meaning |
| --- | --- |
| `ACTIVE` | Repo-owned work that can be picked up now. |
| `OWNED-ELSEWHERE` | Active but currently assigned to another branch/agent. Do not collide. |
| `GATED` | Prep/evidence can proceed, but final implementation or claim needs user, historian, native-speaker, operator, or canon approval. |
| `OPERATOR-ONLY` | Repo can prepare templates/support, but real closure requires external machine/account/certificate/store/user evidence. |
| `MONITOR` | No immediate implementation; watch scenario/profile/QA evidence. |
| `CLOSED` | Implementation closed; leave only as history or future expansion reference. |

## Active Command Board

| Priority | Lane | Status | Owner Lane | Next Action | Verification / Proof | Stop Gate |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | Branch/CI/release hygiene | ACTIVE | Codex owner | Use `docs/plans/2026-05-24-branch-ci-release-hygiene-execution-plan.md` before substantial batches and after pushes. Keep `main` clean, pushed, and truthfully reported. | `git status --short --branch`, relevant focused tests, typecheck/build/baseline gates, `gh run list --branch main --limit 14`. | Unrelated dirty files, red CI, hash drift not understood. |
| P0 | GUI polish / presidential shell | OWNED-ELSEWHERE | GUI branch | Do not independently rework Warroom/Army HQ/Decision Room structure while GUI branch is active. Use `docs/plans/2026-05-24-owned-branch-acceptance-execution-plan.md` when handed off. | Browser/Electron visual evidence, UI tests, typecheck/build after merge. | Cross-branch UI ownership conflict or unverified visual claim. |
| P0 | Calibration / army arc / HVO-HV operations | OWNED-ELSEWHERE | Calibration branch/agent unless reassigned | Treat branch output as claims, then verify with `docs/plans/2026-05-24-owned-branch-acceptance-execution-plan.md` before accepting. Keep non-calibration work separate. | Scenario run, match-ratio/hash report, operation diagnostics, baseline comparison. | Sacred-rule violation, 7th Corps simulation, avoided OSID, initial OSID override, unexplained event ordering change. |
| P1 | Event system presidential core upgrade | ACTIVE | Event-system product/engine lane | Use `docs/plans/2026-05-24-event-system-presidential-core-upgrade-plan.md` as the external-agent execution packet. Next action: Phase 0 baseline lock, then Phase 1 taxonomy diagnostic; do not start authoring before hardening and acceptance diagnostics. | Event taxonomy diagnostic with trigger emergence class, focused catalog tests, event/effects/decisions/manifest tests, determinism scan, save migration/validation tests when fields change, scenario run if behavior can move, UI build/visual proof when crisis brief changes. | GUI branch collision, calibration branch collision, sensitive-history leverification, calendar railroading, unexplained scenario hash drift, new save fields without migration/validator proof. |
| P1 | Dynamic Codex and sensitive-history consequence arcs | ACTIVE | Content/Codex arc bank | Use `docs/plans/2026-05-24-codex-sensitive-history-execution-plan.md`: Phase 0 inventory, then Phase 1 safe factual corrections before gated prose or dynamic arcs. | Codex tests, content residual diagnostics, historian/source notes where historical claims are new. | Sensitive-history prose, new historical claim, or outcome framing without historian/user approval. |
| P1 | Sector/frontline performance residuals | ACTIVE | Engine-quality lane bank | Use `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md` Phase 1. Profile first; optimize only measured sector reconstruction buckets. | Focused sector tests, timed 40w consistency/hash proof, baseline regression when behavior or artifacts can move. | Unmeasured cache proposal, sensitive-history drift, unexpected hash drift. |
| P1 | Optional `GameState` schema contract | ACTIVE | Strict-null / save-contract lane | Use `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md` Phase 2. Classify one optional-field family at a time with migration/default/validator proof. | `tools/diagnostics/strict_null_inventory.cjs`, save migration tests, validation tests, roundtrip fixtures. | Behavior change, broad type churn, legacy-save incompatibility. |
| P1 | Save/load/replay and generated-artifact stability | ACTIVE | Save-replay determinism bank | Use `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md` Phase 3. Map artifact-owner commands before changing writes. | Artifact check commands, save/load/replay tests, baseline regression as needed. | Removing redundant writes without proof of final artifact ownership. |
| P1 | Localization Bosnian LQA | GATED | Localization/readiness lane | Use `docs/plans/2026-05-24-bosnian-localization-lqa-execution-plan.md`: inventory strings, audit Croatian/Serbian leakage, then fix one family at a time. | String inventory grep, locale tests, native-speaker LQA notes when available. | Claiming production-quality Bosnian without external/native review. |
| P2 | Intel surprise / ambush depth | ACTIVE | Intel extensions / engine-quality lane | Use `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 1 for bounded, player-safe friction. | Intel/combat focused tests, scenario hash review, AAR/read-model review. | Hidden-truth UI leak or design expansion beyond bounded friction. |
| P2 | Supply/logistics comprehension outside GUI branch | ACTIVE | UI/product read-model lane | Use `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 2 for read-model/docs clarity only. | UI/read-model tests, typecheck, no hidden enemy truth. | New command authority, new sim rule, or GUI branch collision. |
| P2 | Officer/OOB/source attribution and essay rosters | GATED | Research/operator lane plus content bank | Use `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 3 for inventories, citations, and packets. | Source notes, roster tests if data changes, docs ledger. | Missing citation or uncertain identity match. |
| P2 | Soundscape and high-value assets | GATED | Product polish/assets bank | Use `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 4 for substrate/placeholders and approval packets. | Build/UI tests, asset manifest, playback smoke where implemented. | Public asset selection without approval. |
| P2 | Telemetry/playtest diagnostics | ACTIVE | Platform/telemetry lane | Use `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 5 for local-first/default-off diagnostics. | Telemetry tests, no-network/default-off proof. | External upload/aggregation without provider and privacy decision. |
| P3 | Packaging, signing, clean VM, store, press, trailer | OPERATOR-ONLY | Platform packaging / RC evidence bank | Use `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 6 for repo-side scripts/templates/checklists only. | Dry-run artifacts, release manifest, operator evidence packet. | Certificates, store upload, clean-VM proof, or public claims. |
| P3 | FORAWWV / open design decisions | GATED | Canon decision-prep bank | Use `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 7 for decision packets only. | Decision packet with options, risks, canon impact. | Do not auto-edit `docs/10_canon/FORAWWV.md` or ship design outcomes without user/canon ruling. |

## Closed Or Monitor Lanes

| Lane | Current Disposition |
| --- | --- |
| Counted strict-null escape cleanup | CLOSED at zero counted `as_factionid_casts`, `as_unknown_casts`, `as_any_casts`, dot/index non-null assertions. Remaining work is optional-field contract, not escape cleanup. |
| 188w Brcko/Koridor anchor closure | CLOSED for accepted anchor truth; monitor only if calibration changes move the 188w tuple. |
| GUI visual audit 2026-05-22 Batch H | CLOSED for listed corrective queue; fresh GUI branch may supersede with new visual findings. |
| Accessibility P0 static closure | CLOSED for static checks; browser/axe evidence remains useful but should not reopen P0 without a real regression. |
| Event notification residual backfill | GATED residual only; safe rows are closed, sensitive rows require review before final text. |

## Dispatch Rules

1. Start every work session with `git status --short --branch`.
2. If the worktree is dirty, reconcile or isolate the dirty work before choosing a new lane.
3. Pick one `ACTIVE` code lane and, when useful, one support lane. Do not split into small unrelated batches.
4. If a lane hits its stop gate, switch to another `ACTIVE` lane or to allowed prep work in a `GATED` lane.
5. Do not work on `OWNED-ELSEWHERE` lanes unless the other branch is paused, handed off, or merged.
6. Every lane closeout must update this command board, the coverage matrix or relevant plan, the rating/backlog doc if its status changed, and `docs/PROJECT_LEDGER.md`.
7. A lane is not closed until its verification command/proof is named in the implementation report or ledger entry.
8. Planning rows must stay actionable: owner lane, next action, verification, and stop gate are required. A vague aspiration belongs in backlog history, not this board.
9. Any plan used for external-agent handoff must satisfy `docs/plans/PLAN_EXECUTION_STANDARD.md` or be marked for hardening before dispatch.

## Keeping This Current

Use this maintenance checklist before any commit that changes behavior, outputs, scenarios, roadmap scope, or release readiness:

1. Does the changed work close, reopen, or reclassify a command-board row?
2. Does the row need a new status, owner lane, next action, verification, or stop gate?
3. Does `CONSOLIDATED_BACKLOG.md` still describe the row as open after it was closed?
4. Does `GAME_STATE_RATING_MASTER.md` need a grade or residual-risk update?
5. Does `MASTER_ROADMAP.md` need a short addendum or should it only link back here?
6. Is there a ledger entry naming the roadmap delta?

Future upkeep rule: if a worker cannot answer those six questions, the batch is not ready to commit.

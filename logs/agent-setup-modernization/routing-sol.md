# Sol/medium routing tabletop — Codex adapter candidates

**Date:** 2026-09-12  
**Mode:** Read-only tabletop by the assigned Sol/medium worker. The six prompts were evaluated against the candidate adapter, its matching proposed repo skill, repository entrypoints, and the relevant maintained project sources. No prompt caused edits, tests, simulations, builds, publication, messages, live skill installation, or settings changes.

## Shared selection behavior

**Superseded original selection:** The initial tabletop selected `using-superpowers`, its candidate adapter, and the repo source for every AWWV case. That was a real observation under the first proposed description, but it was too broad because the runtime catalog already exposes clear domain triggers.

**Corrected routing rule:** Select the meta-skill only when skill discovery/workflow choice is unclear or the user explicitly requests it. Ordinary cases select repository `AGENTS.md`, the named task surface, and any clearly triggered domain skill directly. The cases below were not rerun by this worker; where their original source list says “shared selection pair,” that meta-skill portion is superseded while the recorded domain/authority/verification observations remain. No candidate contains a Markdown link to a repository-relative target; AWWV paths are code-form routing instructions resolved from the current checkout.

## Case 1 — Documentation typo

**Prompt:** Correct a spelling error in a named README.

**Corrected source selection (static correction, not a rerun):** repository `AGENTS.md` and the named README directly. The `using-superpowers` adapter/repo source is not selected because the catalog decision is clear. No brainstorming, canon, simulation, UI, scenario, or release source is selected.

**Authority:** The change request authorizes the named reversible documentation edit. It does not authorize broader documentation cleanup, roadmap changes, installation, or activation.

**Verification:** Inspect the scoped diff; verify the corrected occurrence and local Markdown references; run `git diff --check` and any validator specific to that README. Documentation-only policy excludes typecheck, Vitest, map build, and campaign work.

**Observation:** ORIGINAL PASS SUPERSEDED for meta-skill selection. The corrected static route passes the intended negative case, but this worker did not rerun an agent trial after the wording change.

## Case 2 — Specified UI footer bug

**Prompt:** Repair a named modal's clipped footer with agreed behavior.

**Selected sources:** shared adapter/repo selection pair; `.claude/skills/ui-ux-developer/SKILL.md`; `docs/40_reports/GUI_MASTER.md`; `docs/20_engineering/MAP_UI_MASTER.md`; `docs/20_engineering/PLAYER_VISIBLE_STATE.md`; `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`; affected component/style/test files. The `brainstorming` adapter and repo skill were checked and correctly did not activate because behavior was already agreed.

**Authority:** Implement the named footer correction and affected tests/docs. Routine reversible layout choices may be resolved from the UI authorities. A new interaction, player-information exposure, or product behavior would require a design/authority decision.

**Verification:** Cheapest source/style/component checks first, then the affected UI test and real mounted modal at the intended viewport. Assert non-clipping bounding geometry, visible persistent action, keyboard/accessibility behavior, and actual rendered ownership. No scenario or campaign.

**Observation:** PASS. It continues through visual proof and affected correction without a generic design interview or automatic first-patch stop.

## Case 3 — Territory-moving simulation rule

**Prompt:** Change a territory-moving operation rule.

**Selected sources:** shared selection pair; `.claude/skills/gameplay-programmer/SKILL.md`; `.claude/skills/canon-compliance-reviewer/SKILL.md`; `docs/10_canon/CANON.md`; affected phase/war/system specs; `docs/10_canon/Engine_Invariants_v0_9_0.md`; `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`; `docs/40_reports/CALIBRATION_MASTER.md`; active scenario plan/provenance; affected code/tests.

**Authority:** Implementation requires explicit change authority and cannot alter canon, acceptance criteria, initial OSIDs, protected data/control/save boundaries, or calibration scope by implication. Implementer and reviewer remain separate.

**Verification:** Focused deterministic tests and type/static checks first; then every triggered full-suite, authoritative 188-week, anchor, artifact-hash, consumed-input, save/replay, and provenance gate. State the long-run question, cost, prerequisites, pass criteria, and stopping rule before launch. A shorter or focused run cannot waive the full horizon.

**Observation:** PASS. It retains production and calibration gates while refusing an unplanned campaign expansion.

## Case 4 — Sensitive-history canon change without panel receipt

**Prompt:** Change a sensitive-history rule with no panel receipt.

**Selected sources:** shared selection pair; `.claude/skills/canon-compliance-reviewer/SKILL.md`; `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`; `docs/10_canon/FORAWWV.md`; `docs/20_engineering/AGENT_WORKFLOW.md`.

**Authority:** No edit is authorized without the applicable panel record. The standard §6 panel is exactly Historian, scenario-tester/calibration, Engine/systems, and Red-team. Crossing the bright line requires those four plus Game Designer, Narrative Designer, Canon Compliance Reviewer, and War-or-Game: eight independent unanimous seats, implementer excluded. The proposal must remain visible to the owner and amend the protected canon statement in the same authorized change.

**Verification:** Verify the exact independent panel receipts, unanimity, implementer exclusion, canon-diff coupling, cited historical procedural posture, and every affected behavior/provenance gate. A generic reviewer cannot replace a seat.

**Observation:** INITIAL FAILURE, CORRECTED. The first proposed shared contract said only “standard sensitive-history panel” and “broader bright-line panel”; removal of the old long `CLAUDE.md` had made the eight-seat list non-discoverable from the entrypoint. `AGENT_WORKFLOW.md` now states all seats and points directly to the operative gate and thesis files. Post-correction verdict: PASS.

## Case 5 — Plan-only request

**Prompt:** Prepare a plan for a multi-step change; do not implement it.

**Selected sources:** `.agent/codex-skill-adapters/writing-plans/SKILL.md`; `.claude/skills/writing-plans/SKILL.md`; repository `AGENTS.md`; named specification/current-state sources.

**Authority:** Read-only investigation and a reviewable plan are authorized. Code/docs implementation, worktree mutation beyond the requested plan artifact, tests with side effects, commits, merge, publication, and activation are not inferred.

**Verification:** Check that the plan names outcome/non-goals, exact ownership, dependencies, governing sources, change-specific checks and pass criteria, authority, expensive-run stopping rules, review, integration, and activation. No forced implementation-choice question follows.

**Observation:** PASS. Generic usefulness is retained outside AWWV while AWWV-specific semantics come from the current checkout.

## Case 6 — Injected first-test failure

**Prompt:** During an authorized implementation, the first affected test fails unexpectedly.

**Selected sources:** `.agent/codex-skill-adapters/executing-plans/SKILL.md`; `.claude/skills/executing-plans/SKILL.md`; `.agent/codex-skill-adapters/verification-before-completion/SKILL.md`; matching repo verification skill; governing plan and affected test/code sources.

**Authority:** Diagnose failures caused by or exposed within the authorized change and make a targeted correction. A change to scope, canon, acceptance criteria, costly validation, destructive/external action, or an unresolved consolidated contradiction requires owner direction.

**Verification:** Retain the failure output and all visible categories; reproduce cheaply; verify the smallest correction with the affected test; broaden only when the failure or a triggered repository gate justifies it. Do not repeat an unchanged expensive suite or claim unrelated gates passed.

**Observation:** PASS. No fixed three-task pause, “ready for feedback” stop, automatic first-failure escalation, or whole-suite retry was selected.

## Candidate and trial residuals

- These are deliberately reviewed Codex host wrappers, not a bulk synchronization or a new maintained project source.
- Installed user skills and their supporting files remain unchanged. Parent-owned hash-gated deployment, rollback, manifest, importer, and integration tests remain outstanding.
- The tabletop establishes source selection and stated authority/verification only. It does not prove desktop activation, implicit discovery precedence, hook parity, or behavioral compliance in a live turn.
- Runtime `orchestrator` remains unchanged and continues to own Codex-specific Astra/Sol/Luna and collaboration policy.

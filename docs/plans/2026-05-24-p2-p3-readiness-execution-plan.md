# P2 P3 Readiness Execution Plan

**Date:** 2026-05-24
**Status:** ACTIVE/GATED execution-grade plan
**Owner lane:** Product, research, platform, and operator-readiness lanes
**Related command-board rows:** P2 Intel surprise / ambush depth; P2 Supply/logistics comprehension outside GUI branch; P2 Officer/OOB/source attribution and essay rosters; P2 Soundscape and high-value assets; P2 Telemetry/playtest diagnostics; P3 Packaging/signing/clean VM/store/press/trailer; P3 FORAWWV/open design decisions
**Collision rules:** Work one lane and phase at a time. Do not cross into GUI/calibration ownership, operator-only proof, or canon decisions.
**Phase covered:** Remaining P2/P3 executable prep.
**Current next action:** Pick the highest-value non-colliding phase: Intel, Supply, Officer/OOB, Soundscape, Telemetry, Packaging/operator, or Canon decision prep.

## Purpose

Make the remaining lower-priority command-board work executable without pretending gated or operator-only tasks are already solved. These lanes are valid roadmap work, but most require narrow boundaries: hidden-truth safety, source review, asset approval, privacy choices, external machine/account proof, or canon decisions.

## Non-Goals

- Do not use this plan for P0/P1 lanes already covered by their own execution packets.
- Do not implement GUI shell changes while GUI branch owns that surface.
- Do not claim operator-only evidence from repo-only work.
- Do not settle FORAWWV/open canon questions.
- Do not edit `docs/10_canon/FORAWWV.md`.

## External-Agent Execution Contract

Session start commands:

```powershell
git status --short --branch
rg -n "intel|ambush|surprise|supply|logistics|officer|soundscape|telemetry|playtest|clean VM|FORAWWV" docs/plans docs/40_reports src tests
```

Required reading:

- `.claude/napkin.md`
- `docs/plans/COMMAND_BOARD.md`
- `docs/plans/PLAN_EXECUTION_STANDARD.md`
- selected older lane plan named in the phase
- lane-specific reports or audits referenced by the command-board row

Branch collision rule:

- If the selected task touches GUI shell, calibration, or another active branch, prepare a packet instead of implementation.

Global stop rule:

- Stop for hidden-truth leaks, source uncertainty, unapproved assets, privacy/provider decisions, operator-only evidence, or canon decisions.

Expected commit boundary:

- One lane phase per commit. Do not mix P2/P3 lanes unless the commit is docs-only command-board routing.

## Phase 1 - Intel Surprise / Ambush Depth

**Owner:** game-designer plus gameplay-programmer
**Reviewers:** systems-programmer, QA engineer
**Source plan:** `docs/plans/2026-05-17-intel-extensions-plan.md`

Allowed work: bounded combat/intel friction, player-safe AAR/read-model explanation, and hidden-truth safety tests.

Verification:

```powershell
npx.cmd vitest run <focused-intel-combat-tests> --reporter=dot
npm.cmd run typecheck
git diff --check
```

Stop gates: hidden enemy truth exposed, broad AI/intel redesign, or unexplained scenario hash drift.

## Phase 2 - Supply / Logistics Comprehension

**Owner:** product-manager plus UI/UX developer
**Reviewers:** gameplay-programmer, QA engineer
**Source plan:** `docs/plans/2026-05-17-supply-design-completion-plan.md`
**2026-06-06 progress:** Supply map logistics panel fallback aggregation is now player-faction-scoped when a player faction is loaded, localized, and deterministically ordered. Report: `docs/40_reports/implemented/20260606_SUPPLY_PANEL_PLAYER_SCOPED_READMODEL.md`. Proof: focused supply UI/read-model pack 21/21.

Allowed work: read-model clarity, docs/tooltips/diagnostics, and existing-state explanation.

Verification:

```powershell
npx.cmd vitest run <focused-supply-readmodel-tests> --reporter=dot
npm.cmd run typecheck
git diff --check
```

Stop gates: new sim authority, GUI shell collision, or hidden enemy supply truth exposed.

## Phase 3 - Officer/OOB/Source Attribution

**Owner:** historian
**Reviewers:** formation-expert, canon-compliance-reviewer
**Source plan:** `docs/plans/2026-05-17-officer-character-mini-bio-plan.md`

Allowed work: inventories, source notes, uncertainty classification, and non-sensitive attribution packets.

Verification:

```powershell
git diff --check
```

Add tests when data changes.

Stop gates: uncertain identity match, missing source, sensitive biography judgment, or OOB behavior changes without engine plan.

## Phase 4 - Soundscape And High-Value Assets

**Owner:** asset-integration plus product-manager
**Reviewers:** platform-specialist, UI/UX developer
**Source plans:** `docs/plans/2026-05-17-soundscape-integration-plan.md`, `docs/plans/2026-05-17-soundscape-kickoff-audio-stub-plan.md`

Allowed work: repo-wirable substrate, placeholder manifests, and asset approval packets.

Verification:

```powershell
npm.cmd run typecheck
npm.cmd run desktop:map:build
git diff --check
```

Stop gates: public asset choice without approval, license uncertainty, or generated/public marketing asset without user approval.

## Phase 5 - Telemetry / Playtest Diagnostics

**Owner:** platform-specialist
**Reviewers:** devops-specialist, QA engineer
**Source plan:** `docs/plans/2026-05-17-telemetry-crash-reporting-plan.md`

Allowed work: local-first diagnostics, opt-in/off-by-default scaffolding, and playtest artifact packaging.

Verification:

```powershell
npx.cmd vitest run <focused-telemetry-tests> --reporter=dot
npm.cmd run typecheck
git diff --check
```

Stop gates: network upload by default, provider/privacy decision missing, or PII collection ambiguity.

## Phase 6 - Packaging / Signing / Store / Press / Trailer

**Owner:** platform-specialist plus product-manager
**Reviewers:** devops-specialist, operator/user
**Source plans:** release, clean-VM, gold-gate, store, press, and trailer plans under `docs/plans/`

Allowed work: scripts, manifests, checklists, release evidence templates, and operator packet updates.

Verification:

```powershell
npm.cmd run desktop:map:build
git diff --check
```

Stop gates: signing certificate required, clean VM proof required, store upload/public claim required, or press/trailer asset approval required.

## Phase 7 - FORAWWV / Open Design Decisions

**Owner:** game-designer plus product-manager
**Reviewers:** canon-compliance-reviewer, user
**Source plan:** `docs/plans/2026-05-18-autonomous-canon-design-decision-prep-bank.md`

Allowed work: decision packets, options, risks, canon impact, and no-op research summaries.

Verification:

```powershell
git diff --check
```

Stop gates: implementation required, canon decision required, or `docs/10_canon/FORAWWV.md` edit proposed.

## Determinism and Save-Schema Gates

Any implementation phase that touches engine state, diagnostics, generated artifacts, or save/load must use stable ordering, avoid randomness/timestamps, and include migration/default/validator proof for new persisted fields.

## UI and Player-Truth Gates

- Supply and intel surfaces must not expose hidden enemy truth.
- GUI shell layout belongs to GUI branch while active.
- New player-facing strings need localization follow-up.

## Historical and Sensitive-History Gates

- Officer/OOB/source work requires citations and uncertainty labels.
- Sensitive content routes to `docs/plans/2026-05-24-codex-sensitive-history-execution-plan.md`.
- FORAWWV/canon decisions are packets only unless the user explicitly decides.

## Roadmap and Ledger Closeout

Closeout must update `docs/plans/COMMAND_BOARD.md` if a row status or next action changes, this plan or the selected older source plan with completed phase, `docs/PROJECT_LEDGER.md`, and reports/backlog/rating docs when status or rating changes.

## Copy-Ready Prompt

```text
Role and objective: You are the P2/P3 readiness agent for AWWV. Execute docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md for exactly one phase selected by the orchestrator.

Canon references: Read .claude/napkin.md, docs/plans/COMMAND_BOARD.md, docs/plans/PLAN_EXECUTION_STANDARD.md, this plan, and the older source plan named in the selected phase before editing.

Determinism and ledger constraints: Do not mix lanes. No hidden-truth leaks, unapproved assets, default network upload, operator-only proof claims, or FORAWWV edits. Append docs/PROJECT_LEDGER.md for behavior/output/data/roadmap changes. Use stable ordering and schema proof when touching engine/save artifacts.

STOP AND ASK triggers: GUI/calibration branch collision, hidden-truth leak, source uncertainty, sensitive-history judgment, unapproved asset/license issue, privacy/provider decision, operator-only evidence, canon decision, or unexplained scenario hash drift.

Output format and validation: Report selected phase, files changed, tests/proof run with pass/fail, gates still pending, docs/ledger updates, and next unfinished phase.
```

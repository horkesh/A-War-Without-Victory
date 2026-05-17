# Roadmap Plan Coverage Closure
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Goal

Make roadmap planning coverage explicit: every remaining roadmap point must link to a separate actionable plan, an existing plan, or a documented non-actionable tracking status.

## Architecture

This is a planning-control document. It does not implement features. It maps roadmap points to execution plans so future work can start from a scoped plan rather than rediscovering requirements.

## Tech Stack

- Markdown plan index
- Existing roadmap and ledger documents
- Existing plan files in `docs/plans/`

## Coverage Matrix

| Roadmap Point | Plan |
| --- | --- |
| Two-level event surfacing and Codex visibility | `docs/plans/2026-05-17-two-level-event-surfacing-and-codex-visibility-plan.md` |
| H1 watched operation produces visible outcome | `docs/plans/2026-05-17-h1-watched-operation-outcome-plan.md` |
| Presidential campaign loop validation | `docs/plans/2026-05-17-presidential-campaign-loop-validation-plan.md` |
| Formation lifecycle packet execution | `docs/plans/2026-05-17-formation-life-packetization-plan.md` |
| HRHB patron directive scope | `docs/plans/2026-05-17-hrhb-patron-directive-scope-plan.md` |
| Diplomacy panel | `docs/plans/2026-05-17-diplomacy-panel-plan.md` |
| Accessibility P0 closeout | `docs/plans/2026-05-17-accessibility-p0-closeout-plan.md` |
| Officer character mini-bios | `docs/plans/2026-05-17-officer-character-mini-bio-plan.md` |
| Soundscape kickoff/audio stub | `docs/plans/2026-05-17-soundscape-kickoff-audio-stub-plan.md` |
| Cinematic verdict | `docs/plans/2026-05-17-cinematic-verdict-plan.md` |
| Chronicle chapters | `docs/plans/2026-05-17-chronicle-chapter-plan.md` |
| Soundscape integration | `docs/plans/2026-05-17-soundscape-integration-plan.md` |
| BCS localization | `docs/plans/2026-05-17-bcs-localization-plan.md` |
| Marketing/store/press launch materials | `docs/plans/2026-05-17-marketing-store-launch-plan.md` |
| Telemetry/crash reporting | `docs/plans/2026-05-17-telemetry-crash-reporting-plan.md` |
| Gold gate and launch day | `docs/plans/2026-05-17-gold-gate-launch-day-plan.md` |
| Wall-clock performance residual | `docs/plans/2026-05-17-performance-wall-clock-followup-plan.md` |
| External playtest readiness | `docs/plans/2026-05-17-external-playtest-readiness-plan.md` |
| CI/test feedback loop | `docs/plans/2026-05-17-ci-test-feedback-loop-plan.md` |
| Historical essays | `docs/plans/2026-03-31-v080x-1992-foundation-essays-plan.md` |
| Clean VM validation | `docs/plans/2026-05-17-clean-vm-cosmetic-finalization-plan.md` |
| EOL normalization | `docs/plans/2026-05-16-working-tree-eol-normalization-plan.md` |
| Master launch synthesis | `docs/plans/2026-05-16-aaa-triple-plus-shipping-plan.md` |
| Gold readiness integration | `docs/plans/2026-04-30-v1-gold-readiness-integration-plan.md` |

## Implementation Tasks

1. Keep this matrix synchronized when roadmap points are added, closed, split, or removed.
2. Confirm every linked plan has implementation tasks, files to touch, verification, docs/ledger notes, and stop gates.
3. When a plan is implemented, update the matrix status or replace the plan link with the implemented report link.
4. If a roadmap point is intentionally deferred, add a deferral rationale and owner instead of leaving it unplanned.
5. Treat a plan as implementation-ready only when it names concrete owner files, focused tests or commands, docs/ledger propagation, stop gates, and commit/closeout scope.

## Verification

- Run a path-existence scan over every `docs/plans/...` reference in this matrix.
- Run `git diff --check`.
- Check `docs/plans/MASTER_ROADMAP.md` links to this matrix.

## Documentation And Ledger

- Update `docs/plans/MASTER_ROADMAP.md` to reference this coverage matrix.
- Add `docs/PROJECT_LEDGER.md` entry for the planning closeout.

## Stop Gates

- Stop if a roadmap point cannot be matched to a plan.
- Stop if a linked plan is only a concept note and lacks implementation steps.
- Stop if an existing plan path has moved or been archived.

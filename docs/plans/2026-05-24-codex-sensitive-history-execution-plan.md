# Codex Sensitive History Execution Plan

**Date:** 2026-05-24
**Status:** ACTIVE execution-grade plan
**Owner lane:** Content/Codex arc bank
**Related command-board row:** P1 Dynamic Codex and sensitive-history consequence arcs
**Collision rules:** May edit Codex/content diagnostics and safe factual prose. Must stop before new sensitive-history framing, unsupported historical claims, or mechanics that turn atrocities into player levers.
**Phase covered:** Safe Codex sweep, source-backed correction, sensitive-history packet preparation, and dynamic consequence arcs.
**Current next action:** Phase 0 inventory and Phase 1 safe factual correction queue.

## Purpose

Make the Codex and sensitive-history surfaces accurate, sourced, and dynamically tied to game state where possible. The immediate goal is to prevent embarrassing operational or historical inaccuracies while preserving strict gates for sensitive prose and consequence arcs.

## Non-Goals

- Do not author new atrocity, detention, ethnic-cleansing, or civilian-harm prose without review.
- Do not create player buttons, incentives, or levers for atrocities or persecution.
- Do not tune operation outcomes, calibration, or scenario control from this lane.
- Do not add unsupported claims because they "sound plausible."
- Do not edit `docs/10_canon/FORAWWV.md`.

## External-Agent Execution Contract

Session start commands:

```powershell
git status --short --branch
rg -n "5th Corps sweeps west|sweeps west|sweep|cleanses|ethnic|massacre|detention|camp|civilian" src data docs tests
rg -n "codex|chronicle|sensitive_history|notification|consequence" src data tests docs/plans
```

Required reading:

- `.claude/napkin.md`
- `docs/plans/COMMAND_BOARD.md`
- `docs/plans/PLAN_EXECUTION_STANDARD.md`
- `docs/plans/2026-05-18-autonomous-content-codex-arc-bank.md`
- `docs/plans/2026-05-17-two-level-event-surfacing-and-codex-visibility-plan.md`
- `docs/40_reports/audits/20260521_H1_WATCHED_OPERATION_VISIBILITY_PACKET.md`
- relevant historical source notes already in `docs/40_reports/`

Branch collision rule:

- If calibration or GUI branches touch the same event/Codex/UI files, produce a correction packet instead of editing.

Global stop rule:

- Stop if a correction requires a new historical claim without a source, a sensitive-history judgment, a canon decision, or live-state fields that do not exist.

Expected commit boundary:

- One safe factual cleanup or diagnostic slice per commit.
- Sensitive-history packets are docs-only until reviewed.

## Task Boundary Rules

Allowed edits:

- Codex/content source files;
- Codex diagnostics and tests;
- notification/Codex read models when they only surface existing player-safe facts;
- docs/plans and reports for correction packets;
- `docs/PROJECT_LEDGER.md`.

Forbidden edits:

- combat outcome tuning;
- operation launch predicates unless separately owned by calibration/ops-catalog plan;
- event bot-response logic unless separately owned by event-system plan;
- scenario initial control or OOB data without source-backed plan;
- UI shell restructuring while GUI branch is active.

Scenario/hash drift:

- Not expected for text-only Codex corrections. If drift appears, stop and identify the non-text behavioral change.

Decision packet rule:

- If a claim is source-conflicted, sensitive, or canon-ambiguous, create a decision packet with options and citations instead of shipping prose.

## Phase 0 - Codex Claim Inventory

**Owner:** historian plus documentation-specialist
**Reviewers:** canon-compliance-reviewer, product-manager

Steps:

1. Search all Codex, chronicle, notification, and consequence surfaces for operational verbs and sensitive-history terms.
2. Build an inventory table of claim, file, line/context, faction, date/window, source status, and risk class.
3. Classify each item:
   - safe factual correction;
   - needs source note;
   - sensitive-history gated;
   - dynamic-state candidate;
   - unsupported/remove.
4. Prioritize high-visibility and high-embarrassment risks first.

Verification:

```powershell
rg -n "5th Corps sweeps west|sweeps west|sweep" src data docs tests
git diff --check
```

Stop gates:

- source corpus insufficient;
- sensitive-history classification needed;
- claim requires new mechanics or calibration changes.

## Phase 1 - Safe Factual Corrections

**Owner:** documentation-specialist
**Reviewers:** historian, canon-compliance-reviewer

Steps:

1. Replace inaccurate or overconfident operational wording with source-backed, bounded phrasing.
2. Prefer concrete actor/date/place/state language over cinematic verbs.
3. Remove claims that cannot be supported.
4. Add or update tests/diagnostics so the same risky phrase does not silently return.

Verification:

```powershell
npx.cmd vitest run <focused-codex-or-content-tests> --reporter=dot
git diff --check
```

Stop gates:

- new historical assertion without citation;
- prose implies victory/atrocity/civilian-harm causality not represented by state;
- correction requires event/outcome tuning.

## Phase 2 - Sensitive-History Review Packets

**Owner:** historian
**Reviewers:** canon-compliance-reviewer, product-manager, user/human review where required

Steps:

1. For each sensitive item, write a packet with source summary, proposed neutral wording, player-safety risk, and whether it should be shown, deferred, or omitted.
2. Keep sensitive content out of runtime data until accepted.
3. Classify each packet by ring:
   - ring 0: non-sensitive institutional/military fact;
   - ring 1: sensitive but factual context;
   - ring 2: civilian-harm or atrocity-adjacent context requiring review;
   - ring 3: forbidden as player lever.

Verification:

```powershell
git diff --check
```

Stop gates:

- ring 2 or ring 3 content without review;
- wording creates player agency over atrocities;
- unsupported identity or casualty claim.

## Phase 3 - Dynamic Consequence Arcs

**Owner:** game-designer plus gameplay-programmer
**Reviewers:** systems-programmer, historian, QA engineer

Steps:

1. Identify existing state predicates that can drive Codex/consequence cards without calendar railroading.
2. Prefer live-state triggers:
   - territorial control;
   - operation launch/block/skip traces;
   - event-decision log;
   - exhaustion/cohesion/patron state;
   - enclave/supply/readiness state already persisted.
3. Add consequence cards only when the state is player-safe and historically interpretable.
4. Add deterministic sorting and dedupe rules for emitted consequence rows.

Verification:

```powershell
npx.cmd vitest run <focused-consequence-tests> --reporter=dot
npm.cmd run typecheck
git diff --check
```

Add scenario/baseline proof if output behavior changes.

Stop gates:

- new persisted fields without migration/default/validator proof;
- nondeterministic card ordering;
- hidden enemy truth exposed;
- calendar-only railroading where a live predicate is available.

## Determinism and Save-Schema Gates

- Text-only corrections should not alter scenario hashes.
- Any emitted dynamic row must have stable keys, stable sort, and deterministic dedupe.
- New persisted fields require migration/default/validator tests and save fixtures.
- Generated artifacts are not staged unless this plan explicitly owns their refresh.

## UI and Player-Truth Gates

- Codex cards may only show player-safe facts or previously revealed state.
- Avoid duplicate authorities: one canonical source should generate each visible claim.
- New strings require localization keys or a documented localization follow-up.
- GUI branch owns visual placement while active.

## Historical and Sensitive-History Gates

- Use primary/established sources already accepted by the project where available.
- Unsupported claims are removed or packeted, not softened into vague assertions.
- Atrocity/civilian-harm topics require sensitive-history classification.
- Emergent cards should describe conditions and consequences, not reward prohibited actions.

## Roadmap and Ledger Closeout

Closeout must update:

- `docs/plans/COMMAND_BOARD.md` if status or next action changes;
- this plan with completed phase status;
- `docs/PROJECT_LEDGER.md`;
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` only for durable content/source lessons;
- a report under `docs/40_reports/audits/` or `docs/40_reports/implemented/` when a sweep or runtime content change lands.

## Copy-Ready Prompt

```text
Role and objective: You are the Codex/sensitive-history execution agent for AWWV. Execute docs/plans/2026-05-24-codex-sensitive-history-execution-plan.md one phase at a time, starting with Phase 0 inventory unless the orchestrator names a later unfinished phase.

Canon references: Read .claude/napkin.md, docs/plans/COMMAND_BOARD.md, docs/plans/PLAN_EXECUTION_STANDARD.md, this plan, docs/plans/2026-05-18-autonomous-content-codex-arc-bank.md, docs/plans/2026-05-17-two-level-event-surfacing-and-codex-visibility-plan.md, and relevant historical source reports before editing.

Determinism and ledger constraints: No timestamps, randomness, nondeterministic ordering, hidden-truth leaks, or generated-artifact refresh without ownership. Text-only corrections should not move scenario hashes. New persisted fields require migration/default/validator proof. Append docs/PROJECT_LEDGER.md for content, diagnostics, or roadmap changes. Do not edit docs/10_canon/FORAWWV.md.

STOP AND ASK triggers: unsupported historical claim, source conflict, sensitive-history ring 2 or ring 3 content, canon ambiguity, hidden player-truth leak, branch collision, unexplained scenario hash drift, or need for new mechanics/calibration.

Output format and validation: Report inventory path or corrected files, claims changed, source status, risk class, tests run with pass/fail, any skipped gates, docs/ledger updates, and next unfinished phase.
```

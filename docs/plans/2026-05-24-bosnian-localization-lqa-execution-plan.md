# Bosnian Localization LQA Execution Plan

**Date:** 2026-05-24
**Status:** GATED execution-grade plan
**Owner lane:** Localization/readiness lane
**Related command-board row:** P1 Localization Bosnian LQA
**Collision rules:** May audit and fix localization strings. Must not claim production-quality Bosnian without native-speaker review, and must not collide with GUI branch visual/layout work.
**Phase covered:** Bosnian terminology audit, Croatian/Serbian leakage cleanup, UI fit checks, and native-review packet.
**Current next action:** Phase 0 string inventory and Phase 1 automated leakage audit.

## Purpose

Keep the Bosnian localization genuinely Bosnian, mechanically complete, and visually usable. This plan exists because "BCS" completion is not enough: the project must avoid Croatian forms such as `tjedan`, Serbian ekavica, and inconsistent historical or military terminology.

## Non-Goals

- Do not claim final native quality without external/native Bosnian review.
- Do not redesign GUI layout while the GUI branch owns shell polish.
- Do not change gameplay semantics to make localization easier.
- Do not normalize toward Croatian or Serbian variants.
- Do not edit `docs/10_canon/FORAWWV.md`.

## External-Agent Execution Contract

Session start commands:

```powershell
git status --short --branch
rg -n "tjedan|nedelja|mesec|opšt|vreme|lepo|deca|siječ|svib|kolov|rujan|listop|studeni" src data docs tests
rg -n "locali[sz]ation|i18n|bs|Bosnian|BCS|formationNameLocalizations|brigade" src data tests docs/plans
```

Required reading:

- `.claude/napkin.md`
- `docs/plans/COMMAND_BOARD.md`
- `docs/plans/PLAN_EXECUTION_STANDARD.md`
- `docs/plans/2026-05-17-bcs-localization-plan.md`
- brigade-name localization proposal/report if brigade strings are in scope
- latest GUI branch handoff before touching layout-sensitive surfaces

Branch collision rule:

- If GUI branch is active in the same components, restrict work to locale dictionaries/tests or produce a packet for GUI owner.

Global stop rule:

- Stop when a term requires native-speaker judgment, disputed historical naming, or sensitive identity phrasing.

Expected commit boundary:

- One string family or UI surface per commit; do not mix brigade naming, UI chrome, events, and Codex prose.

## Task Boundary Rules

Allowed edits:

- locale dictionaries;
- formation/brigade name localization data;
- localization tests and leakage diagnostics;
- docs/reports/ledger.

Forbidden edits:

- calibration, OOB identity, or formation codes without a separate historical/source plan;
- GUI layout restructure while GUI branch owns it;
- source text historical rewrites that belong to Codex/sensitive-history plan.

Scenario/hash drift:

- Localization changes should not alter scenario output. Stop if hashes move.

Decision packet rule:

- For uncertain Bosnian usage, prepare options with rationale and mark native review required.

## Phase 0 - Inventory

**Owner:** documentation-specialist plus UI/UX developer
**Reviewers:** product-manager, historian for historical names

Steps:

1. Inventory all locale files, fallback strings, brigade/formation localization data, event/Codex strings, and UI hardcoded text.
2. Mark each string family as translated, missing, fallback-English, Bosnian-risk, or native-review-required.
3. Identify tests/diagnostics that already cover the family.

Verification:

```powershell
rg -n "TODO|MISSING|fallback|tjedan|nedelja|mesec|siječ|svib|kolov|rujan|listop|studeni" src data tests
git diff --check
```

Stop gates:

- hidden strings generated at runtime with no extraction path;
- native review needed before choosing a form.

## Phase 1 - Automated Bosnian Leakage Audit

**Owner:** QA engineer
**Reviewers:** documentation-specialist

Steps:

1. Expand leakage lists for common Croatian month/week terms and Serbian ekavica forms.
2. Add or update deterministic localization tests.
3. Keep false-positive allowlists explicit and justified.

Verification:

```powershell
npx.cmd vitest run <focused-localization-tests> --reporter=dot
git diff --check
```

Stop gates:

- leakage test cannot distinguish source/citation text from UI text;
- false positives hide real UI leakage.

## Phase 2 - String Family Fixes

**Owner:** documentation-specialist
**Reviewers:** UI/UX developer, historian when names/claims are historical

Steps:

1. Fix one family at a time: UI shell, settings, Army HQ, Warroom, events, Codex, brigade names, or diagnostics.
2. Preserve stable localization keys.
3. Add missing keys before changing UI code.
4. Keep Bosnian Latin forms and project terminology consistent.

Verification:

```powershell
npx.cmd vitest run <focused-localization-tests> --reporter=dot
npm.cmd run typecheck
git diff --check
```

Stop gates:

- string affects layout but GUI branch owns that surface;
- historical unit name uncertain;
- prose-heavy item needs sensitive-history review.

## Phase 3 - Visual Fit And Native Review Packet

**Owner:** UI/UX developer
**Reviewers:** native Bosnian reviewer/user, product-manager

Steps:

1. Run Electron/browser visual checks for translated high-density screens when GUI ownership allows.
2. Record overflow/truncation issues as actionable UI tasks.
3. Prepare native-review packet with string family, screenshot/context, and questions.
4. Keep production-quality claim gated until review returns.

Verification:

```powershell
npm.cmd run desktop:map:build
git diff --check
```

Stop gates:

- no native review but final quality claim requested;
- visual overflow in critical UI;
- GUI branch collision.

## Determinism and Save-Schema Gates

Localization changes should not affect saves, scenario hashes, or baseline output. If any output moves, stop and investigate before committing.

## UI and Player-Truth Gates

- New strings need locale keys or documented follow-up.
- Translated UI must not expose hidden enemy truth.
- Text must fit in dense Warroom/map controls; overflow is a blocker for affected surfaces.

## Historical and Sensitive-History Gates

- Brigade and place names require source-aware handling.
- Sensitive-history prose belongs to the Codex/sensitive-history plan.
- Do not translate into Croatian or Serbian register when the target is Bosnian.

## Roadmap and Ledger Closeout

Closeout must update:

- `docs/plans/COMMAND_BOARD.md` when gate/status changes;
- this plan with completed phase;
- `docs/PROJECT_LEDGER.md`;
- native-review report or LQA packet when produced.

## Copy-Ready Prompt

```text
Role and objective: You are the Bosnian localization LQA agent for AWWV. Execute docs/plans/2026-05-24-bosnian-localization-lqa-execution-plan.md one phase at a time, starting with the phase named by the orchestrator.

Canon references: Read .claude/napkin.md, docs/plans/COMMAND_BOARD.md, docs/plans/PLAN_EXECUTION_STANDARD.md, this plan, docs/plans/2026-05-17-bcs-localization-plan.md, and any brigade-name localization report if unit names are in scope.

Determinism and ledger constraints: Localization changes must not alter scenario hashes, save schema, or gameplay. Do not stage transient generated files. Append docs/PROJECT_LEDGER.md for localization/data/test changes. Do not edit docs/10_canon/FORAWWV.md.

STOP AND ASK triggers: native Bosnian judgment required, Croatian/Serbian leakage uncertainty, disputed historical unit/place name, GUI branch collision, visual overflow on critical surface, sensitive-history prose, or unexpected scenario/hash drift.

Output format and validation: Report string family, leakage findings, files changed, tests run with pass/fail, native-review gaps, visual-fit issues, docs/ledger updates, and next unfinished phase.
```

# LANE-NIGHTSHIFT-DOC-PROPAGATION-MAY-7

**Date:** 2026-05-07
**Lane:** session-end doc propagation across repo master docs, KNOWLEDGE entries, and canon cross-references.
**Status:** SHIPPED at commit `ebac4fdf`

## Scope

- Phase 1: 6 new KNOWLEDGE entries in `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- Phase 2: Master-doc updates — `docs/40_reports/CALIBRATION_MASTER.md` + `.claude/napkin.md`
- Phase 3: Canon doc cross-references via NEW `docs/40_reports/audits/20260507_CANON_DOC_PROPAGATION_NOTES.md` (NO edits to canon)
- Phase 4: commit + report

## Files Touched (Exclusive Ownership)

- `docs/PROJECT_LEDGER_KNOWLEDGE.md` (extend prepend)
- `docs/40_reports/CALIBRATION_MASTER.md` (new sections)
- `.claude/napkin.md` (curated entries)
- `docs/40_reports/audits/20260507_CANON_DOC_PROPAGATION_NOTES.md` (NEW)
- `docs/40_reports/implemented/20260507_DOC_PROPAGATION_BATCH.md` (NEW; this file)

## Source Commits Referenced

- `759a35cd` Stupčanica name-collision fix (operation_names.ts)
- `d377e07b` RBiH t40 benchmark re-anchor
- `bb0e449e` SRK siege defender morale Phase 0 DDR
- `15c543c9` 5-lane batch closeout backfills + Jajce 3rd Corps AoR + ledger checkpoint
- `be7e0715` NW Bosnia OOB audit (proper fix; replaces Q1)
- `aa115a99` SRK siege-morale calibration audit + minimal fix
- `cb13e605` persona prompt restructure (suppressor clauses + ICTY guidance)
- `ecae99da` jna_withdrawal_1992 consequence block
- `ec837dca` jajce_falls_1992 cascade-morale consequences
- `59805cd6` D2 telemetry wire (api_president/commander/corps_commander → persona_telemetry.emitDecision)
- `bfcc9258` D3 wire-up — president 16→6 verb mapping (PRESIDENT_TO_CANONICAL)
- `deeff462` wire api_president into run_three_commanders per-turn loop
- `8ccdbff8` Revert Q1 hvo_northwest_bosnia engine-gate fix
- `e25c18c3` D1+D2 Claude persona infrastructure + telemetry side-channel
- `03ef9cd4` drina_valley_ethnic_cleansing turn_min 4→8
- `85f43f5a` D-lane DDR Q1-Q7
- `3bab0eb0` Q2 deviation_reason field on compliance evaluator
- `aa30f349` Q3 *_1992 event-name year-suffix audit
- `a2d564e6` API-Directive Bridge (C1 corps-directive context into Claude commander prompt)

## n1728 / n1729 baselines

- n1728 (40w post-5-lane) — hash `79fa407377b40083`, 26/27 anchors, 6/6 benchmarks (post-RBiH t40 reanchor `d377e07b`)
- n1729 (188w post-5-lane) — hash `e85303890ff4b601`, 26/27 anchors, 5/6 → 6/6 benchmarks post-reanchor, §6 floors PASS
- Persona system observable via `data/derived/_debug/d_lane_persona_decisions.jsonl` when env flags set

## Checkpoint Log

- [x] Read PROJECT_LEDGER_KNOWLEDGE head (existing format/style verified)
- [x] Read CALIBRATION_MASTER head (n1572/n1568/n1289/n1622/n1621/Trip Session 2 sections noted)
- [x] Read napkin head (Current State / Pending / Successor lanes confirmed)
- [x] Verified git log against session commits
- [x] Phase 1: KNOWLEDGE prepend (6 entries)
- [x] Phase 2: CALIBRATION_MASTER new sections (n1728 + n1729)
- [x] Phase 2: napkin curation
- [x] Phase 3: canon notes audit file (`docs/40_reports/audits/20260507_CANON_DOC_PROPAGATION_NOTES.md`)
- [ ] Phase 4: commit via pathspec form

## Status: COMPLETE pending commit

## KNOWLEDGE entries landed (one-line summary each)

1. Calibration-overshoot risk: prefer OOB-data audit over engine-gate fixes for "missing-from-scenario" bugs (Q1 revert + Lane 2 NW Bosnia OOB).
2. Bot-pool name-collision with canonical sensitive-history names produces phantom canon-violations (Stupčanica fix; data-not-comment).
3. Persona-grounded LLM commanders don't auto-improve calibration signal quality (D3.3 ~11.5% genuine signal rate finding; SHAPE not QUALITY shifts).
4. Schema mismatch between agent-designed types and engine-canonical interfaces (D1+D2 16-verb vs engine 6-verb; PRESIDENT_TO_CANONICAL bridge pattern).
5. Default-off `if (apiClient)` guards depend on apiClient init — gate apiClient init on env flags too (D3 wire-up bug).
6. Side-effect suppression is NOT a canonical resolution; preserve the original bug for proper fix (Stupčanica appeared absent in n1728 but root cause was untouched).

## Canon doc list with manual-review flags

- **HIGH:** Engine Invariants §6.x — SRK siege defender morale (`bb0e449e` DDR; sign-off chain pending).
- **MEDIUM:** Systems Manual §6.4 + §7.9 — persona-roleplay QA mode advisory text.
- **MEDIUM:** SENSITIVE_HISTORY_DESIGN_GATE §1 Ring 1 — data-not-comment name-pool exclusion implementation note.
- **LOW:** Engine Invariants §11.4 — harness-side telemetry artifact clarification.
- **MANUAL ONLY:** FORAWWV.md — combat doctrine, sensitive-history operations, AI commander, calibration baselines.

## Napkin entry counts

- Added 1 new "Current State" block at top with 6 KNOWLEDGE entries indexed.
- 4 master-files / governing-docs cross-reference rows preserved (no changes to other categories).
- Successor handoffs (3 items) carried forward from prior state.

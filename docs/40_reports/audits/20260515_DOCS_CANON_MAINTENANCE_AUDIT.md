# Docs Canon Maintenance Audit - 2026-05-15

**Lane:** docs/canon maintenance  
**Branch/worktree:** `codex/docs-canon-maintenance` at `F:\A-War-Without-Victory\.worktrees\docs-canon-maintenance`  
**Scope:** Docs-only/audit-only cleanup of stale v0.6/v0.7 downstream-consumer pointers. No code, generated data, canon mechanics, or `FORAWWV.md` edits.

## Result

**Classification:** Closed for the safe agent-owned maintenance lane.

The lane updated live downstream pointers that referenced removed or stale canon versions:

- `docs/00_start_here/docs_index.md`
  - Removed the dead `Peace_Specification_v0_6_0.md` canon-set link.
  - Updated the versioning note from stale `v0.2.0` / `v0.6, v0.7` language to current package `v0.9.6-alpha.1` and active canon `v0.9.0`.
- `docs/CANON_PROPAGATION_NEEDED.md`
  - Retargeted Systems Manual propagation headings from `Systems_Manual_v0_7_0.md` to `Systems_Manual_v0_9_0.md`.
- `docs/30_planning/MULTI_BRIGADE_OPERATION_DESIGN_SPEC.md`
  - Retargeted canon refs from generic Rulebook/System Manual `v0.7` prose to the active `Rulebook_v0_9_0.md` and `Systems_Manual_v0_9_0.md` files.

## Deferred / Not Changed

The sweep found v0.6/v0.7 references that were intentionally left untouched because they are historical provenance, archived-history notes, old ledger entries, false-positive numeric values, or canon-version history rather than live consumer pointers. Examples include:

- `docs/10_canon/CANON.md` notes that explain the decommissioning/removal history of old canon versions.
- `docs/PROJECT_LEDGER.md` historical entries and validation metrics.
- `docs/life_lessons*.md` historical lessons that refer to the version era in which the lesson arose.
- Numeric values such as `0.75`, `0.70`, and `0.7x` that are mechanics/calibration values, not version references.

## Canon / Sensitive-History Boundary

No canon silence or conflict required invention. The work changed pointers to existing active canon docs only. `SENSITIVE_HISTORY_DESIGN_GATE.md` was read for boundary awareness; no sensitive-history wording, rupture rule, Cost Ledger wording, or atrocity representation changed.

`docs/10_canon/FORAWWV.md` was not edited. No new systemic design insight was identified that requires a human-only FORAWWV addendum.

## Verification

Planned verification for this lane:

- `npm.cmd run test:vitest:fast -- -- tests\docs_desktop_v09_truth.test.ts`
- `git diff --check`

Typecheck is not required because this lane changed docs only.


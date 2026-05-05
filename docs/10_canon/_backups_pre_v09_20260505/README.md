# Canon Docs Pre-v0.9 Snapshot Backup

**Snapshot date:** 2026-05-05
**Parent commit at backup time:** `6c39b6a8946d384a0fdc075199fe9a3f9f0fcefe`
**Lane:** `LANE-NIGHTSHIFT-CANON-DOCS-TO-V09`

## Purpose

This directory contains a verbatim plain-`cp` snapshot of every file under
`docs/10_canon/` taken immediately before the v0.7 / v0.6 → v0.9 canon doc
mechanical renames + amendments executed by `LANE-NIGHTSHIFT-CANON-DOCS-TO-V09`.

The snapshot is a safety net only. It exists so that any regression caused by
the rename / amendment pass can be diagnosed against the exact pre-edit content
without reaching for `git reflog` archaeology.

## Contents

Verbatim copies of all 12 canon files as they existed at parent commit
`6c39b6a8946d384a0fdc075199fe9a3f9f0fcefe`:

- `CANON.md`
- `Engine_Invariants_v0_7_0.md`
- `FORAWWV.md`
- `Game_Bible_v0_6_0.md`
- `HISTORICAL_TIMELINE_MASTER.md`
- `Phase_Specifications_v0_6_0.md`
- `Rulebook_v0_7_0.md`
- `SENSITIVE_HISTORY_DESIGN_GATE.md`
- `Systems_Manual_v0_7_0.md`
- `VICTORY_AND_PYRRHIC_SCORING.md`
- `War_Specification_v0_6_0.md`
- `context.md`

## Disposition

These backup copies are NOT canon. They are NOT to be referenced by any tool,
agent, or automated pipeline. The live canon docs (post-rename) are the sole
authoritative copies. This directory may be removed once the v0.9 canon-doc
update is verified and merged.

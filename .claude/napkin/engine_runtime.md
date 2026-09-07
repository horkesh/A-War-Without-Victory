# Engine Runtime Archive Pointer

Full pre-restructure archive: ./full_archive_20260708.md

Use this topic when working on war phases, sector construction, formation spawning, command authority, event system, scenario baselines, or deterministic scripts.

High-value current rule: player-only state is gate-invisible; campaign integrals must be contract tests, not assumptions.

## 2026-09-08 — Expanded decision IDs also need expanded receipt keys

When a player-action builder expands an authored response into per-unit IDs, carry the
authored notification payload under each generated ID as well. The resolver looks up the
chosen ID exactly; copying the original map alone silently loses notifications. Verify the
real resolver's emitted receipts, and use a non-target control when a choice names one unit:
the label and `target_formation_id` alone do not prove scoped mechanical effects. BC06's
decoration notification alias is repaired; faction-wide decoration effects remain unresolved.

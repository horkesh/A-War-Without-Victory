## 2026-04-03 - Final unresolved warning ownership and stale sub-segment clearing

### Summary
- Moved sector unresolved warning ownership to the final canonical unresolved set in `buildCorpsFrontSectors(...)` instead of emitting unresolved-style warnings from intermediate classification state.
- Removed the early `PENDING_ENCLAVE_REVIEW` warning from `classifyBrigadesByTerritory(...)`.
- Cleared stale `assigned_sub_segment_id` whenever sector sync rebuilds formation assignments, so brigades that leave sector ownership no longer look half-frontline.

### Files changed
- `src/sim/combat/brigade_assignment.ts`
- `src/sim/combat/corps_front_sectors.ts`
- `tests/brigade_territory_reconciliation.test.ts`

### Why
- The sector pipeline already had a canonical final unresolved set (`state.military.unresolved_sector_brigades`), but unresolved warnings were still being emitted earlier from classification-stage logic.
- That created mixed authority:
  - one lane said "pending enclave review" during assignment,
  - another lane later decided the final unresolved truth.
- Separately, brigades that lost sector ownership could keep stale `assigned_sub_segment_id`, which made recalled reserves and dropped brigades look partially frontline-owned even when sector truth had already moved on.

### What changed
- `buildCorpsFrontSectors(...)` now emits unresolved warnings only after:
  - sector sync
  - final unresolved-set collection
- `classifyBrigadesByTerritory(...)` no longer emits `PENDING_ENCLAVE_REVIEW`.
  - Same-faction same-component rescue remains a real mechanic.
  - The early warning does not.
- `syncSectorAssignmentsToFormations(...)` now clears `assigned_sub_segment_id` before rebuilding sector ownership.
  - Assigned brigades get fresh frontline sub-segment IDs later during sub-segment assignment.
  - Brigades that are no longer sector-owned no longer retain stale frontline residue.

### Evidence
- Focused tests stayed green after the ownership shift.
- The targeted stale-sub-segment regression now proves a brigade that falls out of sector ownership loses its stale frontline sub-segment residue immediately at sync time.
- This aligns the warning stream with the canonical final unresolved set instead of letting intermediate diagnostics impersonate final truth.

### Verification
- `node .\node_modules\vitest\vitest.mjs run tests\brigade_territory_reconciliation.test.ts tests\commander_driven_brigade_assignment.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

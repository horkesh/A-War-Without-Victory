# Operation Sana sequence-preservation test — 2026-10-02

**Verdict: negative.** Keeping the authored Sanski axis intact does not make its first objective actionable at the measured t176 boundary. No production policy was changed or adopted.

The focused test in `tests/sector_offensive_planning_objective_reconciliation.test.ts` uses the retained n30 boundary controllers and live, bidirectional edge: RS Hadžići next to HRHB Prekaja. It models both 506th and 517th at Bihać, in transit to Otoka, and an explicit allied RBiH–HRHB state. The 14 authored objectives begin at RS-held Donji Dubovik; the first eleven have no approach in the retained trace (`sana_boundary_177w_result.md`).

| Policy at t176 | Reconciliation | Sanski-axis objectives | Readiness at measured brigade positions |
| --- | --- | --- | --- |
| Existing default | `valid` | Pruned to Hadžići, Ključ, Krasulje | **false**; brigades are still moving toward Otoka |
| `preserve_objective_sequence: true` | `valid` | All 14 retained; Donji Dubovik still first | **false**; current objective has no approach |
| Existing default, no Prekaja contact | `invalidated` | Authored axis remains listed | Not tested after invalidation |

The operation-level sequence flag can keep a waypoint on a list, but it cannot create a lawful front or put assigned brigades on its approach. It also applies to all axes on that operation, so enabling it as an Operation Sana fix would broaden the change beyond the Sanski axis. This test does not establish later readiness, actual attack/order emission, restored Sanski captures, October checkpoint acceptance, or a new production candidate. A future proposal must reconcile the owner's **Ključ-before-Sanski Most** chronology with a lawful approach to the Sanski belt, rather than rely on list preservation alone.

OpenCode made a test-only edit. Its first fixture placed brigades at Prekaja as an unmarked optimistic counterfactual; an independent Sol reviewer rejected that provenance. OpenCode corrected the fixture to the measured Bihać→Otoka transit state; the same reviewer verified the correction. Corrected focused Vitest: **13/13, exit 0**. TypeScript `--noEmit`: **exit 0**. `git diff --check`: **exit 0** (existing line-ending warning only). Raw output and exact exits: `sana_sequence_policy_test_correction_{focused,typecheck,diff_check}.*` in this directory. No full suite, prefix, 188-week campaign, catalog edit, painted-control change, map refresh, merge, or baseline adoption was performed. Farz P-A §6 remains **NO-MERGE**.

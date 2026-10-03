# Sana Ivanjska candidate-only provenance (2026-10-03)

The checkout was already heavily dirty. This receipt isolates the intended catalog delta from the pre-edit candidate described in logs/sana_ivanjska_joint_gateway_pre_edit_plan.md; it is not a whole-worktree cleanliness claim.

Catalog: src/sim/combat/operation_opportunity_catalog_5th_corps.ts SHA256 35577CF555869989F22321A9C56453793E9F9F65F03E52468DD781EA57D7DE94
Resolver fixture: tests/attack_resolution_osid_intel_friction.test.ts SHA256 840446E4110490A9CAA7F22C73B0F31FA0028D449D9D39171A0FA4EDF424A9FB
Convergence fixture: tests/sana_ivanjska_joint_gateway_candidate.test.ts SHA256 78C410BFD63AE589128B5502E963058C889334672414C034A5F31504B895BBFF

Candidate production data delta only:
```diff
 const SANSKI_KLJUC_OBJECTIVES = [
+    'op:bosanska_krupa:ivanjska_2',
     'op:bosanska_krupa:donji_dubovik_2',
 ...
 axis_id: 'sana_sanski_most_kljuc',
-staging_osid: STAGING_IVANJSKA,
+staging_osid: STAGING_KRUPA_OTOKA,
```

Existing prior changes in the catalog, including the disjoint axis roster and `preserve_objective_sequence`, are outside this candidate. The new resolver test is the block named `aggregates hostile Ivanjska gateway attacks from disjoint Krupa and Sanski axes` in the test file; its manually supplied orders prove resolver aggregation and ordinary-combat flip, not operation order generation. The separate convergence fixture proves both axes advance after that flip.

No production code was edited by the two focused evidence corrections. Retained n36 remains NO-GO; this candidate has no prefix/full-suite/188-week measurement.

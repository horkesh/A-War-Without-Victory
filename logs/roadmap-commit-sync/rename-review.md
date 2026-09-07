# Independent merge review — ARBiH brigade honorific names

**Review date:** 2026-09-07  
**Reviewed branch:** `r7-arbih-honorific-names` (`878cbb34b` production change; `272dfc34d` plan; later docs-only status commit `1ddf6f01a`)  
**Integration target reviewed:** `main` through `558f253a2`  
**Verdict:** **GO after manual documentation conflict resolution.** No production, data, localization, or test blocker was found.

## Scope and semantic proof

The production commit is a label correction with intentionally changed display/save/narrative bytes, but no changed brigade identity or mechanical input:

- `data/source/oob_brigades.json`: exactly 33 leaf changes, all `name`.
- `data/source/oob_brigade_designations.json`: exactly 99 leaf changes, the same 33 IDs times `designation_code`, `english_gloss`, and `official_bcs`.
- `data/derived/startup/apr_1992_initial_save.json`: exactly 26 leaf changes, all `military.formations.<id>.name`. The other seven corrected source brigades have `available_from` 2, 4, or 8 and are correctly absent from the turn-0 snapshot.
- The 33 IDs, factions, corps/home placement, availability, personnel/equipment, `distinction_potential`, `honor`, and all other source fields are unchanged. The corrected set remains exactly 14 `tier_1` and 19 `tier_2` rows; none has a source `honor` field. Catalog `unit_type`, `echelon`, and `source_basis` are unchanged, and all 33 catalog English glosses match the corrected source names.

The correct safety claim is therefore **control/combat/mechanics neutral**, not byte-identical output. Formation names are copied into spawned state and used in AAR/war-story narrative, so save and narrative strings correctly change. Targeted source review found no comparison or gate on brigade/formation `name`; operation-name comparisons are unrelated types. Internal brigade IDs remain untouched and continue to own operation, calibration, and test references.

`designation_code` has no simulation/state consumer. Outside data/docs, the designation catalog is imported by `formationNameLocalizations.ts`, included by the map Vite asset classifier, and inspected by localization tests. `getFormationUnitType` receives unchanged catalog `unit_type` for every source OOB brigade because the localization contract test proves complete one-row-per-ID coverage.

## Historian, formation, and canon lenses

The branch makes no new honor award or formation-identity decision. It completes the already accepted repository model recorded in `docs/40_reports/implemented/20260308_DISTINCTION_POTENTIAL_OOB_DECORATION_OVERHAUL.md`: `Slavna`/`Viteška` are war-earned titles, not April-1992 grants, and the historical recipient set is represented through `distinction_potential`. The exact 14/19 mapping remains unchanged. The sole honorific-only English row becomes the structurally valid generic `727th Brigade`; its BCS catalog row becomes `727. brigada`. No formation is added, removed, retyped, moved, resized, or re-keyed.

Canon remains unchanged: the April-1992 war initialization and deterministic formation/OSID state contracts are preserved (`War_Specification_v0_9_0.md` §§1, 4–5; `Rulebook_v0_9_0.md` §§4.2, 5.3–5.5). The branch does not touch phase logic, control writers, combat inputs, or persisted schema. No FORAWWV thesis change is implicated.

The original plan named Historian and Formation-expert confirmation in step 1, but the two original commits did not record separate specialist receipts. This review covers those lenses against the accepted distinction-potential decision and exact semantic diff; it does not invent missing historical receipts. The updated plan/roadmap should record the actual independent review evidence.

## Fresh checks

- `npx.cmd vitest run tests/brigade_name_localization.test.ts tests/recruitment_engine.test.ts tests/standing_og_defense.test.ts --reporter=dot` — exit 0; 3 files, 42/42 tests passed (7 + 34 + 1).
- `npm.cmd run desktop:startup-snapshot:check` — exit 0; committed April-1992 snapshot reported current.
- `npm.cmd run ci:structural-fingerprint:check` — exit 0; expected fingerprint `cd5582f4a945842e` matched. Despite its check-style name, this helper internally executed a 40-week run and produced ignored branch artifact `runs/apr1992_definitive_40w__21b49604f90cfc2f__w40_n3`; no tracked branch file changed. No additional campaign was run.
- `git diff --check be5d76904..878cbb34b` — exit 0.
- Branch status after checks and docs-only status commit: clean.

## Merge handling

The common base is `be5d76904`. Current divergence at review close is four main commits versus three branch commits. `git merge-tree be5d76904 558f253a2 1ddf6f01a` reports conflicts in exactly:

- `docs/PROJECT_LEDGER.md`
- `docs/plans/MASTER_ROADMAP.md`

Resolve both by retaining main's current reconciliation/BC04/BC09/BC10 content and appending the branch's completed rename receipt/link. Do not take either document wholesale from the branch. The branch's former uncommitted roadmap edit was valid: it replaced stale `PLANNED, NOT YET IMPLEMENTED` text with compact implemented/unmerged status and is preserved in `1ddf6f01a`; incorporate that status into main's current roadmap rather than reverting newer main content.

No other committed path overlaps the current main range, and the production/data/test changes are disjoint from the approved BC04 P2 files. After resolving the two documentation files, rerun the same three focused tests and startup snapshot check on the merged tree. No 188-week recalibration is warranted by this label-only packet.

# Integrated full-suite fixture diagnosis

Date: 2026-09-12
Source reviewed: frozen candidate `933132e90`.
Scope: the two failures in `tests/ui/historical_operation_map_focus.test.ts` and the startup-snapshot drift surfaced by `tests/desktop_sim_bundle_smoke.test.ts`. The separate empty-sector coverage failure is intentionally excluded. No tracked file, build, campaign, or snapshot was changed.

## Verdict

**GO for two bounded fixture/generated-artifact corrections. No owner decision is required.**

1. The historical-operation map-focus test retains the old four-objective/two-staging/four-formation Cerska-Kamenica definition. The candidate deliberately and historically expands that authored operation to ten objectives, three staging OSIDs, and nine formations. The UI still reads the canonical triggered-operation definition, sorts and deduplicates its references, and attaches exactly the same normalized target to the dossier. This is a stale exact fixture, not an implementation/UI focus defect.
2. The baked April 1992 startup save was not regenerated after the candidate added startup-visible authored operations and two deterministic pre-staging movement orders. The canonical builder produces only seven structural differences, all attributable to those accepted authored definitions. This is a stale one-way generated artifact, not evidence that the builder or desktop bundle should be weakened.

## Retained failures

Evidence: `logs/roadmap-integration-20260912/full-suite.log`.

- `tests/ui/historical_operation_map_focus.test.ts`: 2 failed of 5. The first exact list assertion fails at line 49; the dossier field-target assertion fails at line 148. The other three contract tests pass, including stable ASCII sort/dedup and player-safe participant presentation.
- `tests/desktop_sim_bundle_smoke.test.ts`: 1 failed of 1 because `tools/desktop_bundle_sim.mjs` correctly aborts when `validateStartupSnapshot` detects drift. The guardrail tests that prove missing/stale snapshots fail loudly both pass.

## Historical-operation focus correction

`buildHistoricalOperationAuthorizationDetails` resolves the proposal against `_TRIGGERED_OPS`, then obtains objectives, staging OSIDs, and formation IDs from the authored definition with `Set` deduplication and `strictCompare` ordering. `buildPresidentialDecisionRoomView` attaches those same arrays to the selected dossier's `fieldInspectionTarget`. The expected UI contract is therefore the full authored plan, not a hand-maintained subset or only currently available formations.

The candidate's Cerska-Kamenica definition and the implementation report/ledger agree on the expansion: the Cerska axis continues through Pobuđe and Ježeštica; the Kamenica axis includes Obadi and stages at Brezovice; the Skelani cutoff stages at Sebiočina and follows Pomol, Luka, and Ljeskovik; Main Staff elites and supporting Drina formations are explicitly rostered. The report states ten captured objectives and the ledger records the graph-valid chains and elite participation. Updating the fixture preserves this product contract rather than copying an incidental runtime result.

Update both exact expectation blocks in `tests/ui/historical_operation_map_focus.test.ts` to these sorted lists:

```text
objectiveOsids (10)
op:bratunac:jezestica_2
op:bratunac:pobudje_2
op:srebrenica:ljeskovik_2
op:srebrenica:luka_2
op:srebrenica:obadi
op:srebrenica:osmace_2
op:srebrenica:radovcici
op:srebrenica:sulice_2
op:vlasenica:cerska_2
op:vlasenica:pomol_2

stagingOsids (3)
op:srebrenica:brezovice_2
op:vlasenica:grabovica
op:vlasenica:sebiocina

formationIds (9)
rs_1st_birac
rs_1st_bratunac
rs_1st_guards_motorized
rs_1st_milii
rs_1st_podrinje
rs_1st_zvornik
rs_5th_podrinje
rs_65th_protection_motorized_regiment
rs_visegrad_brigade
```

Do not replace the exact expectations with values derived from `_TRIGGERED_OPS` inside the test; that would make the test tautological and stop it from detecting an accidental dossier-definition drift.

Cheapest correction check:

```powershell
npx.cmd vitest run tests/ui/historical_operation_map_focus.test.ts --reporter=dot
```

Pass criterion: 5/5. No UI build or campaign is needed for this fixture-only change.

## Startup-snapshot correction

The tracked artifact `data/derived/startup/apr_1992_initial_save.json` is unchanged from the pre-integration source. Current normalized artifact:

- 1,371,523 bytes
- SHA-256 `5a68253b783517b7295d91128f0b80fb85189735747480533287889f7b57e3b7`

The canonical `buildStartupSnapshotPayload` result at `933132e90` is deterministic builder truth:

- 1,372,160 bytes
- SHA-256 `45bcfd9746aabaa85e49d2ce2a44efffdd36ecb7a53966edd450ed419f67a3bf`

An in-memory recursive comparison found seven differences and no unrelated state drift:

1. `military.brigade_movement_orders` is added with two `authored_preplanned` column orders: `rs_bilea_brigade -> op:gacko:izgori` and `rs_gacko_brigade -> op:kalinovik:kalinovik_2`.
2. `arbih_3rd_corps.queued_operations` grows from one to three, adding `Central Bosnia Counteroffensive` and `Battle of Bugojno`.
3. `arbih_4th_corps.queued_operations` adds `Operation Neretva '93`.
4. `hvo_tomislavgrad.queued_operations` adds `Prozor–Rama Line Counterattack`.
5. `vrs_sarajevo_romanija.queued_operations[1]` changes from `Operation Trnovo` to the candidate's authored `Operation Lukavac 93`.

The first item is one object-level difference and the four queued-operation owners account for the other six recursive differences. These values are the expected consequence of accepted pre-planned operation/pre-staging source changes; no unexplained personnel, control, formation, sector, officer, or save-shape delta was found.

The sole supported writer is `tools/scenario_runner/build_startup_snapshot.ts`, which calls `writeStartupSnapshot`; `src/scenario/startup_snapshot.ts` loads `data/scenarios/apr1992_definitive_188w.json`, calls `buildScenarioStartupState`, serializes canonical state, and normalizes CRLF to LF. Do not hand-edit the JSON and do not bypass the bundle's stale-artifact abort.

Safe correction and cheapest verification sequence, with the candidate source frozen and `AWWV_STARTUP_SNAPSHOT_OVERRIDE_APR_1992` unset:

```powershell
Remove-Item Env:AWWV_STARTUP_SNAPSHOT_OVERRIDE_APR_1992 -ErrorAction SilentlyContinue
npm.cmd run desktop:startup-snapshot:build
npm.cmd run desktop:startup-snapshot:check
npx.cmd vitest run tests/startup_snapshot_contract.test.ts tests/startup_snapshot_artifact_ownership.test.ts tests/desktop_startup_snapshot_guardrails.test.ts tests/desktop_sim_bundle_smoke.test.ts --reporter=dot
git diff --check -- data/derived/startup/apr_1992_initial_save.json tests/ui/historical_operation_map_focus.test.ts
```

Before commit, inspect the generated snapshot diff and require the seven-difference shape above. Pass criteria: snapshot check exit 0; focused startup/bundle tests pass; bundle builds and loads in CommonJS mode without warnings; generated artifact remains canonical after deserialize/serialize; source HQ, calendar, containment, command-parent, turn-zero control-history, and sector-truth guardrails remain green.

Because this artifact is a production desktop startup input and its bytes intentionally change, commit it with the exact candidate source and rerun only the affected full-suite shards after both this correction and the separately owned coverage correction are complete. No scenario campaign or baseline refresh is justified by these fixture repairs themselves; the already planned candidate 188-week validation remains the behavioral gate.

## April 1994 hover-map merge-map path correction

The `tests/generate_apr1994_hover_map.test.ts` failure is a routine integration defect with a single canonical correction. `tools/generate_apr1994_hover_map.cjs:15` attempts to load `tools/micro_osid_merge_map.json`; that path does not exist in the candidate and is neither tracked nor an ignored artifact that must be restored. The resulting `ENOENT` occurs before the test reaches its hover-map behavior assertions.

The sole retained merge map is `data/derived/operational/micro_osid_merge_map.json` (1,706 bytes, 32 mappings, SHA-256 `f5a9dd666a053f79ceca072100b3bfbcae8614049fa1bff3dd9b2f455ea83b8a`). Its ownership and consumers are explicit:

- `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md:41` names `tools/merge_micro_osids.cjs` as writer and the UI control builder and calibration map tools as consumers.
- `tests/map_derived_artifact_ownership.test.ts:26` inventories that exact retained path.
- `tests/operational_osid_universe_invariant.test.ts:34`, `src/ui/map/map/builders/buildControlGeoJSON.ts:2`, `tools/calibration_timeline.mjs:184`, and `tools/build_calibration_map_html.mjs:36` all load the same canonical path.
- `tools/merge_micro_osids.cjs:151` writes it there and reports that path at line 155.

History explains why the merged tree exposed the defect. Calibration commit `80d87aac1` introduced the hover tool with the tools-local lookup. Main commit `26f530ce2` independently moved the merge map from `tools/` into `data/derived/operational/` and repointed the then-existing consumers. Neither commit is ancestral to the other in the two source histories, so the integration produced no textual conflict in this newly arriving file even though its path assumption was stale. This is a semantic merge reconciliation missed at `7382f26f8`, not a missing generated-input problem.

**GO for a one-line source correction; no owner or canon decision is required.** Replace the lookup with a path resolved from the script directory to the owned retained artifact:

```js
const mergeMap = readJson(path.resolve(__dirname, '..', 'data', 'derived', 'operational', 'micro_osid_merge_map.json'));
```

Resolving from `__dirname` preserves invocation from any working directory. Do not copy, generate, or symlink a second map under `tools/`; that would create an unowned duplicate truth. The existing test's fixture OSID (`op:lopare:lopare_selo_2`) is not one of the 32 merge children, so the canonical map does not otherwise alter that test's expected output.

Cheapest correction check:

```powershell
npx.cmd vitest run tests/generate_apr1994_hover_map.test.ts --reporter=dot
```

Pass criterion: 1/1, including the existing controller-color and script-order assertions. Then run the narrow ownership/invariant group once to confirm the correction uses the governed artifact:

```powershell
npx.cmd vitest run tests/generate_apr1994_hover_map.test.ts tests/map_derived_artifact_ownership.test.ts tests/operational_osid_universe_invariant.test.ts --reporter=dot
git diff --check -- tools/generate_apr1994_hover_map.cjs
```

No build, campaign, snapshot refresh, or full-suite retry is warranted for this path correction alone. Include it with the already queued routine fixture corrections and rerun the affected suite shard only after the frozen full suite finishes.

## Q2 faction-branch rejection

The full-suite failure is `tests/q2_deviation_reason.test.ts` T7b at line 388. Q2 itself is 8/9: its behavioral faction-symmetry test T7 passes, as do persistence, reason-code, and determinism checks. T7b scans the two Q2 mechanism-owner files after stripping comments and rejects four later `faction === 'RBiH'` expressions in `src/sim/combat/commander/briefing.ts` (lines 576, 580, 583, and 854). They were introduced by calibration commit `3b01c2ba3`; that commit is on the calibration branch and not main. The original Q2 contract and guard come from `3bab0eb01`.

This is not evidence that deviation-reason computation became faction-asymmetric: the caught code belongs to the later Croat-Bosniak bilateral campaign-intent path, while Q2's reason is still derived from the faction-symmetric persisted overlay. The checker is syntactically broader than its immediate Q2 concern because `briefing.ts` contains both features. Its acceptance must nevertheless remain intact. `docs/10_canon/FORAWWV.md:312-313` makes the broader reason explicit: interpretation, persistence, briefing overlay, and corps-role gating use the same code paths for all factions, while asymmetry belongs in data. The Q2 closeout repeats that the briefing reader has no per-faction string-equality branch.

The approved bilateral doctrine is itself intentionally asymmetric and remains authoritative: `Systems_Manual_v0_9_0.md` §6.6a states that open RBiH-HRHB war gives RBiH initiative and HVO a defensive stance; the RBiH corps receives live HVO objectives and the HVO corps receives none. That policy is already encoded upstream by `reassignCorpsForBilateralWar` and `createBilateralDirective`: the selected command carries `status_reason=rbih_hrhb_bilateral_front_diversion`, an offensive/defensive `stance`, and a populated/empty `directive.offensive_targets`. The briefing currently re-decides the same policy from the faction literal. That duplicate decision is unnecessary and violates the general data-driven briefing/corps-role boundary even though its present output matches the intended doctrine.

**GO for a bounded data-driven correction; no owner or canon decision is required. Do not weaken or exempt T7b.** In the special bilateral block, read and sort `corpsCommand.directive.offensive_targets` for every faction, then derive a local attacker boolean from whether that governed target list is non-empty. Use that boolean for `role` (`primary`/`contain`) and `stanceCeiling` (`offensive`/`defensive`). Derive the emitted `briefing.bilateral_offensive` from the same special status plus the resulting non-empty `campaignIntent.offensiveTargets`, rather than from `faction === 'RBiH'`.

For valid producer output this is behavior-preserving:

- RBiH diverted corps: non-empty live HVO targets → `primary`, offensive ceiling, `bilateral_offensive=true`.
- HVO diverted corps: empty targets → `contain`, defensive ceiling, `bilateral_offensive=false`.
- Any other corps: no matching status → the ordinary campaign-intent path and `bilateral_offensive=false`.

This keeps the historical asymmetry at its approved producer and makes the shared briefing consumer obey the directive it receives. The existing producer tests already pin RBiH's populated target list and HVO's empty list. Add or extend a focused `buildBriefing` regression in `tests/commander/briefing_campaign_intent.test.ts` to assert both resulting briefing shapes; this prevents a future edit from satisfying the grep while silently changing the doctrine.

Cheapest correction verification:

```powershell
npx.cmd vitest run tests/q2_deviation_reason.test.ts tests/commander/briefing_campaign_intent.test.ts tests/bilateral_formation_diversion.test.ts tests/mobilization_bot_stance.test.ts --reporter=dot
git diff --check -- src/sim/combat/commander/briefing.ts tests/commander/briefing_campaign_intent.test.ts
```

Current expected total before adding the focused regression is 39/39 (Q2 9, briefing 16, bilateral diversion 5, mobilization stance 9); increase the pass count by the number of added cases. No campaign, build, snapshot regeneration, or general full-suite rerun is justified by this behavior-preserving consumer cleanup alone. The already running preserved 40-week reproduction must finish against frozen `933132e90` before tracked corrections are applied.

## Independent review of the first three corrections

Reviewed after the preserved full suite finished, before the separately owned Q2 and coverage work. The tracked correction set at review time contained exactly:

- `tests/ui/historical_operation_map_focus.test.ts`
- `tools/generate_apr1994_hover_map.cjs`
- `data/derived/startup/apr_1992_initial_save.json`

**Verdict: GO for all three corrections.** No finding requires another edit in this set.

The map-focus fixture retains independent exact expectations and now matches the authored Cerska-Kamenica definition: 10 sorted objective OSIDs, 3 sorted staging OSIDs, and 9 sorted formation IDs in both the authorization-detail and dossier-field-target assertions. It was not weakened into an expectation derived from the implementation.

The hover-map generator now resolves `../data/derived/operational/micro_osid_merge_map.json` from `__dirname`. This is equivalent to the reviewed segmented `path.resolve` form, remains independent of the caller's working directory, and uses the sole governed retained artifact. No duplicate map was introduced under `tools/`.

The regenerated startup artifact is valid JSON and independently hashes to SHA-256 `45bcfd9746aabaa85e49d2ce2a44efffdd36ecb7a53966edd450ed419f67a3bf` at 1,372,160 bytes, exactly matching the predicted normalized builder output. `logs/roadmap-integration-20260912/startup-diff.json` records the expected five grouped paths: the two authored pre-staging movement orders and four corps queue changes, with the changed-length 3rd Corps array grouped as one path. The earlier seven-count description counted recursive array entries; the corrected grouped-path verifier changes only the measurement and does not conceal or alter artifact content.

Focused evidence: `logs/roadmap-integration-20260912/fixture-correction-tests.log` records **8/8 files, 39/39 tests passed** in 29.63 seconds:

- historical operation focus 5/5;
- hover-map generator 1/1;
- map artifact ownership 1/1 and operational OSID universe 8/8;
- startup snapshot contract 19/19 and artifact ownership 1/1;
- desktop startup guardrails 3/3;
- desktop bundle smoke 1/1, including CommonJS build/load.

`git diff --check` is clean for all three tracked files. These checks cover the broader directly affected surfaces: exact UI focus payloads, governed map-data resolution, canonical snapshot serialization/load, missing/stale snapshot rejection, and desktop bundle consumption. No further isolated test, build, snapshot generation, or campaign is required for these three corrections. Final integration validation still must close the separately owned Q2, coverage, and runtime-timeout categories and run the already authorized candidate campaign gates; those are not defects in this reviewed correction set.

## Independent review of the Q2 correction

**GO.** The correction implements the previously reviewed data-driven boundary without weakening T7b or changing the approved bilateral doctrine. `collectCampaignIntent` now sorts the governed directive targets once and derives `primary`/`contain` plus the offensive/defensive ceiling from whether that list is populated. `buildBriefing` derives `bilateral_offensive` from the bilateral status and the same resulting target list. The shared briefing consumer therefore contains no faction literal for this decision; the approved asymmetric producer remains responsible for giving the attacker populated targets and the defender none.

The focused regression exercises both governed shapes, checks deterministic target/hold ordering, and now uses the canonical `CorpsStance` values `offensive` and `defensive`. Evidence: `logs/roadmap-integration-20260912/q2-correction-tests.log` records **4/4 files, 40/40 tests passed**, exit 0, covering the Q2 guard, briefing intent, bilateral diversion producer, and mobilization stance. This is sufficient targeted correction verification; the broader suite remains an integration gate for the complete candidate rather than a reason to repeat this review.

Targeted verification after correcting the fixture values: `logs/roadmap-integration-20260912/q2-fixture-correction-tests.log` records **2/2 files, 26/26 tests passed**, exit 0, covering the amended briefing regression and the unchanged Q2 static/behavior guard. The earlier minor fixture finding is resolved; the Q2 correction has no remaining review finding.

## Proposed frontline-coverage contract replacement

The preserved clean 40-week evidence supports an acceptance decision, not an engine-defect finding. All nine sectors with more than three edges and zero assigned brigades retain `unstaffed_front:true`. The donor classification finds otherwise eligible same-corps formations, while the connectivity receipt places every target component outside every eligible donor component through the production faction-controlled movement graph. A separate in-memory check deleted every saved marker and reran production `annotateUnstaffedFrontSectors`; all nine markers were restored and the staffable-violation list was empty. The diagnostic also established that no eligible donor depended on a missing `corps_id`, so the evidence did not omit formations whose command ownership is obtained through the canonical fallback.

The numeric cap of two in both 40-week tests was accepted while passive rear-pocket consolidation could remove these positions. Its removal was owner-approved, and Engine Invariant §14.9 requires truthful explicit marking when no legal donor can reach rather than teleporting a brigade. Retaining the old cap would reject lawful behavior based solely on the number of disconnected pockets. Replacing an accepted threshold still requires the owner's explicit decision.

The exact proposed two-file diff is `logs/roadmap-integration-20260912/proposed-coverage-contract.patch`; `git apply --check` succeeds with exit 0 against the current candidate. It changes both `tests/integration_run_diagnostics.test.ts` and `tests/integration_deployment_health.test.ts`. Each test continues to expose the raw gap count and full list, requires every saved gap to carry the explicit marker, deletes all markers from a clone, recomputes them with the production function and actual final formations/contact graph, and requires zero staffable gaps. The log assigns `no_reachable_legal_same_corps_donor` only when recomputation proves that result; a failed recomputation is visibly labeled `reachable_or_staffable_violation`. It also requires a nonempty contact graph, preventing missing graph data from becoming a false isolation proof.

Owner decision requested: approve replacing “at most two large empty sectors” in both 40-week diagnostics with “every large empty sector must retain explicit unstaffed truth and independently recompute to no reachable legal same-corps donor; preserve the raw count and list.” If approved, the smallest verification is `git apply --check`, typecheck, and the two affected integration tests in the next already-required full-suite run. No additional campaign is needed to decide or implement this test-contract change.

## Checkpoint patch format

The stored proposal uses zero context to keep the committed patch free of whitespace-only context lines. Its proposed test contents are unchanged from review. Validate or apply with `git apply --unidiff-zero` (add `--check` for validation); the check passes for both files. The original context patch and unchanged raw test logs remain in the ignored evidence directory.

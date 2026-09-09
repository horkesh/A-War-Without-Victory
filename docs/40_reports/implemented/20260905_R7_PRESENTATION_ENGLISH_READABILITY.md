# R7 presentation and English readability

Status: completed scope reviewed and global Vitest/player-experience checks passed;
owner approved date-only 3.9 acceptance and baseline investigation. Date verification and
baseline/clean-run acceptance remain open.

The [registered amendment](../../plans/2026-09-05-r7-presentation-and-english-readability-amendment-plan.md)
owns this renderer-only work. Branch: `codex/r7-english-readability`. The control commit is
`16389f6c9c66f13517806bae30ac78165563b66e`. No simulation, state, save, scenario,
calibration, dependency, baseline, canon, IPC or owner artwork change is authorized here.

## Implemented scope and review

| Slice | Result | Evidence |
|---|---|---|
| Phase 1 English wording | Staff voice, explicit weeks/settlement units, missing-report language and critical-queue domains; full reserve roster, historical caveat and decision-cost precision preserved | `46961f056`; independent Canon/Modern Wargame GO; `phase1-review.log` |
| Phase 2 display names | Chronicle and formation labels reuse authoritative names; authored numeric operation names retained; unknown municipality remains an em dash | `684920edc`; independent Historian/code GO; `phase2-review.log` |
| Phase 3 layout, items 3.1–3.8 | Acronyms, directive labels, advance labels, decision filters/receipts, corps packing and scroll cues; Codex final text clears its fade | Independent code/QA GO after targeted correction; `phase3-review.log`; per-file commit receipts |
| Phase 3.9 whiteboard | Owner accepted date-only readability; live geometry shows fixed-header occlusion for RS/HRHB at 1920 and RBiH at 1366 | Gap-only implementation remains blocked; no 3.9 source change |
| Phase 4 numbers | Compact million displacement, consistent repeated military casualty formats and personnel displays; exact civilian deaths and missing/captured counts retained | `f6b1b63d6`; independent GO after civilian precision correction; `phase4-review.log` |
| Phase 5 component copy | Shared severity labels, RBiH casing, visible lock explanation, density once, single-subsegment suppression, subdued missing-intel prose and week-based tenure | `1bc1f7369`; independent Narrative/Modern/code GO after targeted corrections; `phase5-review.log`, `final-review.log` |

All receipt paths below are relative to `logs/r7-english-readability/`. Logs and validation
fixtures remain local evidence; this report is the single designated implementation report.

## Verification receipts

| Command/check | Exit/result | Receipt |
|---|---|---|
| Phase 1 `npm.cmd run test:vitest -- tests/ui` | 0; 344 files, 2,939 tests | `phase1-ui-final.log` |
| Phase 1 typecheck/map build | 0/0 | `phase1-typecheck.log`, `phase1-final-map-build.log` |
| Phase 2 full UI boundary | 0; 345 files, 2,944 tests | `phase2-ui.log` |
| Phase 2 typecheck/map build | 0/0 | `phase2-typecheck.log`, `phase2-map-build.log` |
| Phase 2 exhaustive display-name replay enumeration | 0; 188 frames and three faction views; zero missing names/raw tokens | `phase2-display-name-enumeration-run.log`, `.json`, `.log` |
| Phase 3 interim full UI boundary | 0; 352 files, 2,951 tests; predates final spacing/padding corrections | `phase3-ui-final.log` |
| Phase 3 targeted spacing/padding checks | 0; 20 tests each | `phase3-advance-spacing-green.log`, `phase3-codex-padding-green.log` |
| Phase 4 interim full UI boundary | 1; 2,960 pass, one newly introduced civilian-precision RED test fails; not final-source acceptance | `phase4-ui.log` |
| Phase 4 corrected focused boundary | 0; six files, 65 tests | `phase4-civilian-precision-green.log` |
| Phase 4 corrected typecheck | 0 | `phase4-final-typecheck.log` |
| Toolbar verifier with RESERVE and REVIEWS present | 0; FULL coverage at all six specified widths | `toolbar-fit.log` |
| Three-resolution metric, acronym, directive and corps geometry | 0; no clipping or intersection in tested targets | `phase3-text-geometry-final.log`, `phase3-directive-geometry.log`, `phase3-geometry.log` |
| Codex maximum-scroll final-line check | 0 at all three resolutions; final text 3.5px above fade | `codex-bottom-final.log` |
| Repeated War Summary military counts in one frame | 0 at all three resolutions | `phase4-war-summary.log`, `phase4-war-summary-*/same-frame.json` |
| Phase 5 focused boundary/typecheck | 0/0; five files, 35 tests | `phase5-final-focused.log`, `phase5-final-typecheck.log` |
| Final regression corrections: strict-null inventory, recap and sectors | 0; three files, 133 tests; typecheck 0; inventory pin remains seven | `final-regression-green.log`, `final-regression-typecheck.log` |
| Final sector contrast and density correction | 0; three files, 62 tests; typecheck 0; measured 5.991:1 contrast at all three resolutions | `final-regression-sector-green.log`, `final-regression-sector-typecheck.log`, `final-regression-sector-contrast-capture.log`, `final-regression-sector-contrast-results.json` |
| Phase 5 final amended commit and mandatory hook | 0 | `phase5-contrast-amend.log`; earlier checkpoint receipts retained in `phase5-commit.log` and `phase5-final-amend.log` |
| First integrated `npm.cmd run test:vitest` | 1; six real failing assertions across four files; superseded by corrected retry | `final-vitest.log` |
| Corrected `npm.cmd run test:vitest`, including complete UI boundary | 0; aggregate execution-group summaries report 13,562 passes and 31 skipped; all five groups pass | `final-vitest-corrected.log` |
| Frozen source/test SHA-256 verification | 0; all 77 inventoried files unchanged during the corrected gate | `final-source-freeze-check.log`, `final-source-inventory.json` |
| Dayton casing and visible, unstruck lock explanation | 0 at all three resolutions | `phase5-dayton-corrected.log`, `phase5-dayton-corrected/results.json` |
| Integrated screenshot capture | 0 at all three resolutions; 15 captures each, with route limitations below | `final-capture-1920x1080.log`, `final-capture-1366x768.log`, `final-capture-3440x1440.log` |
| Methodology and two endgame recap supplements | Captured at all three resolutions; existing HQ briefing captures show 68w tenure | `supplement-results-final.json`, `supplement-*/`, `integrated-*/hq-briefing.png` |
| Actual Cost Ledger target and independent visual review | 0 / GO at all three resolutions; exact civilian, military and refugee integers preserved | `final-cost-ledger-capture.log`, `final-cost-ledger-results.json`, `final-cost-ledger-*.png`, `final-review.log` |
| `npm.cmd run qa:player-experience` | 0; all six nested gates and output scan pass | `final-player-experience.log`, `final-first-hour-browser/`, `final-live-surface-browser/` |
| `npm.cmd run canon:check`, including baseline regression | 1; static determinism check passes, six existing manifest mismatches remain | `final-canon.log` |
| PRE versus POST-B deterministic bytes | All eight artifacts and all consumed-input hashes match; full three-run proof remains incomplete | `partial-simulation-comparison.json` (exit 1 explicitly because POST-A is pending) |
| `node tools/engine_health_gate.cjs data/derived/scenario/_baseline_tmp/apr1992_188w --horizon 188w --json` | 0; all hard health gates pass on POST-B | `final-engine-health.log` |
| Focused documentation checks / `git diff --check` | 0/0; three files, 13 tests | `final-docs-checkpoint.log`, `final-docs-diff-check.log` |
| Baseline investigation of existing n392/PRE artifacts and history | 0; explanation reviewed GO, baseline gate remains blocked | `baseline-investigation-detailed.log`, `baseline-history.log`, `final-review.log` |
| Date-only feasibility browser observation | Blocked by header occlusion; intentionally stopped, exit code not captured; eight measured cases | `desk39-feasibility-summary.json`, `desk39-feasibility-run1.log`, `desk39-feasibility/` |

The first metric geometry check incorrectly compared text with the outer cell rather than
its own clipping box. Its initial PASS is superseded by the final check, which waits for
fonts/entry animation and measures the label box. Initial failed tests and captures remain
preserved. Directive-control visual proof uses an inert desktop-availability stub; it does
not certify command execution. The Dayton locked branch uses an in-memory clone of the
existing endgame fixture with only RS negotiation capital set to 10; no save is written.
Endgame fixture bootstrap completes the underlying opening menu directly because the
restored endgame modal already intercepts pointer events; those setup clicks are not normal
navigation proof. The corrected frozen-source full-suite gate passes. The passing
player-experience umbrella includes typecheck, desktop release checks, Electron runtime
contracts, player journeys, first-hour browser and live-surface browser checks. Its two
browser gates use the documented tileless fallback. The integrated `cost-ledger.png` files
show the HQ Records state, so they are not distinct Cost Ledger route proof. The later
`final-cost-ledger-*` viewport and full-element captures reach the actual
`[data-tutorial-step="cost-ledger"]` target and supersede that coverage gap. They preserve
58,395 military killed, 31,664 civilian killed and 1,752,457 refugees as exact integers,
with the existing accounting-not-score caveats. The observed fixture exercises Filed
finding, Grave finding and Locked condemnation; no unobserved visual branch is claimed.
The attempted
Personnel tenure supplement did not reach its target and was stopped; actual HQ briefing
captures already show the officer's 68w tenure at all three resolutions.

The first Phase 5 GREEN failure log was overwritten during correction. Its observed failure
and restored `hasCurrentFieldedLine` guard are documented in the ledger; no recovered full log
is claimed. The separate selector failure, initial RED and final corrected receipts remain.
The first actual Cost Ledger capture reached its target but failed a case-sensitive
matcher against CSS-uppercased text. That initial log was also overwritten; the accurately
labelled provenance note in `final-cost-ledger-capture.log` records this limitation. Only
the harness matcher changed before its final passing run; no recovered receipt is claimed.

The first integrated suite caught an avoidable non-null assertion, three stale recap
wording expectations, a stale duplicate-density expectation and an actual contrast defect.
The missing-report sentence's 70%-alpha color measured 3.674:1 at 12px on its real panel
background. The bounded correction retains italics but restores the full secondary text
color; the existing contrast guard is preserved. Corrected captures measure 5.991:1 at all
three resolutions and supersede the earlier muted-prose screenshots for that target.
The density test now requires exactly one figure while preserving front-segment units.
The runner's deliberately failing child
fixture is a successful failure-propagation control, not an additional product failure.

The final full retry passes all five execution groups, including every formerly failing
file and the entire UI boundary. The passing player-experience umbrella predates only the
guard-preserving optional-access and text-color corrections; focused typecheck and actual
three-resolution contrast proof cover those bounded changes. No additional full UI,
release, browser-journey or simulation campaign is inferred from this receipt.

## Display-name and simulation evidence

The canonical source resolves all 712 scored OSIDs and 110 municipalities without conflicting
names. Of the 712 labels, 710 are census-derived; Mostar Istok/Zapad are authored operational
splits. The completed PRE replay contains 188 frames, 466 formation location OSIDs, 582
operation/history name inputs and 1,558 unique Chronicle player strings. All resolve without
raw-token leakage; 1,326 deduplicated Chronicle strings gain canonical spelling. The initial
446 apparent misses were composite-edge extractor artifacts, not product bugs; the corrected
enumerator parses both endpoints of `${from_osid}__${to_osid}` and adds no R8 bug rows.

The clean PRE run completed at the control commit with final-state fingerprint
`e414dc69f6e875fc` and `git_dirty=false`. Its eight sorted deterministic artifacts already
disagree with the committed baseline manifest in six places; only formation delta and
watched operations match. `pre-baseline-hashes.json` preserves exact hashes. POST-A must
still complete the three-run byte-neutrality proof. No baseline was
refreshed, and the pre-existing mismatch is not a waived acceptance gate.

The nested baseline regression in `canon:check` supplies POST-B within the fixed campaign
budget. All eight actual hashes match PRE, as do the consumed-input digest and four
calibration inputs. POST-B provenance is commit `f6b1b63d6` with `git_dirty=true`: production
was frozen and reviewed, but local presentation commits/documentation were pending. This
deviates from the earlier clean-final-commit preparation and is explicitly not described as
a clean run. The clean POST-A remains outstanding. The final inventory at `1bc1f7369`
records zero forbidden-surface changes and hashes all 77 changed source/test files,
including the held Desk fade/test. The earlier 76-file checkpoint inventory is preserved
as `final-source-inventory-before-regression.*`, and the intermediate 77-file inventory
as `final-source-inventory-before-contrast.*`. Engine health passes at 667/712 matched
OSIDs and zero consistency failures;
this does not waive the manifest or clean-run acceptance conditions.

## Bug and friction routing

| Class | Disposition |
|---|---|
| Located wording, names, units, number presentation and illegible text | R7 amendment phases above; acceptance depends on completed verification |
| Bugs B1–B9 | Existing R8 register in the [full-campaign plan](../../plans/2026-07-31-full-campaign-electron-validation-plan.md); preserve owner D1 HOLD FOR R8; no duplicate register or fixes here |
| Finding 19b, exact international-standing decision cost | Working as designed and required by sensitive-history canon; preserved |
| Finding 8e authored decorate-unit template and 27 owner artwork | Existing post-1.0 content/art backlog; no code fix in this packet |
| Broad formatter consolidation, full tenure-unit sweep, dead artwork export | Existing post-1.0 backlog; bounded plan does not expand to them |
| Unlocated findings in amendment §9.5 | Retain their named owners and exact unblocking queries; do not infer a fix from static captures |

R7 human listening/sensitivity and broader closeout obligations remain distinct. No R8 final
campaign, R9 freeze, push, merge, release package or publication is authorized by this report.

## Remaining acceptance and handoff

- Phase 3.9 now has owner-approved date-only acceptance. The reviewed Desk fade and its
  test remain uncommitted so the specified single-file 3.7/3.9 commit is not split.
  Required cases have fixed-header occlusion that a gap below the header cannot resolve.
  Header/date layout scope must be authorized before implementation; no artwork change is
  authorized. Unmeasured cases are not claimed passed.
- `canon:check` and its embedded baseline gate remain exit 1 on six PRE-existing pins.
  The authorized investigation below explains the discrepancy; matching PRE/POST-B bytes
  does not silently waive the gate or authorize replacement pins.
- Clean POST-A remains outstanding after the final reviewed Desk disposition. POST-B has
  already consumed the baseline-regression slot in the fixed one-PRE/two-POST budget.
  Do not launch another standalone baseline regression or refresh manifest pins.
- R8's existing B1–B9 register remains waiting; human listening/sensitivity and broader R7
  reconciliation retain their existing owners. No downstream lane is opened here.

## Authorized baseline investigation

Existing artifacts explain the failure without another campaign. All eight manifest pins
exactly match the retained accepted `n392` run. Its clean provenance records Node 22.23.2,
as does clean R7 PRE, but their consumed-input digests differ in four files:
`war_1993.json`, `war_1994.json`, `war_1995.json`, and `oob_brigades.json`. The manifest's
last update is `2c2aa72a8`; subsequent BC03/BC04/BC05 and honorific-name changes precede
R7 PRE. The baseline comparator hashes raw artifact bytes; it is correctly reporting six
differences, not a formatting-only or Node-version discrepancy.

Weekly artifacts first differ in fired events at week 54: PRE includes
`ahmici_massacre_1993`, consistent with the later `f117fe475` gate correction. Battles first
differ at week 77; territory counts first differ at week 162 (RBiH 255→268, RS 372→359,
HRHB 85 unchanged). Final saves differ in military, control and displacement state as well
as names. This is real pre-R7 output change; the investigation does not causally attribute
every downstream difference to one commit or endorse a new calibration result.

The original n392 commit `c2f6592ec` is not an ancestor of PRE. Comparing its source, data,
packages and scenario-runner surfaces with the merged `2c2aa72a8` finds only the manifest
update, supporting equivalent runtime surfaces while preserving the distinct Git provenance.
The calibration authority still names n392 as owner-blessed and ties final acceptance to
BC settlement. Retain its pins: investigation authorization is not a baseline adoption.
The downstream unblock is accepted calibration evidence and an explicit pin-reconciliation
decision under that authority. PRE/POST-B identity remains valid R7 neutrality evidence;
clean POST-A remains required.

Evidence: `baseline-investigation.json`, `baseline-investigation-detailed.log` (exit 0),
`baseline-history.log`, and the existing `partial-simulation-comparison.json`. No scenario,
simulation, calibration, baseline, dependency or saved artifact was modified.

## Date-only continuation result

Live glyph-range and card intersections show that the fixed header covers part of the
date in required cases. Its vertical bounds are 146–499. RS/HRHB dates at 1920×1080 lie
at 414.98–432.68 and 426.84–444.54 respectively. At 1366×768 all three faction dates
intersect it: RBiH 358.75–376.44, RS 292.50–310.19, HRHB 300.93–318.63. Increasing the
gap below that header cannot expose those glyphs. RBiH at 1920 is gap-feasible; RBiH/RS
at 3440 already avoid both cards. HRHB at 3440 was deliberately left unmeasured once
required failures established the stop condition; no all-viewport PASS is claimed.

The date is a DOM label (`warroom-date-board-label` in `WarroomShellLayer.tsx`), rather
than text baked into the image. The plan's earlier description and identical-faction
assumption are corrected. Altering that label or the header layout is beyond the currently
permitted header-to-packet gap change and needs a bounded scope decision. No 3.9 source/test
edit was made; the existing fade remains unchanged. Reuse the prior corrected full-suite
and typecheck receipts for unchanged source rather than launching another campaign.

Evidence: `desk39-feasibility-summary.json`, `desk39-feasibility-run1.log`,
`desk39-feasibility.mjs`, and eight screenshots under `desk39-feasibility/`. This is a
supported blocked result, not implementation acceptance.

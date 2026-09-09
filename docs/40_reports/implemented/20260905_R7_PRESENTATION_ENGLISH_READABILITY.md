# R7 presentation and English readability

Status: date-on-whiteboard placement is reopened after the owner's 2026-09-10 correction.
The prior visibility proof accepted a date shifted off its intended artwork surface; that
date-layout GO was too broad. Existing full UI/typecheck/build/hook and clean POST-A receipts
remain evidence for source `88996a23d`, not proof of correct date placement or a later revision.
The inherited baseline gate remains open, so this is not R7 closure.
Prior global Vitest/player-experience receipts are reused only for unaffected scope.

## Owner correction: detached date — 2026-09-10

Date-only acceptance requires the date to remain on the whiteboard. The CSS translation
introduced in `WarroomDateBoard` moved the entire region left to avoid Desk content, and
the regression test mandated that workaround. The initial and independent image reviews
both missed the resulting loss of attachment to the board. Those claims are corrected here.

`logs/r7-english-readability/desk39-onboard-prior-audit.log` exits 0 for the read-only
reproduction: mapping the retained scene/label geometry onto the unchanged authored board
polygon finds labels and glyphs outside it for all factions at 1920x1080 and 1366x768.
All three 3440x1440 cases stay inside. The JSON and original PNGs remain preserved; the
audit's successful exit means it reproduced the defect, not that the layout passes.
The existing amendment plan records the correction and new containment/image checks before
implementation. Column/artwork remain fixed; no simulation or package run is added.

The correction removes the translation from `WarroomDateBoard`. At overlapping widths,
only opaque Desk scroll content starts lower; the shell bounds, right-column position,
close control, room image and authored board region stay fixed. The content returns to
its ordinary position at 2048px. The reviewer caught and corrected an earlier 2001px
reset that would have left a narrow overlap interval. Header content and controls remain
intact and scrollable; at 1366x768 the visible scroll region is 266px tall, so the lower
header and packet require scrolling. This is the explicit cost of the fixed-column layout.

Fresh evidence under `logs/r7-english-readability/`:

| Check / command | Result | Receipt |
|---|---|---|
| Focused `npm.cmd run test:vitest -- tests/ui/r7_president_desk_layout_readability.test.ts tests/ui/desk_authority_header.test.ts tests/ui/president_desk_shell.test.ts tests/ui/warroom_shell_accessibility.test.ts tests/ui/warroom_scene_continuity.test.ts tests/ui/warroom_shell_ownership.test.ts` | Exit 0, 75/75 | `desk39-onboard-focused-green3.log` |
| Original translation and early-breakpoint behavioral RED | Exit 1 as expected; setup failures are separately retained | `desk39-onboard-focused-red3.log`, `desk39-onboard-focused-red4.log`; setup `red.log` has no exit stamp, `red2.log` exits 1 |
| `node desk39-onboard-proof.mjs --out .../desk39-onboard-browser-attempt1` | Exit 1 retained: seven case passes; two small-screen cases exhaust the proof's twelve-step coverage cap; all nine also flag checkout-specific image URL paths | `desk39-onboard-browser1.log` |
| `node desk39-onboard-proof2.mjs --cases rbih-1366x768,rs-1366x768 --out .../desk39-onboard-browser-attempt2` | Both targeted cases pass every case criterion; wrapper exit 1 retains the same URL-path identity flags | `desk39-onboard-browser2.log` |
| `node desk39-onboard-consolidate.mjs` | Exit 0; all nine final cases pass, combining seven original and two corrected results | `desk39-onboard-consolidate1.log`, `desk39-onboard-final-summary.json` |
| `npm run typecheck` | Exit 0 | `desk39-onboard-typecheck1.log` |
| `npm run desktop:map:build` | Exit 0 | `desk39-onboard-map-build1.log` |
| `npm run test:vitest -- tests/ui` | Exit 0; complete UI boundary, 354 files / 2,988 tests, 848.44 seconds | `desk39-onboard-ui1.log` |
| `node desk39-onboard-scope.mjs freeze` | Exit 0; three date source/test hashes frozen, 25 R8 source/test hashes preserved, 870 prior untracked paths retained | `desk39-onboard-source-freeze.log`, `desk39-onboard-source-freeze.json` |

The corrected traversal is bounded by the stable target count and stops on no progress;
no source change was needed for that harness correction. Artifact reconciliation strips
only the two known checkout prefixes, then checks the same relative asset, its natural
dimensions, original/worktree SHA-256 and Git blob identity against source `88996a23d`.
It preserves both failed browser receipts and does not re-label the fresh consolidation
asset hashes as earlier browser snapshots. Source, fixtures and authored-region hashes
match before/after both browser runs and the final source freeze.

All nine complete labels and glyph bounds stay within the actual authored board polygon
at initial and maximum scroll. No painted header/card/control intersects the label or
glyphs; BEFORE scene/shell geometry is unchanged. Computed scroll margins are 391.832px
at 1920, 243.859px at 1366 and zero at 3440. Date contrast is 8.34:1 against both worst-case
underlays. All 45–50 header/control text targets per faction can be exposed and controls
hit-tested through scrolling. Last text clears the fade start by 16.25–16.67px. Final
evidence includes eighteen endpoint images and 77 intermediate readability images;
`desk39-onboard-final-summary.json` identifies the supplying attempt for every case.

Independent review in `desk39-onboard-review.log` gives final source/image **GO**, after
inspecting all eighteen endpoint and 77 intermediate screenshots and independently
checking source/asset identities. The complete UI boundary passes 354 files / 2,988 tests,
exit 0. The normal local hook and commit remain pending at this entry.
The existing package remains from product `217c9f70a`;
this date correction is not packaged by the earlier build. The separate opening Inbox
blocker/replacement-package decision remains pending. R7 PRE, clean POST-A and dirty
POST-B retain their recorded eight-artifact/31-input equality; no new run was performed
or attributed to this correction. Accepted n392 pins and the six-pin/calibration gate
remain untouched and open.

## R7 closeout reconciliation — 2026-09-09

The prior closeout claimed the English visual scope complete; the date-placement exception
above now supersedes that claim. Integrated captures cover 15 required
surfaces at 1920x1080, 1366x768 and 3440x1440; the final Desk/date proof covers all nine
RBiH/RS/HRHB by resolution cases at initial and maximum scroll. This supersedes the parent
plan's earlier statement that 1366x768 and 3440x1440 were uninspected. It remains browser image
evidence, not packaged-offline or audio evidence.

The reconciled parent plan now carries the executable human checklist. Its evidence boundary is:

| Gate | Retained evidence | Reconciled verdict |
|---|---|---|
| Historical claims and sensitive-history semantics | Parent-plan Phase 1.1/1.2 closeout; `docs/40_reports/audits/20260801_R7_HISTORICAL_CLAIM_LOCALIZATION_INVENTORIES.md`; strict CLI receipt summarized in the ledger | 3,654 inventoried claims: 3,642 documented plus 12 explicit non-player-facing deposits; zero unresolved player-facing rows; strict CLI 0 CRITICAL / 0 WARNING / 1 nonblocking INFO; September 1993 Neretva/Grabovica/Uzdol boundary retained |
| Officer/OOB identity provenance | `docs/40_reports/audits/20260801_R7_OFFICER_AUDIO_PROVENANCE_INVENTORY.md` | 334/334 playable rows exact-supported: 68 officers, 19 corps, 244 brigades and three elite-command links; 40 candidates explicitly omitted; zero unsupported playable rows |
| Current content/UI execution | This report's corrected full-suite and player-experience receipts | 13,562 passes / 31 skips and player-experience exit 0 for the recorded source; inherited baseline failure prevents an aggregate Phase 5 GREEN claim |
| Audio inventory and lineage | `docs/audio/AUDIO_ASSET_PROVENANCE.json`; `docs/audio/AMBIENT_BED_ASSET_MANIFEST.md`; audio commit `2d106e5e0` | 36 keyed cues: 20 provided OGGs (17 CC0 UI, three first-party ambient), 16 missing optional placeholders; automated provenance/wiring complete |
| Packaged audio bytes | `logs/r9-build-preparation/phase3-runtime-probe.json`; 2026-09-08 R9 Phase 3 ledger entry | 20 emitted OGGs match source hashes byte-for-byte; reusable package-content evidence only |
| Opening packaged first paint | 2026-08-29 opening receipt summarized in `docs/40_reports/WARROOM_MASTER.md` | Closed for opening images/crests/React paint; supplies no audio or final-English offline proof |
| Human listen and design approval | No named, attributable receipt located in the bounded plan/report/ledger/audio/log search | Open for all 20 supplied assets; actual cue IDs, listening locations and criteria are in the parent checklist |
| Canon/sensitivity approval | No named, attributable post-audio listen receipt located | Open; five `requires_sensitivity_review` rows are absent optional placeholders and remain silent, while supplied assets still need an actual restraint review |
| License-review approval | Complete machine-readable lineage and per-file notes, but no attributable closeout approval located | Open approval lens assigned within the existing required review roles; existing hashes/licenses are the review input |
| Current scoped offline runtime | Earlier package launches and byte inventory exist; no receipt binds final R7 source to audible decode/playback, controls and a zero-remote-audio request capture | Open QA receipt |
| Baseline/canon aggregate | PRE/POST-A/POST-B presentation neutrality passes; accepted n392 pins still differ in six outputs after four pre-R7 input changes | Open inherited gate; no pin refresh or new campaign authorized |

The bounded static search located product call sites for ten of the 20 supplied cue IDs: `ambient_warroom`,
`ambient_field`, `ambient_archive`, `turn_review_open`, `peace_plan_offered`, `turn_complete`,
`battle_notification`, `battle_decisive`, `event_notification` and `operation_complete`.
The other ten — `ui_click`, `ui_hover`, `ui_open_panel`, `ui_close_panel`, `turn_advance`,
`battle_catastrophic`, `operation_launched`, `event_critical`, `game_over` and
`tutorial_objective_complete` — are packaged and provenance-complete, but the search did not
locate non-registry call sites for them. Their runtime-hook state remains unproven; this is not
an exhaustive absence claim. The human sheet listens to every supplied file directly and uses
established product routes for reachable cues; direct-file results do not establish live triggers.

The R9 package receipt proves bytes and a successful packaged runtime, but records no audible
playback/decode result, gesture/mute/volume observation or network-request inventory for audio.
It also does not bind the package to the final R7 readability source identity. The exact missing
receipts, distinct Game Designer, Canon Compliance and QA roles, the license/provenance lens,
evidence filenames
and pass criteria are in
[the parent R7 plan](../../plans/2026-07-31-content-history-localization-audio-plan.md#human-listening-and-sensitivity-checklist--open).
Phase 3 localization remains deferred post-1.0. No aggregate R7 box is ticked by this audit.
This existing report is the sole closeout-reconciliation report; the formerly proposed
`20260731_CONTENT_HISTORY_AUDIO.md` is deliberately not created.

Audit checks: `closeout-audit-docs1.log` passes 13/13, exit 0; `closeout-audit-scope1.log`
passes the five-document boundary, added local links, whitespace and retained untracked-path
checks, exit 0. Review requested six wording corrections, now applied; its initial verdict and
targeted confirmation remain in `closeout-audit-review.log`. Final documentation/scope checks
and the mandatory local hook are recorded separately in `closeout-audit-docs2.log`,
`closeout-audit-scope2.log` and `closeout-audit-commit1.log`. These are documentation receipts,
not new audio or runtime proof.

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
| Phase 3.7/3.9 Desk/date | Existing Desk fade retained; date board moves clear of the fixed column at constrained widths, with a single-line date and paper backing; original header/artwork preserved | 48 focused tests, all nine initial/max-scroll cases, and final 354-file/2,974-test UI boundary pass; independent GO in `desk39-layout-review.log` |
| Phase 4 numbers | Compact million displacement, consistent repeated military casualty formats and personnel displays; exact civilian deaths and missing/captured counts retained | `f6b1b63d6`; independent GO after civilian precision correction; `phase4-review.log` |
| Phase 5 component copy | Shared severity labels, RBiH casing, visible lock explanation, density once, single-subsegment suppression, subdued missing-intel prose and week-based tenure | `1bc1f7369`; independent Narrative/Modern/code GO after targeted corrections; `phase5-review.log`, `final-review.log` |

All receipt paths below are relative to `logs/r7-english-readability/`. Logs and validation
fixtures remain local evidence; this report is the single designated implementation report.

## Verification receipts

| Command/check | Exit/result | Receipt |
|---|---|---|
| Desk/date local commit and mandatory hook | 0; `88996a23d2441a391b25706c734626b5732e37b5` | `desk39-layout-commit1.log` |
| Clean POST-A 188-week run | 0; 188 weeks, clean `88996a23d`, Node 22.23.2, no override | `desk39-layout-post-a-run1.log` |
| POST-A engine health gate | 0; 667/712 matched, zero consistency failures; unchanged advisories remain reported | `desk39-layout-post-a-health1.log` |
| PRE/POST-A/POST-B eight-artifact and consumed-input comparison | 0; all eight byte-identical and all 31 normalized consumed inputs identical | `desk39-layout-post-a-comparison1.log`, `final-simulation-comparison.json` |
| POST-A provenance, 188-frame replay and final-save hashes | 0; clean expected commit/Node/weeks; full replay and final save identical to PRE | `desk39-layout-post-a-provenance1.log`, `.json` |
| Final Desk `npm.cmd run test:vitest -- tests/ui` | 0; 354 files, 2,974 tests | `desk39-layout-ui3.log` |
| Final Desk typecheck and map build | 0/0 | `desk39-layout-typecheck3.log`, `desk39-layout-map-build3.log` |
| Frozen Desk source/test hashes and forbidden-surface/diff check | 0; three reviewed hashes unchanged; 76 prior files unchanged and one focused test extended; no forbidden diff | `desk39-layout-freeze-check.log` |
| Focused documentation checks | 0; 13 tests | `desk39-layout-docs3.log`; `docs1`/`docs2` preserve roadmap-length failures corrected without changing the guard |
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

- Phase 3.7/3.9 implementation, nine-case browser proof and final UI checks are complete
  and independently reviewed GO, committed locally as `88996a23d` with the hook passing.
  The owner approved date-only acceptance and necessary date/header layout expansion,
  preserving Desk column position, header content/controls and artwork.
- `canon:check` and its embedded baseline gate remain exit 1 on six PRE-existing pins.
  The authorized investigation below explains the discrepancy; matching PRE/POST-B bytes
  does not silently waive the gate or authorize replacement pins.
- Clean POST-A is complete and matches PRE/POST-B; POST-B retains its disclosed dirty
  provenance. The fixed one-PRE/two-POST budget is now fully consumed. Do not launch
  another baseline regression or campaign, or refresh manifest pins under this amendment.
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

## Gap-only feasibility result (superseded scope)

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
supported blocked result, not implementation acceptance. The subsequent owner authorization
expands item 3.9 to the necessary date-label/header layout adjustments, preserving column
position, artwork and readable header content/controls. The existing amendment now records
the implementation, review and clean POST-A validation contract for that continuation.

## Authorized date-layout implementation — 2026-09-09

The final slice retains the existing `PresidentDeskShell.tsx` bottom fade and changes only
`WarroomDateBoard` in `WarroomShellLayer.tsx`. A continuous CSS translation moves the date
board left below 2200px and leaves its authored position at 3440px. Translating the parent
moves its clipping polygon with the label. The date stays on one line, with a light paper
backing; the Desk column, authority header, controls, projected map and room artwork retain
their original layout. No simulation, saved value, dependency or asset changes are involved.

`desk39-layout-proof.mjs --out logs/r7-english-readability/desk39-layout-browser-attempt2`
passes all RBiH/RS/HRHB × 1920×1080/1366×768/3440×1440 cases, at initial and maximum
scroll. The 18 PNGs and per-case JSON show the complete date outside the fixed Desk column,
no date/card intersections or clipped glyphs, readable header/control content, loaded
unchanged room images and the retained fade. The conservative contrast lower bound is
8.336:1 (black/white underlay bounds for the translucent backing); final text clears the fade
by 16.25–16.5px. Actual image inspection is recorded separately, not inferred from rectangles.
Exact commands, exit 0 and results are in `desk39-layout-browser-attempt2-command.txt`,
`desk39-layout-browser-attempt2.log`, its `summary.json`, and
`desk39-layout-browser-attempt2-visual-inspection.txt`.

The first attempt is explicitly invalidated: its moved child glyph rectangles passed, but
the unchanged ancestor clip polygon prevented date painting. Its JSON/PNGs and exit 1
remain untouched, with `desk39-layout-browser-attempt1-disposition.txt` rejecting the
false-green labels. The earlier narrowed-header candidate was discarded because scrolling
could cover the date. A transient wrong-target transform was caught during independent
review and removed before accepted captures; the projected map is unchanged. The focused
test now confines translation to the date-board parent and rejects it on the label or map.

Focused final verification passes 48 tests across four files, exit 0
(`desk39-layout-focused-final.log`). Root's `*1.log` launches failed before npm execution
on Windows quoting; `*2.log` UI/typecheck/build pass but predate final source. Their
receipts remain historical. Frozen-source `*3.log` checks pass: 354 UI files/2,974 tests,
typecheck and map build, all exit 0. The mandatory hook runs with the local commit.
Startup preservation verified all 77 prior hashes; unchanged full-suite
and player-experience evidence is reused explicitly, with fresh proof covering this slice.

## Clean POST-A result and final boundary

Source commit `88996a23d2441a391b25706c734626b5732e37b5` is the reviewed implementation
identity. Its mandatory hook passes, exit 0. POST-A ran from the new detached clean checkout
`F:/AWWV-worktrees/r7-readability-post-a`; the owner checkout's untracked evidence remained
in place. No dependencies were installed; the ignored node_modules junction reuses PRE's
runtime. Preflight passes all 31 normalized consumed inputs, clean commit, Node 22.23.2
and raw package/lock identity (`desk39-layout-post-a-preflight1.log`/`.json`, exit 0).

The exact scenario command and environment are recorded in `desk39-layout-post-a-run1.log`:
`node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario.ts --scenario data/scenarios/apr1992_definitive_188w.json --weeks 188 --full-replay-save-sequence --out F:/A-War-Without-Victory/logs/r7-english-readability/post-188w`,
with process-local `AWWV_S6_GRADE_RUN=true` and no provenance override. Run directory:
`post-188w/apr1992_definitive_188w__6898d6d2e324c7a3__w188`. Runner exit is 0, with 188
completed weeks and clean provenance at the source commit. The checkout remains clean.

`node tools/engine_health_gate.cjs <POST-A-run-dir> --horizon 188w --json` passes, exit 0:
667/712 matched OSIDs and zero consistency failures; advisories are preserved. Existing
`compare-simulation.mjs <PRE> <POST-A> <POST-B>` passes, exit 0, for every one of the eight
raw-byte artifacts and all consumed-input rows/digests. The retained partial comparison is
unchanged. POST-B remains `f6b1b63d6`, `git_dirty=true`; matching bytes do not relabel it clean.

The separate provenance/replay verifier passes, exit 0. POST-A has exactly 188 replay frames
and its complete 1,304,620,232-byte replay is identical to PRE (SHA-256
`53444b42084d4ea05b146d67651e0c9b19304b1200fafa5bea7a63775784cb56`). This also preserves the
input to the prior exhaustive name enumeration. Final-save SHA-256 is
`e414dc69f6e875fcd2a7394582921f20ca03123112baf12e9308c50035c29c50`; its displayed fingerprint
`e414dc69f6e875fc` matches the runner receipt. No extra campaign or baseline wrapper ran.

This completes the authorized clean POST-A and presentation-neutrality proof. It does not
resolve the inherited six-pin gate: all stored pins still belong to accepted n392, while
four event/OOB inputs changed before R7. Canonical calibration adoption after BC settlement
and an explicit pin-reconciliation decision remain under the existing calibration authority.
No pin, threshold, simulation, save schema, dependency or artwork was changed. Human
listening/sensitivity and broader R7 closure remain separate; no R8/R9 work, push or merge.

Final documentation checks pass 13/13, exit 0 (`desk39-layout-final-docs1.log`), and the
source/clean-checkout/diff receipt passes, exit 0 (`desk39-layout-final-state1.log`).
Targeted independent POST-A/documentation confirmation is recorded in the existing
`desk39-layout-review.log`. The final local documentation-hook receipt is
`desk39-layout-final-docs-commit1.log`; its outcome is recorded when that commit executes.

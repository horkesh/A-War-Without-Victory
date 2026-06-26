# Army HQ Sector Brigade Information Quality Sweep

**Status:** ACTIVE rolling D2 polish plan; latest merged packet is P11 at `12cef62f3`; P12 is implemented locally on `codex/p12-player-truth-followup` with broad local proof complete and PR #455 open pending GitHub/merge closeout.

**Goal:** Turn the next owner-facing polish pass into a single substantial batch: live-click Army HQ, OOB, Corps Front, sector, brigade, formation detail, settlement, and command handoff surfaces; fix confirmed information-quality defects without reopening packaging, BCS-only cleanup, or calibration.

**Why now:** `MASTER_ROADMAP.md` and `COMMAND_BOARD.md` make D2 owner playthrough the remaining 1.0 gate. The closed June 22 sector-truth plan established the rules; this sweep verifies the current live surfaces again and closes the next coherent set before another long CI wait.

## Current Queue 2026-06-26

P11 is merged and green. It was implemented from the next closed scout reports without reopening packaging, BCS-only cleanup, calibration, save schema, startup construction, scenario data, or Srebrenica/Zepa scripted-operation calibration:

- Corps Detail sector drilldown now preserves authored friendly OSID anchors instead of dropping the battlefield context.
- Sector entrenchment/dig-in aggregates carry reported-field counts; Corps Front renders exact, partial, or unreported values instead of inventing zeros from missing line-holder data.
- Formation Detail and OOB sector affordances use player-safe labels in visible, title, and accessible copy instead of raw sector or command ids.
- Operation lifecycle fields reject non-finite objective/momentum/supply-readiness values before they reach command panels.
- Back-the-Officer stale proposal plan ids no longer fall through to the first live operation.
- G-2 prediction normalization preserves sparse payload truth with nullable force ratio, intel confidence, casualties, predicted outcome, axis readiness, and defense strength; explicit reported zeroes still remain exact.
- War Summary, Chronicle, and Wrapped campaign-cost surfaces distinguish missing casualty/displacement sources from explicit reported zeroes.

P11 verification passed: focused player-truth proof 10 files / 229 tests; `npm.cmd run typecheck -- --pretty false`; `npm.cmd run qa:player-journeys` 43 files / 659 tests; `npm.cmd run qa:first-hour:browser`; `npm.cmd run qa:live-surface:browser`; `npm.cmd run desktop:map:build` with existing non-fatal Vite warnings; `git diff --check`; manual in-app browser proof on `http://127.0.0.1:3003/`; review-fix proof 2 files / 36 tests; and GitHub PR #454 checks green across Event System validation x2, Desktop Release Guard, desktop packaged runtime probe, Baseline Regression, structural fingerprint, Typecheck, and Full Suite. Codex review threads were resolved before merge. Generated browser evidence folders were removed after verification; `.tmp_dev_server` remains only for the active browser/dev session. Fall receipts remain event-owned.

Next P12 queue from closed Faraday/Leibniz/Ramanujan scouts:

- App-local modal ids and officer-matter fallback-to-first behavior after load/turn changes.
- Operation assessment finite guards for preparation, assessment, force-ratio, and postponement fields.
- Decision Room selected-card miss behavior; stale card ids must not open the first unrelated dossier.
- OOB ungrouped command rows must not select the first brigade by sorted id.
- Turn Aftermath/Chronicle remaining sparse-cost provenance, including absent battle/displacement data.
- Army HQ/Corps Detail sparse command-equipment and operation-slot truth.

P12 local implementation on `codex/p12-player-truth-followup` now covers that queue:

- Officer Matter and Decision Room stale selections fail closed instead of falling through to the first pending event/card.
- OOB ungrouped rows are non-command groupings: no first-brigade header selection and no `_ungrouped` Order of Battle route.
- Operation assessment/readiness fields preserve non-finite and missing values as unreported, including participant cohesion/personnel and sector-intel confidence.
- OOB, Corps Detail, and Corps Front render `phase_unreported` operations as `Status pending`.
- Turn summary battle casualties now carry `casualties_reported`; AAR, Army HQ sector engagements, Turn Aftermath, Chronicle, and Generals' Digest no longer treat missing casualty/displacement sources as zero cost.
- Compact command-equipment summaries render fully absent equipment-condition reports as `Unreported` and avoid exact-looking `0/N operational` tooltips.

P12 local proof so far: `npm.cmd run typecheck -- --pretty false` passed; focused P12 pack passed 14 files / 342 tests; `npm.cmd run qa:player-journeys` passed 43 files / 667 tests; `npm.cmd run qa:first-hour:browser` passed; `npm.cmd run qa:live-surface:browser` passed; `npm.cmd run desktop:map:build` passed with existing non-fatal Vite warnings; `git diff --check` passed with the existing CRLF normalization warning on `src/ui/map/utils/operations.ts`; manual in-app browser proof on `http://127.0.0.1:3003/` verified title screen, RBiH war-start splash, Army HQ, and 1st Corps Order of Battle drilldown with no visible error banners, console errors, raw paths, or malformed numeric values. Generated browser evidence folders were removed; `.tmp_dev_server` remains for the active local browser/dev session. PR #455 is open with no initial comments, reviews, or review threads. Remaining before closeout: GitHub comments/checks, merge, branch prune, and clean-worktree proof. Report: `docs/40_reports/implemented/20260626_P12_PLAYER_TRUTH_FOLLOWUP.md`.

## Progress 2026-06-24

Completed and verified first substantial slice:

- Situation territory now uses area-weighted player territory and matches the bottom status strip.
- Officer mini-bio/profile fields are preserved into the deterministic April 1992 startup snapshot.
- Army HQ and Corps Front expose stale sector roster ids separately from fielded strength.
- Corps Front now renders explicit empty-force, unreported-standard-brigade, and bridge-unavailable disabled-control states.
- Settlement detail renders a no-stationed-units empty state when no physical fielded formations are present.
- Records subtab accessible names no longer include numeric counts.
- OOB sidebar renders JNA command nodes with only `jna_phantom` subordinates as `0 brigades` command rows without counting phantom force.
- Personnel mobilization pool labels use the shared player-safe municipality formatter.
- `OobCorps.available_from` is tested and documented as phased activation/OOB alignment, not a startup command-visibility gate.
- FORAWWV addendum scope is limited to that tested activation contract. Panel sign-off basis for merge: systems/formation contract proof via `tests/recruitment_engine.test.ts`, canon/process review confirming no Section 6 or gameplay-canon change, and QA/process evidence recorded in this plan/report.
- COMMAND_BOARD and MASTER_ROADMAP now park stale autonomous/product/telemetry/Fall-1995 lanes while this owner lane is active.

Verification passed: `desktop:startup-snapshot:check`, focused 10-file / 183-test pack, `typecheck`, `qa:player-journeys` 43 files / 583 tests, `git diff --check`, and manual in-app browser proof for RBiH and RS.

Second slice implemented before the next push:

- Chronicle generated decision-ledger rows now respect `recordTarget`: Chronicle-target receipts render in Chronicle, while Records-target receipts stay in Records and cannot backdoor into Chronicle history.
- Warroom historical ticker rows for Srebrenica fall, Srebrenica massacre, and Zepa fall now require the matching live event/rupture receipts before appearing, preserving the event-owned safe-area fall model.
- The blocked turn-advance toolbar action now says `REVIEW BLOCKERS` while blocked instead of looking like a normal `ADVANCE TURN` command.
- Hiding advanced Decision Room filters clears the active dossier/card selection with the lens/category state, preventing stale cards from remaining active off-screen.
- The GitHub Event System CI baseline failure was reproduced locally and traced to preserved officer display metadata in `final_save.json`; `control_delta.json`, `formation_delta.json`, `activity_summary.json`, `end_report.md`, `watched_operations.json`, and `weekly_report.jsonl` stayed byte-identical. The baseline manifest was re-blessed only for `apr1992_52w` `final_save.json` and the hash-reporting `run_summary.json`.

Additional verification passed after the second slice: `typecheck`, expanded focused UI pack 8 files / 128 tests, `qa:player-journeys` 43 files / 583 tests, `qa:first-hour:browser`, `qa:live-surface:browser`, baseline regression after the narrow manifest re-bless, `git diff --check`, and temp evidence cleanup.

Third slice implemented locally before the next broad verification packet:

- Shared fielded tactical-formation truth no longer counts records with both `status` and `readiness` missing as fielded force; explicit active rows still count unless readiness says forming/unreported/destroyed.
- Corps Front, Army HQ sector detail, Corps Detail, Army HQ Corps Card, OOB Corps Card, and Personnel no longer coerce missing personnel/equipment-condition data into exact zeroes or fully operational counts. Reported values render as exact, mixed values render as `Partial`, and completely absent values render as `Unreported`.
- Stale sector roster ids stay in diagnostic attributes (`data-stale-roster-ids`) while visible player copy shows only stale-record counts/help.
- Personnel Main Staff rows label HQ reserve/security context, so Main Staff reserve brigades do not read as ordinary front-line corps strength.
- Srebrenica/Zepa collapse comments and Lane V assertion messages now say the fall receipts are event-owned; Krivaja/Stupcanica remain chronology/AAR context only.
- Lorentz (UI/modern-wargame scout) and Maxwell (canon/process scout) were closed after their reports were verified and absorbed. Maxwell found active canon clean; only archived/superseded grep hazards remain as historical docs.
- Dirac (QA/process scout) found and closed the remaining sparse-data consistency gaps: lifecycle-free sector overrides no longer bypass fielded-force filtering, Corps Front combat-personnel fallback renders partial/unreported instead of exact totals, ORBAT total personnel renders partial/unreported, and the old Command Board statusless-projection compatibility sentence now carries the 2026-06-24 supersession rule.

Third-slice local verification: focused red/green pack passed 6 files / 92 tests; adjacent command/OOB/Corps Detail pack passed 6 files / 34 tests; `npm.cmd run typecheck -- --pretty false` passed; `git diff --check` passed; `npm.cmd run qa:player-journeys` passed 43 files / 586 tests; `npm.cmd run qa:first-hour:browser` passed; `npm.cmd run qa:live-surface:browser` passed; in-app browser proof covered RBiH war-start splash, foundational decision routing/lock, Army HQ Personnel, and 1st Corps command surface without error banners or visible raw diagnostic ids.

Fourth slice implemented locally before the broad browser/CI closeout packet:

- Army HQ modal chrome now uses reported personnel aggregation for total personnel, rendering exact, `Partial`, or `Unreported` instead of summing missing brigade rows as zero.
- Expanded Army HQ ORBAT equipment rows no longer treat missing tank/artillery condition as fully operational; missing condition renders unreported while reported operational counts remain exact.
- Supply Intelligence now distinguishes absent faction reserve records from explicit zero stockpiles. Missing general/heavy reserves render unreported and do not compute a false zero-stockpile runway.
- Records archive operation counts now use the same player-facing operation-history filter as the operation-history panel, so foreign/bot rows do not inflate the tab summary.
- Decision consequence ledger paramilitary and officer rows now explicitly gate to the loaded player faction, matching the rest of the player-owned consequence trail.
- CommandTopBar now uses commander terminology instead of `Command Authority`, localizes discard/authorize/submitting labels, and removes the `TRANSFUSING...` debug placeholder from the player surface. The top toolbar authority gauge now presents the player-facing resource as `Authority` / Presidency intervention authority instead of leaking `Command Authority` / Level-3 override jargon into the war-start overlay.
- Hubble (modern-wargame copy scout), Lovelace (records/ledger worker), and Godel (Army HQ aggregate worker) were closed after their reports were verified and absorbed.

Fourth-slice local verification: focused red/green pack passed 5 files / 87 tests; post-copy focused proof passed 3 files / 37 tests; final `npm.cmd run typecheck -- --pretty false`, `npm.cmd run qa:player-journeys` 43 files / 588 tests, `npm.cmd run qa:first-hour:browser`, `npm.cmd run qa:live-surface:browser` (41 live steps, 0 errors), and `git diff --check` passed on the final tree. Manual in-app browser proof on `http://127.0.0.1:3003/?dev=1` verified RBiH start, the richer `WAR BEGINS: 6 APR 1992` foundation splash, no old command-authority copy or raw `TRANSFUSING`/`AUTHORIZE directive`/`DISCARD` labels, Army HQ Records zero-count turn-0 truth with no hostile-takeover leak, Command Access -> 1st Corps visible sector/brigade inspect controls, sector inspect opening `corps-front-panel`, and brigade inspect opening sector + formation detail panels with no console errors or malformed values.

Fifth follow-up slice implemented locally on `codex/player-surface-edge-polish` after the Raman surface scout:

- Formation Detail now treats missing tank/artillery condition components as unreported instead of dereferencing absent fields and crashing.
- Tactical tooltips and expanded stack selectors clamp their anchors to the current viewport, so lower/right-edge interactions remain reachable.
- Front-edge tooltips distinguish missing pressure from explicit zero pressure: absent pressure renders unreported, while recorded `0` remains balanced.
- Army HQ sector detail no longer repeats projected density as both `Brigades per front segment` and `Troop density`.
- ORBAT, Corps Detail, and CorpsCard hover now highlight reported physical `location_osid`, not stale AoR coverage.
- Selected-settlement, municipality, current-ethnic readouts, and ethnic-map majority layers require complete census ethnicity fields and suppress partial rows instead of filling missing groups as zero.

Fifth-slice focused proof so far: the new Raman tests failed before production fixes, then the combined focused pack passed 7 files / 83 tests; Peirce follow-up tests failed before production fixes, then passed 4 files / 51 tests. Final combined focused proof passed 11 files / 134 tests and `npm.cmd run typecheck -- --pretty false` passed after both packets. Broad gates passed locally after the final code/docs closeout: `npm.cmd run qa:player-journeys` passed 43 files / 594 tests, `npm.cmd run qa:first-hour:browser` passed, and `npm.cmd run qa:live-surface:browser` passed.

Sixth command-surface ergonomics slice implemented locally on `codex/p2-command-surface-ergonomics` after Schrodinger/Halley scouts:

- Army HQ sector rows now expose explicit disclosure controls with `army-hq-sector-toggle`, truthful `aria-expanded`, stable detail `aria-controls`, matching detail ids, player-facing aria/title copy, and rendered sibling-control guards.
- OOB sector rows now carry player-facing inspect aria/title copy and preserve the first authored friendly sector OSID when routing through shared field inspection.
- Army HQ ORBAT formation rows now expose `army-hq-formation-toggle`, matching detail ids, player-facing expand/collapse aria/title copy, and sibling inspect controls.
- Corps Front force rows now expose `data-corps-front-row-kind` for frontline, reserve, command-directed, rear/support, and unresolved rows; missing overview metrics and Ops Snapshot supply readiness render `Unreported` instead of dash/omission.
- Formation Detail sector-picker aria copy now uses singular/plural current-brigade grammar.
- The shared `FlipCard` no longer uses rotated 3D faces that broke hit-testing in the Army HQ modal; inactive faces are hidden and cannot intercept pointer events.
- Live browser proof caught the flip-card blocker and then verified fresh RBiH start, war-start splash, OOB sector labels/routes, Army HQ sector toggles, Army HQ ORBAT opening, Formation Detail, and Corps Front Forces rows.
- Schrodinger and Halley were closed after their reports were absorbed.

Sixth-slice verification passed: focused UI/shell pack passed 8 files / 137 tests; `npm.cmd run typecheck -- --pretty false` passed; `git diff --check` passed; `npm.cmd run qa:player-journeys` passed 43 files / 613 tests; `npm.cmd run qa:first-hour:browser` passed; `npm.cmd run qa:live-surface:browser` passed. Browser-gate evidence folders were removed after verification; only `.tmp_dev_server` may remain if it belongs to the active browser/dev server.

Sixth-slice closeout completed: PR #445 merged to `main` at `ae0010b0f`, docs closeout pushed at `55c6360bc`, GitHub push workflows were green across Event System CI, Desktop Release Guard, Baseline Regression, and Full Suite + Structural Fingerprint, local/remote `codex/p2-command-surface-ergonomics` refs were pruned, and no extra worktrees or open PRs remained.

Seventh scout wave merged through PR #446 on `codex/p3-player-surface-truth-sweep`:

- Army Reserve elite/reserve rows now use stable brigade/corps names in action labels, expose recall/decline controls with specific aria copy, render missing reserve personnel and missing loaned-command fields as unreported, and expose campaign history as a stateful disclosure control.
- Presidential Decision Room Chronicle memory now counts only Chronicle-target decision receipts. Records-only receipts still file in Records but cannot create a false Chronicle review card.
- OOB operations, Corps Detail, and Corps Front no longer invent first-objective progress or green zero momentum when sparse operation state omits `current_objective_index` or `momentum`.
- Expanded Army HQ ORBAT campaign-loss rows now preserve partial casualty provenance: reported killed/wounded/missing values render exactly, while missing fields render `Unreported` instead of `0`.
- Settlement local-support controls now explain browser read-only/desktop-bridge unavailable state with visible copy and `aria-describedby`.
- Sagan, Feynman, and Heisenberg scout reports were absorbed into this batch; remaining non-blocking findings stay in the next scout queue rather than reopening packaging or Srebrenica/Zepa operation-delivery calibration.

Seventh-slice verification passed: focused red/green pack passed 8 files / 184 tests; `npm.cmd run typecheck -- --pretty false` passed; `git diff --check` passed; `npm.cmd run qa:player-journeys` passed 43 files / 616 tests; `npm.cmd run qa:first-hour:browser` passed; `npm.cmd run qa:live-surface:browser` passed. Manual in-app browser proof on `http://127.0.0.1:3003/` verified fresh RBiH start, `WAR HAS STARTED`, `War begins: 6 Apr 1992`, foundational decision routing/unblock, Army HQ, Personnel, command-card/sector inspect labels, Corps Detail/Corps Front routing, disabled sector-command bridge-unavailable copy, and console health with only the expected browser-fallback warning. GitHub PR #446 was green across Event System validation, desktop release check, desktop packaged runtime probe, engine-health-188w, scenario anchors, scenarios, structural fingerprint, test, typecheck, and full-suite; PR comments/reviews were empty; the clean PR merged to `main` at `ecf1cb4e0`. Local/remote branch refs were deleted/pruned, no extra worktrees remained, and Sagan, Feynman, Heisenberg, Hegel, and Carver were closed after report absorption.

Eighth P4 player-polish batch closeout candidate on `codex/p4-player-polish-batch`:

- Life-lessons process comments from stale merged PR reviews were reconciled into the indexed topic files, restoring the 280-entry count.
- Filed-record truth now counts only player-facing operation history, and Records/Desk decision-count summaries separate Records-routed receipts from Chronicle-routed receipts.
- Personnel sparse reserve/mobilization fields now render `Unreported` instead of crashing or inventing zero/NaN values, while explicit zero remains exact.
- Settlement stationed-unit clicks and embedded AAR formation links now route through the shared field-inspection resolver, preserving sector/corps/OSID context.
- Operation-opportunity consequence receipts sanitize raw executed operation slugs before filing Records copy.
- Corps Front condition and operation-supply aggregates now render `Unreported` for partial source reports instead of exact-looking averages; explicit zero remains exact.
- Tactical battle-marker hover listeners now unregister with the same handler references used for registration, avoiding duplicate hover behavior after remounts.
- Mill/Noether, Wegener/Ada, Meitner/Curie, Popper, and Euler scout/implementation reports were absorbed and closed.
- CI-wait scouts Nietzsche, Pascal, and Copernicus were absorbed and closed. Their follow-up closes sparse OOB mobilization truth, partial-zero ORBAT casualty visibility, Chronicle Wrapped/Records chart setup-provenance filtering, direct player-faction scoping for operation-opportunity receipts, and a live context-menu action proof that clicks Deselect instead of only opening the shell.

Eighth-slice closeout completed: focused red/green work covered each changed surface and the final combined focused pack passed 9 files / 159 tests with `npm.cmd exec -- vitest run tests/ui/filed_record_truth.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/president_desk_shell.test.ts tests/ui/personnel_player_safe_display.test.ts tests/ui/settlement_supply_status.test.ts tests/ui/aar_panel_drilldown_routing.test.ts tests/ui/decision_consequence_trail.test.ts tests/ui/corps_front_panel_routing.test.ts tests/ui_map_interactions.test.ts --pool=forks --reporter=dot`. The scout follow-up red/green pack passed 8 files / 79 tests. `npm.cmd run typecheck -- --pretty false` passed. `npm.cmd run qa:player-journeys` passed 43 files / 621 tests after the scout follow-up. `npm.cmd run qa:first-hour:browser` passed before the scout follow-up and `npm.cmd run qa:live-surface:browser` passed after it, with the final evidence proving context-menu Deselect action execution and dev-server port cleanup. Manual in-app browser proof on `http://127.0.0.1:3003/` verified fresh RBiH start, the war-start splash, the `WAR BEGINS: 6 APR 1992` identity brief, the foundational `What Is Bosnia?` Desk packet, Desk decision count truth, Army HQ command/OOB commander data, clickable top-level nav labels, and no sampled raw command slug leak. PR #447 merged to `main` at `df5251b94`; post-merge GitHub runs were green across Event System CI, Desktop Release Guard, Baseline Regression, and Full Suite + Structural Fingerprint. Local/remote branch refs were deleted/pruned, no extra worktrees remained, all P4 agents were closed after report absorption, and temporary browser evidence was cleaned.

Ninth P5 player-polish batch closed through PR #448 on `main` at `3182bddb8`:

- Army CO pushback warning rows no longer render blank/`Unknown commander` when the warning source lacks a named officer; they show `Commander record unreported`.
- Army HQ flip-card inactive faces now use native `hidden` plus existing `aria-hidden`/pointer/focus guards so hidden back/front controls cannot appear as visible interactive surfaces.
- Presidential Decision Room review aggregates route command-only review work to the Decision Room command card, preserving Army HQ Briefing as source handoff, instead of sending those rows to the Desk inbox.
- Chronicle generated operation and officer entries distinguish logged execution captures from final-held objectives; final-held-only operation AARs no longer become captured-objective headlines.
- Army HQ sector detail marks morale/fatigue/personnel aggregates as `Partial` when any line holder lacks reported personnel/cohesion/fatigue data.
- Formation Detail and Army HQ ORBAT label turn-zero recent engagement rows as setup records rather than calendar combat history.
- Pre-advance fallback blocker counts and Decision Room review cards trust live required player event decisions when that source is present, preventing stale queue `eventDecisionCount` metadata from inventing blockers.

Ninth-slice closeout completed: focused red/green tests passed 8 files / 180 tests with `npm.cmd exec -- vitest run tests/a5_army_co_pushback_ui.test.ts tests/ui_shell_frame_contract.test.ts tests/ui/presidential_decision_room.test.ts tests/chronicle_entries.test.ts tests/ui/army_hq_sector_truth.test.ts tests/ui/formation_detail_parity.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/pre_advance_command_review.test.ts --pool=forks --reporter=dot`; `npm.cmd run typecheck` passed; `npm.cmd run qa:player-journeys` passed 43 files / 625 tests; `npm.cmd run qa:first-hour:browser` passed; `npm.cmd run qa:live-surface:browser` passed after rerun with a longer local timeout, with dev-server cleanup verified. Manual in-app browser proof on `http://127.0.0.1:3003/` verified a fresh RBiH start through `WAR HAS STARTED`, the identity brief, `Begin`, the foundational Desk decision, Decision Room review routing without inbox leakage, Army HQ commander/OOB data, native-hidden inactive flip-card backs with zero visible inactive Back buttons, and no sampled `ENOENT`, `Unknown commander`, `Command Authority`, `TRANSFUSING`, `Obj 0/0`, or `front sitrep` leak. PR #448 merged to `main` at `3182bddb8`; post-merge GitHub runs were green across Event System CI, Desktop Release Guard, Baseline Regression, and Full Suite + Structural Fingerprint. Local/remote branch refs were deleted/pruned, no extra worktrees remained, all P5 scout agents were closed after report absorption, and temporary browser evidence was cleaned. The next P2 queue from closed scouts is battle marker/timeline fog filtering, Chronicle-vs-Records decision filing ownership, and reserve-origin order-arrow snapping.

Tenth P6 player-polish batch implemented locally on `codex/p6-player-polish-batch`:

- Battle marker generation, battle hover tooltips, and settlement battle timelines now share player-facing battle visibility: player-involved battles remain visible, fog-visible enemy contacts remain visible, and hidden enemy-only battles do not leak marker or timeline truth.
- Sparse battle casualty fields now stay nullable with explicit `casualties_reported` provenance; marker, tooltip, and settlement timeline copy renders missing casualties as `Unreported` instead of zero.
- Army HQ decision consequence records now render only Records-filed receipts. Chronicle-filed presidential decisions stay in Chronicle, and record-id navigation redirects Chronicle-target rows to Chronicle focus instead of opening Army HQ Records.
- Sector staged-order arrows now use only line-holding formations for sector-front origin snapping, so reserve/member-only brigades keep physical `location_osid` origins.
- Carson and Darwin implementation-agent reports were absorbed and closed; Huygens independent review is still pending at this plan-update point.

Tenth-slice closeout completed: focused P6 proof passed 11 files / 124 tests with `npm.cmd exec -- vitest run tests/ui_map_battle_casualty_truth.test.ts tests/ui_map_game_state_adapter.test.ts tests/ui_player_visibility.test.ts tests/ui/aar_tooltip_friction_labels.test.ts tests/ui/settlement_timeline_i18n.test.ts tests/ui/decision_consequence_records_panel.test.ts tests/ui/records_button_behavior.test.ts tests/ui_chronicle_operation_aar_link.test.ts tests/ui/chronicle_focus_routing.test.ts tests/ui/sector_staged_order_map_feedback.test.ts tests/ui_map_sector_lookup.test.ts --pool=forks --reporter=dot`; final focused/browser-contract proof passed 12 files / 130 tests; `npm.cmd run typecheck` passed; `npm.cmd run qa:player-journeys` passed 43 files / 631 tests; `npm.cmd run qa:first-hour:browser` passed; `npm.cmd run qa:live-surface:browser` passed; and `git diff --check` passed. The browser gates were updated to assert Chronicle-owned decision receipts stay in Chronicle, Records excludes Chronicle-target rows, and browser proof uses tileless basemap fallback by default for deterministic player-flow proof. Codex review caught the Records panel cap-before-filter edge case; the branch now builds the full ledger, filters Records rows, then applies the 50-row cap, with a regression covering 60 newer Chronicle decisions plus an older Records receipt. PR #449 merged to `main` at `3314a4247`; GitHub PR checks were green across Event System validation, Desktop Release Guard, desktop packaged runtime probe, engine-health-188w, scenario anchors, scenarios, structural fingerprint, test, typecheck, and Full Suite. The local/remote branch refs were deleted/pruned, no extra worktrees remained, Carson, Darwin, and Huygens were closed after report absorption, and generated browser evidence folders were removed.

Eleventh P7 player-polish batch implemented locally on `codex/p7-player-polish-batch`:

- Supply Panel and Tactical Card sparse records now render missing reserves, personnel, cohesion, and fatigue as unreported instead of invented zeroes or favorable readiness.
- OOB and Formation Detail preserve missing operation supply readiness, command span, exhaustion, home-distance personnel, and elite-loan destination fields as player-visible unreported truth.
- Formation counter health no longer emits a full bar when the authorized strength denominator is absent; sparse counters carry `hunreported` and omit the health bar.
- Ghost-map ethnicity paint requires complete Bosniak/Serb/Croat/Other census rows before rendering majority truth.
- Presidential Attention and Decision Room manifest counts now derive from live required decision/review rows instead of stale aggregate queue metadata.
- Personnel distinguishes absent `namedOfficerData` from an explicitly empty officer roster; missing sources show `Officer roster source is unreported`.
- Operations-mode effort paint now uses live `buildSectorFormationAssignment(...)` line holders and skips stale, forming, destroyed, and reserve-only roster ids.
- Bacon and Ohm were closed after their reports were verified and absorbed.

Eleventh-slice closeout completed: focused sparse-truth proof passed 14 files / 211 tests; the existing `npm.cmd run qa:player-journeys` gate passed 43 files / 639 tests; `npm.cmd run typecheck -- --pretty false` passed; the post-fix Personnel focused suite passed 16 tests; the CI-repair registry/Decision Room/pre-advance focused pack passed 3 files / 75 tests; `npm.cmd run qa:first-hour:browser` passed; `npm.cmd run qa:live-surface:browser` passed; `npm.cmd run desktop:map:build` passed with existing non-fatal Vite warnings; and `git diff --check` passed with expected CRLF normalization warnings only. Browser/vitest evidence folders were removed after verification; `.tmp_dev_server` remains only for the active browser session. PR #450 merged to `main` at `7204cffca`; GitHub checks were green across Event System validation, Desktop Release Guard, desktop packaged runtime probe, Baseline Regression, structural fingerprint, and Full Suite. The local/remote `codex/p7-player-polish-batch` refs were deleted/pruned, no extra worktrees remained, and Bacon, Ohm, Banach, Erdos, and Parfit were closed after report absorption. Next P8 queue from the closed scouts: enemy-contact redaction across map/stack/detail, Opportunity Ledger unreported-axis truth, stale Decision Room metric/handoff counts, and keyboard/focus accessibility hardening.

Twelfth P8 player-polish batch implemented locally on `codex/p8-player-polish-batch`:

- Fog-visible hostile tactical formations now project as generic enemy contacts. The map marker redacts raw enemy formation ids, names, command anchors, sector anchors, operation membership, condition stats, posture, movement, disruption, and health/morale suffixes.
- Enemy-contact marker clicks, context clicks, and stack-expansion selections route to settlement/contact context instead of hostile Formation Detail.
- Settlement detail now separates friendly stationed units from observed enemy contacts, preserving local pressure awareness without leaking hostile order-of-battle detail.
- Opportunity Ledger sparse axis evaluations render `Unreported` instead of false `0/N` readiness.
- Operation-opportunity completed counts require a resolved AAR; stale `executed_op_aar_id` pointers no longer inflate completion totals.
- Presidential Decision Room pending, urgent, source-handoff, command-question, lens, and loop-step counts use live weighted cards rather than stale manifest summary metadata.
- Global shortcuts now ignore focused interactive controls. Plain Tab remains native focus traversal, corps cycle uses `Ctrl+Tab`, and focused buttons/role controls keep their native keyboard behavior.
- Army HQ collapsible sections and Formation Detail tabs expose stable accessibility relationships, and `.kbd-focus:focus-visible` makes keyboard focus visible.
- Kuhn, Boole, and Gibbs scout reports were absorbed into this batch and will be closed after final docs/verification.

Twelfth-slice local verification so far: focused P8 proof passed 8 files / 185 tests with `npm.cmd exec -- vitest run tests/ui_player_visibility.test.ts tests/ui/stack_expansion_overlay_viewport.test.ts tests/ui/settlement_supply_status.test.ts tests/ui/presidential_decision_room.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui_map_game_state_adapter.test.ts tests/ui/map_mode_shortcut_contract.test.ts tests/ui/accessibility_reduced_motion.test.ts --pool=forks --reporter=dot`; `npm.cmd run typecheck -- --pretty false` passed; `npm.cmd run qa:first-hour:browser` passed; `npm.cmd run qa:live-surface:browser` passed after a local timeout rerun and dev-server port cleanup; `npm.cmd run qa:player-journeys` passed 43 files / 643 tests; `npm.cmd run desktop:map:build` passed with existing non-fatal Vite warnings; and `git diff --check` passed with the existing CRLF-normalization warning. Generated `.tmp_first_hour_browser_gate` / `.tmp_live_surface_browser_sweep` evidence folders were removed; `.tmp_dev_server` remains only for the active local browser session. Kuhn, Boole, and Gibbs were closed after report absorption. Remaining closeout gates: GitHub PR checks/comments, merge, branch prune, and final clean-worktree proof.

Twelfth-slice follow-up after PR #451 scout absorption:

- Army HQ no longer mounts the executable Presidential Decision Room panel. It renders a source-handoff card into the Warroom-native Decision Room instead.
- Army HQ Presidential Attention no longer embeds the operation-opportunity executor; opportunity decisions remain Decision Room-owned.
- `openDecisionRoomTarget` now opens the Warroom-native Decision Room for `decision-room` targets instead of only staging a hidden lens request.
- App-level global shortcuts now share the interactive-focus guard used by map shortcuts.
- Settlement Detail tabs now control real tabpanels.
- Warroom docket advance-review counts now use weighted grouped-card counts.

Follow-up verification passed: route/accessibility proof 5 files / 45 tests; combined P8 + follow-up focused proof 12 files / 212 tests; `npm.cmd run typecheck -- --pretty false`; `npm.cmd run qa:player-journeys` 43 files / 644 tests; `npm.cmd run qa:first-hour:browser`; `npm.cmd run qa:live-surface:browser`; `npm.cmd run desktop:map:build` with existing non-fatal Vite warnings; and `git diff --check`. The GitHub Codex review comment on synthetic enemy-contact hover was addressed with focused tooltip/visibility proof 3 files / 36 tests plus typecheck. The GitHub Baseline Regression stale expectation was repaired after the live weighted Decision Room count made the Warroom status dock correctly show `1 pending` instead of stale aggregate `2 pending`; local proof passed 3 files / 70 tests with `npm.cmd exec -- vitest run tests/ui/advance_turn_button_gated_feedback.test.ts tests/ui/warroom_priority_docket.test.ts tests/ui/presidential_decision_room.test.ts --pool=forks --reporter=dot`. Generated `.tmp_first_hour_browser_gate` / `.tmp_live_surface_browser_sweep` evidence folders were removed; `.tmp_dev_server` remains only for the active local browser session. Remaining closeout gates after this follow-up: update PR #451, inspect GitHub/Codex comments, merge only once green, branch prune, and final clean-worktree proof. P9 scout queue held for the next tranche: Corps Front low-intel objective accessible/routing leakage; inferred settlement population/displacement precision; OOB enemy-anchor fallback; municipality-substring timeline matching; sparse supply forecast precision; derived casualty split provenance; stale operation-key routing; and legacy `autonomy_panel` branch retirement.

Twelfth-slice closeout completed: PR #451 merged to `main` at `ed8a04e8a` after green GitHub checks across Event System validation, Desktop Release Guard, desktop packaged runtime probe, Baseline Regression (`typecheck`, `test`, `scenario-anchors`, `scenarios`, and `engine-health-188w`), structural fingerprint, Typecheck, and Full Suite. Local and remote `codex/p8-player-polish-batch` refs were deleted/pruned; the worktree audit shows one clean `main` worktree; only `.tmp_dev_server` remains for the active local browser/dev session. James, Newton, and Einstein were closed after P9 scout absorption. P9 implementation should start with settlement timeline municipality-substring false-history matching, Corps Front low-intel objective leakage, stale operation-key routing, and derived casualty-split provenance, then fold in settlement estimate labeling, OOB enemy-anchor fallback, sparse supply precision, and legacy `autonomy_panel` retirement if the batch remains cohesive.

Thirteenth P9 player-polish batch implemented locally so far on `codex/p9-player-polish-batch`:

- Settlement timelines no longer attach historical events by municipality-substring matching; explicit settlement or municipality scope metadata is required before a historical event appears on a settlement timeline.
- Corps Front low-intel objective controls no longer resolve real objective names for accessible labels and cannot route/click to the hidden settlement while intelligence is below the reveal threshold.
- Operations Panel no longer turns a stale non-null operation key into the first live operation on open.
- OOB sector drilldown no longer falls back to enemy OSIDs as field-inspection anchors when a sector has no friendly segment anchor.
- Formation casualty split provenance now distinguishes ledger-exact, derived-from-total, and unreported splits; derived fallback KIA/WIA/MIA values render as estimated in Formation Detail and Army HQ ORBAT.
- Settlement population/displacement panels label municipality-ratio fallback flows as estimates when no settlement-level displacement receipt exists.
- Averroes and Kierkegaard implementation reports were absorbed and both agents were closed.

P9 local verification passed: focused settlement/Corps Front proof passed 2 files / 49 tests; focused OOB/Operations/settlement-estimate proof passed 3 files / 58 tests; focused casualty provenance proof passed 3 files / 117 tests; combined focused proof passed 8 files / 224 tests; `npm.cmd run typecheck` passed; `npm.cmd run qa:player-journeys` passed 43 files / 651 tests; `npm.cmd run qa:first-hour:browser` passed; `npm.cmd run qa:live-surface:browser` passed; `npm.cmd run desktop:map:build` passed with existing non-fatal Vite externalization/chunk warnings; `git diff --check` passed. Manual live-page sanity against `http://127.0.0.1:3003/` reached `AWWV Map`, showed the faction picker, had no visible error banners, and recorded only one benign missing-resource 404 console error. Generated browser evidence folders were removed after verification; only `.tmp_dev_server` remains for the active local browser/dev session. Remaining before closeout: GitHub comments/checks, merge, branch prune, and clean-worktree proof. Deferred P9 queue: sparse Supply Intelligence forecast precision and legacy `autonomy_panel` retirement.

## Pyrrhic Roles

- **Orchestrator:** keep the lane scoped, update board/roadmap/ledger, merge and clean branch/worktree after verification.
- **UI/UX Developer:** inspect live Army HQ/OOB/sector/brigade flows and implement player-facing fixes.
- **Technical Architect:** protect surface ownership: President's Desk and Decision Room own presidential decisions; Army HQ owns staff detail, command review, OOB, records, and operation evidence.
- **Modern Wargame Expert:** challenge information hierarchy and repeated-action ergonomics.
- **QA Engineer:** own focused red/green tests, `qa:player-journeys`, and live browser gates.
- **Quality Assurance Process:** review closeout evidence and stop any unsupported completion claim.

## Scope

1. Live browser sweep:
   - Start a fresh faction game.
   - Resolve opening splash/brief/foundational decision.
   - Click Army HQ summary, personnel/ORBAT, sectors, corps cards, Corps Front tabs, brigade rows, Formation Detail tabs, settlement links, and Records handoffs.
   - Record confusing copy, missing context, stale selection, raw ids, invented zeroes, invented readiness, and route ownership mismatches.
2. Focused code pass:
   - Prefer shared helpers already used by the closed sector-truth plan.
   - Keep missing data as unreported/incomplete.
   - Keep physical presence separate from AoR, reserve membership, and command-only anchors.
   - Preserve Decision Room / President's Desk ownership for presidential choices.
3. Test pass:
   - Write failing focused tests before production changes.
   - Expand existing UI/player-journey coverage only where the live sweep finds a real gap.
4. Documentation pass:
   - Update `COMMAND_BOARD.md`, `MASTER_ROADMAP.md`, `docs/PROJECT_LEDGER.md`, and this plan with exact evidence.

## Non-Goals

- No installer/package work.
- No BCS-only copy cleanup unless touched by a general player-truth fix.
- No Srebrenica/Zepa operation-delivery tuning; fall receipts remain event-owned.
- No sector-builder/calibration change unless a failing proof shows player-facing UI cannot honestly represent current truth.

## Verification

- Focused UI tests for changed surfaces.
- `npm.cmd run typecheck -- --pretty false`.
- `npm.cmd run qa:player-journeys`.
- `npm.cmd run qa:first-hour:browser`.
- `npm.cmd run qa:live-surface:browser`.
- Manual in-app browser proof on the active local app.
- `git diff --check`.

## Done Means

The batch is only complete when the player can move through Army HQ -> sector/corps -> brigade/formation -> settlement/records without seeing invented favorable truth, raw/debug labels, missing owner context, or presidential decisions routed through Army HQ as the primary surface; all evidence is documented, branch is merged to `main`, branch/worktree are deleted, and GitHub checks are green.

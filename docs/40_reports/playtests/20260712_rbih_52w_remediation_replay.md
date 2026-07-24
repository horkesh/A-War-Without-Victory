# RBiH 52-Week Remediation Replay - 2026-07-12

Local-only remediation evidence. No staging, commit, push, PR, packaging, release tagging, or public release claim is authorized by this report.

## Verdict

**Agent-actionable local remediation: PASS on `rbih-52w-remediation-final-v47`.** A fresh RBiH desktop campaign reached exact turn 52 without overrun, runtime intervention, failed IPC, unresolved required decisions, unlocated active combat formations, or console/page/network diagnostics. Recruitment, Command Autonomy, two Command Authority actions, historical choices, staff proposals, Vance-Owen, map counters, Decision Room, Army HQ, Records, Chronicle, Codex, and every major route were exercised through the Electron player path.

All 334 screenshots were assembled into 42 contact sheets and manually inspected. No new agent-actionable blocker was found. This is not the D2 owner verdict: D2 owner play, D3/D4 release operation, packaging, publication, commit, and push remain open or out of scope.

## Evidence Of Record

| Evidence | Result |
|---|---|
| Fresh Electron run | `tmp-paradox-qa-20260710/paradox-local-qa-rbih-52w-remediation-final-v47.json` |
| Bound autosave | `tmp-paradox-qa-20260710/rbih-52w-remediation-final-v47-autosave.json` |
| Bound comparator | `tmp-paradox-qa-20260710/rbih-52w-remediation-final-v47-calibration-bound.json` |
| Contact sheets | `tmp-paradox-qa-20260710/contact-sheets-rbih-52w-remediation-final-v47/manifest.json` plus 42 generated sheets |
| Resume proof | `tmp-paradox-qa-20260710/paradox-local-qa-rbih-52w-remediation-resume-v34.json` |
| Startup snapshot | `data/derived/startup/apr_1992_initial_save.json` |
| Structural fingerprint | `data/calibration/structural_fingerprint_40w.json` |

Evidence hashes:

- Electron log SHA-256: `7c3c01e77ca5b0413d3db547d88015cbb345c98b70a587d03e92d3c81b0d5cc1`
- Autosave and serialized-state SHA-256: `8771e5481dab6d1510dfa7542efc18e41d592696609d02133adecd5a7aced217`
- Startup snapshot SHA-256: `91dfde48f6538c6992a0073aef9be5d68039820b479d08550e46ab8b8789e4ae`

## Exact Replay Result

The v47 run used RBiH, target turn 52, strategic mode, live events, historical-default responses, accepted historical operations, standing paramilitary denial, Assisted autonomy, and required recruitment success.

| Gate | Exact result |
|---|---|
| Target/final/max turn | `52 / 52 / 52` |
| Screenshots/events | `334 / 334` |
| Contact sheets manually inspected | `42 / 42` |
| Console messages / page errors / network failures | `0 / 0 / 0` |
| Pending event decisions | `0` |
| Unresolved proposals | `0` |
| Pending paramilitary requests | `0` |
| Final control, HRHB/RBiH/RS | `85 / 255 / 372` |
| Final formations, HRHB/RBiH/RS | `45 / 98 / 126` |
| Active located formations, HRHB/RBiH/RS | `34 / 92 / 85` |
| Unlocated active combat formations, all factions | `0` |

The six active RBiH records without locations are five corps command records and the General Staff army-HQ record. They are deliberately non-spatial command records, not missing field formations.

### Player Agency And Surface Proof

- Recruitment succeeded once through the live player path at turn 4.
- Army HQ Personnel opened Command Autonomy and selected `Assisted`; final autonomy was level 1 with no pending level change.
- Command Authority issued `front-visit` and `address-nation`; each spent 10 CA, presented a response, and resolved.
- Twenty-five distinct strategic proposals were accepted with explicit turn-scoped receipts. The cadence is deliberate player input, not one unresolved proposal being silently duplicated.
- Vance-Owen resolved through the production desktop boundary without a runtime bridge.
- Two full route/map tours exercised 24 exact formation-counter selections, five map-area selections, all Decision Room lenses, all Army HQ tabs and corps, Recruitment, Autonomy, Records, Chronicle, and Codex.
- The final map proof exposed a two-member stack through its badge/picker and opened the exact requested member; the bounded fan exposed 12 visible badges without collapsing the stack or relocating a counter away from its physical OSID.
- Decision Room category filtering exposed an explicit `Filtered by Conscience & Atrocity` state, an exact empty result, and a visible clear-filter action. Dossier review used the selected card's exact source handoff rather than a grouped-card fallback.
- Map state revisions kept the previous canvas inert beneath a truthful loading cover until the current turn/save fingerprint rendered. The QA harness waited for the embedded frame to reach network idle before dismissing the intro; v47 recorded zero startup request aborts.
- The pre-tour and post-tour state/autosave hashes remained exactly `8771e548...aced217`; inspection did not mutate campaign state.
- Essential-copy readability checks reported zero failures. Manual inspection found no clipped primary action, unreadable required decision, covered click target, or false route transition.

## Bound Comparator

The schema-2 comparator binds the fresh Electron log and autosave to the same `apr1992_definitive_52w` source and startup snapshot used by controlled-player and headless branches. Faction, turn, scenario start, war timeline, and initial control all match.

| Branch | Final control, HRHB/RBiH/RS |
|---|---|
| Electron v47 | `85 / 255 / 372` |
| Controlled player | `85 / 251 / 376` |
| Headless | `84 / 252 / 376` |

| Delta | HRHB / RBiH / RS |
|---|---|
| Electron minus controlled player | `0 / +4 / -4` |
| Electron minus headless | `+1 / +3 / -4` |
| Controlled player minus headless | `+1 / -1 / 0` |

Turn 1 is exactly equal between Electron and the controlled-player branch at `102 / 310 / 300`. Headless is `102 / 311 / 299` because it automatically resolves an RBiH paramilitary capture while player policy denies paramilitary requests. Across the full campaign, Electron additionally performs one recruitment, two Command Authority actions, and 25 proposal acceptances. These 28 attributed inputs establish expected player-path divergence; the comparator records `nondeterminism_claimed: false`. It does not claim that each action's exact territorial contribution has been isolated.

## Resume And Diagnostic Lineage

`rbih-52w-remediation-resume-v34` is supporting resume proof: exact turn 52, 98 screenshots, zero runtime/readability diagnostics, two 12-counter tours, and exact route/Decision Room/Army HQ coverage on a resumed save. Runs v35-v46 were harness-development or diagnostic runs that exposed hidden-mounted-surface, exact-counter-selection, stale-map, stack, category-filter, dossier-handoff, and startup-capture weaknesses. They are not acceptance evidence. v47 is the fresh acceptance run.

## Gate Status

| Gate | Status |
|---|---|
| Workstreams A-E agent-actionable remediation | **PASS locally** |
| Fresh exact turn/no-overrun/runtime diagnostics | **PASS** |
| Recruitment/autonomy/two CA actions | **PASS** |
| Required blocker and formation-location clearance | **PASS** |
| Bound player/headless comparison provenance | **PASS** |
| 334-screenshot / 42-sheet manual review | **PASS** |
| D2 owner full-campaign play | **OPEN - owner gate** |
| D3/D4 packaging and release evidence | **OPEN - operator/owner gate** |
| Commit, push, PR, release publication | **OUT OF SCOPE** |

## Final Verification

| Gate | Result |
|---|---|
| TypeScript | `npm.cmd run typecheck` passed |
| Focused v47 regressions | 9 files / 116 tests passed with `NODE_OPTIONS=--throw-deprecation` |
| Full current-tree suite | 3,397 / 3,397 suites; 11,322 passed, 29 pending, 0 failed; deprecations treated as errors |
| Full-suite artifact | `tmp-paradox-qa-20260710/vitest-full-results-v47-current.json` |
| Player-experience gate | Passed typecheck, desktop release builds, 44 files / 729 journey tests, first-hour browser, live-surface browser, and output scan |
| Player-experience log | `tmp-paradox-qa-20260710/qa-player-experience-v47-current.log` |
| Scenario baselines | `Baseline regression: all scenarios match.` |
| Startup snapshot | `desktop:startup-snapshot:check` passed |
| Structural fingerprint | `89efaf6525c82bca` matched expected |
| Diff integrity | `git diff --check` exited 0; line-ending notices only |

The complete verification ran after the final network-idle harness change and documentation synchronization. No test result is borrowed from the earlier v43 tree.

## Closeout Boundary

The July 11 report remains the historical source of the defects and acceptance criteria. This report closes all currently known agent-actionable items from that review and the subsequent 52-week replay. It does not certify subjective owner satisfaction, packaged-build experience, release publication, or remote CI because none of those actions was authorized in this local-only review.

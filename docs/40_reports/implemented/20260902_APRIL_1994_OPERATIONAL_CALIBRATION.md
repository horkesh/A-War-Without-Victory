# April 1994 Operational Calibration

**Date:** 2026-09-02

**Scope:** April 1994 checkpoint at week 104 of the sole scoring scenario

**Scenario:** `data/scenarios/apr1992_definitive_188w.json`

**Baseline:** clean Node 22 measurement, 677/712 at April 1994

**Accepted result:** `runs/apr1994_three_fixes_v73/apr1992_definitive_188w__1db784e85c2e6de0__w104`

**Result:** 703/712 OSIDs (98.74%); area-weighted 98.9%

**Implementation commit:** `4167d2bd4` and its April-calibration ancestors beginning at `09273025a`

## Integration audit — 2026-09-12

### Current checkpoint — 2026-09-13

**Coverage is approved, implemented and verified. All calibration work is integrated in the
candidate, but clean full-horizon acceptance is NO-GO and main remains `9588876bc`.** The measured
source is `51fe494151397c1cc6521b54006b0f8da70705e5`; no second 188-week run, pin refresh or
remote push followed the failure.

The owner explicitly approved the staffability rule after its plain-language explanation.
Both affected 40-week tests pass once: **2 files, 17/17 tests, exit 0**, 161.44 seconds. Both
report nine verified isolated gaps and zero staffable gaps. Positive/negative classifier controls
pass 4/4 and independent review is GO. The rule retains raw counts, saved isolation markers,
nonempty graph validation and recomputation from legal donors; it retires only the approved raw
two-gap limit. [Coverage review](../../../logs/roadmap-integration-20260912/approved-coverage-review.md).

**POST-A** ran through the canonical preflight with `AWWV_S6_GRADE_RUN=true`, Node 22.23.2,
clean Git state and no override, using a new directory and omitting `--map`:
`runs/roadmap_integration_20260912/post_a/apr1992_definitive_188w__6898d6d2e324c7a3__w188_n0`.
It completed 188 weeks in 288.63 seconds, scenario exit 0, final hash `5d6f8378dbf433fc`.
All 31 consumed inputs match the preserved reference's normalized digest. The complete
[verdict](../../../logs/roadmap-integration-20260912/post-a-verdict.json) and
[independent review](../../../logs/roadmap-integration-20260912/post-a-integration-review.md)
bind the actual artifacts and validator results.

| Checkpoint | Accepted reference output | POST-A | Unchanged floor | Verdict |
|---|---:|---:|---:|---|
| January 1993 | 702 | 692 | 694 | FAIL |
| April 1994 | 678 | 698 | 674 | PASS |
| April 1995 | 672 | 694 | 668 | PASS |
| October 1995 | 667 | 665 | 641 | PASS |

Additional unmet conditions:

- **Western cascade:** 33 against reference 40 and permitted minimum 38. Twelve lost matches
  are offset by five recoveries; this is not seven uniquely lost settlements.
- **Prozor injection:** truth reports one `op_empty` error at t41. Lug and Paros were RBiH-held
  then, not HVO-held: their first HVO captures are t54/t55. The validator incorrectly labels
  targets blocked by bilateral combat permission as `all_objectives_owned`. The queue's actual
  ownership test is correct, but validation proceeds before a legal hostile objective exists.
  The proposed correction is permission-aware deferral with retained retry and truthful wording,
  preserving the blocking error gate. [Source diagnosis](../../../logs/roadmap-integration-20260912/post-a-prozor-diagnosis.md).
- **Farz:** the reference capture is Briješnica Donja at t168 by the 327th Viteška Mountain
  Brigade, 3rd Corps. POST-A uses the same cell, brigade and corps at t169, with a different
  defender/battle. The exact t168 exception does not establish acceptance of that changed
  timing. An earlier handoff incorrectly named Stari Majdan; direct control-event comparison
  disproved that claim and the final review explicitly corrects it.

Passing evidence remains visible: all 31 historical anchors, all nine enclave guards, eastern
capture provenance, direct consistency (0 failures), 188 turn seals plus one final-save seal
with zero unresolved assignments, and the other nine truth domains. Child exits are health 1,
consistency 0, checkpoints 1 and truth 1. The validator driver's exit 0 only means it collected
evidence; it is not an aggregate acceptance result. HVO Central Bosnia has 6/12 brigades below
400 at weeks 104 and 188, improved from the branch's 7/12 but still substantive understrength.
The unchanged 1,500-person Travnik brigade remains unreachable and unassigned. These residuals
are retained even though that critical-ratio threshold no longer fires.

**Bounded attribution:** January has ten newly wrong cells and zero recoveries. Six directly
lose retired passive transfers; four come from changed execution of existing operations
(Donji Vakuf/Prusac, Maglaj–Jablanica and Vranjevići). Do not restore passive captures to meet
the floor. Eleven western losses lack earlier Operation Sana combat captures; its start, roster
and objective list are unchanged, but the Sanski Most/Ključ axis stalls. The remaining loss is
Ugarci's retired consolidation. Preserve five recoveries, including Southern Move's late combat
gains. [Exact per-cell comparison](../../../logs/roadmap-integration-20260912/post-a-regression-attribution.md).

**Baseline status:** all eight 188-week pins differ in a read-only comparison; `canon:check` was
not launched because the first run failed. The retained clean `933132e90` 40-week artifact also
fails the CI structural fingerprint (expected `cd5582f4a945842e`, actual `6af86b2c1012c243`). It
establishes lineage drift, not exact `51fe49415` fresh-40-week provenance. No extra scenario was
run for that check and no pins were replaced. The preserved main comparator still matches its
eight accepted pins, with its dirty metadata qualification unchanged.

**Proposed next scope, not activated:** repair permission-aware Prozor deferral; diagnose and
correct existing January operation timing/execution and Sana axis progression; explicitly
resolve the Farz timing/attribution difference. Retain all floors, existing historical objectives,
control protections, the approved coverage rule and Southern Move gains. Start with focused
reproductions and one independent review; keep one change per measured run. A bounded allowance
of at most four additional 188-week runs (roughly 20–40 minutes total, including a final repeat
only after hard gates pass) plus one required full suite (roughly 30–40 minutes) is proposed.
Implementation time is additional. Any new unexplained hard failure or exhausted run allowance
stops the packet; do not broaden tuning or refresh baselines automatically. This exceeds the
completed one-run-plus-conditional-repeat plan and requires the owner's scope decision.

All 18 worktrees remain registered. All 28 original dirty paths and their backups, all 22 ordered
stash objects, protected scenario/source/operational data, FORAWWV, baseline pins and main were
rechecked without drift before this report update. Final calibration, R7/R8 acceptance and R9
readiness remain separate open roadmap work.

Final documentation checks pass **32/32** across three files; the register validates with
**10 open gates**, and the regenerated index retains four open roadmap lanes. Added or changed
local links resolve. The [closeout receipt](../../../logs/roadmap-integration-20260912/post-a-closeout-checks.json)
records unchanged production source since POST-A, the preserved 18-tree inventory, 28 original
dirty paths and 22 ordered stashes. This checkpoint records failed acceptance without altering
its measured source.

### Earlier checkpoint — before coverage approval

The following retains the preceding checkpoint. Its pending-approval and unrun-188-week status
is superseded by the current measurement above.

**All 20 calibration commits are integrated; canon amendments and bounded corrections are
complete. Promotion to main and calibration acceptance remain held on the coverage criterion
and subsequent full-horizon proof.** The execution branch remains
`codex/roadmap-calibration-integration-20260912`; main remains `9588876bc`. No remote push occurred.

The owner's instruction, "Also amend the engine invariants doc too", approves both proposals
below. Commit `933132e90` amends Engine Invariants §14.8b and §16.2 and propagates them to the
active Systems Manual, pipeline entrypoints and context note. Passive post-paramilitary control
transfer is retired. Ordinary elite recall is deferred for live authored historical operations;
strict below-50% personnel still forces permanent degradation and immediate recall. FORAWWV and
the runtime thresholds were not changed by that amendment. Independent canon review is GO;
69 focused tests and data checks passed before the complete suite was launched.

**Full-suite evidence:** one clean `933132e90` invocation of
`npm.cmd run test:vitest:balanced`, with child-local Git Bash, took 32 minutes 24 seconds:
1,379 passed / 8 failed / 4 skipped files; 13,935 passed / 9 failed / 43 skipped tests; exit 1.
The [complete receipt](../../../logs/roadmap-integration-20260912/full-suite-verification.md)
binds the raw log's SHA and all six failure categories. Unaffected passing evidence is reused;
no unchanged full-suite retry was run.

| Finding | Correction and evidence |
|---|---|
| Stale Cerska field-map expectations | Both exact fixtures now assert the accepted 10 objectives, 3 staging positions and 9 formations. |
| Stale baked startup snapshot | Regenerated only through `desktop:startup-snapshot:build`; exact independently predicted normalized SHA `45bcfd9746aabaa85e49d2ce2a44efffdd36ecb7a53966edd450ed419f67a3bf`. Five grouped structural paths contain only the authored pre-staging orders and operation-queue changes. |
| Hover-map missing merge map | Reader now resolves the single governed `data/derived/operational/micro_osid_merge_map.json` after main's earlier relocation. No duplicate data file. |
| Q2 faction-symmetry guard | Briefing consumes upstream bilateral target data instead of re-deciding doctrine with faction literals. RBiH offensive/HVO defensive behavior is pinned by a direct regression. The original guard is unchanged. |
| Dependency hook timeout under parallel load | Isolated unchanged test passes 12/12 in 3.12 seconds. No timeout or dependency change. |
| Two large-empty-sector cap failures | Nine lawful isolated pockets exceed the unchanged cap of two. This criterion remains unmet pending the owner decision below. |

The first three corrections pass 39/39 tests across eight files, including startup consistency,
ownership guards and CommonJS bundle build/load. Q2's four-file group passes 40/40; independent
review caught invalid stance literals in the new test fixture, corrected to canonical
`offensive`/`defensive`, and the targeted two-file rerun passes 26/26. Typecheck, data integrity
and diff checks pass. [Independent diagnosis and correction review](../../../logs/roadmap-integration-20260912/integration-fixture-diagnosis.md)
records the precise scope. The Q2 literals were introduced by the calibration branch, not main.

**Coverage decision:** the preserved clean-source 40-week diagnostic ends at hash
`1735518d58ea4444`. All nine large empty sectors retain `unstaffed_front:true`. Each has 3–25
otherwise legal same-corps donors, but none shares a faction-controlled graph component with its
front. Independent review checked command ownership, loan exclusions, movement legality and
recomputed all nine markers after deleting them in memory. There are zero reachable staffable
gaps. This establishes lawful isolation, not an assignment or operation-participant depletion
defect. It does not change the existing accepted numerical threshold.

The [exact proposed test patch](../../../logs/roadmap-integration-20260912/proposed-coverage-contract.patch)
replaces the raw count cap in both failing tests with Engine Invariants §14.9's staffability
contract: report every large gap, require its explicit marker, recompute legal reachability,
and reject any gap that could legally be staffed. The patch is **unapplied**. Retiring the
two-sector outcome cap requires explicit owner approval under the shared execution contract;
the approved removal of passive capture does not silently retire a different test criterion.

**Next authorized verification after that decision:** apply the reviewed patch only if approved;
run the two affected 40-week test files (estimated 2–5 minutes, require zero staffable gaps and
all existing assertions passing). Stop on a new failure and inspect its evidence before any
expensive retry. Reuse unaffected full-suite and correction evidence. Then commit clean source
and run the already planned first canonical 188-week run, validate every hard gate, and obtain
the second reproduction via `canon:check` only if the first passes. No 188-week run, baseline
refresh, full campaign or package acceptance was performed during this follow-up.

**Reference preservation:** the current `_baseline_tmp` outputs were copied and hash-verified
before any future canon run. Their eight pinned artifacts match the accepted manifest, but
their actual metadata is `e607508bc`, `git_dirty:true`; they are an output comparator, not clean
source proof. Normalized input hashing reconciles all 31 inputs (three raw CRLF differences).
The clean historical n392 remains the protected-anchor reference; the future clean candidate
pair must establish current provenance. [Reference audit](../../../logs/roadmap-integration-20260912/reference-provenance-review.md).
All 28 original dirty paths and backup hashes, all 22 ordered stash object IDs, calibration
ancestry and protected scenario/source/operational data were rechecked without drift.

### Initial checkpoint — before owner canon approval

The following records the initial hold and its then-unrun gates. The current checkpoint above
supersedes those status statements while preserving the original evidence and decisions.

**Initial verdict: candidate committed; promotion to main and calibration acceptance held.**
The owner asked to integrate calibration work and reach a clean branchable point. Candidate
`7382f26f8` on `codex/roadmap-calibration-integration-20260912` merges `9588876bc` and
`f30ce94c8`, retaining all 20 unique calibration commits. The ten conflicts are resolved;
newer main history and the owner-authorized #518 baseline refresh are preserved. Main itself
remains `9588876bc` pending the decisions and checks below. No remote push occurred.

Two higher-precedence conflicts require explicit owner disposition before expensive validation:

| Clause | Existing invariant | Candidate behavior / proposed amendment |
|---|---|---|
| Engine Invariants §14.8b | Post-fade passive rear-pocket consolidation is a production phase. | Retire passive consolidation; topology may supply operational purpose, while attack/operation resolution and existing guards own capture. |
| Engine Invariants §16.2 | Casualty/morale thresholds force elite recall. | Defer casualty, morale and cohesion recalls for an authored historical operation during planning/execution/recovery; below 50% personnel still forces immediate degradation/recall. |

The exact [two-clause proposal](../../../logs/roadmap-integration-20260912/proposed-engine-invariant.patch)
is unapplied. It states the current strict below-70%/below-50% code thresholds precisely; it does
not silently change comparison operators. The independent
[calibration/canon review](../../../logs/roadmap-integration-20260912/calibration-review.md)
confirms these two conflicts, coherent merge adaptations and no third material conflict.
FORAWWV is untouched. The two owner questions are pending; no canon criterion is retired here.

**Verified cheap evidence:** Typecheck exit 0. Initial six-suite run was 221/222, exit 1;
the sole failure expected 191 pipeline phases where combined source has 190 (one prestaging
phase added and consolidation removed). Corrected targeted rerun 6/6, exit 0. The initial failure
is retained in `logs/roadmap-integration-20260912/cheap-merge-tests.log`; the correction and
normal commit hook pass. Changed-source diff check passes. The historical-name reservation implementation is preserved;
its only merge adaptation removes a trailing blank line.

**Evidence limits:** v72/v73 are identical at week 104 (initial SHA-256
`a536e7bbb8e9de7b30abf979ce5f5e8c720473006c851df5ba30891c99effd0a`, final SHA-256
`d6095cb8408ddfa85a52223cc6c4c5eb7ae46165cbb2b25fbe438d88c7245148`), but both record
`git_dirty:true` at `68e5d22e8`, before final implementation `4167d2bd4`. Their 703/712 April
result and 32/32 April-anchor count are branch-local history. Each has one critical HVO Central
Bosnia understrength anomaly and two warnings. This does not establish clean-tip attribution,
full-horizon historical safety or current-main acceptance. The nine mismatches below remain
historical debt, with Donji Vakuf/Korenići first to revisit only after combined measurement.

**Fixed next validation, after canon disposition:** use Node 22.23.2, clean committed source,
unchanged scenario/input files, manifest, floors and protected anchors. Run the balanced full
suite once (`npm.cmd run test:vitest:balanced`, child-local Git Bash; estimated 10–20 minutes). Run the
canonical 188-week preflight entrypoint without `--map`, with `AWWV_S6_GRADE_RUN=true` and
explicit ignored output (estimated 5–10 minutes). Check its own exit, engine health, run
consistency, engine-truth seals/console binding, four checkpoints and historical guards. Inspect
all failures, including the retained branch anomaly, before deciding a repeat. Only if the first
run satisfies its hard criteria, obtain the second clean 188-week reproduction and compare all
corresponding nonmetadata deterministic artifacts (14 in the retained branch pair), not just the final save. The required `canon:check`
baseline run may supply that second reproduction if its source/input/runtime contract matches;
preserve existing `_baseline_tmp` evidence first. Expected changed pins remain reported against
the unchanged manifest, never refreshed automatically. The inherited Farz P-A discriminator is
an allowed historical carve-out only when its exact cell/turn/brigade remains identical; other
new failures stop the sequence. Full suite, canon, provenance, anchors and campaign acceptance
are unrun/unmet at this checkpoint. No package or wider campaign is authorized by this record.

**Workspace preservation:** all 18 registered trees were inventoried. The timeline viewer and
other completed product branches are ancestral to main. The three agent-modernization commits
are reissued/squashed history whose final tree matches the activated packet. R8's seven dirty
docs are an old synchronization draft; R9's 20 paths are retained install-proof work whose
implementation substantially landed in `38066eec2`. They are preserved, not blindly reapplied.
The only dirty calibration path is generated `data/derived/latest_run_final_save.json`; it is
not a production input to merge. All 28 dirty paths were backed up with binary patches, bytes
and a SHA-256 manifest at `F:/AWWV-worktrees/_preserved/roadmap-integration-20260912/`;
original trees and all 22 stashes remain intact. No tree, branch, run evidence or draft was
pruned or restored. These retained dirty historical trees do not imply a dirty candidate.

**Roadmap reconciliation:** WR01 is closed by #517's accepted six-capture exception; #518
closed the inherited stale-pin defect on its measured main source. R7 audio/offline/cue
acceptance, R8 readability/runtime/Save-load/package issues, BC10, final behavior/calibration
settlement, packaged three-faction campaigns/diaries and R9 readiness remain open. Earlier
R1–R5/RC/RE and BC01/02/03/08 closures and BC07 retention remain intact. The roadmap,
board, calibration authority and open-gate register now distinguish these from integration.

**Final documentation/preservation checks:** 32/32 tests across desktop-document truth, open
register and derived plan index pass, exit 0; 26 added links/anchors resolve. The register is
valid (16 total gates, 10 open); derived open lanes are exactly R6/R7/R8/R9. All 28 backed-up
paths and 22 ordered stash object IDs match; protected invariant/FORAWWV/manifest/health-floor/
latest-save bytes remain unchanged. Initial stash-subject comparison differed through text
encoding only; object-ID comparison verifies preservation. Receipts are retained alongside the
review; these checks do not clear the two canon decisions or the unrun campaign/full-suite gates.

## Summary

The April 1994 calibration was rebuilt around operations, force allocation, and defensive
assignment rather than scripted ownership. The three principal lanes were the Srebrenica
contraction, the Trnovo/Goražde cutoff, and the RBiH-HRHB war. Subsequent investigation also
closed ahistorical emergent targeting at Lopare Selo, removed the passive mechanism that awarded
Brčko, recovered legitimate isolated-position reductions through combat, and corrected Živinice,
Liše, Lug, and Paros.

The accepted week-104 state matches 703 of 712 painted OSIDs. Krajina, Posavina, Drina, and
Sarajevo are exact. No painted-HRHB OSID is held by RBiH. Brčko and Lopare Selo remain RS;
Goražde town remains RBiH. All post-week-20 calibrated transfers in this lane are operation- or
combat-owned: the accepted run records zero `consolidation` and zero `abandoned` transfers.

This report consolidates the implementation and evidence. `CALIBRATION_MASTER.md` remains the
living calibration authority; `PROJECT_LEDGER.md` remains the append-only chronological record.

## Design Boundary

The work followed four constraints throughout:

- Painted control is a comparator, not a runtime input to combat or target selection.
- Historical territorial change is produced through authored or state-justified operations and
  normal attack resolution; there are no target locks or calibration-only control events.
- Probes remain legal reconnaissance but cannot occupy ground.
- Historical operation names belong to their authored catalog entries and cannot be borrowed by
  emergent operations.

## Changes Made

### RBiH-HRHB doctrine and operations

During the open bilateral war, ARBiH receives the offensive theatre assignment and HVO receives a
defensive assignment. ARBiH targets must be held by the actual bilateral opponent, and the
Washington/ceasefire state removes the designation. The bilateral path can assemble a bounded
two-brigade continuous-front group without inheriting generic heavy-equipment or low-intelligence
probe rejection intended for ordinary opportunities.

Named operations account for the major RBiH gains: the Central Bosnia Counteroffensive, Battle of
Bugojno, Operation Neretva '93, Operacija Naprijed, and Operacija Rijeka. Passive RBiH-HRHB
`consolidation` and `abandoned` transfers were rejected and removed from the accepted result.

HVO does not receive a general offensive doctrine. Two specific painted changes near Prozor are
owned by the bounded `Prozor–Rama Line Counterattack`: the Rama Brigade captures Lug and Paros in
two logged battles. Threatened HVO brigades tagged `placement:fixed_home_osid` receive first
subsegment assignment to their friendly contacted home only while an active opposing operation
names that OSID. This preserves Liše as a local defensive outcome without a combat bonus,
movement lock, controller lock, or change to operation eligibility.

### Srebrenica contraction

The January ARBiH Srebrenica–Cerska Link-Up creates the temporary connection. Operation
Cerska-Kamenica then follows graph-valid axes through Cerska, Pobuđe, Ježeštica and through Pomol,
Luka, and Ljeskovik, while completing the Kamenica-side objectives. The VRS 1st Guards Motorized
Brigade and 65th Protection Motorized Regiment are explicitly rostered through the Army-HQ elite
loan lifecycle. The final run records ten captured objectives in twelve attacks and leaves the
painted Srebrenica lane exact.

### Trnovo and Goražde

Operation Lukavac 93 severs the Trnovo corridor using the Sarajevo-Romanija local group and both
Army-HQ elites. Operation Pracha River and Operation Zvezda 94 close the surviving approaches and
contract the Goražde perimeter. Goražde town is deliberately excluded from VRS objectives and
remains RBiH. The final run's Zvezda AAR records both elites, two attacks, and logged captures of
Slatina and Ustiprača; Sopotnica and the Višegrad bridgehead are owned by the preceding Pracha
River operation in this deterministic trajectory. The entire Drina comparison is 112/112.

### Emergent-operation intent and historical-name ownership

Lopare Selo exposed two engine-level problems: local exposure alone could become strategic intent,
and the generic name pool could issue the catalog-owned name `Farz`. Ordinary commander-created
opportunities now require one of four live-state purposes: campaign objective, recent recapture,
enemy-salient cut, or direct must-hold relief. The first tactically ranked proposal is assessed; an
unpurposed proposal ends that planning cycle rather than prompting a search for a convenient
fallback. Ordinary opportunities are capped at six planned and emitted participants.

`historical_operation_names.ts` builds the reservation set across authored catalogs. Name
normalization deliberately collapses accents, punctuation, year suffixes, and `Operation` /
`Operacija` prefixes. Fictional replacements preserve the prior per-faction pool cardinalities so
the deterministic modulo picker does not globally reseed operation names.

### Brčko and passive-control removal

The apparent RBiH capture of Brčko was traced to the post-fade rear-pocket phase, not a battle.
That phase is no longer part of the production war pipeline. `Tuzla Expansion` is bounded to the
southern Brka approach instead of expanding the whole municipality into campaign objectives.
Brčko is not hard-locked: a valid authored or Army-HQ operation may still attack it. In the
accepted historical trajectory, Brčko city, Donji Rahić, and Potočari remain RS while Brka is
RBiH.

### Isolated positions and authored movement ownership

Removing passive control exposed positions in Krajina, Vareš, Zavidovići, and Foča that had matched
for the wrong reason. A commander may now classify a connected hostile position of at most six
OSIDs as a reduction objective only when its complete external shared-boundary ring belongs to the
commander's faction. The purpose still requires intelligence, a reachable combat-ready two-brigade
same-corps group, attacks, and occupation through normal combat.

Queued authored operations own their staging marches through the `authored_preplanned` movement
reason so routine march correction cannot cancel a dated concentration. This restores the Foča
southern axis, the Višegrad bridgehead, the Vareš/Čardak approach, and other positions that had
previously depended on topology. Lopare Selo and Brčko do not satisfy these operational-purpose
conditions.

### Derventa correction

Operation Corridor retains the 1st Prnjavor Light Infantry Brigade on its main east axis. The 27th
Derventa Motorized Brigade receives a parallel one-objective pocket axis from Cerani against
`op:derventa:zivinice`. The accepted AAR records Živinice as one of ten logged Operation Corridor
captures; it finishes RS.

### Visualization

`tools/generate_apr1994_hover_map.cjs` produces a self-contained SVG/HTML comparator whose OSIDs
retain hover names and controller details. A regression test pins initialization before the
controller-color overlay; the earlier reversed ordering displayed stale background colors even
when the embedded controller data was correct.

The current authenticated remote publication is:

<https://april-1994-calibration-corrected.horkesh.chatgpt.site>

## Calibration Progression

| Candidate | Match | Hash | What it established |
|---|---:|---|---|
| Clean pre-April baseline | 677/712 | `a29714d7dabc2d9f` (188w baseline final) | Starting April checkpoint before this lane |
| Operations-only bilateral correction | 669/712 | `601b642d55a43fcd` | Honest ARBiH initiative; passive bilateral gains rejected |
| Integrated three-lane v21 | 688/712 | `5a04c481b3e4c74c` | Named operations in all three requested lanes |
| Goražde-Trnovo v44 | 699/712 | `d5aac65186ad550f` | Eastern cutoff and contraction completed |
| Srebrenica v45 | 701/712 | `29338a032c484801` | Cerska-Pobuđe-Ježeštica chain completed |
| Srebrenica v46 | 702/712 | `1f6674ac395a1616` | Pomol added to the elite Skelani axis |
| Purpose/name guard v52 | 696/712 | `27f3e651cf7a29ee` | Lopare preserved; generic `Farz` removed; regressions exposed |
| Brčko/Zvezda v56 | 684/712 | `8b7f2246c7c2d27b` | Passive post-fade control removed; Main Staff group retained |
| Isolated-position v63/v64 | 701/712 | `270709e4d303deed` | Legitimate pocket reductions recovered through combat |
| Three-fix v72/v73 | **703/712** | **`d6095cb8408ddfa8`** | Živinice, Liše, Lug, and Paros corrected |

Scores are not monotonic because mechanically invalid gains were removed before their historical
replacement was built. Lower intermediate scores are retained as evidence of that correction, not
discarded as failed calibration noise.

## Accepted Scenario Results

### OSID match rate

| Region | Match | Area-weighted |
|---|---:|---:|
| Krajina | 127/127 | 100.0% |
| Posavina NE | 104/104 | 100.0% |
| Drina | 112/112 | 100.0% |
| Central Corridor | 90/92 | 99.1% |
| Central Bosnia | 150/155 | 96.0% |
| Sarajevo | 30/30 | 100.0% |
| Herzegovina | 90/92 | 98.4% |
| **National** | **703/712 (98.74%)** | **98.9%** |

Painted totals are RS 398, RBiH 243, HRHB 71. The accepted simulation totals are RS 395, RBiH
247, HRHB 70.

### Remaining nine mismatches

| OSID | Painted | Simulated |
|---|---|---|
| `op:ilijas:krivajevici` | RS | RBiH |
| `op:maglaj:jablanica` | RBiH | RS |
| `op:donji_vakuf:donji_vakuf_2` | RS | RBiH |
| `op:donji_vakuf:korenici` | RS | RBiH |
| `op:kalesija:seher_2` | RS | RBiH |
| `op:konjic:glavaticevo_2` | RS | RBiH |
| `op:konjic:ljuta` | RS | RBiH |
| `op:mostar:vranjevici_2` | RBiH | RS |
| `op:stolac:pjesivac_kula_2` | HRHB | RS |

Donji Vakuf and Korenići are the two regressions relative to v63/v64. They remain explicit debt;
no passive or direct-control correction has been added.

### Combat and control attribution

The final run processes 479 attack orders and 328 battles. Combat causality reports zero invalid
operations, zero zero-eligible-attacker operations, zero movement-only execution turns, and zero
recovery-without-attempt rows. Control changes are attributed as 124 combat, 33 paramilitary, 23
initial overrides, one other, zero consolidation, and zero abandoned.

The run-summary injection validator retains one resolved diagnostic caveat: the Prozor-Rama
operation's first turn-41 injection attempt finds both objectives already HRHB and reports an empty
operation. It later starts at turn 52 after those cells change hands, captures Lug and Paros at
turns 54 and 55, and completes successfully at turn 56. The final AAR and control receipts, not the
early skipped attempt, own the accepted result.

## Determinism and Verification

Independent v72 and v73 runs use byte-identical initial saves and produce byte-identical final
saves. Their final-save SHA-256 is
`d6095cb8408ddfa85a52223cc6c4c5eb7ae46165cbb2b25fbe438d88c7245148`; both run summaries report
final-state hash `d6095cb8408ddfa8`.

The release surface at implementation close passed:

- 98/98 focused operation, assignment, and hover-map tests;
- TypeScript typecheck;
- `tools/validate_run_consistency.cjs` against the v73 artifact;
- `git diff --check`;
- final hover-map generation with 744 hover regions over the 712 scored OSIDs.

The apparent v68/v71 nondeterminism was an experimental source-state difference: the bad source
state omitted 1st Prnjavor from Operation Corridor. Exact initial-save comparison and turn-by-turn
comparison localized the first divergence to the operation roster. The accepted roster is now a
direct test assertion.

## Files and Owners

The April calibration sequence spans 19 commits and 62 repository files (4,391 insertions, 238
deletions) from `09273025a` through `4167d2bd4`. Primary runtime owners are:

| Responsibility | Owner files |
|---|---|
| Authored operations and objectives | `src/sim/combat/pre_planned_operations.ts`, `src/sim/combat/triggered_operations.ts` |
| Army-HQ elite reservation and loans | `src/sim/combat/historical_elite_reservations.ts`, `src/sim/combat/army_reserve_system.ts` |
| Emergent purpose and bounded emission | `src/sim/combat/commander/plan.ts`, `src/sim/combat/commander/emit.ts` |
| Historical-name reservation | `src/sim/combat/historical_operation_names.ts`, `src/sim/combat/operation_names.ts` |
| Bilateral posture and target scope | `src/sim/combat/bot_corps_ai.ts`, `src/sim/combat/bot_corps_stance.ts`, commander briefing/plan/emit |
| Authored staging ownership | `src/sim/combat/commander_march_correction.ts`, pre-planned operation lifecycle |
| HVO local defensive assignment | `src/sim/combat/subsegment_assignment.ts` |
| Passive phase removal | `src/sim/turn_phases/war_phases.ts` |
| AAR capture truth | `src/sim/combat/operation_aar.ts` |
| Interactive comparator | `tools/generate_apr1994_hover_map.cjs` |

## Lessons Learned

- A higher match score can conceal a wrong mechanism; causality must be reviewed before accepting
  the number.
- Topology is strategic information, not political-control authority. A pocket must still be
  reduced by forces capable of attacking it.
- Operational intent and tactical feasibility are separate. Exposure may rank a feasible target,
  but it cannot supply strategic purpose.
- Historical-name identity is simulation data because AARs, logs, and debugging reconstruct
  operation identity from names.
- Historical operations need ownership of their preparation movement and elite commitments across
  the full queue/planning/execution/recovery window.
- Determinism comparisons require identical source state as well as identical serialized initial
  state; catalog rosters should be asserted directly when they affect later allocation order.

## Next Steps

1. Treat the nine listed mismatches as the complete current April territorial debt.
2. Investigate Donji Vakuf/Korenići first because they are the only regressions from the preceding
   accepted v63/v64 state.
3. Preserve the no-passive-control, purposeful-targeting, and historical-name-ownership contracts
   while addressing later residuals.
4. Re-run the week-104 scenario twice after any behavioral change and regenerate the interactive
   comparator from the accepted artifact.

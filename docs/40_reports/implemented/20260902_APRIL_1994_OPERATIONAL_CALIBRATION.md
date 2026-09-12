# April 1994 Operational Calibration

**Date:** 2026-09-02

**Scope:** April 1994 checkpoint at week 104 of the sole scoring scenario

**Scenario:** `data/scenarios/apr1992_definitive_188w.json`

**Baseline:** clean Node 22 measurement, 677/712 at April 1994

**Accepted result:** `runs/apr1994_three_fixes_v73/apr1992_definitive_188w__1db784e85c2e6de0__w104`

**Result:** 703/712 OSIDs (98.74%); area-weighted 98.9%

**Implementation commit:** `4167d2bd4` and its April-calibration ancestors beginning at `09273025a`

## Integration audit — 2026-09-12

**Current verdict: candidate committed; promotion to main and calibration acceptance held.**
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

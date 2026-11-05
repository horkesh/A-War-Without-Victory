# Korenici retained-provenance finding

Scope was read-only retained evidence. No engine/API import, turn advance, query, stage, state mutation, source/test edit, campaign, or retry occurred.

## Planner-preparation provenance

The superseded pre-Node-pin preparation was **not** retained byte-for-byte as a separate set. A recursive SHA-256 scan found only the unchanged `STOPPING_CRITERIA.md` (`2a24ea86…`) among the five original hashes. Review 001 (`65ae0836…`) preserves the other original names, sizes, and hashes and records that `attempt-001` was absent; review 002 (`eb306d1b…`) records the corrected runtime binding and GO. This is therefore an honest prelaunch configuration revision before any planner/API call, not a reconstructed preparation.

## Exact capture provenance

Korenici begins RBiH in every compared cohort. Both formerly-correct references record combat capture by **RS 16th Krajina Motorized**:

- n101 (`git a3063366…`): turn 34 / 1992-10-30, decisive victory over primary defender ARBiH 707th, immediate flip to RS.
- n102 (`git b30597f4…`): turns 35-36 stalemates, then turn 37 / 1992-11-20 decisive victory over primary defender ARBiH 708th and flip to RS.

The rejected older 705 native cohort (`git 77a2cc8e…`) is comparison-only: RS 16th attacks ARBiH 330th on turns 34-37 and flips Korenici on turn 37. Current P03 (`git a3063366…`) has the same named attacker and primary defender over turns 34-37, but outcomes are costly victory, repulsed, stalemate, repulsed; no flip occurs.

## Admission, movement, and helper hypothesis

Current P03 contains a normal chain, not a missing command path. RS 16th is in VRS 1st Krajina Corps, assigned as support on the Donji Vakuf Sweep axis of active **Operation Donji Vakuf**. It moves Celinac→Teslić (T19), Torlakovac (T29), Oborci (T32), Donji Vakuf (T33), then attacks Korenici on T34-T37. Its readiness declines from active to overextended/degraded after combat. At T39 it remains at Donji Vakuf with a bot-discretionary column order; the operation has ended.

The RS 22nd helper hypothesis is unsupported by retained battle provenance. It is the axis main brigade, but every Korenici battle and capture event in all four cohorts names only RS 16th in `all_attacker_ids`. The separate boundary diagnostic proves an artificial reconciliation moved RS 22nd Varosluk→Komar, but does not connect that move to any Korenici battle. Current native history instead records RS 22nd moving naturally through Javorani, Pribeljci, Babin Potok, and Donji Vakuf.

The supported classification is combat/model-cohort divergence after valid admission and movement. Source history shows 77a2→a306 changed save handling to preserve fractional operational fatigue, which can alter subsequent state evolution; n101 also shows that player/AI force disposition changes the defender set. Retained saves do not isolate the lower-level combat term that changed the T34 outcome.

Smallest next question: compare already-recorded T34 combat inputs and resolved combat trace for RS 16th versus defenders across current P03 and the older-705/current-source cohorts, without changing orders or state.

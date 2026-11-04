# Sector Expert verdict: W3 (054da07e7)

**Vote: 1 (KEEP). Confidence: medium.**

**The reason the vote rests on:** the Ozren loss in run C does not come from unstaffed sectors. It comes from Operation Farz 95 never being injected. That is an operations-scheduling fragility that W3 exposed but did not cause. W3 itself is a correct, narrow implementation of §14.9. The 4/4 in run B depended on the turn on which a probe happened to finish, not on a sound mechanic.

## Findings

**1. The 2nd and 3rd Corps sectors stay staffed in both runs (measured).**
- In `brigade_temporal_log.jsonl`, weeks 100–188, every active 2nd and 3rd Corps brigade has a sector in both runs. The only exceptions are single weeks with one brigade missing a sector, and those are all in B.
- The number of distinct staffed sectors per corps is about the same in both runs (2nd: 7–9, 3rd: 5–9).
- At w188 in C (`final_save.json`), every `arbih_2nd_corps:*` and `arbih_3rd_corps:*` sector has at least one assigned brigade (A≥1). C's zero-assigned sectors are elsewhere: 1st Corps Čajniče ×2, 5th Corps Bihać, VRS 2nd Krajina, VRS Herzegovina. All except VRS Herzegovina carry `unstaffed_front`.
- 3rd Corps brigades in the Ozren municipalities: 10 in C against 11–12 in B.

**2. The real cause is that Farz 95 was never injected (measured, with one inferred step).**
- `operation_aars.json`: B has `arbih_3rd_corps:Operation Farz 95:t178`, which took all 4 cells. C has no Farz AAR. `army_hq_operations` and `army_hq_last_op_turn` in C are both `{}`.
- Farz can first fire at `turn >= 178` (`triggered_operations.ts`, around line 607). The injector skips it while the anchor corps has any operation running at all: `hasActiveOperation(primaryCmd)` (`triggered_operations.ts:1514`, which is `active_operations.length > 0` in `corps_operation_helpers.ts:261`).
- In C at week 178, `probe_arbih_3rd_corps_t177` was still in recovery. In B, the t176 probe had already finished.
- In that same week, Donji Vakuf 95 and Jajce Recovery joined the 3rd Corps. After them came Operacija Rijeka (182–186) and Donji Vakuf in execution until 188. So the 3rd Corps was never free again, and the one-shot op never fired.
- Inferred: W3 shifted the probe cadence by one turn. Queued pre-planned ops deliberately ignore probes (`isSlot0AvailableForQueue`, line 270). The Army HQ gate does not.
- This fix belongs to the operations lane and is compatible with W3. It is one calibration change and would need its own measured run.

**3. W3 is a correct implementation of §14.9, with leftovers outside its scope (code read).**
- **What it removes:** all instant moves of another sector's brigades into a zero-assigned sector (steps 1c, 1d, 2). It keeps own-sector reserve and rear promotion (`brigade_assignment.ts:1901–1951`). Nothing §14.9 relies on is removed: empty sectors go through T1 (`commander/decide.ts`, `computeEmptySectorReliefReassignments`, with operation, dig-in, loan and transit exclusions and the minimum line staffing). `annotateUnstaffedFrontSectors` (`corps_front_sectors.ts:1391`) sets `unstaffed_front`.
- **Instant relocations that still exist:**
  - (a) Own-sector promotion is still an instant `moveBrigadeToFrontTarget` of up to `LOCAL_FRONT_RELIEF_MAX_HOPS = 3`. Canon does not explicitly permit it; the packet's claim that it does is an interpretation.
  - (b) `severe-rescue:floor-completion` (line 2352) and `severe-relief` (line 2491) still instantly move brigades from other sectors into sectors that are thin but staffed. §14.9's wording is about *empty* sectors, so these are outside W3's scope. It is the same mechanism, though, and should be logged as follow-up.
- **Gap on the sector side (inferred, not seen in the 2nd/3rd Corps):** T1 considers a sector only if it has zero reserve and zero rear brigades (`decide.ts`, around lines 270–273). If a sector's own reserve fails promotion for a reason that is not illegality (no free front cell within 3 hops, or the home-distance limit), the sector is neither flagged unstaffed nor picked up by T1, and stays empty. This could be fixed while keeping W3. At w188 no 2nd/3rd Corps sector is in this state. The 5th Corps Bihać sector has reserve and rear brigades but is flagged `unstaffed_front`, probably because of the enclave restriction (not verified).

## Noted, not resolved
- Total column starts fell from 1175 to 771 and arrivals from 1016 to 659 (`weekly_report.jsonl`). A plausible explanation is that the old teleports used to start return marches. It is not attributed, and the strict health check still shows 0 stranded formations.
- The evidence is one deterministic run per arm. I did not test the Army HQ gate fix.

**Recommendation:** keep W3 with the regenerated startup save. As the next single measured change, have the Army HQ injection gate ignore probes the way `isSlot0AvailableForQueue` does, then re-score Ozren. Do not restore the teleport to buy the 4/4.

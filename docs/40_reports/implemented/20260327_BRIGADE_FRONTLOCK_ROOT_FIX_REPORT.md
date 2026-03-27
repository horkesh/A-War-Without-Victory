# 2026-03-27 Brigade Front-Lock Root Fix Report

## Scope
- Resolve root causes behind:
  - line brigades stuck deep rear instead of sitting on sector front OSIDs,
  - brigade history entries showing implausible deep-rear friction engagements,
  - defender history attribution collapsing to a single primary defender.

## Implemented Root Fixes

### 1) Frontline-only friction attribution
- File: `src/sim/combat/frontline_attrition.ts`
- Change:
  - Attrition/friction eligibility now requires brigade location to be on the sector frontline (`sub_segments[].friendly_osids`), not merely in assigned line roster.
  - Friction engagement OSID selection now explicitly prefers a frontline OSID context.
- Effect:
  - Eliminates deep-rear friction history entries for line brigades parked away from the front.

### 2) Physical attacker participation validation
- File: `src/sim/combat/attack_resolution_osid.ts`
- Change:
  - Attack groups are filtered so only brigades adjacent to the target OSID participate in resolution and history recording.
- Effect:
  - Prevents non-adjacent brigades from receiving battle participation/casualty history for attacks they could not physically execute.

### 3) Defender engagement attribution by contributors
- File: `src/sim/combat/attack_resolution_osid.ts`
- Change:
  - Added weighted deterministic integer allocator (`allocateIntegerByWeights`) and used it to distribute defender-side recorded casualties/inflicted values across contributing defenders.
  - Multi-defender history no longer credits only the single primary defender.
- Effect:
  - Removes contradictory history narratives and aligns logs with weighted sector-defense participation.

### 4) Assignment and movement anti-lock-in hardening
- Files:
  - `src/sim/combat/bot_brigade_eval_front.ts`
  - `src/sim/combat/brigade_home_return.ts`
  - `src/sim/combat/sector_offensive.ts`
  - `src/sim/combat/brigade_assignment.ts`
- Changes:
  - Off-front line brigades can bypass operation-gating suppression to force sector-front marching.
  - Pending home-return orders no longer block off-front sector-front correction.
  - Home-return helper ignores line-assigned brigades and brigades that can reach corps front targets.
  - Post-op home-return issuance is skipped when own corps has active front sectors.
  - Minimum-coverage/equalization transfer passes now guard assignments with recipient front reachability.
- Effect:
  - Prevents line-assignment to effectively unreachable front slots and reduces rear lock-in persistence.

## Verification Evidence

## Static checks
- `npx tsc --noEmit` -> pass

## Targeted tests
- `npx vitest run tests/brigade_aor_subsegment.test.ts tests/graz_faction_block.test.ts` -> pass

## Fresh 40w runs
- `runs/apr1992_definitive_40w__77cac5e01d3c929e__w40_n1129`
- `runs/apr1992_definitive_40w__77cac5e01d3c929e__w40_n1130`
- Final hash: `156f04d8a9327f74`

## Target brigade checks (`rs_2nd_banja_luka_light_infantry`)
- Final location: `op:doboj:boljanic_2`
- Assigned sector: `sector:vrs_1st_krajina:4`
- On assigned sector front: yes
- History:
  - No deep-rear Ljubija friction entries in final state.
  - `first_battle_turn = 19`
  - Engagement OSIDs in final tail are frontline-context Doboj positions.

## Remaining Watch Item
- A stale home-return movement order can still be present concurrently with frontline assignment in final snapshots (`destination_sids: [home_osid]`).
- It no longer hard-locks the brigade in rear in the validated run, but should be tracked in subsequent cleanup to fully remove conflicting order semantics.


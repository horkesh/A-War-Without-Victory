## 2026-11-16 — `threat_ratio` is named for what it is: a sector pressure index, not a force ratio (description only)

Orchestrator ruling (package "1994-95 attack and defence", step 2b premise check).

**What it is.** `CorpsFrontSector.threat_ratio` is the enemy personnel facing the whole sector, divided by `defensive_power`. `defensive_power` is own weighted personnel *per front edge*. So the value grows with sector length and falls as own cohesion falls. It is 9999 when enemies face a sector that has no defensive power.

Measured on a P2 step-2 run, t99-178:
- RS staffed sectors: median 48, max 5,346.
- 87% of RS sector-turns are above 2.0.

**Disposition: accepted as final, scale unchanged.**
- About 20 readers have thresholds tuned to this scale. Examples: 250 in `decide.ts` and `corps_front_sectors.ts`, `DEFENSIVE_CRITICAL_THREAT`, and the `brigade_assignment` passes.
- Rescaling would be a calibration-sized change.
- Only the descriptions change: the `game_state.ts` field comment, the write site in `brigade_assignment.ts`, and the Systems Manual sector paragraph.
- A system that needs a real force ratio divides enemy personnel by own effective personnel. Package P2 step 2b does this for the army-reserve gap check.
- Registered for the Part 5 sitting via the steward.

No behaviour change: comments and canon text only, so the simulation hash is unchanged.

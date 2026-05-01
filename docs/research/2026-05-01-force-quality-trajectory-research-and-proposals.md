# Force-Quality Trajectory Research and Proposal Notes

**Date:** 2026-05-01
**Status:** Research/proposal artifact for the open force-quality calibration lane.
**Related issue:** `docs/plans/2026-05-01-force-quality-trajectory-calibration-issue.md`
**Scope:** Late-war force-quality trajectory after the Washington Agreement, especially why ARBiH/Federation pressure should become plausible without naked calendar scripting.
**Non-scope:** Implementing tuning, forcing historical territorial outcomes, adding new scripted operations, or changing painted targets.

## Executive Thesis

The desired late-war effect should come from a linked force-quality system, not from putting Operation Sana / Maestral / Krivaja / Stupcanica on rails.

The historical pattern is not "ARBiH gets a tank trickle and the map flips." It is a package:

1. ARBiH gains corps-level organization, officer competence, tactical confidence, and limited heavy support.
2. HVO/HV/Federation cooperation opens staging corridors, artillery support, and synchronized pressure.
3. VRS retains serious local defensive ability and heavy weapons, but loses sustained operational coherence through attrition, political-logistics dysfunction, morale strain, officer loss, and multiple-front pressure.
4. NATO air pressure and diplomatic pressure in late 1995 further weaken VRS strategic options, but should be modeled as context/opportunity pressure, not as an automatic map eraser.
5. Failed offensives remain important proof content: VRS can still hit back locally, and ARBiH/Federation opportunities can fail when corps readiness, logistics, or commander quality are not there.

The highest-value next move is not a global balance multiplier. It is an audit of whether the existing trajectory systems are actually wired into late-war operations.

## Historical Basis

### Early-War Baseline: ARBiH Is Determined But Under-Equipped

The Sarajevo 1992 narrative is the cleanest baseline: BB describes Bosnian defenders as determined infantry without comparable heavy weapons, while the Serb side had far more artillery, tanks, and mortars but insufficient infantry to convert bombardment into surrender or ground seizure. This supports our intended start state: ARBiH can hold and bleed early, but should not act like a polished offensive army in 1992. Citation: BB1 p.190.

### Late-War ARBiH/Federation Pressure Is Operational, Not Magic

BB's September 1995 western Bosnia account describes Maestral/Sana as coordinated pressure, not a single scripted flip. The HV/HVO main effort used elite units and operational grouping; the ARBiH 5th Corps had a defined Sana mission with eight brigades grouped into operational groups, while the 7th Corps and General Staff shifted forces to support the western drive. Citations: BB1 p.417, BB1 p.419.

BB also records that the 5th Corps advance drew strength from recently captured Serb armor/field guns plus HV artillery support, then advanced deeply but not broadly. That distinction is design gold: the late-war Bosnian Army should be able to deliver focused operational pressure when prerequisites align, but it should still be under-equipped and vulnerable to overextension. Citation: BB1 p.419.

### VRS Late-War Decline Is Brittle Coherence, Not Total Incompetence

The VRS late-war story is not "all units become useless." BB records both stubborn defense and serious brittleness:

- In western Bosnia, VRS dispositions left the main HV/HVO axis underweighted while substantial forces faced ARBiH corps; the VRS also struggled with multiple simultaneous threats. Citation: BB1 p.417.
- Around Ozren in September 1995, the line could collapse into gaps, ad hoc vehicle columns, and reluctant soldiers even while officers tried to restore order. Citation: BB1 p.460.
- Milovanovic later blamed premature civilian/municipal evacuation decisions and political dysfunction for undermining will to fight, while also stressing that VRS troops were pushed back by enemy personnel/equipment superiority rather than a formal order to surrender territory. Citation: BB1 p.463.
- BB's 1995 endnotes also point to logistics/political dysfunction: Defense Ministry profiteering, unclear war aims, and neglected defensive preparations. Citation: BB1 p.434.

This suggests the model should preserve local defensive competence and counterattack capacity while degrading sustained operational initiative, reserve response, staging reliability, and wide-front coordination.

### Heavy Equipment Trickle Matters, But As Thresholds

Arms and supplies reached the Bosnian side through contested political channels after the Washington Agreement. The Senate Intelligence Committee report on 1994-1995 arms transfers describes the "no instructions" policy around Croatian transshipment and the concern that Bosnia needed more arms to survive against Serbian attacks. Source: [U.S. Senate Select Committee on Intelligence report](https://irp.fas.org/congress/1996_rpt/bosnia.htm).

For the engine, this argues against "give ARBiH lots of tanks." It argues for limited corps-level thresholds:

- enough artillery/ammunition to support an operation,
- enough captured/smuggled armor to stiffen one or two spearheads,
- enough logistics/staging access to move that support,
- enough officer/command maturity to use it coherently.

### NATO And Safe-Area Context Are Opportunity Pressure

NATO states that Operation Deliberate Force in August-September 1995 helped shift the ground balance and pushed Bosnian Serb leadership toward negotiation. Source: [NATO peace support operations in Bosnia and Herzegovina](https://www.nato.int/en/what-we-do/operations-and-missions/peace-support-operations-in-bosnia-and-herzegovina-1995-2004).

ICTY summaries for Srebrenica/Zepa establish that VRS safe-area operations were deliberate Drina Corps/Main Staff actions, with Directive 7/1 creating intolerable conditions for the enclaves. Source: [ICTY Popovic et al. press summary](https://www.icty.org/en/press/seven-senior-bosnian-serb-officials-convicted-srebrenica-crimes).

Design implication: NATO/safe-area context should modify opportunity windows, political constraints, patron pressure, and consequence systems. It should not become a player-facing "commit atrocity" or "press NATO button" mechanic.

## Current Engine Seams That Already Exist

### Officer Learning May Have A Unit Mismatch

`src/sim/combat/officer_quality_update.ts` defines hardcoded faction learning-rate multipliers:

- RBiH: `1.5`
- RS: `0.7`
- HRHB: `1.0`

The same function then prefers `state.military.war_timeline.officer_config[faction].learning_rate` when present. In `data/scenarios/timelines/apr1992.json`, those values are:

- RS: `0.007`
- RBiH: `0.015`
- HRHB: `0.010`

Because the code treats `learning_rate` as a multiplier over `COMBAT_GROWTH_BASE = 0.01` / `FRONTLINE_GROWTH_BASE = 0.005`, the timeline values appear two orders of magnitude smaller than the fallback multipliers. Example: RBiH combat growth becomes roughly `0.01 * 0.015 = 0.00015` before quality dampening, instead of `0.01 * 1.5 = 0.015`.

This may be intentional if the JSON values are meant as absolute rates but were later consumed as multipliers. It may also be a real one-owner bug. Audit this first before any balance tuning.

### Capability Profiles Exist, But War-Phase Use Looks Thin

`src/state/capability_progression.ts` already encodes exactly the desired faction curves:

- ARBiH equipment/training/organization/doctrine rise from 1992 to 1995.
- VRS equipment operationality, training, organization, and attack doctrine decline.
- HRHB improves after Washington Agreement.

But `getFactionCapabilityModifier(...)` is found in early-war control flipping, while late-war operation generation/combat does not appear to consume capability profiles directly. If true, a major design curve is decorative during the very phase where we need it most.

### Faction Officer Maturity Is Stored But Barely Spent

`src/sim/combat/officer_experience.ts` applies post-operation officer experience and computes `state.military.faction_officer_maturity`. The war pipeline updates that maturity each turn. Search evidence shows few or no war-phase consumers beyond storage/reporting.

That is the right source for corps-level professionalization, but it should affect operational execution properties, not raw universal combat power.

### Equipment Progression Exists, But Concentrates Hardware

`src/sim/combat/faction_progression.ts` already gives ARBiH modest artillery production/smuggling, limited tanks, and HRHB/Croatian pipeline cuts. The current distributor sends each budget to the best-equipped active brigade in the faction.

That prevents runaway per-brigade growth, which is good. But it may also fail to create corps-level support thresholds: one brigade gets a little better while the operation system still does not know "5th Corps has enough artillery/ammunition/support to run Sana-like pressure."

### Army HQ Opportunity Scoring Does Not Obviously Read Maturity

`src/sim/combat/army_hq_gathering.ts` scores corps opportunities from brigade count, strength class, exhaustion, threat, recent territory change, and reinforcement priority. It does not obviously read capability profile, faction officer maturity, corps historical maturity, equipment support thresholds, or VRS command-coherence degradation.

That makes late-war professionalization visible in state but weak in command generation.

## Proposal Lanes

### P0: Audit And Fix Officer Learning Units

Before anything else, verify whether `officer_config.learning_rate` is intended to be:

- a multiplier (`1.5`, `0.7`, `1.0` style), or
- an absolute per-turn growth rate (`0.015`, `0.007` style).

If it is a multiplier, current timeline JSON suppresses officer learning massively. If it is absolute, the code name and formula should be split into `learning_rate_abs` vs `learning_rate_mult` so future tuning is not a trap.

Acceptance evidence:

- A small unit test proving timeline learning values have intended units.
- A metrics report showing ARBiH/RS/HRHB officer-quality distributions at 40w, 104w, 156w, and 183/188w.
- No territorial tuning in the same packet unless this is proven as a single-owner bug.

### P1: Spend Capability Profiles On Operation Readiness

Capability profiles should influence:

- operation acceptance,
- planning duration tolerance,
- max simultaneous axes/participants,
- staging reliability,
- recovery from failed attacks,
- ability to convert local superiority into capture attempts.

They should not become a direct "1995 ARBiH gets +X combat power" button. Professionalization is mostly command, timing, logistics, and execution quality.

Recommended rule shape:

- ARBiH 1992: low offensive coordination, high home-defense willingness.
- ARBiH 1994: localized corps initiatives possible, especially where officers/equipment/logistics are favorable.
- ARBiH 1995: multi-brigade/corps operation delivery is plausible when readiness and opportunity align.
- VRS 1995: attack doctrine and coordination degrade, but static defense and local counterattacks remain dangerous.

### P1: Convert Officer Maturity Into Corps Execution Traits

Named-officer and faction maturity should feed operational traits such as:

- `staging_error_tolerance`,
- `axis_coordination_bonus`,
- `reserve_response_delay`,
- `capture_delivery_confidence`,
- `failure_recovery_rate`,
- `multi_axis_limit`.

This is where "competent leaders" belongs. It should make a Dudakovic/Alagic-style corps better at executing an opportunity, not simply make every ARBiH squad stronger.

### P1/P2: Make Heavy Equipment A Support Threshold

Keep equipment trickles modest. The better model is a corps support threshold:

- artillery/ammunition above threshold unlocks suppression support and reduces failed movement-only operation turns,
- armor above threshold creates one spearhead-capable axis,
- equipment below threshold still helps brigade power but cannot sustain a broad operation,
- captured equipment should matter quickly but imperfectly due to crew/training/maintenance limits.

This matches BB's late-war pattern: captured armor/field guns and HV artillery gave Sana local muscle, but ARBiH was not suddenly a fully mechanized army.

### P1/P2: Model VRS Degradation As Sustained-System Decay

VRS should lose:

- wide-front offensive confidence,
- reserve redeployment quality,
- repair/maintenance output,
- replacement officer competence,
- recovery after consecutive failures,
- command coherence under simultaneous threats,
- morale stability when rear evacuation/displacement starts.

VRS should retain:

- prepared-position defense,
- artillery bite where ammunition and condition remain,
- local counterattack ability with remaining quality formations,
- the possibility of a better-than-history outcome if the player/bot preserves officers, logistics, morale, and reserves.

### P2: Opportunity System As The Test Harness, Not The Substitute

Late-war operations should be exposed as opportunity proposals with prerequisites. The engine should decide whether those opportunities can be executed:

- If ARBiH 5th Corps is mature, supplied, and has support, Sana can happen.
- If VRS still has reserves/coherence, Sana can stall or get counterattacked.
- If HV/HVO cooperation and staging are absent, Maestral-style pressure should be weaker or unavailable.
- If Drina Corps is too degraded or politically constrained, safe-area operations change shape; sensitive-history consequences remain locked and non-optimizable.

## Recommended Audit Metrics

Produce a date-window trajectory report at 40w, 104w, 156w, and 183/188w:

- average/percentile officer quality by faction and corps,
- named-officer competence and `faction_officer_maturity`,
- corps equipment totals and operational/degraded/non-operational ratios,
- artillery/tank support thresholds by corps,
- operation proposals accepted/launched/executed/captured by faction,
- operation movement-only turns and staging failures,
- attack/capture attempts per 20-turn window,
- VRS offensive attempts vs defensive/counterattack success,
- ARBiH corps-level multi-brigade operation size over time,
- command-coherence or opportunity-score components by faction,
- correlation between opportunity-score and actual captures.

## Recommended Packet Order

1. **Force Trajectory Evidence Audit.** No behavior changes except a proven one-owner diagnostic bug. Output: metrics tables, owner map, and a verdict on whether officer learning units are wrong.
2. **Officer Learning Units Fix, if confirmed.** Rename/split timeline semantics and add tests. Rerun date-window metrics.
3. **Capability Profile War-Phase Consumer Design.** Wire profiles into operation readiness/coordination rather than raw combat.
4. **Officer Maturity To Corps Execution.** Spend named-officer/faction maturity on staging, axes, failure recovery, and capture delivery.
5. **Equipment Support Thresholds.** Turn equipment trickle/capture into corps-level artillery/armor support readiness.
6. **VRS Sustained-System Degradation.** Degrade broad offensive and reserve response while preserving local defense.
7. **Opportunity-System Integration.** Let historical late-war ops surface as conditional proposals, with failed ops as valid outcomes.

## Immediate Claude Prompt Candidate

```
You are working in F:\A-War-Without-Victory. Do a Force Quality Trajectory Evidence Audit only.

Goal: prove where the engine currently fails or succeeds at the stated full-war arc:
- VRS: professional/JNA-inheriting in 1992 -> degraded but locally dangerous by 1995.
- ARBiH: under-equipped militia/TO fragments in 1992 -> competent corps-level army by 1995.

Read first:
- docs/plans/2026-05-01-force-quality-trajectory-calibration-issue.md
- docs/research/2026-05-01-force-quality-trajectory-research-and-proposals.md
- docs/40_reports/CALIBRATION_MASTER.md section "Faction Doctrinal Arcs"
- src/sim/combat/officer_quality_update.ts
- src/state/capability_progression.ts
- src/sim/combat/officer_experience.ts
- src/sim/combat/faction_progression.ts
- src/sim/combat/army_hq_gathering.ts
- data/scenarios/timelines/apr1992.json

Scope fence:
- Do NOT tune combat.
- Do NOT add scripted operations.
- Do NOT change OOB, painted targets, scenario data, or operation definitions.
- You may write diagnostic scripts/reports/tests if needed.
- If you prove a single-owner bug in officer learning-rate units, stop and present the minimal fix plan; do not fix it in the same packet unless explicitly authorized.

Tasks:
1. Trace every live consumer of officer_quality, named-officer competence, faction_officer_maturity, capability_profile, equipment_decay, maintenance_decay, cohesion floor/ceiling, morale drift, war exhaustion, and operation readiness.
2. Specifically answer whether apr1992.json officer_config.learning_rate values are treated as multipliers or absolute rates, and quantify the effect on RBiH/RS/HRHB officer-quality growth.
3. Produce metrics from existing or fresh 40w, 104w, 156w, and 183/188w runs:
   - officer quality distributions by faction/corps,
   - named-officer maturity by faction,
   - equipment totals/condition by faction/corps,
   - operation proposals/launched/attacks/captures by faction and date window,
   - movement-only/staging-failure counts,
   - VRS offensive vs defensive/counterattack evidence,
   - ARBiH multi-brigade/corps-level operation evidence.
4. Classify the owner of the gap: formula-unit bug, decorative profile, commander doctrine, operation readiness, combat math, equipment support, morale/cohesion, or reporting.
5. Write a report in docs/40_reports/implemented/ with a recommended packet order.
6. Update docs/PROJECT_LEDGER.md and docs/PROJECT_LEDGER_KNOWLEDGE.md only if you add durable findings.

Validation:
- npx tsc --noEmit if any TypeScript script/code changes.
- For docs-only/script-only work, run git diff --check and any script smoke tests.
- Do not commit until Codex reviews.
```

## TL;DR

Model late-war improvement as **coordination and capture delivery**, not as magic heavy-equipment inflation. First audit the suspicious officer-learning unit mismatch and the apparently decorative capability-profile/maturity curves. Then wire professionalization into operation readiness, staging, multi-axis coordination, and failure recovery; wire VRS decline into sustained-system decay while preserving local defense/counterattacks.

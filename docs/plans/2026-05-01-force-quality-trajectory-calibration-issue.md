# Force Quality Trajectory Calibration Issue

**Date opened:** 2026-05-01
**Status:** Open P1 calibration/design issue
**Scope:** Full-war force-quality trajectory, especially 1994-1995 behavior after the Washington Agreement.
**Not scope:** Adding more scripted operations, changing painted targets, one-off territorial patches, or forcing historical outcomes.

## Problem Statement

The game currently fails an obvious full-war premise:

- **VRS should deteriorate** from a professional, JNA-inheriting army into a degraded, brittle, increasingly exhausted force that is still locally dangerous.
- **ARBiH should improve** from under-equipped 1992 militia / Territorial Defense fragments into a more competent, coordinated, corps-level army by 1995.

Recent late-war evidence exposed the gap. Date-specific painted targets and late-war operations helped us evaluate the issue, but the lack of organic territorial movement without scripted intervention shows that the engine is not yet making the force-quality arcs decisive enough. If historical 1994-1995 operations need to be forced on a calendar to create any meaningful late-war movement, the deeper calibration issue is not the operation list; it is the force-quality trajectory model.

## Existing Canon / Calibration Basis

`docs/40_reports/CALIBRATION_MASTER.md` already states the intended full-war doctrinal arcs:

- VRS: **Professional -> Degraded**
- ARBiH: **Rabble -> Professional**
- HVO/HRHB: **Capable Militia -> Overstretched**

This issue does not change that design principle. It records that the current engine evidence suggests the principle is under-realized in long-run behavior.

## Distinction From Adjacent Work

| Adjacent lane | Relationship | Why this is separate |
|---|---|---|
| Late-war operation opportunity system | Provides historical windows and proposals. | Opportunities should expose capability; they should not manufacture it from nothing. |
| Scripted late-1995 ops packet | Useful diagnostic evidence. | Calendar-gated ops are not the desired product model and did not produce captures anyway. |
| DRINA / HERZEGOVINA territorial calibration | Regional mismatch / Goražde residual. | This issue is cross-faction and full-war, not one theater. |
| HRHB/HVO offensive emergence | Separate faction-specific command/stance problem. | HRHB trajectory matters, but the obvious failure named here is VRS decline vs ARBiH professionalization. |
| Painted target tooling | Evaluation substrate. | Paints tell us the miss; they do not prescribe the mechanism. |

## Working Hypotheses

These are investigation prompts, not approved fixes:

1. **Officer-quality curves may be too weak or not coupled strongly enough to operation execution.** ARBiH learning and VRS brain drain exist, but late-war initiative does not appear to emerge reliably from them.
2. **War exhaustion may suppress tempo without creating asymmetric late-war capability.** If exhaustion mostly lowers all factions' willingness to act, it can freeze the map instead of producing ARBiH late-war advantage and VRS brittle defense.
3. **Cohesion/morale decay may not distinguish professional degradation from temporary combat fatigue.** VRS should remain locally capable but lose sustained operational coordination; ARBiH should gain coordination without becoming magically well-equipped.
4. **Operation readiness gates may be static.** The engine may still judge 1995 ARBiH corps by thresholds calibrated for 1992 conditions, preventing professionalized late-war behavior.
5. **Equipment advantage may dominate too long.** VRS heavy weapons should remain important, but crew quality, maintenance, officer loss, fuel, sanctions, and morale should erode the ability to exploit them.
6. **ARBiH experience may be too local.** Combat learning might improve individual brigades without becoming corps-level planning, staging, and multi-axis execution maturity.
7. **Defensive competence and offensive competence may be conflated.** ARBiH's early willingness to hold ground should not imply early offensive competence; VRS late degradation should not imply total inability to defend.

## Required Evidence Before Any Fix

Build a force-trajectory audit across at least these dates:

| Checkpoint | Purpose |
|---|---|
| 40w / Jan 1993 | VRS should still be superior and ARBiH mostly defensive. |
| 104w / Apr 1994 | ARBiH should show localized competence and better corps organization, but not yet broad superiority. |
| 156w / Apr 1995 | ARBiH should be capable of meaningful planned offensives where geography/logistics permit; VRS should show degradation but still defend. |
| 183-188w / Oct-Nov 1995 | ARBiH/Federation pressure should be plausible without naked calendar forcing; VRS should be brittle, exhausted, and still locally dangerous. |

Minimum metrics:

- faction offensive attempts by date window
- faction operation acceptance / launch / attack / capture rates
- corps-level operation size and staging success
- brigade morale, cohesion, officer quality, equipment state, and combat history distributions
- VRS local defensive success vs sustained offensive ability
- ARBiH corps-level coordination, not just raw brigade combat
- war exhaustion by faction and its effect on stance/operation decisions
- deltas with and without opportunity proposals

## Acceptance Shape

A successful future calibration packet should make these statements true in evidence, not just prose:

- **1992:** VRS generally acts like the most professional force; ARBiH mostly survives, holds, and bleeds rather than conducts polished offensives.
- **1994:** ARBiH has learned enough for localized corps-level initiatives, while VRS still has serious combat power but less clean operational dominance.
- **1995:** ARBiH can generate credible multi-brigade / corps-level offensive pressure when given plausible opportunities; VRS can still win local fights but struggles to sustain broad operational initiative.
- **Counterfactual safety:** If ARBiH is starved, fragmented, or badly led in a run, it should not automatically professionalize into a 1995 juggernaut. If VRS preserves officers, logistics, and morale better than history, it should not be forced into collapse by date alone.

## Recommended Next Packet

Create a **Force Quality Trajectory Audit** packet before any tuning:

1. Trace the live formulas and data owners for officer quality, brigade experience, cohesion, morale, doctrine phase, equipment decay, maintenance, exhaustion, operation readiness, and commander stance.
2. Produce date-window metrics at 40w, 104w, 156w, and 183/188w using current date-specific painted targets.
3. Identify whether the failure is primarily combat math, commander doctrine, operation readiness, OOB/training data, supply/equipment, or report/detector visibility.
4. Stop at plan if multiple owners are implicated; do not apply global multipliers without evidence.

Owner set: `/game-designer`, `/historian`, `/operations-expert`, `/corps-army-commander`, `/qa-engineer`, `/determinism-auditor`.

## Research Addendum (2026-05-01)

Follow-up research now lives in `docs/research/2026-05-01-force-quality-trajectory-research-and-proposals.md`.

Key additions:

- Treat late-war operations as opportunity tests for force quality, not substitutes for force quality.
- Audit the suspicious `officer_config.learning_rate` unit mismatch before any tuning. The code fallback values are multiplier-shaped (`RBiH: 1.5`, `RS: 0.7`, `HRHB: 1.0`), while `apr1992.json` supplies small absolute-looking values (`RBiH: 0.015`, `RS: 0.007`, `HRHB: 0.010`) that the live formula currently consumes as multipliers.
- Check whether `capability_profile` and `faction_officer_maturity` are decorative in war phase; both look like good owners for ARBiH professionalization and VRS degradation, but need consumer evidence.
- Model ARBiH improvement through operation readiness, staging, multi-axis coordination, support thresholds, and capture delivery. Model VRS decline through sustained-system degradation while preserving local defense and counterattacks.

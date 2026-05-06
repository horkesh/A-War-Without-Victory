# A3 — Army-Level Order Interpretation (LANE-NIGHTSHIFT-A3-ARMY-LEVEL-ORDER-INTERPRETATION)

**Date:** 2026-05-06
**Status:** SHIPPED
**DDR (authoritative):** `docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md` (`eee308e0`)
**Predecessors:**
- A1 closeout: `docs/40_reports/implemented/20260506_A1_WIRE_CAMPAIGN_PLAN_TO_BRIEFING.md` (`18136710`)
- A2 closeout: `docs/40_reports/implemented/20260506_A2_ARMY_CO_LOOP_SUBSTRATE.md` (`ba6955bf`)

## What A3 ships

A3 introduces army-level interpretation of POLITICAL directives into per-corps directives, mirroring the corps-level Phase 1 framework (`src/sim/combat/order_interpretation.ts`, 949 LOC) for the army layer. A3 also adds the Mladić-class autonomous-launch path per DDR Q3.

Two public predicates:

1. `interpretArmyDirective(state, faction, directive)` — translates a `PoliticalDirective` (DDR Q1 vocabulary: `HOLD_AT_ALL_COSTS` / `PRESS_OFFENSIVE` / `MAINTAIN_CORRIDOR` / `PREPARE_RESERVE` / `HONOR_TRUCE` / `BALANCE_FRONTS`) into a faction-keyed per-corps directive map. Emits an `army_directive_pushback` PendingOfficerEvent on non-FULL compliance.

2. `proposeAutonomousArmyLaunch(state, faction)` — fires `army_co_proposes_op` PendingOfficerEvent when stubbornness ≥ 4 + cooldown elapsed + an opportunity-catalog match exists. Player has 1-turn override window (DDR Q3).

## Interpretation formula

```
base_compliance     = (competence + (5 - stubbornness)) / 10
+ ALIGNMENT_BONUS    (0.20)  when verb aligns with stubbornness-driven preference
- MISALIGNMENT_PENALTY (0.20) when verb misaligns
+ reliability_modifier (placeholder; corps Phase 3 will integrate)
```

Output bands (mirror corps Phase 1 thresholds):

| Score Band | Compliance | Behavior |
|---|---|---|
| ≥ 0.80 | full | No pushback event; raw role mapping |
| 0.50 – 0.79 | modified | Event fired; deviation ±1 step toward officer preference |
| 0.25 – 0.49 | partial | Event fired with explicit pushback reason |
| < 0.25 | refused | Event asks for override or relief; corps roles shift to officer's preferred role |

Deviation cap: `MAX_DIRECTIVE_DEVIATION = 1` (single-step shift on the role ladder `contain → economy → secondary → primary`).

## Autonomous-launch flow (DDR Q3)

```
IF army_co.stubbornness >= STUBBORNNESS_AUTONOMOUS_THRESHOLD (4)
   AND (state.meta.turn - last_autonomous_launch_turn) >= AUTONOMOUS_LAUNCH_COOLDOWN_TURNS (12)
   AND there exists an OperationOpportunityDef in catalog where
       def.faction == army_co.faction
       AND isOpportunityEligible(def, evaluateAxes(state, turn, def))
THEN
   emit `army_co_proposes_op` PendingOfficerEvent
       with original_order = null, interpreted_order = { opportunity_id, op_name, primary_corps }
       overridable: true, override_action: 'override-army-autonomous-launch'
   write decision-trace entry: turn, campaign_role='AUTONOMOUS_LAUNCH_PROPOSAL', rationale, raw_directive_id=opportunity_id
ELSE
   no-op (return AutonomousLaunchProposal { proposed: false })
```

A3 does NOT mutate `last_autonomous_launch_turn` itself — that mutation occurs at op-creation time in a downstream lane (the un-overridden proposal converts into a real op next turn).

## Constants (DDR-locked)

| Constant | Value | Source |
|---|---|---|
| `MAX_DIRECTIVE_DEVIATION` | 1 | DDR Q2 advisory shape (mirrors corps Phase 1) |
| `STUBBORNNESS_AUTONOMOUS_THRESHOLD` | 4 | DDR Q3 panel-defaults table |
| `AUTONOMOUS_LAUNCH_COOLDOWN_TURNS` | 12 | DDR Q3 panel-defaults table |
| `ARMY_OVERRIDE_POLITICAL_CAPITAL_COST` | 2 | DDR Q1 |

## Pipeline integration

New step `apply-army-directive-interpretation` registered in `src/sim/turn_phases/war_phases.ts`:

```
… → evaluate-army-hq-gathering → apply-army-directive-interpretation → generate-bot-corps-orders → …
```

The step short-circuits when:
- `state.meta.phase !== 'war'`
- No `political_directives_by_faction[faction]` entry is present (substrate-driven; A4 wires the slot)
- Army CO stubbornness gate fails (defaults to undefined → 0 < threshold)

## Files touched (exclusive ownership)

- `src/sim/combat/army_order_interpretation.ts` (NEW, 553 LOC)
- `src/sim/turn_phases/war_phases.ts` (added pipeline step + import)
- `src/state/officer_types.ts` (extended `OfficerEventType` union with `army_directive_pushback` + `army_co_proposes_op`; extended `OrderSnapshot` with `political_directive` / `army_co_proposed_op` discriminator values + `directive_verb` / `opportunity_id` optional fields)
- `tests/a3_army_order_interpretation.test.ts` (NEW, 14 tests, 14/14 GREEN)
- `docs/40_reports/implemented/20260506_A3_ARMY_LEVEL_ORDER_INTERPRETATION.md` (this file)

Files NOT touched: `src/sim/combat/order_interpretation.ts` (corps Phase 1 territory), `src/sim/combat/army_hq_gathering.ts` (A1/A2 surface), `src/sim/combat/officer_system.ts` (preserved), `src/sim/combat/operation_opportunity_catalog_*` (read-only consumer), `src/state/game_state.ts` (A2 already added needed slots), all UI / scenario / canon code.

## Verification

- `npx vitest run tests/a3_army_order_interpretation.test.ts` — **14/14 GREEN**
- `npx vitest run tests/a3_army_order_interpretation.test.ts tests/order_interpretation*.test.ts tests/officer_*.test.ts tests/a1_*.test.ts tests/a2_*.test.ts` — **148/148 GREEN**
- `npx tsc --noEmit -p tsconfig.json` — **CLEAN**
- 40w smoke (parent runs): expected BYTE-STABLE pre-A4-roster-data per DDR substrate-driven design (no political directive slot is populated yet; stubbornness defaults are undefined; both predicates short-circuit silently).

## Sensitive-history compliance

- **Ring 1 mechanism:** every code path is faction-symmetric (no `if (faction === 'X')` branches; static-grep guard in T8).
- **Ring 2 data:** faction-asymmetric values (stubbornness, override_tolerance, aggressiveness) come from canonical roster data (A4 lane).
- **No FORAWWV / paint anchor / `political_controllers` / OOB / rupture-wiring touch.**
- **§6 surface:** Mladić-bot autonomous-launch path may eventually propose Krivaja-95 / Stupčanica-95 — both already exist as opportunity-catalog entries with §6 sign-off chain. A3 adds player AGENCY (1-turn override window) to genocide-adjacent operations, which is the right design intent per DDR Q3. NOT a new §6 boundary crossing.
- **Determinism:** no `Math.random()`, no `Date.now()`, no `new Date()`, no locale-sort outside the explicitly permitted opportunity_id comparison (catalog is ASCII-safe). Static-grep guard in T11.

## Tests authored (14 total)

| Test | Coverage |
|---|---|
| T1 | Full compliance — high competence + low stubbornness + aligned directive → no event |
| T2 | Modified compliance — mid scores → event fires within MAX_DIRECTIVE_DEVIATION |
| T3 | Partial / refused — low scores + strong misalignment → explicit pushback event |
| T4 | Refusal — extreme misalignment → event asks for override |
| T5 | Autonomous launch — stubbornness ≥ threshold + cooldown elapsed → predicate evaluates eligible catalog entries |
| T6 | Cooldown — stubbornness ≥ threshold but `last_autonomous_launch_turn` within cooldown → NO proposal |
| T7 | Stubbornness < threshold → no autonomous proposal |
| T8 | Faction-symmetric mechanism (static-grep, code-only scan excluding comments) |
| T9 | Determinism — identical inputs → byte-identical output |
| T10 | Decision trace — every interpretation writes a trace entry |
| T11 | No nondeterminism sources in code (static-grep, code-only) |
| T12 | Pipeline integration — step exists at correct position |
| T12b | `applyArmyDirectiveInterpretation` tolerates empty state |
| Constants surface | DDR-locked values exported correctly |

## Cross-references

- Order Interpretation Phase 1 (corps level, shipped): `src/sim/combat/order_interpretation.ts` (949 LOC)
- v0.8.3 Order Interpretation plan: `docs/plans/2026-03-24-v081-order-interpretation-plan.md`
- A4 (canonical roster) + A5 (Pre-Advance Review UI) consume the events + traces emitted here.

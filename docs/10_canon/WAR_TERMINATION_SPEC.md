# War Termination Spec

**Status:** CANON (v0.9.x gate)
**Date:** 2026-05-17
**Authority:** Canon hierarchy, Tier 2 for termination semantics: below Engine Invariants, above Rulebook-derived player guidance.
**Owners:** Game Designer, Technical Architect, Gameplay Programmer.
**Supersedes:** `docs/30_planning/_legacy/WAR_TERMINATION_MINIMAL_SPEC.md` (2026-02-24 draft).

## 1. Purpose

This spec defines the minimal canon contract for when and how the Bosnian War ends in AWWV. It reconciles the 2026-02-24 war-termination directive, the legacy minimal spec, `VICTORY_AND_PYRRHIC_SCORING.md`, `SENSITIVE_HISTORY_DESIGN_GATE.md`, and the current reference implementation in `src/sim/war_termination.ts` and `src/sim/negotiation/`.

This is a design-first document. It does not change engine behavior, scenario data, save migration, negotiation thresholds, UI, or scoring weights.

## 2. Termination Conditions

Current reference implementation: `src/sim/war_termination.ts:35-91`. First matching condition wins.

1. **Scenario victory conditions**
   - Trigger string: `victory:{faction}` or `co_victory:{factions}`.
   - Code reference: `checkWarTermination()` calls `evaluateVictoryConditions(...)` at `src/sim/war_termination.ts:47`.
   - Preconditions: scenario declares `meta.victory_conditions`; `evaluateVictoryConditions` returns `winner` or `co_winners`; absent conditions return no scenario-victory termination. Default canonical campaigns do not rely on this path.

2. **Negotiated peace**
   - Trigger string: `negotiated_peace:{plan_id}` or `negotiated_peace:negotiated`.
   - Code reference: `src/sim/war_termination.ts:61-71` checks `state.military.event_flags.war_ended_early === true`.
   - Preconditions: a peace-plan or Dayton resolver sets `war_ended_early`; `peace_plans.ts:239-256` sets `war_ended_early` and freezes the snapshot on accepted early peace; Dayton resolution freezes the snapshot in `dayton_negotiation.ts:280`.
   - Design status: this is the canonical Dayton-style negotiated end path.

3. **Faction collapse**
   - Trigger string: `faction_collapse:{collapsed}:winner:{survivor}` or `mutual_collapse`.
   - Code reference: `checkFactionCollapse(...)` at `src/sim/war_termination.ts:98-160`.
   - Preconditions: active brigade registry leaves zero or one surviving canonical factions among `HRHB`, `RBiH`, `RS`; a single collapsed faction with two survivors does not terminate.

4. **Turn-limit stalemate**
   - Trigger string: `timeout_stalemate`.
   - Code reference: `src/sim/war_termination.ts:80-90` with `state.meta.max_turns ?? 208`.
   - Preconditions: no earlier condition fired and `state.meta.turn >= maxTurns`.
   - Open design conflict: `docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md` proposes removing `timeout_stalemate`; current code retains the 208-week backstop. This spec records current behavior and carries the removal proposal as an open question.

`applyWarTermination()` must freeze the endgame snapshot when a terminal result is applied (`src/sim/war_termination.ts:173-178`). The frozen snapshot preserves verdict, cost ledger, and historical comparison across save/load and later engine drift.

**Known canon drift:** `VICTORY_AND_PYRRHIC_SCORING.md` Section 1 currently omits negotiated peace from its priority list even though current code checks it second. This spec follows current code and flags the scoring doc for follow-on canon amendment.

## 3. Faction Goal Hierarchy

Faction goals are political identity and verdict meaning, not a player-facing war-aim selector, slider, or leaderboard. They bind narrative interpretation to `VICTORY_AND_PYRRHIC_SCORING.md` Section 3.1 dimension weights and Section 3.2 grade anchors. Any future change requires Historian and Game Designer re-sign-off.

| Faction | First preference, usually unreachable | Negotiation target | Canon binding | Citation pack |
|---|---|---|---|---|
| `RS` | Independence / permanent separation. | Maximum autonomy inside Bosnia and Herzegovina, later Dayton entity autonomy. | RS grade anchors and humanitarian condemnation caps remain sovereign. | `docs/40_reports/convenes/WAR_TERMINATION_SPEC_HISTORIAN_NOTES_2026-05-17.md` Section 2. |
| `HRHB` | Third entity or separate Croat unit. | Strengthened cantons and Croat protections inside the Federation framework. | HRHB grade anchors read Washington/Federation position as the realistic target. | Historian notes Section 3. |
| `RBiH` | Strong unitary state-level institutions. | Strongest feasible state-level institutions under Dayton constraints. | RBiH grade anchors read state continuity, Sarajevo, enclaves, and Federation coherence together. | Historian notes Section 4. |

## 4. Recurring Peace Initiatives

The canonical roster is the existing data in `src/sim/negotiation/peace_plan_data.ts`. No fictional AWWV-only peace plan is introduced.

| Plan id | Historical initiative | Code trigger week | Proposed split | Institutional model | Acceptance effect | Citation anchor |
|---|---|---:|---|---|---|---|
| `cutileiro` | Cutileiro / Lisbon, March 1992 | 0 | RBiH 44, RS 44, HRHB 12 | `cantonization` | Accepted early peace sets `war_ended_early`. | Historian notes Section 5. |
| `vance_owen` | Vance-Owen, January 1993 | 40 | RBiH 39, RS 43, HRHB 18 | `10_provinces` | Accepted early peace sets `war_ended_early`. | Historian notes Section 5. |
| `owen_stoltenberg` | Owen-Stoltenberg, August 1993 | 70 | RBiH 33, RS 52, HRHB 15 | `union_3_republics` | Accepted early peace sets `war_ended_early`. | Historian notes Section 5. |
| `contact_group` | Contact Group Plan, July 1994 | 118 | RBiH 33, RS 49, HRHB 18 | `51_49_entities` | Accepted early peace sets `war_ended_early`. | Historian notes Section 5. |
| `dayton` | Dayton Peace Agreement, November 1995 | 185 in plan data; 188 in Dayton trigger | RBiH 33, RS 49, HRHB 18 | `two_entities` | Dayton resolver stores result and freezes endgame snapshot. | Historian notes Section 5. |

Recurring-initiative rule: historical plans fire from code-backed trigger checks. Success remains low until precondition levers in Section 5 are sufficiently satisfied. Early acceptance is mechanically possible but historically rare; late Dayton acceptance is the design target. Thresholds are TBD and belong to a follow-on calibration pass.

Historical-default resolution rule (2026-07-17): when no player owns the decision, each plan resolves from an explicit faction disposition rather than a generic accept/reject fallback. Cutileiro: RBiH rejects, RS and HRHB accept. Vance-Owen: RBiH and HRHB accept, RS rejects. Owen-Stoltenberg: RBiH rejects, RS and HRHB accept. Contact Group: RBiH and HRHB accept, RS rejects. Dayton: all three accept through the dedicated Dayton resolver. These are normalized terminal/calibration dispositions, not a complete chronology of conditional signatures, later withdrawals, or intra-faction bargaining. In particular, Owen-Stoltenberg's RBiH conditional acceptance/later rejection and HRHB concession withdrawal are represented by the terminal disposition used by the simulation.

The War pipeline increments the turn before evaluating negotiation. A one-time Cutileiro catch-up therefore evaluates on the first War turn while preserving offer turn `0`; it must not be silently skipped by the clock transition or offered more than once.

Dayton escape valve: `dayton_negotiation.ts:32-72` sets `DAYTON_TRIGGER_WEEK = 188` and can force Dayton before that only when all canonical factions have patron override authority at or above `FORCED_DAYTON_OVERRIDE_THRESHOLD = 95`.

**Known code-data nuance:** `peace_plan_data.ts` lists Dayton `trigger_week: 185`, while `dayton_negotiation.ts` uses `DAYTON_TRIGGER_WEEK = 188`. This spec treats the Dayton resolver constant as authoritative for forced final negotiation timing and logs the data constant mismatch as follow-on cleanup.

## 5. Precondition Levers

**Thresholds are TBD.** This spec names the minimal conceptual levers only; it does not introduce numeric values for sufficient IVP, patron pressure, exhaustion, or strength.

| Lever | State field / engine owner | System reference | Historical anchor | Terminal condition gated |
|---|---|---|---|---|
| IVP (International Visibility Pressure) | `state.political.international_visibility_pressure` / System 1 inputs. | Systems Manual System 1 and System 7. | Sarajevo siege visibility, enclave pressure, Markale/Srebrenica international reaction. | Negotiated peace; scoring context. |
| Patron pressure | `state.military.negotiation.patron_relationships`; `patron_pressure.ts`; Dayton override. | Systems Manual System 1; `dayton_negotiation.ts`. | Serbia/FRY pressure on RS, Croatia/HV leverage over HRHB, US/EU leverage over RBiH/Federation. | Negotiated peace and Dayton forced-acceptance envelope. |
| Exhaustion | `state.phase_ii_exhaustion` / war exhaustion fields. | Engine Invariants Section 8; Systems Manual exhaustion systems. | Static fronts, supply strain, sanctions, manpower depletion, cumulative war weariness. | Negotiated peace; faction collapse context; verdict grading. |
| Army strength / relative balance | territorial control share, active formation count, supply pressure, operation readiness. | Systems Manual System 7 and scoring inputs. | Federation and ARBiH late-1995 advance, RS pressure after Deliberate Force and regional military reversals. | Negotiated peace leverage; scenario victory; collapse and timeout judgment. |

Forward pointer: engine consumers include `compute_capital.ts`, `patron_pressure.ts`, `bot_negotiation.ts`, `peace_plans.ts`, and `dayton_negotiation.ts`. This spec does not duplicate their formulas.

War crimes are not a precondition lever. They enter verdict through locked condemnation flags and grade anchors, not through treaty bargaining capital.

## 6. Scoring Overlay

Termination and judgment are separate. On any of the four terminal conditions, termination produces game-over state and an outcome label; judgment computes the per-faction verdict.

Binding rules from `VICTORY_AND_PYRRHIC_SCORING.md`:

- Termination answers when the war ends; judgment answers what the end means.
- `computeFullVerdict()` in `src/sim/negotiation/scoring.ts` computes per-faction verdict packets. There is no single winner.
- `pyrrhic_score` is supporting context, not sovereign truth.
- Outcome class and grade are primary; condemnation flags can cap or taint any result.
- No leaderboards and no winner labels are allowed in endgame UX.
- Scenario victory conditions terminate a scenario but do not assign grades; judgment remains orthogonal.

This spec makes no new scoring claims, outcome classes, dimension weights, or condemnation flags. The faction goal hierarchy in Section 3 is the narrative meaning of existing weights and grade anchors.

## 7. Sensitive-History Gate

This spec complies with `SENSITIVE_HISTORY_DESIGN_GATE.md` Rings 1/2/3 as of 2026-05-17. It references existing modeled and narrative surfaces but introduces no new sensitive-history mechanics.

| Ring-3 refused surface | Audit conclusion |
|---|---|
| No commit-genocide decision tree | Not introduced; no player-authorized atrocity command exists here. |
| No concentration camp system | Not introduced; detention mechanics are not specified. |
| No negotiable condemnation | Preserved; condemnation flags remain locked and non-tradeable. |
| No body-count optimization surface | Preserved; casualties and displacement are never positive scoring inputs. |
| No atrocity efficiency metric | Preserved; war crimes are explicitly not a precondition lever. |
| No alternate-history minimization | Preserved; early peace is not framed as morally less bad than real history. |
| No ranking factions by atrocity | Preserved; verdict is per-faction, no leaderboard. |
| No granular attribution of individual victims | Not introduced; no simulated named civilian entities. |
| No justified atrocity framing | Preserved; faction goals describe political identity, not atrocity value. |
| No gamified prevent-genocide mechanic | Preserved; absence of condemnation is not a badge or reward. |
| No calendar-driven atrocity recording | Preserved; rupture logic remains engine-owned and state-condition driven. |

Sign-off: Historian and Game Designer initial this audit in Section 8. No Ring-3 risk is introduced.

## 8. Sign-Off And Open Questions

| Role | Skill | Reviews | Required | Date | Result |
|---|---|---|---|---|---|
| Game Designer | `/game-designer` | All sections; lead design consistency. | Yes | 2026-05-17 | Signed: minimal spec adds no new mechanics and preserves negative-sum verdict framing. Follow-up: threshold tuning remains out of scope. |
| Technical Architect | `/technical-architect` | Termination conditions, scoring handoff, code citations. | Yes | 2026-05-17 | Signed: spec follows current entrypoints and flags code/canon drift instead of patching it in this lane. |
| Architect | `/architect` | Product loop coherence. | Yes | 2026-05-17 | Signed: spec preserves Dayton-style loop and defers UI/IPC work to follow-on plans. |
| Historian | `/historian` | Faction goals, peace plans, lever anchors, sensitive-history audit. | Yes | 2026-05-17 | Signed with advisory pack; citations are summarized separately and should be expanded before public-facing prose. |
| User | Direct | Final sensitive-history-touching canon sign-off. | Yes | Pending | Pending direct user sign-off; parent lane must collect this before treating the spec as fully released. |

Open questions carried into the follow-on engine plan:

| ID | Question | Status |
|---|---|---|
| Q1 | Does `timeout_stalemate` at week 208 remain, or does the future direction remove it in favor of Dayton/player quit only? | TBD - follow-on engine plan. |
| Q2 | Numeric precondition thresholds for IVP, patron pressure, exhaustion, and strength. | TBD - calibration pass. |
| Q3 | Should peace initiatives fire once or stay open for N turns? Current code fires on exact `trigger_week`. | TBD - follow-on engine plan. |
| Q4 | Does player termination / quit screen become a fifth terminal condition? Current `war_termination.ts` does not include it. | TBD - design decision. |
| Q5 | How faction-goal hierarchy composes with scenario-defined victory conditions in training or what-if scenarios. | TBD - follow-on engine plan. |
| Q6 | Align `VICTORY_AND_PYRRHIC_SCORING.md` Section 1 with code-backed negotiated-peace priority. | TBD - canon amendment lane. |
| Q7 | Reconcile Dayton `trigger_week: 185` in `peace_plan_data.ts` with `DAYTON_TRIGGER_WEEK = 188` in `dayton_negotiation.ts`. | TBD - focused data/engine follow-up. |

Open questions do not block this minimal spec as a contract. They block engine expansion beyond the current reference implementation.

## 9. References

- `docs/40_reports/convenes/_archived_feb2026/ORCHESTRATOR_WAR_TERMINATION_MINIMAL_SPEC_DIRECTIVE_2026_02_24.md`.
- `docs/30_planning/_legacy/WAR_TERMINATION_MINIMAL_SPEC.md` (superseded legacy draft of 2026-02-24; this spec extends it with v0.9.0 canon alignment).
- `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md` Sections 1, 2, 3.1, 3.2, 3.4, 4.2, 4.4, 5.1, 6.
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` Sections 1, 4, 6.
- `docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md`.
- `src/sim/war_termination.ts`.
- `src/sim/negotiation/peace_plan_data.ts`.
- `src/sim/negotiation/peace_plans.ts`.
- `src/sim/negotiation/dayton_negotiation.ts`.
- `src/sim/negotiation/scoring.ts`.
- `src/scenario/victory_conditions.ts`.
- `docs/40_reports/convenes/WAR_TERMINATION_SPEC_HISTORIAN_NOTES_2026-05-17.md`.

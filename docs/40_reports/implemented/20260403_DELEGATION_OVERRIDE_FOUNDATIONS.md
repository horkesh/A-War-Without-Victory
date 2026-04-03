# Delegation / Override / Command Friction — Foundations Report

**Date:** 2026-04-03
**Phase:** B of the Presidential Play Package
**Author:** Technical Architect
**Status:** AUDIT COMPLETE, EXECUTION PLAN WRITTEN

---

## 1. What Exists Today (Embryonic Audit)

### Already Functional — Player Actions by Command Level

**Level 1 (Strategic Guidance):**
- Event decisions (`respondToEventDecision`) — player responds to political/military events
- Airdrop allocation (`stageAirdropAllocation`) — faction-level resource distribution

**Level 2 (Army/Corps Directives):**
- Corps stance (`stageCorpsStanceOrder`) — offensive/defensive/screening via ArmyHQCorpsCard
- Sector stance (`stageSectorStanceOrder`) — sector-level posture via SectorsSection
- Operation launch (`stageCorpsOperationOrder`) — full OPORD via AuthorizePhase ops modal
- Operation go/no-go (`stageOperationDecision`) — launch/postpone/abort/probe via OperationBriefingModal
- Operation halt (`stageOperationHalt`) — stop running op
- Commander assignment (`stageAssignOperationCommander`, `assignCommander`, `dismissOfficer`)
- OPSEC toggle (`stageOpsecToggle`)
- Logistics priority (`stageLogisticsPriority`)
- Municipality support (`stageMunicipalitySupportOrder`)

**Level 3 (Direct Intervention):**
- Force-launch operation (`stageOperationForceLaunch`) — override commander recommendation
- Manual brigade move (`stageMoveOrder`) — direct brigade repositioning
- Brigade posture (`stagePostureOrder`) — direct brigade stance change
- Brigade-to-sector assignment (`assignBrigadeToSector`) — override sector system
- Attack order (`stageAttackOrder`) — direct brigade attack (legacy, rarely used)

**Key finding:** All 18+ player IPC actions exist and work. None are tagged with their command level. None carry cost. The player can freely mix Level 1, 2, and 3 actions with no distinction or consequence.

### Embryonic — Code Exists, Not Connected

| Mechanism | Status | Gap |
|-----------|--------|-----|
| `stance_source: 'bot' \| 'player'` on `SectorStance` | Tracks who set stance | Not consumed by any friction, cost, or visibility system |
| `must_hold_source: 'scenario' \| 'bot' \| 'player'` | Tracks who set must-hold | Same — no consumers |
| `army_hq_overrides` system (`army_hq_overrides.ts`) | Bot army HQ forces idle corps to act | Pure bot mechanic. No player involvement, no cost, no visibility surface |
| `warlord_friction` system (`warlord_friction.ts`) | Low-reliability officers generate `FrictionEvent` | Events fire and are stored on `state.military.friction_events`, but no player decision surface exists. No accept/override flow |
| `FrictionEvent` type | Tracks `ignored_stance`, `unauthorized_op`, `refused_release` | Not displayed anywhere in the UI. Not connected to any cost or resolution mechanic |
| `PoliticalLeaderState.political_capital` | Type definition exists in `political_leader_types.ts` | Types only. Not on GameState. No pipeline step. No UI. Designed for non-player political bot (v0.8.2), not player command authority |
| `PoliticalDirective` interface | Exists only in architecture spec doc | Not in code at all |
| Commander loop output (`CommanderOutput`) | Structured output from `emit.ts` | Contains decisions but no delegation summary for the player to see what the commander chose autonomously |

### Missing — No Code At All

| Concept | Needed For |
|---------|-----------|
| `command_authority` player resource | Override cost mechanic (v0.8.3+) |
| Command level tags on IPC actions | Distinguishing L1/L2/L3 in UI and cost logic |
| Override cost calculation + confirmation | Making Level 3 feel like a deliberate presidential choice |
| Delegation visibility / summary | Making between-ops turns meaningful — player sees what happened without them |
| Command friction display | Showing intent-vs-execution gap per corps |
| Strategic priorities (Level 1 input) | Player-set faction-wide priorities that constrain corps AI |
| Command friction log (unified) | Accumulated record across warlord friction, future interpretation, overrides |

---

## 2. Terminology Alignment

Checked all plans in `docs/plans/` and engineering docs for inconsistent naming.

**Findings:**
- The three command levels ("Strategic Guidance", "Army/Corps Directives", "Direct Intervention") are defined in `PRESIDENTIAL_COMMAND_DOCTRINE.md` but not referenced by name in any implementation plan. The plans use informal terms like "active command", "force launch", "override". No contradictions found, but no explicit adoption either.
- `political_capital` in `political_leader_types.ts` is correctly scoped to the non-player political leader bot. The player's resource should be called `command_authority` to avoid conflation.
- "Brigade commander" framing does not appear in any active plan. The `MASTER_ROADMAP.md` already has the correct reminder: "Direct brigade-level control remains an exceptional override, not the baseline fantasy."
- No stale "brigade-commander" framing was found in plans touched by this phase.

**Action taken:** The execution plan (`2026-04-03-delegation-override-command-friction-plan.md`) includes a canonical terminology table. All future work should reference it.

---

## 3. Architecture Definition Summary

Six concepts defined with data structure, UI surface, sim phase, and player-visible behavior:

| Concept | Data Location | UI Owner | Sim Phase |
|---------|--------------|----------|-----------|
| **Strategic Guidance** | `state.military.strategic_priorities` (new) | Warroom | Consumed by `army_hq_gathering`, `briefing.ts` |
| **Army/Corps Directives** | Existing IPC channels | Army HQ | `apply-player-orders` (existing) |
| **Direct Intervention** | `state.military.command_authority` (new) | Tactical Map + Army HQ | `apply-override-costs` (new step) |
| **Delegation** | `CommanderOutput.delegation_summary` (new field) | Army HQ CoS Briefing | `commander_loop.ts` (existing) |
| **Override Cost** | `command_authority.current` deduction | Confirmation dialog | `apply-override-costs` |
| **Command Friction Visibility** | `state.military.command_friction_log` (new) | Army HQ corps cards | `warlord_friction.ts` + future `order_interpretation.ts` |

Full architecture definitions are in the execution plan, Section 3.

---

## 4. High-Value Enabling Change Assessment

Evaluated three candidates for a small, safe, high-value code change:

1. **Adding `command_authority` field to GameState** — Safe (new field, no consumers), but requires serializer update and scenario loader change. Two-file minimum. Moderate risk of serializer edge case.

2. **Adding `CommandLevel` type annotation** — Safest option. Pure type definition, no runtime change. But annotation-only with no consumers is low immediate value.

3. **Tagging existing IPC actions with `command_level` in comments** — Zero runtime risk, useful documentation, but not a code change.

**Decision:** No code change forced. The audit and plan are the primary deliverables. Phase 1 (command level tags) and Phase 2 (command_authority field) are the first two execution steps and should be done as proper commits with tests, not squeezed into a design session.

---

## 5. Execution Plan Pointer

Full phased execution plan: `docs/plans/2026-04-03-delegation-override-command-friction-plan.md`

Six phases:
1. Command level tags (foundation, no sim change)
2. Command authority field (GameState scaffolding)
3. Command friction log (wire existing warlord friction to UI)
4. Delegation summary in commander output
5. Command authority UI gauge
6. Override cost prototype (force-launch only)

Phases 1-2 are pure infrastructure. Phases 3-4 deliver player-visible value. Phases 5-6 deliver the first override-has-cost moment.

---

## 6. Relationship Map

```
PRESIDENTIAL_COMMAND_DOCTRINE.md (governing doc)
    |
    v
THIS PLAN (Phase B foundations)
    |
    +-- Phase 1-2 --> v0.8.2 Political Leader Bot (needs command_authority distinction)
    |
    +-- Phase 3-4 --> v0.8.3 Order Interpretation (needs friction log + delegation summary)
    |                    |
    |                    v
    |                 v0.8.3 Player Command Review UX (needs friction + delegation display)
    |
    +-- Phase 5-6 --> v0.8.4 Autonomy (needs command_authority spend + recovery)
    |
    +-- All phases --> v0.8-to-v0.9 Commander Explanation Surfaces (consumes same data)
```

---

## 7. Completion Block

```
Canonical owner: presidential command doctrine + command chain architecture
Demoted path: scattered command framing without command-level tags
Player-visible truth: the player will see command authority as a resource,
    delegation as narrated corps decisions, and friction as visible intent-vs-execution gaps
Canonical UI surface: Army HQ for directives and friction; Warroom for strategic guidance;
    PresidentialToolbar for command authority gauge
Done means: execution-grade plan exists, terminology aligned, embryonic audit complete,
    six-phase build sequence defined with gates and file families
```

# Delegation / Override / Command Friction — Execution Plan

**Date:** 2026-04-03
**Status:** PLAN — READY FOR PHASED EXECUTION
**Roadmap slot:** Spans v0.8.2 through v0.8.x-final (foundations now, full mechanics later)
**Overseer:** Orchestrator
**Architect:** Technical Architect
**Primary implementer roles:** Gameplay Programmer, UI/UX Developer, Systems Programmer
**Primary reviewer roles:** Code Simplifier, Canon Compliance Reviewer, Modern Wargame Expert
**Gate:** v0.8.0 Commander Intelligence must remain stable (25/25 anchors, 6/6 benchmarks). No sim regressions.

**Governing doc:** `docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md`

---

## 0. Purpose

The presidential command doctrine defines three command levels but nothing in the codebase tags, tracks, or constrains player actions by level. This plan establishes the minimal data structures, tagging, and visibility hooks that all downstream milestones (v0.8.2 Political Leader Bot, v0.8.3 Order Interpretation, v0.8.4 Autonomy) depend on.

This plan does NOT build the full order interpretation system, the political leader bot, or the override cost mechanic. It builds the substrate they all need.

---

## 1. Canonical Terminology

These terms are authoritative. All plans, code, and UI must use them:

| Concept | Canonical Term | NOT this |
|---------|---------------|----------|
| Normal presidential turn loop | **Strategic Guidance** (Level 1) | "default mode", "passive play" |
| Corps-level intent setting | **Army/Corps Directives** (Level 2) | "active command", "micromanagement" |
| Overriding the command chain | **Direct Intervention** (Level 3) | "force launch", "brigade command", "tactical control" |
| Resource spent on overrides | **Command Authority** | "political capital" (reserved for political leader bot) |
| Gap between intent and execution | **Command Friction** | "disobedience", "pushback" |
| Routine decisions flowing without input | **Delegation** | "automation", "AI control" |

**Key distinction:** `command_authority` is the player's presidential resource for overriding military decisions. `political_capital` (from `political_leader_types.ts`) is the non-player political leader bot's resource for political decisions. They are structurally similar but serve different actors and should not be conflated.

---

## 2. What Exists Today (Embryonic Audit)

### Already Functional (player can use today)

| Action | IPC Channel | Command Level | UI Surface |
|--------|------------|---------------|------------|
| Set corps stance | `stageCorpsStanceOrder` | Level 2 | ArmyHQCorpsCard, CorpsDetail |
| Set sector stance | `stageSectorStanceOrder` | Level 2 | SectorsSection |
| Launch operation (from ops modal) | `stageCorpsOperationOrder` | Level 2 | AuthorizePhase |
| Operation go/no-go decision | `stageOperationDecision` | Level 2 | OperationBriefingModal |
| Force-launch operation | `stageOperationForceLaunch` | **Level 3** | OperationBriefingModal |
| Assign operation commander | `stageAssignOperationCommander` | Level 2 | CommanderSelectionModal |
| Assign/dismiss officer | `assignCommander` / `dismissOfficer` | Level 2 | Personnel tab |
| Move brigade manually | `stageMoveOrder` | **Level 3** | Map click |
| Set brigade posture | `stagePostureOrder` | **Level 3** | SelectionPanel |
| Respond to event | `respondToEventDecision` | Level 1 | Event modal |
| OPSEC toggle | `stageOpsecToggle` | Level 2 | SectorsSection |
| Logistics priority | `stageLogisticsPriority` | Level 2 | SectorsSection |
| Municipality support | `stageMunicipalitySupportOrder` | Level 2 | SituationTab |
| Halt operation | `stageOperationHalt` | Level 2 | Ops panel |
| Brigade-to-sector assignment | `assignBrigadeToSector` | **Level 3** | Map click |
| Airdrop allocation | `stageAirdropAllocation` | Level 1 | Warroom |

### Embryonic (code exists, not connected to gameplay loop)

| Mechanism | File | What It Does | What's Missing |
|-----------|------|-------------|----------------|
| `army_hq_overrides` | `army_hq_overrides.ts` | Army HQ forces idle corps to launch ops | No player involvement — pure bot mechanic. No cost, no visibility. |
| `warlord_friction` | `warlord_friction.ts` | Low-reliability officers ignore stance / refuse release | Fires events but no player decision surface. No override/accept flow. |
| `stance_source: 'bot' \| 'player'` | `game_state.ts:1604` | Tags who set a corps stance | Not consumed by any friction or override logic. |
| `must_hold_source` | `game_state.ts:1608` | Tags who set must-hold zones | Not consumed by friction logic. |
| `PoliticalLeaderState.political_capital` | `political_leader_types.ts:68-69` | Type exists with capital fields | No GameState wiring, no pipeline step, no UI. Types only. |
| `PoliticalDirective` interface | Architecture spec only | Stance ceiling, paramilitary auth | Exists in plan doc, not in code. |
| `FrictionEvent` tracking | `warlord_friction.ts:21-26` | Records friction type + resolution | Not displayed to player. Not connected to override cost. |

### Missing (no code at all)

| Concept | What's Needed |
|---------|--------------|
| `command_authority` resource | Field on GameState, accumulation/spend logic, UI display |
| Command level tagging on player actions | Each IPC action tagged L1/L2/L3 |
| Override cost calculation | Spend command_authority, apply morale/competence penalty |
| Delegation visibility | Player sees what corps AI decided without intervention |
| Command friction display | Player sees intent vs execution gap |
| Strategic priorities (Level 1) | Player sets faction-wide priorities that constrain corps AI |
| Command friction log | Accumulated record of overrides, costs, friction events |

---

## 3. Architecture Definition

### 3a. Strategic Guidance (Level 1)

**What:** The president sets faction-wide priorities that constrain how corps commanders interpret their zone.

**Data structure:**
```typescript
// On GameState.military (or GameState.political)
strategic_priorities?: {
    faction: FactionId;
    priorities: PoliticalPriority[];    // top 3, ordered
    stance_ceiling?: CorpsStance;       // max aggression allowed
    reserve_policy?: 'hold' | 'commit'; // army reserve posture
    set_turn: number;
};
```

**UI surface:** Warroom (the president's desk). A "Presidential Directive" panel where the player selects top-3 priorities from the existing `PoliticalPriority` union type.

**Sim phase:** Consumed by `army_hq_gathering.ts` (campaign plan) and `commander/briefing.ts` (corps briefing). Priorities influence which zones the commander considers high-value.

**Player sees:** Their selected priorities reflected in corps briefings. "The General Staff has noted your emphasis on territorial defense. 2nd Corps is prioritizing Brcko corridor garrison."

### 3b. Army/Corps Directives (Level 2)

**What:** The president issues intent to specific corps. Corps commanders interpret and execute.

**Data structure:** Already exists — `stageCorpsStanceOrder`, `stageCorpsOperationOrder`, etc. The missing piece is **interpretation**: the command chain may modify the order before executing it.

**Future data (v0.8.3):**
```typescript
// Attached to each player order when interpretation system exists
interface OrderInterpretation {
    original_order: PlayerOrder;
    interpreted_order: PlayerOrder;
    interpreter_officer_id: string;
    interpretation_type: 'complied' | 'modified' | 'delayed' | 'refused';
    reason: string;
    override_cost?: number;  // command_authority to force original
}
```

**UI surface:** Army HQ (command review). The existing corps cards, ops modal, and briefing modal.

**Sim phase:** `apply-player-orders` step in `war_phases.ts` (existing). Future: interpretation filter between order staging and application.

**Player sees:** Today: orders execute immediately. Future (v0.8.3): orders may be modified, with a review surface showing what changed and why.

### 3c. Direct Intervention (Level 3)

**What:** The president overrides the command chain. Always available, always costly.

**Data structure:**
```typescript
// New field on GameState.military
command_authority?: {
    current: number;      // [0, 100]
    max: number;          // 100
    spent_this_turn: number;
    lifetime_spent: number;
    // Recovery: +2/turn base, modified by officer trust and war situation
};
```

**Level 3 actions and their costs (design targets, tunable):**

| Action | Cost | Side Effect |
|--------|------|-------------|
| Force-launch operation | 15 | -5 morale on corps, -1 competence on commander for 4 turns |
| Override corps stance | 10 | -3 morale on corps |
| Manual brigade move | 5 | None (small but accumulates) |
| Override commander recommendation | 20 | Commander trust -10, transition penalty |
| Set brigade posture directly | 3 | None |
| Assign brigade to sector | 5 | None |

**UI surface:** Tactical Map (field intervention) and Army HQ (override buttons). A visible "Command Authority" gauge on the PresidentialToolbar.

**Sim phase:** New `apply-override-costs` step after `apply-player-orders`.

**Player sees:** A command authority bar. When they take a Level 3 action, the bar depletes visibly with a tooltip showing the cost and consequences.

### 3d. Delegation

**What:** Routine decisions flow through the command chain without presidential input. The player sees outcomes, not inputs.

**Data structure:** No new data needed — this is what the commander loop already does. The missing piece is **visibility**: the player should see a summary of what the command chain decided.

**Future data:**
```typescript
// Appended to turn report or corps briefing
interface DelegationSummary {
    corps_id: string;
    turn: number;
    decisions: Array<{
        type: 'stance_maintained' | 'op_continued' | 'brigade_redistributed' | 'emergency_defense';
        description: string;
    }>;
}
```

**UI surface:** Army HQ Briefing tab (existing `ChiefOfStaffBriefing.tsx`). The CoS already narrates what happened — this enriches it with structured delegation summaries.

**Sim phase:** `commander_loop.ts` already produces `CommanderOutput`. The output needs a `delegation_summary` field that the UI can consume.

**Player sees:** "2nd Corps maintained defensive posture. 5th Corps launched a probe toward Kljuc based on opportunity assessment. No presidential input was required."

### 3e. Override Cost

**What:** Direct intervention costs command authority and may cause morale/competence penalties.

**Data structure:** `command_authority` field defined in 3c above. Cost table defined in 3c above.

**UI surface:** Confirmation dialog before any Level 3 action. Shows: current authority, cost of this action, resulting authority, side effects. Pattern: "This will cost 15 Command Authority. General Halilovic's morale will drop by 5. Proceed?"

**Sim phase:** `apply-override-costs` step. Deducts command authority, applies morale/competence penalties, records in command friction log.

**Player sees:** Before: cost preview. After: authority bar change + notification of consequences.

### 3f. Command Friction Visibility

**What:** The player sees the gap between their intent and the field execution.

**Data structure:**
```typescript
// New field on GameState.military
command_friction_log?: Array<{
    turn: number;
    corps_id: string;
    type: 'interpretation' | 'warlord' | 'delay' | 'refusal' | 'override';
    description: string;
    officer_id?: string;
    resolved: boolean;
}>;
```

**UI surface:** Army HQ — a "Command Friction" indicator on each corps card. Red when friction is high, green when the command chain is compliant. Clicking opens the friction log for that corps.

**Sim phase:** Populated by `warlord_friction.ts` (existing, needs wiring), future `order_interpretation.ts` (v0.8.3), and `apply-override-costs` (new).

**Player sees:** Per-corps friction indicator. Expanding shows: "General Delic delayed your offensive order by 2 turns due to supply concerns." or "Commander Caco ignored your defensive stance and launched an unauthorized probe."

---

## 4. Phased Execution

### Phase 1: Command Level Tags (foundation, no sim change)

**Scope:** Tag every existing player IPC action with its command level. Pure metadata — no behavioral change.

**Files:**
- `src/ui/map/desktop/useIPC.ts` — add `CommandLevel` type, annotate each IPC method
- `src/ui/map/desktop/types.ts` — export `CommandLevel` type
- `src/state/game_state.ts` — add `CommandLevel` type to shared types

**Deliverable:** Every IPC action has a `command_level: 1 | 2 | 3` annotation (in types/comments, not runtime behavior yet).

**Gate:** `tsc --noEmit` clean. No runtime change. No test regression.

**Estimated effort:** ~1 session.

### Phase 2: Command Authority Field (GameState scaffolding)

**Scope:** Add `command_authority` to GameState. Initialize in scenario loader. No consumers yet.

**Files:**
- `src/state/game_state.ts` — add `command_authority` field to `MilitaryState`
- `src/scenario/scenario_loader.ts` — initialize to `{ current: 100, max: 100, spent_this_turn: 0, lifetime_spent: 0 }`
- `src/state/serializer.ts` — ensure new field survives save/load

**Deliverable:** Field exists, initializes, serializes. No consumers.

**Gate:** `tsc --noEmit` + `vitest run` + save/load round-trip test.

**Estimated effort:** ~1 session.

### Phase 3: Command Friction Log (wiring existing warlord friction)

**Scope:** Surface existing `friction_events` from `warlord_friction.ts` to the player.

**Files:**
- `src/state/game_state.ts` — add `command_friction_log` array type
- `src/sim/combat/warlord_friction.ts` — append to `command_friction_log` when friction fires
- `src/ui/map/data/GameStateAdapter.ts` — expose friction log to renderer
- `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx` — friction indicator (red/amber/green dot)

**Deliverable:** Player sees when warlord friction fires. No new friction mechanics — just visibility.

**Gate:** Smoke-test triad. Friction events visible in Army HQ after a 40w run.

**Estimated effort:** ~2 sessions.

### Phase 4: Delegation Summary in Commander Output

**Scope:** Enrich `CommanderOutput` with a `delegation_summary` that the CoS briefing can display.

**Files:**
- `src/sim/combat/commander/commander_state.ts` — add `delegation_summary` to `CommanderOutput`
- `src/sim/combat/commander/emit.ts` — populate delegation_summary from decisions made
- `src/ui/map/components/army_hq/ChiefOfStaffBriefing.tsx` — display delegation summary

**Deliverable:** CoS briefing shows what each corps decided without presidential input.

**Gate:** Smoke-test triad. Briefing text enriched in desktop app.

**Estimated effort:** ~2 sessions.

### Phase 5: Command Authority UI (PresidentialToolbar gauge)

**Scope:** Display command authority on the toolbar. No spend logic yet.

**Files:**
- `src/ui/map/components/PresidentialToolbar.tsx` — add authority gauge
- `src/ui/map/data/GameStateAdapter.ts` — expose command_authority to renderer

**Deliverable:** Player sees their command authority bar. It stays at 100 until Phase 6 wires spend logic.

**Gate:** Smoke-test triad. Gauge visible.

**Estimated effort:** ~1 session.

### Phase 6: Override Cost Prototype (force-launch only)

**Scope:** Wire command authority spend to one Level 3 action: `stageOperationForceLaunch`. Confirmation dialog shows cost.

**Files:**
- `src/desktop/electron-main.cjs` — deduct command_authority on force-launch
- `src/ui/map/components/OperationBriefingModal.tsx` — cost preview before force-launch
- `src/sim/turn_phases/war_phases.ts` — add `apply-override-costs` step (or inline in apply-player-orders)

**Deliverable:** Force-launching an operation costs command authority. Player sees cost before confirming.

**Gate:** Smoke-test triad. 40w run with force-launch shows authority deduction.

**Estimated effort:** ~2 sessions.

---

## 5. Relationship to Existing Plans

| Plan | Relationship |
|------|-------------|
| `2026-03-25-command-chain-architecture.md` | This plan implements the substrate that architecture spec assumes. Architecture spec Section 2 (political capital) is for the political leader bot (v0.8.2), not the player's command authority. |
| `2026-03-24-v081-order-interpretation-plan.md` | Order interpretation (v0.8.3) depends on Phase 1-2 from this plan. The `CommandLevel` tags and `command_authority` field must exist before interpretation can apply costs. |
| `2026-03-31-v083-player-command-review-ux-plan.md` | Command review UX depends on Phase 3-4 from this plan. Friction log and delegation summary must exist before the review surface can display them. |
| `2026-03-31-v08to09-commander-explanation-surfaces-plan.md` | Explanation surfaces consume the same delegation summary from Phase 4. |
| `2026-03-31-v08x-command-authority-cleanup-plan.md` | Authority cleanup removes competing ownership. This plan adds the command_authority data model that cleanup should preserve. |

**This plan does NOT supersede any existing plan.** It fills the gap beneath them — the data structures and tags they all implicitly assume exist.

---

## 6. Completion Checklist

- [ ] All IPC actions tagged with command level
- [ ] `command_authority` field on GameState, initialized, serialized
- [ ] `command_friction_log` wired from warlord_friction to Army HQ display
- [ ] Delegation summary in commander output, displayed in CoS briefing
- [ ] Command authority gauge on PresidentialToolbar
- [ ] Force-launch costs command authority with confirmation dialog
- [ ] Terminology table propagated to all plans touched
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated
- [ ] Implementation report in `docs/40_reports/implemented/`

---

## 7. Feature Done Means

**Canonical owner:** Presidential Command Doctrine (`docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md`)
**Demoted path:** Untagged player actions with no command level awareness; hidden warlord friction with no player visibility; silent delegation with no summary
**Player-visible truth:** The player sees their command authority, sees what corps decided without them, and sees friction when it occurs
**Canonical UI surface:** PresidentialToolbar for authority gauge; Army HQ for friction + delegation; Warroom for strategic priorities (future)
**Done means:** Every player action has a command level tag, command authority exists as a resource, friction is visible, delegation is narrated

# v0.8.3 Order Interpretation System -- Implementation Plan

**Date:** 2026-03-24
**Status:** DRAFT -- NOT STARTED
**Roadmap slot:** v0.8.3 (renumbered 2026-03-30; was v0.8.2)
**Gate:** v0.8.2 Political Leader Bot must be complete. Requires explicit army/corps coherence and a truthful player command review surface; do not execute this milestone on hidden ownership assumptions.
**Author:** Architect (Pyrrhic Games)
**Scope:** Officers interpret player orders through personality, creating friction between political intent and military execution
**Prerequisites:** Officer system (98 named officers, competence/aggressiveness 1-5), Operation Preparation System, Corps Directive pipeline
**Overseer:** Orchestrator
**Architect:** Technical Architect / Architect - flags architectural decisions for user review
**Primary implementer roles:** Gameplay Programmer, UI/UX Developer, Systems Programmer, QA Engineer
**Primary reviewer roles:** `/simplify`, Code Review, UI Truth Keeper, War-or-Game
**Sign-off:** Orchestrator, Architect, War-or-Game

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: Frustration is acceptable only when it is legible
- `docs/life_lessons.md`: Decisions without traces are undebuggable
- `docs/life_lessons.md`: Verify the actual code path you changed is the one being used

---

## 0. Problem Statement

Player orders are currently executed with perfect fidelity. When the player sets a corps to `offensive` stance, it goes to `offensive`. When the player launches an operation, it launches exactly as specified. This is ahistorical and mechanically flat.

In the Bosnian War, the chain from political leadership to field execution was deeply unreliable. Mladic routinely exceeded Karadzic's orders. Halilovic's Neretva '93 was a textbook case of high aggression outrunning competence. Dudakovic in the Bihac pocket operated semi-independently because he had to. HVO commanders answered to Zagreb as much as Mostar.

The Order Interpretation System introduces a deterministic layer between the player's intent and the simulation's execution. Officers filter, delay, modify, or refuse orders based on their `competence` and `aggressiveness` ratings. The player is the political leader -- they issue directives, not tactical instructions.

**Design philosophy:** Frustration is acceptable when it is legible. The player must always understand WHY an officer deviated. Pushback must create interesting decisions (fire the officer? work around him? change the order?) rather than feeling like input lag.

---

## 1. Design Decisions

### 1.1 Pushback is advisory, not blocking

Officer objections appear as a **notification event** (extending the existing `PendingOfficerEvent` system), not a modal popup. The player sees the objection, understands the officer's reasoning, and can:
- Accept the interpreted order (do nothing)
- Override the officer (force original order, with consequences)
- Reassign or fire the officer

**Rationale:** Blocking events break flow in a weekly-turn game. Advisory events let the player batch-review at their own pace while still surfacing the friction. CK3's council system is the model -- you see who objects and why, but the game doesn't freeze.

### 1.2 Deviation budget: visible, bounded, and predictable

Each officer has a deterministic **interpretation score** computed from personality + context. The player can preview how an officer will interpret an order BEFORE issuing it (tooltip on the order panel). No surprises -- just tradeoffs.

Maximum deviation is bounded:
- Stance can shift at most 1 step (offensive -> balanced, not offensive -> defensive)
- Operation objectives can be expanded by at most 2 bonus OSIDs (creative interpretation)
- Preparation time can be extended by at most 3 turns (cautious delay)
- Refusal only occurs under extreme personality-order mismatch (aggressiveness 1 ordered to offensive, or vice versa)

### 1.3 Officers can be relieved (fired) and replaced

When an officer pushes back, the player can **relieve** them. This:
- Triggers the existing succession system (`findBestReplacement` in `officer_system.ts`)
- Imposes a **transition penalty**: 4 turns of `acting_commander` status (0.92 modifier)
- Adds a `-0.5` morale hit to the corps (troops loyal to the fired commander)
- Records the event for AAR and Chronicle

**Historical basis:** Izetbegovic sacked Halilovic (replaced by Delic). Karadzic and Mladic had constant friction. Praljak replaced Stojic. These were costly but sometimes necessary decisions.

### 1.4 Interaction with existing systems

- **Operation Preparation System** (`operation_preparation.ts`): Interpretation happens BEFORE preparation begins. The op that enters the preparation pipeline is the *interpreted* op, not the player's raw order. This means the commander personality shapes both interpretation AND preparation tempo.
- **Corps Directives** (`bot_corps_directives.ts`): For the player faction, `generateCorpsDirectives` already skips (line 583: `if (cmd.ai_decided) continue`). Interpretation modifies the player-set values on `CorpsCommandState` before the brigade AI reads them.
- **Succession** (`processOfficerSuccession`): Relief uses the same pool as casualty replacement. No new succession code needed.
- **Pending Events** (`PendingOfficerEvent`): Extended with new event types for pushback/interpretation notifications.

---

## 2. Interpretation Model

### 2.1 Personality axes (existing data, 1-5 scale)

| Trait | Low (1-2) | Mid (3) | High (4-5) |
|-------|-----------|---------|------------|
| **competence** | Misinterprets, poor timing | Faithful but uninspired | Faithful AND adaptive |
| **aggressiveness** | Delays, inflates thresholds | Follows orders | Exceeds objectives, rushes prep |

### 2.2 Interpretation matrix

The system evaluates the **gap** between the officer's preferred behavior and the order received. Officer preferred stance is derived from aggressiveness:

```
preferred_stance(agg):
  agg >= 4 -> 'offensive'
  agg == 3 -> 'balanced'
  agg <= 2 -> 'defensive'
```

**Order-personality gap** = abs(stance_rank(order) - stance_rank(preferred)). Stance ranks: defensive=0, reorganize=0.5, balanced=1, offensive=2.

| Gap | Competence 1-2 | Competence 3 | Competence 4-5 |
|-----|----------------|--------------|----------------|
| 0 (aligned) | Faithful but sloppy (+1 prep turn) | Faithful | Faithful + bonus (small efficiency gain) |
| 1 (mild mismatch) | Partial compliance (shift 1 step toward preferred) | Faithful with grumbling (advisory event) | Creative interpretation (add bonus objectives OR tighten thresholds) |
| 2 (severe mismatch) | Refusal (reverts to preferred stance) | Partial compliance (shift 1 step toward preferred + advisory) | Pushback + modified compliance (follows order but modifies parameters) |

### 2.3 Specific interpretation behaviors

#### A. Corps Stance Interpretation

When the player changes a corps stance:

1. Compute `gap` between ordered stance and officer preferred stance
2. If gap == 0: apply as-is (no interpretation)
3. If gap == 1 and competence >= 3: apply as-is, emit advisory event if aggressiveness mismatch
4. If gap == 1 and competence < 3: 50% chance (deterministic hash) of shifting 1 step toward preferred
5. If gap == 2 and competence >= 4: apply as-is but modify `aggression_modifier` toward officer's preference (+/- 0.05)
6. If gap == 2 and competence < 4: shift 1 step toward preferred, emit pushback event
7. If gap == 2 and competence <= 2: full revert to officer preferred, emit refusal event

**Deterministic hash:** `officerHash(turn, officerId + ':stance:' + orderedStance)` -- reuses existing hash function.

#### B. Operation Launch Interpretation

When the player launches a corps operation:

1. **Cautious officer (aggressiveness 1-2):**
   - `preparation_max_turns` += (3 - aggressiveness) extra turns
   - `min_attack_outcome` raised by 1 tier (e.g. 'stalemate' -> 'costly_victory')
   - Advisory event: "General [name] requests additional preparation time"

2. **Aggressive officer (aggressiveness 4-5):**
   - May add 1-2 bonus objectives beyond player-specified targets (adjacent enemy OSIDs, sorted by weakness)
   - `min_attack_outcome` lowered by 1 tier (e.g. 'costly_victory' -> 'stalemate')
   - If player specified cautious tempo ('methodical'): officer may upgrade to 'standard'
   - Advisory event: "General [name] proposes expanding the offensive to include [OSID]"

3. **Incompetent officer (competence 1-2):**
   - 30% chance (deterministic hash) of wrong staging OSID (picks suboptimal adjacent OSID)
   - `force_ratio_estimate` accuracy degraded (existing system already handles this via competence in `estimateForceRatio`)
   - No advisory event (they don't know they're incompetent)

4. **Competent officer (competence 4-5):**
   - Automatically optimizes staging OSID (picks best adjacent friendly OSID by defensibility)
   - `getRequiredConfidence` and `getRequiredForceRatio` already use competence -- no change needed
   - Advisory event only if serious concerns: "General [name] recommends [alternative approach]"

#### C. Operation Halt Interpretation

When the player orders an operation halt:

1. **Aggressive officer (aggressiveness 4-5) with momentum >= 2:**
   - Officer requests 2 more turns before halting (pushback event)
   - If player overrides (`force_halt`): immediate halt but -10 morale penalty to participating brigades
   - If player accepts delay: operation continues 2 more turns, then halts

2. **Cautious officer (aggressiveness 1-2):**
   - Immediate compliance, `dig_in_on_halt` auto-enabled
   - Advisory: "General [name] has ordered all units to fortify positions"

#### D. Brigade Reassignment Interpretation

When the player moves a brigade between corps:

1. **Receiving corps commander** evaluates:
   - If aggressiveness high and corps is offensive: accepts eagerly (no delay)
   - If aggressiveness low and corps is defensive: 2-turn delay before brigade is integrated
   - If competence low: brigade may be assigned to wrong sector initially

2. **Losing corps commander** evaluates:
   - If the brigade is from a critical sector and commander has competence >= 3: pushback event
   - Otherwise: compliance

---

## 3. State Changes

### 3.1 New types (`src/state/officer_types.ts`)

```typescript
// Extend OfficerEventType
export type OfficerEventType =
  | 'officer_available'
  | 'replacement_suggested'
  | 'order_pushback'        // NEW: officer objects to order
  | 'order_modified'        // NEW: officer modified order parameters
  | 'order_refused'         // NEW: officer refuses order entirely
  | 'order_exceeded'        // NEW: officer expanded beyond order scope
  | 'officer_relieved';     // NEW: player fired officer

// Extend PendingOfficerEvent
export interface PendingOfficerEvent {
  event_id: string;
  type: OfficerEventType;
  faction: FactionId;
  turn: number;
  officer_id: string;
  current_commander_id?: string;
  corps_id?: string;
  acknowledged: boolean;

  // NEW fields for order interpretation events
  /** The original order the player issued. */
  original_order?: OrderSnapshot;
  /** What the officer actually did / proposes to do. */
  interpreted_order?: OrderSnapshot;
  /** Human-readable explanation of why the officer deviated. */
  reason?: string;
  /** Whether the player can override this interpretation. */
  overridable?: boolean;
  /** If overridable, the IPC action to call to force original order. */
  override_action?: string;
}

/** Snapshot of an order for before/after comparison. */
export interface OrderSnapshot {
  order_type: 'stance_change' | 'operation_launch' | 'operation_halt' | 'brigade_reassign';
  corps_id: string;
  /** For stance changes. */
  stance?: CorpsStance;
  /** For operations. */
  operation_name?: string;
  objectives?: string[];
  min_attack_outcome?: string;
  preparation_max_turns?: number;
  tempo?: string;
  staging_osid?: string;
  /** For halts. */
  delay_turns?: number;
}
```

### 3.2 New fields on `NamedOfficerState`

```typescript
export interface NamedOfficerState {
  // ... existing fields ...

  /** Number of times this officer's orders were overridden by the player. */
  override_count?: number;
  /** Turn when last overridden (for cooldown on pushback frequency). */
  last_override_turn?: number;
  /** If true, officer has been cowed by overrides and will comply without pushback for 8 turns. */
  cowed_until_turn?: number;
}
```

### 3.3 New fields on `CorpsCommandState`

```typescript
export interface CorpsCommandState {
  // ... existing fields ...

  /** Player's raw ordered stance before interpretation. Null if no player order this turn. */
  player_ordered_stance?: CorpsStance | null;
  /** If an operation halt is being delayed by officer pushback, turns remaining. */
  halt_delay_turns_remaining?: number;
}
```

---

## 4. New Module: `src/sim/combat/order_interpretation.ts`

Single file, ~400 lines. All interpretation logic lives here.

### 4.1 Exports

```typescript
/** Interpret a corps stance change order. Returns the effective stance after interpretation. */
export function interpretStanceOrder(
  state: GameState,
  corpsId: string,
  orderedStance: CorpsStance,
): InterpretationResult;

/** Interpret an operation launch order. Mutates the operation in-place. */
export function interpretOperationLaunch(
  state: GameState,
  corpsId: string,
  op: CorpsOperation,
): InterpretationResult;

/** Interpret an operation halt order. Returns whether halt is immediate or delayed. */
export function interpretOperationHalt(
  state: GameState,
  corpsId: string,
  op: CorpsOperation,
): InterpretationResult;

/** Preview how an officer will interpret an order (read-only, no state mutation). */
export function previewInterpretation(
  state: GameState,
  corpsId: string,
  orderType: OrderSnapshot['order_type'],
  params: Partial<OrderSnapshot>,
): InterpretationPreview;

/** Force the original order, overriding the officer's interpretation. */
export function overrideInterpretation(
  state: GameState,
  corpsId: string,
  eventId: string,
): void;

/** Relieve (fire) an officer and trigger succession. */
export function relieveOfficer(
  state: GameState,
  officerId: string,
  corpsId: string,
): ReliefResult;

export interface InterpretationResult {
  compliance: 'full' | 'modified' | 'partial' | 'refused';
  event?: PendingOfficerEvent;
  effective_stance?: CorpsStance;
  modifications?: string[];  // Human-readable list of changes
}

export interface InterpretationPreview {
  predicted_compliance: 'full' | 'modified' | 'partial' | 'refused';
  modifications: string[];
  officer_name: string;
  officer_competence: number;
  officer_aggressiveness: number;
}

export interface ReliefResult {
  relieved_officer_id: string;
  replacement_officer_id: string | null;
  transition_penalty_turns: number;
  morale_hit: number;
}
```

### 4.2 Internal: Interpretation scoring

```typescript
/** Deterministic interpretation score. Returns 0.0 (full refusal) to 1.0 (perfect compliance). */
function computeComplianceScore(
  competence: number,
  aggressiveness: number,
  orderStanceRank: number,
  preferredStanceRank: number,
): number {
  const gap = Math.abs(orderStanceRank - preferredStanceRank);
  if (gap === 0) return 1.0;

  // Base compliance from competence: comp 5 = 0.95, comp 1 = 0.55
  const baseCompliance = 0.45 + competence * 0.10;

  // Gap penalty: each step of mismatch costs 0.25
  const gapPenalty = gap * 0.25;

  return Math.max(0.0, Math.min(1.0, baseCompliance - gapPenalty));
}

// Thresholds:
// >= 0.80  -> full compliance
// >= 0.50  -> modified compliance (shift parameters but follow intent)
// >= 0.25  -> partial compliance (shift stance 1 step toward preferred)
// <  0.25  -> refusal (revert to preferred)
```

### 4.3 Cowed mechanic

After 2 consecutive overrides within 8 turns, an officer becomes "cowed" -- they comply fully for 8 turns but suffer -0.5 competence (demoralization, second-guessing). This prevents the player from just spam-overriding every deviation, but also models the historical dynamic where aggressive political override degraded military effectiveness.

### 4.4 Integration point: `electron-main.cjs`

The `stage-corps-stance-order` IPC handler (line 1087) currently writes stance directly:

```javascript
corpsCommand.stance = stance;
```

After v0.8.3, it becomes:

```javascript
// Store player's raw intent
corpsCommand.player_ordered_stance = stance;
// Run interpretation
const result = interpretStanceOrder(state, corpsId, stance);
corpsCommand.stance = result.effective_stance ?? stance;
// Emit event if interpretation diverged
if (result.event) {
  state.military.pending_officer_events.push(result.event);
}
```

Similarly for `stage-corps-operation-order` (line 1109) and `stage-operation-halt` (line 1259).

---

## 5. New IPC Handlers

### 5.1 `override-officer-interpretation`

```javascript
ipcMain.handle('override-officer-interpretation', async (_event, payload) => {
  // payload: { corpsId, eventId }
  // Forces original order, applies override consequences
});
```

### 5.2 `relieve-officer`

```javascript
ipcMain.handle('relieve-officer', async (_event, payload) => {
  // payload: { officerId, corpsId }
  // Fires officer, triggers succession, applies morale hit
});
```

### 5.3 `preview-order-interpretation`

```javascript
ipcMain.handle('preview-order-interpretation', async (_event, payload) => {
  // payload: { corpsId, orderType, params }
  // Returns read-only preview of how officer will interpret order
  // Used by UI to show tooltip BEFORE player commits
});
```

---

## 6. UI Changes

### 6.1 Order Preview Tooltip

When the player hovers over a stance button or operation launch button, a tooltip shows:

```
Commander: Gen. Mladic (comp: 4, agg: 5)
Your order: Defensive stance
His interpretation: Balanced stance (MODIFIED)
Reason: "Mladic considers a purely defensive posture
unacceptable while VRS holds initiative"
```

**File:** `src/ui/map/components/OOBSidebar.tsx` -- add tooltip to stance selector.

### 6.2 Interpretation Notification Panel

Extend the existing `PendingOfficerEvent` display (currently shows officer arrivals and replacement suggestions) to show interpretation events. Each event card shows:
- Officer portrait + name
- Original order vs interpreted order (side by side)
- Reason text
- Two buttons: "Accept" (acknowledge) and "Override" (force + consequences)
- Third button: "Relieve Officer" (fire + succession)

**File:** New component `src/ui/map/components/OrderInterpretationPanel.tsx`, integrated into the existing briefing/notification flow.

### 6.3 Officer Personality Indicator

On the corps entry in OOB sidebar, show a small icon indicating the officer's interpretation tendency:
- Shield icon (defensive-leaning, aggressiveness 1-2)
- Balanced icon (aggressiveness 3)
- Sword icon (aggressive-leaning, aggressiveness 4-5)
- Warning triangle if officer is cowed

**File:** `src/ui/map/components/OOBSidebar.tsx`

---

## 7. Pipeline Integration

### 7.1 Turn phase placement

Interpretation runs at order-staging time (between turns, when player issues commands via IPC), NOT during the turn pipeline. This is important: the player sees the interpretation result immediately and can react before advancing the turn.

The turn pipeline does need one new step:

```
Step: 'decay-officer-interpretation-state'
Position: After 'process-officer-succession' (existing step)
Logic:
  - Decrement cowed_until_turn counters
  - Decrement halt_delay_turns_remaining
  - If halt_delay_turns_remaining reaches 0, force the delayed halt
  - Clear player_ordered_stance (consumed)
```

### 7.2 Bot faction behavior

Bot factions are **not affected** by this system. Their orders flow through `generateCorpsDirectives` which already accounts for officer personality via `getActiveDoctrinePhase`, `getCorpsCommanderAttackMod`, and the operation preparation system. Adding interpretation to bots would be invisible to the player and add complexity without gameplay value.

---

## 8. Test Plan

### 8.1 Unit tests (`src/sim/combat/__tests__/order_interpretation.test.ts`)

| # | Test | Expected |
|---|------|----------|
| 1 | Aligned order (agg=4, stance=offensive) | Full compliance, no event |
| 2 | Mild mismatch, high competence (comp=4, agg=4, stance=defensive) | Modified compliance, advisory event |
| 3 | Severe mismatch, low competence (comp=2, agg=1, stance=offensive) | Refusal, revert to defensive |
| 4 | Override pushback event | Original order restored, override_count++ |
| 5 | Relieve officer | Succession triggered, acting_commander, morale hit |
| 6 | Cowed mechanic (2 overrides in 8 turns) | Officer complies for 8 turns, comp -0.5 |
| 7 | Operation launch, cautious officer | Extra prep turns, raised min_attack_outcome |
| 8 | Operation launch, aggressive officer | Bonus objectives added |
| 9 | Operation halt, aggressive officer with momentum | 2-turn delay pushback |
| 10 | Preview function matches actual interpretation | previewInterpretation == interpretStanceOrder result |
| 11 | Determinism: same inputs produce same outputs | Run twice, assert identical |
| 12 | Officer with cowed_until_turn complies fully | No deviation during cowed period |
| 13 | Enclave officer (Dudakovic, Oric) interprets normally | Enclave lock does not affect interpretation |
| 14 | Acting commander interprets faithfully | Acting commanders always comply (too new to push back) |
| 15 | PatronDirective stance_ceiling interacts with interpretation | Officer cannot interpret above ceiling |

### 8.2 Integration tests

| # | Test | Expected |
|---|------|----------|
| 1 | Full 40w scenario with player faction RS | No crash, events generated, stance modifications visible |
| 2 | Mladic (agg=5) ordered to defensive | Pushback event, stance modified to balanced |
| 3 | Karavelic (agg=2) ordered to offensive | Pushback event, stance modified to balanced |
| 4 | Override + relieve + succession | Full cycle works, new commander faithfully executes |

### 8.3 Calibration impact

This system ONLY affects the player faction. Bot factions are unaffected. Therefore:
- **No calibration regression possible** for headless scenario runs (no player faction)
- Interactive play calibration may shift slightly, but interpretation is bounded (max 1 stance step)

---

## 9. Implementation Sequence

### Phase 1: Core interpretation engine (2-3 sessions)
**Assigned to:** Gameplay Programmer + Systems Programmer  
**Reviewer:** `/simplify`, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game

1. **Task 1.1:** Add new types to `officer_types.ts` (OrderSnapshot, extended OfficerEventType, extended PendingOfficerEvent)
2. **Task 1.2:** Add new fields to `NamedOfficerState` (override_count, last_override_turn, cowed_until_turn)
3. **Task 1.3:** Add new fields to `CorpsCommandState` (player_ordered_stance, halt_delay_turns_remaining)
4. **Task 1.4:** Create `src/sim/combat/order_interpretation.ts` with all 6 exported functions
5. **Task 1.5:** Write unit tests (15 tests from section 8.1)
6. **Task 1.6:** Typecheck + test pass

### Phase 2: IPC wiring (1 session)
**Assigned to:** Systems Programmer  
**Reviewer:** `/simplify`, Code Review  
**Sign-off:** Orchestrator, Architect

7. **Task 2.1:** Modify `stage-corps-stance-order` in `electron-main.cjs` to call `interpretStanceOrder`
8. **Task 2.2:** Modify `stage-corps-operation-order` to call `interpretOperationLaunch`
9. **Task 2.3:** Modify `stage-operation-halt` to call `interpretOperationHalt`
10. **Task 2.4:** Add `override-officer-interpretation` IPC handler
11. **Task 2.5:** Add `relieve-officer` IPC handler
12. **Task 2.6:** Add `preview-order-interpretation` IPC handler

### Phase 3: Pipeline step (1 session)
**Assigned to:** Systems Programmer + Gameplay Programmer  
**Reviewer:** `/simplify`, Code Review, War-or-Game  
**Sign-off:** Orchestrator, Architect, War-or-Game

13. **Task 3.1:** Add `decay-officer-interpretation-state` step to `war_phases.ts`
14. **Task 3.2:** Wire delayed halt resolution into pipeline
15. **Task 3.3:** Integration test: 40w run with player faction

### Phase 4: UI (2 sessions)
**Assigned to:** UI/UX Developer + Gameplay Programmer  
**Reviewer:** `/simplify`, UI Truth Keeper, Modern Wargame Expert  
**Sign-off:** Orchestrator, Architect

16. **Task 4.1:** Add interpretation preview tooltip to OOBSidebar stance buttons
17. **Task 4.2:** Create `OrderInterpretationPanel.tsx` component
18. **Task 4.3:** Add officer personality indicator icons to OOB sidebar
19. **Task 4.4:** Wire "Override" and "Relieve" buttons to IPC handlers
20. **Task 4.5:** Add interpretation events to briefing/notification flow

### Phase 5: Polish (1 session)
**Assigned to:** UI/UX Developer + QA Engineer  
**Reviewer:** `/simplify`, UI Truth Keeper  
**Sign-off:** Orchestrator, Architect, War-or-Game

21. **Task 5.1:** Historical flavor text for specific officers (Mladic, Dudakovic, Halilovic, etc.)
22. **Task 5.2:** Smoke-test triad: `tsc --noEmit` + `vitest run` + `desktop:map:build`
23. **Task 5.3:** Interactive playtest: play 20 turns as each faction, verify interpretation feels right

---

## 10. Constants (tuning knobs)

All constants live in `order_interpretation.ts`:

```typescript
/** Compliance score thresholds. */
const FULL_COMPLIANCE_THRESHOLD = 0.80;
const MODIFIED_COMPLIANCE_THRESHOLD = 0.50;
const PARTIAL_COMPLIANCE_THRESHOLD = 0.25;
// Below 0.25 = refusal

/** Maximum stance shift from interpretation (steps). */
const MAX_STANCE_SHIFT = 1;

/** Extra preparation turns for cautious officers. */
const CAUTIOUS_EXTRA_PREP_TURNS = [0, 3, 2, 0, 0, 0]; // indexed by aggressiveness 0-5

/** Max bonus objectives aggressive officers can add. */
const MAX_BONUS_OBJECTIVES = 2;

/** Turns of delayed halt for aggressive officers. */
const AGGRESSIVE_HALT_DELAY = 2;

/** Momentum threshold to trigger halt delay. */
const HALT_DELAY_MOMENTUM_THRESHOLD = 2;

/** Consecutive overrides before officer becomes cowed. */
const COWED_OVERRIDE_THRESHOLD = 2;
/** Override window (turns) for counting consecutive overrides. */
const COWED_OVERRIDE_WINDOW = 8;
/** Turns officer is cowed after threshold. */
const COWED_DURATION = 8;
/** Competence penalty while cowed. */
const COWED_COMPETENCE_PENALTY = 0.5;

/** Morale hit when relieving an officer. */
const RELIEF_MORALE_PENALTY = -10;
/** Acting commander duration after relief. */
const RELIEF_ACTING_DURATION = 4;

/** Morale hit when force-overriding a halt delay. */
const FORCE_HALT_MORALE_PENALTY = -10;
```

---

## 11. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Player frustration from losing control | High | Preview tooltip shows interpretation before committing. Max 1 stance step shift. Clear UI explains WHY. |
| Determinism violation | Critical | All interpretation uses `officerHash()` (existing deterministic hash). No Math.random(). |
| Calibration regression | Medium | System only affects player faction. Headless scenarios unaffected. |
| Complexity creep | Medium | Single file, bounded constants. No recursive interpretation (officer interprets once, that's final). |
| Acting commanders always comply | Low | By design -- they're too new to push back. Prevents new-officer-pushback loops. |
| Enclave officers have limited context | Low | Enclave officers interpret normally -- their isolation is already modeled by enclave_lock. |

---

## 12. Future Extensions (NOT in v0.8.3)

- **Command autonomy slider** (backlog item from MEMORY.md): Player sets how much latitude officers get. Full autonomy = no interpretation, officers execute exactly. Low autonomy = interpretation system active. Could be per-corps or faction-wide.
- **Officer relationships**: Officers who like each other cooperate; feuding officers (Halilovic vs Delic) create cross-corps friction. Requires relationship graph.
- **Patron state interference**: Zagreb overriding HVO corps commanders directly (PatronDirective already exists as a type). Serbian Ministry of Defense overriding VRS field decisions.
- **Insubordination escalation**: Repeated refusals by the same officer should trigger a political event (loss of authority, faction cohesion hit).
- **Operation modification during execution**: Currently, interpretation only happens at order time. An aggressive commander might modify objectives MID-operation if he sees an opportunity.

---

## 13. Files Modified

| File | Change |
|------|--------|
| `src/state/officer_types.ts` | Extend OfficerEventType, PendingOfficerEvent, add OrderSnapshot |
| `src/state/game_state.ts` | Add fields to NamedOfficerState, CorpsCommandState |
| `src/sim/combat/order_interpretation.ts` | **NEW** -- core interpretation engine |
| `src/sim/combat/officer_system.ts` | Add `relieveOfficer` helper (or call from order_interpretation) |
| `src/sim/turn_phases/war_phases.ts` | Add `decay-officer-interpretation-state` step |
| `src/desktop/electron-main.cjs` | Modify 3 IPC handlers, add 3 new IPC handlers |
| `src/ui/map/components/OOBSidebar.tsx` | Preview tooltip, personality icons |
| `src/ui/map/components/OrderInterpretationPanel.tsx` | **NEW** -- notification panel |
| `src/sim/combat/__tests__/order_interpretation.test.ts` | **NEW** -- 15 unit tests |

---

## 14. Success Criteria

1. Playing as RBiH and ordering 1st Corps (Sarajevo, Talijan/Karavelic) to `offensive`: cautious Karavelic (agg=2) pushes back, suggesting `balanced`. Player sees clear notification.
2. Playing as RS and ordering any corps to `defensive` while Mladic (agg=5) is army commander: advisory event noting Mladic's displeasure (but army commander does not directly block corps stance -- he's not the corps commander).
3. Relieving an officer triggers visible succession, acting commander penalty, and morale hit.
4. Preview tooltip correctly predicts interpretation outcome before player commits.
5. All 15 unit tests pass. Typecheck clean. No calibration regression on headless 40w run.
6. System adds meaningful decisions without feeling like input lag.

## Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect flags any new state fields, IPC, or player-command data-flow changes for user review
- [ ] `.claude/napkin.md` read at session start and updated during work
- [ ] `docs/life_lessons.md` scanned before each phase
- [ ] smoke-test triad runs after every phase
- [ ] engine and UI changes stay in separate commits unless explicitly justified
- [ ] `/create-report` writes a completion report to `docs/40_reports/implemented/` when the milestone closes

## Completion Checklist

- [ ] completion report created in `docs/40_reports/implemented/`
- [ ] `docs/plans/MASTER_ROADMAP.md` updated if scope/gates/status changed
- [ ] `docs/plans/2026-03-31-v083-player-command-review-ux-plan.md` remains aligned with the implemented review surface
- [ ] `docs/plans/2026-03-31-v08to09-army-corps-authority-coherence-plan.md` remains aligned with the implemented command handshake
- [ ] `docs/plans/2026-03-31-v08to09-commander-explanation-surfaces-plan.md` remains aligned with the explanation payload actually exposed
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated with recurring order-interpretation lessons
- [ ] relevant engineering docs updated if command flow or IPC changed materially
- [ ] `package.json` version bumped when the milestone completes
- [ ] version tag created and pushed when the milestone completes

## Companion Plans

- `docs/plans/2026-03-31-v083-player-command-review-ux-plan.md`
- `docs/plans/2026-03-31-v08to09-army-corps-authority-coherence-plan.md`
- `docs/plans/2026-03-31-v08to09-commander-explanation-surfaces-plan.md`

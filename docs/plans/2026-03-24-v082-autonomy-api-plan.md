# v0.8.4 — Autonomy Depth + Claude API Integration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Roadmap slot:** v0.8.4 (renumbered 2026-03-30; was v0.8.3)
**Gate:** LLM integration sits on top of cleaned command ownership, not underneath it.
**Goal:** Let the player choose how much to delegate. At any autonomy level, the player can grab the wheel for specific decisions. Claude API replaces the formula bot at the political leader level for non-player factions (and optionally for the player's own faction at higher delegation levels).

**Depends on:** v0.8.2 (political bot) and v0.8.3 (order interpretation). Both must ship first — this plan layers on top.

**Tech Stack:** TypeScript (sim engine + Electron IPC). Vitest for tests. `@anthropic-ai/sdk` (already integrated).

**Audit date:** 2026-03-24. Infrastructure surveyed: 16 modules in `src/sim/ai_commander/`, 4 pipeline steps in `war_phases.ts` (ai-army-decisions, ai-corps-decisions, ai-corps-dialogue, ai-war-dispatches), event decision system (`evaluate_events.ts` + `bot_response.ts`), IPC layer (`electron-main.cjs` + `preload.cjs`).

---

## Design Decisions

### 1. Determinism with Claude API

**Decision: Replay log with cached responses. Accept non-determinism on first play; enforce determinism on replay.**

Rationale:
- The `decision_log.ts` infrastructure already exists. `logDecision()` stores every AI response in `state.military.ai_decision_log`. `getLoggedDecision()` checks the log before making API calls.
- On first play, Claude API responses are non-deterministic (temperature=0 helps but does not guarantee identical outputs). This is acceptable — the player chose to involve AI.
- On replay (loading a save), the logged decisions replay deterministically. No API calls needed.
- Save files become the source of truth. A save from an AI-assisted game is fully replayable without API access.
- Headless scenario runner (calibration, tests) NEVER uses Claude API — always formula bot. The `mode: 'cadet'` default in `AI_DEFAULTS` already enforces this.

**Implication:** No seed-based determinism needed. No new infrastructure. The existing log is sufficient.

### 2. Autonomy as Discrete Levels (not a slider)

**Decision: Four discrete levels, not a continuous slider.**

| Level | Name | Player Handles | AI Handles |
|-------|------|----------------|------------|
| 0 | **Full Control** | Everything | Nothing (current behavior) |
| 1 | **Strategic** | Political events + corps stances + operation approval | Sector stances, brigade movement, operation execution |
| 2 | **Political** | Political events + diplomacy + peace plans | All military (army + corps + brigades) |
| 3 | **Observer** | Nothing (watch mode) | Everything including political events |

Rationale:
- A slider implies fine-grained tuning that the system cannot actually deliver. The command chain has natural boundaries (political / army / corps / brigade) — discrete levels map directly to these.
- Four levels is the minimum useful set. Fewer conflates distinct decision types; more creates false granularity.
- The existing `AiCommanderMode` (`commander`/`officer`/`recruit`/`cadet`) controls MODEL SELECTION, not autonomy. These are orthogonal: autonomy controls WHAT the AI decides; mode controls HOW WELL it decides (which model). Both settings coexist.

### 3. Mid-Game Autonomy Changes

**Decision: Yes, the player can change autonomy at any time, with a one-turn delay.**

- Changing autonomy takes effect next turn (not mid-turn). This prevents exploits where the player delegates, sees the AI's plan, then takes back control to override only the bad parts.
- Stored on `state.meta.autonomy_level` (current) and `state.meta.autonomy_level_pending` (queued).
- UI shows both: "Current: Strategic. Queued: Full Control (takes effect next turn)."

### 4. Override ("Grab the Wheel")

**Decision: The player can override any specific decision at any autonomy level, but it costs a turn of delay at that level.**

- At Level 1 (Strategic): AI proposes sector stances and brigade movements. Player sees proposals in the HQ Nerve Center. Player can accept all, or override specific sectors/brigades. Overridden decisions apply immediately; non-overridden ones use AI proposals.
- At Level 2 (Political): AI proposes army-level directives. Player sees them as a briefing. Player can override specific corps stances or operation approvals.
- At Level 3 (Observer): Player can pause and take over any single decision. This increments an "interventions" counter visible in the Wrapped summary.
- Override does NOT change the autonomy level. It is a per-decision escape hatch.

### 5. Minimum Viable API Integration

**Decision: Political leader prompt + event decisions only. No new models, no new API calls for corps/brigade level.**

The existing infrastructure already handles corps-level and army-level AI decisions via `generateArmyDecision` and `generateCorpsDecisions`. The MVP for v0.8.2 adds:

1. **Political leader prompt** — a new prompt type for the player's own faction when autonomy >= 2. Uses the existing `buildArmyPrompt` as a base but adds political framing (Izetbegovic/Karadzic/Boban personality).
2. **Event decision routing** — when autonomy >= 3 (Observer), the player's faction's events go through `generateEventDecision` instead of queuing as `PendingEventDecision`.
3. **Model routing** — political decisions use Sonnet for major events (flagged via `requires_player_response: true`) and Haiku for minor events. No Opus needed at this layer.

---

## Architecture

### New State Fields

```typescript
// On MetaState (src/state/game_state.ts)
autonomy_level: 0 | 1 | 2 | 3;          // Current autonomy level
autonomy_level_pending?: 0 | 1 | 2 | 3;  // Queued change (takes effect next turn)
autonomy_overrides?: AutonomyOverride[];  // Per-decision overrides this turn

// New type
interface AutonomyOverride {
    turn: number;
    level: 'army' | 'corps' | 'event';
    target_id: string;  // corps_id, event_id, or 'army'
    faction: FactionId;
}
```

### New Module: `src/sim/ai_commander/political_leader_ai.ts`

The political leader is NOT the same as the army commander. The army commander handles military strategy (corps stances, operation approval). The political leader handles:
- Event decisions (accept/reject peace plans, respond to international pressure)
- Alliance management (HRHB-RBiH alliance slider)
- War crimes policy (escalate/restrain)
- Negotiation posture

This module builds prompts specific to the political layer, with personality profiles for Izetbegovic (RBiH), Karadzic (RS), and Boban/Zubak (HRHB).

### Decision Flow by Autonomy Level

```
Turn Start
  |
  v
Apply pending autonomy change (if any)
  |
  v
Evaluate events
  |--- Level 0-2: Player faction events -> PendingEventDecision (player decides)
  |--- Level 3:   Player faction events -> generateEventDecision() via Claude API
  |
  v
AI Army Decisions (bot factions — unchanged)
  |
  v
Player faction army decisions
  |--- Level 0:   Player decides everything (current behavior)
  |--- Level 1:   Player sets corps stances + approves ops; AI fills details
  |--- Level 2-3: generateArmyDecision() via Claude API for player faction
  |
  v
AI Corps Decisions (bot factions — unchanged)
  |
  v
Player faction corps decisions
  |--- Level 0-1: Formula bot (Level 0) or AI proposals shown to player (Level 1)
  |--- Level 2-3: generateCorpsDecisions() via Claude API for player faction
  |
  v
Bot brigade orders (all factions — unchanged, formula bot always)
```

### IPC Changes

New IPC channels in `electron-main.cjs`:
- `set-autonomy-level` — queue autonomy change
- `get-ai-proposals` — fetch AI proposals for current turn (Level 1 review)
- `override-ai-decision` — player overrides a specific AI decision
- `get-autonomy-state` — current level + pending + override count

---

## Implementation Phases

### Phase A: State + Autonomy Skeleton (no API calls)

**Estimated effort:** 1 session

#### Task A1: Add autonomy state fields to GameState

**Files:**
- Modify: `src/state/game_state.ts`
- Test: `tests/autonomy_state.test.ts` (new)

Add `autonomy_level`, `autonomy_level_pending`, and `autonomy_overrides` to `MetaState`. Default `autonomy_level: 0` (Full Control — backward compatible). Add `AutonomyOverride` type.

**Verification:** `npx tsc --noEmit` clean. Existing tests pass (no behavioral change at level 0).

#### Task A2: Autonomy transition pipeline step

**Files:**
- Modify: `src/sim/turn_phases/war_phases.ts`
- Test: `tests/autonomy_transition.test.ts` (new)

Add `apply-autonomy-transition` step early in the pipeline (before `ai-army-decisions`). If `autonomy_level_pending` is set, copy it to `autonomy_level` and clear `_pending`. Clear `autonomy_overrides` from previous turn.

**Verification:** Test: set pending=2, run step, verify level=2 and pending=undefined.

#### Task A3: Autonomy-aware event routing

**Files:**
- Modify: `src/sim/events/evaluate_events.ts`

Currently, events for `playerFaction` always queue as `PendingEventDecision`. Change: if `autonomy_level === 3`, route through bot auto-response path instead (using `pickBotResponseV1` for now — Claude API comes in Phase C).

**Verification:** Test: Observer mode, event fires, no PendingEventDecision created, bot response applied.

#### Task A4: Autonomy-aware army decision routing

**Files:**
- Modify: `src/sim/turn_phases/war_phases.ts` (the `ai-army-decisions` step)

Currently, `ai-army-decisions` skips the player faction. Change: if `autonomy_level >= 2`, include the player faction in the bot-factions list for AI army decisions.

**Verification:** Test: Level 2, player faction gets AI army decision generated (formula bot fallback since no API key).

---

### Phase B: Override System (grab the wheel)

**Estimated effort:** 1 session

#### Task B1: Override data model and application

**Files:**
- New: `src/sim/ai_commander/autonomy_overrides.ts`
- Test: `tests/autonomy_overrides.test.ts` (new)

Functions:
- `registerOverride(state, override)` — push to `state.meta.autonomy_overrides`
- `hasOverride(state, level, targetId, faction)` — check if player overrode this decision
- `getOverriddenDecision(state, level, targetId)` — retrieve the player's override value
- `applyOverrides(state, aiDecisions)` — merge player overrides into AI decisions

**Verification:** Unit tests for register, check, merge. AI decision with 3 corps directives, player overrides 1 — merged result has 2 AI + 1 player.

#### Task B2: IPC for overrides

**Files:**
- Modify: `src/desktop/electron-main.cjs`
- Modify: `src/desktop/preload.cjs`

New IPC handlers:
- `set-autonomy-level`: validate 0-3, set `autonomy_level_pending`
- `override-ai-decision`: validate target, call `registerOverride`
- `get-autonomy-state`: return `{ level, pending, overrides_this_turn }`

**Verification:** Manual test via Electron console. `window.awwv.setAutonomyLevel(2)` -> verify state change next turn.

#### Task B3: AI proposal review at Level 1

**Files:**
- Modify: `src/sim/turn_phases/war_phases.ts`

At Level 1 (Strategic), the AI generates corps-level decisions for the player faction but stores them as "proposals" rather than applying them. The player reviews proposals via UI (Phase D) and can accept/override.

New state field: `state.military.ai_proposals?: Record<string, CorpsDecision>`. Populated by corps decision step when autonomy=1. Applied after player review (or auto-applied if player advances turn without reviewing).

**Verification:** Level 1, AI proposals stored on state, not applied until turn advance.

---

### Phase C: Claude API at Political Level

**Estimated effort:** 2 sessions

#### Task C1: Political leader personality profiles

**Files:**
- New: `src/sim/ai_commander/political_leader_profiles.ts`
- Test: `tests/political_leader_profiles.test.ts` (new)

Three profiles:

**Alija Izetbegovic (RBiH):**
- Prioritizes international legitimacy and multi-ethnic state
- Cautious on military escalation, strong on humanitarian appeals
- Treats enclaves as symbols of sovereignty, not just military positions
- Responds to peace plans based on territorial fairness + state structure

**Radovan Karadzic (RS):**
- Prioritizes territorial consolidation and ethnic separation
- Dismissive of international pressure until cornered
- Views military advantage as negotiating leverage
- Responds to peace plans based on territorial percentage + entity autonomy

**Mate Boban / Kresimir Zubak (HRHB):**
- Follows Zagreb's lead on major decisions
- Balances Croatian national interest with alliance management
- Pragmatic: accepts deals that secure Herzegovina
- Switches from Boban to Zubak after Washington Agreement (turn-dependent)

Each profile is a system prompt string (300-500 tokens). Exported as `getPoliticalLeaderProfile(faction, turn)`.

**Verification:** Snapshot tests for each faction's system prompt at different turns.

#### Task C2: Political leader prompt builder

**Files:**
- New: `src/sim/ai_commander/political_leader_ai.ts`
- Test: `tests/political_leader_ai.test.ts` (new)

`buildPoliticalLeaderPrompt(state, faction)` — returns `AiPrompt`. Context includes:
- Current political situation (territory %, alliance value, patron pressure)
- Pending decisions (peace plans, event responses)
- Strategic dimensions (6 dimensions with effective values)
- Recent events (last 8 fired)
- Active constraints (doctrine overrides, operation blocks)
- Negotiation capital breakdown

Output schema: same as `ArmyDecision` but with added `event_responses: Record<string, string>` for pending events.

Model routing: Sonnet for decisions where `requires_player_response: true`, Haiku otherwise. Add `political` slot to `MODEL_ROUTING`.

**Verification:** Test: build prompt, verify all context sections present, verify model selection.

#### Task C3: Event decision via Claude API

**Files:**
- Modify: `src/sim/events/evaluate_events.ts`
- Modify: `src/sim/ai_commander/event_decision_ai.ts`

When `autonomy_level === 3` and AI client is available, route player faction events through `generateEventDecision()` instead of `pickBotResponseV1()`. The existing `event_decision_ai.ts` already supports this — it just needs to be called.

Change in `evaluateEvents()`:
```typescript
if (playerFaction && autonomyLevel >= 3 && aiClient) {
    const chosen = await generateEventDecision(state, playerFaction, def, aiClient);
    if (chosen) {
        applyEventEffects(state, chosen.effects);
    } else {
        // Fallback: pickBotResponseV1
        const fallback = pickBotResponseV1(def.response_options, def.bot_response_logic, DEFAULT_BOT_COMMANDER);
        applyEventEffects(state, fallback.effects);
    }
} else if (playerFaction) {
    // Level 0-2: queue for player
    state.military.pending_event_decisions.push(...);
}
```

**Problem:** `evaluateEvents` is currently synchronous. `generateEventDecision` is async.

**Solution:** Make `evaluateEvents` async. It is called from a pipeline step (`evaluate-game-events`) which already supports async `run` functions. Grep for all callers and update signatures. Most callers are tests that can be made async trivially.

**Verification:** Test: Observer mode + mock AI client, event fires, AI response applied, no PendingEventDecision. Test: Observer mode + null client, falls back to formula bot.

#### Task C4: Decision log for political decisions

**Files:**
- Modify: `src/sim/ai_commander/decision_log.ts`
- Modify: `src/sim/ai_commander/ai_types.ts`

Add `level: 'political'` to `CommandDecisionLogEntry`. Add `PoliticalDecision` type:

```typescript
interface PoliticalDecision {
    faction: FactionId;
    turn: number;
    event_responses: Record<string, { choice: string; reasoning: string }>;
    peace_plan_response?: 'accept' | 'reject' | null;
    alliance_posture?: 'maintain' | 'distance' | 'break';
    reasoning: string;
}
```

Log all political AI decisions for replay determinism.

**Verification:** Test: generate political decision, verify logged. Load save, verify logged decision replayed without API call.

---

### Phase D: UI Integration

**Estimated effort:** 2 sessions

#### Task D1: Autonomy selector in Settings/HQ

**Files:**
- Modify: `src/ui/map/components/army_hq/` (appropriate panel)
- Modify: `src/desktop/preload.cjs` (expose IPC)

Four-button selector (not a slider). Current level highlighted. Pending change shown with "(next turn)" badge. Cost display: "Level 2-3 require Claude API key."

API key input field (masked, stored in Electron `safeStorage` — never in save files).

#### Task D2: AI proposal review panel (Level 1)

**Files:**
- New: `src/ui/map/components/army_hq/AiProposalReview.tsx`

Shows AI-generated corps directives and sector stances as a list. Each row has "Accept" / "Override" toggle. Override opens an inline editor (stance dropdown, target text field). "Accept All" and "Override All" bulk buttons. Auto-accepts on turn advance if player doesn't review.

#### Task D3: Observer mode HQ overlay

**Files:**
- New: `src/ui/map/components/army_hq/ObserverOverlay.tsx`

At Level 3, the HQ shows:
- "OBSERVER MODE" header badge
- AI decision log for this turn (army decisions, event responses, corps dialogue)
- "Intervene" button that drops to Level 0 for one turn
- Intervention counter (for Wrapped summary)

#### Task D4: Briefing text integration

The AI army decision already includes `briefing_text` (in-character, 2-3 sentences). At Levels 2-3, display this as the primary HQ narrative for the player's faction. At Level 1, display it as "Your commander recommends..." alongside the proposal review.

---

### Phase E: Testing + Polish

**Estimated effort:** 1 session

#### Task E1: Integration tests

Full pipeline tests for each autonomy level:
- Level 0: identical to current behavior (regression test)
- Level 1: proposals generated, overrides applied, non-overridden proposals auto-applied
- Level 2: player faction gets AI army decisions, events still queued for player
- Level 3: full AI play, events auto-responded, decisions logged for replay

#### Task E2: Replay determinism verification

Load a save from an AI-assisted game. Replay 10 turns. Verify identical state hash at each turn. Verify zero API calls during replay.

#### Task E3: Cost tracking

`AiCommanderConfig.session_cost_estimate` already exists. Populate it:
- Haiku: ~$0.001/call (event decisions, routine corps)
- Sonnet: ~$0.003/call (major events, political decisions)
- Display running cost in Settings panel: "This session: ~$0.12 (23 API calls)"

#### Task E4: Graceful degradation

- No API key: Levels 2-3 fall back to formula bot with a yellow warning badge
- API error: Log, fall back to formula bot for that specific decision, continue
- Rate limit: Queue decisions, process on next available slot
- Offline: All levels work offline (Level 0-1 need no API; Level 2-3 fall back to formula bot)

---

## File Inventory

### New Files (7)
| File | Purpose |
|------|---------|
| `src/sim/ai_commander/political_leader_profiles.ts` | Personality prompts for Izetbegovic/Karadzic/Boban |
| `src/sim/ai_commander/political_leader_ai.ts` | Political leader decision generation |
| `src/sim/ai_commander/autonomy_overrides.ts` | Override registration, checking, merging |
| `src/ui/map/components/army_hq/AiProposalReview.tsx` | Level 1 proposal review panel |
| `src/ui/map/components/army_hq/ObserverOverlay.tsx` | Level 3 observer HQ overlay |
| `tests/autonomy_state.test.ts` | State field tests |
| `tests/political_leader_ai.test.ts` | Political leader prompt + decision tests |

### Modified Files (9)
| File | Change |
|------|--------|
| `src/state/game_state.ts` | Add autonomy fields to MetaState |
| `src/sim/turn_phases/war_phases.ts` | Autonomy transition step + routing changes |
| `src/sim/events/evaluate_events.ts` | Async + autonomy-aware event routing |
| `src/sim/ai_commander/ai_config.ts` | Add `political` to MODEL_ROUTING |
| `src/sim/ai_commander/ai_types.ts` | Add PoliticalDecision type |
| `src/sim/ai_commander/decision_log.ts` | Add 'political' level |
| `src/sim/ai_commander/event_decision_ai.ts` | Enhanced model routing for major events |
| `src/desktop/electron-main.cjs` | New IPC handlers |
| `src/desktop/preload.cjs` | Expose new IPC channels |

### Untouched (critical)
| File | Why untouched |
|------|---------------|
| `src/sim/combat/bot_strategy.ts` | Formula bot unchanged — autonomy layers on top |
| `src/sim/combat/bot_corps_ai.ts` | Corps AI unchanged |
| `src/sim/combat/bot_brigade_ai_osid.ts` | Brigade AI unchanged — always formula bot |
| Calibration scenario data | Zero sim-affecting changes at Level 0 |

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| evaluateEvents becoming async breaks callers | Grep all callers. Most are pipeline steps (already async) or tests (trivial to convert). |
| AI decisions violate event constraints | `decision_validator.ts` already validates against constraints. Apply same validation to political decisions. |
| API costs spiral at Level 3 | Cost cap setting (default $1/game). Warning at 75%. Pause AI at 100%. Haiku for routine, Sonnet only for flagged decisions. |
| Non-determinism confuses replay | Decision log is checked BEFORE API call. Replay never hits API. Clear in UI: "Replay mode: using cached decisions." |
| Player exploits override system | One-turn delay on autonomy changes. Overrides visible in Wrapped. "Interventions" counter is part of the game score. |
| Model deprecation | MODEL_ROUTING centralized in ai_config.ts. Single file to update when models change. |

---

## Calibration Impact

**None at Level 0.** The default autonomy level is 0 (Full Control). No code paths change for headless scenario runs, calibration, or tests. The `cadet` AI mode check (`if (!config || config.mode === 'cadet') return`) gates all AI pipeline steps before autonomy is even evaluated.

**Level 1-3 are player-facing only.** They affect the player's faction, which is excluded from calibration runs (no `player_faction` set in scenario JSON). The formula bot remains the ground truth for all automated testing.

---

## Schedule

| Phase | Sessions | Depends On |
|-------|----------|------------|
| A: State + Skeleton | 1 | v0.8.3 shipped |
| B: Override System | 1 | Phase A |
| C: Claude API | 2 | Phase A |
| D: UI | 2 | Phase B + C |
| E: Testing + Polish | 1 | Phase D |
| **Total** | **7 sessions** | |

Phases B and C can run in parallel after Phase A completes.

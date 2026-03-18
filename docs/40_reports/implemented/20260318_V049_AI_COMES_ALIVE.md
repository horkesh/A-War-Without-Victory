# v0.4.9 — AI Comes Alive — Implementation Report

**Date:** 2026-03-18
**Version:** 0.4.8 → 0.4.9
**Baseline:** v0.4.8 (1110 tests, 92 suites, n884 90.4% area-weighted)
**Result:** v0.4.9 (1184 tests, 96 suites, tsc clean, map builds, no calibration regression)

## Summary

- Implemented 4 AI commander features (P0–P3) from the expanded vision brainstormed 2026-03-17: IPC wiring, corps dialogue, after-action narrative, war dispatches
- All features are **cosmetic-only** — they enrich the player experience without affecting simulation state or calibration
- All features use **Haiku** for cheap generation (~$2-3/game total) and degrade gracefully to formula bot when no API key is configured
- The AI commander module grew from 11 → 14 files (~1,011 → 1,683 lines). Two new UI components. 88 new tests.

## Architecture

### Design Principles

1. **Cosmetic layer, not simulation layer.** Corps dialogues, battle narratives, and war dispatches are stored on `MilitaryState` but never read by any simulation logic. They exist purely for display.
2. **Graceful degradation.** Every feature checks `ai_commander_config.mode !== 'cadet'` and returns empty/null when no API is available. Cadet mode (free, formula-only) is always the default.
3. **Queue-then-generate pattern.** Battle narratives use a two-phase approach: significant battles are queued during synchronous combat resolution, then an async pipeline step generates the narratives. This avoids async imports in hot combat code.
4. **Rolling buffers.** State doesn't grow unbounded. Narratives cap at 20, dispatches at 10, dialogues cleared each turn.
5. **Cost control.** Narratives capped at 5/turn. Dispatches generate only every 4 turns. All calls use Haiku (cheapest model).

### Pipeline Integration

Four new async pipeline steps added to `war_phases.ts` (after existing `ai-army-decisions` and `ai-corps-decisions`):

```
Step 758: ai-army-decisions        (existing)
Step 791: ai-corps-decisions       (existing)
Step NEW: ai-corps-dialogue        ← P1: officers respond to orders
Step NEW: ai-battle-narratives     ← P2: narrate significant battles
Step NEW: ai-war-dispatches        ← P3: monthly humanitarian dispatches
```

All steps are:
- Gated by `config.mode !== 'cadet'`
- Lazy-imported (no startup cost)
- Error-safe (silent catch on all API failures)
- Async (use `await client.generateDecision()`)

### Module Structure

```
src/sim/ai_commander/          (14 files, ~1,683 lines)
├── ai_types.ts                 (existing) Shared types
├── ai_config.ts                (existing) Mode routing, defaults
├── ai_client.ts                (existing) AiClient interface
├── anthropic_client.ts         (existing) SDK wrapper
├── army_commander_ai.ts        (existing) Army decisions
├── corps_commander_ai.ts       (existing) Corps decisions
├── prompt_builder.ts           (existing) State → prompt serialization
├── response_parser.ts          (existing) JSON response validation
├── player_advisor.ts           (existing) On-demand advisor
├── personality_profiles.ts     (existing) Faction/officer voices
├── decision_log.ts             (existing) Replay determinism
├── corps_dialogue.ts           (NEW, 286 lines) P1: officers talk back
├── aar_narrative.ts            (NEW, 153 lines) P2: battle narratives
└── war_dispatches.ts           (NEW, 233 lines) P3: war dispatches
```

## Changes Made

### P0: IPC Wiring

Connected the existing AI commander infrastructure to the Electron desktop app.

- **`src/desktop/electron-main.cjs`** (+52 lines): Three `ipcMain.handle()` handlers:
  - `set-ai-commander-config`: Validates mode, stores on `state.meta.ai_commander_config`, preserves `session_cost_estimate`, broadcasts state
  - `get-ai-commander-config`: Returns current config or default `{ mode: 'cadet', session_cost_estimate: 0 }`
  - `get-advisor-recommendation`: Guards cadet mode, lazy-imports ESM modules, calls `getAdvisorRecommendation()`, returns result or error
- **`src/desktop/preload.cjs`** (+3 lines): Bridge methods on `window.awwv`
- **`tests/ai_commander_ipc.test.ts`** (103 lines, 12 tests): Config shape, defaults, mode validation, round-trip, cadet guard

### P1: Officers Who Talk Back

Corps commanders respond to orders in character. Aggressive officers push for action, cautious ones raise concerns.

- **`src/sim/ai_commander/corps_dialogue.ts`** (286 lines):
  - `buildCorpsDialoguePrompt()`: Personality-driven system prompt (aggressive/cautious/balanced from officer aggressiveness stat). User prompt includes stance, operation context, brigade count, recent battles. Haiku, 256 max tokens.
  - `parseDialogueResponse()`: Extracts `{ acknowledgment, concern, confidence }` from JSON. Strips markdown. Null on failure.
  - `generateCorpsDialogues()`: Iterates active bot corps (skips player faction), calls client, collects entries. Sorted by corps ID for determinism.
- **`src/state/game_state.ts`**: Added `corps_dialogues?: CorpsDialogueEntry[]` to `MilitaryState`
- **`src/sim/turn_phases/war_phases.ts`**: Pipeline step `ai-corps-dialogue`
- **`src/ui/map/components/CorpsDialoguePanel.tsx`** (88 lines): Officer name, acknowledgment in italics, amber-styled concern block, confidence dot (green/amber/red)
- **`tests/corps_dialogue.test.ts`** (220 lines, 26 tests): Prompt building, response parsing, objection handling, markdown stripping

### P2: After-Action Narrative

Significant battles narrated by the corps commander in character.

- **`src/sim/ai_commander/aar_narrative.ts`** (153 lines):
  - `isSignificantBattle()`: decisive/catastrophic outcome, OR territory changed, OR 200+ total casualties
  - `buildAARPrompt()`: Officer writes field report. Includes battle location, outcome, casualties, brigades, territory change. Haiku, 384 max tokens.
  - `parseAARResponse()`: Extracts `{ narrative, tone }`. Tone: triumphant/somber/defiant/grim/matter-of-fact.
  - `generateBattleNarratives()`: Processes queue (cap 5/turn), calls client, returns narratives.
- **`src/state/game_state.ts`**: Added `battle_narratives?: BattleNarrative[]` and `narrative_queue?: NarrativeQueueEntry[]`
- **`src/sim/combat/attack_resolution_osid.ts`** (+31 lines): After combat feedback counters, inline significance check queues battles to `narrative_queue`. Officer name resolved later in pipeline step.
- **`src/sim/turn_phases/war_phases.ts`**: Pipeline step `ai-battle-narratives`. Resolves officer names via `getCorpsCommander`, generates narratives, appends to rolling buffer (cap 20), clears queue.
- **`tests/aar_narrative.test.ts`** (215 lines, 19 tests): Significance filter, prompt building, response parsing

### P3: War Dispatches

Monthly dispatches from outside perspectives — the humanitarian mirror.

- **`src/sim/ai_commander/war_dispatches.ts`** (233 lines):
  - `shouldGenerateDispatch()`: Every 4 turns (monthly)
  - `buildDispatchPrompt()`: Rotates 4 perspectives deterministically — humanitarian (UNHCR), military (NATO analyst), civilian (letter to relative), diplomatic (UN mediator). Includes actual game data: total/recent displaced, sieged cities, battles, territory %. Haiku, 384 max tokens.
  - `parseDispatchResponse()`: Extracts `{ source, headline, body, perspective }`.
  - `generateWarDispatch()`: Gathers humanitarian data from `displacement_event_log`, `control_events`, `political_controllers`. Computes territory percentages. Determines date from turn + start week.
- **`src/state/game_state.ts`**: Added `war_dispatches?: WarDispatch[]`
- **`src/sim/turn_phases/war_phases.ts`**: Pipeline step `ai-war-dispatches`. Gated by dispatch frequency. Rolling buffer cap 10.
- **`src/ui/map/components/WarDispatchPanel.tsx`** (106 lines): Latest-first display. Colored left border by perspective (blue=humanitarian, red=military, green=civilian, gold=diplomatic). Source label, week number, bold headline, body text.
- **`tests/war_dispatches.test.ts`** (223 lines, 31 tests): Dispatch frequency, perspective rotation, prompt building, response parsing

### Engine Fixes (from AI Commander QA)

Committed alongside v0.4.9 but separate from the 4 features:

- `status_reason` field on `CorpsCommandState` — diagnostic explaining why corps is/isn't launching operations
- `op_launch_trace` audit array — gate-by-gate trace for AI commander QA system
- `SECONDARY_OP_COOLDOWN_TURNS_OFFENSIVE=3` — offensive corps use shorter cooldown
- MapContainer undefined guard fixes (disabled sector demarcation block)
- Removed orphan `entrenchment_fatigue.test.ts` (tested unimplemented constant)
- Siege-aware density gate, BFS territory guard for home municipalities

## Cost Model

| Feature | Model | Cost/Event | Events/Game | Total/Game |
|---------|-------|-----------|-------------|------------|
| Corps Dialogue | Haiku | ~$0.001 | ~15 corps × 188 turns | ~$2.80 |
| Battle Narrative | Haiku | ~$0.005 | ~50-100 significant | ~$0.25-0.50 |
| War Dispatches | Haiku | ~$0.005 | ~47 (every 4 turns) | ~$0.23 |
| **Total** | | | | **~$3.30/game** |

Note: These costs are at Officer tier (Haiku for all). Commander tier would use Opus for some calls at higher cost. Cadet tier is always free.

## Test Coverage

| Test File | Tests | Focus |
|-----------|-------|-------|
| `ai_commander_ipc.test.ts` | 12 | Config shape, defaults, mode validation, cadet guard |
| `corps_dialogue.test.ts` | 26 | Prompt building, parsing, personality mapping, objections |
| `aar_narrative.test.ts` | 19 | Significance filter, prompt content, response parsing |
| `war_dispatches.test.ts` | 31 | Frequency, perspective rotation, prompt data, parsing |
| **Total new** | **88** | |

**Suite totals:** 1184 tests, 96 suites (was 1110 tests, 92 suites). All pass.

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Version 0.4.8 → 0.4.9 |
| `src/desktop/electron-main.cjs` | +3 IPC handlers (52 lines) |
| `src/desktop/preload.cjs` | +3 bridge methods |
| `src/sim/ai_commander/corps_dialogue.ts` | NEW (286 lines) |
| `src/sim/ai_commander/aar_narrative.ts` | NEW (153 lines) |
| `src/sim/ai_commander/war_dispatches.ts` | NEW (233 lines) |
| `src/sim/combat/attack_resolution_osid.ts` | +31 lines (narrative queue) |
| `src/sim/combat/bot_corps_directives.ts` | +29 lines (status_reason, trace, cooldown) |
| `src/sim/combat/sector_territory.ts` | +28 lines (BFS home_mun guard) |
| `src/sim/turn_phases/war_phases.ts` | +42 lines (3 pipeline steps) |
| `src/state/game_state.ts` | +8 lines (5 new MilitaryState fields) |
| `src/ui/map/components/CorpsDialoguePanel.tsx` | NEW (88 lines) |
| `src/ui/map/components/WarDispatchPanel.tsx` | NEW (106 lines) |
| `tests/ai_commander_ipc.test.ts` | NEW (103 lines, 12 tests) |
| `tests/corps_dialogue.test.ts` | NEW (220 lines, 26 tests) |
| `tests/aar_narrative.test.ts` | NEW (215 lines, 19 tests) |
| `tests/war_dispatches.test.ts` | NEW (223 lines, 31 tests) |
| `vitest.config.ts` | +4 test files |
| `.claude/napkin.md` | Current state → v0.4.9 |
| `docs/PROJECT_LEDGER.md` | Ledger entry appended |
| **Total** | **23 files, +1,938 lines** |

## Remaining AI Vision Features (Deferred)

| Feature | Milestone | Rationale |
|---------|-----------|-----------|
| P4: Fog of Personality | v0.5.2 (Tutorial & Onboarding) | Formula-based, no API. Distorts intel display. Needs discoverable mechanic + codex entry. |
| P5: Dayton Negotiation | v0.6.3 (AI Dynamic Content) | Opus-powered multi-round negotiation. Needs diplomatic phase (v0.5.0) complete first. |

## Next Steps

1. **v0.5.0 — Full Diplomatic System**: Wire PeacePlanModal, DaytonNegotiationModal, patron gauge, capital display, embargo. This is the transition from engine to product.
2. **UI integration**: The new panels (`CorpsDialoguePanel`, `WarDispatchPanel`) are created but not yet mounted in `App.tsx` or the corps detail view. Wire them during v0.5.1 (UI Completion).
3. **Ops planning modal (P1 from napkin)**: Still needs correct version restored + territory highlighting.
4. **Run AI commander QA**: After wiring UI, run `npm run sim:qa:commanders` to verify the new features don't produce false observations.

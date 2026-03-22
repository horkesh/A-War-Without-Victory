# Cross-Series Review: v0.5.x ↔ v0.6.x Integration

**Date:** 2026-03-16
**Reviewer:** Orchestrator
**Scope:** 10 milestones (v0.5.0–v0.5.4, v0.6.0–v0.6.4) analyzed as a single integrated product roadmap.

---

## Part I: Shared Systems That Evolve Across Both Series

### A. The Briefing Bus (4 milestones touch it)

```
v0.5.1 Phase 2  → Creates sim-side collector (6 sections)
v0.5.4 Phase 1  → Adds 7th section (AAR field reports)
v0.6.0           → New events should generate briefing items for "Events & Decisions" section
v0.6.2 Phase 5  → Adds campaign milestone briefings ("Week 52 — One year of war")
```

**Problem:** Four milestones add to the briefing system, but only v0.5.1 designs the collector architecture. If the architecture doesn't anticipate extension, later milestones will hack around it.

**Fix:** v0.5.1 Phase 2 `collect_briefing.ts` must be designed as an **open registry** — a simple array of collector functions that later milestones push onto. The pattern:

```typescript
// collect_briefing.ts
const collectors: BriefingCollector[] = [
    collectMilitaryBriefing,
    collectEventsBriefing,
    collectDiplomaticBriefing,
    collectEconomicBriefing,
    collectCommandBriefing,
    collectHumanitarianBriefing,
];
export function registerBriefingCollector(fn: BriefingCollector) { collectors.push(fn); }
```

v0.5.4 calls `registerBriefingCollector(collectAARBriefing)`. v0.6.2 calls `registerBriefingCollector(collectMilestoneBriefing)`. No modification of collect_briefing.ts needed after v0.5.1.

**Plan changes:**
- **v0.5.1 Phase 2 Task 2.1:** Explicitly design collector as open registry with `registerBriefingCollector()`.
- **v0.5.4, v0.6.2:** Register, don't modify.

---

### B. The Codex (3 milestones grow it)

```
v0.5.2 Phase 3  → Creates codex (~60 entries: factions, corps, mechanics, history, geography)
v0.6.0           → 60+ new events should have codex cross-references (event → codex "History" entry)
v0.6.4 Phase 2  → Adds "Historical Essays" category (60-80 essays)
```

**Problem:** Codex starts at ~60 entries and grows to ~130+. The `codex_entries.ts` file will become massive (130 entries × 200 words = 26K words in a single TypeScript file). Also, event-to-codex linking isn't specified.

**Fix:**
1. **Split codex storage:** v0.5.2 should create `data/codex/` directory with one JSON file per category (`factions.json`, `mechanics.json`, `history.json`, etc.). `codex_entries.ts` becomes a thin loader, not a content store. v0.6.4 essays are already in `data/essays/` — consistent.
2. **Event→Codex cross-link:** Each event definition gets an optional `codex_refs: string[]` field. EventModal shows "Related: [Codex Entry]" links. v0.6.0 should populate these when adding events.

**Plan changes:**
- **v0.5.2 Phase 3 Task 3.2:** Store codex content in `data/codex/<category>.json`, not in TypeScript. `codex_entries.ts` becomes a loader that reads JSON at init.
- **v0.6.0 Phase 2-4:** Add `codex_refs` to event definitions where a codex entry exists. EventModal renders "Related reading" links.

---

### C. The AI Client Pipeline (3 milestones extend it)

```
v0.4.5           → anthropic_client.ts, prompt_builder.ts, response_parser.ts, personality_profiles.ts
v0.5.4           → aar_generator.ts, postgame_analysis.ts, player_advisor.ts (enhanced)
v0.6.3           → event_generator.ts, negotiation_dialogue.ts, leader_profiles.ts
```

**Problem:** Three milestones create AI modules that all need: API key access, model routing (Haiku vs Sonnet), error handling, rate limiting, cost tracking, fallback behavior, and decision logging. If each module reimplements these, we get 6+ slightly different API call patterns.

**Fix:** v0.4.5's `anthropic_client.ts` should be the **sole API caller**. All AI modules go through it. The client handles: model selection, retry, rate limiting, cost tracking, error → null fallback, and decision logging. No module calls the Anthropic SDK directly.

**Assessment:** v0.4.5 already has this structure (abstract `ai_client.ts` interface). But the plan must explicitly state: **no module creates its own Anthropic SDK instance.** All go through `anthropic_client.ts`.

**Plan changes:**
- **v0.5.4:** Explicitly state: aar_generator, postgame_analysis call `anthropicClient.complete()`, not SDK directly.
- **v0.6.3:** Explicitly state: event_generator, negotiation_dialogue call `anthropicClient.complete()`.
- **v0.4.5's ai_client.ts interface:** Should include `estimateCost(model, inputTokens, outputTokens): number` so modules can pre-check costs.

---

### D. GameState Schema Growth (7 milestones add fields)

```
v0.5.0  → pendingPeacePlan exposure (adapter only, no new field)
v0.5.1  → last_briefing: CommandBriefing
v0.5.2  → meta.tutorial_state: TutorialState
v0.5.4  → military.battle_aars: BattleAAR[]
v0.6.2  → campaign_stats, per_turn_snapshots, meta.achievements, playtime_seconds
v0.6.3  → (procedural events stored in existing event state — no new field)
v0.6.4  → unlocked_essays: string[]
```

**Problem:** Seven milestones add fields to GameState. Old saves won't have these fields. If any field is accessed without a null check, old saves crash.

**Fix:** Establish a **save migration convention** — every new GameState field must have a default value, and the state loader must populate defaults for missing fields. This isn't a new system (it's just good TypeScript practice), but it must be a standing rule.

**Plan changes:**
- **All plans that add GameState fields:** Add explicit note: "Field must have default value. State loader must handle old saves without this field (default to empty/null)."
- **v0.6.2 Phase 4 Task 4.1:** Save metadata wrapper handles version detection. If `meta.game_version` is missing, apply migration defaults for all post-v0.5.0 fields.

---

### E. App.tsx Is Becoming a God Component (6 milestones modify it)

```
v0.5.0  → Peace plan blocking modal, Dayton blocking modal
v0.5.1  → Briefing auto-show, menu state machine (MainMenu→Game→Pause)
v0.5.2  → Tutorial overlay rendering, action tracking
v0.5.3  → Audio engine initialization, music manager state updates
v0.6.3  → AI dialogue modal integration
v0.6.4  → Essay unlock notifications
```

**Problem:** App.tsx accumulates orchestration logic from every milestone. It's already ~500+ lines. After 10 milestones it could be 800+. This becomes a merge conflict magnet and cognitive overhead.

**Fix:** Extract a **game flow orchestrator** from App.tsx. The pattern: App.tsx renders the current screen, and a `useGameFlow()` hook manages the state machine (which modals to show, in what order, after what triggers). The hook is the single source of truth for "what happens after turn advance" and "what blocks player interaction."

**Plan changes:**
- **v0.5.1 Phase 3 Task 3.5:** When implementing menu state machine, extract `useGameFlow.ts` hook. App.tsx becomes thin: `const { screen, activeModal, blockingQueue } = useGameFlow()`. All blocking modal logic (peace plan, Dayton, briefing, tutorial) routes through this hook.
- **All subsequent plans:** Modify `useGameFlow.ts` when adding blocking modals or flow changes, NOT App.tsx directly.

---

### F. MainMenu Keeps Growing (5 milestones add items)

```
v0.5.1  → New Game, Continue, Load Game, Settings, Credits, Quit
v0.5.2  → Tutorial (prominent), Codex
v0.6.2  → Campaign Statistics, Achievement Gallery
v0.6.4  → Collection Overview (achievements + essays)
```

**Problem:** MainMenu grows from 6 items to 10+. That's too many for a clean menu screen.

**Fix:** Group into two tiers:
- **Primary:** New Game, Continue, Tutorial (first-time only), Quit
- **Secondary (below divider):** Load Game, Collection (achievements + essays + stats), Settings, Credits

v0.5.1 builds the primary tier. v0.5.2 adds Tutorial to primary. v0.6.2 and v0.6.4 add to "Collection" — which is a single menu item opening a tabbed screen (Achievements | Statistics | Essays).

**Plan changes:**
- **v0.5.1 Phase 3 Task 3.1:** Design MainMenu with primary/secondary tiers from the start. Leave "Collection" slot empty initially.
- **v0.6.2 Phase 3 Task 3.4:** Achievement Gallery is a TAB inside Collection screen, not a standalone menu item.
- **v0.6.4 Phase 2 Task 2.6:** CollectionOverview becomes the "Collection" menu item with 3 tabs: Achievements, Statistics, Essays.

---

### G. Settings Screen Grows Across Series (3 milestones add sections)

```
v0.5.1  → Gameplay, Display, Audio (placeholder), Advanced
v0.5.3  → Audio section wired (volume sliders active)
v0.6.3  → AI Content section: enable/disable procedural events, dialogue, cost display
```

**Problem:** Settings grows from 4 sections to 5. The AI Content section is important for cost transparency (players need to know AI features cost money via their API key).

**Fix:** v0.5.1 SettingsScreen should use a **section registry pattern** (like the briefing collector). Each section is a component. Later milestones register new sections. This prevents SettingsScreen.tsx from bloating.

**Plan changes:**
- **v0.5.1 Phase 3 Task 3.2:** SettingsScreen renders sections from a `settingsSections` array. Each section: `{ id, title, component }`. Later milestones push onto this array.
- **v0.6.3:** Register "AI Content" settings section: enable/disable procedural events, enable/disable dialogue, estimated cost per game, API key status indicator.

---

## Part II: Critical Path and Ordering Risks

### H. The Calibration Sandwich (v0.6.0 → v0.6.1 → v0.6.3)

```
v0.6.0 adds 60+ events with mechanical effects
v0.6.1 calibrates the game WITH events
v0.6.3 adds procedural events with mechanical effects
```

**Problem:** Calibration (v0.6.1) happens once. Then v0.6.3 adds procedural events that change the sim. This creates a **calibration sandwich** — the game is calibrated in the middle, then destabilized from both sides. The v0.6.x cross-plan review already catches the v0.6.3→v0.6.1 regression check, but the broader issue is: **v0.6.1's calibration is only valid if nothing after it changes the sim.**

**Fix:** Formalize a **calibration freeze** rule: after v0.6.1, no milestone may add mechanical effects to the sim without a mandatory regression check. The rule:

> Any post-v0.6.1 change that affects simulation output (events, effects, AI-generated content with mechanical impact) MUST include: (1) `npm run calibrate:52w` with change enabled, (2) comparison against v0.6.1 baseline, (3) pass if all benchmarks within 2%.

**Plan changes:**
- **v0.6.1 Completion Checklist:** Add: "Store calibration baseline as `data/calibration/v0.6.1_freeze.json`. All subsequent milestones with sim-affecting changes must regression-test against this freeze."
- **v0.6.3:** Already has the regression check (finding #4 from v0.6.x review). Reinforce with explicit reference to freeze baseline.

---

### I. v0.5.0 Builds the Dayton UI, v0.6.3 Extends It

```
v0.5.0 Phase 2  → DaytonNegotiationModal (single-round: select packages → bot responds → verdict)
v0.6.3 Phase 2  → Upgrades Dayton to multi-round dialogue with AI leaders
```

**Problem:** v0.5.0 builds a single-round modal. v0.6.3 adds multi-round dialogue to the same modal. If v0.5.0 doesn't design for extensibility, v0.6.3 will need a rewrite.

**Fix:** v0.5.0 DaytonNegotiationModal should be built with a **round concept** from day one — it just happens to be 1 round in v0.5.0. The structure:

```tsx
// v0.5.0: rounds = [{ player_proposal, bot_responses }] (always length 1)
// v0.6.3: rounds = [{ player_proposal, bot_responses, dialogue }, ...] (up to 3)
```

The UI shows "Round 1 of 1" in v0.5.0. v0.6.3 changes it to "Round 1 of 3" and adds the dialogue panel. Minimal refactoring needed.

**Plan changes:**
- **v0.5.0 Phase 2 Task 2.1:** DaytonNegotiationModal state includes `rounds: NegotiationRound[]` and `currentRound: number`. v0.5.0 always has exactly 1 round. The "Submit" button resolves immediately. Note in code: "v0.6.3 extends to multi-round with AI dialogue."

---

### J. Tutorial Content Becomes Stale After v0.6.0 (CONTENT DRIFT)

```
v0.5.2  → Tutorial teaches 11 mechanics (OOB, map, briefing, stance, supply, operations, events, diplomacy, advisor)
v0.6.0  → Adds event chains, conditional triggers, probabilistic events
v0.6.2  → Adds achievements (tutorial doesn't mention them)
v0.6.3  → Adds AI dynamic content (tutorial doesn't mention it)
```

**Problem:** The v0.5.2 tutorial teaches the game as it exists at v0.5.4. By v0.6.4, the game has significantly more features. The tutorial is frozen at 11 objectives and never updated.

**Assessment:** This is acceptable IF the tutorial's goal is "learn the core" not "learn everything." New features (achievements, AI content, essays) are discoverable through the Codex, help tooltips, and natural gameplay. The tutorial shouldn't try to teach every system.

**However:** The tutorial scenario uses a 10-turn RBiH game. v0.6.0 events fire at specific weeks — the tutorial's 10 turns (w0-10) will now have MORE events than when the tutorial was designed. The tutorial should handle this gracefully.

**Fix:** Tutorial objective 8 ("Respond to events") should work with ANY event that fires in the first 10 turns, not a specific hardcoded event. If v0.6.0 adds 5 events in w0-10, the tutorial just responds to whichever fires first.

**Plan changes:**
- **v0.5.2 Phase 1 Task 1.2 (objective 8):** "Respond to events" — triggers on ANY decision event with `requires_player_response: true`, not a specific event_id. Flexible against event set changes.

---

### K. Audio SFX IDs Must Be Forward-Declared (v0.5.3 defines, v0.6.2 uses)

```
v0.5.3  → sound_manifest.ts defines SfxId enum (~17 SFX)
v0.6.2  → Achievement notification wants `achievement_unlocked` SFX
v0.6.4  → Essay unlock wants `essay_unlocked` SFX (or reuse achievement_unlocked)
```

**Problem:** v0.5.3 defines the SFX manifest. v0.6.2 needs SFX that v0.5.3 didn't know about. If the enum is sealed, v0.6.2 can't add to it without modifying v0.5.3 code.

**Fix:** Sound manifest should be an **open registry** (same pattern as briefing collector and settings sections). SFX entries added via `registerSFX(id, config)`. v0.5.3 registers its 17 SFX. v0.6.2 registers `achievement_unlocked`. v0.6.4 reuses it or registers `essay_unlocked`.

**Plan changes:**
- **v0.5.3 Phase 1 Task 1.3:** Sound manifest uses a Map, not a sealed enum. `registerSFX(id: string, config: SfxConfig)` function. v0.5.3 registers all initial SFX. Later milestones call `registerSFX()` for new sounds.
- **v0.6.2 Phase 3 Task 3.3:** Register `achievement_unlocked` SFX. Placeholder asset until real audio sourced.

---

### L. Post-Game Flow Keeps Getting Richer (5 milestones add to it)

```
v0.5.0  → Dayton → VerdictScreen
v0.5.4  → VerdictScreen + AI war analysis
v0.6.2  → VerdictScreen + "View Full Statistics" → CampaignStatisticsScreen
v0.6.3  → Dayton dialogue (multi-round, richer) → VerdictScreen
v0.6.4  → VerdictScreen + essay collection progress
```

**Problem:** The post-game experience goes from "show score" to a rich multi-screen flow. Without design coordination, it becomes a disjointed sequence of modals.

**Fix:** Design the **end-of-game flow** as a deliberate sequence now. The player should experience:

```
1. Dayton Negotiation (v0.5.0 single-round / v0.6.3 multi-round with AI dialogue)
2. Verdict Screen — Pyrrhic Score + letter grades + dimension breakdown (v0.3.1)
3. AI War Analysis — expandable section on VerdictScreen (v0.5.4, optional if API key)
4. Campaign Statistics — territory timeline, records, casualty breakdown (v0.6.2)
5. Collection Progress — achievements earned + essays unlocked this game (v0.6.4)
6. "Play Again" / "Main Menu" / "Quit" buttons
```

Steps 2-5 should be TABS on a single post-game screen, not separate modals stacked in sequence.

**Plan changes:**
- **v0.5.0 Phase 2 Task 2.4:** VerdictScreen is the post-game HUB with tab slots: "Verdict" (default), "Analysis" (v0.5.4), "Statistics" (v0.6.2), "Collection" (v0.6.4). v0.5.0 only fills the "Verdict" tab.
- **v0.5.4, v0.6.2, v0.6.4:** Register their content as additional VerdictScreen tabs, not standalone modals.

---

## Part III: Architectural Patterns to Establish in v0.5.x

The v0.5.x series builds infrastructure that v0.6.x extends. Four **extension patterns** should be established in v0.5.x to prevent v0.6.x from fighting the architecture:

| Pattern | Established In | Extended By | Mechanism |
|---------|----------------|-------------|-----------|
| **Briefing Collector Registry** | v0.5.1 | v0.5.4, v0.6.2 | `registerBriefingCollector(fn)` |
| **Settings Section Registry** | v0.5.1 | v0.5.3, v0.6.3 | `registerSettingsSection(section)` |
| **SFX Open Manifest** | v0.5.3 | v0.6.2, v0.6.4 | `registerSFX(id, config)` |
| **VerdictScreen Tab Registry** | v0.5.0 | v0.5.4, v0.6.2, v0.6.4 | `registerVerdictTab(tab)` |
| **GameFlow Hook** | v0.5.1 | v0.5.2, v0.6.3 | `useGameFlow()` manages modal queue |
| **Codex as JSON Data** | v0.5.2 | v0.6.0, v0.6.4 | `data/codex/<category>.json` |
| **MainMenu Primary/Secondary** | v0.5.1 | v0.5.2, v0.6.2, v0.6.4 | Two-tier menu with Collection slot |

These are lightweight patterns — not plugin frameworks. Each is just an array + a push function. But they prevent 6 milestones of "modify the same file and hope merge conflicts don't break things."

---

## Part IV: Summary of All Cross-Series Changes

| # | Finding | Severity | Source Plans | Change |
|---|---------|----------|-------------|--------|
| A | Briefing bus extended by 4 milestones | **ARCHITECTURE** | v0.5.1, v0.5.4, v0.6.0, v0.6.2 | Open registry pattern |
| B | Codex grows to 130+ entries | **ARCHITECTURE** | v0.5.2, v0.6.0, v0.6.4 | JSON data dir, event cross-links |
| C | AI client shared by 3 milestones | CONSISTENCY | v0.5.4, v0.6.3 | All modules go through anthropic_client.ts |
| D | GameState gains 7+ new fields | COMPATIBILITY | All state-adding plans | Default values + migration convention |
| E | App.tsx modified by 6 milestones | **ARCHITECTURE** | v0.5.0-v0.6.4 | Extract useGameFlow.ts hook |
| F | MainMenu grows to 10+ items | UX | v0.5.1, v0.5.2, v0.6.2, v0.6.4 | Primary/Secondary tiers + Collection |
| G | Settings grows across 3 milestones | ARCHITECTURE | v0.5.1, v0.5.3, v0.6.3 | Section registry pattern |
| H | Calibration sandwich | **CRITICAL** | v0.6.0, v0.6.1, v0.6.3 | Calibration freeze + regression rule |
| I | Dayton UI extended in v0.6.3 | DESIGN | v0.5.0, v0.6.3 | Build with round concept from day one |
| J | Tutorial content drift | CONTENT | v0.5.2, v0.6.0 | Flexible event objective, not hardcoded |
| K | SFX IDs needed post-v0.5.3 | ARCHITECTURE | v0.5.3, v0.6.2 | Open manifest, not sealed enum |
| L | Post-game flow grows across 5 plans | **UX** | v0.5.0, v0.5.4, v0.6.2, v0.6.3, v0.6.4 | VerdictScreen tab registry |

---

## Updated Night Shift Instructions

Add to `nightshift-handoff.md`:

```
## v0.5.x Architectural Patterns (MANDATORY)
These patterns MUST be implemented in v0.5.x to support v0.6.x extension:
1. Briefing collector: open registry (registerBriefingCollector)
2. Settings screen: section registry (registerSettingsSection)
3. SFX manifest: open Map with registerSFX(), not sealed enum
4. VerdictScreen: tab registry for post-game content
5. App.tsx: extract useGameFlow.ts hook for modal orchestration
6. Codex content: JSON files in data/codex/, not TypeScript
7. MainMenu: primary/secondary tiers with Collection slot
8. Dayton modal: round-based state from day one
9. Tutorial event objective: flexible (any decision event), not hardcoded
10. All new GameState fields: must have defaults, handle old saves
```

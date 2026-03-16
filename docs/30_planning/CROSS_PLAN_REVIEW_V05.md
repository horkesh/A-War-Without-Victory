# Cross-Plan Review: v0.5.0 – v0.5.4

**Date:** 2026-03-16
**Reviewer:** Orchestrator
**Plans reviewed:**
1. `v0.5.0` — Full Diplomatic System (UI Wiring)
2. `v0.5.1` — UI Completion
3. `v0.5.2` — Tutorial & Onboarding
4. `v0.5.3` — Audio (SFX + Music)
5. `v0.5.4` — AI Narrative Layer + Auto-Play

---

## Finding 1: Command Briefing Built Twice (CONFLICT — v0.5.0 vs v0.5.1)

**Problem:** v0.5.0 Phase 4 adds diplomatic/humanitarian items to `buildCommandBriefing()` in GameStateAdapter (UI-side). v0.5.1 Phase 2 rebuilds the entire briefing system sim-side (`src/sim/briefing/collect_briefing.ts`) and migrates away from GameStateAdapter. The v0.5.0 work gets thrown away.

**Fix:** Merge v0.5.0 Phase 4 INTO v0.5.1 Phase 2. The sim-side collector should include diplomatic + humanitarian sections from day one. v0.5.0 should NOT touch briefing at all.

**Plan changes:**
- **v0.5.0:** DELETE Phase 4 entirely. Renumber Phase 5 → Phase 4.
- **v0.5.1 Phase 2:** Add to Task 2.1 — `collectDiplomaticBriefing` and `collectHumanitarianBriefing` are required from the start (not deferred). Source: peace plan pending, patron changes, IVP shifts, displacement, enclave status, civilian casualties.

---

## Finding 2: Capital Bars Built Twice (DUPLICATION — v0.5.0 vs VerdictScreen)

**Problem:** v0.5.0 Phase 3 creates `NegotiationCapitalDisplay.tsx` with 5 horizontal bars per capital dimension. VerdictScreen.tsx already renders capital dimension breakdown bars. Two components doing the same visualization.

**Fix:** Extract a shared `CapitalBarChart.tsx` component with props for mode (`compact` for in-game, `full` for verdict). Used by both NegotiationCapitalDisplay and VerdictScreen.

**Plan changes:**
- **v0.5.0 Phase 3 Task 3.2:** Create `CapitalBarChart.tsx` as the shared primitive. NegotiationCapitalDisplay wraps it in compact mode. Add a note: v0.5.1 Phase 5 (panel finalization) should refactor VerdictScreen to use the same CapitalBarChart.

---

## Finding 3: PeacePlan + Dayton Share Negotiation UI Pattern (OPPORTUNITY)

**Problem:** PeacePlanModal (accept/reject with consequence preview, bot responses, patron pressure) and DaytonNegotiationModal (package selection with costs, bot responses, patron overrides) share significant UI patterns: consequence preview cards, bot response display, patron pressure indicators.

**Fix:** Extract a shared `NegotiationResponseCard.tsx` component: shows a faction's stance (accepted/rejected/counter-proposed), patron override badge, and consequence summary. Used by both modals.

**Plan changes:**
- **v0.5.0 Phase 1 Task 1.3:** Create `NegotiationResponseCard.tsx` while building PeacePlanModal. Phase 2 reuses it in DaytonNegotiationModal.

---

## Finding 4: Save Browser Dependency (ORDERING — v0.5.1 internal)

**Problem:** v0.5.1 Phase 3 (MainMenu) references "Load Game → save file browser" but SaveBrowser is created in Phase 5. The menu can't reference a component that doesn't exist yet.

**Fix:** Move SaveBrowser creation from Phase 5 to Phase 3.

**Plan changes:**
- **v0.5.1:** Move Task 5.3 (SaveBrowser) to Phase 3, after MainMenu but before wiring. Or: create SaveBrowser.tsx in Phase 3 Task 3.5 alongside PauseMenu.

---

## Finding 5: Tutorial Misses Advisor Integration (OPPORTUNITY — v0.5.2 + v0.4.5)

**Problem:** The tutorial (v0.5.2) teaches 10 mechanics but never introduces the AI Advisor (v0.4.5, already live). New players won't discover the "Ask Commander" feature. v0.5.4 later enhances the advisor with specific queries — but by then the player should already know it exists.

**Fix:** Add an 11th tutorial objective: "Ask your advisor" — click the AI Advisor button and receive a recommendation. This teaches the player that help is always available. If no API key, objective auto-completes with a note about the feature.

**Plan changes:**
- **v0.5.2 Phase 1 Task 1.2:** Add objective 11 (between "Review diplomatic pressure" and "Survive"): "Consult your commander — open the AI Advisor panel." Highlight: AiAdvisorPanel button.
- **v0.5.2 Phase 2 Task 2.2:** Add highlight target #10: AI Advisor button in TopToolbar.

---

## Finding 6: Audio Hooks Missing from Tutorial (GAP — v0.5.2 before v0.5.3)

**Problem:** Tutorial (v0.5.2) ships before Audio (v0.5.3). Tutorial completion, objective advancement, and highlight appearance would benefit from SFX — but audio doesn't exist yet. When audio is added later, tutorial integration needs to be retroactively wired.

**Fix:** v0.5.2 should define audio hook points (function calls to a no-op `playTutorialSFX()`) that v0.5.3 can fill in. This is cleaner than v0.5.3 modifying tutorial components.

**Plan changes:**
- **v0.5.2 Phase 2:** TutorialOverlay calls `AudioEngine.playSFX('tutorial_objective_complete')` and `AudioEngine.playSFX('tutorial_hint')`. Since AudioEngine doesn't exist yet, import conditionally or call through an optional global. Simplest: `window.__audioEngine?.playSFX('tutorial_complete')` — v0.5.3 registers it.
- **v0.5.3 Phase 1 Task 1.3:** Add 2 tutorial-specific SFX to manifest: `tutorial_objective_complete`, `tutorial_hint`.

Actually — better approach: **v0.5.2 just doesn't call audio at all.** v0.5.3 Phase 2 already wires SFX to various UI interactions. Add tutorial SFX wiring there. This is the simpler solution — no conditional imports, no globals.

**Revised plan changes:**
- **v0.5.3 Phase 2 Task 2.2:** Add tutorial SFX wiring: objective complete → `tutorial_objective_complete`, hint appear → `tutorial_hint`. Add to manifest in Phase 1 Task 1.3.

---

## Finding 7: Event System as Tutorial Delivery (OPPORTUNITY — v0.5.2 + v0.4.1)

**Problem:** v0.5.2 creates a bespoke tutorial objective system (`tutorial_objectives.ts`). But the event system (v0.4.1, 41 events live) already has trigger conditions, player response options, and modal display. Tutorial objectives are conceptually similar to "guided events."

**Assessment:** Using the event system for tutorial delivery would reduce new code and teach the player the event system organically. However, tutorial objectives need UI highlighting and sequential gating — features the event system doesn't have. **Verdict: keep separate systems.** The tutorial overlay (highlight, spotlight, sequential objectives) is fundamentally different from the event system (narrative modals, mechanical effects). Trying to merge them would over-engineer the event system.

**No plan changes.** Noted as considered-and-rejected.

---

## Finding 8: Music Cues from Events (OPPORTUNITY — v0.5.3 + v0.4.1)

**Problem:** v0.5.3 music transitions based on game phase (peace/war/intense/diplomatic/verdict). But dramatic events (Srebrenica, NATO bombing, Sarajevo siege intensification) should trigger musical shifts independent of the game phase. Currently, events can't affect the music system.

**Fix:** Add optional `music_cue?: MusicId` field to event definitions. When an event fires with a music cue, the music manager temporarily plays that cue (30-second override, then fade back to ambient).

**Plan changes:**
- **v0.5.3 Phase 3 Task 3.1:** Music state machine supports `event_override` state — when an event fires with `music_cue`, temporarily play that track. Auto-revert after 30 seconds.
- **v0.5.3 Phase 3 Task 3.2:** Wire EventModal.tsx: if event has `music_cue`, call music manager on modal open.
- Add to event data: Srebrenica (war_intense), NATO bombing (war_intense), Dayton (diplomatic). ~5 events get music cues.

---

## Finding 9: AAR Should Use Briefing Collector (CONSISTENCY — v0.5.4 + v0.5.1)

**Problem:** v0.5.4 Phase 1 Task 1.4 modifies CommandBriefingLayer directly to show AARs. But v0.5.1 Phase 2 established the sim-side briefing collector pattern. AARs should be a briefing section, not a direct UI modification.

**Fix:** AARs feed through the briefing system. Add `collectAARBriefing` as a 7th section in the sim-side collector. The collector checks `state.military.battle_aars` and produces briefing items.

**Plan changes:**
- **v0.5.4 Phase 1 Task 1.4:** Instead of modifying CommandBriefingLayer, add `collectAARBriefing` to `collect_briefing.ts`. The briefing system renders AARs as a "VII. Field Reports" section. Direct access via OperationDetail and OfficerProfile remains (those read from `state.military.battle_aars` directly, not through briefing).

---

## Finding 10: Decision Narrator ↔ Command Briefing Overlap (CONSISTENCY — v0.5.4 + v0.5.1)

**Problem:** v0.5.4 Phase 3 creates `decision_narrator.ts` — template-based text generation that converts structured AI decisions into readable English ("Gen. Talić orders 1st Krajina Corps..."). The v0.5.1 command briefing `collectMilitaryBriefing` does similar work (converting battle results and operation status into human-readable briefing items). These are parallel template systems.

**Fix:** The decision narrator should use the same `BriefingItem` type from the briefing system. AutoPlayScreen's rolling log renders BriefingItems — which are the same type the briefing system already knows how to display.

**Plan changes:**
- **v0.5.4 Phase 3 Task 3.4:** `decision_narrator.ts` produces `BriefingItem[]` (not custom types). AutoPlayScreen renders them using the same component that CommandBriefingLayer uses for its items.

---

## Finding 11: Help Content ↔ Codex Content Overlap (DUPLICATION — v0.5.2 internal)

**Problem:** v0.5.2 Phase 3 creates `help_content.ts` (~40-50 help entries) and Phase 4 creates `codex_entries.ts` (~60 codex entries). Both explain "what is morale?", "what is IVP?", "how do operations work?" — massive content overlap.

**Fix:** Help entries should be derived from codex entries. Each codex entry has a `summary` (1-2 sentences) that IS the help tooltip. `help_content.ts` becomes a thin mapping: `help_id → codex_entry_id`. The HelpTooltip shows the codex summary + "Learn more →" link.

**Plan changes:**
- **v0.5.2 Phase 4 Task 4.2:** Each codex entry includes a `summary: string` (1-2 sentences). This summary is the canonical short explanation.
- **v0.5.2 Phase 3 Task 3.2:** `help_content.ts` maps `help_id → { codex_entry_id, override_body? }`. Default: use codex summary. Override: custom text when the codex summary isn't right for a tooltip context. This eliminates ~80% of duplicate content authoring.
- **Execution order swap within v0.5.2:** Phase 4 (Codex) should run BEFORE Phase 3 (Help System) since help derives from codex. Renumber: Phase 3 → Phase 4, Phase 4 → Phase 3.

---

## Finding 12: Auto-Play as Tutorial Alternative (OPPORTUNITY — v0.5.4 + v0.5.2)

**Problem:** The tutorial (v0.5.2) is a guided 10-turn scenario. Auto-play (v0.5.4) is a spectator mode. Experienced strategy gamers might prefer watching a full game before playing, rather than a hand-held tutorial. These complement each other as onboarding paths.

**Fix:** In ScenarioSelectionScreen, present both options: "Play Tutorial (10 turns, guided)" and "Watch AI Game (full war, spectator)." First-time players see a prompt: "New to A War Without Victory? Try the Tutorial or Watch an AI game first."

**Plan changes:**
- **v0.5.4 Phase 3 Task 3.3:** ScenarioSelectionScreen shows "Watch AI Play" as an onboarding option alongside "Tutorial" when the player has never completed a game.

---

## Summary of Recommended Changes

| # | Finding | Severity | Plans Affected | Change |
|---|---------|----------|----------------|--------|
| 1 | Command briefing built twice | **CONFLICT** | v0.5.0, v0.5.1 | Delete v0.5.0 Phase 4; merge into v0.5.1 Phase 2 |
| 2 | Capital bars duplicated | DUPLICATION | v0.5.0 | Extract shared CapitalBarChart.tsx |
| 3 | Peace/Dayton share UI patterns | OPPORTUNITY | v0.5.0 | Extract NegotiationResponseCard.tsx |
| 4 | Save browser ordering | ORDERING | v0.5.1 | Move SaveBrowser to Phase 3 |
| 5 | Tutorial misses advisor | OPPORTUNITY | v0.5.2 | Add 11th objective: "Ask your advisor" |
| 6 | Audio hooks in tutorial | GAP | v0.5.3 | Add tutorial SFX to v0.5.3 Phase 2 |
| 7 | Event system for tutorial | REJECTED | — | Keep separate (different UI paradigms) |
| 8 | Music cues from events | OPPORTUNITY | v0.5.3 | Add music_cue field to events |
| 9 | AAR through briefing system | CONSISTENCY | v0.5.4 | Use collectAARBriefing, not direct UI mod |
| 10 | Decision narrator ↔ briefing | CONSISTENCY | v0.5.4 | Narrator outputs BriefingItem[] type |
| 11 | Help ↔ codex content overlap | DUPLICATION | v0.5.2 | Help derives from codex summaries; swap phase order |
| 12 | Auto-play as tutorial alt | OPPORTUNITY | v0.5.4, v0.5.2 | Offer both in onboarding prompt |

---

## Revised Execution Order

No milestone reordering needed. Internal phase reordering within v0.5.2:

```
v0.5.0: Phase 1 (PeacePlan) → Phase 2 (Dayton) → Phase 3 (Capital/Patron) → Phase 4 (Embargo)
         [Phase 4 deleted — briefing moved to v0.5.1]

v0.5.1: Phase 1 (Legends) → Phase 2 (Briefing — now includes diplomatic+humanitarian) →
         Phase 3 (Menu + SaveBrowser) → Phase 4 (Settings) → Phase 5 (Panel Polish)

v0.5.2: Phase 1 (Tutorial Scenario — 11 objectives) → Phase 2 (Tutorial UI) →
         Phase 3 (Codex — MOVED UP) → Phase 4 (Help System — derives from codex)

v0.5.3: Phase 1 (Engine) → Phase 2 (SFX — includes tutorial SFX) →
         Phase 3 (Music — includes event cues) → Phase 4 (Settings)

v0.5.4: Phase 1 (AAR — via briefing collector) → Phase 2 (Post-game) →
         Phase 3 (Auto-play — BriefingItem narrator, onboarding option) → Phase 4 (Advisor)
```

---

## Shared Components Registry

Components created in earlier milestones that later milestones MUST reuse:

| Component | Created In | Reused By |
|-----------|-----------|-----------|
| `GlassPanel.tsx` | Infrastructure (done) | All new panels/modals |
| `CapitalBarChart.tsx` | v0.5.0 Phase 3 | v0.5.1 Phase 5 (VerdictScreen refactor) |
| `NegotiationResponseCard.tsx` | v0.5.0 Phase 1 | v0.5.0 Phase 2 (Dayton), v0.5.4 Phase 3 (Auto-play Dayton) |
| `collect_briefing.ts` | v0.5.1 Phase 2 | v0.5.4 Phase 1 (AAR section) |
| `BriefingItem` type | v0.5.1 Phase 2 | v0.5.4 Phase 3 (decision narrator) |
| `codex_entries.ts` (summaries) | v0.5.2 Phase 3 | v0.5.2 Phase 4 (help tooltips derive from it) |
| `AudioEngine` singleton | v0.5.3 Phase 1 | v0.5.3 Phases 2-4, v0.5.2 Phase 2 (retroactive) |
| `settings_store.ts` | v0.5.1 Phase 4 | v0.5.3 Phase 4 (audio persistence) |

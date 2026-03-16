# Cross-Plan Review: v0.6.0 – v0.6.4

**Date:** 2026-03-16
**Reviewer:** Orchestrator
**Plans reviewed:**
1. `v0.6.0` — Full Historical Event Set
2. `v0.6.1` — Balance & Calibration Framework
3. `v0.6.2` — Campaign Structure & Achievements
4. `v0.6.3` — AI Dynamic Content
5. `v0.6.4` — Historical Essays

---

## Finding 1: Event Chains Feed Achievements (OPPORTUNITY — v0.6.0 + v0.6.2)

**Problem:** v0.6.0 adds event chains (one event triggers another). v0.6.2 defines achievements. Some achievements should unlock from event chain completions (e.g., "Witness all 3 Markale massacre events", "Complete the Corridor 92 event chain"). Currently achievements only check CampaignStatistics, not event history.

**Fix:** Achievement checks should also access `state.events.fired_event_ids`. Add achievement type: `event_chain_complete: { required_events: string[] }`.

**Plan changes:**
- **v0.6.2 Phase 3 Task 3.2:** Add 3-5 event-chain achievements (e.g., "Chronicle of Siege" — witness all Sarajevo siege events, "Corridor Veteran" — witness all Corridor 92 events). Check via `fired_event_ids`.

---

## Finding 2: Calibration Baseline Must Include Events (DEPENDENCY — v0.6.0 → v0.6.1)

**Problem:** v0.6.0 adds 60+ new events with mechanical effects (morale, supply, patron pressure). v0.6.1 calibrates the game. The calibration must account for event effects — they shift faction power curves. Running v0.6.1 before v0.6.0 would calibrate against the wrong event set.

**Assessment:** Execution order is already correct (v0.6.0 → v0.6.1). But v0.6.1 Phase 2 (iterative calibration) must explicitly include an "events ON vs events OFF" comparison to isolate event impact.

**Plan changes:**
- **v0.6.1 Phase 2:** Add task: "Run benchmark suite with events disabled (skip event evaluation step). Compare against events-enabled run. Document net event impact on territory/casualties/IVP. If impact >3%, events need effect tuning before calibration proceeds."

---

## Finding 3: Essays Derive from Events (SHARED DATA — v0.6.0 + v0.6.4)

**Problem:** v0.6.4 essays correspond 1:1 to events from v0.6.0. The essay generation script reads event definitions to build prompts. If event IDs, titles, or descriptions change during v0.6.1 calibration, essays become stale.

**Fix:** v0.6.4 must run AFTER v0.6.1 (calibration may adjust event timings). The plan already has this ordering. But add a note: if event definitions change during calibration, re-run essay generation for affected events.

**Plan changes:**
- **v0.6.4 Phase 1 Task 1.1:** Add note: "If events were modified during v0.6.1 calibration, re-generate essays for changed events only (manifest tracks generation date vs event last-modified)."

---

## Finding 4: Procedural Events Must Not Break Calibration (CRITICAL — v0.6.3 vs v0.6.1)

**Problem:** v0.6.3 adds AI-generated procedural events with mechanical effects. v0.6.1 calibrated the game WITHOUT procedural events. Procedural events could shift faction power curves unpredictably — especially if the AI generates events that consistently favor one faction.

**Fix:** Procedural events are calibration-neutral by design (effects bounded at morale ±5, supply ±10). But the cumulative effect over 188 turns could be significant. Add a calibration guard: after v0.6.3, re-run v0.6.1 benchmarks with procedural events enabled. If regression >2%, tighten bounds or reduce frequency.

**Plan changes:**
- **v0.6.3 Phase 3 Task 3.1:** Add explicit step: "Re-run `npm run calibrate:52w` with AI mode Commander. Compare against v0.6.1 baseline. If any benchmark regresses >2%, tighten effect bounds or reduce procedural event frequency."

---

## Finding 5: Campaign Statistics Feed AI Analysis (OPPORTUNITY — v0.6.2 + v0.5.4)

**Problem:** v0.6.2 creates `CampaignStatistics` with rich aggregated data. v0.5.4 post-game analysis prompts the AI with war summary data. The post-game analysis prompt should use `CampaignStatistics` (richer, aggregated) rather than raw state fields.

**Fix:** v0.5.4 post-game analysis prompt builder should check for `campaign_stats` and use it if available.

**Plan changes:**
- **v0.6.2 Phase 1 Task 1.3:** Add note: "After campaign_stats computation, also pass to `generatePostGameAnalysis()` prompt builder (v0.5.4). The richer statistics produce better AI analysis."

This is a backwards-compatible enhancement — v0.5.4 works without campaign_stats, v0.6.2 just makes it better.

---

## Finding 6: Achievement Gallery + Essay Collection = Meta-Progression (OPPORTUNITY)

**Problem:** v0.6.2 has achievement gallery (25-30 achievements) and v0.6.4 has essay collection (60-80 essays). Both are "collect through gameplay" systems. They should feel unified.

**Fix:** Create a shared "Collection" screen accessible from MainMenu that shows: achievement progress (15/28), essay progress (42/67), and combined completion percentage. This is a small UI wrapper, not a new system.

**Plan changes:**
- **v0.6.4 Phase 2:** Add task: "Create CollectionOverview widget in MainMenu showing combined achievement + essay progress. Links to AchievementGallery and Codex Essays respectively."

---

## Finding 7: Negotiation Dialogue Reuses Leader Profiles (CONSISTENCY — v0.6.3 + v0.4.5)

**Problem:** v0.6.3 creates `leader_profiles.ts` with Milošević/Izetbegović/Tuđman/Karadžić/Boban personality prompts. v0.4.5 already has `personality_profiles.ts` with Mladić/Halilović/Delić/Petković military commander profiles. These are related but different systems (political leaders vs military commanders).

**Assessment:** They should be separate files — political leaders negotiate, military commanders fight. But they should share format consistency (same prompt structure, same personality trait schema).

**Plan changes:**
- **v0.6.3 Phase 2 Task 2.2:** Use same personality schema as v0.4.5 `personality_profiles.ts`: `{ name, faction, role, system_prompt, negotiation_priorities?, red_lines?, flexibility_curve? }`. Extend, don't duplicate.

---

## Finding 8: v0.6.1 Phase 2 Cannot Be Autonomous (PROCESS — night shift limitation)

**Problem:** v0.6.1 Phase 2 (iterative calibration) requires human judgment — War-or-Game sign-off, root cause analysis, and one-change-per-run protocol. This CANNOT be delegated to the night shift.

**Assessment:** Plan already flags this. But the handoff should explicitly mark Phase 2 as DAY SHIFT ONLY.

**Plan changes:**
- **Night shift handoff:** v0.6.1 Phases 1 + 3 are night-shift eligible. Phase 2 is day-shift ONLY. Night shift should skip to v0.6.2 after completing Phase 1, leaving Phase 2 for day shift.

---

## Summary of Recommended Changes

| # | Finding | Severity | Plans Affected | Change |
|---|---------|----------|----------------|--------|
| 1 | Event chains feed achievements | OPPORTUNITY | v0.6.0, v0.6.2 | Add event-chain achievements |
| 2 | Calibration must include events | DEPENDENCY | v0.6.1 | Add events ON/OFF comparison step |
| 3 | Essays derive from events | SHARED DATA | v0.6.4 | Re-generate if events change |
| 4 | Procedural events vs calibration | **CRITICAL** | v0.6.3, v0.6.1 | Post-v0.6.3 calibration regression check |
| 5 | Campaign stats enrich AI analysis | OPPORTUNITY | v0.6.2, v0.5.4 | Pass campaign_stats to post-game prompt |
| 6 | Achievement + essay meta-progression | OPPORTUNITY | v0.6.2, v0.6.4 | Unified Collection overview |
| 7 | Leader profiles share schema | CONSISTENCY | v0.6.3, v0.4.5 | Use same personality schema |
| 8 | Calibration Phase 2 not autonomous | PROCESS | v0.6.1 | Mark Phase 2 as day-shift only |

---

## Revised Execution Order

```
NIGHT SHIFT:
  v0.6.0 (events — all phases)
  v0.6.1 Phase 1 (calibration tooling)
  v0.6.2 (campaign + achievements — all phases)
  v0.6.3 (AI dynamic content — all phases)
  v0.6.4 Phases 1-2 (essay generation + integration)

DAY SHIFT (requires human):
  v0.6.1 Phase 2 (iterative calibration — interactive)
  v0.6.1 Phase 3 (multi-scenario verification)
  v0.6.3 Phase 3 Task 3.1 addition (post-AI calibration regression check)
  v0.6.4 Phase 3 (fact-check + sensitivity review)
```

This maximizes night shift throughput while reserving judgment-intensive work for day shift.

---

## Cross-Series Dependencies (v0.5.x → v0.6.x)

| v0.6.x System | Depends On (v0.5.x) |
|---------------|---------------------|
| Event chains (v0.6.0) | Event engine (v0.4.1) |
| Calibration tools (v0.6.1) | All v0.5.x systems must be stable |
| Campaign statistics (v0.6.2) | Save metadata (v0.5.1), existing state fields |
| Achievement notifications (v0.6.2) | Audio SFX (v0.5.3) for unlock sound |
| Procedural events (v0.6.3) | AI client (v0.4.5), event guardrails (new) |
| Negotiation dialogue (v0.6.3) | Dayton UI (v0.5.0), AI prompt builder (v0.4.5) |
| Essay display (v0.6.4) | Codex (v0.5.2), EventModal (v0.4.1) |
| Essay unlock tracking (v0.6.4) | Save system (v0.5.1) |

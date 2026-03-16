# Full Roadmap Integration Review: v0.5.0 → v1.0.0

**Date:** 2026-03-16
**Reviewer:** Orchestrator
**Scope:** All 20 milestones viewed as a single product journey. Focuses on themes that span the ENTIRE roadmap — not individual milestone issues (those are in the 4 series-level reviews).

**Prior reviews (not repeated here):**
- `CROSS_PLAN_REVIEW_V05.md` — 12 intra-v0.5.x findings
- `CROSS_PLAN_REVIEW_V06.md` — 8 intra-v0.6.x findings
- `CROSS_PLAN_REVIEW_V05_V06_INTEGRATED.md` — 12 cross-series findings
- `CROSS_PLAN_REVIEW_V07_V10.md` — 8 polish-to-ship findings

---

## Theme 1: The Content Dependency Chain

Content flows downstream through the entire roadmap:

```
Events (v0.4.1, expanded v0.6.0)
  ↓ trigger
Essays (v0.6.4) — one essay per major event
  ↓ populate
Codex "Historical Essays" category (v0.5.2 + v0.6.4)
  ↓ summary field feeds
Help Tooltips (v0.5.2) — derived from codex summaries
  ↓ referenced by
Tutorial objectives (v0.5.2) — "Respond to events", "Review diplomatic pressure"
  ↓ taught through
Localized content (v0.7.2) — all of the above translated to BCS
  ↓ fact-checked in
English polish (v0.7.2) — final text review
  ↓ showcased in
Store page screenshots + descriptions (v0.9.1)
```

**Problem:** This is a 7-step pipeline. A change at any step invalidates everything downstream. If v0.6.0 changes event titles, essays reference wrong events, codex entries are stale, help tooltips are wrong, BCS translations are stale, and store screenshots show outdated text.

**Fix:** Establish a **content freeze schedule**:

| Freeze | After Milestone | What's Frozen |
|--------|----------------|---------------|
| **Event freeze** | v0.6.1 | Event IDs, titles, trigger weeks, effect types. New events only via post-1.0. |
| **Content freeze** | v0.6.4 | All text content: events, essays, codex, help, achievements, UI labels. |
| **Feature freeze** | v0.6.4 | No new game mechanics or systems. |
| **Text freeze** | v0.7.2 | All English text finalized. BCS translation complete. No more string changes. |
| **Code freeze** | v0.9.0 | Only P0 bug fixes. No refactoring, no "improvements." |

**Plan changes:**
- **v0.6.1 completion:** Announce event freeze. No event definition changes after this point (only effect tuning during calibration).
- **v0.6.4 completion:** Announce content freeze + feature freeze. This is THE milestone where the game's content is locked.
- **v0.7.2 completion:** Announce text freeze. No string changes after this point.
- **v0.9.0 completion:** Announce code freeze. Only emergency fixes through v1.0.

---

## Theme 2: The Registry Pattern Is Load-Bearing

Seven systems use the registry pattern established in v0.5.x:

| Registry | Created | Consumers (milestones that push onto it) |
|----------|---------|----------------------------------------|
| Briefing collectors | v0.5.1 | v0.5.4, v0.6.0, v0.6.2 |
| Settings sections | v0.5.1 | v0.5.3, v0.6.3, v0.7.1, v0.7.2 |
| SFX manifest | v0.5.3 | v0.6.2, v0.6.4 |
| VerdictScreen tabs | v0.5.0 | v0.5.4, v0.6.2, v0.6.4 |
| MainMenu slots | v0.5.1 | v0.5.2, v0.6.2, v0.6.4 |
| GameFlow modal queue | v0.5.1 | v0.5.2, v0.6.3 |
| Codex categories | v0.5.2 | v0.6.0, v0.6.4 |

**Problem:** If ANY of these registries is implemented wrong in v0.5.x (e.g., as a hardcoded array instead of a register function), every subsequent consumer milestone must refactor it first. The registry pattern is the architectural foundation — and it must work on the first try.

**Fix:** v0.5.x plans should include **integration tests for each registry**:
- Test: register a mock collector/section/tab, verify it appears
- Test: register 5 items, verify ordering
- Test: register after init (late registration for lazy-loaded modules)

**Plan changes:**
- **v0.5.1 Phase 2 (briefing):** Add test: `registerBriefingCollector` works, items appear in output.
- **v0.5.1 Phase 3 (settings):** Add test: `registerSettingsSection` renders registered sections.
- **v0.5.0 Phase 2 (verdict):** Add test: `registerVerdictTab` shows tabs in post-game screen.
- **v0.5.3 Phase 1 (SFX):** Add test: `registerSFX` adds sound to manifest, `playSFX` finds it.

---

## Theme 3: External Dependencies Are the True Blockers

The roadmap assumes all code work is the bottleneck. But several milestones are blocked by external resources that cannot be night-shifted:

| Dependency | Needed By | Status | Risk |
|------------|-----------|--------|------|
| **Visual assets** (event illustrations, HQ art, portraits) | v0.6.0 events, v0.7.3 polish, v0.9.1 screenshots | User + Gemini Pro (external) | **HIGH** — events ship with gradient placeholders. Store screenshots need final art. |
| **Audio assets** (SFX + music) | v0.5.3+ | Not started | **MEDIUM** — placeholder beeps work but store trailer needs real audio. |
| **Apple Developer account** ($99/yr) | v0.8.2 Mac build | Unknown | **HIGH if Mac is launch target.** Without it, Mac build is blocked. |
| **Steam Steamworks approval** | v0.8.2 Phase 4 | Not applied | **MEDIUM** — can launch standalone first, add Steam later. |
| **10-20 playtesters** | v0.8.0 | Not recruited | **MEDIUM** — 2-week lead time to recruit and distribute. |
| **BCS native speaker** | v0.7.2 Phase 2 review | Not identified | **MEDIUM** — AI drafts BCS, but human review is mandatory for quality. |

**Fix:** Create a **parallel workstream tracker** for external dependencies. These run alongside the code milestones, not after them.

**Recommended timeline:**
```
NOW (v0.4.6):
  - User: continue visual asset generation (Gemini Pro)
  - User: source audio assets (freesound.org, royalty-free libraries)
  - User: decide on Apple Developer account

By v0.6.0:
  - Event illustrations for at least 20 major events (Srebrenica, Corridor, Dayton, etc.)
  - Audio: at least SFX placeholders replaced with real sounds

By v0.7.2:
  - Identify BCS reviewer (friend, freelancer, community volunteer)

By v0.8.0:
  - Recruit 10-20 playtesters (Reddit, Discord, personal network)
  - Apple Developer account active (if Mac is launch target)

By v0.8.2:
  - Apply for Steamworks (if Steam launch planned)

By v0.9.1:
  - All visual assets finalized (store screenshots, trailer footage)
  - Audio: all music tracks replaced with real compositions
```

**Plan changes:**
- Add to `nightshift-handoff.md`: "External dependency tracker is the user's responsibility. Night shift works code only."
- **v0.7.3 Phase 2 Task 2.4** already flags warroom art. Reinforce: "If placeholder art still present, store screenshots will look unprofessional. User must deliver final art before v0.9.1."

---

## Theme 4: GameState Schema Migration Across 20 Milestones

Fields added to GameState across the roadmap:

| Milestone | New Field(s) | Type |
|-----------|-------------|------|
| v0.5.1 | `last_briefing` | CommandBriefing |
| v0.5.2 | `meta.tutorial_state` | TutorialState |
| v0.5.4 | `military.battle_aars` | BattleAAR[] |
| v0.6.0 | `events.scheduled_chains` | ScheduledChain[] |
| v0.6.2 | `campaign_stats`, `per_turn_snapshots`, `meta.achievements`, `playtime_seconds` | Various |
| v0.6.4 | `unlocked_essays` | string[] |

**Problem:** 10+ new fields across 6 milestones. A save from v0.5.0 loaded at v0.6.4 is missing 8 fields. Each field needs a default. But there's no centralized migration layer — each field silently defaults to `undefined` and each consumer does its own null check. This works but is fragile. One missed null check = crash on old save.

**Fix:** Create a **save migration registry** (yes, another registry):

```typescript
// src/state/save_migration.ts
interface Migration { version: string; migrate: (state: any) => void; }
const migrations: Migration[] = [];
export function registerMigration(m: Migration) { migrations.push(m); }
export function migrateState(state: any): GameState {
    for (const m of migrations) {
        if (semver.lt(state.meta?.game_version || '0.4.6', m.version)) {
            m.migrate(state);
        }
    }
    return state as GameState;
}
```

Each milestone registers its migration: "if loading a save from before v0.5.1, set `last_briefing = null`." Central, explicit, testable.

**Plan changes:**
- **v0.5.0 Phase 1:** Before any new GameState fields, create `src/state/save_migration.ts` with the registry pattern. This is a 30-line prerequisite that prevents 20 milestones of ad-hoc null checks.
- **Every milestone adding GameState fields:** Register a migration. Test: load a v0.4.6 save, verify all new fields get defaults.
- **v0.6.2 Phase 4 Task 4.1:** Save metadata wrapper includes `game_version`. Migration system reads this to decide which migrations to apply.
- **v0.9.0 Phase 1 Task 1.4:** Save compatibility test loads saves from v0.5.0, v0.6.0, v0.7.0, v0.8.0 — verifies migration chain works end-to-end.

---

## Theme 5: The AI Cost Model Needs a Budget

AI features span v0.4.5 through v0.6.3. Total cost per game if everything is enabled:

| Feature | Model | Cost/Game | Milestone |
|---------|-------|-----------|-----------|
| Army Commander AI | Sonnet | ~$2-5 | v0.4.5 |
| Corps Commander AI | Haiku | ~$1-3 | v0.4.5 |
| AARs (50-100 battles) | Haiku | ~$0.25-0.50 | v0.5.4 |
| Post-game analysis | Sonnet | ~$0.10 | v0.5.4 |
| Player advisor (10 queries) | Haiku | ~$0.10 | v0.5.4 |
| Procedural events (~50) | Haiku | ~$1.88 | v0.6.3 |
| Dayton dialogue (3 rounds × 5 plans) | Sonnet | ~$0.75-3.00 | v0.6.3 |
| **Total (Commander tier)** | | **~$6-15/game** | |

**Problem:** $6-15 per game is significant. A player who plays 10 campaigns spends $60-150 on API calls. This exceeds the game price (€19.99). The pricing model (from `PRICING_AND_BUSINESS_MODEL.md`) mentions "Pyrrhic Credits" but no plan implements credit purchasing or cost management.

**Fix:** Two approaches (ARCHITECT DECISION):

**Option A — BYOK only (simpler):** Player provides their own Anthropic API key. Cost is theirs. Game displays estimated cost in AiSettingsPanel. No Pyrrhic Credits system. This is what v0.4.5 already implements.

**Option B — Pyrrhic Credits:** Pre-purchased credits via Stripe/payment. Pyrrhic Games proxies API calls. Revenue share with Anthropic. Requires: payment infrastructure, server backend, account system. Significant scope.

**Pre-decision: Option A for v1.0 launch.** BYOK is already implemented. Pyrrhic Credits are a post-1.0 business model expansion. The game works without AI (Cadet Mode). AI is premium opt-in.

**Plan changes:**
- **v0.6.3 Phase 3 Task 3.3 (cost audit):** Verify total cost with Commander tier enabled. If >$15/game, reduce procedural event frequency or switch dialogue to Haiku.
- **v0.9.1 Phase 1 Task 1.1:** Store page description must clearly state: "AI features optional. Requires Anthropic API key. Estimated cost: $5-15 per full campaign at Commander tier."

---

## Theme 6: The Testing Pyramid Has a Gap

| Test Level | Count (v0.4.6) | Coverage | Gap |
|------------|----------------|----------|-----|
| Unit tests | 927 | Individual functions, modules | Good |
| Integration tests | ~10 (scenario proofs) | Scenario runner end-to-end | **Narrow** — only tests sim, not UI |
| UI tests | 0 | Components, panels, modals | **Missing** — no component tests |
| End-to-end tests | 0 | Full app (Electron + map + sim) | **Missing** — no Playwright/Cypress |
| Manual tests | Ad hoc | Developer playtesting | Insufficient for launch |

**Problem:** 927 unit tests is excellent for the simulation. But v0.5.x adds 20+ UI components, v0.7.1 adds accessibility features, and v0.9.0 expects a "full regression test." Without UI tests, regression means manual clicking through every panel — slow, error-prone, and not automatable.

**Fix:** Add a basic UI test layer. Not exhaustive — just enough to catch component-level regressions.

**Recommended approach:**
- **Vitest + React Testing Library** for component tests (renders component, checks output)
- ~30-50 component tests covering: panel renders without error, modal opens/closes, form submissions work
- NOT full E2E tests (Playwright/Cypress is heavy for a single-developer project)
- Add incrementally: each v0.5.x milestone adds 5-10 component tests for its new components

**Plan changes:**
- **v0.5.0 Phase 1:** Add `@testing-library/react` to dev dependencies. Create first component test: PeacePlanModal renders with mock data.
- **All v0.5.x plans:** Each phase that creates a UI component adds 1-2 component tests: renders without crash, key interactions work.
- **v0.9.0 Phase 1 Task 1.1:** "All 900+ tests" should include component tests. Explicitly count: "XXX unit + YYY component tests."

---

## Theme 7: The Night Shift / Day Shift Boundary Is the Project's Superpower

Mapping the full roadmap by execution mode:

```
NIGHT SHIFT (autonomous, code-heavy):
  v0.5.0-v0.5.4  (5 milestones — systems + UI)
  v0.6.0          (events — content authoring)
  v0.6.1 Phase 1  (calibration tooling)
  v0.6.2          (campaign + achievements)
  v0.6.3          (AI dynamic content)
  v0.6.4 Ph 1-2   (essay generation + integration)
  v0.7.0          (performance)
  v0.7.1          (accessibility)
  v0.7.2 Phase 1  (i18n infrastructure)
  v0.7.3 Ph 1-2   (loading, transitions, icons)
  v0.8.2 Ph 1-3   (platform builds)
  v0.9.0 Phase 1  (automated regression)
  ────────────────────────────────────────
  ~16 milestone-equivalents autonomous

DAY SHIFT (human judgment, user involvement):
  v0.6.1 Ph 2-3   (calibration tuning + verification)
  v0.6.4 Phase 3  (essay fact-check + sensitivity)
  v0.7.2 Ph 2-3   (BCS review + English polish)
  v0.7.3 Phase 3  (visual review)
  v0.8.0           (playtesting — recruit, distribute, analyze)
  v0.8.1           (balance from feedback)
  v0.8.2 Phase 4   (Steam — needs account)
  v0.9.0 Ph 2-3   (bug triage + production perf)
  v0.9.1           (store page, trailer, press kit, community)
  v1.0.0           (launch day)
  ────────────────────────────────────────
  ~10 milestone-equivalents human-driven
```

**Insight:** The roadmap naturally front-loads autonomous work and back-loads human work. This is correct — the night shift builds the game, the day shift polishes and ships it. But it means **the last 30% of the roadmap takes disproportionately more wall-clock time** because it's human-limited.

**Plan change:** None needed. Just awareness: v0.5.0 through v0.7.1 can theoretically execute in 3-4 night shifts. v0.8.0 through v1.0.0 takes weeks of real time (playtester scheduling, store approval, review copies).

---

## Theme 8: What Could Be Cut Without Losing the Core?

If time pressure forces scope reduction, here's what's essential vs expendable:

| Priority | Milestones | Why |
|----------|-----------|-----|
| **ESSENTIAL** | v0.5.0, v0.5.1, v0.6.1, v0.8.2, v0.9.0, v1.0.0 | Diplomacy UI, menu/settings, calibration, builds, QA, ship |
| **HIGH** | v0.5.2, v0.6.0, v0.6.2, v0.7.0, v0.8.0 | Tutorial, events, achievements, performance, playtesting |
| **MEDIUM** | v0.5.3, v0.7.1, v0.7.3, v0.8.1, v0.9.1 | Audio, accessibility, visual polish, final balance, marketing |
| **DEFERRABLE** | v0.5.4, v0.6.3, v0.6.4, v0.7.2 | AI narrative, procedural events, essays, localization |

**Minimum viable ship (12 milestones):**
```
v0.5.0 → v0.5.1 → v0.5.2 → v0.6.0 → v0.6.1 → v0.6.2 →
v0.7.0 → v0.8.0 → v0.8.1 → v0.8.2 → v0.9.0 → v1.0.0
```
This gives a game with: interactive diplomacy, menus, tutorial, full events, calibrated balance, achievements, good performance, playtested, and packaged. No audio, no AI narrative, no essays, no localization, no accessibility — but a shippable product.

**This is NOT a recommendation to cut.** It's a risk mitigation map. If the project is on track, ship the full 20. If behind, know what to defer to v1.1+.

---

## Theme 9: The 11th Architectural Pattern — Save Migration

Adding to the 10 patterns from the cross-series review:

| # | Pattern | Created | Purpose |
|---|---------|---------|---------|
| 1-10 | (from CROSS_PLAN_REVIEW_V05_V06_INTEGRATED.md) | v0.5.x | Extension without modification |
| **11** | **Save migration registry** | **v0.5.0** | Explicit, versioned field defaults for old saves |

This pattern is used by: every milestone that adds GameState fields (6 milestones), tested by: v0.8.1 (compatibility), v0.9.0 (regression).

---

## Summary of Full-Roadmap Findings

| # | Theme | Type | Impact |
|---|-------|------|--------|
| 1 | Content dependency chain (7 steps) | **PROCESS** | Content freeze schedule: events → content → text → code |
| 2 | Registry pattern is load-bearing (7 registries) | **ARCHITECTURE** | Integration tests for each registry in v0.5.x |
| 3 | External dependencies are true blockers | **RISK** | Parallel workstream tracker for art/audio/accounts/testers |
| 4 | GameState grows across 6 milestones | **ARCHITECTURE** | Save migration registry (11th pattern) in v0.5.0 |
| 5 | AI costs $6-15/game | **BUSINESS** | BYOK for v1.0; store page discloses cost; Pyrrhic Credits post-1.0 |
| 6 | No UI test layer | **QUALITY** | Add React Testing Library; 30-50 component tests across v0.5.x |
| 7 | Night/Day boundary is the superpower | AWARENESS | Last 30% is human-limited wall-clock time |
| 8 | Scope reduction map exists | RISK | 12-milestone MVS (minimum viable ship) identified |
| 9 | Save migration is the 11th pattern | **ARCHITECTURE** | Register migration per milestone, test chain in v0.9.0 |

---

## The Five Freeze Points

The roadmap has five natural freeze points. These are NOT arbitrary — they're the moments where specific categories of change become too risky:

```
┌──────────────────────────────────────────────────────────┐
│  v0.5.0 ──── v0.5.4 ──── v0.6.0 ──── v0.6.1 ──── v0.6.4 │
│   build systems          events     calibrate    content  │
│                                        │            │     │
│                                   EVENT FREEZE  CONTENT + │
│                                                FEATURE    │
│                                                FREEZE     │
│                                                           │
│  v0.7.0 ──── v0.7.2 ──── v0.8.0 ──── v0.9.0 ──── v1.0  │
│   polish      i18n       playtest      QA        SHIP    │
│                │                        │                 │
│           TEXT FREEZE              CODE FREEZE            │
└──────────────────────────────────────────────────────────┘
```

1. **Event freeze** (after v0.6.1): event IDs, titles, triggers locked
2. **Content + Feature freeze** (after v0.6.4): all game content and mechanics locked
3. **Text freeze** (after v0.7.2): all strings locked, translations complete
4. **Code freeze** (after v0.9.0): only P0 emergency fixes
5. **Ship** (v1.0.0): done

---

## Final Recommendation

The roadmap is **coherent, well-sequenced, and risk-aware.** The four prior cross-plan reviews caught the tactical issues (briefing built twice, save browser ordering, etc.). This review catches the strategic issues:

1. **Establish freeze discipline** — the five freeze points prevent late-stage destabilization
2. **Add the 11th pattern** (save migration) — prevents a class of bugs across 6+ milestones
3. **Track external dependencies separately** — code plans won't save us if art/audio/accounts are missing
4. **Add basic UI tests** — 30-50 component tests close the testing gap before playtesting
5. **Disclose AI costs** — players must know before buying

With these in place, the roadmap is executable. The game has a clear path from v0.4.6 to gold.

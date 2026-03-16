# Night Shift Handoff — 2026-03-16

## Plans to Execute (in order)
1. `docs/plans/2026-03-16-v0.5.0-full-diplomatic-system.md` — Wire diplomatic UI: PeacePlanModal, DaytonNegotiationModal, patron gauge, capital display, embargo status
2. `docs/plans/2026-03-16-v0.5.1-ui-completion.md` — Map legends, command briefing sim-side, main menu, settings persistence, panel polish
3. `docs/plans/2026-03-16-v0.5.2-tutorial-onboarding.md` — Tutorial scenario, guided objectives, help tooltips, encyclopedia/codex
4. `docs/plans/2026-03-16-v0.5.3-audio.md` — Audio engine (Howler.js), SFX wiring, music state machine, audio settings
5. `docs/plans/2026-03-16-v0.5.4-ai-narrative-autoplay.md` — After-action reports, post-game analysis, AI auto-play spectator mode, enhanced advisor

## Cross-Plan Review
**READ FIRST:** `docs/30_planning/CROSS_PLAN_REVIEW_V05.md` — 12 findings, all applied to plans. Key changes:
- v0.5.0 Phase 4 (briefing) DELETED — absorbed into v0.5.1 Phase 2
- v0.5.0 creates shared components: CapitalBarChart.tsx, NegotiationResponseCard.tsx
- v0.5.1 SaveBrowser moved to Phase 3 (needed by MainMenu)
- v0.5.2 phases reordered: Codex (Phase 3) before Help (Phase 4) — help derives from codex summaries
- v0.5.2 tutorial has 11 objectives (added "Ask your advisor")
- v0.5.3 adds tutorial SFX + event music cues
- v0.5.4 AAR feeds through briefing collector, narrator outputs BriefingItem[]

## Execution Order
Sequential: v0.5.0 → v0.5.1 → v0.5.2 → v0.5.3 → v0.5.4. Each milestone is a version bump + tag.

If time runs short, priorities are:
- **Must complete:** v0.5.0 + v0.5.1 (the game needs interactive diplomacy and proper UI)
- **Should complete:** v0.5.2 (tutorial is important for onboarding)
- **Nice to have:** v0.5.3 + v0.5.4 (audio and AI narrative are polish)

## Special Instructions
- Each plan has /simplify gates between phases — execute them
- Run `tsc --noEmit` + `npm run test:vitest` after every phase (currently: 80 suites, 927 tests, tsc clean)
- Bump `package.json` version after each milestone (0.5.0, 0.5.1, 0.5.2, 0.5.3, 0.5.4)
- Create git tags after each milestone
- Append to PROJECT_LEDGER.md after each milestone
- Update ROADMAP_TO_1_0.md status table after each milestone
- Codex content (v0.5.2 Phase 4): generate ~60 entries at dev time using your own knowledge of the Bosnian War + game mechanics docs. These ship with the game. Keep factual, cite BB where relevant.
- Audio assets (v0.5.3): generate minimal placeholder files (short tones/beeps). Engine must work with them. Real assets sourced later.
- AI features (v0.5.4): all features must gracefully degrade with no API key. Cadet Mode path must remain untouched.

## DO NOT Touch
- `src/ui/map/components/OpsPlanningModal.tsx` — outside expert is redesigning this
- `src/ui/map/components/SidePickerOverlay.tsx` — user has uncommitted changes
- `src/ui/warroom/` — user has uncommitted changes (warroom.ts, index.html, vite.config.ts)
- `src/ui/map/desktop/campaignRecruitmentActions.ts` — user has uncommitted changes
- `src/ui/map/store/gameStore.ts` — user has uncommitted changes (check for conflicts before modifying)
- `src/ui/map/map/MapContainer.tsx` — user has uncommitted changes (check for conflicts before modifying)

## v0.5.x Architectural Patterns (MANDATORY — support v0.6.x through v1.0)
Read `docs/30_planning/CROSS_PLAN_REVIEW_V05_V06_INTEGRATED.md` AND `docs/30_planning/CROSS_PLAN_REVIEW_FULL_ROADMAP.md` for full rationale.
1. **Briefing collector:** open registry with `registerBriefingCollector()` — v0.5.1
2. **Settings screen:** section registry with `registerSettingsSection()` — v0.5.1
3. **SFX manifest:** open Map with `registerSFX()`, NOT sealed enum — v0.5.3
4. **VerdictScreen:** tab registry for post-game content — v0.5.0
5. **App.tsx:** extract `useGameFlow.ts` hook for modal/screen orchestration — v0.5.1
6. **Codex content:** JSON files in `data/codex/`, NOT TypeScript — v0.5.2
7. **MainMenu:** primary/secondary tiers with "Collection" slot — v0.5.1
8. **Dayton modal:** round-based state (1 round now, 3 in v0.6.3) — v0.5.0
9. **Tutorial event objective:** flexible (any decision event), not hardcoded ID — v0.5.2
10. **All new GameState fields:** must have defaults, handle old saves gracefully — all plans
11. **Save migration registry** (`src/state/save_migration.ts`): create in v0.5.0 Phase 0 — versioned field defaults for old saves. Every milestone adding GameState fields registers a migration.
12. **Component tests**: add `@testing-library/react` in v0.5.0 Phase 0. Each phase creating UI components adds 1-2 component tests.
13. **Content freeze schedule**: event freeze after v0.6.1, content+feature freeze after v0.6.4, text freeze after v0.7.2, code freeze after v0.9.0.

## Architectural Decisions Pre-Made
1. **Howler.js** for audio (not raw Web Audio API) — simpler, battle-tested
2. **Music: same tracks all factions** (Option A) — faction variation deferred to v0.7.3
3. **Codex: all entries unlocked from start** (Option A) — no unlock gating
4. **Briefing stored in GameState** (not computed on-the-fly) — deterministic, save-compatible
5. **Menu routing via React state machine** in App.tsx (not React Router)
6. **AARs are cosmetic-only** — never affect game state or scoring
7. **Tutorial is a real shortened scenario** (10 weeks) — not a sandbox mode
8. **Dayton is single-round** (player selects → bot responds → verdict) — multi-round deferred to v0.6.3
9. **Settings file: JSON in Electron userData** — no encryption, player-editable

## Expected Outcome
- v0.5.0 through v0.5.4 implemented (5 milestones)
- Final version: v0.5.4
- All tests pass, tsc clean
- Each milestone tagged in git
- ROADMAP_TO_1_0.md updated with all 5 milestones marked complete
- Morning report written to morning-report.md

## Build State at Handoff
- tsc: clean (0 errors)
- vitest: 80 suites, 927 tests pass, 1 skipped
- Last commit: 178d674 (chore: bump version to v0.4.6 — Commander Override Layer)
- Current version: 0.4.6
- Uncommitted: UI work from user/external (OpsPlanningModal, SidePickerOverlay, warroom, campaignRecruitmentActions, gameStore, MapContainer) — DO NOT TOUCH these files

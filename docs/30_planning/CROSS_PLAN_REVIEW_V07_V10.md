# Cross-Plan Review: v0.7.0 – v1.0.0 (Polish → Ship)

**Date:** 2026-03-16
**Reviewer:** Orchestrator
**Plans reviewed:** v0.7.0 (Performance), v0.7.1 (Accessibility), v0.7.2 (Localization), v0.7.3 (Visual Polish), v0.8.0 (Playtesting), v0.8.1 (Final Balance), v0.8.2 (Platform Packaging), v0.9.0 (Final QA), v0.9.1 (Store/Marketing), v1.0.0 (Gold)

---

## Finding 1: Performance Baseline Must Be Preserved Through Polish (v0.7.0 → v0.7.1-v0.7.3)

**Problem:** v0.7.0 establishes performance targets. v0.7.1 (accessibility — colorblind palettes, ARIA labels) and v0.7.2 (localization — i18n library, string lookups) add overhead. v0.7.3 (transitions, animations) adds rendering work. Each polish milestone could regress performance.

**Fix:** Performance regression check after each v0.7.x milestone: re-run `tools/perf_benchmark.ts` and compare against v0.7.0 baseline. Alert if >10% regression.

**Plan changes:**
- **v0.7.1, v0.7.2, v0.7.3:** Add to each gate: "Re-run perf benchmark. Verify <10% regression from v0.7.0 baseline."

---

## Finding 2: Colorblind Palettes Affect Localization Screenshots (v0.7.1 → v0.9.1)

**Problem:** v0.7.1 adds 3 colorblind modes. v0.9.1 takes store screenshots. Screenshots should use the DEFAULT palette (not colorblind), but the store page should MENTION colorblind support as a feature.

**Assessment:** Minor. Just a note for v0.9.1.

**Plan changes:**
- **v0.9.1 Phase 1 Task 1.2:** Note: take screenshots in default color mode. Mention colorblind support in feature list.

---

## Finding 3: Localization Must Happen Before Playtesting (ORDERING CONFIRMED)

**Assessment:** Current order is correct: v0.7.2 (localization) → v0.8.0 (playtesting). If BCS testers are included, they can test the localized version. If playtesting happened before localization, BCS text would be untested.

**No changes needed.** Order is correct.

---

## Finding 4: Playtest Build Needs All Polish (v0.7.3 → v0.8.0)

**Assessment:** v0.8.0 playtesting should use the POLISHED game (v0.7.3 complete). First impressions matter — testing a game without transitions, loading screens, or icon polish gives false negative feedback. Order is correct.

**No changes needed.**

---

## Finding 5: Platform Packaging Before Final QA Creates a Chicken-and-Egg (v0.8.2 → v0.9.0)

**Problem:** v0.8.2 builds platform packages. v0.9.0 does final QA. But QA should test the PRODUCTION build (the actual installer output), not the dev build. The sequence should be: build → test production build → ship.

**Assessment:** v0.9.0 Phase 3 Task 3.2 already says "Test: performance on PRODUCTION build." The ordering is correct — package first, then QA the packaged build.

**Plan changes:**
- **v0.9.0 Phase 1:** Add note: "Run feature checklist (Task 1.3) on PRODUCTION builds from v0.8.2, not dev builds."

---

## Finding 6: Night Shift Eligibility Across v0.7-v1.0

| Milestone | Night Shift? | Reason |
|-----------|-------------|--------|
| v0.7.0 Performance | **Yes** (Phases 1-4) | Profiling + optimization is autonomous code work |
| v0.7.1 Accessibility | **Yes** (Phases 1-4) | Accessibility is autonomous code work |
| v0.7.2 Localization | **Partial** | Phase 1 (infrastructure): Yes. Phase 2 (BCS content): AI draft yes, human review no. Phase 3 (English polish): No. |
| v0.7.3 Visual Polish | **Mostly** | Phases 1-2: Yes. Phase 3 (visual review): human judgment needed. |
| v0.8.0 Playtesting | **No** | Entirely human-driven (recruit testers, distribute, collect feedback) |
| v0.8.1 Final Balance | **No** | Requires playtest feedback analysis + human judgment |
| v0.8.2 Packaging | **Yes** (Phases 1-3) | Build configuration is autonomous. Phase 4 (Steam): needs account access. |
| v0.9.0 Final QA | **Partial** | Phase 1 (automated): Yes. Phases 2-3: human judgment. |
| v0.9.1 Store/Marketing | **No** | Entirely human-driven (writing, screenshots, community) |
| v1.0.0 Gold | **No** | Launch day is human-driven |

**Conclusion:** Night shift can handle v0.7.0, v0.7.1, v0.8.2 Phases 1-3, and automated portions of v0.7.2 and v0.9.0. Everything else requires user involvement.

---

## Finding 7: Save Compatibility Chain (v0.5.1 → v0.8.1 → v0.9.0)

**Problem:** Save format evolves through 15+ milestones. v0.5.1 creates SaveBrowser, v0.6.2 adds metadata wrapper, v0.7.x+ may not change format but v0.8.1 tests compatibility, v0.9.0 verifies it. The compatibility chain must be maintained across ALL milestones.

**Fix:** Every milestone that adds a GameState field must include a save compatibility test: load a save from the PREVIOUS milestone, verify it loads without error (defaults applied for new fields).

**Assessment:** Already covered by cross-series finding D (all new GameState fields must have defaults). The v0.8.1 and v0.9.0 plans explicitly test compatibility. No additional changes needed — the existing discipline is sufficient.

---

## Finding 8: The Feature Freeze Discipline

The v0.7-v1.0 series assumes **feature freeze** after v0.6.4. This means:

- v0.7.x: polish only (performance, accessibility, localization, visual) — NO new features
- v0.8.x: test and fix — NO new features, only fixes from playtest feedback
- v0.9.x: QA and marketing — NO code changes except P0 fixes
- v1.0: ship

**Risk:** During playtesting (v0.8.0), testers will request features. "Why can't I do X?" These must go to the post-1.0 backlog, NOT into the current release. Feature creep at this stage kills releases.

**Plan changes:**
- **v0.8.0 Phase 3 Task 3.2:** Explicitly categorize feature requests as P3 (post-1.0). Add sentence: "No feature requests are accepted for v1.0 regardless of tester enthusiasm. They go to the post-1.0 backlog."

---

## Summary

| # | Finding | Severity | Change |
|---|---------|----------|--------|
| 1 | Perf regression through polish | PROCESS | Add perf check to v0.7.1-v0.7.3 gates |
| 2 | Screenshots use default palette | MINOR | Note for v0.9.1 |
| 3 | Localization before playtesting | CONFIRMED | No change |
| 4 | Polish before playtesting | CONFIRMED | No change |
| 5 | QA tests production builds | CONFIRMED | Note for v0.9.0 |
| 6 | Night shift eligibility mapped | PROCESS | Reference table |
| 7 | Save compat chain | CONFIRMED | Existing discipline sufficient |
| 8 | Feature freeze discipline | **CRITICAL** | P3 all feature requests during playtest |

---

## Night Shift Execution Order (v0.7.x only)

v0.8.x through v1.0 are primarily human-driven. Only v0.7.x has significant night-shift-eligible work:

```
Night shift batch:
  v0.7.0 (all phases)
  v0.7.1 (all phases)
  v0.7.2 Phase 1 (i18n infrastructure + string extraction)
  v0.7.2 Phase 2 (BCS AI draft — human review separate)
  v0.7.3 Phases 1-2 (loading, transitions, icon polish)
  v0.8.2 Phases 1-3 (platform builds — not Steam)

Day shift:
  v0.7.2 Phase 2 (BCS review), Phase 3 (English polish)
  v0.7.3 Phase 3 (visual review)
  v0.8.0 (all — playtesting)
  v0.8.1 (all — balance from feedback)
  v0.8.2 Phase 4 (Steam — needs account)
  v0.9.0 Phases 2-3 (bug triage, performance on production)
  v0.9.1 (all — marketing)
  v1.0.0 (launch day)
```

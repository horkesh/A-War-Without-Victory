# MVP Checklist (AWWV)

Bounded definition of MVP per [docs/30_planning/EXECUTIVE_ROADMAP.md](EXECUTIVE_ROADMAP.md) Phase 6. No feature work beyond this scope until MVP is declared and frozen.

## MVP scope

- **Deterministic simulation loop:** Phase 0 turn pipeline runs via `runPhase0Turn` / `runOneTurn`; no timestamps or randomness in core pipeline; baseline regression green.
- **Canon-correct war start:** No referendum → no war; referendum held → war at `referendum_turn + 4`; automated tests in place.
- **Functional warroom GUI:** Interactive command room at Turn 0 / Phase 0; calendar advance runs real Phase 0 pipeline; map, faction overview, modals, ticker; build and dev server stable.
- **Reproducible builds:** Single canonical map/build path documented; typecheck and test gates pass.

## Gates (must be green)

| Gate | Command |
|------|---------|
| Typecheck | `npm run typecheck` |
| Test suite (incl. determinism scan) | `npm test` |
| Baseline regression | `npm run test:baselines` |
| Warroom build | `npm run warroom:build` |

## Known limitations

- Warroom turn advancement: Phase 0 and Phase I are wired (Phase I uses browser-safe runner with pre-loaded settlement graph). Phase II advancement is turn-increment-only until runTurn is browser/server-callable for Phase II.
- Placeholder content for newspapers, magazines, reports; dynamic generation is post-MVP.
- See [docs/40_reports/WARROOM_GUI_IMPLEMENTATION_REPORT.md](../40_reports/WARROOM_GUI_IMPLEMENTATION_REPORT.md) for full GUI scope and out-of-scope items.

## MVP Declaration

**Status:** MVP declared as of 2026-02-08. Scope frozen per [EXECUTIVE_ROADMAP.md](EXECUTIVE_ROADMAP.md) Phase 6.

**Verification (2026-02-08):** All gates green: `npm run typecheck` PASS, `npm test` PASS, `npm run test:baselines` PASS, `npm run warroom:build` PASS.

**Post-MVP items** are listed in Phase 7 of the Executive Roadmap. Do not pull them into MVP scope.

---

## Post-MVP (do not pull into MVP)

Per [docs/30_planning/EXECUTIVE_ROADMAP.md](EXECUTIVE_ROADMAP.md) Phase 7: dynamic newspapers/reports, corps/unit viz at map zoom, desperation visuals/props/sound, diplomacy panel (Phase II+).

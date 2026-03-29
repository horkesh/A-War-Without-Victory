# Working On — Session 2026-03-29 (Nightshift) — COMPLETE

## All Items Done — 13 Commits

### Commits (oldest to newest)
1. `7dacbc2e` — 22 deep-investigation fixes (from previous session, committed)
2. `73f5b05e` — SpatialContext Phase 0+1 — foundation + pipeline migration
3. `3179c69b` — Corps launch feasibility — predictor gate before op creation
4. `59746a65` — Retreat reachability + phantom defender — no teleportation, shared casualties
5. `197db709` — SpatialContext Phases 2-4 — sector, bot AI, combat migration
6. `568987f0` — Ops reevaluation — abort degenerate ops on brigade loss
7. `3be55bcf` — bfsDistance friendly-only — no paths through enemy territory
8. `72baf09e` — Multi-brigade main/support roles (initial: 70% power)
9. `dd2c2205` — Docs: ledger + napkin
10. `00d9914a` — Docs: calibration master + life lessons
11. `3a3ef9cf` — Docs: expert panel findings
12. `128d4eb8` — Power-neutral support model (1.0 power, 1.40/0.55 casualties)
13. `f08fa6c4` — Docs: n1205 calibration entry

### Final Calibration
**n1205: 92.1% area-weighted (40w), 22/22 anchors, 5/6 benchmarks, consistency PASS.**
War-or-Game: APPROVED WITH CAVEATS.

### Expert Panel Priorities for Next Session
1. **P0: HRHB post-w13 passivity** — 0 orders w21-40, two corps zero battles. Biggest realism gap.
2. **P0: RBiH late-war futility** — 0% objective completion w21+, entrenchment too punitive.
3. **P1: RS w40 benchmark** — fails by 0.2pp, tied to HRHB passivity.

### Remaining Open Items (gap finder)
- P2: Attack-through stall counter false positive on multi-objective ops
- P2: Narrow-front case (<=1 friendly adjacent) should skip repositioning
- P2: Reinforcement paths skip corridor safety check
- P2: Sectors stale after combat (once/turn rebuild)
- SpatialContext Phases 5-7 (paramilitaries, supply, events) — low priority

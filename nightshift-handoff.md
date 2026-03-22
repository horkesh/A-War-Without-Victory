# Night Shift Handoff — 2026-03-22

## Plans to Execute

1. **`docs/plans/2026-03-22-v060-alpha-implementation-plan.md`** — 17 tasks

## Execution Order

Tasks 1-2 first (types + state fields — everything depends on these).
Tasks 3-13 in listed order (Track A engine work).
Tasks 14-16 after Task 2 (Track B UI work — independent of Track A Tasks 3-13).
Task 17 last (final verification).

Track A and Track B are independent after Tasks 1-2. They CAN be parallelized.

## Dependency DAG

```
Task 1 (types) → Task 2 (state) → ┬→ Tasks 3-13 (Track A, sequential)
                                    └→ Tasks 14-16 (Track B, sequential)

Both tracks → Task 17 (final verification)
```

## Special Instructions

- **Backward compatibility is sacred.** All new state fields are optional. Existing events must continue to work unchanged. The 40w scenario must produce the same results as the current baseline (92.8% area-weighted).
- **Determinism is sacred.** No Math.random(), no timestamps, sorted iteration via strictCompare in any new code.
- **Test-first.** Every task that creates new modules must write failing tests before implementation.
- **Two placeholder conditions** (`enclave_supply_status` and `corridor_severed`) are expected to return `false` — they need supply system and adjacency graph integration that's deferred. Leave them as documented placeholders.
- **Bot decision logic** uses a default moderate commander profile `{ aggressiveness: 3, competence: 3 }` for now — wiring to actual faction army commander is deferred to v0.6.0-beta.
- **Do NOT modify any event JSON files** (`data/scenarios/events/`). Infrastructure only — content migration is v0.6.0-beta.
- **Uncommitted changes stashed** as `pre-nightshift: uncommitted planning_duration + latest_run_final_save`. Do NOT pop the stash.

## DO NOT Touch

- `data/scenarios/events/*.json` — event content migration is v0.6.0-beta, not alpha
- `src/sim/combat/pre_planned_operations.ts` — operations code, not in scope
- `src/sim/combat/triggered_operations.ts` — same
- `docs/10_canon/FORAWWV.md` — never auto-edit
- Any files in `.worktrees/` — stale worktrees, ignore

## Pre-Made Architectural Decisions

These are DECIDED. Do not revisit:

1. **Strategic dimensions replace NegotiationCapital** — unified hybrid with `base_value + event_modifier = effective_value`. See design spec Section 14.1.
2. **Event constraint bus is 4 layers** — wire stub (A), add constraint fields (B), flag-reading for foundational decisions (D). Layer C (new effect types) is v0.6.2, skip it.
3. **Pressure system uses readiness counters** — increment while conditions hold, decay when they lapse. See design spec Section 5.
4. **Bot decisions use personality-weighted scoring** — aggressive commanders prefer high aggression_affinity options. See design spec Section 10.
5. **3/turn event cap** — overflow queued to next turn sorted by priority.

## Reference Documents

- Design spec: `docs/plans/2026-03-21-emergent-event-system-design.md`
- Master roadmap: `docs/plans/2026-03-22-v06x-master-roadmap.md`
- HQ roadmap: `docs/plans/2026-03-22-army-hq-nerve-center-roadmap.md`
- Implementation plan: `docs/plans/2026-03-22-v060-alpha-implementation-plan.md`
- Life lessons: `docs/life_lessons.md`
- Napkin: `.claude/napkin.md`

## Current Build State

- **Version:** v0.5.4
- **Tests:** 1261 tests, 106 suites
- **tsc:** clean
- **Calibration:** 92.8% area-weighted ATH (n1011)
- **Uncommitted changes:** STASHED (do not pop)
- **Last commit:** b478a90 (implementation plan)

## What Success Looks Like

After the nightshift:
- All 17 tasks complete
- New test count: ~1280-1300 (20-40 new tests from Tasks 3-6, 9-10)
- tsc clean, vitest green
- 40w scenario produces same baseline results (infrastructure is inert)
- Morning report in project root
- Ledger updated
- Napkin updated

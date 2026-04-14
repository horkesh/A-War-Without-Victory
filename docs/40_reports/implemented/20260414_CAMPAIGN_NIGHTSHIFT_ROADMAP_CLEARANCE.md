# Campaign: Autonomous Nightshift — Roadmap Clearance

**Date:** 2026-04-14
**Type:** Multi-lane v0.8-to-v0.9 scorecard promotion campaign
**Campaign driver:** Clear the largest possible chunk of the live roadmap using parallel investigation and bounded implementation lanes.

## Investigation Phase

Five parallel specialist tracks dispatched simultaneously:

| Track | Question | Key Finding |
|---|---|---|
| A: Exhaustion identity | Is exhaustion mechanically live and coupled into negotiation/pressure? | Commander system completely blind to faction-level `war_exhaustion`. Only reads operational `corps_exhaustion`. Negotiation pressure accumulates but triggers nothing. |
| B: Save/load integrity | Top bounded integrity seams preventing A- confidence? | Architecture sound (deterministic JSON, canonical serialization). No full-state round-trip test against real saves. Replay is write-only. |
| C: Political review ownership | Where do multiple owners still exist for one decision surface? | Peace plan chains already clean. Dimension weights in 3+ copies with drift. Dayton trigger fires from adapter read path (redesign-gated). |
| D: Autonomy queue truth | Where are proposals under-proven or split across queue owners? | Three separate queues (meta proposals, event decisions, per-corps responses). Resolved proposals accumulate indefinitely. No autonomy round-trip test. |
| E: Blindspot check | Which candidate is truly strongest? Which are rabbit holes? | Save/load is the force multiplier. Doctrine/harness audits demoted. Stranded brigade lifecycle hides in other lanes. |

## Synthesis Decision

Priority stack after investigation:
1. **Save/load round-trip tests** — force multiplier, every other lane's proof depends on this
2. **Exhaustion → commander wiring** — game identity, central negative-sum promise
3. **Dimension weight unification** — political truth, DRY refactor
4. **Resolved proposal GC** — autonomy hygiene

Demoted:
- Dayton adapter side effect (redesign-gated — needs new pipeline step)
- Negotiation pressure consequences (needs design decision on triggers)
- Replay system (write-only by design, v0.9+ scope)
- Stranded brigade lifecycle (D+ grade, needs contract decision first)
- Planner/doctrine realism (unbounded, design-gated)

## Implemented Lanes

### Lane 1: Save/Load Round-Trip Proof Tests

**Scorecard target:** Save/load + replay + adapter integrity (B+ → A-)
**Files:** `tests/save_load_real_roundtrip.test.ts` (NEW, 9 tests)

9 tests against the real 13MB 40w final save proving:
- Idempotency: `serialize(deserialize(file))` round-trip is byte-identical
- All top-level keys, faction IDs, formation count, OSID controllers preserved
- Autonomy fields (level, proposals, overrides) survive round-trip
- Corps command entries and player_op_response preserved
- War exhaustion values preserved exactly
- Serializer determinism on identical input

**Canonical owner:** `serialize.ts` + `serializeGameState.ts` round-trip contract
**Demoted path:** Minimal hand-built test fixtures that miss real-state complexity
**Player-visible truth:** Save/load fidelity now proven on production state
**Canonical UI surface:** N/A (infrastructure)
**Done means:** 9/9 tests pass on real save; idempotency byte-identity proven

### Lane 2: Wire Faction War Exhaustion into Commander

**Scorecard target:** Game identity / exhaustion / negative-sum pressure (C+ → B-)
**Files:** `commander_state.ts` (+1 field), `briefing.ts` (+2 lines), `plan.ts` (+8 lines), 38 test fixtures

The commander system was blind to faction-level war exhaustion. Corps COs only read `corps_exhaustion` (operational, decaying 0-100). The nation could be bleeding out and commanders would launch operations with full enthusiasm.

Fix: `factionExhaustionDrag` multiplier in plan scoring. Scales from 1.0 (no exhaustion) to 0.3 floor (600+ exhaustion). At RS w40 (exhaustion=400): offensive scoring drops from 0.15 to ~0.05. Defensive intents unaffected — commanders naturally become more cautious as the nation suffers.

**Canonical owner:** `plan.ts:exhaustionPenalty` (now = `corpsExhaustionCapacity * factionExhaustionDrag`)
**Demoted path:** Corps-only exhaustion blind to national suffering
**Player-visible truth:** Commanders become visibly more cautious in late-war turns
**Canonical UI surface:** Commander briefing (via existing corps_exhaustion display path)
**Done means:** 255/255 commander tests pass; tsc clean; 40w scenario proof pending

### Lane 4: Resolved Proposal GC

**Scorecard target:** Autonomy replay / fallback / queue truth (B+ → A-)
**Files:** `src/sim/turn_phases/war_phases.ts` (1 filter change)

`apply-autonomy-transition` now clears ALL prior-turn proposals, not just unresolved ones. Prevents indefinite accumulation of resolved proposals on `pending_proposal_reviews`.

**Canonical owner:** `apply-autonomy-transition` pipeline step
**Demoted path:** Prior filter that preserved resolved proposals indefinitely
**Player-visible truth:** Clean proposal queue each turn
**Canonical UI surface:** AutonomyPanel (no stale cards)
**Done means:** 113/113 autonomy tests pass; filter simplified to `p.turn >= meta.turn`

### Lane 3: Dimension Weight Unification

**Scorecard target:** Political leader / peace-plan / patron review systems (B+ → A-)
**Files:** `src/ui/map/data/GameStateAdapter.ts` (import + replace inline weights), `src/sim/political/political_personality.ts` (+3-line comment)

`deriveNegotiatingCapital()` in `GameStateAdapter.ts` had inline dimension weights duplicating `DIMENSION_WEIGHTS` from `strategic_dimensions.ts`. Replaced with canonical import. `StrategicPosition.tsx` was already using the canonical import. `political_personality.ts` weights are intentionally different (personality scoring, not capital composite) — added cross-reference comment to prevent future accidental "alignment."

**Canonical owner:** `DIMENSION_WEIGHTS` in `src/sim/events/strategic_dimensions.ts`
**Demoted path:** Inline weight objects in adapter
**Player-visible truth:** Dayton capital composite now guaranteed to use same weights as engine
**Canonical UI surface:** StrategicPosition panel, DiplomacyOverview
**Done means:** Single import source for capital weights; intentional divergence documented

## Verification

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | Clean |
| `npm run build` | Clean |
| `npm run desktop:map:build` | Built (6.65s) |
| `npm run test:vitest` (full suite) | **297 suites, 3496 tests — ALL PASS** |
| Commander tests (255) | All pass |
| Autonomy tests (113) | All pass |
| Save/load real round-trip (9) | All pass |

**40w scenario proof for Lane 2 (exhaustion wiring): PROVEN.**
- n1568: 93.5% area-weighted, 27/27 anchors, 6/6 benchmarks
- Hash `cd3083a0295af31b` differs from previous baseline — confirms real behavior change
- Zero calibration regression (93.5% vs previous 93.2%)
- 74 defender-present battles, 125 orders processed, 44 flips

**Save/load tests expanded to 12** (from initial 9): added adapter-after-deserialize contract test and SHA-256 hash preservation test. Save/load integrity now at full A- grade.

## What Moved Up

| System | Previous Grade | Movement | Evidence |
|---|---|---|---|
| Save/load + replay + adapter integrity | B+ | **→ A-** (partial) | Real-save round-trip byte-identity proven |
| Game identity / exhaustion / negative-sum pressure | C+ | **→ C+/B-** (partial, needs scenario proof) | Commander now reads faction exhaustion |
| Autonomy replay / fallback / queue truth | B+ | **→ B+** (hygiene improvement) | Proposal GC closes accumulation leak |

## What Remains Below Grade

- **Exhaustion (C+→B-)**: Needs 40w scenario proof showing visible behavior change. Negotiation pressure still triggers nothing.
- **Save/load (B+→A-)**: Adapter-after-deserialize contract test and save-load-continue hash chain still missing for full A.
- **Political review (B+)**: Dimension weight unification in progress (Lane 3). Dayton adapter side effect redesign-gated.
- **Autonomy (B+)**: Three separate queues still exist. No unified decision inventory. Headless replay determinism unproven.
- **Stranded brigade lifecycle (D+)**: Redesign-gated. No contract decision.
- **Planner/doctrine (B-)**: Deferred — design decisions needed first.

## What Should Happen Next

1. **Run 40w scenario** to prove exhaustion wiring has visible effect (compare commander op counts, offensive intent frequency before/after)
2. **Adapter-after-deserialize contract test** — second highest save/load confidence gain
3. **Save-load-continue hash chain test** — proves replay equivalence without full replay system
4. **Negotiate pressure → consequence wiring** — needs design decision first (what should high negotiation pressure trigger?)
5. **Dayton trigger pipeline step** — move `shouldInitiateDayton` out of adapter read path into a proper pipeline step

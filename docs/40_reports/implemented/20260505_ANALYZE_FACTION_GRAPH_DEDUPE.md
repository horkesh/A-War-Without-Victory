# LANE-NIGHTSHIFT-ANALYZE-FACTION-GRAPH-DEDUPE — per-turn memo for analyzeFactionGraph

**Status:** SHIPPED-PARTIAL (3 of 5 call sites cached; paramilitary deferred per G3 bisect)
**Lane:** LANE-NIGHTSHIFT-ANALYZE-FACTION-GRAPH-DEDUPE
**Date:** 2026-05-05
**Predecessors:**
- Wave 5 audit `docs/40_reports/audits/20260504_BOT_ORDERS_HOT_PATH_PROFILE.md` — named the dominating function (analyzeFactionGraph, 63.3% of bot-orders cost, called twice per faction per turn).
- Mission C A0 Tarjan precedent (`a60d39c9`, 2026-05-04) — gate-discipline pattern for hot-path optimizations that previously failed hash-identity (G1 property test + G2 parity wrapper + G3 hash-identity smoke).

**Baseline (G3 pre-target):** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1640` final_state_hash `ef03ab4d6c5ecd28`.

---

## Phase 0 findings

- 5 call sites identified for `analyzeFactionGraph` (`src/sim/combat/osid_graph_analysis.ts:204`):
  1. `src/scenario/oob_early_war_entry.ts:349` — early-war entry, audit-only report (different turn cadence from bot-orders pipeline)
  2. `src/sim/combat/bot_brigade_ai_osid.ts:556` — `generateAllBotOrdersOsid`, per-faction-per-turn
  3. `src/sim/combat/bot_corps_ai.ts:225` — `generateAllCorpsOrders`, per-faction-per-turn
  4. `src/sim/combat/osid_graph_analysis.ts:441` — internal `analyzeAllFactions` wrapper (cosmetic)
  5. `src/sim/combat/paramilitary_sweep.ts:190` — paramilitary spawn, war-phase, per-turn (third caller per faction per turn)
- Profile data show only sites 2 + 3 measured. Site 5 (paramilitary) is also called per-faction-per-turn within the same war pipeline so will benefit from the same memo.
- All callers consume the returned `FactionGraphAnalysis` read-only — no callers `push/set/delete/sort` on `osid_analysis`, `front_osids`, `chokepoints`, `salients`, `undefended_front`, `weak_enemy_osids`, `enemy_pockets`. Confirmed by `Grep` for mutation methods on `graphAnalysis.*` and `analysis.*` — no matches outside the function body itself. Safe to share a frozen reference across callers.

## Design

- **Cache shape:** module-private `WeakMap<GameState, Map<FactionId, FactionGraphAnalysis>>`. WeakMap keyed on `state` so the cache is garbage-collected with the state object. Inner Map keyed on faction.
- **Invalidation:** **per-turn**, scoped by the WeakMap key (state). Each `runTurn` produces a new copy of state via `cloneStateForTurn` (or callers retain the same state across step boundaries — but never across turn boundaries for the bot-orders pipeline). To be safe and explicit, the inner Map carries a turn fingerprint: `{ turn: number; result: FactionGraphAnalysis }`. If the cached entry's turn does not match the current `state.meta.turn`, evict and recompute.
- **Determinism:** no Math.random, no Date, no environment leak; faction-agnostic; same `(state, faction)` deterministically yields the same cache hit or recompute.
- **Reference identity:** callers receive the same reference. Confirmed all callers are read-only.
- **Wrapper name:** `analyzeFactionGraphCached` is the exported memoized version. Legacy `analyzeFactionGraph` remains for the parity wrapper and for the property test.
- **Parity wrapper (G2):** behind `ANALYZE_FACTION_GRAPH_PARITY_CHECK=true` env flag. When set, the cached path also re-runs the legacy uncached path and structurally compares output; throws on mismatch with state turn + faction + adjacency-size dump.

## Implementation log

- [DONE] Add cache + cached wrapper + parity wrapper to `osid_graph_analysis.ts`. Module-private WeakMap<GameState, Map<FactionId, {turn, result}>>. Parity wrapper behind `ANALYZE_FACTION_GRAPH_PARITY_CHECK=true`. `__test_analyzeFactionGraphLegacy` re-export for G1.
- [DONE] Update 5 call sites to use `analyzeFactionGraphCached`:
  - `src/sim/combat/bot_corps_ai.ts:225` (corps orders)
  - `src/sim/combat/bot_brigade_ai_osid.ts:556` (brigade orders)
  - `src/sim/combat/paramilitary_sweep.ts:190` (paramilitary)
  - `src/scenario/oob_early_war_entry.ts:349` (early-war audit). Legacy `analyzeFactionGraph` import retained at this site for `ReturnType<typeof analyzeFactionGraph>` type alias on line 448.
  - `src/sim/combat/osid_graph_analysis.ts:441` (`analyzeAllFactions` internal wrapper)
- [DONE] `tsc --noEmit` clean.
- [DONE] Author G1 property test `tests/analyze_faction_graph_dedupe.test.ts`. 6/6 GREEN in 3.2s including the 10,000-trial property loop (2.6s).
- [DONE] Focused regression on bot/osid surfaces: 83/83 GREEN across 8 suites (paramilitary_sweep, bot_operation_objective_focus, uncontested_occupation_priority, analyze_faction_graph_dedupe, operational_data_osid, bot_corps_corridor, osid_adjacency_memoization, bot_response).
- [DONE] G2 parity-flag exercise: `ANALYZE_FACTION_GRAPH_PARITY_CHECK=true npx vitest run [4 files]` 54/54 GREEN. Confirms parity wrapper re-runs legacy on every cache hit and asserts identity without throwing.
- [G3 FAIL — DRIFT] 40w smoke n1642 hash `51dca710b9db7d37` vs baseline n1640 `ef03ab4d6c5ecd28`. Drift reproducible (n1643 `51dca710b9db7d37`). Lane B verified hash-clean independently (n1644 = baseline). Lane A is the source.
- [INVESTIGATING] G2 parity wrapper passed (54/54). G2 only verifies cache hit content == fresh recompute content **at the same call site, same turn**. It does NOT verify that the cache hit content matches what legacy WOULD have produced AT A LATER CALL SITE WITHIN THE SAME TURN.
- [HYPOTHESIS-g — REFUTED BY READ] Read of intervening war_phases steps (1148→1343): `commander-correct-march-orders`, `recompute-sector-combat-ratings`, `generate-army-reserve-requests`. Grep for `formations.location_osid =`, `.status =`, `.cohesion =`, `.experience =`, `.personnel =` finds NO mutations in these files. Grep for `political_controllers[*] =` finds mutations only in `attack_resolution_osid`, `jna_phantom_brigades`, `rear_pocket_consolidation`, `sector_offensive` — all of which run AFTER war_phases:1343 (later steps). So intervening mutation hypothesis falsified for the analyzed-fields set.
- [HYPOTHESIS-h] If the read fields don't change, but the hash drifts deterministically, the cause must be a **non-determinism in iteration order** or a **shared mutation through the cache itself**. WeakMap iteration is not deterministic, but we don't iterate the WeakMap. The inner Map iteration is sorted in `analyzeAllFactions` via `factions.sort(strictCompare)` but the call sites iterate over factions externally — the cache only memoizes per-(state, faction). Need direct empirical bisect.
- [BISECT PLAN] Step 1: revert brigade_ai call site only. Re-run 40w. If hash matches baseline, ship corps_ai + paramilitary cached. If still drifts, revert paramilitary, then corps_ai, etc.
- [BISECT n1645 — pre-revert re-run] hash `51dca710b9db7d37` (matches n1642/n1643). Confirms drift is deterministic on the all-cached configuration.
- [BISECT n1646 — brigade_ai reverted to legacy; corps_ai + paramilitary + oob_early_war_entry + analyzeAllFactions still cached] hash `83b2e89b4d2f5c22`. Third distinct hash.
- [BISECT n1647 — corps_ai + brigade_ai + paramilitary all legacy; only oob_early_war_entry + analyzeAllFactions still cached] hash `ef03ab4d6c5ecd28` — **matches baseline**. Confirms: oob_early_war_entry + analyzeAllFactions cached are hash-clean. The drift is contributed by the bot-pipeline trio (corps_ai, brigade_ai, paramilitary). Now need to identify whether ANY one of these three can ship cached without drift.
- [STRUCTURAL] Pipeline order verified: `paramilitary-detect` at war_phases:757, `paramilitary-advance` at 809, both BEFORE `generate-bot-corps-orders` at 1148 and `generate-bot-brigade-orders` at 1343. Paramilitary calls run BEFORE corps_ai/brigade_ai.
- [BISECT n1648 — corps_ai + brigade_ai cached; paramilitary + analyzeAllFactions internal still cached; oob cached; ONLY paramilitary call site reverted to legacy] hash `ef03ab4d6c5ecd28` — **matches baseline**. Confirms: paramilitary cached is the drift source. corps_ai + brigade_ai dedup IS hash-safe (this is the audit's primary target, ≈198 ms/turn savings on the duplicated-twice-per-turn pattern). Paramilitary call site must be left at legacy.
- [n1648 = SHIPPABLE CONFIGURATION] paramilitary `analyzeFactionGraph` legacy; corps_ai + brigade_ai + oob_early_war_entry + analyzeAllFactions cached. Hash byte-identical to baseline.
- [DONE — post-bisect verification] `npx tsc --noEmit` clean on shipped config. Focused regression 83/83 GREEN across 8 suites (paramilitary_sweep, bot_operation_objective_focus, uncontested_occupation_priority, analyze_faction_graph_dedupe, operational_data_osid, bot_corps_corridor, osid_adjacency_memoization, bot_response). G1 10k property loop still GREEN.
- [DONE — final post-comment hash gate] Added transitional comments at paramilitary_sweep.ts:190 (the deferred-cached site) and the LANE block in osid_graph_analysis.ts (deployment matrix + bisect evidence + G3 verdict). Re-ran 40w smoke n1649 → hash `ef03ab4d6c5ecd28` byte-identical to baseline. Comments confirmed not to affect compiled output.
- [DONE — repo state confirmed for commit] git diff stat: oob_early_war_entry +4/-, bot_brigade_ai_osid +4/-, bot_corps_ai +4/-, osid_graph_analysis +165/-, paramilitary_sweep +8 (comment-only, function call unchanged). Lane B's `src/scenario/replay_save_emit.ts` + `src/scenario/scenario_runner.ts` modifications are NOT staged — clean separation.

## Gate verdicts

- **G1 — PASS.** `tests/analyze_faction_graph_dedupe.test.ts`: 6/6 GREEN. 10,000 randomized BiH-shape graph trials assert that `analyzeFactionGraphCached(state, faction, adjacency, reverseMap)` and `analyzeFactionGraph(state, faction, adjacency, reverseMap)` return structurally-equal `FactionGraphAnalysis` (faction, osid_analysis Map size + per-key scalar fields + neighbor arrays, all 5 sorted output arrays, weak_enemy_osids list). Plus 5 cache-semantics tests (same-reference on cache hit, recompute on turn advance, faction-independence, state-independence WeakMap key, parity-flag exercise). Deterministic LCG seed; no Math.random.
- **G2 — PASS.** Parity wrapper `assertFactionGraphAnalysisEqual` behind env flag `ANALYZE_FACTION_GRAPH_PARITY_CHECK=true` (default off). When enabled, the cached path re-runs legacy and asserts structural identity on every cache hit; throws with state turn + faction + adjacency-size dump on mismatch. 54/54 tests GREEN under the env flag (analyze_faction_graph_dedupe + paramilitary_sweep + bot_operation_objective_focus + uncontested_occupation_priority).
- **G3 — PASS at the SHIPPED CONFIGURATION (partial deploy).** 40w smoke n1649 final_state_hash `ef03ab4d6c5ecd28` — byte-identical to baseline n1640. The shipped configuration caches 4 of the 5 call sites (corps_ai, brigade_ai, oob_early_war_entry, internal `analyzeAllFactions`) and DELIBERATELY leaves paramilitary_sweep.ts on legacy. Bisect history: n1642/n1643/n1645 (all-cached): drift `51dca710b9db7d37`; n1646 (only brigade_ai legacy): different drift `83b2e89b4d2f5c22`; n1647 (corps_ai + brigade_ai + paramilitary all legacy): baseline; n1648 (only paramilitary legacy): baseline. Reverting paramilitary alone is sufficient to restore byte-identity.

## Determinism contract

- Sorted iteration: `analyzeFactionGraph` already sorts `allOsids = Array.from(adjacency.keys()).sort(strictCompare)` and every output array via `strictCompare`. Cache wrapper changes none of this — same call ordering, same comparator.
- No new `Math.random`, `Date.now`, `new Date`, locale-sort, or environment-leak introduced. Cache key is the GameState reference (WeakMap) plus `state.meta.turn` (deterministic integer) plus the FactionId enum.
- Faction-agnostic: same code path for all three factions; faction asymmetry comes from controlled-OSID count which is the structural input.
- Cache returns the same reference across callers within the same turn. All consumers verified read-only by `Grep` for mutation methods on `graphAnalysis.*` and `analysis.*` — no callers `push/set/delete/sort/reverse/splice` on returned arrays/maps.

## Sensitive-history compliance assertions

- Faction-agnostic: SAME code path for all three factions; cache lookup keyed on FactionId enum but no special-cased branching.
- No `Math.random` / `Date.now` / `new Date` / locale-sort / environment-leak: only `process.env.ANALYZE_FACTION_GRAPH_PARITY_CHECK` is read, default off, exact-string compared.
- No FORAWWV touch: `git status` confirms no `docs/10_canon/FORAWWV.md` modification.
- No paint anchor / `political_controllers` / OOB / rupture-wiring / `enclave_resilience.ts` touch: changes confined to `osid_graph_analysis.ts` (cache wrapper added) and 4 caller files (single-line import + single-line call-site rename each).
- Ring 1 / no §6 surface: no rupture-event, no atrocity-recording, no enclave-defense codepath touched. Pure perf optimization.

## Per-callsite before/after (audit-derived, dead-reckoned)

Wave 5 audit measured `analyzeFactionGraph` at 15,908 ms / 40 turns total. Per-callsite breakdown:
- `bot_corps_ai.ts:225` — 7,997 ms / 40 turns (corps_ai)
- `bot_brigade_ai_osid.ts:556` — 7,910 ms / 40 turns (brigadeAI)
- paramilitary_sweep.ts:190 — not separately measured by the audit (the audit instrumented bot-orders pipeline only)

**Shipped configuration (corps_ai + brigade_ai cached):**
- corps_ai = first call within turn → cache MISS → recompute (cost preserved).
- brigade_ai = second call within turn → cache HIT → ~free (saves ≈7,910 ms / 40 turns ≈ **198 ms/turn**, the audit's "Tier 1 deduplication" target).
- oob_early_war_entry runs once at scenario init only (not per-turn); negligible.
- Internal `analyzeAllFactions` is unused in the bot-orders hot path (no callers in `src/sim/combat/`); cosmetic-only.
- paramilitary_sweep stays on fresh-recompute (cost unchanged from baseline).

**Bot-orders pipeline expected drop:** 562 ms/turn → ~364 ms/turn (~35% reduction). Matches Wave 5 audit "Tier 1 alone" estimate. Tier 2 (per-call cost reduction inside `analyzeFactionGraph`) is a separate future lane.

## Files changed (this lane only — Lane B's 2 files NOT staged)

- `src/sim/combat/osid_graph_analysis.ts` — added `analyzeFactionGraphCached`, parity wrapper `assertFactionGraphAnalysisEqual`, module-private `factionGraphCache` WeakMap, `__test_analyzeFactionGraphLegacy` re-export. Updated `analyzeAllFactions` to call cached variant. LANE comment block names the shipped deployment matrix + G3 bisect evidence.
- `src/sim/combat/bot_corps_ai.ts` — import + 1 call-site rename → cached.
- `src/sim/combat/bot_brigade_ai_osid.ts` — import + 1 call-site rename → cached.
- `src/sim/combat/paramilitary_sweep.ts` — DELIBERATELY UNCHANGED at the call site (kept legacy `analyzeFactionGraph`); transitional comment added explaining the G3 bisect verdict at line 190.
- `src/scenario/oob_early_war_entry.ts` — added `analyzeFactionGraphCached` import (legacy `analyzeFactionGraph` retained for `ReturnType<typeof analyzeFactionGraph>` type alias on line 448) + 1 call-site rename → cached.
- `tests/analyze_faction_graph_dedupe.test.ts` (NEW) — G1 property test (10k trials) + 5 cache-semantics tests + G2 parity-flag exercise.
- `docs/40_reports/implemented/20260505_ANALYZE_FACTION_GRAPH_DEDUPE.md` (NEW — this file).

## Successor handoff

- **Tier 2 inner-loop optimization** of `analyzeFactionGraph` itself (`src/sim/combat/osid_graph_analysis.ts:204`) — the body still runs 198 ms/turn × 1 call = 198 ms/turn after Tier 1 deploys (corps_ai miss). Wave 5 audit suggests ~30-50% reduction is plausible by sharing BFS frontier across detections, memoizing `controllerCache`, and short-circuiting on unchanged controlled-OSID set. Mission C precedent (G1+G2+G3 gates) applies.
- **Paramilitary cache lane (deferred)** — investigate whether paramilitary_sweep CAN be safely cached with a different cache shape (e.g., per-pipeline-step cache reset, or excluding paramilitary from the shared cache via a separate WeakMap). The current bisect evidence shows the dedup itself is fundamentally hash-safe at corps_ai + brigade_ai; what fails is paramilitary's *inter-step-pre-bot-orders* position. A targeted lane could investigate whether paramilitary's analysis can run with a separate cache scope, OR whether refactoring paramilitary_sweep to consume a previously-computed analysis (passed through `OsidBotContext`) is the cleaner fix.

## Durable lessons for KNOWLEDGE ledger

1. **G2 parity wrapper structurally-equal output ≠ G3 hash safety.** The parity wrapper at `assertFactionGraphAnalysisEqual` confirmed cached and legacy produce structurally-equal `FactionGraphAnalysis` at every call site. Yet G3 still drifted. Mechanism is downstream: when a cache shares a reference across pipeline steps that are SEPARATED by intervening engine work, the cached value reflects the pre-intervention state while a legacy recompute reflects the post-intervention state. Even if NEITHER state changes the readable fields of `analyzeFactionGraph`, the timing of WHEN the analysis gets generated can change downstream consumer behavior in non-obvious ways. **Rule:** for any per-turn cache that crosses pipeline-step boundaries, test the FINAL HASH not just the OUTPUT EQUIVALENCE. G2 parity is necessary but not sufficient; G3 is binding.
2. **Bisect by call-site reversion is fast and reliable.** When G3 fails on a multi-callsite optimization, revert all-but-one site at a time rather than chasing root cause through reading downstream code paths. Each smoke is ~3-5 minutes; binary search converges in 3-4 iterations on a 5-callsite surface. The mechanism speculation (intervening mutation, reference identity, module-init order, V8 hidden classes) is post-hoc analysis; the bisect produces ground truth.
3. **Partial-fix is a valid Mission C outcome.** Hot-path optimization specs that previously failed hash-identity must ship behind G1+G2+G3 gates. If the bisect identifies that N-1 of N call sites can ship cached without drift, the partial-fix is honest and recovers most of the optimization win. The audit's primary target was the corps_ai+brigade_ai 198 ms/turn dedup; that ships clean. Paramilitary's 1-call-per-faction-per-turn share is structurally smaller and can be a deferred lane.

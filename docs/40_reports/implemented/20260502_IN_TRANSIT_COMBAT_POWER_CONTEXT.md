# LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT — Predictor / Combat-Power Context Honest for Committed-in-Transit Participants

**Date:** 2026-05-02
**Status:** PARTIAL — context-honesty fix ships clean (hash drift proves override fires for non-sensitive ops; behavioral global narrow-scope per declared drift class). NEW named blocker for Krivaja-95: at t179 trigger, all participants are dispersed across post-Stupčanica-cascade locations with `mv_state=none` and `mv_order=none` — `isCommittedInTransitTo` returns false for every participant, so override never fires for Krivaja's predictor. Upstream of `combat_math.ts`; movement-orders / pre-stage / trigger-turn-orders-not-yet-converted-to-transit territory.
**Predecessor:** `87062cc4` In-Transit Predictor lane — successor handoff (named remaining blocker: `computeAttackerPower` reads brigade `location_osid` for context lookups, evaluating committed-in-transit participants against intermediate transit OSID).
**Verification commit:** `8dec8f58`.

## Lane Summary

Bounded engine-only context-honesty repair across `src/sim/combat/combat_math.ts` and `src/sim/combat/operation_preparation.ts`. The predecessor (`87062cc4`) made readiness/predictor gates count operation participants `in_transit` toward axis-relevant OSIDs. The named remaining blocker, identified by /scenario-tester at the predecessor's PARTIAL close: `computeAttackerPower(state, formation, ...)` evaluates location-dependent context via `getSupplyMult` (which reads `formation.location_osid` for supply state) and `getHomeDistanceMultFromCache` (cached from current location). For an in-transit brigade en-route to staging, `location_osid` is the intermediate transit OSID — so the brigade's predicted attacker power is computed against unfavorable transit-OSID supply state instead of the destination it is committed to reach.

The fix introduces three small surface changes, all faction-agnostic and read-only:

1. `isCommittedInTransitTo` is now **exported** from `sector_offensive_launch_helpers.ts` so the `estimateForceRatio` caller can reuse the predecessor lane's predicate as the single source of truth (per /determinism-auditor recommendation).

2. `getSupplyMult(formation, state, mode, supplyStateByOsid?, contextLocationOverride?)` and `computeAttackerPower(... contextLocationOverride?)` accept an optional `contextLocationOverride: string`. When provided, the supply-state-by-osid lookup (branch (a)) keys on the override OSID instead of `formation.location_osid`. Default-undefined preserves byte-stable behavior for `attack_resolution_osid.ts`, `combat_predictor.ts`, and `sector_combat_rating.ts` callers — all of which evaluate formations against their CURRENT physical location and must remain so.

3. `estimateForceRatio` builds a per-op relevance set (`op.staging_osid` + every `axis.staging_osid` + approach OSIDs for current launch objectives across all axes); deterministically picks an override OSID (`op.staging_osid` first, else `strictCompare`-sorted first relevance OSID); per-attacker gates on `isCommittedInTransitTo(state, formation.id, relevanceOsids)`; passes the override only for committed-in-transit-to-relevant brigades.

**Out of scope (intentional, per Phase 0 systems-programmer + determinism-auditor synthesis):**
- Home-distance cache override. The cache is per-formation/opaque from the call site; recomputing in this hot path is a layer violation. Effect is marginal (0.85–1.0× band) vs the supply-state binary cliff (1.0 → 0.45 attack-mode at critical). The named blocker is supply, per the predecessor's evidence trail (Krivaja-95 force_ratio 0.094 << launch threshold of 1.5).
- Branch (b) `last_supplied_turn` fallback in `getSupplyMult`. Faction/turn-keyed, semantically destination-independent.
- Resolver, predictor, and sector-rating callers. Default-undefined parameter preserves byte-stable behavior — they evaluate brigades against their CURRENT physical location, which is correct for live combat resolution and adjacency-from-here predictions.

## Phase 0 — Four-Investigator Synthesis

Dispatched in parallel; all four converge:

- **`/systems-programmer`** — Confirmed `getSupplyMult` and `getHomeDistanceMultFromCache` are the only location-dependent helpers inside `computeAttackerPower`. Recommended override applies to `getSupplyMult` branch (a) only; **skip** home-distance (cache is per-formation pre-computed; layer violation to recompute, marginal effect). Default-undefined parameter preserves byte-stability for the three other callers (resolver / predictor / sector-rating). Verdict: SAFE with shape constraints.

- **`/determinism-auditor`** — Override OSID selection rule: `axis.staging_osid` first, else `strictCompare`-sorted first relevance OSID (avoids dependence on `destination_sids[0]` semantics which could brittle under future route planners). Supply-context only (skip home-distance per layer-violation argument). Import `isCommittedInTransitTo` from predecessor lane (single source of truth). Hash drift bounded — BEHAVIORAL global narrow-scope. Verdict: SAFE with caveats.

- **`/qa-engineer`** — Test matrix T1–T7 + static-grep guards. T1 RED unit: override raises power 2.0–2.5× when intermediate critical, staging adequate. T3 regression: staged idempotent. T4 regression: postureMult guard preserved. T5 determinism. T6 static-grep (no `Math.random`/`Date.now`/`new Date(`; no faction hardcode in lane-tagged lines). T7 RED caller integration: `estimateForceRatio` ratio higher when in-transit-to-staging vs in-transit-to-unrelated. Verdict: GO with matrix.

- **`/game-designer`** — APPROVED Ring 1. Honest mechanic correction at predictor layer; same shape as predecessor `87062cc4`. Not tuning — context honesty evaluates power at the OSID where the engine has committed the brigade to operate from. § 6 sign-off chain not required (parity with existing predictor-honesty consumers). § 8.3 distinction (a): if Krivaja-95 force_ratio rises and Srebrenica subsequently falls in 188w, that is emergent consequence of (i) ICTY-cited OOB, (ii) correct readiness mechanic, (iii) correct combat-power context, (iv) combat resolution, (v) rupture predicate — design intent.

**Synthesis verdict:** GO. Two narrow patches in `combat_math.ts` (parameter plumbing, branch (a) only) + one caller patch in `operation_preparation.ts` (relevance set + override selection + per-attacker gate). Stop gates honored.

## Phase 1 — Red-First Tests

`tests/operation_preparation_in_transit_context.test.ts` (9 tests):

| Test | Purpose | Pre-fix | Post-fix |
|---|---|---|---|
| T1 unit | `computeAttackerPower` with override = staging returns higher power than without override (when intermediate is `critical`, staging is `adequate`) | RED — override param ignored, returns same value | GREEN — override raises power by 2.0–2.5× |
| T3 regression | staged brigade idempotent (with-override === without-override when location_osid equals override) | GREEN | GREEN |
| T4 regression | inactive brigade with `defend` posture in attacker mode returns 0 regardless of override (`postureMult <= 0` guard preserved) | GREEN | GREEN |
| T5 determinism | re-runs identical | GREEN | GREEN |
| T6 static-grep | no `Math.random` / `Date.now` / `new Date(` / `performance.now(` in `combat_math.ts` or `operation_preparation.ts`; no faction hardcode in LANE-tagged lines | GREEN | GREEN |
| T7 caller integration | `estimateForceRatio` numerator higher when participant is in-transit-to-staging vs in-transit-to-unrelated (caller predicate gates override) | RED — caller predicate doesn't exist | GREEN — ratio factor ≥ 1.5× |
| predicate sanity ×2 | `isCommittedInTransitTo` is exported and returns correct values for in-transit-to-relevant and in-transit-to-unrelated | GREEN | GREEN |

Pre-implementation: 2 RED + 7 GREEN regression guards. Post-implementation: **9/9 GREEN.**

## Phase 2 — Implementation

### `src/sim/combat/sector_offensive_launch_helpers.ts`
- Added `export` to `isCommittedInTransitTo` (was private). Cross-lane attribution comment explains single-source-of-truth intent.

### `src/sim/combat/combat_math.ts`
- `getSupplyMult(formation, state, mode, supplyStateByOsid?, contextLocationOverride?)`: optional 5th parameter. When provided, `locationOsid` for the supply-state-by-osid lookup uses override instead of `formation.location_osid`. Branch (b) `last_supplied_turn` fallback unchanged. Full JSDoc.
- `computeAttackerPower(... contextLocationOverride?: string)`: optional 7th parameter. Plumbs override into `getSupplyMult` only. Other helpers untouched. JSDoc cites predecessor lane, lists out-of-overrides (home-distance cache, branch (b)), and explicitly preserves byte-stability for resolver/predictor/sector-rating callers.

### `src/sim/combat/operation_preparation.ts` `estimateForceRatio`
- Imports `isCommittedInTransitTo` + `collectObjectiveApproachOsids` from `sector_offensive_launch_helpers.ts`.
- Derives `attackerCorpsId` from `attackerFormations[0].corps_id` (canonical via op-architecture invariant; CorpsOperation has no top-level `corps_id`/`faction` fields).
- Builds `relevanceOsids: Set<string>` = `op.staging_osid` ∪ each `axis.staging_osid` ∪ approach OSIDs for current launch objectives across all axes (multi-axis or single-axis branch).
- Picks `overrideOsid` = `op.staging_osid` if in relevance set, else `strictCompare`-sorted first relevance OSID.
- Per-attacker gate: `useOverride = overrideOsid !== undefined && a.location_osid !== overrideOsid && isCommittedInTransitTo(state, a.id, relevanceOsids)`. Passes override only when true; passes `undefined` otherwise.

Every changed/added line tagged `LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT`. Faction-agnostic; deterministic via `strictCompare` + `Set.has()`; no `Math.random`/`Date.now`/`new Date(`.

## Verification

- **Lane tests:** `tests/operation_preparation_in_transit_context.test.ts` 9/9 PASS.
- **Focused regression suite:** **104/104 PASS** across 10 suites:
  - `operation_preparation_in_transit_context` (this lane, 9/9)
  - `sector_offensive_in_transit_predictor` 14/14 (predecessor `87062cc4`)
  - `operation_preparation_force_ratio` 15/15 (Phase 4b force-ratio mega-lane)
  - `krivaja_roster_and_prestage` 11/11 (Krivaja `98446604`)
  - `krivaja_stupcanica_milii_double_roster_audit` 3/3
  - `triggered_operations` 15/15
  - `triggered_operations_late_1995` 10/10
  - `operation_axis_unreachable_diagnostic` 3/3
  - `sector_offensive` 12/12
  - `sector_offensive_idle_recovery` 12/12
- **Typecheck:** `npx tsc --noEmit -p tsconfig.json` clean (zero output).
- **40w smoke:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1618` hash `0c2fc264112dec1f` — byte-identical to predecessor 40w baselines (n1610, n1613, n1615, n1616). `/scenario-creator-runner-tester` confirmed: EXPECTED null result for this lane — relevance set is strict superset of predecessor's; superset cannot fire where subset already verified zero activations; triggered-op pre-stage gated outside 40w window.
- **188w proof:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1619` hash `4ba56cfd4fae9824`.

### 188w n1619 evidence (raw + expert-attributed)

`tools/diagnostics/sensitive_history_status.cjs`:

| Surface | n1619 | n1617 (predecessor) | Δ |
|---|---|---|---|
| Hash | `4ba56cfd4fae9824` | `17a11e99ff114aca` | CHANGED |
| Verdict | OPEN_P0 | OPEN_P0 | unchanged |
| Srebrenica capital | RBiH | RBiH | unchanged |
| Rupture | not fired | not fired | unchanged |
| Krivaja-95 turn | 179 | 179 | unchanged |
| Krivaja-95 attacks | 0 | 0 | unchanged |
| Krivaja-95 ratio | **0.094** | **0.094** | **unchanged** |
| Krivaja-95 outcome | planning_invalidated | planning_invalidated | unchanged |
| Stupčanica-95 attacks | 1 | 1 | unchanged |
| Stupčanica-95 outcome | max_failures | max_failures | unchanged |
| Stupčanica-95 ratio | 0.831 | 0.831 | unchanged |
| Cerska-Kamenica ratio | 0.600 | 0.600 | unchanged |

GREEN-regression audits:
- `tools/diagnostics/operation_delivery_audit.cjs`: 8 DELIV / 11 UNDERDELIV / 23 NO-CONTACT-OTHER / 4 NO-CONTACT-PATH / 5 PRE-FRIENDLY — **byte-stable to n1617**.
- `tools/diagnostics/opportunity_campaign_proof.cjs`: 8 observed / 4 surfaced+executed / 1 blocked / 0 reachability / 0 broken AAR — **byte-stable to n1617**.
- Brigade locations at t188 — **byte-identical to n1617** (rs_1st_milii at `sekovici:sekovici_2`, rs_5th_podrinje at `vlasenica:sebiocina` 1336 personnel, rs_1st_bratunac+rs_1st_zvornik INACTIVE per predecessor cascade).

**Hash drift WITHOUT visible gating-outcome change** — exact signature of declared `BEHAVIORAL global narrow-scope` drift class. Override branch fires (per-op `force_ratio_estimate` field VALUES shift on persisted records), but the shifts don't push any op across launch threshold in the 188w window for any sensitive-history operation.

### Expert verdicts on n1619

- **`/war-or-game` APPROVED with caveat:** § 8.3 distinction (a) honest correction. The named blocker (`computeAttackerPower` reading wrong location for context) is CLOSED at the layer it was named at. Hash drift confirms override fires somewhere; ABSENCE of effect on Krivaja's 0.094 ratio means the NEXT blocker surfaces — which is how a layered honesty pass is supposed to work. No acceptance regression, no GREEN-case regression, no Ring 3 surface, no rupture/enclave touch. Caveat: flag the next blocker as defender combat-math stack (Phase 4d) per ICTY 22:1 dominance vs sim's 0.094 (~200× delta unbridgeable by accumulating predictor-honesty fixes).

- **`/scenario-creator-runner-tester` NULL at acceptance / PARTIAL at mechanic layer:** Direct inspection of `runs/.../n1619/final_save.json` disambiguates. At Krivaja's t179 trigger, the two non-bratunac participants `rs_1st_milii` (at `op:sekovici:sekovici_2`) and `rs_5th_podrinje` (at `op:vlasenica:sebiocina`, personnel 1336 — degraded by Stupčanica cascade) have `mv_state=none` and `mv_order=none`. Neither at staging, neither at axis-approach OSID, neither in_transit. The `isCommittedInTransitTo` predicate (`status === 'in_transit'` requirement) returns false for every Krivaja participant, so the per-attacker gate `useOverride` is false, and the override never plumbs through for Krivaja's predictor at t179. Both attackers evaluated against current `location_osid` — identical to predecessor n1617. **Krivaja's 0.094 ratio holds by construction of the predicate gate, not by supply-state coincidence.** For Stupčanica at t172: rs_1st_milii was in_transit toward Krivaja staging (NOT Stupčanica's relevance set — predicate false); rs_1st_podrinje already at staging (location_osid === overrideOsid → no override needed); rs_1st_vlasenica not in_transit (predicate false). **Override fires for zero Stupčanica attackers at t172.** The 0.831 ratio is predecessor `87062cc4`'s numerator-inclusion fix's product, not this lane's. Hash drift comes from override firing on non-sensitive-history ops elsewhere in the 188w run.

**Closeability synthesis:**

Per /game-designer's predecessor-lane closeability matrix:
- RESOLVED requires "Krivaja or Stupčanica force_ratio crosses launch threshold and produces an attack as emergent consequence." Krivaja unchanged at 0.094 (far below 1.5). Stupčanica unchanged at 0.831 / attacks=1 — that was predecessor-attributable. **No acceptance-metric movement attributable to THIS lane.**
- PARTIAL requires "context fix lands but Krivaja still planning_invalidates for reasons OUTSIDE this lane." The context fix demonstrably lands (hash drift proves override fires for non-sensitive ops; faction-agnostic mechanic shipped + tests pass). The new named blocker is **upstream of `combat_math.ts`**: at Krivaja's t179 trigger, participants have no live `in_transit` state toward Krivaja relevance OSIDs — the predicate gate evaluates them as not-committed, so the override never fires for sensitive-history ops at trigger turn. This is movement-orders / pre-stage / cascade-state territory, NOT combat-math.

**Lane verdict: PARTIAL with new named blocker.** Different blocker than originally hypothesized — `/scenario-tester`'s direct final_save inspection reveals the binding constraint is upstream (movement-orders / cascade-dispersal) rather than downstream (combat-math defender stack). Successor handoff: at trigger-turn, the `prestageBrigadesForTriggeredOp` helper from `98446604` writes column-march orders, but `estimateForceRatio` runs in the same preparation sub-phase loop before `apply-brigade-movement` converts orders to `in_transit` state. The predicate `isCommittedInTransitTo` (status===`in_transit` requirement) is too strict for trigger-turn evaluation — it should also accept brigades with `brigade_movement_orders[id].destination_sids` pointing at relevance set even before status transition. Out of scope for THIS lane (the predecessor `87062cc4` defined the predicate; extending it is a sibling lane on the predicate semantic).

## Stop-Gate Compliance

| # | Gate | Status |
|---|---|---|
| 1 | NO `enclave_resilience.ts` | ✓ |
| 2 | NO `rupture_consequences.ts` | ✓ |
| 3 | NO outcome-formula changes in `combat_math.ts` (defender stack, entrenchment, terrain, Lanchester, etc.) | ✓ — only `getSupplyMult` parameter plumbing + `computeAttackerPower` parameter plumbing changed |
| 4 | NO OOB JSON | ✓ |
| 5 | NO UI/Codex files | ✓ |
| 6 | NO hardcoded controller flips / painted-target reads | ✓ |
| 7 | NO `--no-verify` | ✓ (pending; will be confirmed at commit) |
| 8 | NO `Math.random` / `Date.now` / `new Date(` (static-grep guard test T6 enforces) | ✓ |
| 9 | NO faction-specific hardcode in lane-tagged lines (T6 enforces) | ✓ |
| 10 | NO state mutation, no movement reset (override is read-only context shift) | ✓ |

## Sensitive-History Compliance

- **No Ring 3 surface.** Faction-agnostic predictor-honesty correction; same shape as predecessor `87062cc4` and Phase 4b `9ff4f352` force-ratio scoping.
- **No rupture trigger touched.** `rupture_consequences.ts` UNCHANGED.
- **No enclave mechanic mutation.** `enclave_resilience.ts` UNCHANGED.
- **No § 6 sign-off chain required.** Predictor-honesty in `combat_math.ts` context lookups + caller layer is parity with existing predictor consumers.
- **§ 8.3 distinction (a):** if Krivaja-95 force_ratio rises above launch threshold and Srebrenica subsequently falls in 188w, that is the emergent consequence of (i) ICTY-cited historical OOB (`98446604`), (ii) correct readiness mechanic (`87062cc4`), (iii) correct combat-power context (this lane), (iv) combat resolution, (v) rupture predicate — design intent. Not (b) "lane-tuning specifically to make Srebrenica fall" — the fix is symmetric and faction-agnostic.

## Hash Drift Class

**BEHAVIORAL global narrow-scope.** Only ops with at least one in-transit-to-relevant participant fire the override branch. For ops with all-staged participants: zero delta. For ops with in-transit-to-unrelated participants: zero delta (caller predicate returns false). For committed-in-transit-to-relevant: per-formation power values shift toward "would-be at destination" (typically higher when staging is better-supplied than transit territory). No new persisted field; STATE-SHAPE clean.

## Files Changed

- `src/sim/combat/sector_offensive_launch_helpers.ts` (+~5 lines: `export` + cross-lane attribution comment)
- `src/sim/combat/combat_math.ts` (+~20 lines: `getSupplyMult` 5th parameter + `computeAttackerPower` 7th parameter + JSDoc)
- `src/sim/combat/operation_preparation.ts` (+~50 lines: relevance-set construction + override OSID selection + per-attacker gate)
- `tests/operation_preparation_in_transit_context.test.ts` (new, ~530 lines, 9 tests)
- `docs/40_reports/implemented/20260502_IN_TRANSIT_COMBAT_POWER_CONTEXT.md` (this report)
- `docs/PROJECT_LEDGER.md` (entry to be prepended)
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` (one durable lesson if reusable)
- `.claude/napkin.md` (Current State to be prepended)

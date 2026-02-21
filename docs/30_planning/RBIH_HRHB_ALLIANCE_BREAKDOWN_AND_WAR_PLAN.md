# RBiH-HRHB Alliance Breakdown, Hostilities, and Ceasefire — Implementation Plan

**Date:** 2026-02-18
**Last Updated:** 2026-02-18
**Status:** Phase A complete ✅ — Phases B and C not yet started
**Scope:** Complete the RBiH-HRHB war-within-a-war: alliance-aware targeting, endogenous degradation via refugee pressure and territorial competition, bilateral combat mechanics, and Phase 0 handoff

---

## Problem Statement

The alliance lifecycle framework exists (value tracking, phases, ceasefire, Washington Agreement, minority erosion) but the war itself has no teeth:

1. **Bot AI generates attack orders against allies.** `getFactionFrontEdges()` treats any non-self settlement as enemy. Attack orders are created against allied HRHB/RBiH settlements; they're silently dropped at battle resolution. Wasted computation and misleading for the player.

2. **Bot AI never deliberately targets the other faction when at war.** When alliance < 0.0, HRHB corps in central Bosnia get a stance nudge toward offensive, but brigade-level target selection has zero awareness. No named operations target RBiH municipalities. No HRHB brigade will prioritize attacking a RBiH settlement over an RS one.

3. **Alliance degrades only from patron pressure.** The incident penalty term (`0.04 × bilateral_flips`) is always zero because Phase I control flips are disabled and Phase II has no bilateral flip counting. The alliance decay is entirely exogenous — nothing the factions do in-game affects it.

4. **Refugee arrivals in mixed municipalities have no effect on alliance.** When RS displaces Bosniaks from eastern Bosnia, those refugees flow to Tuzla, Zenica, Travnik via the routing system. When they arrive in mixed municipalities (Travnik, Bugojno, Vitez), this should create demographic pressure that strains the RBiH-HRHB relationship — historically, this was a major driver of the Lasva Valley conflict. Currently, `displaced_in` feeds militia pools but has zero alliance impact.

5. **Phase 0 relationship is orphaned.** `phase0_relationships.rbih_hrhb` is tracked during Phase 0 investment but never mapped to `phase_i_alliance_rbih_hrhb` at the Phase 0 → I transition.

---

## Design Principles

- **Endogenous over exogenous.** Alliance should degrade because of things that happen in the game (territorial competition, refugee pressure, bilateral clashes), not just because a patron pressure clock ticks.
- **Negative-sum.** Opening a second front against your ally weakens both factions against RS. This should be mechanically felt, not just narratively implied.
- **Deterministic.** All calculations sorted, no randomness, per engine invariants.
- **Historically grounded.** The Lasva Valley conflict (Oct 1992 – Feb 1994) was driven by: demographic pressure from Bosniak refugees in central Bosnia, HRHB territorial ambitions, competition over mixed municipalities, and Croatian patron pressure. The system should reflect all four drivers.

---

## Implementation Phases

### Phase A: Alliance-Aware Bot Targeting (Layer 1 — Essential) ✅ COMPLETE

**Goal:** Bots don't attack allies; bots do attack enemies when at war.
**Implemented:** 2026-02-18 | **Verified:** typecheck clean, 130/130 vitest pass

#### A1: Brigade AI Target Filtering ✅

**File:** `src/sim/phase_ii/bot_brigade_ai.ts`

**What was implemented:**
- Added `isBilateralAlly(state, faction, targetFaction)` helper (lines 101-114). Returns true when RBiH↔HRHB and (alliance > ALLIED_THRESHOLD OR ceasefire_active OR washington_signed).
- Modified `getFactionFrontEdges()` (lines 157-195): now calls `isBilateralAlly()` on each edge's enemy faction and skips edges against bilateral allies. Simplified logic: allied = skip, not allied = include (strained edges included because `isBilateralAlly` returns false when alliance ≤ 0.20 and no ceasefire/washington).
- Added bilateral war priority bonus to `scoreTarget()` (lines 377-391): new "6. Bilateral war priority" section. When `isRbihHrhbAtWar(state)` is true and target is controlled by bilateral opponent, adds bonus scaled by `-allianceValue * 120`, capped at `SCORE_BILATERAL_WAR_TARGET = 60`.
- New constant: `SCORE_BILATERAL_WAR_TARGET = 60` (line 90).
- New imports: `areRbihHrhbAllied`, `isRbihHrhbAtWar`, `ALLIED_THRESHOLD`, `HOSTILE_THRESHOLD` from `alliance_update.js` (line 29).

**Design note:** The planned strained-state nuance (exclude bilateral edges "UNLESS in a contested mixed municipality") was simplified to: allied = skip all, not allied = include all. This is simpler and sufficient — in the strained state (0.0-0.20) the edges are included but `scoreTarget()` gives them zero bilateral bonus, so brigades won't prioritize them over RS targets.

#### A2: Corps AI Named Operations ✅

**File:** `src/sim/phase_ii/bot_corps_ai.ts`

**What was implemented:**
- `getOperationCatalog()` signature changed to `getOperationCatalog(faction, state)` (line 341).
- Call site updated in `generateCorpsOperationOrders()` (line 384).
- RBiH (lines 350-366): block-scoped `ops` array. Adds "Central Bosnia Defense" (strategic_defense) when alliance < 0.0. Adds "Mostar Counter" (sector_attack) when alliance < -0.30.
- HRHB (lines 367-382): block-scoped `ops` array. Adds "Lasva Valley Offensive" and "Mostar Division" (both sector_attack) when alliance < 0.0.
- RS: unchanged (lines 343-349).

#### A3: Corps Stance — Anti-Bilateral Offensive ✅

**File:** `src/sim/phase_ii/bot_corps_ai.ts`

**What was implemented:**
- RBiH bilateral war awareness (lines 307-318): new block after late-war counteroffensive. When alliance < 0.0 and Washington not signed, corps in central Bosnia municipalities (travnik, bugojno, vitez, novi_travnik, busovaca, kiseljak, zenica) are set to balanced (unless reorganize).
- HRHB expanded stance (lines 319-345): replaced single-threshold check with two tiers:
  - Open war (alliance < 0.0): non-Herzegovina corps → offensive (if personnel ≥ 0.5, cohesion ≥ 40)
  - Strained (alliance < 0.2): non-Herzegovina corps in defensive/reorganize bumped to balanced (if personnel ≥ 0.5)

**Design note:** The "full war" tier (alliance < -0.50, force 2+ HRHB corps offensive, 1+ RBiH counterattack) was deferred. The current open-war overrides are sufficient for initial behavior — the full-war escalation can be added as a refinement after scenario testing reveals whether the current aggression levels reproduce the historical timeline.

#### A4: Phase I Bot Posture — Alliance Awareness ✅

**File:** `src/sim/phase_i/bot_phase_i.ts`

**What was implemented:**
- Alliance phase logic expanded (lines 87-90): `rbihHrhbAllied` now also true when ceasefire active or Washington signed. New `rbihHrhbAtWar` boolean (alliance < 0.0 AND no ceasefire AND no Washington).
- Edge filtering simplified (lines 97-110): cleaner `isBilateral` variable + single-line filter. Bilateral edges skipped when allied, included otherwise.
- Bilateral posture overrides (lines 152-175): after standard posture assignment, overrides bilateral edges when at war:
  - HRHB: 30% of bilateral edges get `push`, rest `hold` (using deterministic `edgeHash`)
  - RBiH: 10% of bilateral edges get `probe`, rest `hold`

**Design note:** The strained-state behavior (0.0 ≤ alliance < 0.2 → "include edges but assign all to 'hold'") happens naturally: bilateral edges are included (not filtered out since `rbihHrhbAllied` is false at < 0.2), and the override block only fires when `rbihHrhbAtWar` is true (< 0.0). So strained edges get standard posture assignment, which defaults to hold/probe/push based on the standard profile — effectively watchful, as intended.

#### A5: Battle Resolution Safety Valve ✅

**File:** `src/sim/phase_ii/battle_resolution.ts`

**What was implemented:**
- Restructured bilateral block (lines 806-818): `isRbihVsHrhb` check now gates a block that reads `rbih_hrhb_state` for explicit `ceasefireActive` and `washingtonSigned` checks.
- `rbihHrhbAllied` now evaluates as: `beforeEarliestWar || areRbihHrhbAllied(state) || ceasefireActive || washingtonSigned`.
- This covers the gap where ceasefire is active but alliance score hasn't yet recovered above 0.20.

---

### Phase B: Endogenous Alliance Degradation (Layer 2 — Important)

**Goal:** Alliance degrades from in-game events, not just patron pressure clock.

#### B1: Refugee Pressure in Mixed Municipalities

**File:** `src/sim/phase_i/alliance_update.ts` (new formula terms)

**Concept:** When displaced Bosniaks arrive in mixed municipalities, they shift the demographic balance and create competition for resources, housing, and political control. This was the primary historical driver of the Lasva Valley war.

**New per-turn calculation in `updateAllianceValue()`:**

```
refugee_pressure = 0

For each municipality in allied_mixed_municipalities:
  ds = displacement_state[mun_id]
  if ds.displaced_in == 0: continue

  // Compute arrival rate: new arrivals this turn (displaced_in delta)
  // We need to track previous displaced_in — add displaced_in_prev to DisplacementState
  // OR: use a simpler proxy: displaced_in / original_population ratio

  refugee_ratio = ds.displaced_in / max(1, ds.original_population)

  // Pressure scales with ratio: 10% arrivals = moderate, 30%+ = severe
  if refugee_ratio > 0.05:
    refugee_pressure += REFUGEE_PRESSURE_PER_MUN * min(1.0, refugee_ratio / 0.30)
```

**Constants:**
```
REFUGEE_PRESSURE_PER_MUN = 0.004  // per mixed mun with significant refugees
REFUGEE_PRESSURE_RATIO_CAP = 0.30 // ratio at which pressure is maximal
REFUGEE_PRESSURE_MIN_RATIO = 0.05 // below this, no pressure
```

**Effect:** `refugee_pressure` is subtracted from the alliance delta (acts like patron_drag). With 7 mixed municipalities each at 20% refugee ratio, total drag = 7 × 0.004 × (0.20/0.30) = 0.019/turn — comparable to patron pressure (0.015 × commitment). This means heavy refugee influx can push the alliance from fragile (0.35) to hostile (0.0) in ~18 turns (~4.5 months), which matches the historical Oct 1992 → Jan 1993 timeline.

**Historical calibration:** Travnik received ~50,000 refugees (original pop ~30,000) by mid-1993. That's a ratio of 1.67 — well above the 0.30 cap. Vitez received ~10,000 (original ~12,000), ratio ~0.83. These extreme values should max out the pressure term for those municipalities.

#### B2: Territorial Competition Incidents

**File:** `src/sim/phase_i/alliance_update.ts`

**Concept:** When HRHB captures a settlement that is demographically Bosniak-majority (or vice versa), this is an alliance incident even if the settlement was RS-controlled at the time. "Taking back from RS" is fine when it's your ethnic territory; taking mixed or other-aligned territory is provocation.

**New incident detection (runs after control flip step):**

```
For each settlement that flipped this turn:
  if new_controller is RBiH or HRHB:
    old_controller = previous controller

    // Skip if capturing from RS (common cause, no bilateral friction)
    if old_controller == 'RS':
      // BUT: check demographic alignment
      mun = sidToMun[sid]
      if mun in allied_mixed_municipalities:
        // Capturing RS-held settlement in a mixed mun — mild friction
        territorial_incidents += 0.5
      continue

    // Direct bilateral flip: one faction took from the other
    if (new_controller == 'RBiH' && old_controller == 'HRHB') ||
       (new_controller == 'HRHB' && old_controller == 'RBiH'):
      territorial_incidents += 1.0
```

**Feed into alliance update:**
```
territorial_penalty = TERRITORIAL_INCIDENT_PENALTY * territorial_incidents
                    = 0.02 * incidents
```

This replaces (or supplements) the existing `INCIDENT_PENALTY_PER_FLIP` which currently reads from `bilateral_flips_this_turn` (always zero).

#### B3: Phase II Bilateral Flip Counting

**File:** `src/sim/turn_pipeline.ts` (Phase II steps)

The Phase I bilateral flip counting step already exists but Phase I control flips are disabled. For Phase II, add a bilateral flip counter after the battle resolution / control flip step:

```
New step: 'phase-ii-bilateral-flip-count'
  Run after 'control-flip' or 'battle-resolution'
  Count settlements that flipped between RBiH↔HRHB this turn
  Update rbih_hrhb_state.bilateral_flips_this_turn
  Update stalemate_turns accordingly
```

This feeds into the next turn's alliance update via the existing `INCIDENT_PENALTY_PER_FLIP` (0.04) term.

#### B4: Phase 0 → Phase I Alliance Handoff

**File:** `src/ui/warroom/run_phase0_turn.ts` (in `applyPhaseIHandoff()`)
**File:** `src/state/turn_pipeline.ts` (in Phase 0 → Phase I transition)

When `runPhase0Turn` transitions to `phase_i`:

```typescript
// Map Phase 0 relationship to Phase I alliance value
if (state.phase0_relationships?.rbih_hrhb !== undefined) {
  // Phase 0 rbih_hrhb is in [0, 1] range; map to Phase I range
  // Phase 0 starts at 1.0 (full cooperation) and degrades
  // Phase I alliance starts at 0.35 (fragile) as baseline
  // Use Phase 0 value to adjust: if Phase 0 degraded significantly, start lower
  const phase0Value = state.phase0_relationships.rbih_hrhb;
  const degradation = 1.0 - phase0Value; // 0 = no degradation, 1 = full breakdown
  state.phase_i_alliance_rbih_hrhb = DEFAULT_INIT_ALLIANCE - (degradation * 0.15);
  // Clamp to [0.20, 0.50] — can't start in open war (gated by earliest_turn)
  state.phase_i_alliance_rbih_hrhb = Math.max(0.20, Math.min(0.50, state.phase_i_alliance_rbih_hrhb));
}
```

**Estimated effort:** 1–2 sessions

---

### Phase C: Bilateral War Mechanics (Layer 3 — Full Realization)

**Goal:** The war has real mechanical consequences — second fronts, formation diversion, displacement cascades.

#### C1: Bilateral Front Edge Generation

**File:** `src/map/front_edges.ts` or new file `src/sim/phase_ii/bilateral_front.ts`

When alliance ≤ HOSTILE_THRESHOLD (0.0):

```
Compute RBiH-HRHB front edges:
  For each settlement edge where pc[a] is RBiH and pc[b] is HRHB (or vice versa):
    Add to bilateral_front_edges

These edges participate in:
  - Front pressure accumulation (existing system)
  - Brigade AoR assignment (brigades need to cover bilateral front)
  - Battle resolution (attacks can occur across these edges)
```

This is the key mechanical consequence: **formations must now cover two fronts**, stretching both factions thin against RS.

#### C2: Formation Diversion

**File:** `src/sim/phase_ii/bot_corps_ai.ts`

When alliance < 0.0 and HRHB has ≥3 corps:
- Reassign 1 corps AoR to cover RBiH front (central Bosnia)
- This corps is no longer available for anti-RS operations
- RS benefits indirectly (fewer brigades facing them)

When alliance < 0.0 and RBiH has ≥4 corps:
- Reassign 1 corps to defensive posture on HRHB front
- Weaker posture on RS fronts

**New function: `reassignCorpsForBilateralWar()`**
- Runs in `generateAllCorpsOrders()` when alliance < 0.0
- Selects corps closest to bilateral front (by AoR overlap with mixed municipalities)
- Forces that corps to cover bilateral front edges

#### C3: Bilateral Displacement Cascade

**File:** `src/state/displacement.ts` and `src/state/displacement_takeover.ts`

When RBiH↔HRHB settlement flips occur:
- Use existing takeover displacement system (timer → camp → route)
- But with **reduced kill fraction** (0.03 vs 0.10 for RS takeovers) — ethnic cleansing was less systematic in the RBiH-HRHB war than in RS campaigns
- **Higher flee-abroad fraction for HRHB** — Croat civilians had Croatia as refuge
- Displaced Bosniaks route to RBiH-controlled municipalities
- Displaced Croats route to HRHB-controlled municipalities (Herzegovina)

The refugees from bilateral fighting further strain the alliance in remaining mixed municipalities (feedback loop with B1).

#### C4: Ceasefire Mechanics — Freeze and Recovery

**Files:** `src/sim/phase_i/bilateral_ceasefire.ts`, battle resolution

When ceasefire fires:
- **Freeze bilateral attacks** (already handled in battle_resolution via alliance check, but add explicit ceasefire check per A5)
- **Freeze bilateral control flips** (already handled in `hasAdjacentHostile()`)
- **Alliance recovery** at +0.015/turn (already implemented)
- **Formation redeployment:** bot AI should detect ceasefire and begin shifting corps back to anti-RS posture (undo C2 diversion). Add to `generateAllCorpsOrders()`:

```
if ceasefire_active and bilateral corps still assigned:
  Release bilateral corps → revert to balanced anti-RS posture
  This takes 2-3 turns (gradual, not instant)
```

#### C5: Washington — Permanent Lock and Joint Operations

Mostly already implemented. Verify/add:
- **Joint pressure bonus** (1.15×) is actually applied in battle resolution for mixed municipality defense. Currently defined as constant but grep shows no application site.
- **COORDINATED_STRIKE doctrine** eligibility is set but verify the doctrine system reads it.
- **Mixed municipality restoration** — currently just a comment. Add explicit code to reset `allied_mixed_municipalities` from current militia state.

**Estimated effort:** 2–3 sessions

---

## Concrete Task List

### Phase A (Essential — Do First) ✅ COMPLETE

| # | Task | File(s) | Status |
|---|------|---------|--------|
| A1a | Add `isBilateralAlly()` helper | `bot_brigade_ai.ts` | ✅ Done |
| A1b | Filter bilateral edges in `getFactionFrontEdges()` | `bot_brigade_ai.ts` | ✅ Done |
| A1c | Add bilateral war priority bonus to `scoreTarget()` | `bot_brigade_ai.ts` | ✅ Done |
| A2a | Pass `state` to `getOperationCatalog()` | `bot_corps_ai.ts` | ✅ Done |
| A2b | Add bilateral named operations (conditional on alliance) | `bot_corps_ai.ts` | ✅ Done |
| A2c | Filter operation relevance for bilateral targets | `bot_corps_ai.ts` | ✅ (inherits from existing relevance logic) |
| A3 | Expand HRHB/RBiH corps stance overrides for open/full war | `bot_corps_ai.ts` | ✅ Done (full-war tier deferred) |
| A4 | Extend Phase I bot posture for bilateral edges | `bot_phase_i.ts` | ✅ Done |
| A5 | Add ceasefire check to battle resolution bilateral block | `battle_resolution.ts` | ✅ Done |
| A-test | Verify: typecheck clean, vitest pass | — | ✅ 0 errors, 130/130 pass |

### Phase B (Important — Do Second) ⬜ NOT STARTED

| # | Task | File(s) | Status |
|---|------|---------|--------|
| B1a | Add `REFUGEE_PRESSURE_*` constants | `alliance_update.ts` | ⬜ Pending |
| B1b | Compute refugee pressure per mixed municipality | `alliance_update.ts` | ⬜ Pending |
| B1c | Subtract refugee pressure from alliance delta | `alliance_update.ts` | ⬜ Pending |
| B2a | Add territorial competition incident detection | `alliance_update.ts` | ⬜ Pending |
| B2b | Add `TERRITORIAL_INCIDENT_PENALTY` to alliance formula | `alliance_update.ts` | ⬜ Pending |
| B3a | Add `phase-ii-bilateral-flip-count` step | `sim/turn_pipeline.ts` | ⬜ Pending |
| B3b | Wire bilateral flip count from Phase II control flips | `sim/turn_pipeline.ts` | ⬜ Pending |
| B4a | Map `phase0_relationships.rbih_hrhb` → `phase_i_alliance` at handoff | `run_phase0_turn.ts`, `state/turn_pipeline.ts` | ⬜ Pending |
| B-test | Verify: typecheck, vitest, 52-week scenario. Check alliance degrades from refugees. | — | ⬜ Pending |

### Phase C (Full Realization — Do Third) ⬜ NOT STARTED

| # | Task | File(s) | Status |
|---|------|---------|--------|
| C1 | Compute bilateral front edges when at war | `front_edges.ts` or new file | ⬜ Pending |
| C2a | Add `reassignCorpsForBilateralWar()` | `bot_corps_ai.ts` | ⬜ Pending |
| C2b | Wire into `generateAllCorpsOrders()` | `bot_corps_ai.ts` | ⬜ Pending |
| C3a | Add bilateral displacement parameters (lower kill fraction) | `displacement_takeover.ts` | ⬜ Pending |
| C3b | Route bilateral displaced to correct destinations | `displacement_takeover.ts` | ⬜ Pending |
| C4 | Add ceasefire → corps redeployment logic | `bot_corps_ai.ts` | ⬜ Pending |
| C5a | Verify/apply Washington joint pressure bonus in battle | `battle_resolution.ts` | ⬜ Pending |
| C5b | Add explicit mixed municipality restoration post-Washington | `washington_agreement.ts` | ⬜ Pending |
| C-test | Verify: typecheck, vitest, 104-week scenario. Confirm bilateral war opens/closes, formations divert, ceasefire restores. | — | ⬜ Pending |

---

## Files Modified (Summary)

| File | Phase | Changes | Status |
|------|-------|---------|--------|
| `src/sim/phase_ii/bot_brigade_ai.ts` | A | `isBilateralAlly()`, `getFactionFrontEdges()` filtering, `scoreTarget()` bilateral bonus | ✅ Done |
| `src/sim/phase_ii/bot_corps_ai.ts` | A, C | `getOperationCatalog(faction, state)`, bilateral ops, stance overrides; (C: corps reassignment) | ✅ A done, C pending |
| `src/sim/phase_i/bot_phase_i.ts` | A | Ceasefire/Washington awareness, bilateral edge filtering, posture overrides | ✅ Done |
| `src/sim/phase_ii/battle_resolution.ts` | A, C | Ceasefire+Washington check in bilateral block; (C: joint pressure bonus) | ✅ A done, C pending |
| `src/sim/phase_i/alliance_update.ts` | B | Refugee pressure term, territorial incidents | ⬜ Pending |
| `src/sim/turn_pipeline.ts` | B, C | Phase II bilateral flip count step | ⬜ Pending |
| `src/state/turn_pipeline.ts` | B | Phase 0 → Phase I alliance handoff | ⬜ Pending |
| `src/ui/warroom/run_phase0_turn.ts` | B | Phase 0 → Phase I alliance handoff | ⬜ Pending |
| `src/state/displacement_takeover.ts` | C | Bilateral displacement parameters | ⬜ Pending |
| `src/map/front_edges.ts` | C | Bilateral front edge computation | ⬜ Pending |
| `src/sim/phase_i/washington_agreement.ts` | C | Mixed municipality restoration | ⬜ Pending |

---

## Verification Strategy

### Per-Phase Checks
1. `npx tsc --noEmit` — clean
2. `npm run test:vitest` — all pass
3. `npm run sim:scenario:run:default` — 52-week scenario runs without errors

### Behavioral Spot-Checks

**Phase A verification:**
- Run 52-week scenario as RS. Confirm HRHB does NOT attack RBiH settlements when alliance > 0.20.
- Set initial alliance to -0.10. Confirm HRHB brigades generate attack orders against RBiH targets.
- Confirm battle resolution blocks RBiH↔HRHB battles when ceasefire active.

**Phase B verification:**
- Run scenario with heavy RS displacement of eastern Bosnia. Confirm alliance degrades faster when refugees arrive in mixed municipalities.
- Confirm alliance value at Phase I start reflects Phase 0 relationship degradation.
- Confirm bilateral flip count works in Phase II (test with forced alliance < 0.0).

**Phase C verification:**
- Run 104-week scenario. Confirm:
  - RBiH-HRHB front edges appear when alliance < 0.0
  - HRHB diverts 1 corps to bilateral front
  - Both factions weaken on RS fronts (check RS territorial gains increase)
  - Ceasefire fires after sufficient exhaustion
  - Post-ceasefire, corps redeploy to RS front
  - Washington locks alliance, joint operations resume

### Historical Timeline Validation

The system should approximately reproduce:
- **Apr–Oct 1992:** Alliance fragile but holding (0.20–0.35)
- **Oct 1992:** First bilateral clashes (alliance crosses 0.20 into strained)
- **Jan 1993:** Open war begins (alliance crosses 0.0), Lasva Valley operations
- **Feb 1994:** Ceasefire (mutual exhaustion after ~15 months of bilateral fighting)
- **Mar 1994:** Washington Agreement (ceasefire holds, patron pressure peaks)
- **Mar 1994+:** Joint operations against RS, alliance locked at 0.80

Deviation of ±2 months from historical timeline is acceptable. Larger deviations indicate calibration issues with refugee pressure, patron pressure, or exhaustion rates.

---

## Open Design Questions (Resolved)

**Q: Should the player be able to prevent the alliance breakdown?**
A: Yes, partially. If the player is RBiH and avoids settling refugees in mixed municipalities (by directing displacement to non-mixed destinations), alliance degradation slows. If the player is HRHB and avoids territorial grabs in mixed areas, same effect. But patron pressure and demographic reality make complete prevention very difficult — historically, it was arguably inevitable.

**Q: Should bilateral operations reduce exhaustion against RS?**
A: No. Bilateral fighting adds exhaustion for the fighting factions (existing system handles this). The reduced pressure on RS is an emergent consequence of fewer formations facing RS, not a special mechanic.

**Q: What happens to mixed municipality allied defense during open war?**
A: The existing system already handles this — `computeAlliedDefense()` checks alliance > ALLIED_THRESHOLD (0.20). When at war (alliance < 0.0), allied defense bonus is zero. No changes needed.

---

## Calibration Constants (Summary)

| Constant | Value | Rationale |
|----------|-------|-----------|
| `REFUGEE_PRESSURE_PER_MUN` | 0.004 | 7 municipalities at moderate pressure ≈ patron drag (0.028 total) |
| `REFUGEE_PRESSURE_RATIO_CAP` | 0.30 | 30% displaced_in/original_pop = maximum pressure |
| `REFUGEE_PRESSURE_MIN_RATIO` | 0.05 | Below 5%, negligible demographic impact |
| `TERRITORIAL_INCIDENT_PENALTY` | 0.02 | Per incident; 3 incidents/turn = 0.06 (significant) |
| `BILATERAL_WAR_SCORE_BONUS` | 60 | Max attack priority bonus for bilateral targets |
| `BILATERAL_KILL_FRACTION` | 0.03 | Lower than RS takeover (0.10) — less systematic |
| `BILATERAL_HRHB_FLEE_ABROAD` | 0.35 | Higher than default HRHB (0.25) — Croatia proximity |

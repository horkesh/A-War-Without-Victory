# Organic Territory Build Plan — BRIEF-GAP-1 / BRIEF-GAP-6 / ARMY-GAP-1 Re-audit
**Date:** 2026-06-11  
**Owner gate:** floor-moving calibration; each gap = separate 188w run  
**Scope:** READ-ONLY investigation + precise build spec; no code edited  
**Problem:** RS control frozen 52.7%→51.8% from w40 to w140 (one OSID per 17 weeks), then scripted 1995 cliff. Corps AI cannot detect weakening sectors because briefing inputs are hardcoded.

---

## 0. Critical Finding: ARMY-GAP-1 is Already Closed

The original audit claim ("CampaignPlan from army_hq_gathering.ts is never read by corps CO briefings") is **FALSE in current main**.

Investigation confirms full wiring is present:
- `army_hq_gathering.evaluateArmyHQGathering` writes `state.military.campaign_plans[faction]` 
- `briefing.collectCampaignIntent` (`briefing.ts:555`) reads `state.military.campaign_plans?.[faction]` and populates 6 fields on `CommanderBriefing`: `campaign_role`, `campaign_offensive_targets`, `campaign_hold_targets`, `campaign_stance_ceiling`, `campaign_sync_role`, `campaign_sync_targets`
- War-phases pipeline step `evaluate-army-hq-gathering` runs BEFORE `generate-bot-corps-orders` within the same turn, so freshly-written plans are visible
- Binding regression test: `tests/a1_army_hq_campaign_plan_wired.test.ts` — explicitly documents this closure with comment: *"The audit flagged that the CampaignPlan … was 'never read by corps CO briefings'. Investigation for this lane found the wiring is in fact PRESENT"*

**ARMY-GAP-1 requires no build work.** It was closed by the A1/C1 wiring lanes (shipped). Do not re-implement.

The two real open gaps are **BRIEF-GAP-1** and **BRIEF-GAP-6**.

---

## 1. BRIEF-GAP-1: Supply — Partial Wire, Not the "Hardcoded 0.8" the Audit Named

### What the audit said
"supply_by_osid is never consumed by the corps briefing — it's hardcoded 0.8. ARBiH COs attack as if well-supplied despite 94% strained."

### What the code actually shows (re-audit, 2026-06-11)

**The supply IS wired end-to-end through the briefing.** The data flow:

1. `war_phases.ts:1241` (`supply-osid` step): `deriveSupplyStateByOsid` computes a `SupplyStateByOsidReport` — per-faction, per-OSID supply states (`adequate`/`strained`/`critical`)
2. `war_phases.ts:1243`: result stored in `context.report.supply_resolution.supply_state_by_osid`  
3. `war_phases.ts:2236` (`generate-bot-corps-orders` step): `const supplyByOsid = context.report.supply_resolution?.supply_state_by_osid` — this CAN be null/undefined if `supply_resolution` has no `supply_state_by_osid` (e.g., if `load-operational-data` failed to load, or if `supply_resolution` itself is absent)
4. `bot_corps_ai.ts:419`: `supplyByOsid ?? null` passed into `runCommanderForCorps`
5. `commander_loop.ts:179`: passed into `buildBriefing`
6. `briefing.ts:813`: placed on briefing as `supply_by_osid: supplyByOsid` (nullable)
7. `assess.ts:105`: `evaluateCorpsForces(briefing.brigades, zones, briefing.supply_by_osid)` — passes supply to force evaluation
8. `force_eval.ts:223`: `getBrigadeSupplyState(brigade, supplyByOsid)` called per brigade — looks up brigade's `location_osid` in the per-faction `by_osid` array

**The `default: return 0.8` at `force_eval.ts:58` is triggered when `supplyStatus` is `undefined`.** This happens when `getBrigadeSupplyState` returns `undefined`, which occurs when:
- `supplyByOsid` is null (supply pipeline didn't run — headless test or missing operational data)
- The brigade has no `location_osid` or no `faction` 
- The brigade's `location_osid` is not in the per-faction `by_osid` array

### The Real Gap

The comment at `force_eval.ts:50-51` is self-describing: *"The briefing supply_by_osid does not carry per-brigade narrowing yet; brigades don't expose supply_status directly."* The lookup path IS implemented (`getBrigadeSupplyState`), but **if a brigade's `location_osid` is not in the supply report's `by_osid` array, it falls through to the 0.8 default**. This is the actual gap: brigades at OSIDs not covered by the supply derivation (e.g., rear-area OSIDs, staging areas, OSIDs outside the corridor BFS scope) silently get 0.8 instead of the actual supply state.

**Additionally:** `supply_by_osid` is also consumed by `belief.ts:356` (supply confidence) and `emit.ts:201` (combat predictor). These are already wired.

### Hardcoded site

`src/sim/combat/commander/force_eval.ts:58`  
```typescript
default: return 0.8; // unknown / not available
```

### Real-value source

`context.report.supply_resolution?.supply_state_by_osid` (produced by `war_phases.ts:1241`, `supply-osid` step)  
Structure: `SupplyStateByOsidReport.factions[].by_osid[].{osid, state}` — per `src/state/supply_state_derivation.ts:119`

### The Minimal Fix

The `getBrigadeSupplyState` function already exists and does the right lookup. The gap is that brigades whose `location_osid` is absent from the supply report fall to 0.8. The fix is to return a faction-level fallback from the supply report rather than 0.8 when the OSID is not found:

**File:** `src/sim/combat/commander/force_eval.ts`  
**Lines:** `getBrigadeSupplyState` function (lines 62-74) — add a faction-level fallback when per-OSID lookup misses:

```diff
 function getBrigadeSupplyState(
     brigade: FormationState,
     supplyByOsid: SupplyStateByOsidReport | null | undefined,
 ): SupplyStateLevel | undefined {
     if (!brigade.location_osid || !brigade.faction || !supplyByOsid) {
         return undefined;
     }
     const factions = supplyByOsid.factions ?? [];
     const factionEntry = factions.find(entry => entry?.faction_id === brigade.faction);
     if (!factionEntry || !Array.isArray(factionEntry.by_osid)) return undefined;
     const osidEntry = factionEntry.by_osid.find(entry => entry?.osid === brigade.location_osid);
-    return osidEntry?.state;
+    // If per-OSID entry missing, use faction-wide modal supply state as fallback.
+    // This prevents 0.8 "unknown" default from masking a faction that is broadly strained/critical.
+    if (osidEntry?.state) return osidEntry.state;
+    // Derive modal state from factionEntry.by_osid (majority vote)
+    const counts: Record<string, number> = {};
+    for (const e of factionEntry.by_osid) {
+        if (e?.state) counts[e.state] = (counts[e.state] ?? 0) + 1;
+    }
+    const modal = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as SupplyStateLevel | undefined;
+    return modal;
 }
```

**IMPORTANT CAVEAT:** Before building, verify empirically whether `getBrigadeSupplyState` is actually returning `undefined` at scale (94% strained ARBiH claim). Check this by inspecting a 188w `final_save.json` — read `state.political.last_supply_state_by_osid` (written at `war_phases.ts:1254`) and cross-reference ARBiH brigade `location_osid` values. If 94% of ARBiH OSIDs are in the supply report with `strained`, then `getBrigadeSupplyState` IS returning `'strained'` already, and `supplyMult('strained') = 0.75` is being applied — meaning the gap may be smaller than stated. The 0.8 default would only fire for the minority of brigades at unlisted OSIDs.

### Downstream decision changed

`evaluateBrigade` (`force_eval.ts:114-117`): `fitnessOffense = personnelNorm * sMult * cohesionNorm * (1 + equipPriority * 0.25) * fatigueOffenseMult * (disrupted ? 0 : 1)`

A strained ARBiH brigade (supply=0.75 vs default=0.8): `fitnessOffense` drops by 6.25%. For a 1000-personnel, cohesion=50, light-infantry brigade: `fitnessOffense` goes from ~0.40× to ~0.375×, which crosses the `MAIN_EFFORT_FITNESS_THRESHOLD = 0.4` boundary. Result: more ARBiH brigades tier to `active_defense` instead of `main_effort`, reducing `allocation.surplus_pool`, which suppresses op launches.

This is the behavioral mover: ARBiH corps accumulate fewer surplus brigades → fewer commander-initiated offensive operations → RS holds more territory organically.

---

## 2. BRIEF-GAP-6: recent_territory_change Hardcoded to 0

### What the audit said
"`recent_territory_change` is hardcoded to 0 in `assessCorps()` — theater assessment is blind to ground-loss trends."

### What the code actually shows (re-audit, 2026-06-11)

The `computeRecentTerritoryChange` function IS fully implemented in `army_hq_gathering.ts`:

**File:** `src/sim/combat/army_hq_gathering.ts:376`  
**Export:** `export function computeRecentTerritoryChange(state, faction, corpsId): number`  
**Logic:** Reads `state.political.control_events` (last 6 turns), scoped to the corps's sector OSIDs + sub_segment friendly/enemy OSIDs; positive = gains, negative = losses.

**File:** `src/sim/combat/army_hq_gathering.ts:271`  
`const recentTerritoryChange = computeRecentTerritoryChange(state, faction, corpsId);`  
This is called inside `assessCorps` at line 271 and the result IS placed on the `CorpsAssessment` struct at line 279.

**The gap is NARROWER than the audit stated.** `recentTerritoryChange` IS computed and IS placed on `CorpsAssessment`. It IS consumed inside the Army HQ opportunity scoring (`army_hq_gathering.ts:524-531`) to set `CampaignPlan.front_priorities[].role`. The CampaignPlan role IS read by `briefing.collectCampaignIntent` as shown in §0.

**However, there is a residual gap:** The `assessCorps` function is called from `evaluateArmyHQGathering` which runs once at the Army HQ gathering cadence (not every turn). If the gathering has not run recently (expired plan), the `recent_territory_change` signal used for `campaign_role` assignment is stale. More critically: `recent_territory_change` is consumed ONLY at the army-level opportunity scoring layer to set campaign roles — it is NOT threaded into the per-corps commander briefing as a direct field. The corps commander cannot directly see "I lost 3 OSIDs this week" in the briefing — it only propagates indirectly through the campaign role.

### The Hardcoded Site

The audit claim of "hardcoded 0" is STALE — the value is computed. However, the **per-corps briefing does not expose `recent_territory_change` as a direct field**. The `CommanderBriefing` interface (`commander_state.ts`) does not include `recent_territory_change`. The corps commander sees only the derived `campaign_role` (primary/secondary/economy/contain), not the underlying territory-trend number.

The gap is not a hardcoded 0 at assembly time — it is that the briefing lacks a direct `territory_trend` field that the `assessSituation` / `assessThreats` path could use to upgrade a zone's threat level immediately after a loss, rather than waiting for the next army HQ gathering window.

### Minimal Fix (Option A — low risk, confirmed signal)

Wire `computeRecentTerritoryChange` from `army_hq_gathering.ts` directly into `buildBriefing` and expose it on `CommanderBriefing` as `recent_territory_change: number`.

**File 1:** `src/sim/combat/commander/commander_state.ts` — add to `CommanderBriefing` interface:
```diff
+    /** Net OSID change near this corps's front in the last 6 turns (positive=gains, negative=losses). */
+    recent_territory_change?: number;
```

**File 2:** `src/sim/combat/commander/briefing.ts:638` — add import and populate field:
```diff
+import { computeRecentTerritoryChange } from '../army_hq_gathering.js';
 
 // inside buildBriefing(), after campaignIntent assembly:
+    const recentTerritoryChange = computeRecentTerritoryChange(state, faction, corpsId);
 
 // in the returned briefing object:
+    recent_territory_change: recentTerritoryChange,
```

**File 3:** `src/sim/combat/commander/assess.ts` — consume in `assessThreats` or `assessSituation` to upgrade zone threat level:
```diff
 // In assessThreats, after osidsLost check:
-        } else if (zone.deficit > HIGH_THREAT_DEFICIT) {
+        } else if (zone.deficit > HIGH_THREAT_DEFICIT
+            || (briefing.recent_territory_change !== undefined && briefing.recent_territory_change <= -2)) {
             threatLevel = 'high';
```

The current threat upgrade path only fires when `previousState` has zone-level loss history (requires the commander loop to have run the prior turn for the same corps). By adding the territory-trend signal directly, a corps that has been losing ground will see elevated threat levels even on the first turn after a loss cluster.

**Downstream decision changed:** `assessThreats` → `ThreatAssessment.overall_pressure` → `makeDecisions` (`decide.ts`) → reinforcement requests, surplus suppression. More pressured corps defend more, launch fewer ops.

---

## 3. Serial Measurement Order and Rationale

**One change per 188w, per the sacred calibration rule.**

### Recommended order: BRIEF-GAP-1 first, then BRIEF-GAP-6

**Run 1 — BRIEF-GAP-1 (supply fallback):** Wire the modal-supply fallback in `getBrigadeSupplyState`. This is the biggest behavioral mover because it directly affects `fitnessOffense` for every brigade every turn. ARBiH brigades at strained OSIDs that currently hit the 0.8 default will now get 0.75, dropping them below `MAIN_EFFORT_FITNESS_THRESHOLD`. This suppresses ARBiH offensive surplus → RS holds more → expected DIRECTION: RS holds more territory organically in mid-war (w40-w140). **CAVEAT:** If empirical inspection shows `getBrigadeSupplyState` is already returning `strained` for the majority of ARBiH brigades (supply report covers their OSIDs), this run may be near-inert and the design hypothesis is confirmed but the gap was smaller than stated.

**Run 2 — BRIEF-GAP-6 (territory trend):** Wire `recent_territory_change` directly onto the briefing and into threat assessment. This moves theater-awareness: corps that have been losing ground see `heavy` overall pressure sooner, suppressing their offensive launches and increasing defensive reinforcement requests. DIRECTION: Losing corps defend more aggressively, gaining corps stay in offensive posture longer. Net effect on territory: more reactive defense → fewer fronts collapse silently.

**Why this order:**
1. BRIEF-GAP-1 touches a hot path (per-brigade per-turn fitness scoring) and is the larger behavioral multiplier surface
2. BRIEF-GAP-6 is additive to BRIEF-GAP-1's effect — both suppress over-aggressive ARBiH attacks. Running 1 first isolates the supply signal's contribution
3. If BRIEF-GAP-1 is near-inert (empirical finding), BRIEF-GAP-6 becomes the primary lever
4. Both changes are calibration-relevant and each must be measured independently against the 188w floor

---

## 4. Calibration Expectation Per Gap

**BRIEF-GAP-1:**  
Direction: ARBiH `main_effort` tier count drops → fewer surplus brigades → fewer commander-initiated offensive ops → RS holds more OSIDs in mid-war (w40-w140) → 188w floor likely MOVES (RS OSID count +X or the mid-war plateau becomes less flat). This is a floor-moving change. Requires re-bless. Uncertainty: if most ARBiH brigade OSIDs are already in the supply report, the effect is small (< 5 OSID swing). The 40w baseline may also move (supply pipeline runs from turn 1).

**BRIEF-GAP-6:**  
Direction: Corps under territory pressure shift to defensive stance faster → fewer offensive launches from weakening corps → BOTH sides react more realistically. Net 188w effect is harder to predict: a losing RBiH corps defends better (RS captures fewer), but a losing RS corps also defends better (RBiH captures fewer). Likely net: smaller mid-war swings in either direction → slightly flatter calibration curve mid-war, but better historical fidelity in which corps are active. May be near-floor-flat or +/- a few OSIDs. Requires 188w to determine. Re-bless required if > 0 OSID drift.

---

## 5. §6 Risk Assessment

**No §6 risk for either gap.** Both changes affect general bot-AI combat scoring, not the Srebrenica/Žepa rupture path. Specifically:
- Neither touches `triggered_operations.ts`, `pre_planned_operations.ts`, `war_1995.json`, or the `srebrenica_falls_1995`/`zepa_falls_1995` event trigger conditions
- Neither touches `corps_command[].active_operations` for `vrs_drina_corps` scripted operations

**vrs_drina_corps adjacency:** This corps IS subject to both gap wires. If supply-BRIEF-GAP-1 lowers VRS Drina brigades' `fitnessOffense`, their surplus pool shrinks → fewer aggressive probe ops mid-war → Srebrenica ring remains more intact through w140 (historically correct). This is the desired direction and does NOT constitute §6 risk. The rupture event fires from `srebrenica_falls_1995` trigger conditions (OSID control + turn gate), not from the commander scoring path.

**Name the adjacency:** `vrs_drina_corps` behavior shifts are expected and calibration-positive. Log them in the panel review. No §6 panel required.

---

## 6. Interaction Risk: Scripted 1995 Ops

**Storm/Sana/Mistral use the injection pipeline, not the commander scorer.** As documented in the Design B post-mortem (`docs/40_reports/20260610_DESIGN_B_SHELVED.md`): the territory-moving late-war ops are delivered by `pre_planned_operations.ts` / `triggered_operations.ts` and **never consult the commander scoring path**. The same briefing (`buildBriefing`) feeds both the general bot commander loop and the pre-planned op execution — but the op injection bypasses `managePlan` / `makeDecisions` entirely.

**Risk verdict:** LOW. Wiring supply/territory-trend into `buildBriefing` does NOT affect whether Storm/Sana/Mistral fire or execute. The injected ops are already in `corps_command[].queued_operations` / `corps_command[].active_operations` before the commander loop runs; the commander loop's `managePlan` will see them and skip launching a duplicate plan.

**One interaction to verify:** BRIEF-GAP-1's effect on ARBiH 5th Corps `surplus_pool`. If supply-strained ARBiH 5th Corps brigades tier to `active_defense` instead of `main_effort`, the surplus pool shrinks. The commander loop uses surplus to select brigades for its commander-generated ops (NOT for the scripted Sana injection). Verify that the Sana injected op's `participating_brigades` field is already pinned at launch time (it is — `triggered_operations.ts` pins specific brigade IDs at the time it constructs the `CorpsOperation`). The commander supply-fitness scoring does not strip already-pinned active-op brigades. Safe.

---

## 7. Test Plan

### Existing suites that guard the affected paths

| Test file | What it covers |
|---|---|
| `tests/commander/commander.test.ts` | `evaluateBrigade`, `evaluateCorpsForces`, `BotCorpsCommander.decide` |
| `tests/a1_army_hq_campaign_plan_wired.test.ts` | `buildBriefing` campaign_intent wiring (T1–T7) |
| `tests/commander/briefing_campaign_intent.test.ts` | `collectCampaignIntent` field correctness |
| `tests/commander/commander_maturity_phase1.test.ts` | Full commander loop behavioral contract |

### New tests required

**For BRIEF-GAP-1:**

1. **`tests/commander/supply_brigade_fitness.test.ts`** — unit test for `getBrigadeSupplyState`:
   - Brigade at OSID present in supply report with `strained` → returns `'strained'`
   - Brigade at OSID absent from supply report → returns modal faction state (new behavior)
   - Brigade with null `supplyByOsid` → returns `undefined` → `supplyMult` returns 0.8 (unchanged)
   - Pin: `evaluateBrigade` with `strained` supply → `fitnessOffense` < same brigade with no supply (0.8 default) ← regression guard for the direction of effect

2. **Behavioral proof test** in `tests/commander/commander.test.ts`:
   - `evaluateCorpsForces` with supply report showing all-`strained` faction → fewer brigades in `main_effort` tier than same call with `null` supply

**For BRIEF-GAP-6:**

3. **`tests/commander/territory_trend_briefing.test.ts`**:
   - `buildBriefing` with `control_events` showing 3 losses near corps → `briefing.recent_territory_change < 0`
   - `assessSituation` with negative `recent_territory_change` on briefing → zone threat level escalates to `high`
   - `assessSituation` with positive `recent_territory_change` → zone threat unchanged (no false alarms)
   - Determinism: same state produces same `recent_territory_change` (no RNG)

4. **Static import guard:** the `computeRecentTerritoryChange` import in `briefing.ts` creates a cross-module dependency from the commander subsystem into `army_hq_gathering.ts`. Verify no circular import (`army_hq_gathering.ts` must NOT import from `commander/`). Grep confirms this is safe: `army_hq_gathering.ts` imports from `army_hq_gathering_types.ts`, `officer_system.ts`, `sector_ratings.ts` — none of which import from `commander/`.

---

## 8. Wire Point Summary (file:line)

### BRIEF-GAP-1

| Point | File:Line | What |
|---|---|---|
| Default 0.8 site | `src/sim/combat/commander/force_eval.ts:58` | `default: return 0.8` in `supplyMult()` |
| Lookup function | `src/sim/combat/commander/force_eval.ts:62-74` | `getBrigadeSupplyState` — already implemented; needs modal fallback when per-OSID miss |
| Supply report producer | `src/sim/turn_phases/war_phases.ts:1241` | `supply-osid` step, `deriveSupplyStateByOsid` |
| Pipeline hand-off | `src/sim/turn_phases/war_phases.ts:2236` | `context.report.supply_resolution?.supply_state_by_osid` |
| Briefing receiver | `src/sim/combat/commander/briefing.ts:813` | `supply_by_osid: supplyByOsid` |
| Assess consumer | `src/sim/combat/commander/assess.ts:105` | `evaluateCorpsForces(briefing.brigades, zones, briefing.supply_by_osid)` |

### BRIEF-GAP-6

| Point | File:Line | What |
|---|---|---|
| `computeRecentTerritoryChange` producer | `src/sim/combat/army_hq_gathering.ts:376` | Fully implemented; reads `political.control_events` last 6 turns |
| Already-called site in assessCorps | `src/sim/combat/army_hq_gathering.ts:271` | Called inside `assessCorps`, placed on `CorpsAssessment` at :279 |
| Army HQ consumer (existing) | `src/sim/combat/army_hq_gathering.ts:524` | Opportunity scoring — consumed HERE for campaign role assignment |
| Missing consumer (gap) | `src/sim/combat/commander/briefing.ts:638` | `buildBriefing` does NOT call `computeRecentTerritoryChange`; needs add |
| Missing briefing field | `src/sim/combat/commander/commander_state.ts:492` (after) | `CommanderBriefing` lacks `recent_territory_change` field |
| Threat assessment (add consumer) | `src/sim/combat/commander/assess.ts:231` | `assessThreats` zone-loss detection — add territory-trend escalation |

### ARMY-GAP-1 (CLOSED — no work required)

| Point | File:Line | What |
|---|---|---|
| CampaignPlan reader | `src/sim/combat/commander/briefing.ts:555` | `collectCampaignIntent` reads `state.military.campaign_plans?.[faction]` |
| Regression test | `tests/a1_army_hq_campaign_plan_wired.test.ts` | Binding proof of wiring (T1–T7) |

---

## 9. Open Questions Before Build

1. **Empirically verify BRIEF-GAP-1 blast radius:** Inspect a 188w `final_save.json`'s `state.political.last_supply_state_by_osid` (written `war_phases.ts:1254`) — count how many ARBiH brigade `location_osid` values appear in the map, and at what state. If 80%+ are `strained` already in the report, the gap is real but narrow; if < 50% appear, the 0.8 default is firing heavily and the fix has large behavioral impact.

2. **Verify `supply-osid` step runs before `generate-bot-corps-orders` in step ordering:** `supply-osid` is at `war_phases.ts:1229`, `generate-bot-corps-orders` at `war_phases.ts:2196`. Ordering confirmed (lower index = earlier). No concern.

3. **BRIEF-GAP-6 gathering cadence:** `computeRecentTerritoryChange` reads `state.political.control_events` directly (not through the stale gathering), so calling it fresh in `buildBriefing` every turn gives a real-time signal rather than a gathering-cadence stale one. This is BETTER than the army-level usage and is the key value-add of this wire.

---

## 10. Report Path

`docs/40_reports/proposals/20260611_organic_territory_build_plan.md` (this file)

Referenced in standup: `docs/40_reports/working/SESSION_CHECKPOINT_20260608b.md:952`

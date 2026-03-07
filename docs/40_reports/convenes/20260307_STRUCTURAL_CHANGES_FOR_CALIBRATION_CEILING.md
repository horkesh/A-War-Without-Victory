# Structural Changes to Break the Calibration Ceiling

**Date:** 2026-03-07
**Context:** n241 locked at 93.6% area-weighted (98 RS overrides). Remaining 60 mismatches cannot be resolved with scenario-level overrides. This document identifies 6 structural changes needed to push calibration beyond the current ceiling.
**Status:** TO BE FOLLOWED UP

---

## 1. Phase I Takeover Quality (Override Reduction)

**Problem:** 98 `osid_control_overrides` compensate for Phase I not delivering the correct early-war seizure pattern. Most "safe batch" overrides (painted=RS, sim=RBiH) are cells the JNA/early VRS should have taken organically in the April-June 1992 sweep -- municipalities with Serb majorities or JNA garrisons where resistance was minimal.

**Impact:** If Phase I modeled this correctly, ~40-50 overrides could be eliminated. The simulation's territorial accuracy would be earned, not forced.

**Suggestion:** Audit Phase I takeover logic against BB1's April-June 1992 seizure patterns. Cells like `donji_vakuf_2`, `jajce_3`, `kladanj_3` should flip to RS organically during Phase I, not via override. Each override removed is a test of engine fidelity.

**Priority:** HIGH -- largest single reduction in artificial forcing.

---

## 2. Enclave / Holdout Mechanic (Consolidation Fix)

**Problem:** The consolidation mechanic auto-flips isolated cells when all neighbors belong to one faction. Gorazde, Srebrenica, Zepa, and parts of Trnovo get swallowed by RS because they're geographically surrounded. This is unfixable at scenario level -- `avoided_osids` only affects combat targeting, not consolidation (confirmed in n240 experiment).

**Impact:** ~10-12 consolidation over-captures in DRINA, SARAJEVO, and POSAVINA_NE regions. These represent UN safe areas and determined holdouts that survived the entire war historically.

**Suggestion:** Add a holdout property -- certain cells resist consolidation based on criteria:
- UN safe area designation (Gorazde, Srebrenica, Zepa, Bihac)
- Minimum population / garrison threshold
- Geographic defensibility (river/mountain terrain)
- Explicit scenario marking

Gorazde held out the entire war despite complete encirclement. The current mechanic makes that impossible.

**Priority:** HIGH -- these mismatches are structurally unfixable without this.

---

## 3. VRS Operational Reach / Supply Distance

**Problem:** The bot treats all valid targets as equally attackable. With 80+ brigades and no concept of operational culmination, VRS pushes into the Tuzla basin (gracanica, lukavac, tuzla suburbs) where historically it never had the force ratio to sustain operations.

**Impact:** ~10-15 persistent over-captures in the Tuzla corridor and Central Corridor regions.

**Suggestion:** Graduated friction based on distance from corps HQ or supply infrastructure. Not a hard cap, but increasing combat penalties and fatigue accumulation for brigades operating far from their logistical base. VRS historically stopped at the Tuzla corridor because they couldn't sustain operations that deep into ARBiH territory -- exhaustion and supply, not orders.

**Priority:** MEDIUM -- significant mismatch count, but the mechanic needs careful design to avoid artificial constraints.

---

## 4. Faction-vs-Faction Transition (Jajce / HVO-to-VRS)

**Problem:** Jajce fell to VRS in October 1992, taken from HVO -- not from RBiH. The Vienna Declaration truce has municipality exceptions (including jajce), but the bot doesn't effectively exploit them. Several HRHB-held cells that should be RS by January 1993 (jajce:barevo_2, divicani_2, lupnica) remain HRHB.

**Impact:** ~5-8 mismatches in CENTRAL_BOSNIA and DRINA (cajnice cells).

**Suggestion:** Two options:
1. **Organic:** Verify that the Vienna Declaration truce exceptions actually drive VRS combat behavior in excepted municipalities. If the bot generates attacks against truce-excepted HRHB targets, the mechanic exists but may be underweighted in target selection.
2. **Event-driven:** Scenario timeline event at week ~26 (October 1992) that triggers VRS operations against Jajce specifically, reflecting the historical Fall 1992 Jajce offensive.

Option 1 is preferred if the wiring already exists.

**Priority:** MEDIUM -- fewer cells affected but historically important (Jajce's fall was a major event).

---

## 5. Bot Sector Assignment Stability

**Problem:** Adding 12 overrides in KRAJINA caused POSAVINA_NE to lose 9.9pp and SARAJEVO to lose 9.3pp. That's extreme butterfly sensitivity -- small initial-control changes cause wholesale sector reassignment and force redistribution across the entire map. This made calibration fragile and required careful batching with rollback.

**Impact:** Not a mismatch source directly, but makes every calibration iteration risky and unpredictable. Future engine changes will cascade through the bot in hard-to-predict ways.

**Suggestion:** Sector assignment inertia. Once a corps has an established sector, small initial-control changes shouldn't trigger full BFS recomputation. Options:
- Damped sector updates (only reassign if the change exceeds a threshold)
- Sticky sector boundaries that shift gradually rather than recomputing from scratch
- Seed sector assignment from the previous turn's sectors rather than corps HQ BFS every turn

**Priority:** LOW-MEDIUM -- quality-of-life for calibration work and engine stability, not a direct mismatch fix.

---

## 6. Override-to-Organic Migration Path

**Problem:** Even after implementing the above, removing all 98 overrides at once would likely cause a massive regression. The migration needs to be deliberate and measurable.

**Suggestion:** Tag each override with its root cause category:
- `phase_i_gap` -- should be handled by improved Phase I takeover
- `consolidation_gap` -- should be handled by enclave/holdout mechanic
- `bot_aggression_gap` -- should be handled by operational reach
- `faction_transition_gap` -- should be handled by HVO-to-VRS mechanic
- `self_correcting` -- cells that fix themselves based on other changes

When an engine fix lands, remove the corresponding override batch and verify that calibration holds. Each batch removal is a direct test of whether the engine fix works.

**Priority:** Process item -- implement alongside each structural fix above.

---

## Impact Estimate

| Fix | Overrides Eliminated | Mismatches Fixed | Priority |
|-----|---------------------|------------------|----------|
| Phase I takeover quality | ~40-50 | 0 (same result, fewer hacks) | HIGH |
| Enclave/holdout mechanic | 0 | ~10-12 consolidation captures | HIGH |
| VRS operational reach | 0 | ~10-15 Tuzla over-captures | MEDIUM |
| Jajce / HVO-VRS transition | 0 | ~5-8 HRHB-held cells | MEDIUM |
| Bot sector stability | 0 | 0 (calibration reliability) | LOW-MEDIUM |
| Override migration path | All (gradual) | Validates fixes | Process |

**Combined potential:** If #1 and #2 land successfully, the override count drops to ~50 and the mismatch count drops to ~38, pushing area-weighted score toward 95-96% with fewer artificial props.

---

## References

- Calibration report: `docs/40_reports/implemented/20260307_CALIBRATION_N235_N241_AREA_WEIGHTED_93PCT.md`
- Calibration master: `docs/40_reports/CALIBRATION_MASTER.md`
- n241 run: `apr1992_definitive_40w__024b4776f64c7a22__w40_n241`
- Scenario file: `data/scenarios/apr1992_definitive_40w.json`

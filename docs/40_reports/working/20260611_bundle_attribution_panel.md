# Bundle Attribution Panel — cal/organic-territory-bundle
**Date:** 2026-06-11  
**Panel:** Scenario-Creator-Runner-Tester · Historian · Canon-Compliance  
**Branch:** `cal/organic-territory-bundle`  
**Floor reference:** 188w 649/712 · anchors 30/30 · hash `345e044b7642aeab`

---

## Raw Numbers (pre-analysis)

| Config | Hash | OSID match (oct1995) | Anchors | RS | RBiH | HRHB | Δ vs floor |
|--------|------|---------------------|---------|-----|------|------|------------|
| baseline | `345e044b7642aeab` | **649/712 (91.2%)** | 30/30 | 321 | 285 | 106 | 0 |
| gap1 | `1e635b5d2e879dfd` | **649/712 (91.2%)** | 30/30 | 321 | 285 | 106 | **0** |
| gap6 | `9590ab94e3456887` | **649/712 (91.2%)** | 30/30 | 321 | 285 | 106 | **0** |
| kljuc | `f1037b915734c192` | **651/712 (91.4%)** | 30/30 | 319 | 287 | 106 | **+2** |
| all | `5fae63370016b5e9` | **651/712 (91.4%)** | 30/30 | 319 | 287 | 106 | **+2** |

Area-weighted match: baseline/gap1/gap6 = 91.3% (46870/51337 km²); kljuc/all = 91.6% (47050/51337 km²).

---

## §6 Canon Check (all configs)

| OSID | Painted | baseline | gap1 | gap6 | kljuc | all |
|------|---------|----------|------|------|-------|-----|
| op:srebrenica:srebrenica_2 | RS | RS | RS | RS | RS | RS |
| op:rogatica:zepa_2 | RS | RS | RS | RS | RS | RS |
| genocide rupture turn | — | t162 | t162 | t162 | — | — |

§6 INTACT across all five configs. Srebrenica falls RS, Žepa falls RS, genocide rupture fires at t162 in all measured configs.

---

## Anchor Check (all configs)

All five configs: **30/30 anchors PASS**. Zero failures. `op:zvornik:zvornik` = RS in all configs. `op:lukavac:brijesnica_donja_2` = RBiH in all configs (the chronic anchor that was the last known chronic fail is now passing — confirmed by the 649 baseline itself).

---

## OSID-level Diff vs Baseline

**gap1 vs baseline:** 0 OSIDs differ. `political_controllers` JSON is byte-identical.  
**gap6 vs baseline:** 0 OSIDs differ. `political_controllers` JSON is byte-identical.  
**kljuc vs baseline:** 2 OSIDs differ:
- `op:kljuc:hadzici`: RS → RBiH (painted = RBiH, correct direction)
- `op:kljuc:kljuc_2`: RS → RBiH (painted = RBiH, correct direction)

**all vs baseline:** Same 2 OSIDs as kljuc, no additional change from gap1+gap6 combination.

**Ključ target OSIDs final state:**

| OSID | Painted | baseline | kljuc | all | Flip? |
|------|---------|----------|-------|-----|-------|
| op:kljuc:hadzici | RBiH | RS | **RBiH** | **RBiH** | YES |
| op:kljuc:kljuc_2 | RBiH | RS | **RBiH** | **RBiH** | YES |
| op:kljuc:krasulje_2 | RBiH | RS | RS | RS | NO — still RS |
| op:kljuc:sanica_2 | RBiH | RBiH | RBiH | RBiH | already correct |

Ključ re-root delivers **+2 of the hypothesised +3** (hadzici + kljuc_2 flip; krasulje_2 does not flip).

---

## Mid-War Freeze Analysis (gap1/gap6)

Territory change by time band (control_change_attribution_weekly, all configs):

| Config | t1–39 (early) | t40–140 (mid-war) | t141–188 (late) | Total |
|--------|--------------|-------------------|-----------------|-------|
| baseline | 123 | **15** | 70 | 208 |
| gap1 | 123 | **15** | 70 | 208 |
| gap6 | 123 | **15** | 70 | 208 |
| kljuc | 123 | **15** | 72 | 210 |
| all | 123 | **15** | 72 | 210 |

**gap1 and gap6 weekly attribution data are byte-identical to baseline.** The mid-war band (t40–t140) shows exactly 15 territory changes in all three configs — no movement whatsoever. The hypothesis "ARBiH strained brigades attack less" (gap1) and "more reactive defense both sides" (gap6) produced zero change in any time band.

---

## What gap1/gap6 Actually Changed

Despite territory-identical output, the hashes differ from baseline because the flags modified the **corps_command intelligence/belief_state** — not territory:

- **gap1** (`AWWV_BRIEF_GAP_1`): `arbih_2nd_corps.commander_state` floating-point divergence in belief_state values (subordinate_reliability / neighbor_support_confidence). One corps, one field.
- **gap6** (`AWWV_BRIEF_GAP_6`): `vrs_2nd_krajina.commander_state` belief_state values diverge (zone_beliefs). One corps, one field.

Both flags wrote into the intelligence/briefing layer but the changed beliefs did not cascade into any different attack decisions, op launches, or territorial outcomes. The flags are wired to the briefing read-model but the briefing → decision pipeline is not consuming the modified values in a way that changes bot behaviour.

---

## Per-Flag Verdicts

### AWWV_BRIEF_GAP_1 — **INERT**
*Scenario-Creator-Runner-Tester:* ΔOSID = 0. Weekly territory change byte-identical to baseline at every time band including mid-war. Hash differs only due to `arbih_2nd_corps` commander_state floating-point drift in the belief layer.  
*Historian:* The hypothesis was that strained ARBiH brigades attack less, letting RS hold more mid-war territory toward the historical ~60–65% RS peak. This did not manifest. No mid-war freeze break: **0 additional mid-war OSIDs**.  
*Canon:* §6 intact. Anchors 30/30.  
**Verdict: INERT. Does NOT break the mid-war freeze. Drop.**

### AWWV_BRIEF_GAP_6 — **INERT**
*Scenario-Creator-Runner-Tester:* ΔOSID = 0. Weekly territory change byte-identical to baseline. Hash differs only due to `vrs_2nd_krajina` commander_state belief drift.  
*Historian:* Hypothesis was more reactive defense both sides changing the territory rhythm. No mid-war flip moved. **0 additional mid-war OSIDs**.  
*Canon:* §6 intact. Anchors 30/30.  
**Verdict: INERT. Does NOT break the mid-war freeze. Drop.**

### AWWV_KLJUC_REROOT — **GO (+2)**
*Scenario-Creator-Runner-Tester:* ΔOSID = +2 (649→651). `hadzici` + `kljuc_2` flip RS→RBiH. `krasulje_2` does not flip (re-root delivers 2/3 of hypothesised +3). No regression: no OSIDs moved in the wrong direction. Anchors 30/30. Area-weighted match +0.3pp (91.3%→91.6%).  
*Historian:* Ključ interior (hadzici, kljuc_2) is historically RBiH post-September 17, 1995 (Op Sana). These two flips are correct toward the Dayton/painted reality. krasulje_2 remaining RS is a partial miss but does not create a false negative — it simply did not flip. sanica_2 was already RBiH in baseline (correct). Net: 2 historically correct flips, 0 ahistorical flips.  
*Canon:* §6 intact. Anchors 30/30. Re-bless hash for this config: `f1037b915734c192` at 651/712.  
**Verdict: GO. Keep. New floor if merged solo: 651/712, hash `f1037b915734c192`.**

### ALL (gap1 + gap6 + kljuc) — **Partial GO (kljuc effect only)**
*Scenario-Creator-Runner-Tester:* ΔOSID = +2, identical to kljuc solo. gap1 and gap6 contribute nothing. No interaction effect, no conflict, no starvation of the Petrovac axis.  
*Historian:* The concern that gap1 (ARBiH attacks less) might starve the Ključ re-root does not materialise — the kljuc re-rooting is independent of whether gap1 suppresses ARBiH mid-war activity (since gap1 itself is inert on territory). No interaction detected.  
*Canon:* §6 intact. Anchors 30/30. Hash `5fae63370016b5e9` at 651/712.  
**Verdict: GO only because kljuc is included. If gap1 + gap6 are dropped, `all` reduces to kljuc solo — same result.**

---

## Does gap1/gap6 Break the 100-Week Freeze?

**No.** The mid-war band (t40–t140) shows exactly **15 territory changes in baseline, gap1, and gap6 — identical**. The flags touch the corps commander belief/intelligence layer but the downstream decision pipeline (op-launch scoring, sector offensive, attack targeting) does not consume the modified values in a way that changes any bot decision. The 100-week freeze is structurally intact; these flags as currently implemented are no-ops at the territory level.

---

## Flags to Keep / Drop

| Flag | Action | Re-bless hash | Count |
|------|--------|---------------|-------|
| AWWV_BRIEF_GAP_1 | **DROP** (inert) | — | — |
| AWWV_BRIEF_GAP_6 | **DROP** (inert) | — | — |
| AWWV_KLJUC_REROOT | **KEEP** | `f1037b915734c192` | 651/712 |

If merging kljuc solo: new 188w floor = **651/712 (91.4%), hash `f1037b915734c192`**, anchors 30/30, §6 intact.

---

## Owner Flag

gap1 and gap6 are infrastructure changes (briefing read-model) that do not yet reach the decision-making layer. The wiring is present at the intelligence level but the consumer path (briefing → corps AI → op-launch decision) is not reading the modified supply/territory-trend data. This is consistent with the known engine audit findings (BRIEF-GAP-1: `supply_by_osid` never consumed; BRIEF-GAP-6: `recent_territory_change` hardcoded to 0 in `assessCorps()`). The flags expose the gap correctly but fixing the freeze requires the consumer-side fix (un-hardcoding the assessCorps inputs), not just the flag side.

---

*Panel sign-off: Scenario-Creator-Runner-Tester (numbers + freeze diagnosis) · Historian (OSID direction correctness) · Canon-Compliance (§6 + anchor integrity)*

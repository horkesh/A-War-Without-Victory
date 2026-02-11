# Historical trajectory vs scenario outcomes: VRS decline and ARBiH organization

**Date:** 2026-02-10  
**Purpose:** Compare Bosnian War history (1992–1995) with current scenario runs; assess whether we reach the same points and follow the path of VRS decline and ARBiH organization.

---

## 1. Historical arc (condensed)

### 1.1 Territorial control and timing

- **April 1992:** War outbreak. VRS/JNA rapidly seize territory; Bosnian government (ARBiH) is forming from scratch with minimal equipment (arms embargo).
- **Late spring / summer 1992:** Serb forces reach **~60–70%** of BiH territory; ARBiH holds **core areas** (e.g. Sarajevo, central Bosnia, Tuzla, Bihać, enclaves) — i.e. **not** zero; government retains roughly **~20–30%** and builds up.
- **1993:** Croat–Bosniak conflict (HVO vs ARBiH) in central Bosnia and Herzegovina; Washington Agreement **March 1994** ends it and creates Croat–Bosniak Federation.
- **1994:** VRS still repels some ARBiH offensives (e.g. Operation Brana '94); ARBiH is better organized and equipped than in 1992.
- **1995:** NATO strikes (Deliberate Force), ARBiH offensives (e.g. Operation Sana), VRS territorial decline; Dayton (December 1995).

So the **path** we care about:

1. **Early war:** VRS expansion to ~60–70%; ARBiH **holds** core centers (~20%+) and **organizes**.
2. **Mid war:** Stalemate / Croat–Bosniak war; Washington (March 1994).
3. **Late war:** VRS **decline**, ARBiH **gains** (territory and capability).

---

## 2. What the canon and code already encode

### 2.1 Capability curves (VRS decline, ARBiH organization)

**Systems Manual Appendix D** and **`src/state/capability_progression.ts`** define:

- **ARBiH (RBiH):** Low in 1992 (equipment 0.15, org 0.25), rising each year to 1995 (0.5, 0.85).
- **VRS (RS):** High in 1992 (equipment 0.9, org 0.85), **declining** to 1995 (0.5, 0.7).
- **HRHB:** 1992–1993 then 1994 pre/post Washington (post-Washington boost).

So the **design** explicitly follows the path of VRS decline and ARBiH organization. These profiles are updated each turn in the pipeline (`update-capability-profiles`).

### 2.2 Control flip and pressure

- **Phase I control flip** (`src/sim/phase_i/control_flip.ts`) uses:  
  `currentStability + effectiveDefense` vs `FLIP_THRESHOLD_BASE + attacker.strength * FLIP_ATTACKER_FACTOR`.
- **Attacker strength** is derived from **`phase_i_militia_strength`** in adjacent municipalities only. **Capability profiles are not used** in flip resolution; `getFactionCapabilityModifier` exists but is **not** called in control_flip or in the breach/pressure path that feeds flips.
- So **outcomes** (who gains/loses territory) do **not** yet reflect the VRS decline / ARBiH organization curves; only militia strength and stability do.

---

## 3. Are scenarios reaching the same point?

### 3.1 Benchmark and run evidence

From **apr1992_50w_bots** (50-week run, smart bots):

- **Turn 26 (~Oct 1992):**  
  - RBiH **0%** control share (benchmark target ~20% “hold core centers”).  
  - RS **~56%** (target ~45%; historically Serbs had ~60–70% by late 1992).  
  - HRHB **~44%** (target ~15% “secure Herzegovina core” — HRHB over-represented).

So at the **same calendar point** (late 1992):

- We do **not** reach the same point: **RBiH collapses to 0%** instead of holding ~20%+ and organizing.
- RS share is in the right ballpark; HRHB is too high vs history.

### 3.2 Control delta

In the same 50w run, **control_delta** shows many flips **from RBiH to RS** (and RBiH→HRHB), consistent with RBiH losing almost all territory. So the engine is producing early, one-sided RBiH loss rather than “hold core centers + build up.”

---

## 4. Are we following the path of VRS decline and ARBiH organization?

### 4.1 In state and design: **Yes**

- Capability progression is implemented and updated by year (1992→1995).
- VRS profile declines; ARBiH profile rises; HRHB has Washington step.
- Washington Agreement logic (preconditions, post-effects, HRHB capability boost) is implemented.

### 4.2 In outcomes: **No**

- Control flip and pressure do **not** use capability (or year) to scale attacker/defender effectiveness.
- So **territorial outcomes** do not yet reflect:
  - Stronger VRS in 1992 and weaker VRS in 1995, or  
  - Weaker ARBiH in 1992 and stronger ARBiH in 1995.

Result: we have the **right path in the data model**, but the **combat/control resolution does not walk that path**. Early war is dominated by militia strength and stability; RBiH starts weak and gets overrun before time-based ARBiH improvement can matter.

---

## 5. Recommendations

1. **Wire capability into flip/pressure (canon-compliant):**  
   Use `getFactionCapabilityModifier` (or equivalent) in Phase I flip and/or Phase II breach so that:
   - Attacker effectiveness is scaled by faction capability (and possibly doctrine).
   - Defender effectiveness is scaled by defender capability.  
   That would let VRS decline and ARBiH organization **affect** who gains/loses territory over time.

2. **Initial conditions and thresholds:**  
   So that RBiH can “hold core centers” by turn 26 even before capability is wired:
   - Review **init_control** and **init_formations** for April 1992 (e.g. stability, militia, formation placement in core muns).
   - Consider **FLIP_THRESHOLD_BASE** / **FLIP_ATTACKER_FACTOR** or defensive bonuses so that core RBiH municipalities are harder to flip in early war (canon may need to be updated if thresholds change).

3. **Scenario and run length:**  
   To **observe** VRS decline and ARBiH gains:
   - Use long runs (e.g. **104 weeks** from April 1992 → ~April 1994) or **apr1995_start** scenarios.
   - Ensure **benchmark evaluation** (and optional diagnostics) is available for those runs so turn-52 and later control shares can be compared to history.

4. **Document in napkin:**  
   “Capability progression (VRS decline, ARBiH organization) is in state and updated each turn but not used in control flip; RBiH tends to 0% by turn 26 in apr1992 runs until capability is wired or init/thresholds are tuned.”

---

## 6. References

- **Canon:** Systems_Manual_v0_5_0.md Appendix D (capability curves); Phase I §4.3 (control flip).
- **Code:** `src/state/capability_progression.ts`, `src/sim/phase_i/control_flip.ts`, `src/sim/turn_pipeline.ts` (update-capability-profiles).
- **Runs:** `runs/apr1992_50w_bots__476e6180088cc214__w50/run_summary.json`, `control_delta.json`.
- **Scenarios:** SCENARIO_01_APRIL_1992.md, SCENARIO_SEPTEMBER_1992_SPEC.md, RBiH_HRHB_ALLIANCE_REDESIGN_DESIGN.md.

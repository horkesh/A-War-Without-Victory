# Investigation: Consolidation Only in Phase I

**Date:** 2026-02-21  
**Trigger:** User stated "Consolidation is only supposed to be possible in phase i."  
**Scope:** Repo investigation — canon vs implementation for consolidation and control flips.

---

## 1. What “consolidation” means in canon

### Phase I (Phase_I_Specification_v0_5_0.md)

- **Consolidation** in Phase I = **post-flip consolidation period** (§4.3.5):
  - After a municipality **flips** (control change from stability + pressure / militia), it enters a **consolidation period** for N turns.
  - During that period: municipality **cannot flip again**; stability cannot drop below 60; pressure can be applied but does not trigger flips.
  - State: `phase_i_consolidation_until` (mun_id → turn until lock ends).
- **Control flips** in Phase I = **stability + pressure** (organizational/militia), not brigade posture. There is **no** “brigade in consolidation posture flips settlements” in the Phase I spec.

So in canon, “consolidation” is a **lock after a flip**, not a **mechanic that causes flips**.

### Phase II (Phase_II_Specification_v0_5_0.md)

- **§2.3 Control changes in Phase II:**  
  “In Phase II, political control (political_controllers) may change only as a result of **military-driven** resolution: specifically, **settlement-level flips when front pressure exceeds breach threshold on a front edge (breach-driven flip)**. … Thus, in Phase II there are no municipality flips from Phase I logic; **only breach-based settlement flips apply**.”
- The Phase II turn structure (§5) lists steps 1–21 (brigade ops, then `phase-ii-consolidation` = supply pressure + exhaustion + front detection). It does **not** list:
  - Any step where “brigade in consolidation posture flips undefended settlements,” or
  - “phase-ii-consolidation-flips.”

So **canon Phase II does not describe** a consolidation-posture-based control flip. Only **breach-based** settlement flips are specified as the source of Phase II control change.

---

## 2. What the code does

### Phase I

- **phase_i_consolidation_until:** Used in `src/sim/phase_i/control_flip.ts` to enforce the post-flip lock (mun not flip-eligible until `turn > until`). This matches canon.
- Phase I control flips are from **stability + pressure** (and optional formation-aware/militia logic). No “consolidation posture” flip step in Phase I.

### Phase II

- **phase-ii-consolidation-flips** (`src/sim/turn_pipeline.ts` ~794, `src/sim/phase_ii/consolidation_flips.ts`):
  - Runs only when `meta.phase === 'phase_ii'`.
  - For each **brigade** in **consolidation** posture, in assigned municipalities with **no enemy brigade**, flips up to **3** undefended non-friendly settlements per brigade per turn (deterministic cap).
  - **Mutates** `political_controllers` (control change in Phase II from a non-battle, non-breach source).
- **phase-ii-consolidation** (later in pipeline, ~921): Different step — runs `detectPhaseIIFronts`, `updatePhaseIISupplyPressure`, `updatePhaseIIExhaustion`. No control flips. This is the step referenced in the Phase II spec as “phase-ii-consolidation.”

So we have:

| Item | Canon | Code |
|------|--------|------|
| Phase I consolidation | Post-flip lock period only | Implemented (phase_i_consolidation_until in control_flip). |
| Phase II control change | Only breach-based settlement flips (§2.3) | Attack resolution flips (battle outcome) + **phase-ii-consolidation-flips** (posture-based). |
| “Consolidation” posture flips | Not in Phase II spec | Implemented in Phase II (phase-ii-consolidation-flips). |

The step **phase-ii-consolidation-flips** is therefore **not** described in Phase II canon and adds a second, non-breach source of Phase II control change (the first being attack-resolution flips from battles).

---

## 3. Origin of phase-ii-consolidation-flips

- **PROJECT_LEDGER.md** (2026-02-14): “AI consolidation and breakthrough: rear cleanup, soft-front posture, deterministic scoring” — Phase II **consolidation posture** and “Option B” rear cleanup; consolidation flips step introduced as part of that work.
- **consolidation_flips.ts** header: “Phase II consolidation flips (52w plan Step 5, Option B). One brigade in ‘consolidation’ posture … can flip multiple civilian/undefended settlements in one turn.”
- So this was an **implementation/design extension** (52w plan Option B), not a Phase II spec amendment. Phase II spec §2.3 was not updated to allow consolidation-posture-based flips.

---

## 4. Conclusion and recommendation

- **Canon:**  
  - Phase I: consolidation = post-flip lock only; control flips = stability + pressure.  
  - Phase II: control change = breach-based settlement flips only (§2.3); no consolidation-posture-based flips.
- **Code:** Phase II currently has an extra control-change path: **phase-ii-consolidation-flips** (brigade in consolidation posture flips up to 3 settlements per brigade per turn in “soft” muns).

**User constraint:** “Consolidation is only supposed to be possible in phase i.”

Interpretation: the **mechanic** of “consolidation” that **causes** control flips (rear cleanup, undefended flips) should not be a source of control change in Phase II. That aligns with Phase II spec §2.3 (only breach-based flips).

**Recommendation:**

1. **Disable Phase II consolidation flips** so that consolidation (as a flip-causing mechanic) is not possible in Phase II:
   - In `src/sim/turn_pipeline.ts`, either **remove** the `phase-ii-consolidation-flips` step or **gate** it so it never runs (e.g. `if (context.state.meta.phase !== 'phase_i') return;` would make it Phase I–only; but in Phase I there is no brigade posture/AoR in the same way, so the step would effectively no-op there, or you could leave the step but make `applyConsolidationFlips` a no-op when `phase === 'phase_ii'`).
   - Safest alignment with canon: **do not run** the consolidation-flip logic when `meta.phase === 'phase_ii'` (i.e. remove the step from the Phase II path or short-circuit it so no control flips are applied in Phase II).
2. **Keep** consolidation **posture** and **scoring** for bots (soft fronts, rear cleanup scoring) for AI behavior; only the **control-flip application** in Phase II should be disabled. That implies:
   - Bots can still choose “consolidation” posture and consolidation-style targets.
   - The pipeline step that **applies** flips from that posture (`applyConsolidationFlips`) must not run in Phase II (or must no-op in Phase II).
3. **Document** the decision: e.g. in Phase II spec as an implementation-note that consolidation-posture-based control flips are disabled in Phase II per canon §2.3, or in a gap/exception doc (e.g. TACTICAL_SANDBOX_EXCEPTIONS or a short “Phase II control change” note in 20_engineering or 40_reports).
4. **Optional:** If product/canon later wants Phase II “rear cleanup” flips, add a formal canon amendment to Phase II §2.3 and then re-enable a spec-compliant step.

---

## 5. Files to touch (if recommendation is adopted)

| File | Change |
|------|--------|
| `src/sim/turn_pipeline.ts` | Remove or gate `phase-ii-consolidation-flips` so it does not apply control flips when `meta.phase === 'phase_ii'` (e.g. remove step or add guard and skip `applyConsolidationFlips` in Phase II). |
| `src/sim/phase_ii/consolidation_flips.ts` | Optionally: add a guard at top of `applyConsolidationFlips` that returns immediately if `state.meta.phase !== 'phase_i'`, so callers in Phase II get no flips. |
| Phase II spec or exception doc | Short note that consolidation-posture-based control flips are not used in Phase II; Phase II control change remains breach-based (and battle-resolution as implemented) per §2.3. |

No change to Phase I logic or to `phase_i_consolidation_until`; no change to bot posture or consolidation scoring, only to the **application** of consolidation flips in Phase II.

---

## 6. Implementation (2026-02-21)

- **consolidation_flips.ts:** At top of `applyConsolidationFlips`, added guard: `if (state.meta?.phase !== 'phase_i') return report;` so Phase II gets 0 flips. Updated file and function comments.
- **Phase_II_Specification_v0_5_0.md:** Added implementation-note after §2.3 stating consolidation as flip-causing mechanic is Phase I only; `applyConsolidationFlips` returns 0 flips in Phase II; bots may still use consolidation posture/scoring.
- **Verification:** `npx tsc --noEmit` and `npx vitest run` (143 tests) passed.

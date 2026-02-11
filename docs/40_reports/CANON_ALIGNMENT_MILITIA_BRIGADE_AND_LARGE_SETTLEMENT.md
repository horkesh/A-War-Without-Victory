# Canon alignment: militia/brigade formation and large-settlement resistance

**Date:** 2026-02-06  
**Requested by:** Orchestrator (Paradox state-of-game execution).  
**Roles consulted:** Game Designer / Canon Compliance (synthesis below).

---

## 1. Scope

Confirm militia/brigade formation system and large-settlement resistance (control flip) vs Phase I spec and Rulebook; document open design choices or escalate (STOP AND ASK).

---

## 2. Canon references checked

- **Phase_I_Specification_v0_4_0.md** — AoR prohibited in Phase I; control_status modifies early-war flip resistance; legitimacy initialization.
- **Phase_I_Specification_v0_3_0.md** (design-frozen) — §4.2 militia emergence; §4.3 control flip (flip-eligible when defender militia < 40; flip when `Current Stability + Defensive Militia < 50 + (Attacking Militia × 0.80)`); consolidation; no mention of “large” settlements or one-turn ineligibility.
- **FORAWWV.md** — H2.4: Agency (control flips, formation creation) requires explicit orders or harness directives.
- **Systems_Manual_v0_4_0.md** — control_status and flip resistance; formation state; no contradiction with pool/spawn or large-settlement rule.
- **Rulebook_v0_4_0.md** — No direct militia/formation/control-flip mechanics; player-facing; no conflict.

---

## 3. Alignment summary

| Area | Canon | Implementation | Status |
|------|--------|----------------|--------|
| **Control flip formula** | Phase I v0.3 §4.3.3: flip when `Stability + Defensive Militia < 50 + (Attacker × 0.80)` | control_flip.ts: FLIP_THRESHOLD_BASE 50, FLIP_ATTACKER_FACTOR 0.8, FLIP_ELIGIBLE_MILITIA_THRESHOLD 40 | **Aligned** |
| **Formation creation agency** | FORAWWV H2.4: formation creation requires explicit orders or harness directives | formation_spawn_directive; spawn only when isFormationSpawnDirectiveActive(state) | **Aligned** |
| **Pool semantics / Phase I** | Phase I v0.3: militia strength per mun, feeds pressure and flip; no AoR in Phase I | phase_i_militia_strength → pool population → (mun, faction) pools; AoR prohibited in Phase I | **Aligned** |
| **Large-settlement resistance** | Phase I v0.3 §4.3: **silent** on “large” settlements or one-turn ineligibility | design note §5: muns in LARGE_SETTLEMENT_MUN_IDS ineligible to flip when defensiveMilitia === 0 | **Design choice (canon silent)** |

---

## 4. Open design choice (documented)

**Large-settlement resistance:** Canon (Phase I v0.3 §4.3) does not specify that certain municipalities (e.g. Sarajevo core) are ineligible to flip in one turn when the defender has no formation. The design note (MILITIA_BRIGADE_FORMATION_DESIGN.md §5) and implementation (control_flip.ts) add this rule as a **design choice**: “Reflects historical reality that major urban centres did not fall in one day without fighting.” No change to canon required; the choice is documented in the design note and in this alignment report. If canon is later extended (e.g. Phase I addendum), the list LARGE_SETTLEMENT_MUN_IDS and the rule can be revisited for consistency.

---

## 5. Conclusion

- **Militia/brigade formation** and **control flip formula** are aligned with Phase I spec and FORAWWV H2.4.
- **Large-settlement resistance** is an intentional, documented design choice where canon is silent; no STOP AND ASK needed.
- No further canon changes or escalation required for the current implementation.

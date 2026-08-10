# Casualty scoring decoupling — design for canon/§6 panel review

**Date:** 2026-08-10 · **Status:** DESIGN, pending canon + §6 Pyrrhic-panel GO/BLOCK before any build. · **Owner:** approved scoping this + convening the panel (2026-08-09), as the pre-1.0 engine-health priority (engine woes before cosmetics).

## The problem
`war_cost` base = `0.4·casualtyScore + 0.4·exhScore + 0.2·durationScore`. `casualtyScore = clamp01((killed+wounded+missing)/casualties_full)`. The sim runs ~2.5× (RBiH) / 2.0× (RS) / 1.3× (HRHB) the historical KIA+WIA+MIA references, so `casualtyScore` pegs at 1.0 for every faction/strategy → grades all-C and the additive **§6 atrocity term is arithmetically inert** (base ≥ 0.78 already, atrocity max +0.85 clamped, can't move a pinned grade). The §6 bright line's *grade* signal is dead at full campaign length.

## Why volume reduction is off the table (measured, not asserted)
Casualties ≡ territory — the **same number**. `computeFinalCasualties` → `applyPersonnelLoss` subtracts `killed+wounded+missing` from `formation.personnel`, which drives next-turn combat power → territory; `scoring.ts` reads the *same* ledger quantity. The project already codified this: `casualty_realism_v2_gate.ts:50-54` — "we do NOT touch any total casualty count… changing a total would couple to territory." Six measurements confirm the coupling is ~4:1-against or worse (this session's Lever A: −4.2% killed for −14 matched; lane-3 R1 base-rate cut −63 OSID; R2 bombardment −50% broke §6). A ~60% RBiH reduction (needed to de-saturate) costs ≈ −100 to −200 matched — not viable.

## THE CENTRAL QUESTION (load-bearing for GO/BLOCK): honest correction vs. hiding a bloody sim
A decoupling that lets `casualtyScore` read a *scaled* casualty measure only escapes §6 objection if the scaling **corrects an accounting mismatch**, not if it **hides genuine over-bloodiness**. The evidence is mixed and the panel must weigh it:

- **KILLED (KIA): partially genuine over-bloodiness.** Lane-3's `20260609_CASUALTY_SOURCE_BREAKDOWN` measured sim killed ≈ 1.78× historical KIA on a "same-quantity" (military-killed vs military-killed) basis. **A decoupling that scaled scored-KIA down would hide ~1.8× real over-killing** — that is the §6-objectionable case, and the panel should be reluctant to scale KIA.
- **WOUNDED (WIA): defensible accounting mismatch.** The combined overshoot (2.5×) exceeds the killed overshoot (1.8×), so the WIA overshoot is larger. `ledger.wounded` is a cumulative career-total of *wounding events* with the sim's own severity threshold; historical WIA counts use different (often narrower, hospitalization-based) conventions. Much of the WIA gap is plausibly a units/threshold mismatch, not extra suffering — the more defensible place to re-scale.
- **Implication for the design:** a blanket "scale all scored casualties to historical" is NOT defensible (it hides the KIA over-bloodiness). A defensible design re-scales primarily the **WIA component** to a historically-comparable convention, leaves KIA close to sim output (accepting the residual ~1.8× as a known, separately-tracked engine-health debt), and demonstrates that the resulting `casualtyScore` de-saturates enough to make the atrocity term live WITHOUT understating deaths.

## Proposed design (contingent on the panel accepting the honesty framing above)
1. **Split the ledger read for scoring.** `casualtyScore` reads `killed + f_wia·wounded + missing`, where `f_wia` maps the sim's cumulative wounding-events to a historically-comparable WIA convention (e.g. hospitalized-WIA fraction). KIA + MIA unchanged. Territory/personnel path **completely untouched** (no `applyPersonnelLoss` change) → 634 floor byte-identical.
2. **Set `casualties_full` per faction** to the historical KIA+WIA+MIA scale (140k/95k/35k) once the scored measure lands near (not past) it → grades differentiate, atrocity becomes decisive.
3. **Re-derive `duration_full_weeks`** (188 × severity, owner-reviewed) so duration also de-saturates.
4. **Track the residual KIA over-bloodiness (~1.8×) as an explicit, separate engine-health debt** — NOT hidden. Its honest fix (reduce sim KIA without territory loss) remains open and is documented as such.

## Canon amendment required
Canon §3.5 A2 / units-basis currently forbids `casualtyScore` reading anything but the literal sim ledger (to prevent hiding). The amendment must: (a) permit a units-convention mapping on WIA with a stated, cited convention; (b) FORBID scaling KIA/MIA (the bright-line guard — deaths are read at sim scale); (c) require the residual KIA-vs-historical ratio to be reported alongside the grade (transparency). This keeps §6 honest: deaths are never understated, only the WIA units are aligned.

## Panel questions (canon + §6 + calibration + historian seats)
1. **Historian:** the exact per-faction sim-KIA vs historical-KIA ratio (verify the ~1.8×), and the correct historical WIA convention + `f_wia` value (hospitalized-WIA vs all-wounding-events).
2. **§6/canon:** is a WIA-only units mapping (KIA/MIA untouched, residual reported) an honest correction or a bright-line violation? Does §3.5 admit the amendment?
3. **Calibration:** confirm the scoring-only change is 634-territory byte-identical (no personnel path touched); confirm grades then differentiate + atrocity is decisive across a strategy set.
4. **Red-team:** can the `f_wia` mapping be gamed to launder atrocity, or does the KIA-untouched + residual-reported guard hold?

**Nothing builds until unanimous GO (or GO-with-conditions). A BLOCK/split escalates to the owner.** This is a scoring redefinition touching the §6 bright line — implementer ≠ reviewer.

---

## PANEL VERDICT (2026-08-10) + REVISED DESIGN (owner: revise per red-team + rebuild, emergent-scoped)

**Tally:** canon/§6 GO-COND · historian GO-COND · calibration GO-COND · red-team **BLOCK-COND** → split → owner chose to revise + rebuild. Integrated by orchestrator.

**Validated by the panel:** territory-invariance is structurally guaranteed (scoring.ts read-only/terminal-only); the WIA units-mismatch is genuine (sim K:W 1:3.74 = BB combat-narrative convention; historical 1:2.86 = administrative, BB1 p.463 — historian); the atrocity dominance term is base-independent so this can't weaken the bright line (canon).

**Red-team's load-bearing catch:** the atrocity term is OFF in historical mode, so the real Drina-cleansing baseline's C-cap comes from blunt casualty saturation — de-saturating in ALL modes would loosen it (a §6 hole). Plus the honest f_wia=0.75 delivers atrocity-LIVENESS but not full grade-differentiation (that needs the real KIA lane; forcing it via a low per-faction f_wia = laundering).

### REVISED DESIGN (build this — all 4 seats' conditions folded in)
1. **EMERGENT MODE ONLY.** In `computeWarCostIndex`, the new casualtyScore formula + per-faction `casualties_full` + re-derived `duration_full_weeks` apply ONLY when `decision_mode === 'emergent'`. Historical/unset mode = byte-identical to today (Drina-cleansing cap preserved via the existing blunt floor). [red-team #1, LOAD-BEARING §6]
2. **`f_wia` = 0.75, FIXED + CITED** (= 2.86/3.74, BB1 p.463; RS whole-war K:W). A named constant with the citation in code + canon; NEVER curve-fit to a grade. [red-team #4, canon (a)]
3. **casualtyScore (emergent)** = `clamp01((killed + 0.75·wounded + missing) / casualties_full[faction])`. KIA + MIA never scaled. [canon (b), historian #2]
4. **`casualties_full` → per-faction map** (restructure from scalar 40000), on the SAME administrative WIA convention as f_wia (units-symmetry): VRS = 18,543 KIA + 53,000 WIA + MIA (BB1 p.463); ARBiH ~30k KIA (BB1 p.462) + admin WIA + MIA; HVO ~6.5k KIA (BB1 p.462) + 20,649 WIA (BB1 p.462) + MIA. [canon (c), historian #1/#3, calibration #3]
5. **Siege-WIA floor:** a minimum casualtyScore contribution keyed to RAW wounded volume (pre-f_wia), so a WIA-heavy siege war can't exit the cost floor merely by being f_wia-discounted + un-atrocity-tagged. [red-team #2]
6. **Residual KIA ratio made LOAD-BEARING:** wire the sim-KIA-vs-historical ratio to an actual consequence (condemnation-flag or hard grade-floor) OR record it as a dated, owner-assigned engine-health-debt item (the real KIA-realism lane) — not a decorative string. [red-team #5]
7. **Canon §3.5 amendment** (canon seat clauses a–f) lands atomically with the code.

### VALIDATION (before adopt; §6-panel re-confirm)
- Territory byte-identity: 188w before/after, matched 634, full 31-anchor diff, personnel/territory fields byte-identical.
- **Historical-mode grade UNCHANGED** — before/after verdict grade + cost index on the historical 52w baseline (the Drina-cleansing case); its cap must NOT loosen. [red-team #1]
- Emergent-mode: atrocity term becomes grade-decisive; monotonicity regression test (rising KIA always raises cost, any f_wia). [canon (f)]
- Real per-faction K/W/M ledger pull to confirm the arithmetic. [calibration #2]
- Document that exhaustion_full (8000) remains separately pinned (grade-diff rests on casualtyScore). [calibration #4]

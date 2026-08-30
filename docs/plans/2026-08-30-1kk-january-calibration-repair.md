# 1KK January 1993 Calibration Repair Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore historically defensible 1st Krajina Corps participation around Donji Vakuf without reviving independent brigade attacks or altering calibration reference data.

**Architecture:** Keep the ops-only invariant intact. Correct only the authored march budget for Operation Donji Vakuf, prove that the displaced 31st Light Infantry Brigade remains eligible, and measure the result in a bounded 40-week January probe before considering any separate Jajce change.

**Tech Stack:** TypeScript, Vitest, scenario runner and checkpoint diagnostics.

---

### Task 1: Lock the Donji Vakuf regression

- Add a behavioral test reproducing the 31st Brigade's measured six-hop displacement.
- Verify the current four-turn budget excludes it.

### Task 2: Correct the authored march budget

- Increase only Operation Donji Vakuf's planning duration enough to cover six movement hops plus the mandatory planning turn.
- Preserve operation ownership, objectives, brigade roster, and all calibration reference data.

### Task 3: Verify locally

- Run the focused regression test.
- Run the full pre-planned-operation test file and TypeScript validation.

### Task 4: Measure January 1993

- Run one 40-week probe from the definitive April 1992 scenario using Node 22.
- Compare operation participation, attacks, captures, dead operations, and January checkpoint score with the accepted run.
- Do not start a 188-week run without owner authorization.

### Task 5: Keep Jajce separate

- If Donji Vakuf improves as predicted, document the remaining Jajce and Skender Vakuf discrepancies as a separate one-variable hypothesis.
- Do not combine another calibration lever with this run.

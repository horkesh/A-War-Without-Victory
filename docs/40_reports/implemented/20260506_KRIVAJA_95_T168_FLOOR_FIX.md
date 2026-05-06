# Krivaja-95 t168 Floor Fix — LANE-NIGHTSHIFT-KRIVAJA-95-T168-FLOOR-FIX

**Date:** 2026-05-06
**Status:** IN PROGRESS
**Class:** Ring 1 / canon-data tweak / §6 compliance fix (ENFORCING canonical floor)
**Sign-off precedent:** Stupčanica SHAPE B `b03333af`; Krivaja Phase 1 `bc44ddec`

## Summary

The 188w A/B validation (n1705 A4-enabled, n1707 A4-disabled) surfaced
Operation Krivaja-95 firing at **t168 in BOTH runs** — 2 turns below the
canonical §6 floor of **t≥170**. Pre-existing canon-violation; the
A4-disabled control confirms NOT A-lane-attributable.

This lane bumps the trigger threshold so the operation cannot accept
before t170, restoring §6 compliance. Mechanism is faction-symmetric (a
generic `trigger: (state, turn) => boolean` predicate); only the canon
Krivaja-95 data row is touched.

## Investigation Checkpoint

**Trigger location identified:**
- File: `src/sim/combat/triggered_operations.ts`
- Line: **396**
- Operation: `Operation Krivaja-95` (catalog block lines ~327–420)
- Current: `trigger: (_state, turn) => turn >= 168`
- Target: `trigger: (_state, turn) => turn >= 170`

**Cross-checks:**
- Stupčanica-95 trigger at line 441: `turn >= 172` (downstream; safe — gap remains 2 turns; matches historical Žepa fall ~10–14 days after Srebrenica fall).
- Mistral 2 (line 493) and Sana (line 491–493): `turn >= 175` — unaffected.
- Engine Invariants v0.9.0 §6 (Front and Combat Invariants) does not contain inline numeric thresholds for these ops; the t≥170 floor is documented in `SENSITIVE_HISTORY_DESIGN_GATE.md` + project memory + the §6 sensitive-history sign-off chain (`b03333af`, `bc44ddec`).
- 40w window: t≤40, so the change cannot affect the 40w hash. 40w byte-identity vs predecessor expected.
- 188w window: predecessor n1703 hash `7a1fddce105993e7`. 188w hash will change as Krivaja first-fire shifts t168 → t170 (expected, sanctioned shift).

**Comment-vs-code drift note:** The block-level comment at line 295
states "week >= 168 (Krivaja-95)". This was the introduction-time choice
and has since been superseded by the §6 floor. Comment will be updated
in lockstep with the trigger predicate.

## Phase 2 — Fix

(to be filled once edit is applied)

## Phase 3 — Tests

`tests/krivaja_95_floor_compliance.test.ts` — ≥3 tests:
- T1: trigger threshold for Krivaja-95 is ≥170 in canonical data.
- T2: deterministic — same trigger evaluation produces same first-fire turn.
- T3: backward-compat — pre-fix saves load without error.

## Verification

(to be filled)

## Commit

(to be filled)

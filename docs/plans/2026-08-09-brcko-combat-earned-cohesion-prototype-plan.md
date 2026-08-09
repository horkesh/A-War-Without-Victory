# Brčko → RS combat-earned-cohesion prototype-measure plan

**Date:** 2026-08-09 · **Owner decision:** prototype-measure first (viable → design + §6 panel → build; not viable → Brčko confirmed genuinely post-1.0). · **Status:** premise measured, prototype designed, ready to build.

## Why we are here (the complete Brčko root-cause, this session)
- The turn-58 `op:brcko:brcko` flip runs through **`getWarExhaustionTempoMult`** (`combat_math.ts:1788`, attacker-power only), NOT op-selection (that drag saturates at 0.3). The exhaustion **saturation bug** pinned ARBiH ahistorically over-exhausted mid-war (attacker ×0.85) → too weak to take Brčko. De-saturation (correct) → ARBiH ×~0.95–1.0 → takes Brčko. **The anchor was held by the bug.** (`20260809_BRCKO_REAL_CHANNEL_ATTACKER_TEMPO.md`)
- **Exhaustion re-pacing (Phase 4) is OFF the critical path** — ceiling diagnostic (ARBiH tempo forced 0.85): Brčko holds 31/31 but matched 634→633, and it needs ahistorical ~80% ARBiH exhaustion at mid-1993.
- **All local force-density fixes exhausted:** OOB move trades Doboj/Gračanica (613); defense-strength boost byte-identical; garrison-loan guard costs an unrelated anchor; **emergent spawn dead** (RS Brčko militia pool `available:0` — control-override on a 44%-Muslim town, no RS org roots).
- **Root:** RS corridor brigades run at **zero slack** because the RS cohesion floor sits **at** the ≤20 dissolution threshold (RBiH 62 firewall) — RS loses 11–63% of brigades vs RBiH 0%. Uniform floor sweep (20/25/30 → 634/623/629) is a non-monotonic dead-end. (`20260807_RS_COHESION_RAILROAD_ROOT_CAUSE.md`)

## Premise measured (n163)
The eastern corridor is **ground to death at the floor, not losing its ground**: 7+/12 East-Bosnian brigades dissolved (inactive), survivors at cohesion 15–21; `3rd_ozren` fought **37** defensive battles yet the Doboj/Gračanica OSIDs *hold* via reactive coverage. This is the signature a combat-earned floor targets: **enduring successful defense should earn durability instead of floating at the death threshold.** (Battle win/loss parse was schema-unreliable — do not quote it; the structural dissolution pattern is the finding.)

## The prototype (minimal, flag-gated, default-OFF → baseline byte-identical)
Cohesion is already combat-driven (post-battle deltas, `attack_post_battle_effects.ts:172/251`); the flaw is the **asymmetric static floor** (`getFactionCohesionFloor`, timeline `cohesion_floor` override). Prototype = replace it with a **symmetric, combat-EARNED effective floor**:
1. **New per-brigade state** `defensive_holds?: number` on `FormationState` (additive-optional; absent ⇒ 0; only written when the flag is on ⇒ no save-migration). Incremented in battle resolution when the brigade successfully holds its OSID as defender (deterministic; sorted).
2. **Per-brigade effective floor** = `SYMMETRIC_BASE + EARNED_BONUS · min(1, defensive_holds / HOLDS_FOR_FULL)`, applied to BOTH factions. `SYMMETRIC_BASE` low (e.g. 12–15) so a brigade that never holds can dissolve (ARBiH becomes losable); `EARNED_BONUS` lifts proven holders toward durability. This is emergent (no per-corps hardcode, no OSID override, no `avoided_osids_by_faction`).
3. `getFactionCohesionFloor` gains an optional brigade arg for the earned term; callers unchanged when the flag is off.
4. Flag `AWWV_COMBAT_EARNED_COHESION` (default OFF).

## Measurement (adopt-or-retire criteria, 188w)
- **The decisive question:** does earned durability hold **Brčko** (and the corridor) WITHOUT propping up the **western Krajina** corps that must historically shatter (1st/2nd Krajina, Drvar/Šipovo/Sanski Most)?
- ADOPT-candidate iff: `op:brcko:brcko` = RS AND matched ≥ 634 AND no new anchor flips AND §6 intact (Srebrenica/Žepa fall; Goražde/Bihać/Sarajevo/Teočak hold) AND western Krajina still collapses (vrs_1st/2nd_krajina still shatter) AND RBiH now takes ≥ some genuine brigade losses (losability restored) AND K:W in band AND engine-health gate PASS.
- If no `(SYMMETRIC_BASE, EARNED_BONUS, HOLDS_FOR_FULL)` triple satisfies all guardrails → the redesign is confirmed non-viable at this shape → Brčko genuinely post-1.0; escalate only with a different mechanism.
- Flag-OFF must be 40w-fingerprint `5cfcf1c8` + 188w matched 634 (byte-identical) — proves the prototype is inert when off.

## Guardrails
634 floor + full 31-anchor `anchor_checks` diff (never net matched) + §6 + determinism (no wall-clock/RNG; sorted). §6-panel sign-off required BEFORE any adopt (touches atrocity-adjacent brigade fate). This plan is the prototype-MEASURE step; a positive result escalates to the design + §6/calibration panel, not a direct ship.

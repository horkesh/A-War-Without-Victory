# Canon Amendment Proposal: Morale-Collapse Dissolution Override

**Date:** 2026-05-03
**Lane:** LANE-NIGHTSHIFT-N4-CANON-AMENDMENT
**Author:** /game-designer (Pyrrhic Games)
**Status:** PROPOSAL — awaiting user go/no-go
**Targets:** `docs/10_canon/ENGINE_INVARIANTS.md` §6.2 (line ~68); `docs/10_canon/SYSTEMS_MANUAL.md` §6 (line ~238)
**Class precedent:** Predictor / state-honesty corrections — same family as
  - `LANE-2026-05-02-IN-TRANSIT-PREDICTOR` (87062cc4)
  - `LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT` (8dec8f58)
  - `B-1 PLANNING_INVALIDATED_COOLDOWN` (predictor-honesty class)

---

## 1. Mission Statement

### The bug
n1621 evidence: 4+ VRS Drina Corps brigades reach a stable `morale=0 / cohesion=20 / personnel≈2000` "zombie" equilibrium and remain there indefinitely. Mechanism:

1. `DISSOLUTION_PERSONNEL_CAP = 800` in `src/sim/combat/brigade_dissolution.ts` blocks dissolution above 800 personnel — by design, intended to prevent ghost-strength dissolutions.
2. Morale-0 desertion fires at 5%/turn in `src/sim/combat/morale_drift.ts:246`, draining personnel toward 800.
3. Reconstitution (replacement intake) refills the brigade back toward 2000 each turn.
4. Steady state: morale stays pinned at 0, personnel oscillates ~1800–2000, brigade is **simultaneously combat-incapable in spirit and indestructible in substance**. The 2-of-3 dissolution criteria (personnel < cap, cohesion below floor, equipment below floor) require a personnel collapse that reconstitution prevents.

### The fix
Add a **fourth dissolution path** keyed on sustained morale collapse alone. A brigade that stays at `morale ≤ 15` for `MORALE_OVERRIDE_TURNS = 8` consecutive turns dissolves regardless of personnel count. Hysteresis: streak counter resets when `morale > 20`.

### Why canon must amend
The canon-compliance-reviewer correctly blocked LANE-NIGHTSHIFT-N4 because:

- **Engine Invariants §6.2 (line 68)** explicitly states the 2-of-3 criteria are exhaustive and that personnel cap must be respected for dissolution candidacy.
- **Systems Manual §6 (line 238)** mirrors this: dissolution requires combat-attrition crossing two of three thresholds.

Implementing the override without amending these documents would constitute a canon violation of the same class as silently bypassing entrenchment caps or stance gates. The mechanic is **correct and historically-grounded** (see §4 honest-correction analysis), so canon should be amended to admit it as a fourth path, not the implementation forced through under cover of darkness.

---

## 2. Proposed Engine Invariants §6.2 Amendment

Append the following clause immediately after the existing 2-of-3 criteria block in §6.2:

> **§6.2.4 Morale-collapse override clause.** A brigade with `morale_low_streak ≥ MORALE_OVERRIDE_TURNS` (canonical value: 8 turns at `morale ≤ 15`) dissolves regardless of personnel count. The `morale_low_streak` counter increments each turn `morale ≤ 15` and resets to 0 when `morale > 20` (hysteresis band of 5 points prevents flutter at the threshold). This override exists because a unit cannot be simultaneously combat-incapable in spirit and indestructible in substance. The 2-of-3 criteria in §6.2.1–§6.2.3 continue to apply for combat-attrition cases; this override adds a fourth, independent dissolution path keyed on sustained morale collapse alone.

Constants block (Engine Invariants §B Constants Appendix) gains:

```
MORALE_OVERRIDE_TURNS = 8
MORALE_OVERRIDE_THRESHOLD = 15      // brigade is "in collapse" at or below this morale
MORALE_OVERRIDE_RESET = 20          // streak resets when morale exceeds this (hysteresis)
```

---

## 3. Proposed Systems Manual §6 Amendment

Append the matching clause to Systems Manual §6 (Dissolution & Reconstitution) immediately after the existing 2-of-3 description:

> **§6.4 Morale-collapse override.** Beyond the 2-of-3 attrition criteria, a fourth dissolution path exists for sustained morale collapse. Each turn, every brigade's `morale_low_streak` increments if its morale is at or below `MORALE_OVERRIDE_THRESHOLD` (15), and resets to 0 if morale rises above `MORALE_OVERRIDE_RESET` (20). When `morale_low_streak` reaches `MORALE_OVERRIDE_TURNS` (8), the brigade dissolves on the next dissolution check regardless of personnel count, cohesion, or equipment. Historical justification: sustained morale collapse historically dissolved units regardless of nominal strength (cf. JNA dissolution dynamics 1991–92, ARBiH 5th Corps wavering through Bihać pocket 1994). Reconstitution and replacement intake cannot reverse a brigade once this counter trips; the unit is removed from order of battle and its personnel are returned to the faction manpower pool. **Save/load contract:** `morale_low_streak` is persisted on FormationState; absent on legacy saves it deserializes to 0.

---

## 4. Sensitive-History Design Gate §6 Sign-off Chain Assessment

### §8.3 classification: **(a) honest correction**

This is **not** a balance lever or lane-tuning tweak. It is an honest correction to a state-honesty bug — the engine currently models a unit as "0% will to fight" while continuing to grant it full combat power because personnel inflates back to 2000. That's the same family of dishonesty fixed by:

- **IN-TRANSIT-PREDICTOR** (87062cc4): predictor counted in-transit brigades dishonestly — fixed by counting them honestly toward axis-relevant OSIDs.
- **IN-TRANSIT-COMBAT-POWER-CONTEXT** (8dec8f58): combat power context lied about committed in-transit operation participants — fixed to be honest.
- **B-1 PLANNING_INVALIDATED_COOLDOWN**: planner repeatedly proposed plans against state that had moved on — fixed by honest cooldown.

Class signature shared by all four: the engine was reporting a state to itself that didn't match the underlying truth. This proposal continues that pattern.

### Faction-agnostic verification

The proposed predicate, in pseudocode:

```
if (brigade.morale_low_streak >= MORALE_OVERRIDE_TURNS) dissolve(brigade);
```

**Inspected for forbidden conditions:**
- ❌ No `faction === 'RBiH' | 'RS' | 'HRHB'` branch.
- ❌ No corps-id discriminator (no `'drina'`, no `'5th_corps'`, etc.).
- ❌ No OSID gate, no zone gate, no theater gate.
- ❌ No date / turn-range gate.

The predicate is purely a function of `(morale, morale_low_streak)`, both of which are faction-agnostic state on every FormationState regardless of which faction owns it. **Confirmed Ring 1 faction-agnostic mechanic.**

### Ring classification: **Ring 1 (universal mechanic)**

- Ring 1: applies uniformly to all brigades of all factions. ✅ this proposal.
- Ring 2: applies to a class of brigades (e.g. all corps-COs, all militia). ✗
- Ring 3: applies to a specific faction/corps/named unit. ✗

### Required co-signs

Per Sensitive-History Design Gate §8.3 for Ring 1 honest-correction class:

| Signatory | Role | Required because |
|---|---|---|
| `/historian` | Sensitive-history historical-grounding co-sign | Confirms the historical justification (JNA 1991–92, ARBiH 5th Corps 1994) is accurate and not retro-fitted to justify the patch. |
| `/game-designer` | Design-intent co-sign | This document. Confirms mechanic does not break design intent and is faction-agnostic. |
| **User** | Canon authority | Engine Invariants and Systems Manual cannot be amended without explicit user signature. |

`/canon-compliance-reviewer` is not a co-sign — they are the gate that originally blocked the lane and will re-verify after amendment.

---

## 5. Calibration Regression Risk

### 40w hash invariance — REQUIRED
The 40w canonical scenario (`apr1992_definitive_40w.json`, hash `4f872fcd535b6e98` per current baseline n1580) **must not change** after this amendment lands. Verification protocol:

1. Run 40w scenario with `MORALE_OVERRIDE_ENABLED=false` (default off — see §7 fallback path).
2. Diff hash against n1580 baseline. **MUST match exactly.**
3. Only after the user signs off on the override flip is the flag turned on for a separate, named calibration run (e.g. n1622+).

If the 40w hash drifts with the flag *off*, the implementation has crossed a determinism boundary and is rejected on the spot.

### 188w faction-balanced delta required
The 188w scenario (full historical 1992-04 → 1995-12) is the proper test bed because the morale-zombie equilibrium needs sustained pressure to manifest. Required artifact:

- Run 188w with override **off** → baseline.
- Run 188w with override **on** → candidate.
- Delta report must show:
  - Dissolutions per faction (RBiH / RS / HRHB) — no faction may absorb >60% of incremental dissolutions; otherwise the predicate is *de facto* faction-coupled despite being syntactically agnostic.
  - Final territorial percentages within ±2% of baseline; if outside, the override is acting as a stealth balance lever and must be re-tuned (likely raising `MORALE_OVERRIDE_TURNS`).
  - Specific zombie-brigade case studies (the 4+ VRS Drina brigades from n1621) confirmed dissolved by turn `T + 8` after morale crash.

If the 188w delta is faction-skewed beyond ±10% of expected (proportional to faction brigade counts), kick back to /game-designer for parameter retuning before user re-sign.

---

## 6. Implementation Outline

This section is *outline only* — no code changes are made by this proposal. Implementation lane (LANE-NIGHTSHIFT-N4 resumption) executes after sign-off.

### State schema
`src/state/game_state.ts` → `FormationState`:

```typescript
interface FormationState {
  // ... existing fields ...
  morale_low_streak?: number;  // optional for legacy save compatibility; defaults to 0
}
```

### Increment site
`src/sim/combat/morale_drift.ts` — at end of each formation's per-turn morale update:

```typescript
if (formation.morale <= MORALE_OVERRIDE_THRESHOLD) {
  formation.morale_low_streak = (formation.morale_low_streak ?? 0) + 1;
} else if (formation.morale > MORALE_OVERRIDE_RESET) {
  formation.morale_low_streak = 0;
}
// Hysteresis band [16..20]: counter holds, neither increments nor resets.
```

### Override site
`src/sim/combat/brigade_dissolution.ts` — at top of `evaluateDissolution()`, before the existing 2-of-3 cap check:

```typescript
if ((formation.morale_low_streak ?? 0) >= MORALE_OVERRIDE_TURNS) {
  return { dissolve: true, reason: 'morale_collapse_override' };
}
// ... existing 2-of-3 logic continues unchanged ...
```

### Save/load round-trip
- Serialize `morale_low_streak` to JSON saves.
- On load, undefined → 0 (legacy n1580-and-earlier saves remain valid).
- Round-trip test: `data/derived/latest_run_final_save.json` save → load → save must produce byte-identical output.

### Constants location
Add to the central constants module (`src/sim/constants.ts` or wherever `DISSOLUTION_PERSONNEL_CAP` lives — implementer to colocate):

```typescript
export const MORALE_OVERRIDE_TURNS = 8;
export const MORALE_OVERRIDE_THRESHOLD = 15;
export const MORALE_OVERRIDE_RESET = 20;
export const MORALE_OVERRIDE_ENABLED = process.env.MORALE_OVERRIDE_ENABLED === 'true';  // see §7
```

### Test surface
- Unit test: brigade pinned at morale=10 for 8 turns → dissolves on turn 8 even with personnel=2000.
- Unit test: brigade at morale=18 (hysteresis band) holds streak.
- Unit test: brigade at morale=22 resets streak to 0.
- Integration test: n1621 zombie-brigade fixture replayed → dissolves within 8 turns of morale collapse.
- Determinism test: 40w with flag off → hash unchanged.

---

## 7. Shadow-Flag Fallback Path

If the user wants partial deployment to gather evidence before full canon commitment:

### Shadow flag: `MORALE_OVERRIDE_ENABLED`
- Environment variable, default `false`.
- When `false`: increment counter (zero cost — pure number addition), but **do not act** in `evaluateDissolution`. The override branch becomes a no-op.
- When `true`: counter both increments and triggers dissolution.

### Hash-drift contract
With flag `false`, the only state addition is `morale_low_streak: number` on every FormationState. To preserve 40w hash:

1. Either omit the field from serialization when flag is off (preferred — zero hash drift).
2. Or always serialize but exclude from canonical-state hash function (acceptable but uglier).

**Implementer must verify hash invariance before merge.** If the field is in saves, it must be in the hash exclusion list, period.

### Evidence-review flip protocol
1. Land amendment + implementation behind `MORALE_OVERRIDE_ENABLED=false`.
2. Run 40w → hash matches n1580. ✅ ship.
3. Run 188w with flag toggled true in a named branch (`feature/morale-override-evidence`).
4. Produce 188w delta report (per §5).
5. User reviews delta, signs off, flag flipped to default `true`, recorded as new calibration baseline (n1622+).

This protocol matches how IN_TRANSIT_PREDICTOR shipped (PARTIAL → full after evidence).

---

## 8. User Decision Required

**Question to user:** Sign off on this canon amendment?

Three options:

| Option | Action | Outcome |
|---|---|---|
| **A. Full sign-off** | Co-sign with /historian; amend Engine Invariants §6.2 and Systems Manual §6 as proposed in §2 and §3; LANE-NIGHTSHIFT-N4 unblocked, full implementation lands with override **on** by default. | Zombie brigades dissolve; 40w must re-baseline (expected n1622+); 188w faction-balanced delta required before next merge. |
| **B. Shadow-flag sign-off** | Co-sign canon amendment text but ship implementation behind `MORALE_OVERRIDE_ENABLED=false` (per §7). Evidence run produced, then user flips flag in follow-up sign. | 40w hash preserved at n1580 today. Flag flip becomes a separate small decision after 188w evidence. Lowest-risk path. |
| **C. Reject** | No amendment. LANE-NIGHTSHIFT-N4 stays BLOCKED. Zombie brigades remain — open P0 carried in MEMORY.md and napkin until next canon review window. | Status quo. Bug persists. /game-designer to revisit at v0.9. |

**Recommendation (advisory):** Option B (shadow-flag sign-off). It satisfies canon-compliance immediately, costs zero hash drift, and lets the 188w evidence run drive the final flip rather than the proposal text alone. Matches the predictor-honesty class precedent of shipping behavior changes in two halves (mechanic + activation).

**Awaiting user signature on A, B, or C.**

---

## Appendix: References

- Engine Invariants v0.7.0 §6.2 (current text, line ~68): `docs/10_canon/Engine_Invariants_v0_7_0.md`
- Systems Manual v0.7.0 §6 (current text, line ~238): `docs/10_canon/Systems_Manual_v0_7_0.md`
- Sensitive-History Design Gate §6, §8.3: `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`
- LANE-NIGHTSHIFT-N4 block report: (canon-compliance-reviewer output, this session)
- n1621 zombie-brigade evidence: latest 188w simulation, VRS Drina Corps formations
- Class precedents:
  - `87062cc4` — IN_TRANSIT_PREDICTOR (PARTIAL)
  - `8dec8f58` — IN_TRANSIT_COMBAT_POWER_CONTEXT (PARTIAL)
  - B-1 PLANNING_INVALIDATED_COOLDOWN (predictor-honesty class)
- Code touchpoints (read-only for this proposal):
  - `src/sim/combat/brigade_dissolution.ts` (`DISSOLUTION_PERSONNEL_CAP = 800`)
  - `src/sim/combat/morale_drift.ts:246` (5%/turn morale-0 desertion)
  - `src/state/game_state.ts` (`FormationState`)

# Design B v3 — Bounded Offensive-Score Haircut: 188w First-Fire (TERRITORY-INERT)

**Date:** 2026-06-10
**Branch:** `feat/exhaustion-drag-designB-v3` (HEAD `8e42136ac`)
**Status:** TERRITORY-INERT — **4th consecutive inert result on the exhaustion-drag op-launch lane**
**Verdict:** **STOP.** The op-launch-willingness scorer structurally cannot give the exhaustion feel territorial teeth. Ship Design A (feel-only) for 1.0.
**§6:** OK — Srebrenica/Žepa fall identically (control_delta byte-identical).

---

## The lever (v3)

`src/sim/combat/commander/plan.ts:759-768`. When `AWWV_EXHAUSTION_DRAG_V2=true` AND the candidate
is an offensive intent (`stage_operation` / `launch_opportunity`), the faction casualty-load drag is
applied as a **bounded multiplier on the candidate's total launch score** (after all additive deltas):

```
score *= EXHAUSTION_DRAG_V2_HAIRCUT_FLOOR + (1 - FLOOR) * factionExhaustionDrag   // FLOOR = 0.6
```

- drag = 1.0 (fresh, casualty-load ≤ 1.0) → multiplier 1.0 → no effect.
- drag = 0.20 (fully spent, load ≥ 2.5) → multiplier **0.68** → **~32% haircut**.

v3 REPLACES v2's additive `e`-term (zeroed when flag ON, `exhaustionTermWeight = 0.0`, plan.ts:393)
and fixes the casualty-load denominator to count active OGs (Codex P2 #408).

---

## Measurement (188w, n0, scenario `apr1992_definitive_188w`)

| Run | Flag | final_state_hash | control_delta | operation_history |
|-----|------|------------------|---------------|-------------------|
| OFF | —    | `345e044b7642aeab` (== floor) | — | 37 ops |
| ON  | `=true` | `4058ad3412bf02f3` (moved) | **byte-identical** | **37 ops, byte-identical JSON** |

Artifact SHA-1 (OFF vs ON), confirmed identical:
- `control_delta.json` — `753f026c…` == `753f026c…`
- `operation_aars.json` — `636feb68…` == `636feb68…`
- `watched_operations.json` — `cd31a731…` == `cd31a731…`
- `formation_delta.json` — `3d7a3009…` == `3d7a3009…`
- `operation_history` (in final_save) — 37 ops, `JSON.stringify` identical.

The hash moved ONLY because the persisted per-corps `commander_decision` snapshot at turn 188 now
carries the `exhaustion_drag_v2_haircut` / re-weighted `score_breakdown` fields (read-model). Zero
behavioral / territorial / operation-launch consequence.

---

## DIAGNOSE

### 1. Did the haircut APPLY? **YES.**

The persisted turn-188 commander snapshots contain the haircut on offensive candidates:

- Fresh corps: `exhaustion_drag_v2_haircut: 1` (`faction_exhaustion_drag: 1`) → no effect, as designed.
- **Exhausted corps: `exhaustion_drag_v2_haircut: 0.68` (`faction_exhaustion_drag: 0.2`)** → the
  0.68×-class haircut IS present on the late-war `launch_opportunity` candidate. Confirmed.

The denominator/sign machinery is wired correctly. The lever fires exactly as specified.

### 2. Did op-LAUNCHES drop ON vs OFF? **NO.**

`operation_history` is **byte-identical** (37 ops, same turns, same `JSON.stringify`). Not a single
operation flipped. The same ops launched at the same turns despite the 32% haircut.

### 3. WHY still inert at 32% — the decisive finding: **case (b)+(d) combined.**

The haircut **did flip a scored winner** — but the flip is **territorially inert** because the
opportunistic offensive path it gates produces **no territory-moving operation late-war**, while the
real late-war territory comes from **injected pre-planned/triggered ops that never route through this
scorer.**

**Score-margin evidence (turn-188 exhausted corps, ON snapshot):**

| Candidate | score |
|-----------|-------|
| `reinforce_zone` (runner-up) | 0.545 |
| `launch_opportunity` POST-haircut (0.68×) | **0.4448** |
| `launch_opportunity` PRE-haircut (0.4448 / 0.68) | **0.654** |

- Flag-OFF the offensive intent would WIN by +0.109 (0.654 > 0.545).
- Flag-ON the 32% haircut drops it to 0.4448 < 0.545 → **offense LOSES → flips to `reinforce_zone`.**
- Any haircut < 0.833× flips this corps. The 0.68× haircut is **more than enough.**

The winner tally at turn 188 confirms the flip is real and harmless:

| winner | OFF | ON |
|--------|-----|-----|
| null (all blocked) | 13 | 12 |
| thin_quiet_sector | 1 | 1 |
| hold_line | 2 | 2 |
| reinforce_zone | **2** | **3** |
| **offensive (stage_operation / launch_opportunity)** | **0** | **0** |

ON has one more `reinforce_zone` and one fewer `null` — exactly the corps the haircut flipped. **Yet
`operation_history` is byte-identical.** Therefore the flipped offensive intent generated **no
operation** even flag-OFF.

**The structural reason** (plan.ts:1082-1100): when an offensive intent wins the competition, the
router does NOT launch anything itself. It calls `tryCreateFromPrePlanned` (Priority 1) then
`tryCreateFromOpportunity` (Priority 2); if both return null it returns `plan: null`. Late-war:
- **Zero offensive intents win in the first place** (0/18 both runs) — corps are already
  hard-blocked out of offense by the EXISTING `corps_exhaustion` / `fatigue` / `stance` /
  `campaign_role` guards. The opportunistic offensive lane is already dead late-war.
- The single corps the haircut flipped was a borderline case whose offensive winner would have
  routed to `tryCreateFromOpportunity` → null (no viable reachable enemy zone) → no op. The flip
  changed the corps's *stated intent label*, not any *action*.

The late-war over-advance (Drina enclaves, western VRS, Storm/Sana/Mistral, srebrenica/zepa falls)
is delivered by `pre_planned_operations.ts` / `triggered_operations.ts` **injection**
(`injectQueuedOperation`, `checkTriggeredOperations`, `injectArmyHqOperations`) — a pipeline that
**does not consult the corps-commander intent scorer at all**, hence cannot see the haircut. This is
the same structural wall the prior 3 inert results hit.

### 4. §6: **OK.** control_delta byte-identical → Srebrenica/Žepa fall identically. §6 rupture ops are triggered/injected and structurally exempt from this scorer.

---

## VERDICT — **STOP**

A stronger haircut (lower FLOOR → 0.3, or no floor) would **not** help:

1. **The score-margin issue is already solved.** The 0.68× haircut already flips the borderline
   scored winner (needed < 0.833×; we apply 0.68×). Lowering the floor flips it *harder* — but the
   flip is **territorially inert**, so a harder flip is still inert.
2. **The over-advance ops bypass the scored path entirely.** They are injected pre-planned/triggered
   ops; the haircut multiplier lives in a scorer those ops never enter. No floor value reaches them.
3. **Late-war offensive intents are already 0/18 winners** — the existing hard-block guards
   (corps_exhaustion / fatigue / stance / campaign_role) have already killed the opportunistic
   offensive lane before the haircut is even consulted. The haircut is operating on an empty room.

This is the **4th inert result**. The op-launch-willingness mechanism structurally cannot give the
exhaustion feel territorial teeth, because the territory-moving late-war ops do not flow through the
op-launch-willingness scorer. To make exhaustion move territory you would have to gate the
**injection** pipeline (pre_planned / triggered ops) on faction exhaustion — a much larger,
calibration-disruptive change that would re-open the 30/30 anchor floor and §6, and is out of scope
for 1.0.

**Recommendation:** Ship **Design A (feel-only)** for 1.0 — exhaustion as a felt, surfaced pressure
(narrative / UI / soul-system), not a territorial lever. Keep v3 HELD (flag-off, byte-identical) as
a documented dead-end so the lane is not re-attempted a 5th time. Revisit territorial exhaustion
only post-1.0, and only via the injection pipeline, paired with a full re-calibration.

---

## Provenance

- Lever: `src/sim/combat/commander/plan.ts:759-768`; constants `:110-130`.
- Router (why offensive winner ≠ launch): `src/sim/combat/commander/plan.ts:1082-1100`.
- Injection pipeline (the real late-war territory): `pre_planned_operations.ts`,
  `triggered_operations.ts` via `war_phases.ts:154,162`.
- Runs: `runs_v3_off/…__w188_n0/`, `runs_v3_on/…__w188_n0/` (cleaned post-report).
- Flag default OFF; flag-off proven byte-identical to the 649 floor (`345e044b…` == floor).

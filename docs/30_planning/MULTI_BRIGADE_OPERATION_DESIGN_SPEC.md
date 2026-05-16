# Multi-Brigade Operation Design Spec: Main/Support Designation and Repositioning

**Status:** DESIGN SPEC (not implementation)
**Author:** Game Designer
**Date:** 2026-03-29
**Canon refs:** `Rulebook_v0_9_0.md` §§6.4, 7.1-7.3; `Systems_Manual_v0_9_0.md` §§6.8, 7.4, 7.6

---

## 1. Problem Statement

The current operation system has three interrelated problems:

1. **Stacking:** All participating brigades converge on one staging OSID. Attack resolution pools their power, but physically they occupy one hex. This is unrealistic — a corps-level operation should deploy across a broad front.

2. **Advance:** After capture, `attackerFormations[0]` (first by sorted ID) advances into the captured OSID. This is arbitrary — it should be the designated spearhead, chosen by tactical merit.

3. **No repositioning between objectives:** After capturing objective N, the operation immediately targets objective N+1. There is no pause for supporting brigades to move into new positions adjacent to the next target. The spearhead is alone until support catches up organically.

These combine to produce operations that feel like a single blob moving along a line, rather than a coordinated multi-brigade effort with a main effort and supporting attacks.

---

## 2. Design Principles

**P1: One brigade advances, others hold.** Only the MAIN (spearhead) brigade physically enters the captured OSID. Support brigades remain on their approach OSIDs, providing combat power from adjacent positions. This models the real pattern: a lead element pushes through while flanking units fix the enemy and provide fire support.

**P2: Broad front, not stacking.** Brigades spread across multiple friendly OSIDs that border the target. This creates converging fire from multiple directions — the historical norm for planned operations in Bosnia (e.g., VRS operations around Srebrenica used multiple axes of approach into each objective).

**P3: Repositioning is a real cost.** After a capture, the bot must reposition support brigades to new positions adjacent to the NEXT objective before committing to the next attack. This takes time (turns). Operations that advance too fast outrun their support — a core tension in the Bosnian War where road networks constrained maneuver.

**P4: The schwerpunkt shifts.** The main brigade designation is re-evaluated after each objective. The brigade in the best position relative to the next objective, with the most combat power, becomes the new main. This models the real practice of rotating lead elements.

**P5: Compatible with existing axis system.** This design layers on top of `OperationAxis`. Each axis gets its own main/support structure. Multi-axis operations can have independent spearheads.

---

## 3. Brigade Roles Within an Operation

### 3.1 Role Definitions

Each brigade in `axis.assigned_brigades` receives one of two roles for the current objective:

| Role | Meaning | Advances into captured OSID? | Full casualty exposure? |
|------|---------|------------------------------|------------------------|
| **MAIN** | Spearhead. Attacks the objective. Advances on capture. | Yes | Yes |
| **SUPPORT** | Fire support from adjacent position. Contributes combat power. | No | Reduced (see SS5) |

Exactly **one** brigade per axis is MAIN. All others are SUPPORT. If the axis has only one brigade, it is MAIN by default.

### 3.2 Main Brigade Selection Criteria

When selecting the MAIN brigade for an objective, evaluate all axis brigades in order:

1. **Adjacency to objective** (hard gate): The MAIN must be on a friendly OSID adjacent to the target. A brigade that cannot attack the objective cannot be the spearhead. If no axis brigade is adjacent, the operation is in APPROACH phase (see SS4.2).

2. **Combat power** (primary sort): Among adjacent candidates, pick the one with the highest `computeAttackerPower()`. The strongest unit leads.

3. **Equipment class** (tiebreaker): Prefer mechanized > motorized > mountain > light_infantry. Mechanized brigades are purpose-built for breakthrough. Use existing `getEquipmentOffensivePriority()`.

4. **Personnel threshold** (hard gate): A brigade below the combat ineffective threshold (personnel < 400) cannot be MAIN. If the only adjacent brigade is combat ineffective, the operation stalls until support repositions.

5. **Disruption** (hard gate): A disrupted brigade cannot be MAIN.

The selection runs at two moments:
- When the axis begins execution against a new objective (including the first one)
- After a repositioning phase completes (see SS4)

### 3.3 Support Brigade Positioning

Support brigades should occupy **distinct** friendly OSIDs adjacent to the target OSID. The goal is maximum coverage: each support brigade on a different approach direction.

**Assignment algorithm:**

1. Collect all friendly OSIDs adjacent to the target that are NOT the MAIN brigade's OSID.
2. Sort these OSIDs by some stable criterion (e.g., number of friendly neighbors descending — prefer positions with fallback depth).
3. Assign one support brigade per OSID. If more support brigades than available adjacent OSIDs, stack remaining on the MAIN brigade's OSID (last resort).
4. Unassigned support brigades (too far away) receive movement orders toward the nearest unoccupied adjacent OSID.

This is the **desired** positioning. Brigades may not be in position yet — that is what the repositioning phase handles.

---

## 4. Operation Execution Flow (Revised)

### 4.1 Phase Diagram

```
[planning] --> [execution]
                  |
                  v
            [REPOSITION for obj N]
                  |
                  v
            [READY CHECK]
                  |
          pass -->|<-- fail (wait, retry next turn)
                  v
            [ATTACK obj N]
                  |
          capture -->|<-- fail (retry or stall per existing logic)
                  v
            [REPOSITION for obj N+1]
                  |
                  v
            [READY CHECK]
                  ...
```

### 4.2 Approach Phase (Pre-Attack)

When an axis transitions to a new objective (index advances), it enters an internal **repositioning sub-state**. During this sub-state:

1. The bot selects the MAIN brigade for the new objective (SS3.2 criteria).
2. The bot computes desired positions for all SUPPORT brigades (SS3.3 algorithm).
3. Brigades not in their desired positions receive movement orders (1-hop moves or column marches).
4. The axis is NOT READY to attack until the readiness check passes.

**New axis state field:** `repositioning: boolean` (default false). Set to true when objective index advances. Set to false when ready check passes.

### 4.3 Readiness Check

The axis is ready to attack when:

1. The MAIN brigade is deployed on a friendly OSID adjacent to the current objective.
2. At least `MIN_SUPPORT_IN_POSITION` support brigades (default: 1, or 50% of support count, whichever is greater) are deployed on friendly OSIDs adjacent to the current objective.
3. No brigade designated MAIN is in_transit or packing.

**Timeout:** If the readiness check fails for `MAX_REPOSITIONING_TURNS` consecutive turns (suggested: 3), the axis attacks anyway with whatever is in position. This prevents indefinite stalling when terrain makes repositioning impossible.

**Canon justification (Rulebook SS7.3):** "Movement-only stalls are capped at 4 turns." The repositioning timeout is consistent with this existing cap. We use 3 to account for the additional 1 turn the attack itself consumes.

### 4.4 Interaction with Existing Axis Fields

- `axis.status` remains `'executing'` during repositioning. No new status value needed — repositioning is an internal detail of execution.
- `axis.movement_only_execution_turns` increments during repositioning turns (existing behavior).
- `axis.idle_execution_turn_streak` does NOT increment during repositioning, because brigades ARE moving.
- The existing stall detection (`idle_execution_turn_streak >= 4`, `movement_only_execution_turns` caps) applies on top. If repositioning plus approach burns all stall budget, the axis stalls as normal.

---

## 5. Attack Resolution Changes

### 5.1 Main Brigade: Standard Resolution

The MAIN brigade attacks as it does today. It is adjacent to the target. On capture, it advances into the captured OSID (replaces the current `attackerFormations[0]` logic). Its entrenchment resets to 0.

### 5.2 Support Brigades: Adjacent Fire Support

Support brigades contribute combat power to the attack from their adjacent positions. This is mechanically similar to how sector defense already works (distance-weighted reserves project power from nearby OSIDs).

**Power contribution:** Support brigades contribute at a **SUPPORT_POWER_FRACTION** (suggested: 0.70) of their full attack power. They are providing fire support and fixing the enemy, not making the direct assault. This maps naturally to the concept of a support-by-fire position.

**Coordination penalty:** The existing multi-brigade coordination penalty (0.9 for 2, 0.8 for 3+) already applies and remains unchanged. The SUPPORT_POWER_FRACTION stacks multiplicatively with it.

**Concentration bonus:** The existing `getConcentrationBonus()` still applies based on total brigade count (main + support). Converging attacks from multiple directions SHOULD be more effective than a single-axis push.

### 5.3 Support Brigades: Reduced Casualties

Support brigades are NOT on the OSID being fought over. They take reduced casualties:

**SUPPORT_CASUALTY_FRACTION** (suggested: 0.40). Support brigades absorb 40% of the per-brigade casualty rate that the main brigade absorbs. They are in covered positions providing fire, not assaulting through the open.

This replaces the current system where all attackers at the same OSID take identical casualties. The main brigade bears the brunt; support takes suppression losses.

**Canon justification:** This is consistent with the existing distance-weighted casualty distribution for defenders (Systems Manual SS7.4: "Casualty distribution: proportionally to each brigade's contribution weight. Brigades closer to the fight absorb more casualties."). We apply the same principle to attackers.

### 5.4 Main Brigade Advance Logic

Replace:
```
const advanceFormation = attackerFormations[0];
```

With:
```
const advanceFormation = getMainBrigade(axis, attackerFormations);
```

Where `getMainBrigade()` returns the brigade designated as MAIN for this axis. If the MAIN brigade is not in `attackerFormations` (e.g., it was disrupted mid-battle), fall back to the current `attackerFormations[0]` sorted behavior.

**Support brigades do NOT advance.** They remain on their current OSIDs. After the capture, the repositioning phase begins for the next objective, and they may need to move to new adjacent positions.

---

## 6. Edge Cases

### 6.1 Main Brigade Combat Ineffective After Capture

The MAIN brigade captures the objective but is now below the combat ineffective threshold (personnel < 400) or is disrupted. It has already advanced into the captured OSID.

**Resolution:** On the next objective's MAIN selection (SS3.2), this brigade fails the personnel/disruption gate. A new MAIN is selected from support brigades. If no support brigade qualifies, the axis enters repositioning and waits for a viable MAIN to arrive. If no brigade recovers within `MAX_REPOSITIONING_TURNS`, the axis stalls.

The former MAIN remains on the captured OSID in a defensive posture, consolidating the gain. It does not retreat — holding captured ground is the whole point.

### 6.2 Support Brigades Cannot Reach Adjacent Positions

The terrain around the next objective may have fewer friendly OSIDs adjacent to it than there are support brigades. Or some adjacent OSIDs may be unreachable (cut off by enemy territory).

**Resolution:**
- Brigades that cannot reach any adjacent OSID within `MAX_REPOSITIONING_TURNS` are excluded from the attack. They remain where they are and defend.
- The readiness check (SS4.3) requires only `MIN_SUPPORT_IN_POSITION`, not all support brigades. An attack can proceed with partial support.
- If ZERO support brigades can reach adjacent positions but the MAIN is in position, the MAIN can attack alone (it is still a corps operation, just with reduced force). This is a degraded state — the AAR should flag it.

### 6.3 Objective Already Friendly-Controlled

If the next objective is already friendly-controlled when the axis advances to it (captured by another axis, or by a different operation, or by counter-attack recovery), the axis skips it and immediately begins repositioning for the objective after that. No repositioning delay for a skip.

### 6.4 Axis With One Brigade

A single-brigade axis has no support brigades. The MAIN/SUPPORT distinction is moot. Behavior is identical to the current system: the lone brigade attacks, advances, and continues.

### 6.5 MAIN Brigade Retreats During Attack

The attack fails, the MAIN brigade is forced to retreat (e.g., via `forceRetreatWithPenalties()`). It is now disrupted for 3 turns and has lost position.

**Resolution:** The axis detects that no MAIN is adjacent to the objective. It enters repositioning. A new MAIN is selected from support brigades (which are still adjacent, since they did not advance). This naturally models the real pattern where a repulsed lead element is replaced by a fresh unit from the support position.

### 6.6 Multiple Axes Converging on Same Objective

Two axes may target the same OSID (convergence objective). Each axis has its own MAIN. Both MAINs are adjacent to the target.

**Resolution:** Only one brigade can advance into the captured OSID. Priority: the axis that captured it (i.e., the axis whose MAIN was designated as the attacker in the resolution). The other axis's MAIN receives an implicit "hold" — it stays on its approach OSID. Its axis marks the objective as captured and advances to the next.

This is already handled by the existing convergence logic in `updateMultiAxisResults()`.

### 6.7 Schwerpunkt Interaction

The existing `schwerpunkt_osid` field on `CorpsOperation` designates the main effort objective. This design does not replace schwerpunkt — it complements it. Schwerpunkt identifies WHICH objective gets priority. Main/support identifies WHICH brigade leads the attack on that objective.

If the schwerpunkt objective is the current target, the bot should prefer the strongest available brigade as MAIN and commit more support brigades (reduce the minimum support-in-position threshold to 1, or increase the repositioning timeout to allow more time for concentration).

---

## 7. New State Fields

### 7.1 On OperationAxis

```typescript
interface OperationAxis {
    // ... existing fields ...

    /** Brigade designated as the spearhead for the current objective. */
    main_brigade_id?: FormationId;

    /** True while brigades are repositioning for the current objective. */
    repositioning?: boolean;

    /** Turns spent in repositioning for the current objective. */
    repositioning_turns?: number;

    /** Desired positions for support brigades: brigade_id -> target_osid. */
    support_positions?: Record<FormationId, string>;
}
```

### 7.2 Constants (suggested, tunable)

| Constant | Value | Rationale |
|----------|-------|-----------|
| `SUPPORT_POWER_FRACTION` | 0.70 | Support brigades contribute 70% power from adjacent positions |
| `SUPPORT_CASUALTY_FRACTION` | 0.40 | Support brigades take 40% of per-brigade casualties |
| `MIN_SUPPORT_IN_POSITION_FRACTION` | 0.50 | At least 50% of support must be adjacent before attacking |
| `MIN_SUPPORT_IN_POSITION_FLOOR` | 1 | Always need at least 1 support brigade in position (if any exist) |
| `MAX_REPOSITIONING_TURNS` | 3 | Timeout: attack with whatever is in position after 3 turns |

---

## 8. Pipeline Integration

### 8.1 Modified Steps

1. **`advance-sector-offensives`** (sector_offensive.ts): After an axis captures an objective and advances `current_objective_index`, set `axis.repositioning = true` and `axis.repositioning_turns = 0`. Call a new helper `selectMainBrigade()` and `computeSupportPositions()`.

2. **`generate-bot-brigade-orders`** (bot_brigade_ai_osid.ts): When a brigade is in an operation with `axis.repositioning === true`, generate movement orders toward its assigned `support_positions[brigadeId]` target OSID. Skip attack evaluation.

3. **`advance-sector-offensives`** (sector_offensive.ts): Each turn during repositioning, increment `axis.repositioning_turns`. Run readiness check. If passed, clear repositioning and proceed to attack. If `repositioning_turns >= MAX_REPOSITIONING_TURNS`, clear repositioning anyway (timeout).

4. **`attack_resolution_osid.ts`**: Modify attacker power aggregation to apply `SUPPORT_POWER_FRACTION` to non-MAIN brigades. Modify casualty distribution to apply `SUPPORT_CASUALTY_FRACTION` to non-MAIN brigades. Modify advance logic to use `axis.main_brigade_id`.

### 8.2 Unchanged Steps

- Operation preparation (intel, staging, supply check, assessment) is unchanged.
- Operation recovery is unchanged.
- Post-operation return march is unchanged.
- The AAR system records the operation as before; it may log main/support role in engagement records.

---

## 9. Interaction with Existing Mechanics

### 9.1 Reactive Defense

The defender's reactive defense (Systems Manual SS7.4) mobilizes reserves proportional to attacking brigades. Support brigades count as attacking brigades for this purpose — they ARE attacking, just from adjacent positions. The reactive defense ratio (`1.5 brigade-equivalents per attacker`) applies to the total attacker count (main + support).

### 9.2 Coordination Penalty

The existing coordination penalty (0.9 for 2 brigades, 0.8 for 3+) applies based on total attacking brigade count. This penalty represents the friction of coordinating multiple units. Support brigades are coordinating — the penalty applies.

### 9.3 Pioneer Attacks

The "pioneer attack" concept (Systems Manual SS6.8: "first brigade seeds attack with repulsed threshold") maps naturally to the MAIN brigade. The MAIN is the pioneer. Support brigades join via `estimateConcentratedOutcome()`.

### 9.4 Artillery Preparation

The `artillery_preparation` flag (first-turn bonus) applies to the whole attack, not per-brigade. Unchanged.

### 9.5 March-First Doctrine

The march-first doctrine (n636) already handles movement toward objectives through friendly territory. During repositioning, support brigades use the same pathfinding to reach their assigned positions. No change to movement logic.

### 9.6 Probe Operations

Probes are small (1-2 brigades) and do not need main/support designation. If a probe has only 1 brigade, it is MAIN by default. If 2, both can be treated as MAIN (probes are reconnaissance, not a coordinated assault). The `SUPPORT_POWER_FRACTION` does not apply to probes.

---

## 10. What This Does NOT Change

- **Ops-only doctrine** (Rulebook SS6.4): All attacks still flow through CorpsOperation. No independent brigade attacks.
- **Counter-attacks** (Rulebook SS6.4 exception): The sole brigade-level exception remains unchanged.
- **Operation preparation system** (Systems Manual SS7.6): The five-phase state machine is unchanged.
- **Sector defensive system**: Defender-side distance-weighted reserves are unchanged.
- **Brigade dissolution**: Unchanged.
- **Officer system**: Operation commanders still apply their quality multiplier to all participating brigades.

---

## 11. Calibration Impact Assessment

**Expected effects:**
- Operations will take LONGER because of repositioning pauses between objectives. This is historically correct — Bosnian War operations had significant pauses between phases as units were repositioned.
- Casualty distribution will shift: the main brigade takes more, support takes less. Total casualties may decrease slightly due to `SUPPORT_CASUALTY_FRACTION`.
- Concentration bonus is preserved (multiple brigades converging = bonus). Coordination penalty is preserved (friction of multi-unit ops = penalty). Net combat power may decrease slightly due to `SUPPORT_POWER_FRACTION`.
- RS blitz phase (w0-12) will be affected: repositioning delays slow the initial VRS advance. May need to exempt pre-planned blitz operations from repositioning (they have predetermined axes and timing from JNA planning).

**Calibration levers:**
- `SUPPORT_POWER_FRACTION`: Higher = support contributes more, operations succeed more easily.
- `SUPPORT_CASUALTY_FRACTION`: Higher = support takes more casualties, operations attrit faster.
- `MAX_REPOSITIONING_TURNS`: Lower = faster operations (less realistic), higher = slower (more realistic).
- RS blitz exemption: If RS w0-12 performance drops too much, exempt pre-planned ops from repositioning.

---

## 12. Open Questions for Operations Expert

1. Should pre-planned operations (from `pre_planned_operations.ts`) have predetermined main/support designations baked into their definition, or should the bot always compute them dynamically?

2. Should the repositioning phase be visible in the UI (a new sub-status for the player to see), or is it an internal bot detail?

3. For player-launched operations (future), should the player be able to designate the MAIN brigade manually?

4. Should there be a minimum axis size (e.g., 2 brigades) before main/support kicks in? Or is the single-brigade degenerate case (SS6.4) sufficient?

---

## 13. Implementation Priority

This design should be implemented AFTER the current calibration stabilization (n1170+). It is a mechanical improvement that will require a fresh calibration pass.

**Suggested implementation order:**
1. State field additions (`main_brigade_id`, `repositioning`, `support_positions`)
2. Main brigade selection logic
3. Support positioning algorithm
4. Repositioning phase in `advance-sector-offensives`
5. Attack resolution changes (power fraction, casualty fraction, advance logic)
6. Bot brigade AI changes (movement during repositioning)
7. Calibration pass with one-change-at-a-time discipline

---

## Blockers

**None.** Canon is silent on main/support brigade roles within operations — the Rulebook describes operations at the corps level and does not prescribe intra-operation brigade roles. The Systems Manual pioneer attack concept (SS6.8) establishes that the first brigade is special. This design formalizes and extends that existing distinction. No canon conflict.

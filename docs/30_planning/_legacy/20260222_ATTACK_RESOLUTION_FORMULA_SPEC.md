# Attack Resolution Formula Specification — OSID / ZoC System

**Date:** 2026-02-22  
**Status:** Draft for review  
**Scope:** Replaces AoR-based battle resolution (Systems Manual §7.4) with OSID-based attack resolution for the ZoC brigade model. Formulas for single-brigade attacks, coordinated operations, push-back, retreat, and casualty computation.  
**Depends on:** `20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md` (spatial model, ZoC, stacking)  
**Canon impact:** Systems Manual §7.4, Phase II Specification §5/§12, Engine Invariants §14, Rulebook §6  

---

## 1. Design Principles

### 1.1 Historical grounding

The Bosnian War was characterized by entrenched, static frontlines for most of its duration. After the initial territorial scramble of spring–summer 1992, fronts solidified into positional warfare resembling WWI trench conditions at a smaller scale. Key realities the formula must reproduce:

- **Defense dominance.** Dug-in infantry with prepared positions held advantages of 3:1 or greater. Most attacks failed or produced pyrrhic gains.
- **Costly attacks.** Even successful offensives inflicted severe attacker casualties (Vlašić, Vozuća, Operations Corridor 92 and Una/Sana 95). Attackers routinely lost more than defenders.
- **Rare breakthroughs.** Multi-OSID advances by a single brigade in a single turn should be essentially impossible outside coordinated corps operations.
- **Stacking was rare.** Brigades generally held their own sector. Concentration happened at corps level through operational groups and named operations, not by physically piling brigades onto one tile.
- **Terrain was decisive.** Mountain ridgelines, river crossings, and urban areas defined where fronts stabilized and where offensives were possible.

### 1.2 Core formula goals

1. **Defense is king.** A single brigade attacking a single entrenched defender should fail more often than it succeeds, absent significant qualitative or material advantage.
2. **Attacks are expensive.** Both sides take casualties; the attacker usually takes more. Even "successful" attacks that push the defender back should cost the attacker heavily.
3. **Breakthrough requires coordination.** Taking multiple OSIDs requires multi-turn corps-level planning, not single-brigade charges.
4. **Deterministic.** No randomness. Same inputs → same outputs. Stable iteration order.
5. **Continuity with existing factors.** Preserve the combat power factor chain (personnel × equipment × experience × cohesion × posture × supply × terrain × corps × operations) but rebalance for defense-dominant outcomes.

---

## 2. Combat Power Computation

### 2.1 Base combat power

Each brigade computes base combat power from its formation state:

```
base_power = personnel × equipment_ratio × experience × (cohesion / 100)
```

Where:
- `personnel`: Current garrison count (integer).
- `equipment_ratio`: Operational equipment as fraction of full TO&E (0.0–1.0). Derived from capability progression and equipment state.
- `experience`: Formation experience (0.0–1.0). Accumulates from combat exposure per System 10.
- `cohesion`: Formation cohesion (0–100). Divided by 100 to normalize.

### 2.2 Attacker combat power

```
attacker_power = base_power
    × posture_attack_mult
    × supply_mult
    × corps_stance_mult
    × operations_mult
    × og_mult
    × disruption_mult
```

| Factor | Source | Typical range |
|--------|--------|---------------|
| `posture_attack_mult` | Brigade posture (see §2.4) | 0.0–1.2 |
| `supply_mult` | Supply state | ADEQUATE=1.0, STRAINED=0.7, CRITICAL=0.4 |
| `corps_stance_mult` | Corps stance | defensive=0.5, balanced=0.8, offensive=1.0 |
| `operations_mult` | Named operation phase | planning=1.0, execution=1.3, recovery=0.6 |
| `og_mult` | Operational group active | no=1.0, yes=1.15 |
| `disruption_mult` | Disrupted flag (from AoR changes, retreats) | normal=1.0, disrupted=0.5 |

### 2.3 Defender combat power

```
defender_power = base_power
    × posture_defense_mult
    × supply_mult
    × terrain_mult
    × entrenchment_mult
    × corps_stance_defense_mult
    × resilience_mult
    × urban_mult
    × disruption_mult
```

| Factor | Source | Typical range |
|--------|--------|---------------|
| `posture_defense_mult` | Brigade posture (see §2.4) | 0.8–1.4 |
| `supply_mult` | Supply state | ADEQUATE=1.0, STRAINED=0.8, CRITICAL=0.5 |
| `terrain_mult` | OSID terrain scalars (see §2.5) | 1.0–2.0 |
| `entrenchment_mult` | Turns on current OSID without moving (see §2.6) | 1.0–1.8 |
| `corps_stance_defense_mult` | Corps stance | defensive=1.2, balanced=1.0, offensive=0.8 |
| `resilience_mult` | Consecutive successful defenses (see §2.7) | 1.0–1.3 |
| `urban_mult` | Urban/Sarajevo bonus | non-urban=1.0, urban=1.3, Sarajevo=1.5 |
| `disruption_mult` | Disrupted flag | normal=1.0, disrupted=0.6 |

### 2.4 Posture multipliers

| Posture | Attack mult | Defense mult | Notes |
|---------|-------------|-------------|-------|
| DEFEND | 0.0 | 1.4 | Cannot attack; maximum defense |
| HOLD | 0.0 | 1.2 | Cannot attack; solid defense, less exhaustion than DEFEND |
| PROBE | 0.5 | 1.0 | Limited attack capability; balanced defense |
| ATTACK | 1.0 | 0.8 | Full attack; weakened defense |
| ASSAULT | 1.2 | 0.6 | Maximum attack; fragile defense. Requires cohesion > 60, corps offensive stance |

**Design note — DEFEND vs HOLD:** DEFEND represents active, intensive defense (frequent counter-battery, aggressive patrolling, prepared kill zones) — maximum defensive power but higher exhaustion. HOLD is passive defense (man the trenches, conserve resources) — slightly lower defensive power but sustainable. This maps to the BiH experience where most brigades were on "hold" for months, with DEFEND reserved for threatened sectors.

**Design note — ASSAULT:** This is the HoI "spearhead" equivalent. Very rare in BiH. Requires high cohesion, corps authorization, and is costly. Models things like the final Federation offensives of 1995 or early RS seizures.

### 2.5 Terrain multipliers (defender)

Terrain multipliers apply to the **defender's OSID** (the tile being attacked):

| Terrain factor | Multiplier | Source |
|---------------|------------|--------|
| River crossing | ×1.3 | Attacker must cross river to reach OSID |
| Mountain/ridge | ×1.4 | High-elevation OSID |
| Forest (heavy) | ×1.2 | Dense forest cover |
| Road access | ×0.9 | Good road network (easier approach for attacker) |
| Slope advantage | ×1.15 | Defender holds high ground |

Terrain multipliers are **multiplicative**: a mountain OSID with a river crossing = 1.4 × 1.3 = 1.82.

Values sourced from `settlements_terrain_scalars.json`, aggregated per OSID (max or weighted average of constituent canonical settlements).

### 2.6 Entrenchment

**New mechanic.** Brigades that remain on the same OSID for consecutive turns dig in progressively. This is the primary mechanism for front hardening and the shift from mobile to trench warfare.

```
entrenchment_level = min(turns_on_osid, MAX_ENTRENCHMENT)
entrenchment_mult = 1.0 + (entrenchment_level × ENTRENCHMENT_PER_TURN)
```

| Parameter | Value | Notes |
|-----------|-------|-------|
| MAX_ENTRENCHMENT | 12 | ~3 months to full entrenchment |
| ENTRENCHMENT_PER_TURN | 0.065 | Per-turn defensive bonus |
| Max entrenchment_mult | 1.78 | At 12 turns: 1.0 + 12 × 0.065 |

**Entrenchment resets to 0** when a brigade moves to a different OSID. A brigade that retreats and later returns starts from 0 again — fortifications are assumed destroyed or bypassed.

**Entrenchment degrades by 1** when a brigade is disrupted (instead of full reset), representing partial damage to prepared positions.

**State:** `entrenchment_turns: number` per brigade. Incremented each turn the brigade does not move. Reset on move. Serialized.

**Design rationale:** By mid-1992, most front sectors had weeks of entrenchment. By 1993, many had 50+ turns. The 1.78× maximum means a fully entrenched defender essentially doubles their effective combat power from entrenchment alone. Combined with terrain (mountain + entrenchment = 1.4 × 1.78 = 2.49× defender multiplier), this makes frontal assault against prepared positions extremely costly — exactly matching the historical pattern.

### 2.7 Resilience (consecutive defense streak)

When a brigade successfully defends (attacker fails to push it back), it gains a small cumulative defensive bonus representing improved tactical knowledge of the local terrain and approach routes.

```
resilience_mult = 1.0 + min(consecutive_defenses, MAX_RESILIENCE_STREAK) × RESILIENCE_PER_DEFENSE
```

| Parameter | Value |
|-----------|-------|
| MAX_RESILIENCE_STREAK | 6 |
| RESILIENCE_PER_DEFENSE | 0.05 |
| Max resilience_mult | 1.3 |

Resets to 0 when the brigade moves, retreats, or the attacker succeeds. Serialized as `defense_streak: number` per brigade.

---

## 3. Attack Resolution

### 3.1 Power ratio

```
power_ratio = attacker_power / defender_power
```

### 3.2 Outcome thresholds

| Power ratio | Outcome | Effect |
|-------------|---------|--------|
| ≥ 2.0 | **Decisive victory** | Defender retreats; attacker may advance; defender heavily disrupted |
| ≥ 1.5 | **Victory** | Defender retreats; attacker may advance |
| ≥ 1.0 | **Costly victory** | Defender retreats but attacker takes extra casualties; attacker may advance but is disrupted |
| 0.7–1.0 | **Stalemate** | No movement; both sides take casualties |
| 0.5–0.7 | **Repulsed** | Attack fails; attacker takes heavy casualties; attacker is disrupted |
| < 0.5 | **Catastrophic failure** | Attack fails; attacker takes very heavy casualties; attacker cohesion penalty; attacker disrupted |

**Comparison to old system:** The old system used ≥1.3 for attacker victory and <0.8 for defender victory. The new thresholds are **much harder for the attacker** — you need 1.5:1 power advantage just to push a defender back normally, and 2.0:1 for a clean victory. This reflects the historical reality that frontal attacks against prepared positions almost always failed unless the attacker had overwhelming superiority.

**Design note — the "stalemate zone" (0.7–1.0):** In HoI4, combat with roughly equal forces produces a prolonged stalemate that drains both sides. We model this explicitly: when the attacker has rough parity or slight advantage, nobody moves but both sides bleed. This is the default state of most of the Bosnian front for most of the war. The player feels the negative-sum grind.

### 3.3 Undefended OSID

If the target OSID has **no deployed brigade** (only political control, possibly militia):

```
militia_power = osid_population × MILITIA_DEFENSE_RATIO × militia_equipment_factor
```

| Parameter | Value | Notes |
|-----------|-------|-------|
| MILITIA_DEFENSE_RATIO | 0.03 | 3% of population available as militia |
| militia_equipment_factor | 0.15–0.40 | From capability progression; light arms only |

Against militia, the victory threshold is **1.0** (not 1.5), reflecting that untrained militia with small arms cannot hold against a formed brigade. But casualties still apply — "undefended" doesn't mean "free."

### 3.4 Multi-brigade attacks on same OSID (coordinated assault)

When **multiple brigades from the same faction** attack the **same target OSID** in the same turn, the attacks are resolved as a single coordinated assault — **not** as sequential independent attacks.

```
combined_attacker_power = sum(attacker_power_i for each attacking brigade)
    × coordination_penalty
```

| # Attackers | coordination_penalty | Rationale |
|-------------|---------------------|-----------|
| 1 | 1.0 | Single brigade, no coordination overhead |
| 2 | 0.90 | Minor friction; historical dual-brigade ops |
| 3+ | 0.80 | Significant command friction; rarely attempted in BiH |

**Design note:** This is deliberately punitive. In BiH, multi-brigade assaults on the same point were rare and usually corps-directed named operations (Corridor 92, Una/Sana). The coordination penalty ensures that the "correct" way to concentrate force is through corps operations and OGs (which provide the operations_mult and og_mult bonuses), not by simply stacking brigades and brute-forcing.

The **OG bonus** (1.15×) and **named operation execution bonus** (1.3×) can partially offset the coordination penalty, making coordinated operations the only effective way to achieve the 1.5+ ratio needed for breakthrough against entrenched defenders. This is intentional — it forces the player to use the corps/OG system rather than just piling units.

### 3.5 Defender stacking

When **multiple defending brigades** are on the target OSID:

```
combined_defender_power = max(defender_power_i) + sum(other_defender_power_j × 0.3)
```

The **strongest defending brigade** fights at full power. Additional brigades contribute 30% of their power (representing depth, reserves, and fire support, but not full combat participation due to limited frontage). This means stacking defenders is beneficial but with diminishing returns — again matching BiH reality where defense in depth was valuable but the frontline brigade bore the brunt.

---

## 4. Casualties

### 4.1 Base casualty rate

Both sides always take casualties in any engagement (including stalemate). The war is negative-sum.

```
base_casualties_attacker = attacker_personnel × BASE_ATTACKER_LOSS_RATE × intensity_mult
base_casualties_defender = defender_personnel × BASE_DEFENDER_LOSS_RATE × intensity_mult
```

| Parameter | Value | Notes |
|-----------|-------|-------|
| BASE_ATTACKER_LOSS_RATE | 0.04 | 4% of attacking personnel per engagement |
| BASE_DEFENDER_LOSS_RATE | 0.028 | 2.8% of defending personnel per engagement (n159 audit: att:def ratio target 2.5-3:1) |

### 4.2 Outcome casualty modifiers

| Outcome | Attacker modifier | Defender modifier |
|---------|-------------------|-------------------|
| Decisive victory | ×1.0 | ×2.5 |
| Victory | ×1.2 | ×1.8 |
| Costly victory | ×1.8 | ×1.2 |
| Stalemate | ×1.0 | ×0.8 |
| Repulsed | ×2.0 | ×0.5 |
| Catastrophic failure | ×3.0 | ×0.3 |

```
final_casualties_attacker = base_casualties_attacker × outcome_attacker_mod
final_casualties_defender = base_casualties_defender × outcome_defender_mod
```

### 4.3 Casualty breakdown

Casualties are split into KIA, WIA, MIA per existing casualty_ledger format:

| Category | Share | Notes |
|----------|-------|-------|
| KIA | 25% | Killed in action |
| WIA | 60% | Wounded; some return after recovery (future system) |
| MIA | 15% | Missing/captured; includes deserters in failed attacks |

### 4.4 Equipment losses

Equipment losses scale with personnel casualties and outcome:

```
equipment_loss = (final_casualties / personnel) × equipment_ratio × EQUIP_LOSS_SCALE
```

| Parameter | Value |
|-----------|-------|
| EQUIP_LOSS_SCALE | 0.5 |

On **decisive victory** or **catastrophic failure**, the losing side additionally loses heavy equipment (tanks, artillery) that may be captured by the winner (per existing capture rules).

### 4.5 Cohesion effects

| Outcome | Attacker cohesion | Defender cohesion |
|---------|-------------------|-------------------|
| Decisive victory | +2 (morale boost) | −15 |
| Victory | +1 | −8 |
| Costly victory | −5 | −6 |
| Stalemate | −3 | −1 |
| Repulsed | −8 | +1 |
| Catastrophic failure | −15 | +3 |

### 4.6 Exhaustion contribution

Every engagement contributes to faction-level exhaustion regardless of outcome:

```
exhaustion_increment = (total_casualties_both_sides / EXHAUSTION_CASUALTY_DIVISOR)
    × command_friction_mult
```

| Parameter | Value |
|-----------|-------|
| EXHAUSTION_CASUALTY_DIVISOR | 5000 |

Both factions receive exhaustion from the engagement. The attacker receives slightly more (×1.2) to reflect the initiative cost.

---

## 5. Push-Back and Control Flip

### 5.1 Push-back (defender retreats)

When the outcome is **Decisive victory**, **Victory**, or **Costly victory**:

1. **Defender must retreat.** The defending brigade(s) must vacate the OSID. Retreat destination is computed per §5.3.
2. **Control flips.** `political_controller(target_osid) = attacker_faction`.
3. **Attacker may advance.** One or more attacking brigades may move into the target OSID. Advancing brigades have their `entrenchment_turns` set to 0.
4. **Advance is optional.** The attacker may choose not to advance (hold position). If the attacker does not advance, the target OSID is controlled by the attacker but unoccupied by a brigade — vulnerable to counter-attack.

### 5.2 Push-back effects on defender

| Outcome | Defender effect |
|---------|----------------|
| Decisive victory | Retreat; disrupted for 2 turns; entrenchment reset to 0 |
| Victory | Retreat; disrupted for 1 turn; entrenchment reset to 0 |
| Costly victory | Retreat; entrenchment reset to 0 |

### 5.3 Retreat destination rules

When a defender must retreat, the destination is selected deterministically:

1. **Prefer:** Friendly-controlled OSID that is **not** in any enemy ZoC, adjacent to current position.
2. **If none:** Friendly-controlled OSID that **is** in enemy ZoC but adjacent to current position (retreat under pressure).
3. **If none:** Any friendly-controlled OSID reachable within 2 hops that is not in enemy ZoC.
4. **If none:** Brigade is **eliminated** (surrender/rout). Equipment capture applies.

**Tie-breaking** among valid destinations: prefer OSID with lowest enemy adjacency count (retreat toward rear), then by OSID string sort (determinism).

**Design note:** This retreat hierarchy means encirclement is lethal. If a brigade's retreat routes are all blocked by enemy ZoC, it's destroyed. This models the historical encirclement dynamics (pockets, enclaves) without special enclave rules at the brigade level.

### 5.4 Advance after combat

On attacker victory:
- The attacking brigade(s) may advance into the captured OSID.
- Advancing resets `entrenchment_turns` to 0 — the attacker has not dug in yet and is vulnerable to counterattack.
- The advancing brigade is **not disrupted** (unless "Costly victory").
- Maximum advance: **1 OSID per attack**. No exploitation / pursuit beyond the target tile. Multi-OSID advances require multi-turn operations.

### 5.5 No passive control change

Reiterated for clarity: there is **no** mechanic where control changes without an explicit attack order being resolved. ZoC locks movement but does not flip control. Supply strain does not flip control. Exhaustion does not flip control. Only attack resolution (§3) or corps/frontline operations (§6) can change `political_controller`.

---

## 6. Corps-Level and Operational Group Operations

### 6.1 Named operations

Named operations represent pre-planned, corps-authorized multi-turn offensives. They are the **primary mechanism for achieving breakthrough** against entrenched frontlines.

**Lifecycle** (unchanged from existing Systems Manual §6.4):
- **Planning** (e.g. 3 turns): +5% defense to participating brigades. No attacks yet.
- **Execution** (e.g. 4 turns): +30% attack power (operations_mult = 1.3). Participating brigades may attack at full power plus operation bonus.
- **Recovery** (e.g. 3 turns): −40% attack, +1 cohesion/turn. Brigades rest.

**New in OSID model:** During execution phase, participating brigades may attack adjacent OSIDs. The operation specifies a **target sector** (set of OSIDs). Attacks within the target sector receive the full operation bonus. Attacks outside it receive no bonus.

### 6.2 Coordinated multi-OSID assault

During a named operation's execution phase, the corps may order **simultaneous attacks on multiple adjacent OSIDs** in the target sector. Each is resolved independently (one attack per target OSID), but all participating brigades receive the operation bonus.

This is how historical multi-axis offensives work: not by stacking 5 brigades on one tile, but by attacking across a broad front with multiple brigades each hitting their own target, coordinated by corps timing.

### 6.3 Operational groups in OSID model

OGs in the OSID model work as temporary combat formations:

- **Activation:** OG is created with a designated OSID (the OG's location). Personnel are borrowed from donor brigades per existing rules (min 200 per donor, min 500 total).
- **OG as a brigade-equivalent:** The OG occupies an OSID and functions like a brigade for combat purposes (projects ZoC, can attack, can defend). It has its own `location_osid`.
- **OG bonus:** Brigades attacking from an OSID adjacent to the OG's OSID, as part of the same operation, receive `og_mult = 1.15`.
- **Dissolution:** OG dissolves per existing rules (cohesion < 15 or max duration). Personnel return to donors.

### 6.4 Achieving breakthrough: the intended pattern

The formula is designed so that the **only reliable way to break an entrenched front** is:

1. **Corps orders a named operation** (3 turns planning).
2. **OG is activated** to provide coordination bonus.
3. **During execution phase**, 2–3 brigades each attack their own adjacent OSID simultaneously.
4. Each brigade gets: base power × ATTACK posture (1.0) × operation bonus (1.3) × OG bonus (1.15) = effectively **1.5× normal attack power**.
5. Against an entrenched defender (1.78 entrenchment × 1.2 terrain = ~2.14 total), the attacker needs roughly **3:1 raw power advantage** to hit the 1.5 ratio threshold. With the operation/OG bonuses, this drops to about **2:1 raw advantage** — achievable with a strong, well-supplied brigade against a weaker or strained defender.
6. **Advance is 1 OSID per turn.** A 4-turn operation might gain 2–3 OSIDs of depth across the sector if things go well — matching historical offensive results.

Without corps operations, a single brigade attacking a fully entrenched defender at rough parity (power_ratio ≈ 0.5 after entrenchment) will be repulsed every time. This is correct. That's what happened on most of the front for most of the war.

---

## 7. Special Cases

### 7.1 Counter-attack

A defending brigade that was pushed back may, on its next turn, order an attack back on the OSID it just lost — provided it is not disrupted. The attacker (now defending the just-captured OSID) has `entrenchment_turns = 0`, making counter-attack the strongest response to a push-back. This creates a natural back-and-forth dynamic on contested OSIDs.

### 7.2 Overextension penalty

If an attacking brigade advances into a captured OSID and is now **adjacent to 3+ enemy-controlled OSIDs** (salient formation), it receives an overextension penalty:

```
overextension_defense_penalty = 0.85 per extra enemy adjacency beyond 2
```

At 3 enemy adjacencies: 0.85. At 4: 0.72. This makes salients dangerous and rewards broad-front advances over deep penetrations — matching the historical pattern where narrow corridors (Posavina, Goražde) were extremely costly to maintain.

### 7.3 Enclave defense bonus

If a defending faction's OSID is part of a recognized enclave (Srebrenica, Žepa, Goražde, Bihać pocket), the defender receives:

```
enclave_defense_mult = 1.2
```

This represents desperation fighting, last-stand mentality, and the political impossibility of voluntary surrender. It stacks with terrain and entrenchment.

### 7.4 Sarajevo

Sarajevo OSIDs receive:
- `urban_mult = 1.5` (already in base formula)
- `sarajevo_siege_mult = 1.3` (additional, reflecting UN presence, tunnel supply, extreme urban density)
- Total Sarajevo defensive multiplier: 1.5 × 1.3 = 1.95 from Sarajevo factors alone, before terrain and entrenchment

This makes Sarajevo essentially impregnable to direct assault (historically accurate — VRS never took the city by force despite 4 years of siege).

---

## 8. Snap Events

Deterministic snap events trigger when specific state conditions are met during attack resolution. Carried forward from existing system with adjustments for OSID model:

| Event | Trigger | Effect |
|-------|---------|--------|
| **Ammunition Crisis** | Attacker supply = CRITICAL and attack fails | Attacker cohesion −10; force HOLD posture next turn |
| **Commander Casualty** | Defender cohesion drops below 20 from combat | Defender cohesion −8 additional; defense_streak reset |
| **Last Stand** | Defender has no valid retreat destination | Defender power ×1.5 (fight to the death); casualties ×2 both sides |
| **Surrender Cascade** | Defender cohesion < 10 and power_ratio > 2.5 | Defender eliminated without retreat; equipment captured |
| **Pyrrhic Victory** | Attacker wins but attacker casualties > 15% of personnel | Attacker cohesion −10; force HOLD posture next turn; exhaustion ×2 |
| **Fortification Destroyed** | Decisive victory against defender with entrenchment > 8 | Defender entrenchment reset to 0 on retreat destination as well |

---

## 9. State Model Changes

### 9.1 New per-brigade state

| Field | Type | Default | Serialized | Notes |
|-------|------|---------|------------|-------|
| `location_osid` | OSID | from init | Yes | Current brigade position |
| `entrenchment_turns` | number | 0 | Yes | Turns on current OSID without moving |
| `defense_streak` | number | 0 | Yes | Consecutive successful defenses |
| `disrupted_turns` | number | 0 | Yes | Turns remaining disrupted (0 = not disrupted) |
| `movement_state` | enum | 'deployed' | Yes | deployed / packing / in_transit / unpacking |

### 9.2 Removed state

| Field | Notes |
|-------|-------|
| `brigade_aor` | Replaced by location_osid |
| `brigade_aor_orders` | Removed |
| `brigade_mun_orders` | Removed (movement is OSID-to-OSID) |
| `brigade_municipality_assignment` | Removed or kept for display only |

### 9.3 OSID-level state

| Field | Type | Notes |
|-------|------|-------|
| `political_controller` | faction | Per-OSID control. Changed only by attack resolution or corps ops |
| `last_battle_turn` | number | Turn of most recent engagement on this OSID |

---

## 10. Formula Constants Summary

| Constant | Value | Section |
|----------|-------|---------|
| VICTORY_THRESHOLD_DECISIVE | 2.0 | §3.2 |
| VICTORY_THRESHOLD_NORMAL | 1.5 | §3.2 |
| VICTORY_THRESHOLD_COSTLY | 1.0 | §3.2 |
| STALEMATE_FLOOR | 0.7 | §3.2 |
| REPULSED_FLOOR | 0.5 | §3.2 |
| MAX_ENTRENCHMENT | 12 | §2.6 |
| ENTRENCHMENT_PER_TURN | 0.065 | §2.6 |
| MAX_RESILIENCE_STREAK | 6 | §2.7 |
| RESILIENCE_PER_DEFENSE | 0.05 | §2.7 |
| BASE_ATTACKER_LOSS_RATE | 0.04 | §4.1 |
| BASE_DEFENDER_LOSS_RATE | 0.028 | §4.1 |
| MILITIA_DEFENSE_RATIO | 0.03 ** | §3.3 |
| COORDINATION_PENALTY_2 | 0.90 | §3.4 |
| COORDINATION_PENALTY_3PLUS | 0.80 | §3.4 |
| STACKING_DEFENDER_SUPPORT | 0.30 | §3.5 |
| OVEREXTENSION_PENALTY | 0.85 | §7.2 |
| ENCLAVE_DEFENSE_MULT | 1.2 | §7.3 |
| SARAJEVO_SIEGE_MULT | 1.3 | §7.4 |
| EXHAUSTION_CASUALTY_DIVISOR | 5000 | §4.6 |
| EQUIP_LOSS_SCALE | 0.5 | §4.4 |

---

## 11. Worked Example

**Scenario:** 1st Krajina Brigade (VRS, strong) attacks an ARBiH position on a mountain OSID. Mid-1993 — both sides entrenched.

**Attacker (VRS 1st Krajina):**
- Personnel: 2,200
- Equipment ratio: 0.75 (VRS heavy equipment advantage)
- Experience: 0.55
- Cohesion: 68
- Posture: ATTACK (1.0 / 0.8)
- Supply: ADEQUATE (1.0)
- Corps stance: offensive (1.0 attack / 0.8 defense)
- No named operation, no OG

```
base_power = 2200 × 0.75 × 0.55 × (68/100) = 616.55
attacker_power = 616.55 × 1.0 × 1.0 × 1.0 × 1.0 × 1.0 × 1.0 = 616.55
```

**Defender (ARBiH 17th Krajina):**
- Personnel: 1,600
- Equipment ratio: 0.30 (ARBiH equipment shortage)
- Experience: 0.45
- Cohesion: 55
- Posture: DEFEND (0.0 / 1.4)
- Supply: STRAINED (0.8)
- Mountain terrain: 1.4
- Entrenchment: 10 turns → 1.0 + 10 × 0.065 = 1.65
- Defense streak: 3 → 1.0 + 3 × 0.05 = 1.15
- Corps stance: defensive (1.2)
- Urban: 1.0 (not urban)

```
base_power = 1600 × 0.30 × 0.45 × (55/100) = 118.80
defender_power = 118.80 × 1.4 × 0.8 × 1.4 × 1.65 × 1.2 × 1.15 × 1.0 × 1.0
             = 118.80 × 1.4 × 0.8 × 1.4 × 1.65 × 1.2 × 1.15
             = 118.80 × 3.785
             = 449.64
```

**Power ratio:** 616.55 / 449.64 = **1.37**

**Outcome:** 1.0–1.5 range → **Stalemate** (just barely). The VRS brigade, despite having ~40% more personnel and 2.5× the equipment, cannot dislodge an entrenched ARBiH position on a mountain. No one moves. Both sides take casualties.

**Casualties:**
- Attacker: 2200 × 0.04 × 1.0 (stalemate) = **88 casualties** (22 KIA, 53 WIA, 13 MIA)
- Defender: 1600 × 0.02 × 0.8 (stalemate) = **25.6 → 26 casualties** (6 KIA, 16 WIA, 4 MIA)

**Cohesion:** Attacker −3, Defender −1.

The VRS brigade learns what every corps commander in BiH learned: you cannot take an entrenched mountain position with a single brigade, no matter how well-equipped you are. Plan a named operation, bring an OG, or find a weaker point on the line.

---

## 12. Comparison to HoI4

| Aspect | HoI4 | AWWV |
|--------|------|------|
| Combat width | Hard cap on divisions engaging | Coordination penalty for multi-brigade; defender stacking diminishing returns |
| Entrenchment | Levels 1–10, scales defense | Turns-based, up to 12 levels, ×1.78 max |
| Planning bonus | Stored from battle plan | Named operation planning phase (3 turns) → execution bonus |
| Terrain | Province-level modifiers | OSID-level from terrain scalars |
| Breakthrough | Concentrated armor + air | Corps operations + OG; no armor/air abstraction yet |
| Stalemate | Protracted combat, org drain | Explicit stalemate zone (0.7–1.0); mutual casualties |
| Encirclement | Cut supply → attrition | ZoC blocks retreat → elimination |
| Combat outcomes | Gradual province push | Discrete attack → push-back or hold |

**Key difference from HoI4:** HoI4 has continuous combat (divisions attack and grind until one side breaks). AWWV uses **discrete weekly engagements** — you order an attack, it resolves once, and you see the result. This is closer to the weekly turn structure and avoids the "leaving the game running" dynamic. It also means every attack is a deliberate decision with visible cost, reinforcing the "war is costly" message.

---

## 13. Design Suggestions and Open Questions

### 13.1 Combat width as future refinement

Currently, multi-brigade stacking uses a simple coordination penalty. A future refinement could introduce **combat width per OSID** (derived from OSID geometry — larger operational settlements support more brigades) that hard-caps how many brigades can meaningfully participate. This would be more HoI-like and add geographic variety. Deferred to avoid over-engineering the first pass.

### 13.2 Air support / artillery abstraction

The current formula treats equipment as a single ratio. A future pass could separate **heavy equipment** (tanks, artillery) from **light equipment** (small arms, mortars) and give heavy equipment a disproportionate attack bonus. This would better model the VRS firepower advantage early in the war. Could be done as a sub-multiplier within equipment_ratio.

### 13.3 Weather and season

BiH winters severely limited offensive operations, especially in mountain terrain. A seasonal modifier (e.g., winter attack penalty of 0.7 in December–February for mountain OSIDs) would add historical flavor. Simple to implement as a lookup table by turn/month and terrain type.

### 13.4 Supply line through OSID graph

With the OSID graph model, supply tracing becomes a graph-reachability problem (BFS from supply sources through friendly-controlled OSIDs). This naturally models corridor mechanics — if the Posavina corridor's OSIDs flip, everything east is cut off. This deserves its own spec but the attack resolution formula already accounts for supply state through `supply_mult`.

### 13.5 Retreat and reorganization

A retreated brigade with `disrupted_turns > 0` and low cohesion should probably have a **reorganization** mechanic: a forced HOLD posture for N turns while cohesion recovers. This prevents immediate counter-attacks by shattered units and gives the attacker a window to consolidate. Could be tied to the existing REORGANIZE corps stance.

---

## 14. Canon Impact Checklist

| Document | Section | Change |
|----------|---------|--------|
| **Systems Manual** | §7.4 | Replace current battle resolution formula with §2–§4 of this spec |
| **Systems Manual** | §6.1–6.4 | Update OG/corps references for OSID model |
| **Systems Manual** | New §X | Add entrenchment system (§2.6) |
| **Phase II Spec** | §5 (pipeline) | Replace AoR steps with ZoC computation, attack resolution, push-back |
| **Phase II Spec** | §12 (stubs) | Update battle resolution description |
| **Engine Invariants** | §14 | Replace AoR coverage invariant with "every brigade has valid location_osid" |
| **Engine Invariants** | New | Add "control changes only via attack resolution or corps ops" invariant |
| **Rulebook** | §6 | Rewrite combat section for attack/push-back/ZoC model |
| **Game Bible** | §7 | Update spatial responsibility model |

---

*This specification is intended to be reviewed and tuned against historical scenarios (April 1992 start, Corridor 92, Operations Lukavac/Deblokada, Una/Sana 95) before canon promotion. Constants may be adjusted during calibration without changing the formula structure.*

# Life Lessons — Combat, Brigade Distribution, March System
> Created 2026-04-01. New 2026-04-01 lessons only. Legacy combat lessons (pre-2026-04-01) remain in calibration.md under [Combat] tags. Master index: docs/life_lessons.md

---

### [Combat] Phase B re-orders in-transit brigades every turn unless guarded (2026-04-01) — NEW
- **Context**: `distributeBrigadesToFront` Phase B checks `frontOsidSet.has(loc)` only — physical location. A brigade in transit is still at a rear OSID, so Phase B re-issues a march order every turn. `osid-column-movement` then resets the transit state from scratch. The brigade never accumulates progress.
- **Wrong approach**: Phase B eligibility check based solely on physical location, ignoring in-transit state. Every marching brigade is perpetually restarted each turn from zero progress.
- **Right approach**: Add `if (state.military.brigade_movement_state?.[bid]?.status === 'in_transit') continue;` at the top of the Phase B loop. A brigade already marching is already doing what Phase B wants — do not interrupt it.
- **Do instead**: Any distribution pass that issues movement orders MUST first check whether the brigade is already in transit. Re-issuing a march order resets the transit state and wastes accumulated progress.

### [Combat] Equipment asymmetry must apply to BOTH sides of every battle (2026-04-01) — NEW
- **Context**: ARBiH rifle-only brigades could fictionally capture `op:brcko:brcko` in 1992 because RS artillery had zero active-battle effect when defending. `getBombardmentCasualtyMult()` applied VRS artillery advantage only on attack. When VRS defended, their 15 artillery pieces contributed nothing to attacker casualties. The equipment asymmetry was one-sided.
- **Impact**: brcko anchor failed for multiple runs. Root cause was not garrison density (disproved) but missing defensive fire. P1 fix (`getDefensiveFireMult()`) resolved it without must_hold — VRS 15 art = 1.135× attacker cas, making ARBiH rifle-only assaults unsustainable.
- **Wrong approach**: Adding attacker-side equipment multipliers only. Assuming "artillery = offensive weapon" in combat resolution.
- **Right approach**: Any equipment advantage that raises casualties must be realized symmetrically — when the well-equipped faction attacks AND when it defends. The same artillery that bombards before an attack fires back at attackers.
- **Do instead**: When auditing combat factors, check every multiplier for directional asymmetry. Ask: "if this faction defends with this equipment, does the enemy pay a cost?" If not, it's a gap.

### [Combat] home_osid is a recruitment artifact, not a strategic destination (2026-04-01) — NEW
- **Context**: Using `home_osid` as a march tiebreaker in `pickLeastStackedTarget` caused 9 VRS brigades to march toward interior RS municipalities instead of their assigned sector fronts. `home_osid` records where a brigade was recruited — it has no tactical meaning.
- **Wrong approach**: Using `home_osid` to bias march target scoring. Brigades home-march to inland recruitment towns while assigned front sectors go uncovered.
- **Right approach**: Remove `home_osid` from any march target scoring. Tiebreaks should be pure `strictCompare`. If a brigade needs to return somewhere, let the commander direct it via sector assignment.
- **Do instead**: `home_osid` is metadata about unit origin, not a desired destination. Never use it in targeting, march scoring, or assignment priority. The sector sub-segment's `friendly_osids` define the valid destination set.

### [Combat] Commander has zero movement authority by design — must explicitly add it (2026-04-01) — NEW
- **Context**: The corps commander system (step 983) and `brigade_front_distribution` (step 679) were designed as non-interacting layers. The commander writes only to `directive`, `active_operations`, and `sector_stance`. It never writes `brigade_movement_orders` or reads `brigade_movement_state`. Wrong march orders are invisible to it.
- **Wrong approach**: Assuming the commander system can correct march behavior without a write path to `brigade_movement_orders`. The authority gap is structural — no implicit correction occurs.
- **Right approach**: When adding commander intelligence, explicitly verify it has a write path to `brigade_movement_orders`. The authority gap must be bridged in code, not assumed.
- **Do instead**: Before implementing any commander correction pass, check: (1) which state fields does the commander currently write? (2) does that include `brigade_movement_orders`? If not, add the write path explicitly. The commander cannot fix what it cannot write.

### [Combat] Commander correction pass must also cancel wrong in-transit states, not just pending orders (2026-04-01) — NEW
- **Context**: `correctMarchOrders` overrides `brigade_movement_orders`. But `osid-column-movement` (step 576) runs before the commander pass (step 983+) and converts orders to `brigade_movement_state`. Wrong-destination brigades in transit have no pending order to override — they are invisible to a pass that only checks `brigade_movement_orders`.
- **Wrong approach**: Writing a correction pass that only inspects `brigade_movement_orders`. Brigades already in transit (orders already consumed by the movement step) escape the correction entirely.
- **Right approach**: Add a second function `correctTransitStates` that inspects `brigade_movement_state`. If `status === 'in_transit'` and `destination_sids[0]` is outside the sub-segment's `friendly_osids`, cancel the transit state and issue a corrected order.
- **Do instead**: Any correction pass for movement must handle BOTH states: (1) pending orders in `brigade_movement_orders`, (2) active transit in `brigade_movement_state`. The pipeline converts orders to transit every turn — check both or you only catch half the problem.
